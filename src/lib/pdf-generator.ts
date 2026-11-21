import jsPDF from 'jspdf';
import type { CompanySettings, DispatchNote, Offer, Product, SalesInvoice } from '@/types';
import { formatDate } from '@/lib/date-format';
import { formatCurrency, formatMkd } from '@/lib/formatters';
import { getServiceTypeLabel } from '@/lib/enum-labels';

export interface VectorPdfResult {
  pdf: jsPDF;
  pdfBase64: string;
}

const FONT_FAMILY = 'DejaVuSans';
const FONT_REGULAR_VFS = 'DejaVuSans.ttf';
const FONT_BOLD_VFS = 'DejaVuSans-Bold.ttf';

export interface FontBundle {
  regular: string;
  bold: string;
}

// Cached base64 font payloads across calls
let cachedFontsPromise: Promise<FontBundle | null> | null = null;
let customFontLoader: (() => Promise<FontBundle | null>) | null = null;

/** Allows non-browser environments (e.g. Vitest tests) to supply font buffers without Node imports in client bundles. */
export function registerPdfFontLoader(loader: (() => Promise<FontBundle | null>) | null): void {
  customFontLoader = loader;
  cachedFontsPromise = null;
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  const chunkSize = 0x8000;
  let binary = '';
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode(...chunk);
  }
  if (typeof btoa === 'function') {
    return btoa(binary);
  }
  return Buffer.from(bytes).toString('base64');
}

async function loadCyrillicFonts(): Promise<FontBundle | null> {
  if (cachedFontsPromise) return cachedFontsPromise;

  cachedFontsPromise = (async () => {
    try {
      if (customFontLoader) {
        return await customFontLoader();
      }
      if (typeof window !== 'undefined' && typeof fetch === 'function') {
        const [regRes, boldRes] = await Promise.all([
          fetch('/fonts/DejaVuSans.ttf'),
          fetch('/fonts/DejaVuSans-Bold.ttf'),
        ]);
        if (!regRes.ok || !boldRes.ok) return null;
        const [regBuf, boldBuf] = await Promise.all([
          regRes.arrayBuffer(),
          boldRes.arrayBuffer(),
        ]);
        return {
          regular: arrayBufferToBase64(regBuf),
          bold: arrayBufferToBase64(boldBuf),
        };
      }
      return null;
    } catch {
      return null;
    }
  })();

  return cachedFontsPromise;
}

async function createVectorPdfDoc(): Promise<{ pdf: jsPDF; fontName: string }> {
  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
    compress: true,
  });

  const fonts = await loadCyrillicFonts();
  if (fonts) {
    pdf.addFileToVFS(FONT_REGULAR_VFS, fonts.regular);
    pdf.addFont(FONT_REGULAR_VFS, FONT_FAMILY, 'normal');
    pdf.addFileToVFS(FONT_BOLD_VFS, fonts.bold);
    pdf.addFont(FONT_BOLD_VFS, FONT_FAMILY, 'bold');
    pdf.setFont(FONT_FAMILY, 'normal');
    return { pdf, fontName: FONT_FAMILY };
  }

  pdf.setFont('helvetica', 'normal');
  return { pdf, fontName: 'helvetica' };
}

function finalizePdf(pdf: jsPDF, filename?: string): VectorPdfResult {
  const dataUri = pdf.output('datauristring');
  const pdfBase64 = dataUri.includes(',') ? dataUri.split(',')[1] : dataUri;

  if (filename && typeof window !== 'undefined') {
    pdf.save(filename);
  }
  return { pdf, pdfBase64 };
}

const COLORS = {
  navy: [11, 19, 41] as [number, number, number],
  slate900: [15, 23, 42] as [number, number, number],
  slate700: [51, 65, 85] as [number, number, number],
  slate500: [100, 116, 139] as [number, number, number],
  slate300: [203, 213, 225] as [number, number, number],
  slate200: [226, 232, 240] as [number, number, number],
  slate100: [241, 245, 249] as [number, number, number],
  slate50: [248, 250, 252] as [number, number, number],
  blue600: [37, 99, 235] as [number, number, number],
  blue300: [147, 197, 253] as [number, number, number],
  emerald700: [4, 120, 87] as [number, number, number],
  emerald50: [236, 253, 245] as [number, number, number],
  amber700: [180, 83, 9] as [number, number, number],
  rose600: [225, 29, 72] as [number, number, number],
  white: [255, 255, 255] as [number, number, number],
};

function drawRunningHeader(
  pdf: jsPDF,
  fontName: string,
  companyName: string,
  rightLabel: string,
  margin: number,
  pageWidth: number
): number {
  pdf.setFillColor(...COLORS.navy);
  pdf.roundedRect(margin, 12, 8, 8, 1.5, 1.5, 'F');
  pdf.setFont(fontName, 'bold');
  pdf.setFontSize(8);
  pdf.setTextColor(...COLORS.white);
  pdf.text('iF', margin + 4, 17.2, { align: 'center' });

  pdf.setFont(fontName, 'bold');
  pdf.setFontSize(9.5);
  pdf.setTextColor(...COLORS.slate900);
  pdf.text(companyName.toUpperCase(), margin + 10.5, 17.2);

  pdf.setFont(fontName, 'bold');
  pdf.setFontSize(8.5);
  pdf.setTextColor(...COLORS.slate500);
  pdf.text(rightLabel, pageWidth - margin, 17.2, { align: 'right' });

  pdf.setDrawColor(...COLORS.slate900);
  pdf.setLineWidth(0.5);
  pdf.line(margin, 23, pageWidth - margin, 23);

  return 30;
}

function addPageFooters(
  pdf: jsPDF,
  fontName: string,
  leftText: string,
  skipFirstPage: boolean,
  margin: number
): void {
  const totalPages = pdf.getNumberOfPages();
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();

  for (let p = 1; p <= totalPages; p++) {
    if (skipFirstPage && p === 1) continue;
    pdf.setPage(p);
    pdf.setDrawColor(...COLORS.slate200);
    pdf.setLineWidth(0.3);
    pdf.line(margin, pageHeight - 15, pageWidth - margin, pageHeight - 15);
    pdf.setFont(fontName, 'normal');
    pdf.setFontSize(7.5);
    pdf.setTextColor(...COLORS.slate500);
    pdf.text(leftText, margin, pageHeight - 10);
    pdf.text(`Страна ${p} од ${totalPages}`, pageWidth - margin, pageHeight - 10, { align: 'right' });
  }
}

/**
 * Generates a true vector, selectable-text multi-page Offer PDF with full Cyrillic support.
 */
export async function generateOfferVectorPdf(
  offer: Offer,
  products: Product[],
  company: CompanySettings,
  filename?: string
): Promise<VectorPdfResult> {
  const { pdf, fontName } = await createVectorPdfDoc();
  const pageWidth = pdf.internal.pageSize.getWidth(); // 210
  const pageHeight = pdf.internal.pageSize.getHeight(); // 297
  const margin = 14;
  const contentWidth = pageWidth - margin * 2;
  const maxBodyY = pageHeight - 22;

  const advancePercent = Math.min(100, Math.max(0, Number(company.defaultAdvancePercent ?? 50)));
  const balancePercent = Math.max(0, 100 - advancePercent);
  const currentYear = new Date().getFullYear();

  const customerName = offer.customer?.companyName || offer.customer?.name || 'Почитуван Клиент';
  const customerContactLine = [
    offer.customer?.city || '',
    offer.customer?.phone ? `Тел: ${offer.customer.phone}` : '',
    offer.customer?.email || '',
  ]
    .filter(Boolean)
    .join('  |  ');

  const dateCreated = formatDate(offer.createdAt, formatDate(new Date()));
  const validUntil = formatDate(
    offer.validUntil,
    formatDate(new Date((offer.createdAt ? new Date(offer.createdAt).getTime() : Date.now()) + 14 * 24 * 60 * 60 * 1000))
  );

  const firstItem = offer.items?.[0];
  const firstProduct = products.find((p) => p.id === firstItem?.productId);
  const firstModel = firstProduct?.models.find((m) => m.id === firstItem?.productModelId);

  // =========================================================================
  // PAGE 1: EXECUTIVE COVER PAGE
  // =========================================================================
  pdf.setFillColor(...COLORS.navy);
  pdf.rect(0, 0, pageWidth, pageHeight, 'F');

  // Subtle decorative accent band
  pdf.setFillColor(20, 34, 70);
  pdf.roundedRect(margin, 24, contentWidth, 42, 4, 4, 'F');

  // Brand emblem
  pdf.setFillColor(37, 99, 235);
  pdf.roundedRect(pageWidth / 2 - 8, 30, 16, 12, 2.5, 2.5, 'F');
  pdf.setFont(fontName, 'bold');
  pdf.setFontSize(12);
  pdf.setTextColor(...COLORS.white);
  pdf.text('iF', pageWidth / 2, 38, { align: 'center' });

  pdf.setFont(fontName, 'bold');
  pdf.setFontSize(20);
  pdf.setTextColor(...COLORS.white);
  pdf.text('IMFEX GROUP', pageWidth / 2, 52, { align: 'center' });

  pdf.setFont(fontName, 'normal');
  pdf.setFontSize(8.5);
  pdf.setTextColor(...COLORS.blue300);
  pdf.text('SOLUTIONS BUILT TO LAST.', pageWidth / 2, 59, { align: 'center' });

  // Main Cover Title
  pdf.setFont(fontName, 'bold');
  pdf.setFontSize(22);
  pdf.setTextColor(...COLORS.white);
  pdf.text('ТЕХНИЧКА И КОМЕРЦИЈАЛНА', pageWidth / 2, 102, { align: 'center' });
  pdf.text('ПОНУДА', pageWidth / 2, 113, { align: 'center' });

  pdf.setFont(fontName, 'normal');
  pdf.setFontSize(11);
  pdf.setTextColor(...COLORS.slate300);
  pdf.text('Професионално решение за вашиот објект', pageWidth / 2, 123, { align: 'center' });

  // 3 Metadata Cards
  const cardGap = 4;
  const cardW = (contentWidth - cardGap * 2) / 3;
  const metaCards = [
    { label: 'БРОЈ НА ПОНУДА', value: offer.offerNumber },
    { label: 'ДАТУМ', value: dateCreated },
    { label: 'ВАЖИ ДО', value: validUntil },
  ];
  metaCards.forEach((card, idx) => {
    const x = margin + idx * (cardW + cardGap);
    pdf.setFillColor(24, 38, 72);
    pdf.setDrawColor(56, 78, 128);
    pdf.setLineWidth(0.3);
    pdf.roundedRect(x, 138, cardW, 22, 3, 3, 'FD');

    pdf.setFont(fontName, 'bold');
    pdf.setFontSize(7.5);
    pdf.setTextColor(...COLORS.slate300);
    pdf.text(card.label, x + cardW / 2, 145.5, { align: 'center' });

    pdf.setFont(fontName, 'bold');
    pdf.setFontSize(10.5);
    pdf.setTextColor(...COLORS.white);
    pdf.text(card.value, x + cardW / 2, 154, { align: 'center' });
  });

  // Highlight Product Card
  pdf.setFillColor(18, 30, 58);
  pdf.setDrawColor(45, 65, 110);
  pdf.roundedRect(margin, 174, contentWidth, 38, 4, 4, 'FD');

  pdf.setFillColor(...COLORS.blue600);
  const badgeText = (firstProduct?.name || 'ПРЕМИУМ СИСТЕМИ').toUpperCase().slice(0, 42);
  const badgeWidth = Math.min(contentWidth - 16, Math.max(44, badgeText.length * 2.2 + 10));
  pdf.roundedRect(margin + 8, 182, badgeWidth, 7, 1.5, 1.5, 'F');
  pdf.setFont(fontName, 'bold');
  pdf.setFontSize(8);
  pdf.setTextColor(...COLORS.white);
  pdf.text(badgeText, margin + 12, 186.8);

  pdf.setFont(fontName, 'normal');
  pdf.setFontSize(9.5);
  pdf.setTextColor(...COLORS.slate300);
  pdf.text(
    'Алуминиумски и челични сегментни врати, прозорци, индустриски системи и автоматика.',
    margin + 8,
    198,
    { maxWidth: contentWidth - 16 }
  );
  pdf.setFont(fontName, 'bold');
  pdf.setFontSize(9.5);
  pdf.setTextColor(...COLORS.white);
  pdf.text(
    `Вкупно конфигурирани ставки: ${offer.items?.length || 0}   •   Вкупен износ: ${formatCurrency(offer.totalAmount)}`,
    margin + 8,
    206
  );

  // Customer & Issuer White Card
  pdf.setFillColor(...COLORS.white);
  pdf.roundedRect(margin, 236, contentWidth, 40, 4, 4, 'F');

  pdf.setFont(fontName, 'bold');
  pdf.setFontSize(7.5);
  pdf.setTextColor(...COLORS.blue600);
  pdf.text('ПОДГОТВЕНО ЗА', margin + 8, 245);

  pdf.setFont(fontName, 'bold');
  pdf.setFontSize(12);
  pdf.setTextColor(...COLORS.slate900);
  pdf.text(customerName, margin + 8, 253, { maxWidth: contentWidth * 0.56 });

  if (customerContactLine) {
    pdf.setFont(fontName, 'normal');
    pdf.setFontSize(8);
    pdf.setTextColor(...COLORS.slate500);
    pdf.text(customerContactLine, margin + 8, 261, { maxWidth: contentWidth * 0.56 });
  }

  // Divider
  pdf.setDrawColor(...COLORS.slate200);
  pdf.setLineWidth(0.3);
  pdf.line(margin + contentWidth * 0.62, 242, margin + contentWidth * 0.62, 270);

  const rightColX = pageWidth - margin - 8;
  pdf.setFont(fontName, 'bold');
  pdf.setFontSize(7.5);
  pdf.setTextColor(...COLORS.slate500);
  pdf.text('ПОДГОТВЕНО ОД', rightColX, 245, { align: 'right' });

  pdf.setFont(fontName, 'bold');
  pdf.setFontSize(9);
  pdf.setTextColor(...COLORS.slate900);
  pdf.text(company.companyName, rightColX, 253, { align: 'right', maxWidth: contentWidth * 0.34 });

  pdf.setFont(fontName, 'normal');
  pdf.setFontSize(8);
  pdf.setTextColor(...COLORS.slate500);
  pdf.text(company.phone || '', rightColX, 262, { align: 'right' });
  pdf.text(company.email || '', rightColX, 267, { align: 'right' });

  // =========================================================================
  // PAGE 2+: TECHNICAL SPECIFICATIONS
  // =========================================================================
  pdf.addPage();
  let y = drawRunningHeader(pdf, fontName, company.companyName, `ПОНУДА ${offer.offerNumber}`, margin, pageWidth);

  const ensureSpace = (neededMm: number) => {
    if (y + neededMm > maxBodyY) {
      pdf.addPage();
      y = drawRunningHeader(pdf, fontName, company.companyName, `ПОНУДА ${offer.offerNumber}`, margin, pageWidth);
    }
  };

  pdf.setFont(fontName, 'bold');
  pdf.setFontSize(15);
  pdf.setTextColor(...COLORS.slate900);
  pdf.text('ТЕХНИЧКА СПЕЦИФИКАЦИЈА', margin, y);
  y += 5;
  pdf.setFont(fontName, 'normal');
  pdf.setFontSize(8.5);
  pdf.setTextColor(...COLORS.slate500);
  pdf.text('Конфигурација и параметри на понуденото решение', margin, y);
  y += 8;

  // 2x2 Summary Grid
  const halfW = (contentWidth - 4) / 2;
  const summaryBoxes = [
    { label: 'ВКУПНО СТАВКИ', value: `${offer.items?.length || 0} Конфигурирани ставки` },
    { label: 'ГЛАВЕН ПРОИЗВОД', value: firstProduct?.name || 'IMFEX Системи' },
    { label: 'МОДЕЛ', value: firstModel?.name || 'Премиум Конфигурација' },
    {
      label: 'ДИМЕНЗИИ НА ГЛАВНА СТАВКА',
      value: firstItem?.widthMm && firstItem?.heightMm ? `${firstItem.widthMm} x ${firstItem.heightMm} mm` : 'По барање',
    },
  ];

  for (let i = 0; i < summaryBoxes.length; i++) {
    const col = i % 2;
    const row = Math.floor(i / 2);
    const bx = margin + col * (halfW + 4);
    const by = y + row * 18;
    pdf.setFillColor(...COLORS.slate50);
    pdf.setDrawColor(...COLORS.slate200);
    pdf.setLineWidth(0.3);
    pdf.roundedRect(bx, by, halfW, 15, 2, 2, 'FD');

    pdf.setFont(fontName, 'bold');
    pdf.setFontSize(7);
    pdf.setTextColor(...COLORS.slate500);
    pdf.text(summaryBoxes[i].label, bx + 4, by + 5.5);

    pdf.setFont(fontName, 'bold');
    pdf.setFontSize(9);
    pdf.setTextColor(...COLORS.slate900);
    pdf.text(summaryBoxes[i].value, bx + 4, by + 11.5, { maxWidth: halfW - 8 });
  }
  y += 42;

  // Detailed Specs Per Item
  pdf.setFont(fontName, 'bold');
  pdf.setFontSize(9);
  pdf.setTextColor(...COLORS.slate900);
  pdf.text('ДЕТАЛНА ТЕХНИЧКА СПЕЦИФИКАЦИЈА ПО СТАВКИ', margin, y);
  y += 5;

  for (let idx = 0; idx < (offer.items || []).length; idx++) {
    const item = offer.items[idx];
    const product = products.find((p) => p.id === item.productId);
    const model = product?.models.find((m) => m.id === item.productModelId);
    const specs =
      item.specifications && item.specifications.length > 0
        ? item.specifications
        : ((item as any).offerItemSpecifications || []);
    const activeSpecs = specs.filter((s: any) => s.specificationOptionId || s.customValue);

    const itemTitle =
      item.customTitle || (product ? `${product.name}${model ? ` - ${model.name}` : ''}` : 'Понудена ставка');

    ensureSpace(24);

    // Item Header Bar
    pdf.setFillColor(...COLORS.slate100);
    pdf.setDrawColor(...COLORS.slate200);
    pdf.setLineWidth(0.3);
    pdf.roundedRect(margin, y, contentWidth, 13, 2, 2, 'FD');

    pdf.setFont(fontName, 'bold');
    pdf.setFontSize(7);
    pdf.setTextColor(...COLORS.blue600);
    pdf.text(`СТАВКА #${idx + 1}`, margin + 4, y + 4.8);

    pdf.setFont(fontName, 'bold');
    pdf.setFontSize(9.5);
    pdf.setTextColor(...COLORS.slate900);
    pdf.text(itemTitle, margin + 4, y + 10.2, { maxWidth: contentWidth - 46 });

    if (item.widthMm && item.heightMm) {
      const dimLabel = `${item.widthMm} x ${item.heightMm} mm`;
      pdf.setFillColor(...COLORS.navy);
      pdf.roundedRect(pageWidth - margin - 38, y + 3, 34, 7, 1.5, 1.5, 'F');
      pdf.setFont(fontName, 'bold');
      pdf.setFontSize(7.5);
      pdf.setTextColor(...COLORS.white);
      pdf.text(dimLabel, pageWidth - margin - 21, y + 7.6, { align: 'center' });
    }
    y += 15;

    if (item.serviceTypes && item.serviceTypes.length > 0) {
      const servicesLine = item.serviceTypes.map((st) => getServiceTypeLabel(st, 'mk')).join('  •  ');
      pdf.setFont(fontName, 'normal');
      pdf.setFontSize(7.5);
      pdf.setTextColor(...COLORS.blue600);
      pdf.text(`Услуги: ${servicesLine}`, margin + 2, y + 2);
      y += 5;
    }

    if (activeSpecs.length > 0) {
      for (let sIdx = 0; sIdx < activeSpecs.length; sIdx++) {
        const s: any = activeSpecs[sIdx];
        const keyObj = product?.specificationKeys.find((k) => k.id === s.specificationKeyId);
        const optObj = keyObj?.options.find((o) => o.id === s.specificationOptionId);
        const keyLabel = keyObj?.name || s.customKeyName || 'Спецификација';
        const valLabel =
          optObj?.label && s.customValue && s.customValue !== optObj.label
            ? `${optObj.label} (${s.customValue})`
            : optObj?.label || s.customValue || 'Избрано';

        const valLines = pdf.splitTextToSize(String(valLabel), contentWidth * 0.5 - 6);
        const rowH = Math.max(7, valLines.length * 4 + 3);
        ensureSpace(rowH + 2);

        if (sIdx % 2 === 0) {
          pdf.setFillColor(...COLORS.slate50);
          pdf.rect(margin, y, contentWidth, rowH, 'F');
        }
        pdf.setDrawColor(...COLORS.slate200);
        pdf.setLineWidth(0.2);
        pdf.rect(margin, y, contentWidth, rowH, 'S');

        pdf.setFont(fontName, 'bold');
        pdf.setFontSize(8);
        pdf.setTextColor(...COLORS.slate700);
        pdf.text(keyLabel, margin + 3, y + 4.8, { maxWidth: contentWidth * 0.46 });

        pdf.setFont(fontName, 'normal');
        pdf.setFontSize(8);
        pdf.setTextColor(...COLORS.slate900);
        pdf.text(valLines, margin + contentWidth * 0.5, y + 4.8);

        y += rowH;
      }
    } else {
      pdf.setFont(fontName, 'normal');
      pdf.setFontSize(8);
      pdf.setTextColor(...COLORS.slate500);
      pdf.text('Стандардна спецификација согласно спецификациите на производителот.', margin + 2, y + 3);
      y += 6;
    }

    y += 5;
  }

  // =========================================================================
  // COMMERCIAL OVERVIEW & FINANCIALS
  // =========================================================================
  pdf.addPage();
  y = drawRunningHeader(pdf, fontName, company.companyName, `ПОНУДА ${offer.offerNumber}`, margin, pageWidth);

  pdf.setFont(fontName, 'bold');
  pdf.setFontSize(15);
  pdf.setTextColor(...COLORS.slate900);
  pdf.text('КОМЕРЦИЈАЛЕН ПРЕГЛЕД', margin, y);
  y += 5;
  pdf.setFont(fontName, 'normal');
  pdf.setFontSize(8.5);
  pdf.setTextColor(...COLORS.slate500);
  pdf.text('Финални ставки и финансиска пресметка на понудата', margin, y);
  y += 8;

  // Table Header
  const drawOfferTableHeader = () => {
    pdf.setFillColor(...COLORS.navy);
    pdf.rect(margin, y, contentWidth, 8.5, 'F');
    pdf.setFont(fontName, 'bold');
    pdf.setFontSize(7.5);
    pdf.setTextColor(...COLORS.white);
    pdf.text('#', margin + 4, y + 5.6, { align: 'center' });
    pdf.text('ОПИС И СПЕЦИФИКАЦИЈА', margin + 10, y + 5.6);
    pdf.text('КОЛ.', margin + contentWidth - 54, y + 5.6, { align: 'center' });
    pdf.text('ЕД. ЦЕНА', margin + contentWidth - 28, y + 5.6, { align: 'right' });
    pdf.text('ВКУПНО', margin + contentWidth - 3, y + 5.6, { align: 'right' });
    y += 8.5;
  };

  drawOfferTableHeader();

  for (let idx = 0; idx < (offer.items || []).length; idx++) {
    const item = offer.items[idx];
    const product = products.find((p) => p.id === item.productId);
    const model = product?.models.find((m) => m.id === item.productModelId);
    const specs =
      item.specifications && item.specifications.length > 0
        ? item.specifications
        : ((item as any).offerItemSpecifications || []);

    const title = item.customTitle || (product ? `${product.name}${model ? ` - ${model.name}` : ''}` : 'Ставка');
    const detailParts: string[] = [];
    if (item.widthMm && item.heightMm) detailParts.push(`Димензии: ${item.widthMm} x ${item.heightMm} mm`);
    const specSummary = specs
      .map((s: any) => {
        const keyObj = product?.specificationKeys.find((k) => k.id === s.specificationKeyId);
        const optObj = keyObj?.options.find((o) => o.id === s.specificationOptionId);
        return `${keyObj?.name || s.customKeyName || 'Спец.'}: ${optObj?.label || s.customValue || 'Избрано'}`;
      })
      .join(' | ');
    if (specSummary) detailParts.push(specSummary);
    if (item.serviceTypes?.length) {
      detailParts.push(item.serviceTypes.map((st) => getServiceTypeLabel(st, 'mk')).join(', '));
    }

    const descColW = contentWidth - 76;
    const titleLines = pdf.splitTextToSize(title, descColW);
    const detailLines = detailParts.length ? pdf.splitTextToSize(detailParts.join(' • '), descColW) : [];
    const rowH = Math.max(10, titleLines.length * 4 + detailLines.length * 3.4 + 4.5);

    if (y + rowH > maxBodyY) {
      pdf.addPage();
      y = drawRunningHeader(pdf, fontName, company.companyName, `ПОНУДА ${offer.offerNumber}`, margin, pageWidth);
      drawOfferTableHeader();
    }

    if (idx % 2 === 1) {
      pdf.setFillColor(...COLORS.slate50);
      pdf.rect(margin, y, contentWidth, rowH, 'F');
    }
    pdf.setDrawColor(...COLORS.slate200);
    pdf.setLineWidth(0.2);
    pdf.rect(margin, y, contentWidth, rowH, 'S');

    pdf.setFont(fontName, 'bold');
    pdf.setFontSize(8);
    pdf.setTextColor(...COLORS.slate500);
    pdf.text(String(idx + 1), margin + 4, y + 5.2, { align: 'center' });

    pdf.setFont(fontName, 'bold');
    pdf.setFontSize(8.5);
    pdf.setTextColor(...COLORS.slate900);
    pdf.text(titleLines, margin + 10, y + 5.2);

    if (detailLines.length > 0) {
      pdf.setFont(fontName, 'normal');
      pdf.setFontSize(7);
      pdf.setTextColor(...COLORS.slate500);
      pdf.text(detailLines, margin + 10, y + 5.2 + titleLines.length * 4);
    }

    pdf.setFont(fontName, 'bold');
    pdf.setFontSize(8.5);
    pdf.setTextColor(...COLORS.slate900);
    pdf.text(String(item.quantity), margin + contentWidth - 54, y + 5.2, { align: 'center' });

    pdf.setFont(fontName, 'normal');
    pdf.setFontSize(8.5);
    pdf.setTextColor(...COLORS.slate700);
    pdf.text(formatCurrency(item.unitPrice), margin + contentWidth - 28, y + 5.2, { align: 'right' });

    pdf.setFont(fontName, 'bold');
    pdf.setFontSize(8.5);
    pdf.setTextColor(...COLORS.slate900);
    pdf.text(formatCurrency(item.totalPrice), margin + contentWidth - 3, y + 5.2, { align: 'right' });

    y += rowH;
  }

  y += 6;
  ensureSpace(48);

  // Totals Breakdown (right-aligned)
  const totalsW = 78;
  const totalsX = pageWidth - margin - totalsW;
  const totalRows: { label: string; value: string; color?: [number, number, number] }[] = [
    { label: 'Меѓузбир:', value: formatCurrency(offer.subtotal) },
  ];
  if (Number(offer.discountAmount || 0) > 0) {
    totalRows.push({
      label: `Попуст (${Number(offer.discountRate || 0)}%):`,
      value: `-${formatCurrency(offer.discountAmount)}`,
      color: COLORS.rose600,
    });
  }
  totalRows.push({ label: `ДДВ (${offer.taxRate ?? 18}%):`, value: formatCurrency(offer.taxAmount) });

  totalRows.forEach((tr) => {
    pdf.setFont(fontName, 'bold');
    pdf.setFontSize(8.5);
    pdf.setTextColor(...(tr.color || COLORS.slate700));
    pdf.text(tr.label, totalsX, y);
    pdf.text(tr.value, pageWidth - margin, y, { align: 'right' });
    y += 5.5;
  });

  y += 2;
  // Grand Total Navy Banner
  pdf.setFillColor(...COLORS.navy);
  pdf.roundedRect(margin, y, contentWidth, 16, 3, 3, 'F');
  pdf.setFont(fontName, 'bold');
  pdf.setFontSize(12);
  pdf.setTextColor(...COLORS.white);
  pdf.text('ВКУПНО:', margin + 7, y + 10.2);
  pdf.setFontSize(16);
  pdf.text(formatCurrency(offer.totalAmount), pageWidth - margin - 7, y + 10.6, { align: 'right' });
  y += 24;

  // Payment & Delivery Terms (3 Cards)
  ensureSpace(34);
  pdf.setFont(fontName, 'bold');
  pdf.setFontSize(8.5);
  pdf.setTextColor(...COLORS.slate900);
  pdf.text('ПЛАЌАЊЕ И РОКОВИ', margin, y);
  y += 4;

  const termCards = [
    { label: 'НАЧИН НА ПЛАЌАЊЕ', title: `${advancePercent}% аванс`, sub: `${balancePercent}% пред испорака` },
    { label: 'РОК НА ИСПОРАКА', title: '4-6 недели', sub: 'по прием на аванс' },
    { label: 'ГАРАНЦИЈА', title: '24 месеци', sub: 'според условите' },
  ];
  termCards.forEach((tc, idx) => {
    const x = margin + idx * (cardW + cardGap);
    pdf.setFillColor(...COLORS.slate50);
    pdf.setDrawColor(...COLORS.slate200);
    pdf.setLineWidth(0.3);
    pdf.roundedRect(x, y, cardW, 20, 2, 2, 'FD');

    pdf.setFont(fontName, 'bold');
    pdf.setFontSize(6.8);
    pdf.setTextColor(...COLORS.slate500);
    pdf.text(tc.label, x + 4, y + 5.5);

    pdf.setFont(fontName, 'bold');
    pdf.setFontSize(9.5);
    pdf.setTextColor(...COLORS.slate900);
    pdf.text(tc.title, x + 4, y + 12);

    pdf.setFont(fontName, 'normal');
    pdf.setFontSize(7.5);
    pdf.setTextColor(...COLORS.slate500);
    pdf.text(tc.sub, x + 4, y + 16.8);
  });
  y += 28;

  // =========================================================================
  // TERMS, NEXT STEPS, SIGN-OFF & COMPANY FOOTER
  // =========================================================================
  ensureSpace(95);
  pdf.setFont(fontName, 'bold');
  pdf.setFontSize(10);
  pdf.setTextColor(...COLORS.slate900);
  pdf.text('УСЛОВИ И СЛЕДНИ ЧЕКОРИ', margin, y);
  y += 5;

  const steps = [
    ['1', 'Прифаќање на понуда', 'Понудата се смета за прифатена по писмена потврда и уплата на договорениот аванс.'],
    ['2', 'Техничка проверка', 'Пред производство се потврдуваат мерките, условите за монтажа и финалната конфигурација.'],
    ['3', 'Испорака и монтажа', 'Терминот се координира со клиентот по пристигнување на опремата и контрола на квалитетот.'],
    ['4', 'Гаранција и сервис', 'Гаранцијата важи согласно гарантните услови и правилното користење на производот.'],
  ];

  steps.forEach(([num, title, desc], sIdx) => {
    ensureSpace(14);
    if (sIdx % 2 === 0) {
      pdf.setFillColor(...COLORS.slate50);
      pdf.rect(margin, y, contentWidth, 12, 'F');
    }
    pdf.setDrawColor(...COLORS.slate200);
    pdf.setLineWidth(0.2);
    pdf.rect(margin, y, contentWidth, 12, 'S');

    pdf.setFillColor(...COLORS.navy);
    pdf.roundedRect(margin + 3, y + 2.5, 7, 7, 1.5, 1.5, 'F');
    pdf.setFont(fontName, 'bold');
    pdf.setFontSize(8);
    pdf.setTextColor(...COLORS.white);
    pdf.text(num, margin + 6.5, y + 7.2, { align: 'center' });

    pdf.setFont(fontName, 'bold');
    pdf.setFontSize(8.5);
    pdf.setTextColor(...COLORS.slate900);
    pdf.text(title, margin + 13, y + 5.2);

    pdf.setFont(fontName, 'normal');
    pdf.setFontSize(7.5);
    pdf.setTextColor(...COLORS.slate700);
    pdf.text(desc, margin + 13, y + 9.8, { maxWidth: contentWidth - 16 });
    y += 12;
  });

  y += 8;
  ensureSpace(54);

  // Customer Sign-off Box
  pdf.setFillColor(...COLORS.slate50);
  pdf.setDrawColor(...COLORS.slate200);
  pdf.setLineWidth(0.3);
  pdf.roundedRect(margin, y, contentWidth, 24, 2.5, 2.5, 'FD');

  pdf.setFont(fontName, 'bold');
  pdf.setFontSize(8);
  pdf.setTextColor(...COLORS.slate900);
  pdf.text('ПОТВРДА ОД КЛИЕНТ', margin + 5, y + 6);

  const signColW = (contentWidth - 18) / 3;
  const signCols = [
    { label: 'ИМЕ И ПРЕЗИМЕ', value: customerName },
    { label: 'ДАТУМ', value: `__ . __ . ${currentYear}` },
    { label: 'ПОТПИС И ПЕЧАТ', value: '_____________________' },
  ];
  signCols.forEach((sc, idx) => {
    const sx = margin + 5 + idx * (signColW + 4);
    pdf.setFont(fontName, 'bold');
    pdf.setFontSize(6.5);
    pdf.setTextColor(...COLORS.slate500);
    pdf.text(sc.label, sx, y + 12.5);

    pdf.setFont(fontName, 'bold');
    pdf.setFontSize(8.5);
    pdf.setTextColor(...COLORS.slate900);
    pdf.text(sc.value, sx, y + 19, { maxWidth: signColW });
  });
  y += 30;

  // Company Contact Footer Banner (no fake QR code!)
  ensureSpace(26);
  pdf.setFillColor(...COLORS.navy);
  pdf.roundedRect(margin, y, contentWidth, 24, 3, 3, 'F');
  pdf.setFont(fontName, 'bold');
  pdf.setFontSize(10);
  pdf.setTextColor(...COLORS.white);
  pdf.text(company.companyName, margin + 6, y + 7.5);

  pdf.setFont(fontName, 'normal');
  pdf.setFontSize(8);
  pdf.setTextColor(...COLORS.slate300);
  pdf.text(company.address || '', margin + 6, y + 13.2);
  pdf.text(`Тел: ${company.phone || '—'}   |   Е-пошта: ${company.email || '—'}`, margin + 6, y + 18.5);

  if (company.taxId || company.bankAccount) {
    pdf.setFont(fontName, 'bold');
    pdf.setFontSize(7.5);
    pdf.setTextColor(...COLORS.blue300);
    if (company.taxId) {
      pdf.text(`ЕДБ: ${company.taxId}`, pageWidth - margin - 6, y + 10, { align: 'right' });
    }
    if (company.bankAccount) {
      pdf.text(`Жиро: ${company.bankAccount}`, pageWidth - margin - 6, y + 16, { align: 'right' });
    }
  }

  addPageFooters(pdf, fontName, `${company.companyName} — Официјална комерцијална понуда`, true, margin);
  return finalizePdf(pdf, filename);
}

/**
 * Generates a true vector, selectable-text Sales Invoice (Proforma / Advance / Final) PDF.
 */
export async function generateSalesInvoiceVectorPdf(
  invoice: SalesInvoice,
  company: CompanySettings,
  projectNumber?: string,
  filename?: string
): Promise<VectorPdfResult> {
  const { pdf, fontName } = await createVectorPdfDoc();
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 14;
  const contentWidth = pageWidth - margin * 2;
  const maxBodyY = pageHeight - 24;

  const typeTitle =
    invoice.invoiceType === 'PROFORMA'
      ? 'ПРО-ФАКТУРА'
      : invoice.invoiceType === 'ADVANCE'
      ? 'АВАНСНА ФАКТУРА'
      : 'ФАКТУРА';

  const typeSubtitle =
    invoice.invoiceType === 'PROFORMA'
      ? 'Документ за уплата по понуда (не претставува даночна фактура)'
      : invoice.invoiceType === 'ADVANCE'
      ? 'Даночен документ за примен аванс со пресметан ДДВ'
      : 'Конечна даночна фактура за испорачани добра и услуги';

  const customerName = invoice.customer?.companyName || invoice.customer?.name || 'Клиент';
  const customerTaxId = invoice.customer?.taxId || '—';
  const customerAddress = [invoice.customer?.address, invoice.customer?.city].filter(Boolean).join(', ') || 'Скопје';
  const customerPhone = invoice.customer?.phone || '—';

  const netPayable =
    invoice.advanceDeductedAmount > 0
      ? Math.round((invoice.totalAmount / (1 + (invoice.taxRate || 18) / 100)) * 100) / 100
      : invoice.subtotal - (invoice.discountAmount || 0);
  const vatPayable =
    invoice.advanceDeductedAmount > 0
      ? Math.round((invoice.totalAmount - netPayable) * 100) / 100
      : invoice.taxAmount;

  let y = 14;

  // Header
  pdf.setFillColor(...COLORS.navy);
  pdf.roundedRect(margin, y, 10, 10, 2, 2, 'F');
  pdf.setFont(fontName, 'bold');
  pdf.setFontSize(10);
  pdf.setTextColor(...COLORS.white);
  pdf.text('iF', margin + 5, y + 6.7, { align: 'center' });

  pdf.setFont(fontName, 'bold');
  pdf.setFontSize(11.5);
  pdf.setTextColor(...COLORS.slate900);
  pdf.text(company.companyName.toUpperCase(), margin + 13, y + 4.5, { maxWidth: 108 });

  pdf.setFont(fontName, 'normal');
  pdf.setFontSize(7.5);
  pdf.setTextColor(...COLORS.slate500);
  pdf.text(company.address || '', margin + 13, y + 9.5);
  pdf.text(
    `ЕДБ: ${company.taxId || '—'}${company.bankAccount ? `  |  Жиро: ${company.bankAccount}` : ''}`,
    margin + 13,
    y + 13.8
  );
  pdf.text(`Е-пошта: ${company.email || '—'}  |  Тел: ${company.phone || '—'}`, margin + 13, y + 18);

  // Right Document Badge & Meta
  pdf.setFillColor(...COLORS.navy);
  pdf.roundedRect(pageWidth - margin - 48, y, 48, 8, 2, 2, 'F');
  pdf.setFont(fontName, 'bold');
  pdf.setFontSize(8.5);
  pdf.setTextColor(...COLORS.white);
  pdf.text(typeTitle, pageWidth - margin - 24, y + 5.4, { align: 'center' });

  pdf.setFont(fontName, 'bold');
  pdf.setFontSize(12);
  pdf.setTextColor(...COLORS.slate900);
  pdf.text(invoice.invoiceNumber, pageWidth - margin, y + 13.5, { align: 'right' });

  pdf.setFont(fontName, 'normal');
  pdf.setFontSize(7.8);
  pdf.setTextColor(...COLORS.slate500);
  let metaY = y + 18;
  if (invoice.externalAccountingNumber) {
    pdf.text(`Сметководствен бр: ${invoice.externalAccountingNumber}`, pageWidth - margin, metaY, { align: 'right' });
    metaY += 4;
  }
  pdf.text(`Датум: ${formatDate(invoice.issueDate)}`, pageWidth - margin, metaY, { align: 'right' });
  if (invoice.dueDate) {
    metaY += 4;
    pdf.text(`Рок на плаќање: ${formatDate(invoice.dueDate)}`, pageWidth - margin, metaY, { align: 'right' });
  }

  y = Math.max(y + 24, metaY + 5);
  pdf.setDrawColor(...COLORS.slate900);
  pdf.setLineWidth(0.5);
  pdf.line(margin, y, pageWidth - margin, y);
  y += 5;

  // Subtitle Banner
  pdf.setFillColor(...COLORS.slate100);
  pdf.setDrawColor(...COLORS.slate200);
  pdf.setLineWidth(0.2);
  pdf.roundedRect(margin, y, contentWidth, 8, 1.5, 1.5, 'FD');
  pdf.setFont(fontName, 'bold');
  pdf.setFontSize(7.8);
  pdf.setTextColor(...COLORS.slate700);
  pdf.text(typeSubtitle, margin + 3.5, y + 5.2);
  if (projectNumber) {
    pdf.text(`Проект: ${projectNumber}`, pageWidth - margin - 3.5, y + 5.2, { align: 'right' });
  }
  y += 12;

  // Recipient & Document Details Cards
  const colW = (contentWidth - 6) / 2;
  pdf.setFillColor(...COLORS.slate50);
  pdf.setDrawColor(...COLORS.slate200);
  pdf.roundedRect(margin, y, colW, 27, 2, 2, 'FD');
  pdf.roundedRect(margin + colW + 6, y, colW, 27, 2, 2, 'FD');

  pdf.setFont(fontName, 'bold');
  pdf.setFontSize(7);
  pdf.setTextColor(...COLORS.blue600);
  pdf.text('КУПУВАЧ / КЛИЕНТ', margin + 4, y + 5.5);

  pdf.setFont(fontName, 'bold');
  pdf.setFontSize(9.5);
  pdf.setTextColor(...COLORS.slate900);
  pdf.text(customerName, margin + 4, y + 11, { maxWidth: colW - 8 });

  pdf.setFont(fontName, 'normal');
  pdf.setFontSize(7.8);
  pdf.setTextColor(...COLORS.slate700);
  pdf.text(`Адреса: ${customerAddress}`, margin + 4, y + 16, { maxWidth: colW - 8 });
  pdf.text(`ЕДБ: ${customerTaxId}   |   Тел: ${customerPhone}`, margin + 4, y + 21, { maxWidth: colW - 8 });

  const rx = margin + colW + 10;
  const rEdge = pageWidth - margin - 4;
  pdf.setFont(fontName, 'bold');
  pdf.setFontSize(7);
  pdf.setTextColor(...COLORS.slate500);
  pdf.text('ДЕТАЛИ ЗА ДОКУМЕНТОТ', rx, y + 5.5);

  const statusText =
    invoice.status === 'PAID' ? 'ПЛАТЕНО' : invoice.status === 'PARTIAL_PAID' ? 'ДЕЛУМНО ПЛАТЕНО' : 'ЗА НАПЛАТА';
  const detailRows: [string, string][] = [
    ['Тип на документ:', typeTitle],
    ['Статус на наплата:', statusText],
    ['Даночна стапка (ДДВ):', `${invoice.taxRate}%`],
  ];
  if (invoice.linkedAdvanceInvoiceNumber) {
    detailRows.push(['Поврзана авансна:', invoice.linkedAdvanceInvoiceNumber]);
  }
  detailRows.forEach(([k, v], i) => {
    const ry = y + 11 + i * 4.5;
    pdf.setFont(fontName, 'normal');
    pdf.setFontSize(7.8);
    pdf.setTextColor(...COLORS.slate500);
    pdf.text(k, rx, ry);
    pdf.setFont(fontName, 'bold');
    pdf.setTextColor(...COLORS.slate900);
    pdf.text(v, rEdge, ry, { align: 'right' });
  });
  y += 33;

  // Items Table
  const drawInvTableHeader = () => {
    pdf.setFillColor(...COLORS.navy);
    pdf.rect(margin, y, contentWidth, 8.5, 'F');
    pdf.setFont(fontName, 'bold');
    pdf.setFontSize(7.5);
    pdf.setTextColor(...COLORS.white);
    pdf.text('#', margin + 4, y + 5.6, { align: 'center' });
    pdf.text('НАЗИВ НА ДОБРО / УСЛУГА', margin + 10, y + 5.6);
    pdf.text('КОЛ.', margin + contentWidth - 54, y + 5.6, { align: 'center' });
    pdf.text('ЕД. ЦЕНА', margin + contentWidth - 28, y + 5.6, { align: 'right' });
    pdf.text('ВКУПНО', margin + contentWidth - 3, y + 5.6, { align: 'right' });
    y += 8.5;
  };
  drawInvTableHeader();

  for (let idx = 0; idx < (invoice.items || []).length; idx++) {
    const item = invoice.items[idx];
    const titleLines = pdf.splitTextToSize(item.title || 'Ставка', contentWidth - 76);
    const descLines = item.description ? pdf.splitTextToSize(item.description, contentWidth - 76) : [];
    const rowH = Math.max(9, titleLines.length * 4 + descLines.length * 3.4 + 4);

    if (y + rowH > maxBodyY) {
      pdf.addPage();
      y = drawRunningHeader(pdf, fontName, company.companyName, `${typeTitle} ${invoice.invoiceNumber}`, margin, pageWidth);
      drawInvTableHeader();
    }

    if (idx % 2 === 1) {
      pdf.setFillColor(...COLORS.slate50);
      pdf.rect(margin, y, contentWidth, rowH, 'F');
    }
    pdf.setDrawColor(...COLORS.slate200);
    pdf.setLineWidth(0.2);
    pdf.rect(margin, y, contentWidth, rowH, 'S');

    pdf.setFont(fontName, 'bold');
    pdf.setFontSize(8);
    pdf.setTextColor(...COLORS.slate500);
    pdf.text(String(idx + 1), margin + 4, y + 5, { align: 'center' });

    pdf.setFont(fontName, 'bold');
    pdf.setFontSize(8.5);
    pdf.setTextColor(...COLORS.slate900);
    pdf.text(titleLines, margin + 10, y + 5);
    if (descLines.length > 0) {
      pdf.setFont(fontName, 'normal');
      pdf.setFontSize(7.2);
      pdf.setTextColor(...COLORS.slate500);
      pdf.text(descLines, margin + 10, y + 5 + titleLines.length * 4);
    }

    pdf.setFont(fontName, 'bold');
    pdf.setFontSize(8.5);
    pdf.setTextColor(...COLORS.slate900);
    pdf.text(String(item.quantity), margin + contentWidth - 54, y + 5, { align: 'center' });
    pdf.setFont(fontName, 'normal');
    pdf.setTextColor(...COLORS.slate700);
    pdf.text(formatCurrency(item.unitPrice), margin + contentWidth - 28, y + 5, { align: 'right' });
    pdf.setFont(fontName, 'bold');
    pdf.setTextColor(...COLORS.slate900);
    pdf.text(formatCurrency(item.totalPrice), margin + contentWidth - 3, y + 5, { align: 'right' });

    y += rowH;
  }

  y += 6;
  if (y + 72 > maxBodyY) {
    pdf.addPage();
    y = drawRunningHeader(pdf, fontName, company.companyName, `${typeTitle} ${invoice.invoiceNumber}`, margin, pageWidth);
  }

  // Totals Card
  const boxW = 92;
  const boxX = pageWidth - margin - boxW;
  const summaryRows: { label: string; value: string; bold?: boolean; color?: [number, number, number] }[] = [
    { label: 'Меѓузбир (Основица):', value: formatCurrency(invoice.subtotal) },
  ];
  if (Number(invoice.discountAmount || 0) > 0) {
    summaryRows.push({
      label: `Попуст (${invoice.discountRate}%):`,
      value: `-${formatCurrency(invoice.discountAmount)}`,
      color: COLORS.emerald700,
    });
  }
  summaryRows.push({ label: `Пресметан ДДВ (${invoice.taxRate}%):`, value: formatCurrency(invoice.taxAmount) });
  summaryRows.push({
    label: 'Вкупна вредност со ДДВ:',
    value: formatCurrency(invoice.grossTotalAmount || invoice.totalAmount),
    bold: true,
  });

  if (invoice.invoiceType === 'FINAL' && Number(invoice.advanceDeductedAmount || 0) > 0) {
    summaryRows.push({
      label: `Минус аванс (${invoice.linkedAdvanceInvoiceNumber || 'Аванс'}):`,
      value: `-${formatCurrency(invoice.advanceDeductedAmount)}`,
      bold: true,
      color: COLORS.amber700,
    });
    summaryRows.push({ label: 'Преостаната основица:', value: formatCurrency(netPayable) });
    summaryRows.push({ label: `Преостанат ДДВ (${invoice.taxRate}%):`, value: formatCurrency(vatPayable) });
  }

  const boxH = summaryRows.length * 5.6 + 6;
  pdf.setFillColor(...COLORS.slate50);
  pdf.setDrawColor(...COLORS.slate200);
  pdf.roundedRect(boxX, y, boxW, boxH, 2, 2, 'FD');

  summaryRows.forEach((sr, i) => {
    const sy = y + 5.5 + i * 5.6;
    pdf.setFont(fontName, sr.bold ? 'bold' : 'normal');
    pdf.setFontSize(8);
    pdf.setTextColor(...(sr.color || (sr.bold ? COLORS.slate900 : COLORS.slate700)));
    pdf.text(sr.label, boxX + 4, sy);
    pdf.text(sr.value, pageWidth - margin - 4, sy, { align: 'right' });
  });
  y += boxH + 6;

  // Grand Payable Banner
  pdf.setFillColor(...COLORS.navy);
  pdf.roundedRect(margin, y, contentWidth, 18, 3, 3, 'F');
  pdf.setFont(fontName, 'bold');
  pdf.setFontSize(10);
  pdf.setTextColor(...COLORS.white);
  pdf.text(
    invoice.invoiceType === 'FINAL' && invoice.advanceDeductedAmount > 0
      ? 'ОСТАТОК ЗА ДОПЛАТА ПО ФАКТУРА:'
      : 'ВКУПНО ЗА ПЛАЌАЊЕ:',
    margin + 6,
    y + 7.5
  );
  pdf.setFont(fontName, 'normal');
  pdf.setFontSize(7.5);
  pdf.setTextColor(...COLORS.slate300);
  pdf.text(
    `Денарска противвредност (1 € = 61.50 МКД): ${formatMkd(Number(invoice.totalAmount || 0) * 61.5)}`,
    margin + 6,
    y + 13.5
  );
  pdf.setFont(fontName, 'bold');
  pdf.setFontSize(15);
  pdf.setTextColor(...COLORS.white);
  pdf.text(formatCurrency(invoice.totalAmount), pageWidth - margin - 6, y + 11.5, { align: 'right' });
  y += 24;

  if (invoice.notes) {
    const noteLines = pdf.splitTextToSize(invoice.notes, contentWidth - 8);
    const noteH = noteLines.length * 4 + 8;
    pdf.setFillColor(...COLORS.slate50);
    pdf.setDrawColor(...COLORS.slate200);
    pdf.roundedRect(margin, y, contentWidth, noteH, 2, 2, 'FD');
    pdf.setFont(fontName, 'bold');
    pdf.setFontSize(7);
    pdf.setTextColor(...COLORS.slate700);
    pdf.text('ЗАБЕЛЕШКА:', margin + 4, y + 4.8);
    pdf.setFont(fontName, 'normal');
    pdf.setFontSize(8);
    pdf.text(noteLines, margin + 4, y + 9.2);
    y += noteH + 6;
  }

  // Dual Signatures near bottom
  const sigY = Math.max(y + 14, pageHeight - 38);
  if (sigY + 14 > pageHeight - 16) {
    pdf.addPage();
  }
  const finalSigY = sigY + 14 > pageHeight - 16 ? 45 : sigY;
  pdf.setDrawColor(...COLORS.slate500);
  pdf.setLineWidth(0.3);
  pdf.line(margin, finalSigY, margin + 74, finalSigY);
  pdf.line(pageWidth - margin - 74, finalSigY, pageWidth - margin, finalSigY);

  pdf.setFont(fontName, 'bold');
  pdf.setFontSize(8);
  pdf.setTextColor(...COLORS.slate700);
  pdf.text('Фактурирал / Овластено лице', margin + 37, finalSigY + 5, { align: 'center' });
  pdf.text('Примил за купувачот', pageWidth - margin - 37, finalSigY + 5, { align: 'center' });

  pdf.setFont(fontName, 'normal');
  pdf.setFontSize(7);
  pdf.setTextColor(...COLORS.slate500);
  pdf.text(`${company.companyName} (Печат и потпис)`, margin + 37, finalSigY + 9.5, { align: 'center' });
  pdf.text('Потпис на овластено лице', pageWidth - margin - 37, finalSigY + 9.5, { align: 'center' });

  addPageFooters(pdf, fontName, `${company.companyName} — Документ: ${invoice.invoiceNumber}`, false, margin);
  return finalizePdf(pdf, filename);
}

/**
 * Generates a true vector, selectable-text Dispatch Note (Испратница) PDF.
 */
export async function generateDispatchNoteVectorPdf(
  dispatch: DispatchNote,
  company: CompanySettings,
  filename?: string
): Promise<VectorPdfResult> {
  const { pdf, fontName } = await createVectorPdfDoc();
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 14;
  const contentWidth = pageWidth - margin * 2;
  const maxBodyY = pageHeight - 24;

  const customerName = dispatch.customer?.companyName || dispatch.customer?.name || 'Клиент';
  const deliveryAddr =
    dispatch.deliveryAddress ||
    [dispatch.customer?.address, dispatch.customer?.city].filter(Boolean).join(', ') ||
    'Скопје';

  let y = 14;

  // Header
  pdf.setFillColor(...COLORS.navy);
  pdf.roundedRect(margin, y, 10, 10, 2, 2, 'F');
  pdf.setFont(fontName, 'bold');
  pdf.setFontSize(10);
  pdf.setTextColor(...COLORS.white);
  pdf.text('iF', margin + 5, y + 6.7, { align: 'center' });

  pdf.setFont(fontName, 'bold');
  pdf.setFontSize(11);
  pdf.setTextColor(...COLORS.slate900);
  pdf.text(`${company.companyName.toUpperCase()} — МАГАЦИН`, margin + 13, y + 4.5, { maxWidth: 112 });

  pdf.setFont(fontName, 'normal');
  pdf.setFontSize(7.5);
  pdf.setTextColor(...COLORS.slate500);
  pdf.text('ДОКУМЕНТ ЗА ФИЗИЧКИ ИЗЛЕЗ И ИСПОРАКА НА СТОКА', margin + 13, y + 9.8);

  pdf.setFillColor(...COLORS.emerald700);
  pdf.roundedRect(pageWidth - margin - 42, y, 42, 8, 2, 2, 'F');
  pdf.setFont(fontName, 'bold');
  pdf.setFontSize(8.5);
  pdf.setTextColor(...COLORS.white);
  pdf.text('ИСПРАТНИЦА', pageWidth - margin - 21, y + 5.4, { align: 'center' });

  pdf.setFont(fontName, 'bold');
  pdf.setFontSize(11.5);
  pdf.setTextColor(...COLORS.slate900);
  pdf.text(dispatch.dispatchNumber, pageWidth - margin, y + 13.5, { align: 'right' });

  pdf.setFont(fontName, 'normal');
  pdf.setFontSize(7.8);
  pdf.setTextColor(...COLORS.slate500);
  pdf.text(`Датум на испорака: ${formatDate(dispatch.issueDate)}`, pageWidth - margin, y + 18, { align: 'right' });

  y += 23;
  pdf.setDrawColor(...COLORS.slate900);
  pdf.setLineWidth(0.5);
  pdf.line(margin, y, pageWidth - margin, y);
  y += 6;

  // Cards
  const colW = (contentWidth - 6) / 2;
  pdf.setFillColor(...COLORS.slate50);
  pdf.setDrawColor(...COLORS.slate200);
  pdf.roundedRect(margin, y, colW, 26, 2, 2, 'FD');
  pdf.roundedRect(margin + colW + 6, y, colW, 26, 2, 2, 'FD');

  pdf.setFont(fontName, 'bold');
  pdf.setFontSize(7);
  pdf.setTextColor(...COLORS.emerald700);
  pdf.text('ПРИМАЧ НА СТОКАТА', margin + 4, y + 5.5);

  pdf.setFont(fontName, 'bold');
  pdf.setFontSize(9.5);
  pdf.setTextColor(...COLORS.slate900);
  pdf.text(customerName, margin + 4, y + 11, { maxWidth: colW - 8 });

  pdf.setFont(fontName, 'normal');
  pdf.setFontSize(7.8);
  pdf.setTextColor(...COLORS.slate700);
  pdf.text(`Адреса: ${deliveryAddr}`, margin + 4, y + 16, { maxWidth: colW - 8 });
  pdf.text(`Контакт тел: ${dispatch.customer?.phone || '—'}`, margin + 4, y + 21, { maxWidth: colW - 8 });

  const rx = margin + colW + 10;
  const rEdge = pageWidth - margin - 4;
  pdf.setFont(fontName, 'bold');
  pdf.setFontSize(7);
  pdf.setTextColor(...COLORS.slate500);
  pdf.text('МАГАЦИНСКА ЕВИДЕНЦИЈА', rx, y + 5.5);

  const whRows: [string, string][] = [
    ['Статус:', dispatch.status === 'ISSUED' ? 'ИЗДАДЕНА (Раздолжена)' : 'НАЦРТ'],
    ['Издал:', dispatch.issuedBy || 'Магационер IMFEX'],
    ['Примил:', dispatch.receivedBy || customerName],
  ];
  whRows.forEach(([k, v], i) => {
    const ry = y + 11 + i * 4.8;
    pdf.setFont(fontName, 'normal');
    pdf.setFontSize(7.8);
    pdf.setTextColor(...COLORS.slate500);
    pdf.text(k, rx, ry);
    pdf.setFont(fontName, 'bold');
    pdf.setTextColor(...COLORS.slate900);
    pdf.text(v, rEdge, ry, { align: 'right', maxWidth: colW - 22 });
  });
  y += 32;

  // Items Table
  const drawDispTableHeader = () => {
    pdf.setFillColor(...COLORS.navy);
    pdf.rect(margin, y, contentWidth, 8.5, 'F');
    pdf.setFont(fontName, 'bold');
    pdf.setFontSize(7.5);
    pdf.setTextColor(...COLORS.white);
    pdf.text('Р.БР.', margin + 5, y + 5.6, { align: 'center' });
    pdf.text('ШИФРА', margin + 14, y + 5.6);
    pdf.text('НАЗИВ НА ПРОИЗВОД / ОПРЕМА', margin + 40, y + 5.6);
    pdf.text('СЕРИСКИ БР.', margin + contentWidth - 52, y + 5.6);
    pdf.text('КОЛ.', margin + contentWidth - 10, y + 5.6, { align: 'center' });
    y += 8.5;
  };
  drawDispTableHeader();

  for (let idx = 0; idx < (dispatch.items || []).length; idx++) {
    const item = dispatch.items[idx];
    const titleLines = pdf.splitTextToSize(item.title || 'Производ', contentWidth - 96);
    const rowH = Math.max(9, titleLines.length * 4 + 4);

    if (y + rowH > maxBodyY) {
      pdf.addPage();
      y = drawRunningHeader(pdf, fontName, company.companyName, `ИСПРАТНИЦА ${dispatch.dispatchNumber}`, margin, pageWidth);
      drawDispTableHeader();
    }

    if (idx % 2 === 1) {
      pdf.setFillColor(...COLORS.slate50);
      pdf.rect(margin, y, contentWidth, rowH, 'F');
    }
    pdf.setDrawColor(...COLORS.slate200);
    pdf.setLineWidth(0.2);
    pdf.rect(margin, y, contentWidth, rowH, 'S');

    pdf.setFont(fontName, 'bold');
    pdf.setFontSize(8);
    pdf.setTextColor(...COLORS.slate500);
    pdf.text(String(idx + 1), margin + 5, y + 5.2, { align: 'center' });

    pdf.setFont(fontName, 'bold');
    pdf.setTextColor(...COLORS.slate700);
    pdf.text(item.productCode || 'АРТ', margin + 14, y + 5.2, { maxWidth: 24 });

    pdf.setFont(fontName, 'bold');
    pdf.setTextColor(...COLORS.slate900);
    pdf.text(titleLines, margin + 40, y + 5.2);

    pdf.setFont(fontName, 'normal');
    pdf.setTextColor(...COLORS.slate700);
    pdf.text(item.serialNumber || '—', margin + contentWidth - 52, y + 5.2, { maxWidth: 32 });

    pdf.setFont(fontName, 'bold');
    pdf.setTextColor(...COLORS.slate900);
    pdf.text(`${item.quantity} парч.`, margin + contentWidth - 10, y + 5.2, { align: 'center' });

    y += rowH;
  }

  y += 8;
  if (dispatch.notes) {
    const noteLines = pdf.splitTextToSize(dispatch.notes, contentWidth - 8);
    const noteH = noteLines.length * 4 + 8;
    pdf.setFillColor(...COLORS.slate50);
    pdf.setDrawColor(...COLORS.slate200);
    pdf.roundedRect(margin, y, contentWidth, noteH, 2, 2, 'FD');
    pdf.setFont(fontName, 'bold');
    pdf.setFontSize(7);
    pdf.setTextColor(...COLORS.slate700);
    pdf.text('ЗАБЕЛЕШКА ПРИ ИСПОРАКА / МОНТАЖА:', margin + 4, y + 4.8);
    pdf.setFont(fontName, 'normal');
    pdf.setFontSize(8);
    pdf.text(noteLines, margin + 4, y + 9.2);
    y += noteH + 6;
  }

  // Confirmation box
  pdf.setFillColor(...COLORS.emerald50);
  pdf.setDrawColor(...COLORS.slate200);
  pdf.roundedRect(margin, y, contentWidth, 12, 2, 2, 'FD');
  pdf.setFont(fontName, 'normal');
  pdf.setFontSize(8);
  pdf.setTextColor(...COLORS.slate700);
  pdf.text(
    'Потврдувам дека горенаведените производи и опрема се примени во исправна состојба и во наведената количина.',
    margin + 4,
    y + 7.2,
    { maxWidth: contentWidth - 8 }
  );

  // Dual signatures
  const sigY = Math.max(y + 28, pageHeight - 38);
  pdf.setDrawColor(...COLORS.slate500);
  pdf.setLineWidth(0.3);
  pdf.line(margin, sigY, margin + 74, sigY);
  pdf.line(pageWidth - margin - 74, sigY, pageWidth - margin, sigY);

  pdf.setFont(fontName, 'bold');
  pdf.setFontSize(8);
  pdf.setTextColor(...COLORS.slate700);
  pdf.text('Издал од магацин / Монтер', margin + 37, sigY + 5, { align: 'center' });
  pdf.text('Примил (Купувач / Овластено лице)', pageWidth - margin - 37, sigY + 5, { align: 'center' });

  pdf.setFont(fontName, 'normal');
  pdf.setFontSize(7);
  pdf.setTextColor(...COLORS.slate500);
  pdf.text(dispatch.issuedBy || company.companyName, margin + 37, sigY + 9.5, { align: 'center' });
  pdf.text(dispatch.receivedBy || customerName, pageWidth - margin - 37, sigY + 9.5, { align: 'center' });

  addPageFooters(pdf, fontName, `${company.companyName} — Испратница: ${dispatch.dispatchNumber}`, false, margin);
  return finalizePdf(pdf, filename);
}
