'use client';

import React, { useState, useEffect } from 'react';
import { PrintableOfferDocument } from './printable-offer-document';
import { Offer, Product } from '@/types';
import { formatDate } from '@/lib/date-format';
import { Download, X, FileText, CheckCircle2, Mail, Loader2, Printer } from 'lucide-react';
import { generateMultiPagePdf } from '@/lib/pdf-generator';
import { getApiUrl, authFetch } from '@/lib/api';
import { useI18n } from '@/lib/i18n-context';
import { toast } from '@/components/ui/toastr';
import { useEscapeKey } from '@/components/ui/use-escape-key';

interface PdfModalProps {
  isOpen: boolean;
  onClose: () => void;
  offer: Offer;
  products?: Product[];
}

export const PdfModal: React.FC<PdfModalProps> = ({ isOpen, onClose, offer, products = [] }) => {
  const { t } = useI18n();
  const [isClient, setIsClient] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [emailStatus, setEmailStatus] = useState<'idle' | 'sending' | 'sent'>('idle');

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEscapeKey(isOpen, onClose);

  if (!isOpen || !isClient) return null;

  const handleDownloadPdf = async () => {
    setIsGeneratingPdf(true);
    try {
      const element = document.getElementById('printable-offer-document');
      if (!element) return;

      await generateMultiPagePdf(element, `${offer.offerNumber}_IMFEX_Quote.pdf`);
    } catch (err) {
      console.error('PDF Export Error:', err);
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleSendEmail = async () => {
    setEmailStatus('sending');
    try {
      const element = document.getElementById('printable-offer-document');
      let pdfBase64 = '';
      if (element) {
        const result = await generateMultiPagePdf(element);
        pdfBase64 = result.pdfBase64;
      }

      const API_BASE_URL = getApiUrl();
      const res = await authFetch(`${API_BASE_URL}/api/email/send-offer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: offer.customer?.email || '',
          customerName: offer.customer?.companyName || offer.customer?.name || 'Клиент',
          offerNumber: offer.offerNumber,
          totalAmount: offer.totalAmount,
          pdfBase64: pdfBase64,
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        toast.error('Грешка при испраќање на е-пошта', errData.error || `HTTP ${res.status}`);
        setEmailStatus('idle');
        return;
      }

      toast.success('Е-пошта е испратена!', `Понудата ${offer.offerNumber} е испратена успешно.`);
      setEmailStatus('sent');
      setTimeout(() => setEmailStatus('idle'), 4000);
    } catch (err) {
      console.error('Send Email Error:', err);
      toast.error('Мрежна грешка при испраќање на е-пошта');
      setEmailStatus('idle');
    }
  };

  const resolvedValidUntil = formatDate(
    offer.validUntil,
    formatDate(new Date((offer.createdAt ? new Date(offer.createdAt).getTime() : Date.now()) + 14 * 24 * 60 * 60 * 1000))
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 backdrop-blur-sm p-4 print:p-0 print:static print:bg-white"
      role="dialog"
      aria-modal="true"
      aria-label={`PDF преглед ${offer.offerNumber}`}
    >
      <div className="bg-card border border-border rounded-xl shadow-2xl w-full max-w-5xl h-[90vh] flex flex-col overflow-hidden print:h-auto print:border-none print:shadow-none print:max-w-none">
        {/* Modal Header (Hidden on Print) */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between px-6 py-4 border-b border-border bg-muted/40 print:hidden gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 text-primary rounded-lg">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-lg leading-none">
                {t('pdf_modal.title')} — {offer.offerNumber}
              </h3>
              <p className="text-xs text-muted-foreground mt-1">
                {t('pdf_modal.customer')}: {offer.customer?.companyName || offer.customer?.name || t('pdf_modal.customer')} • {t('pdf_modal.valid_until')}: {resolvedValidUntil}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap justify-end">
            {/* Print Button */}
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border border-border bg-card hover:bg-muted text-foreground transition-all cursor-pointer"
            >
              <Printer className="w-4 h-4 text-slate-500" />
              {t('pdf_modal.print')}
            </button>

            {/* Email Quote Button */}
            <button
              onClick={handleSendEmail}
              disabled={emailStatus === 'sending'}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border border-border bg-card hover:bg-muted text-foreground transition-all cursor-pointer"
            >
              <Mail className="w-4 h-4 text-blue-500" />
              {emailStatus === 'sending'
                ? t('pdf_modal.sending')
                : emailStatus === 'sent'
                ? t('pdf_modal.sent')
                : t('pdf_modal.email_quote')}
            </button>

            {/* PDF Download Button */}
            <button
              onClick={handleDownloadPdf}
              disabled={isGeneratingPdf}
              className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground transition-all shadow-sm cursor-pointer disabled:opacity-50"
            >
              {isGeneratingPdf ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {t('pdf_modal.generating')}
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  {t('pdf_modal.download_pdf')}
                </>
              )}
            </button>

            <button
              type="button"
              onClick={onClose}
              aria-label="Затвори"
              className="p-1.5 text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Email sent notification banner */}
        {emailStatus === 'sent' && (
          <div className="bg-emerald-500/10 border-b border-emerald-500/20 px-6 py-2 flex items-center gap-2 text-xs text-emerald-600 dark:text-emerald-400 font-medium print:hidden">
            <CheckCircle2 className="w-4 h-4" />
            {t('pdf_modal.email_sent_banner')} {offer.customer?.email || '—'}.
          </div>
        )}

        {/* PDF Live Printable View */}
        <div className="flex-1 bg-slate-100 dark:bg-slate-900 p-6 overflow-y-auto print:bg-white print:p-0">
          <PrintableOfferDocument offer={offer} products={products} />
        </div>
      </div>
    </div>
  );
};
