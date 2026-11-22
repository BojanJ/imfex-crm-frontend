import { describe, it, expect } from 'vitest';
import { computeOfferTotals, computeProjectFinancialSummary } from '../selectors';
import mk from '@/i18n/mk.json';
import en from '@/i18n/en.json';
import type { Offer, PaymentRecord, Product, Project, PurchaseInvoice, SalesInvoice } from '@/types';

describe('Pure Selectors & R2 Regression Guards (IMP-08, IMP-12)', () => {
  it('computes Offer totals deterministically without double-counting (FE-15)', () => {
    const items = [
      { unitPrice: 1200, quantity: 2, totalPrice: 2400 },
      { unitPrice: 350.5, quantity: 1, totalPrice: 350.5 },
    ];
    // 10% discount on 2750.50 = 275.05 -> taxable 2475.45 -> 18% VAT = 445.58 -> total 2921.03
    const res = computeOfferTotals(items, 10, 18);
    expect(res.subtotal).toBe(2750.5);
    expect(res.discountAmount).toBe(275.05);
    expect(res.taxAmount).toBe(445.58);
    expect(res.totalAmount).toBe(2921.03);

    // 0% VAT must stay strictly 0 (not fall back to 18%)
    const zeroVat = computeOfferTotals(items, 0, 0);
    expect(zeroVat.taxAmount).toBe(0);
    expect(zeroVat.totalAmount).toBe(2750.5);
  });

  it('computes Project Financial Summary from TanStack Query arrays (FE-16, IMP-08)', () => {
    const project = {
      id: 'prj-1',
      projectNumber: 'PRJ-2026-0001',
      offerId: 'off-1',
      customerId: 'cust-1',
      status: 'PROCUREMENT',
      createdAt: '2026-11-01T10:00:00Z',
    } as Project;

    const offers: Offer[] = [
      {
        id: 'off-1',
        offerNumber: 'OFF-2026-0001',
        customerId: 'cust-1',
        status: 'ACCEPTED',
        taxRate: 18,
        discountRate: 0,
        discountAmount: 0,
        subtotal: 5000,
        taxAmount: 900,
        totalAmount: 5900,
        createdAt: '2026-11-01T09:00:00Z',
        items: [
          {
            id: 'oi-1',
            serviceTypes: ['PRODUCT'],
            productId: 'prod-1',
            quantity: 2,
            unitPrice: 2500,
            totalPrice: 5000,
            specifications: [],
          },
        ],
      },
    ];

    const salesInvoices: SalesInvoice[] = [
      {
        id: 'sinv-1',
        invoiceNumber: 'AVN-2026-0001',
        invoiceType: 'ADVANCE',
        status: 'PAID',
        customerId: 'cust-1',
        projectId: 'prj-1',
        offerId: 'off-1',
        issueDate: '2026-11-02',
        taxRate: 18,
        discountRate: 0,
        discountAmount: 0,
        subtotal: 2500,
        taxAmount: 450,
        grossTotalAmount: 2950,
        advanceDeductedAmount: 0,
        totalAmount: 2950,
        paidAmount: 2950,
        items: [],
        createdAt: '2026-11-02T10:00:00Z',
      },
    ];

    const payments: PaymentRecord[] = [
      {
        id: 'pay-1',
        paymentNumber: 'UPL-2026-0001',
        direction: 'IN',
        amount: 2950,
        date: '2026-11-02',
        method: 'BANK',
        projectId: 'prj-1',
        salesInvoiceId: 'sinv-1',
        isAdvance: true,
        createdAt: '2026-11-02T10:00:00Z',
      },
    ];

    const products: Product[] = [
      {
        id: 'prod-1',
        name: 'Sectional Door',
        code: 'GV-001',
        isActive: true,
        stockType: 'CUSTOM',
        purchasePrice: 1500,
        models: [],
        specificationKeys: [],
      },
    ];

    // Case 1: No actual STOCK purchase invoice -> uses catalog purchasePrice fallback (2 * 1500 = 3000)
    const estimated = computeProjectFinancialSummary({
      project,
      offers,
      salesInvoices,
      purchaseInvoices: [],
      payments,
      products,
    });
    expect(estimated.agreedRevenue).toBe(5900);
    expect(estimated.paidByCustomer).toBe(2950);
    expect(estimated.remainingToPay).toBe(2950);
    expect(estimated.hasActualStockInvoice).toBe(false);
    expect(estimated.stockPurchaseCost).toBe(3000);
    expect(estimated.netProfit).toBe(2900);
    expect(estimated.marginPercent).toBe(49.2);

    // Case 2: Actual STOCK + EXPENSE purchase invoice overrides catalog estimate
    const purchaseInvoices: PurchaseInvoice[] = [
      {
        id: 'pinv-1',
        internalNumber: 'NAB-2026-0001',
        supplierId: 'sup-1',
        supplierName: 'Doors Impex',
        projectId: 'prj-1',
        issueDate: '2026-11-05',
        status: 'INVOICED',
        receiptStatus: 'RECEIVED',
        taxRate: 18,
        subtotal: 3400,
        taxAmount: 612,
        totalAmount: 4012,
        paidAmount: 0,
        items: [
          { id: 'pi-1', itemType: 'STOCK', title: 'Door kit', quantity: 2, unitCost: 1600, totalCost: 3200 },
          { id: 'pi-2', itemType: 'EXPENSE', title: 'Fuel', quantity: 1, unitCost: 200, totalCost: 200 },
        ],
        createdAt: '2026-11-05T10:00:00Z',
      },
    ];

    const actual = computeProjectFinancialSummary({
      project,
      offers,
      salesInvoices,
      purchaseInvoices,
      payments,
      products,
    });
    expect(actual.hasActualStockInvoice).toBe(true);
    expect(actual.stockPurchaseCost).toBe(3200);
    expect(actual.directExpensesCost).toBe(200);
    expect(actual.totalCost).toBe(3400);
    expect(actual.netProfit).toBe(2500);
  });

  it('guarantees full i18n coverage across finance, products, settings, service, builder & fixes MK typos (I18N-08..I18N-12)', () => {
    const requiredNamespaces = [
      'nav',
      'dashboard',
      'login',
      'products',
      'finance',
      'customers',
      'offers',
      'projects',
      'service',
      'calendar',
      'settings',
      'users',
      'builder',
    ] as const;

    for (const ns of requiredNamespaces) {
      const mkNs = (mk as unknown as Record<string, Record<string, string>>)[ns];
      const enNs = (en as unknown as Record<string, Record<string, string>>)[ns];
      expect(mkNs, `Missing MK namespace ${ns}`).toBeDefined();
      expect(enNs, `Missing EN namespace ${ns}`).toBeDefined();
      expect(Object.keys(mkNs).sort()).toEqual(Object.keys(enNs).sort());
      for (const [k, v] of Object.entries(mkNs)) {
        expect(v.trim().length, `Empty MK key ${ns}.${k}`).toBeGreaterThan(0);
      }
      for (const [k, v] of Object.entries(enNs)) {
        expect(v.trim().length, `Empty EN key ${ns}.${k}`).toBeGreaterThan(0);
      }
    }

    // Regression check for I18N-12 MK typo
    expect(mk.dashboard.field_dispatch).toBe('Доделба на теренски техничар');
    expect(mk.offers.item_singular).toBe('ставка');
    expect(en.offers.item_singular).toBe('item');
  });
});
