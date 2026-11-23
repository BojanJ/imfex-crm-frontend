import { describe, it, expect } from 'vitest';
import {
  computeAgingAndVatSummary,
  computeCustomerFinancialProfile,
  computeOfferMarginSummary,
  computeOfferTotals,
  computeProjectFinancialSummary,
  findTechnicianCalendarConflicts,
  getServiceSlaStatus,
  getWarrantyStatus,
  isOfferExpired,
} from '../selectors';
import { buildCsvString } from '../csv-export';
import {
  canDeleteRecords,
  canEmailInvoices,
  canEmailOffers,
  canManageCatalog,
  canManageSettings,
  canViewFinance,
  canViewOffers,
  canViewPurchaseCosts,
  canWriteCustomers,
  canWriteFinance,
  canWriteOffers,
  canWriteOperations,
  canWriteSales,
  canWriteSalesFinance,
} from '../rbac';
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

  it('enforces frontend RBAC helpers mirroring backend ROLE_GROUPS across all 5 roles (BIZ-15)', () => {
    // Finance visibility & purchase cost visibility
    expect(canViewFinance('SUPER_ADMIN')).toBe(true);
    expect(canViewFinance('ACCOUNTANT')).toBe(true);
    expect(canViewFinance('SALES')).toBe(true);
    expect(canViewFinance('TECHNICIAN')).toBe(false);
    expect(canViewFinance('USER')).toBe(false);

    expect(canViewPurchaseCosts('SUPER_ADMIN')).toBe(true);
    expect(canViewPurchaseCosts('ACCOUNTANT')).toBe(true);
    expect(canViewPurchaseCosts('SALES')).toBe(true);
    expect(canViewPurchaseCosts('TECHNICIAN')).toBe(false);
    expect(canViewPurchaseCosts('USER')).toBe(false);

    // Finance write (procurement/void/reminders) vs Sales-Finance write (sales invoices/advances/dispatches)
    expect(canWriteFinance('SUPER_ADMIN')).toBe(true);
    expect(canWriteFinance('ACCOUNTANT')).toBe(true);
    expect(canWriteFinance('SALES')).toBe(false);
    expect(canWriteFinance('TECHNICIAN')).toBe(false);
    expect(canWriteFinance('USER')).toBe(false);

    expect(canWriteSalesFinance('SUPER_ADMIN')).toBe(true);
    expect(canWriteSalesFinance('ACCOUNTANT')).toBe(true);
    expect(canWriteSalesFinance('SALES')).toBe(true);
    expect(canWriteSalesFinance('TECHNICIAN')).toBe(false);
    expect(canWriteSalesFinance('USER')).toBe(false);

    // Offers read vs write
    expect(canViewOffers('SUPER_ADMIN')).toBe(true);
    expect(canViewOffers('SALES')).toBe(true);
    expect(canViewOffers('ACCOUNTANT')).toBe(true);
    expect(canViewOffers('USER')).toBe(true);
    expect(canViewOffers('TECHNICIAN')).toBe(false);

    expect(canWriteOffers('SUPER_ADMIN')).toBe(true);
    expect(canWriteOffers('SALES')).toBe(true);
    expect(canWriteOffers('USER')).toBe(true);
    expect(canWriteOffers('ACCOUNTANT')).toBe(false);
    expect(canWriteOffers('TECHNICIAN')).toBe(false);
    expect(canWriteSales('SALES')).toBe(true);
    expect(canWriteSales('TECHNICIAN')).toBe(false);

    // Customers, Catalog, Operations, Email, Settings & Delete
    expect(canWriteCustomers('ACCOUNTANT')).toBe(true);
    expect(canWriteCustomers('TECHNICIAN')).toBe(false);

    expect(canManageCatalog('SUPER_ADMIN')).toBe(true);
    expect(canManageCatalog('SALES')).toBe(true);
    expect(canManageCatalog('ACCOUNTANT')).toBe(false);
    expect(canManageCatalog('TECHNICIAN')).toBe(false);
    expect(canManageCatalog('USER')).toBe(false);

    expect(canWriteOperations('SUPER_ADMIN')).toBe(true);
    expect(canWriteOperations('SALES')).toBe(true);
    expect(canWriteOperations('TECHNICIAN')).toBe(true);
    expect(canWriteOperations('USER')).toBe(true);
    expect(canWriteOperations('ACCOUNTANT')).toBe(false);

    expect(canEmailOffers('SALES')).toBe(true);
    expect(canEmailOffers('ACCOUNTANT')).toBe(false);
    expect(canEmailOffers('USER')).toBe(false);

    expect(canEmailInvoices('ACCOUNTANT')).toBe(true);
    expect(canEmailInvoices('SALES')).toBe(true);
    expect(canEmailInvoices('USER')).toBe(false);

    expect(canDeleteRecords('SUPER_ADMIN')).toBe(true);
    expect(canDeleteRecords('ACCOUNTANT')).toBe(false);
    expect(canDeleteRecords('SALES')).toBe(false);
    expect(canDeleteRecords('TECHNICIAN')).toBe(false);
    expect(canDeleteRecords('USER')).toBe(false);

    expect(canManageSettings('SUPER_ADMIN')).toBe(true);
    expect(canManageSettings('SALES')).toBe(false);
    expect(canManageSettings('ACCOUNTANT')).toBe(false);
  });

  it('computes unbilled completed projects, AR/AP aging buckets, VAT summary & safe CSV export (BIZ-08, BIZ-09, BIZ-10)', () => {
    const refDate = new Date('2026-11-22T12:00:00Z');
    const summary = computeAgingAndVatSummary({
      projects: [
        { id: 'p-1', projectNumber: 'PRJ-1', offerId: 'o-1', customerId: 'c-1', status: 'COMPLETED', createdAt: '2026-10-01' },
      ],
      offers: [
        {
          id: 'o-1',
          offerNumber: 'OFF-1',
          customerId: 'c-1',
          status: 'ACCEPTED',
          taxRate: 18,
          discountRate: 0,
          discountAmount: 0,
          subtotal: 2000,
          taxAmount: 360,
          totalAmount: 2360,
          createdAt: '2026-10-01',
          items: [],
        },
      ],
      salesInvoices: [
        {
          id: 's-1',
          invoiceNumber: 'AVN-1',
          invoiceType: 'ADVANCE',
          status: 'ISSUED',
          customerId: 'c-1',
          projectId: 'p-1',
          issueDate: '2026-10-05',
          dueDate: '2026-10-10', // 43 days overdue -> d31_60
          taxRate: 18,
          discountRate: 0,
          discountAmount: 0,
          subtotal: 1000,
          taxAmount: 180,
          grossTotalAmount: 1180,
          advanceDeductedAmount: 0,
          totalAmount: 1180,
          paidAmount: 180,
          items: [],
          createdAt: '2026-10-05',
        },
      ],
      purchaseInvoices: [
        {
          id: 'pi-1',
          internalNumber: 'NAB-1',
          supplierId: 'sup-1',
          supplierName: 'Doors Impex',
          issueDate: '2026-10-15',
          dueDate: '2026-11-10', // 12 days overdue -> d1_30
          status: 'INVOICED',
          receiptStatus: 'RECEIVED',
          taxRate: 18,
          subtotal: 500,
          taxAmount: 90,
          totalAmount: 590,
          paidAmount: 0,
          items: [],
          createdAt: '2026-10-15',
        },
      ],
      referenceDate: refDate,
    });

    expect(summary.unbilledCompletedProjects).toHaveLength(1);
    expect(summary.unbilledCompletedTotal).toBe(2360);
    expect(summary.arAging.d31_60).toBe(1000);
    expect(summary.arAging.overdueCount).toBe(1);
    expect(summary.apAging.d1_30).toBe(590);
    expect(summary.vatSummary.outputVat).toBe(180);
    expect(summary.vatSummary.inputVat).toBe(90);
    expect(summary.vatSummary.netVatPayable).toBe(90);

    const csv = buildCsvString(['Name', 'Note'], [['=HYPERLINK("bad")', 'Hello, "World"']]);
    expect(csv.startsWith('\uFEFF')).toBe(true);
    expect(csv).toContain(`"'=HYPERLINK(""bad"")","Hello, ""World"""`);
  });

  it('evaluates warranty status, service SLA breaches & technician calendar conflicts (BIZ-11, BIZ-13)', () => {
    const ref = new Date('2026-11-22T12:00:00Z');

    const activeWarranty = getWarrantyStatus(
      { id: 'i1', customerId: 'c1', title: 'Door', installationDate: '2026-01-01', warrantyMonths: 24 },
      ref
    );
    expect(activeWarranty.status).toBe('IN_WARRANTY');

    const expiredWarranty = getWarrantyStatus(
      { id: 'i2', customerId: 'c1', title: 'Old Door', installationDate: '2023-01-01', warrantyMonths: 24 },
      ref
    );
    expect(expiredWarranty.status).toBe('EXPIRED');

    const breachedSla = getServiceSlaStatus(
      { priority: 'URGENT', status: 'OPEN', createdAt: '2026-11-22T02:00:00Z' },
      ref
    );
    expect(breachedSla.targetHours).toBe(4);
    expect(breachedSla.breached).toBe(true);

    const conflicts = findTechnicianCalendarConflicts(
      [
        {
          id: 'ev-1',
          title: 'Install #1',
          startDate: '2026-11-25T09:00',
          endDate: '2026-11-25T11:00',
          eventType: 'INSTALLATION',
          assignedUserId: 'tech-1',
          createdAt: '2026-11-20',
        },
      ],
      {
        assignedUserId: 'tech-1',
        startDate: '2026-11-25T10:00',
        endDate: '2026-11-25T12:00',
      }
    );
    expect(conflicts).toHaveLength(1);
    expect(conflicts[0].id).toBe('ev-1');
  });

  it('detects expired SENT quotes & evaluates Customer 360 LTV/overdue/credit limit (BIZ-04, BIZ-14)', () => {
    const ref = new Date('2026-11-22T12:00:00Z');
    expect(isOfferExpired({ status: 'SENT', validUntil: '2026-11-10' }, ref)).toBe(true);
    expect(isOfferExpired({ status: 'ACCEPTED', validUntil: '2026-11-10' }, ref)).toBe(false);
    expect(isOfferExpired({ status: 'SENT', validUntil: '2026-12-10' }, ref)).toBe(false);

    const profile = computeCustomerFinancialProfile({
      customer: { id: 'c1', creditLimit: 1000 },
      offers: [
        {
          id: 'o1',
          offerNumber: 'OFF-1',
          customerId: 'c1',
          status: 'ACCEPTED',
          taxRate: 18,
          discountRate: 0,
          discountAmount: 0,
          subtotal: 2000,
          taxAmount: 360,
          totalAmount: 2360,
          createdAt: '2026-10-01',
          items: [],
        },
      ],
      salesInvoices: [
        {
          id: 's1',
          invoiceNumber: 'FAK-1',
          invoiceType: 'FINAL',
          status: 'ISSUED',
          customerId: 'c1',
          issueDate: '2026-10-01',
          dueDate: '2026-10-15',
          taxRate: 18,
          discountRate: 0,
          discountAmount: 0,
          subtotal: 2000,
          taxAmount: 360,
          grossTotalAmount: 2360,
          advanceDeductedAmount: 0,
          totalAmount: 2360,
          paidAmount: 1000,
          items: [],
          createdAt: '2026-10-01',
        },
      ],
      payments: [
        {
          id: 'p1',
          paymentNumber: 'UPL-1',
          direction: 'IN',
          amount: 1000,
          date: '2026-10-05',
          method: 'BANK',
          customerId: 'c1',
          createdAt: '2026-10-05',
        },
      ],
      referenceDate: ref,
    });

    expect(profile.lifetimeValue).toBe(2360);
    expect(profile.openBalance).toBe(1360);
    expect(profile.overdueBalance).toBe(1360);
    expect(profile.overdueInvoiceCount).toBe(1);
    expect(profile.isOverCreditLimit).toBe(true);
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
