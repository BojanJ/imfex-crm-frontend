import type {
  Offer,
  OfferItem,
  PaymentRecord,
  Product,
  Project,
  PurchaseInvoice,
  SalesInvoice,
} from '@/types';

export interface OfferTotalsSummary {
  subtotal: number;
  discountAmount: number;
  taxAmount: number;
  totalAmount: number;
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
  const subtotal = Math.round(
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

export interface ProjectFinancialSummary {
  agreedRevenue: number;
  paidByCustomer: number;
  remainingToPay: number;
  stockPurchaseCost: number;
  hasActualStockInvoice: boolean;
  directExpensesCost: number;
  totalCost: number;
  netProfit: number;
  marginPercent: number;
}

/**
 * Pure TanStack-Query-driven Project Financial Summary selector (IMP-08).
 * Eliminates dual-source-of-truth drift between React Query caches and legacy ImfexStore getters.
 */
export function computeProjectFinancialSummary(params: {
  project: Project;
  offers: Offer[];
  salesInvoices: SalesInvoice[];
  purchaseInvoices: PurchaseInvoice[];
  payments: PaymentRecord[];
  products: Product[];
}): ProjectFinancialSummary {
  const { project, offers, salesInvoices, purchaseInvoices, payments, products } = params;

  const linkedOffer =
    offers.find((o) => o.id === project.offerId) || project.offer || null;

  const projectSalesInvoices = salesInvoices.filter(
    (s) => s.projectId === project.id || (project.offerId && s.offerId === project.offerId)
  );
  const finalInv = projectSalesInvoices.find((s) => s.invoiceType === 'FINAL');

  const agreedRevenue =
    Number(finalInv?.grossTotalAmount || 0) ||
    Number(linkedOffer?.totalAmount || 0) ||
    projectSalesInvoices.reduce((s, inv) => s + Number(inv.totalAmount || 0), 0);

  const projectPaymentsIn = payments.filter(
    (p) =>
      p.direction === 'IN' &&
      (p.projectId === project.id ||
        (project.offerId && p.offerId === project.offerId) ||
        projectSalesInvoices.some((si) => si.id === p.salesInvoiceId))
  );
  const paidByCustomer = Math.round(
    projectPaymentsIn.reduce((s, p) => s + Number(p.amount || 0), 0) * 100
  ) / 100;
  const remainingToPay = Math.max(0, Math.round((agreedRevenue - paidByCustomer) * 100) / 100);

  // Actual purchase invoices linked to this project
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

  // Fallback estimated catalog purchase cost when no actual STOCK purchase invoice exists yet
  let estimatedStockCost = 0;
  if (!hasActualStockInvoice && linkedOffer?.items?.length) {
    linkedOffer.items.forEach((item) => {
      if (item.productId) {
        const prod = products.find((p) => p.id === item.productId);
        if (prod && Number(prod.purchasePrice || 0) > 0) {
          estimatedStockCost += Number(prod.purchasePrice) * Number(item.quantity || 1);
        }
      }
    });
  }

  const stockPurchaseCost = Math.round((hasActualStockInvoice ? actualStockCost : estimatedStockCost) * 100) / 100;
  directExpensesCost = Math.round(directExpensesCost * 100) / 100;
  const totalCost = Math.round((stockPurchaseCost + directExpensesCost) * 100) / 100;
  const netProfit = Math.round((agreedRevenue - totalCost) * 100) / 100;
  const marginPercent = agreedRevenue > 0 ? Math.round((netProfit / agreedRevenue) * 1000) / 10 : 0;

  return {
    agreedRevenue,
    paidByCustomer,
    remainingToPay,
    stockPurchaseCost,
    hasActualStockInvoice,
    directExpensesCost,
    totalCost,
    netProfit,
    marginPercent,
  };
}
