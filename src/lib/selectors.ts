import type {
  CompanySettings,
  Offer,
  OfferItem,
  PaymentRecord,
  Product,
  Project,
  PurchaseInvoice,
  SalesInvoice,
  ServiceTicket,
} from '@/types';

export interface OfferTotalsSummary {
  subtotal: number;
  discountAmount: number;
  taxAmount: number;
  totalAmount: number;
}

export interface OfferMarginSummary {
  netRevenue: number;
  estimatedCost: number;
  estimatedProfit: number;
  marginPercent: number;
  hasCostData: boolean;
  isBelowMinMargin: boolean;
  minMarginPercent: number;
}

/**
 * Pure, deterministic offer total calculation (IMP-08).
 * Single source of truth used by Offer Builder, selectors, and regression tests.
 */
export function computeOfferTotals(
  items: Pick<OfferItem, 'unitPrice' | 'quantity' | 'totalPrice'>[],
  discountRate = 0,
  taxRate = 18
): OfferTotalsSummary {
  const subtotal =
    Math.round(
      items.reduce((sum, item) => {
        const qty = Number(item.quantity || 1);
        const unit = Number(item.unitPrice || 0);
        const lineTotal =
          item.totalPrice !== undefined && Number.isFinite(Number(item.totalPrice))
            ? Number(item.totalPrice)
            : Math.round(unit * qty * 100) / 100;
        return sum + lineTotal;
      }, 0) * 100
    ) / 100;

  const safeDiscountRate = Math.min(100, Math.max(0, Number(discountRate || 0)));
  const safeTaxRate = Math.min(100, Math.max(0, Number(taxRate ?? 18)));
  const discountAmount = Math.round(subtotal * (safeDiscountRate / 100) * 100) / 100;
  const taxable = Math.max(0, subtotal - discountAmount);
  const taxAmount = Math.round(taxable * (safeTaxRate / 100) * 100) / 100;
  const totalAmount = Math.round((taxable + taxAmount) * 100) / 100;

  return { subtotal, discountAmount, taxAmount, totalAmount };
}

/**
 * Pure pre-sale gross margin estimation for Offer Builder guardrails (BIZ-02, BIZ-03).
 * Compares net (ex-VAT) revenue after discount against estimated product + accessory purchase costs.
 */
export function computeOfferMarginSummary(params: {
  items: OfferItem[];
  products: Product[];
  discountRate?: number;
  companySettings?: Partial<CompanySettings> | null;
}): OfferMarginSummary {
  const { items, products, discountRate = 0, companySettings } = params;
  const totals = computeOfferTotals(items, discountRate, 0);
  const netRevenue = Math.max(0, Math.round((totals.subtotal - totals.discountAmount) * 100) / 100);
  const minMarginPercent = Number(companySettings?.minMarginPercent ?? 15);

  let estimatedCost = 0;
  for (const item of items) {
    const qty = Math.max(1, Number(item.quantity || 1));
    if (item.productId) {
      const prod = products.find((p) => p.id === item.productId);
      if (prod && Number(prod.purchasePrice || 0) > 0) {
        estimatedCost += Number(prod.purchasePrice) * qty;
      }
    }
    if (item.selectedAccessories && typeof item.selectedAccessories === 'object') {
      for (const accId of Object.values(item.selectedAccessories)) {
        if (!accId) continue;
        const accProd = products.find((p) => p.id === accId);
        if (accProd && Number(accProd.purchasePrice || 0) > 0) {
          estimatedCost += Number(accProd.purchasePrice) * qty;
        }
      }
    }
    const partId = item.consumedPartProductId || (item as unknown as { serviceConsumedPartId?: string }).serviceConsumedPartId;
    if (partId) {
      const partProd = products.find((p) => p.id === partId);
      if (partProd && Number(partProd.purchasePrice || 0) > 0) {
        estimatedCost += Number(partProd.purchasePrice) * qty;
      }
    }
  }

  estimatedCost = Math.round(estimatedCost * 100) / 100;
  const hasCostData = estimatedCost > 0;
  const estimatedProfit = Math.round((netRevenue - estimatedCost) * 100) / 100;
  const marginPercent = netRevenue > 0 ? Math.round((estimatedProfit / netRevenue) * 1000) / 10 : 0;
  const isBelowMinMargin = hasCostData && netRevenue > 0 && marginPercent < minMarginPercent;

  return {
    netRevenue,
    estimatedCost,
    estimatedProfit,
    marginPercent,
    hasCostData,
    isBelowMinMargin,
    minMarginPercent,
  };
}

export interface ProjectFinancialSummary {
  /** Gross customer agreement (incl. VAT) used for customer receivables & payment tracking */
  agreedRevenue: number;
  /** Net (ex-VAT) revenue used for true P&L profit & margin math (BIZ-01) */
  netRevenue: number;
  /** Output VAT portion (agreedRevenue - netRevenue) */
  vatCollected: number;
  paidByCustomer: number;
  remainingToPay: number;
  stockPurchaseCost: number;
  hasActualStockInvoice: boolean;
  directExpensesCost: number;
  serviceCost: number;
  totalCost: number;
  hasCostData: boolean;
  netProfit: number;
  marginPercent: number;
  isBelowMinMargin: boolean;
}

/**
 * Pure TanStack-Query-driven Project Financial Summary selector (IMP-08, BIZ-01).
 * Strictly computes P&L on net (ex-VAT) revenue vs net (ex-VAT) costs so margins are never inflated by ~18% VAT.
 */
export function computeProjectFinancialSummary(params: {
  project: Project;
  offers: Offer[];
  salesInvoices: SalesInvoice[];
  purchaseInvoices: PurchaseInvoice[];
  payments: PaymentRecord[];
  products: Product[];
  serviceTickets?: ServiceTicket[];
  companySettings?: Partial<CompanySettings> | null;
}): ProjectFinancialSummary {
  const {
    project,
    offers,
    salesInvoices,
    purchaseInvoices,
    payments,
    products,
    serviceTickets = [],
    companySettings,
  } = params;

  const linkedOffer =
    offers.find((o) => o.id === project.offerId) || project.offer || null;

  const projectSalesInvoices = salesInvoices.filter(
    (s) => s.status !== 'CANCELLED' && (s.projectId === project.id || (project.offerId && s.offerId === project.offerId))
  );
  const finalInv = projectSalesInvoices.find((s) => s.invoiceType === 'FINAL');

  const agreedRevenue =
    Math.round(
      (Number(finalInv?.grossTotalAmount || 0) ||
        Number(linkedOffer?.totalAmount || 0) ||
        projectSalesInvoices.reduce((s, inv) => s + Number(inv.totalAmount || 0), 0)) * 100
    ) / 100;

  // BIZ-01: Derive true net (ex-VAT) revenue for P&L so VAT (18% ДДВ) never inflates profit
  const effectiveTaxRate = Number(finalInv?.taxRate ?? linkedOffer?.taxRate ?? 18);
  let netRevenue = 0;
  if (finalInv && Number(finalInv.grossTotalAmount || 0) > 0) {
    netRevenue =
      effectiveTaxRate > 0
        ? Number(finalInv.grossTotalAmount) / (1 + effectiveTaxRate / 100)
        : Number(finalInv.grossTotalAmount);
  } else if (linkedOffer && Number(linkedOffer.subtotal || 0) > 0) {
    netRevenue = Math.max(0, Number(linkedOffer.subtotal) - Number(linkedOffer.discountAmount || 0));
  } else if (agreedRevenue > 0) {
    netRevenue = effectiveTaxRate > 0 ? agreedRevenue / (1 + effectiveTaxRate / 100) : agreedRevenue;
  }
  netRevenue = Math.round(netRevenue * 100) / 100;
  const vatCollected = Math.max(0, Math.round((agreedRevenue - netRevenue) * 100) / 100);

  const projectPaymentsIn = payments.filter(
    (p) =>
      p.direction === 'IN' &&
      (p.projectId === project.id ||
        (project.offerId && p.offerId === project.offerId) ||
        projectSalesInvoices.some((si) => si.id === p.salesInvoiceId))
  );
  const paidByCustomer =
    Math.round(projectPaymentsIn.reduce((s, p) => s + Number(p.amount || 0), 0) * 100) / 100;
  const remainingToPay = Math.max(0, Math.round((agreedRevenue - paidByCustomer) * 100) / 100);

  // Actual purchase invoices (ex-VAT) linked to this project
  const projectPurchases = purchaseInvoices.filter(
    (pi) => pi.projectId === project.id || (project.offerId && pi.offerId === project.offerId)
  );

  let actualStockCost = 0;
  let directExpensesCost = 0;
  let hasActualStockInvoice = false;

  projectPurchases.forEach((pi) => {
    (pi.items || []).forEach((it) => {
      const cost = Number(it.totalCost || Number(it.unitCost || 0) * Number(it.quantity || 1));
      if (it.itemType === 'STOCK') {
        actualStockCost += cost;
        hasActualStockInvoice = true;
      } else {
        directExpensesCost += cost;
      }
    });
  });

  // Fallback estimated catalog purchase cost (including selected accessories) when no actual STOCK purchase invoice exists yet
  let estimatedStockCost = 0;
  if (!hasActualStockInvoice && linkedOffer?.items?.length) {
    linkedOffer.items.forEach((item) => {
      const qty = Math.max(1, Number(item.quantity || 1));
      if (item.productId) {
        const prod = products.find((p) => p.id === item.productId);
        if (prod && Number(prod.purchasePrice || 0) > 0) {
          estimatedStockCost += Number(prod.purchasePrice) * qty;
        }
      }
      if (item.selectedAccessories && typeof item.selectedAccessories === 'object') {
        Object.values(item.selectedAccessories).forEach((accId) => {
          if (!accId) return;
          const accProd = products.find((p) => p.id === accId);
          if (accProd && Number(accProd.purchasePrice || 0) > 0) {
            estimatedStockCost += Number(accProd.purchasePrice) * qty;
          }
        });
      }
    });
  }

  // Roll up warranty/project-linked service ticket costs (parts + labor) if provided (BIZ-01)
  const hourlyRate = Number(companySettings?.defaultHourlyLaborRate ?? 25);
  let serviceCost = 0;
  for (const st of serviceTickets) {
    if (st.installedItem?.projectId === project.id) {
      const partsSum = (st.partsConsumed || []).reduce(
        (sum, part) => sum + Number(part.unitCost || 0) * Number(part.quantity || 1),
        0
      );
      const laborSum = Number(st.laborHours || 0) * hourlyRate;
      serviceCost += partsSum + laborSum;
    }
  }

  const stockPurchaseCost = Math.round((hasActualStockInvoice ? actualStockCost : estimatedStockCost) * 100) / 100;
  directExpensesCost = Math.round(directExpensesCost * 100) / 100;
  serviceCost = Math.round(serviceCost * 100) / 100;
  const totalCost = Math.round((stockPurchaseCost + directExpensesCost + serviceCost) * 100) / 100;
  const hasCostData = totalCost > 0;
  const netProfit = Math.round((netRevenue - totalCost) * 100) / 100;
  const marginPercent = netRevenue > 0 ? Math.round((netProfit / netRevenue) * 1000) / 10 : 0;
  const minMarginPercent = Number(companySettings?.minMarginPercent ?? 15);
  const isBelowMinMargin = hasCostData && netRevenue > 0 && marginPercent < minMarginPercent;

  return {
    agreedRevenue,
    netRevenue,
    vatCollected,
    paidByCustomer,
    remainingToPay,
    stockPurchaseCost,
    hasActualStockInvoice,
    directExpensesCost,
    serviceCost,
    totalCost,
    hasCostData,
    netProfit,
    marginPercent,
    isBelowMinMargin,
  };
}
