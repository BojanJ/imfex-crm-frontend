import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import {
  generateOfferVectorPdf,
  generateSalesInvoiceVectorPdf,
  generateDispatchNoteVectorPdf,
  registerPdfFontLoader,
} from '../pdf-generator';
import type { CompanySettings, DispatchNote, Offer, Product, SalesInvoice } from '@/types';

const sampleCompany: CompanySettings = {
  id: 'default',
  companyName: 'ИМФЕКС ЕКСПОРТ-ИМПОРТ ДООЕЛ',
  address: 'Ул. Качанички Пат бб, Скопје',
  taxId: 'МК4030998123456',
  phone: '+389 2 3123 456',
  email: 'info@imfex.com',
  bankAccount: '200001234567890',
  defaultAdvancePercent: 50,
};

const sampleProduct: Product = {
  id: 'prod-1',
  code: 'SEC-DOOR-40',
  name: 'Секциона Гаражна Врата',
  isActive: true,
  stockType: 'CUSTOM',
  stockQuantity: 0,
  reservedQuantity: 0,
  purchasePrice: 600,
  models: [{ id: 'mod-1', productId: 'prod-1', name: 'ISO-40 Премиум', basePrice: 1200 }],
  specificationKeys: [
    {
      id: 'spec-1',
      productId: 'prod-1',
      name: 'Боја на панел',
      inputType: 'SELECT',
      options: [{ id: 'opt-1', specificationKeyId: 'spec-1', label: 'Антрацит RAL 7016', priceModifier: 100 }],
    },
  ],
};

const sampleOffer: Offer = {
  id: 'off-1',
  offerNumber: 'OFF-2026-0001',
  customerId: 'cust-1',
  customer: {
    id: 'cust-1',
    name: 'Марко Петровски',
    companyName: 'Техно Градба ДООЕЛ',
    customerType: 'COMPANY',
    city: 'Скопје',
    phone: '+389 70 111 222',
    email: 'marko@tehnogradba.mk',
    createdAt: '2026-11-21T10:00:00.000Z',
  },
  status: 'SENT',
  taxRate: 18,
  discountRate: 5,
  discountAmount: 65,
  subtotal: 1300,
  taxAmount: 222.3,
  totalAmount: 1457.3,
  validUntil: '2026-12-31T00:00:00.000Z',
  createdAt: '2026-11-21T10:00:00.000Z',
  items: [
    {
      id: 'item-1',
      productId: 'prod-1',
      productModelId: 'mod-1',
      customTitle: 'Секциона Врата - ISO-40 Премиум',
      serviceTypes: ['PRODUCT', 'INSTALLATION'],
      widthMm: 3000,
      heightMm: 2500,
      quantity: 1,
      unitPrice: 1300,
      totalPrice: 1300,
      specifications: [
        {
          specificationKeyId: 'spec-1',
          specificationOptionId: 'opt-1',
          customKeyName: 'Боја на панел',
          customValue: 'Антрацит RAL 7016',
        },
      ],
    },
  ],
};

describe('Vector PDF Generators (IMP-03)', () => {
  beforeAll(() => {
    const fontsDir = path.resolve(import.meta.dirname, '../../../public/fonts');
    registerPdfFontLoader(async () => ({
      regular: fs.readFileSync(path.join(fontsDir, 'DejaVuSans.ttf')).toString('base64'),
      bold: fs.readFileSync(path.join(fontsDir, 'DejaVuSans-Bold.ttf')).toString('base64'),
    }));
  });

  afterAll(() => {
    registerPdfFontLoader(null);
  });

  it('generates a multi-page selectable vector Offer PDF with %PDF- magic bytes and embedded Cyrillic font', async () => {
    const { pdf, pdfBase64 } = await generateOfferVectorPdf(sampleOffer, [sampleProduct], sampleCompany);
    const bytes = Buffer.from(pdfBase64, 'base64');

    expect(bytes.subarray(0, 5).toString('ascii')).toBe('%PDF-');
    expect(pdf.getNumberOfPages()).toBeGreaterThanOrEqual(3);
    // Vector PDF with embedded compressed font must stay well under rasterized multi-MB screenshot sizes
    expect(bytes.length).toBeGreaterThan(10_000);
    expect(bytes.length).toBeLessThan(1_500_000);

    // Ensure embedded TrueType/CID font (DejaVuSans) is declared in PDF dictionary (selectable vector text, not JPEG raster)
    const pdfLatin1 = bytes.toString('latin1');
    expect(pdfLatin1).toContain('DejaVuSans');
    expect(pdfLatin1).not.toContain('/Subtype /Image');
  });

  it('generates a selectable vector Sales Invoice PDF with advance deduction breakdown', async () => {
    const invoice: SalesInvoice = {
      id: 'sinv-1',
      invoiceNumber: 'FAK-2026-0001',
      invoiceType: 'FINAL',
      status: 'ISSUED',
      customerId: 'cust-1',
      customer: sampleOffer.customer,
      issueDate: '2026-11-21',
      dueDate: '2026-12-05',
      taxRate: 18,
      discountRate: 0,
      discountAmount: 0,
      subtotal: 1300,
      taxAmount: 234,
      grossTotalAmount: 1534,
      linkedAdvanceInvoiceNumber: 'AVN-2026-0001',
      advanceDeductedAmount: 767,
      totalAmount: 767,
      paidAmount: 0,
      items: [
        {
          id: 'si-1',
          title: 'Секциона Врата - ISO-40 Премиум',
          quantity: 1,
          unitPrice: 1300,
          totalPrice: 1300,
        },
      ],
      createdAt: '2026-11-21T10:00:00.000Z',
    };

    const { pdf, pdfBase64 } = await generateSalesInvoiceVectorPdf(invoice, sampleCompany, 'PRJ-2026-0001');
    const bytes = Buffer.from(pdfBase64, 'base64');

    expect(bytes.subarray(0, 5).toString('ascii')).toBe('%PDF-');
    expect(pdf.getNumberOfPages()).toBe(1);
    const pdfLatin1 = bytes.toString('latin1');
    expect(pdfLatin1).toContain('DejaVuSans');
    expect(pdfLatin1).not.toContain('/Subtype /Image');
  });

  it('generates a selectable vector Dispatch Note PDF', async () => {
    const dispatch: DispatchNote = {
      id: 'disp-1',
      dispatchNumber: 'ISP-2026-0001',
      status: 'ISSUED',
      customerId: 'cust-1',
      customer: sampleOffer.customer,
      issueDate: '2026-11-21',
      deliveryAddress: 'Бул. Партизански Одреди 50, Скопје',
      issuedBy: 'Магацин ИМФЕКС',
      receivedBy: 'Марко Петровски',
      stockDeducted: true,
      items: [
        {
          id: 'di-1',
          productCode: 'SEC-DOOR-40',
          title: 'Секциона Гаражна Врата 3000x2500',
          serialNumber: 'SN-2026-8812',
          quantity: 1,
        },
      ],
      createdAt: '2026-11-21T10:00:00.000Z',
    };

    const { pdf, pdfBase64 } = await generateDispatchNoteVectorPdf(dispatch, sampleCompany);
    const bytes = Buffer.from(pdfBase64, 'base64');

    expect(bytes.subarray(0, 5).toString('ascii')).toBe('%PDF-');
    expect(pdf.getNumberOfPages()).toBe(1);
    const pdfLatin1 = bytes.toString('latin1');
    expect(pdfLatin1).toContain('DejaVuSans');
    expect(pdfLatin1).not.toContain('/Subtype /Image');
  });
});
