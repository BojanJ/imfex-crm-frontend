'use client';

import React, { useState } from 'react';
import { SalesInvoice, DispatchNote } from '@/types';
import { generateMultiPagePdf } from '@/lib/pdf-generator';
import { Download, Printer, X, FileText, Loader2, Truck } from 'lucide-react';

interface PrintableInvoiceProps {
  invoice: SalesInvoice;
}

export const PrintableSalesInvoice: React.FC<PrintableInvoiceProps> = ({ invoice }) => {
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

  return (
    <div
      id="printable-finance-document"
      className="w-full max-w-[800px] mx-auto bg-white text-slate-900 font-sans leading-relaxed"
    >
      <div className="w-full min-h-[1120px] bg-white p-10 flex flex-col justify-between">
        <div className="space-y-6">
          {/* Header */}
          <div className="flex justify-between items-start border-b-2 border-slate-900 pb-6">
            <div className="space-y-1">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-[#0b1329] text-white font-black text-base flex items-center justify-center">
                  iF
                </div>
                <div>
                  <h1 className="text-xl font-black tracking-wider text-slate-900 uppercase">IMFEX GROUP ДООЕЛ</h1>
                  <p className="text-[11px] font-bold text-slate-500">ПРОИЗВОДСТВО, ПРОДАЖБА И МОНТАЖА НА ВРАТИ И АВТОМАТИКА</p>
                </div>
              </div>
              <div className="text-[11px] text-slate-600 pt-2 space-y-0.5">
                <p>Ул. Индустриска Зона бр. 12, 1000 Скопје, Северна Македонија</p>
                <p>ЕДБ: <strong>MK4080012345678</strong> &nbsp;|&nbsp; Жиро сметка: <strong>300000001234567 (Комерцијална Банка)</strong></p>
                <p>Е-пошта: finance@imfex.mk &nbsp;|&nbsp; Тел: +389 70 200 300</p>
              </div>
            </div>

            <div className="text-right space-y-1">
              <span className="inline-block bg-[#0b1329] text-white text-xs font-black px-3.5 py-1.5 rounded-lg uppercase tracking-wider">
                {typeTitle}
              </span>
              <p className="text-lg font-black font-mono text-slate-900 pt-1">{invoice.invoiceNumber}</p>
              {invoice.externalAccountingNumber && (
                <p className="text-[11px] font-bold text-slate-600">
                  Сметководствен бр: <span className="font-mono">{invoice.externalAccountingNumber}</span>
                </p>
              )}
              <p className="text-[11px] text-slate-500">Датум на издавање: <strong>{invoice.issueDate}</strong></p>
              {invoice.dueDate && (
                <p className="text-[11px] text-slate-500">Валута / Рок на плаќање: <strong>{invoice.dueDate}</strong></p>
              )}
            </div>
          </div>

          {/* Subtitle banner */}
          <div className="bg-slate-100 border border-slate-200 px-4 py-2 rounded-lg flex items-center justify-between text-xs">
            <span className="font-bold text-slate-700">{typeSubtitle}</span>
            <span className="font-mono font-bold text-slate-600">
              {invoice.projectId ? `Проект: ${invoice.projectId}` : ''}
            </span>
          </div>

          {/* Recipient & Metadata */}
          <div className="grid grid-cols-2 gap-6 text-xs">
            <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/60 space-y-1">
              <p className="text-[10px] font-black uppercase text-blue-700 tracking-wider">КУПУВАЧ / КЛИЕНТ</p>
              <p className="text-sm font-black text-slate-900">{customerName}</p>
              <p className="text-slate-600">Адреса: <strong>{customerAddress}</strong></p>
              <p className="text-slate-600">ЕДБ / Даночен број: <strong>{customerTaxId}</strong></p>
              <p className="text-slate-600">Телефон: {customerPhone}</p>
            </div>

            <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/60 space-y-1.5">
              <p className="text-[10px] font-black uppercase text-slate-500 tracking-wider">ДЕТАЛИ ЗА ДОКУМЕНТОТ</p>
              <div className="flex justify-between">
                <span className="text-slate-500">Тип на документ:</span>
                <span className="font-bold text-slate-900">{typeTitle}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Статус на наплата:</span>
                <span className="font-bold text-slate-900">
                  {invoice.status === 'PAID'
                    ? 'ПЛАТЕНО'
                    : invoice.status === 'PARTIAL_PAID'
                    ? 'ДЕЛУМНО ПЛАТЕНО'
                    : 'ЗА НАПЛАТА'}
                </span>
              </div>
              {invoice.linkedAdvanceInvoiceNumber && (
                <div className="flex justify-between text-emerald-700 font-bold">
                  <span>Поврзана авансна ф-ра:</span>
                  <span>{invoice.linkedAdvanceInvoiceNumber}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-slate-500">Даночна стапка (ДДВ):</span>
                <span className="font-bold text-slate-900">{invoice.taxRate}%</span>
              </div>
            </div>
          </div>

          {/* Line Items Table */}
          <div className="border border-slate-200 rounded-xl overflow-hidden text-xs">
            <table className="w-full text-left">
              <thead className="bg-[#0b1329] text-white font-black uppercase text-[10px]">
                <tr>
                  <th className="p-3 text-center w-10">#</th>
                  <th className="p-3">НАЗИВ НА ДОБРО / УСЛУГА</th>
                  <th className="p-3 text-center w-20">КОЛ.</th>
                  <th className="p-3 text-right w-28">ЕД. ЦЕНА (€)</th>
                  <th className="p-3 text-right w-32">ВКУПНО (€)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {invoice.items.map((item, idx) => (
                  <tr key={item.id || idx}>
                    <td className="p-3 text-center font-bold text-slate-400">{idx + 1}</td>
                    <td className="p-3">
                      <p className="font-bold text-slate-900">{item.title}</p>
                      {item.description && (
                        <p className="text-[10px] text-slate-500 mt-0.5">{item.description}</p>
                      )}
                    </td>
                    <td className="p-3 text-center font-bold text-slate-800">{item.quantity}</td>
                    <td className="p-3 text-right font-medium text-slate-700">
                      €{Number(item.unitPrice || 0).toFixed(2)}
                    </td>
                    <td className="p-3 text-right font-black text-slate-900">
                      €{Number(item.totalPrice || 0).toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Totals & Advance Deduction Breakdown */}
          <div className="flex flex-col items-end space-y-1.5 text-xs pt-2">
            <div className="w-80 space-y-1.5 border border-slate-200 rounded-xl p-4 bg-slate-50">
              <div className="flex justify-between text-slate-600 font-semibold">
                <span>Меѓузбир (Основица):</span>
                <span>€{Number(invoice.subtotal || 0).toFixed(2)}</span>
              </div>
              {Number(invoice.discountAmount || 0) > 0 && (
                <div className="flex justify-between text-emerald-700 font-bold">
                  <span>Попуст ({invoice.discountRate}%):</span>
                  <span>-€{Number(invoice.discountAmount || 0).toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between text-slate-600 font-semibold">
                <span>Пресметан ДДВ ({invoice.taxRate}%):</span>
                <span>€{Number(invoice.taxAmount || 0).toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-slate-900 font-black border-t border-slate-200 pt-1.5">
                <span>Вкупна вредност со ДДВ:</span>
                <span>€{Number(invoice.grossTotalAmount || invoice.totalAmount || 0).toFixed(2)}</span>
              </div>

              {invoice.invoiceType === 'FINAL' && Number(invoice.advanceDeductedAmount || 0) > 0 && (
                <>
                  <div className="flex justify-between text-amber-700 font-bold pt-1 border-t border-dashed border-slate-300">
                    <span>
                      Минус платен аванс ({invoice.linkedAdvanceInvoiceNumber || 'Аванс'}):
                    </span>
                    <span>-€{Number(invoice.advanceDeductedAmount).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-[11px] text-slate-500">
                    <span>Преостаната основица за ДДВ:</span>
                    <span>€{netPayable.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-[11px] text-slate-500">
                    <span>Преостанат ДДВ за уплата ({invoice.taxRate}%):</span>
                    <span>€{vatPayable.toFixed(2)}</span>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Grand Payable Banner */}
          <div className="bg-[#0b1329] text-white p-5 rounded-2xl flex items-center justify-between shadow-lg">
            <div>
              <span className="text-sm font-black tracking-wider uppercase block">
                {invoice.invoiceType === 'FINAL' && invoice.advanceDeductedAmount > 0
                  ? 'ОСТАТОК ЗА ДОПЛАТА ПО ФАКТУРА:'
                  : 'ВКУПНО ЗА ПЛАЌАЊЕ:'}
              </span>
              <span className="text-[11px] text-slate-300">
                Во денарска противвредност по среден курс на НБРСМ (1 € = 61.50 МКД: {(Number(invoice.totalAmount || 0) * 61.5).toLocaleString('mk-MK', { minimumFractionDigits: 2 })} МКД)
              </span>
            </div>
            <span className="text-2xl font-black font-mono">
              €{Number(invoice.totalAmount || 0).toFixed(2)}
            </span>
          </div>

          {invoice.notes && (
            <div className="border border-slate-200 rounded-xl p-3.5 text-xs bg-slate-50">
              <p className="font-bold text-slate-700 uppercase text-[10px]">Забелешка:</p>
              <p className="text-slate-600 mt-0.5">{invoice.notes}</p>
            </div>
          )}
        </div>

        {/* Signatures & Footer */}
        <div className="space-y-6 pt-8">
          <div className="grid grid-cols-2 gap-12 text-xs pt-6">
            <div className="border-t border-slate-400 pt-2 text-center">
              <p className="font-bold text-slate-700">Фактурирал / Овластено лице</p>
              <p className="text-[10px] text-slate-400">IMFEX GROUP ДООЕЛ (Печат и потпис)</p>
            </div>
            <div className="border-t border-slate-400 pt-2 text-center">
              <p className="font-bold text-slate-700">Примил за купувачот</p>
              <p className="text-[10px] text-slate-400">Потпис на овластено лице</p>
            </div>
          </div>

          <div className="flex justify-between items-center border-t border-slate-200 pt-3 text-[10px] text-slate-400">
            <span>Генерирано преку IMFEX Enterprise CRM & Finance OS</span>
            <span>Документ: {invoice.invoiceNumber}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

interface PrintableDispatchProps {
  dispatch: DispatchNote;
}

export const PrintableDispatchNote: React.FC<PrintableDispatchProps> = ({ dispatch }) => {
  const customerName = dispatch.customer?.companyName || dispatch.customer?.name || 'Клиент';
  const deliveryAddr =
    dispatch.deliveryAddress ||
    [dispatch.customer?.address, dispatch.customer?.city].filter(Boolean).join(', ') ||
    'Скопје';

  return (
    <div
      id="printable-finance-document"
      className="w-full max-w-[800px] mx-auto bg-white text-slate-900 font-sans leading-relaxed"
    >
      <div className="w-full min-h-[1120px] bg-white p-10 flex flex-col justify-between">
        <div className="space-y-6">
          {/* Header */}
          <div className="flex justify-between items-start border-b-2 border-slate-900 pb-6">
            <div className="space-y-1">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-[#0b1329] text-white font-black text-base flex items-center justify-center">
                  iF
                </div>
                <div>
                  <h1 className="text-xl font-black tracking-wider text-slate-900 uppercase">IMFEX GROUP — МАГАЦИН</h1>
                  <p className="text-[11px] font-bold text-slate-500">ДОКУМЕНТ ЗА ФИЗИЧКИ ИЗЛЕЗ И ИСПОРАКА НА СТОКА</p>
                </div>
              </div>
            </div>

            <div className="text-right space-y-1">
              <span className="inline-block bg-emerald-700 text-white text-xs font-black px-3.5 py-1.5 rounded-lg uppercase tracking-wider">
                ИСПРАТНИЦА
              </span>
              <p className="text-lg font-black font-mono text-slate-900 pt-1">{dispatch.dispatchNumber}</p>
              <p className="text-[11px] text-slate-500">Датум на испорака: <strong>{dispatch.issueDate}</strong></p>
            </div>
          </div>

          {/* Recipient & Delivery info */}
          <div className="grid grid-cols-2 gap-6 text-xs">
            <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/60 space-y-1">
              <p className="text-[10px] font-black uppercase text-emerald-700 tracking-wider">ПРИМАЧ НА СТОКАТА</p>
              <p className="text-sm font-black text-slate-900">{customerName}</p>
              <p className="text-slate-600">Адреса за испорака: <strong>{deliveryAddr}</strong></p>
              <p className="text-slate-600">Контакт тел: {dispatch.customer?.phone || '—'}</p>
            </div>

            <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/60 space-y-1.5">
              <p className="text-[10px] font-black uppercase text-slate-500 tracking-wider">МАГАЦИНСКА ЕВИДЕНЦИЈА</p>
              <div className="flex justify-between">
                <span className="text-slate-500">Статус на испратница:</span>
                <span className="font-bold text-slate-900">
                  {dispatch.status === 'ISSUED' ? 'ИЗДАДЕНА (Раздолжена залиха)' : 'НАЦРТ'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Издал од магацин:</span>
                <span className="font-bold text-slate-900">{dispatch.issuedBy || 'Магационер IMFEX'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Примил на локација:</span>
                <span className="font-bold text-slate-900">{dispatch.receivedBy || customerName}</span>
              </div>
            </div>
          </div>

          {/* Items table */}
          <div className="border border-slate-200 rounded-xl overflow-hidden text-xs">
            <table className="w-full text-left">
              <thead className="bg-[#0b1329] text-white font-black uppercase text-[10px]">
                <tr>
                  <th className="p-3 text-center w-12">Р.БР.</th>
                  <th className="p-3 w-32">ШИФРА</th>
                  <th className="p-3">НАЗИВ НА ПРОИЗВОД / ОПРЕМА</th>
                  <th className="p-3 w-40">СЕРИСКИ БР. / ЗАБЕЛЕШКА</th>
                  <th className="p-3 text-center w-24">КОЛИЧИНА</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {dispatch.items.map((item, idx) => (
                  <tr key={item.id || idx}>
                    <td className="p-3 text-center font-bold text-slate-400">{idx + 1}</td>
                    <td className="p-3 font-mono font-bold text-slate-700">{item.productCode || 'АРТ'}</td>
                    <td className="p-3 font-bold text-slate-900">{item.title}</td>
                    <td className="p-3 font-mono text-slate-600">{item.serialNumber || '—'}</td>
                    <td className="p-3 text-center font-black text-slate-900">{item.quantity} парч.</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {dispatch.notes && (
            <div className="border border-slate-200 rounded-xl p-4 text-xs bg-slate-50">
              <p className="font-bold text-slate-700 uppercase text-[10px]">Забелешка при испорака / монтажа:</p>
              <p className="text-slate-600 mt-1">{dispatch.notes}</p>
            </div>
          )}

          <div className="border border-slate-200 rounded-xl p-4 text-xs bg-emerald-50/50 text-slate-700">
            Потврдувам дека горенаведените производи и опрема се примени во исправна состојба и во наведената количина.
          </div>
        </div>

        {/* Signatures */}
        <div className="space-y-6 pt-8">
          <div className="grid grid-cols-2 gap-12 text-xs pt-6">
            <div className="border-t border-slate-400 pt-2 text-center">
              <p className="font-bold text-slate-700">Издал од магацин / Монтер</p>
              <p className="text-[10px] text-slate-400">{dispatch.issuedBy || 'IMFEX GROUP'}</p>
            </div>
            <div className="border-t border-slate-400 pt-2 text-center">
              <p className="font-bold text-slate-700">Примил (Купувач / Овластено лице)</p>
              <p className="text-[10px] text-slate-400">{dispatch.receivedBy || customerName}</p>
            </div>
          </div>

          <div className="flex justify-between items-center border-t border-slate-200 pt-3 text-[10px] text-slate-400">
            <span>IMFEX GROUP — Магацинско работење и логистика</span>
            <span>Испратница: {dispatch.dispatchNumber}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

interface FinancePdfModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoice?: SalesInvoice | null;
  dispatchNote?: DispatchNote | null;
}

export const FinancePdfModal: React.FC<FinancePdfModalProps> = ({
  isOpen,
  onClose,
  invoice,
  dispatchNote,
}) => {
  const [isGenerating, setIsGenerating] = useState(false);

  if (!isOpen || (!invoice && !dispatchNote)) return null;

  const docNumber = invoice ? invoice.invoiceNumber : dispatchNote!.dispatchNumber;

  const handleDownload = async () => {
    setIsGenerating(true);
    try {
      const el = document.getElementById('printable-finance-document');
      if (el) {
        await generateMultiPagePdf(el, `${docNumber}_IMFEX.pdf`);
      }
    } catch (e) {
      console.error('PDF generation error:', e);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 backdrop-blur-sm p-4 print:p-0 print:static print:bg-white">
      <div className="bg-card border border-border rounded-xl shadow-2xl w-full max-w-5xl h-[90vh] flex flex-col overflow-hidden print:h-auto print:border-none print:shadow-none">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-muted/40 print:hidden">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 text-primary rounded-lg">
              {invoice ? <FileText className="w-5 h-5" /> : <Truck className="w-5 h-5" />}
            </div>
            <div>
              <h3 className="font-bold text-base">Официјален PDF Документ — {docNumber}</h3>
              <p className="text-xs text-muted-foreground">
                Преглед, печатење и преземање на PDF документ
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => window.print()}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border border-border bg-card hover:bg-muted text-foreground cursor-pointer"
            >
              <Printer className="w-4 h-4" /> Печати
            </button>
            <button
              onClick={handleDownload}
              disabled={isGenerating}
              className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-bold rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 cursor-pointer disabled:opacity-50"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Се генерира...
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" /> Преземи PDF
                </>
              )}
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="flex-1 bg-slate-100 dark:bg-slate-900 p-6 overflow-y-auto print:bg-white print:p-0">
          {invoice ? (
            <PrintableSalesInvoice invoice={invoice} />
          ) : (
            <PrintableDispatchNote dispatch={dispatchNote!} />
          )}
        </div>
      </div>
    </div>
  );
};

