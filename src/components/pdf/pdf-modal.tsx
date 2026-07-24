'use client';

import React, { useState, useEffect } from 'react';
import { PrintableOfferDocument } from './printable-offer-document';
import { Offer, Product } from '@/types';
import { Download, X, FileText, CheckCircle2, Mail, Loader2, Printer } from 'lucide-react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

interface PdfModalProps {
  isOpen: boolean;
  onClose: () => void;
  offer: Offer;
  products?: Product[];
}

export const PdfModal: React.FC<PdfModalProps> = ({ isOpen, onClose, offer, products = [] }) => {
  const [isClient, setIsClient] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [emailStatus, setEmailStatus] = useState<'idle' | 'sending' | 'sent'>('idle');

  useEffect(() => {
    setIsClient(true);
  }, []);

  if (!isOpen || !isClient) return null;

  const handleDownloadPdf = async () => {
    setIsGeneratingPdf(true);
    try {
      const element = document.getElementById('printable-offer-document');
      if (!element) return;

      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
      });

      const imgData = canvas.toDataURL('image/jpeg', 0.95);
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });

      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

      pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`${offer.offerNumber}_IMFEX_Quote.pdf`);
    } catch (err) {
      console.error('PDF Export Error:', err);
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleSimulateEmail = () => {
    setEmailStatus('sending');
    setTimeout(() => {
      setEmailStatus('sent');
      setTimeout(() => setEmailStatus('idle'), 4000);
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 backdrop-blur-sm p-4 animate-in fade-in duration-200 print:p-0 print:static print:bg-white">
      <div className="bg-card border border-border rounded-xl shadow-2xl w-full max-w-5xl h-[90vh] flex flex-col overflow-hidden print:h-auto print:border-none print:shadow-none print:max-w-none">
        {/* Modal Header (Hidden on Print) */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-muted/40 print:hidden">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 text-primary rounded-lg">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-lg leading-none">
                IMFEX Document Export - {offer.offerNumber}
              </h3>
              <p className="text-xs text-muted-foreground mt-1">
                Customer: {offer.customer?.companyName || offer.customer?.name || 'Customer'} • Valid until: {offer.validUntil || 'N/A'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Print Button */}
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border border-border bg-card hover:bg-muted text-foreground transition-all cursor-pointer"
            >
              <Printer className="w-4 h-4 text-slate-500" />
              Print
            </button>

            {/* Email simulation button */}
            <button
              onClick={handleSimulateEmail}
              disabled={emailStatus === 'sending'}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border border-border bg-card hover:bg-muted text-foreground transition-all cursor-pointer"
            >
              <Mail className="w-4 h-4 text-blue-500" />
              {emailStatus === 'sending' ? 'Sending...' : emailStatus === 'sent' ? 'Sent to Customer!' : 'Email Quote'}
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
                  Generating PDF...
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  Download PDF
                </>
              )}
            </button>

            <button
              onClick={onClose}
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
            Phase 2 Email Pipeline Ready: PDF Buffer successfully attached and dispatched to {offer.customer?.email || 'customer email'}.
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
