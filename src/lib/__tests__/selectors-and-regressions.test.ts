import { describe, it, expect } from 'vitest';
import { computeOfferMarginSummary, computeOfferTotals, computeProjectFinancialSummary } from '../selectors';
import { canDeleteRecords, canViewFinance, canWriteFinance, canWriteSales } from '../rbac';
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
    // BIZ-01: Net revenue = 5000 (ex-VAT), VAT = 900, Gross = 5900 -> Net Profit = 5000 - 3000 = 2000 (40%)
    const estimated = computeProjectFinancialSummary({
      project,
      offers,
      salesInvoices,
      purchaseInvoices: [],
      payments,
      products,
    });
    expect(estimated.agreedRevenue).toBe(5900);
    expect(estimated.netRevenue).toBe(5000);
    expect(estimated.vatCollected).toBe(900);
    expect(estimated.paidByCustomer).toBe(2950);
    expect(estimated.remainingToPay).toBe(2950);
    expect(estimated.hasActualStockInvoice).toBe(false);
    expect(estimated.stockPurchaseCost).toBe(3000);
    expect(estimated.netProfit).toBe(2000);
    expect(estimated.marginPercent).toBe(40);
    expect(estimated.hasCostData).toBe(true);

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
    // BIZ-01: 5000 net revenue - 3400 net cost = 1600 (32%) — never inflated by €900 VAT
    expect(actual.netProfit).toBe(1600);
    expect(actual.marginPercent).toBe(32);
  });

  it('computes Offer Builder pre-sale gross margin & flags low-margin discounts (BIZ-02, BIZ-03)', () => {
    const products: Product[] = [
      {
        id: 'door-1',
        name: 'Garage Door',
        code: 'GV-01',
        isActive: true,
        stockType: 'CUSTOM',
        purchasePrice: 600,
        models: [],
        specificationKeys: [],
      },
      {
        id: 'motor-1',
        name: 'Bravo 800',
        code: 'AV-01',
        isActive: true,
        stockType: 'STOCK',
        purchasePrice: 200,
        models: [],
        specificationKeys: [],
      },
    ];

    const items = [
      {
        id: 'it-1',
        serviceTypes: ['PRODUCT' as const],
        productId: 'door-1',
        selectedAccessories: { motorId: 'motor-1' },
        quantity: 1,
        unitPrice: 1000,
        totalPrice: 1000,
      },
    ];

    // No discount: net 1000 - cost (600 + 200) = 200 (20% >= 15% min)
    const healthy = computeOfferMarginSummary({ items, products, discountRate: 0, companySettings: { minMarginPercent: 15 } });
    expect(healthy.estimatedCost).toBe(800);
    expect(healthy.estimatedProfit).toBe(200);
    expect(healthy.marginPercent).toBe(20);
    expect(healthy.isBelowMinMargin).toBe(false);

    // 10% discount: net 900 - cost 800 = 100 (11.1% < 15% min -> flagged!)
    const low = computeOfferMarginSummary({ items, products, discountRate: 10, companySettings: { minMarginPercent: 15 } });
    expect(low.netRevenue).toBe(900);
    expect(low.estimatedProfit).toBe(100);
    expect(low.marginPercent).toBe(11.1);
    expect(low.isBelowMinMargin).toBe(true);
  });

  it('enforces frontend RBAC helpers mirroring backend ROLE_GROUPS (BIZ-15)', () => {
    expect(canViewFinance('SUPER_ADMIN')).toBe(true);
    expect(canViewFinance('ACCOUNTANT')).toBe(true);
    expect(canViewFinance('SALES')).toBe(true);
    expect(canViewFinance('TECHNICIAN')).toBe(false);
    expect(canWriteFinance('ACCOUNTANT')).toBe(true);
    expect(canWriteFinance('SALES')).toBe(false);
    expect(canWriteSales('SALES')).toBe(true);
    expect(canWriteSales('TECHNICIAN')).toBe(false);
    expect(canDeleteRecords('SUPER_ADMIN')).toBe(true);
    expect(canDeleteRecords('ACCOUNTANT')).toBe(false);
    expect(canDeleteRecords('SALES')).toBe(false);
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
