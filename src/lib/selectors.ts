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

export interface AgingBuckets {
  current: number;
  d1_30: number;
  d31_60: number;
  d61_90: number;
  d90_plus: number;
  totalOpen: number;
  overdueTotal: number;
  overdueCount: number;
}

export interface VatPeriodSummary {
  salesNet: number;
  outputVat: number;
  purchasesNet: number;
  inputVat: number;
  netVatPayable: number;
}

export interface AgingAndVatSummary {
  unbilledCompletedProjects: Array<{
    project: Project;
    estimatedAmount: number;
  }>;
  unbilledCompletedTotal: number;
  arAging: AgingBuckets;
  apAging: AgingBuckets;
  vatSummary: VatPeriodSummary;
}

export function getInvoiceOverdueDays(dueDate?: string | null, referenceDate = new Date()): number {
  if (!dueDate) return 0;
  const due = new Date(dueDate);
  if (Number.isNaN(due.getTime())) return 0;
  const refDay = new Date(referenceDate.getFullYear(), referenceDate.getMonth(), referenceDate.getDate());
  const dueDay = new Date(due.getFullYear(), due.getMonth(), due.getDate());
  const diffMs = refDay.getTime() - dueDay.getTime();
  return diffMs > 0 ? Math.floor(diffMs / 86_400_000) : 0;
}

function emptyAgingBuckets(): AgingBuckets {
  return {
    current: 0,
    d1_30: 0,
    d31_60: 0,
    d61_90: 0,
    d90_plus: 0,
    totalOpen: 0,
    overdueTotal: 0,
    overdueCount: 0,
  };
}

function accumulateAging(buckets: AgingBuckets, amount: number, overdueDays: number) {
  const safeAmt = Math.max(0, Math.round(amount * 100) / 100);
  if (safeAmt <= 0.005) return;
  buckets.totalOpen = Math.round((buckets.totalOpen + safeAmt) * 100) / 100;
  if (overdueDays <= 0) {
    buckets.current = Math.round((buckets.current + safeAmt) * 100) / 100;
  } else {
    buckets.overdueTotal = Math.round((buckets.overdueTotal + safeAmt) * 100) / 100;
    buckets.overdueCount += 1;
    if (overdueDays <= 30) buckets.d1_30 = Math.round((buckets.d1_30 + safeAmt) * 100) / 100;
    else if (overdueDays <= 60) buckets.d31_60 = Math.round((buckets.d31_60 + safeAmt) * 100) / 100;
    else if (overdueDays <= 90) buckets.d61_90 = Math.round((buckets.d61_90 + safeAmt) * 100) / 100;
    else buckets.d90_plus = Math.round((buckets.d90_plus + safeAmt) * 100) / 100;
  }
}

/**
 * Pure selector computing Unbilled Completed Projects, AR/AP 0-30/31-60/61-90/90+ Aging,
 * and period-filtered Output vs Input DDV (VAT) summary (BIZ-08, BIZ-09).
 */
export function computeAgingAndVatSummary(params: {
  projects: Project[];
  offers: Offer[];
  salesInvoices: SalesInvoice[];
  purchaseInvoices: PurchaseInvoice[];
  fromDate?: string;
  toDate?: string;
  referenceDate?: Date;
}): AgingAndVatSummary {
  const { projects, offers, salesInvoices, purchaseInvoices, fromDate, toDate, referenceDate = new Date() } = params;

  const inPeriod = (isoDate?: string | null): boolean => {
    if (!fromDate && !toDate) return true;
    if (!isoDate) return false;
    const d = isoDate.slice(0, 10);
    if (fromDate && d < fromDate) return false;
    if (toDate && d > toDate) return false;
    return true;
  };

  // 1. Unbilled completed/closed projects (no active FINAL invoice)
  const unbilledCompletedProjects: Array<{ project: Project; estimatedAmount: number }> = [];
  for (const project of projects) {
    if (project.status !== 'COMPLETED' && project.status !== 'CLOSED') continue;
    const hasFinal = salesInvoices.some(
      (s) =>
        s.status !== 'CANCELLED' &&
        s.invoiceType === 'FINAL' &&
        (s.projectId === project.id || (project.offerId && s.offerId === project.offerId))
    );
    if (!hasFinal) {
      const offer = offers.find((o) => o.id === project.offerId) || project.offer;
      unbilledCompletedProjects.push({
        project,
        estimatedAmount: Math.round(Number(offer?.totalAmount || 0) * 100) / 100,
      });
    }
  }
  const unbilledCompletedTotal =
    Math.round(unbilledCompletedProjects.reduce((sum, x) => sum + x.estimatedAmount, 0) * 100) / 100;

  // 2. AR Aging & Output VAT
  const arAging = emptyAgingBuckets();
  let salesNet = 0;
  let outputVat = 0;
  for (const inv of salesInvoices) {
    if (inv.status === 'CANCELLED') continue;
    if (inv.status !== 'PAID' && inv.invoiceType !== 'CREDIT_NOTE' && inv.invoiceType !== 'PROFORMA') {
      const remaining = Math.max(0, Number(inv.totalAmount || 0) - Number(inv.paidAmount || 0));
      accumulateAging(arAging, remaining, getInvoiceOverdueDays(inv.dueDate, referenceDate));
    }
    if (inv.invoiceType !== 'PROFORMA' && inPeriod(inv.issueDate)) {
      const sign = inv.invoiceType === 'CREDIT_NOTE' ? -1 : 1;
      const net = Math.max(0, Number(inv.subtotal || 0) - Number(inv.discountAmount || 0));
      salesNet += sign * net;
      outputVat += sign * Number(inv.taxAmount || 0);
    }
  }

  // 3. AP Aging & Input VAT
  const apAging = emptyAgingBuckets();
  let purchasesNet = 0;
  let inputVat = 0;
  for (const pinv of purchaseInvoices) {
    if (pinv.status === 'CANCELLED') continue;
    if (pinv.status !== 'PAID' && pinv.status !== 'DRAFT') {
      const remaining = Math.max(0, Number(pinv.totalAmount || 0) - Number(pinv.paidAmount || 0));
      accumulateAging(apAging, remaining, getInvoiceOverdueDays(pinv.dueDate, referenceDate));
    }
    if (pinv.status !== 'DRAFT' && inPeriod(pinv.issueDate)) {
      purchasesNet += Number(pinv.subtotal || 0);
      inputVat += Number(pinv.taxAmount || 0);
    }
  }

  salesNet = Math.round(salesNet * 100) / 100;
  outputVat = Math.round(outputVat * 100) / 100;
  purchasesNet = Math.round(purchasesNet * 100) / 100;
  inputVat = Math.round(inputVat * 100) / 100;
  const netVatPayable = Math.round((outputVat - inputVat) * 100) / 100;

  return {
    unbilledCompletedProjects,
    unbilledCompletedTotal,
    arAging,
    apAging,
    vatSummary: {
      salesNet,
      outputVat,
      purchasesNet,
      inputVat,
      netVatPayable,
    },
  };
}
