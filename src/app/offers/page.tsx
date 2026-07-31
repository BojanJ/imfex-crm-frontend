'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useI18n } from '@/lib/i18n-context';
import { Offer } from '@/types';
import { imfexStore, useImfexStore } from '@/lib/store';
import { PdfModal } from '@/components/pdf/pdf-modal';
import {
  FileSpreadsheet,
  Plus,
  Search,
  FileText,
  Edit3,
  Trash2,
  Briefcase,
} from 'lucide-react';

import { SearchableSelect } from '@/components/ui/searchable-select';

export default function OffersPage() {
  const { t } = useI18n();
  useImfexStore(); // Auto-subscribe to live store updates from Supabase REST API

  const [offers, setOffers] = useState<Offer[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [selectedOfferForPdf, setSelectedOfferForPdf] = useState<Offer | null>(null);

  const statusOptions = [
    { value: 'DRAFT', label: t('offers.draft') },
    { value: 'SENT', label: t('offers.sent') },
    { value: 'ACCEPTED', label: t('offers.accepted') },
    { value: 'REJECTED', label: t('offers.rejected') },
    { value: 'EXPIRED', label: t('offers.expired') },
  ];

  const refreshList = () => {
    setOffers(imfexStore.getOffers());
  };

  useEffect(() => {
    refreshList();
  }, []);

  // Sync state whenever store receives data from Supabase REST API
  useEffect(() => {
    refreshList();
  }, [imfexStore.getOffers().length]);

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this offer record?')) {
      imfexStore.deleteOffer(id);
      refreshList();
    }
  };

  const handleSetStatus = (id: string, st: any) => {
    imfexStore.setOfferStatus(id, st);
    refreshList();
  };

  const filtered = offers.filter((o) => {
    const matchesSearch =
      o.offerNumber.toLowerCase().includes(search.toLowerCase()) ||
      (o.customer?.companyName || o.customer?.name || '').toLowerCase().includes(search.toLowerCase());

    const matchesStatus = statusFilter === 'ALL' || o.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-card p-6 rounded-xl border border-border">
        <div>
          <h1 className="font-extrabold text-xl tracking-tight flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-primary" />
            <span>{t('offers.title')}</span>
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            {t('offers.subtitle')}
          </p>
        </div>

        <Link
          href="/offers/new"
          className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-all shadow-md"
        >
          <Plus className="w-4 h-4" /> {t('offers.create_offer')}
        </Link>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between bg-card p-4 rounded-xl border border-border">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-muted-foreground" />
          <input
            type="text"
            placeholder={t('offers.search_placeholder')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-border bg-background outline-none focus:ring-2 focus:ring-primary font-medium"
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-bold text-muted-foreground uppercase">{t('offers.filter_status')}</span>
          {['ALL', 'DRAFT', 'SENT', 'ACCEPTED', 'REJECTED', 'EXPIRED'].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all ${
                statusFilter === st
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'bg-muted text-muted-foreground hover:text-foreground'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Offers Table Card */}
      <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
        {filtered.length === 0 ? (
          <div className="p-12 text-center text-xs text-muted-foreground">
            Нема пронајдено понуди. Кликнете "+ Креирај Понуда" за да креирате нова понуда.
          </div>
        ) : (
          <>
            {/* Mobile Cards View */}
            <div className="grid grid-cols-1 divide-y divide-border md:hidden text-xs">
              {filtered.map((offer) => (
                <div key={offer.id} className="p-5 space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="font-extrabold text-primary text-xs">{offer.offerNumber}</span>
                    <div className="w-32">
                      <SearchableSelect
                        options={statusOptions}
                        value={offer.status}
                        onChange={(val) => handleSetStatus(offer.id, val)}
                        className={`px-2.5 py-1 rounded-lg text-[10px] font-extrabold uppercase border-0 outline-none cursor-pointer ${
                          offer.status === 'ACCEPTED'
                            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-black'
                            : offer.status === 'SENT'
                            ? 'bg-blue-500/10 text-blue-500'
                            : offer.status === 'REJECTED'
                            ? 'bg-red-500/10 text-red-500'
                            : offer.status === 'EXPIRED'
                            ? 'bg-gray-500/10 text-gray-500'
                            : 'bg-amber-500/10 text-amber-500'
                        }`}
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <p className="font-bold text-foreground">
                      {offer.customer?.companyName || offer.customer?.name || 'Customer'}
                    </p>
                    <p className="text-[10px] text-muted-foreground">{offer.customer?.email}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {(offer.items || []).length} item(s) configured
                    </p>
                  </div>

                  <div className="text-[10px] text-muted-foreground space-y-0.5 bg-muted/30 p-2 rounded-lg border border-border">
                    {Number(offer.discountRate || 0) > 0 && (
                      <p className="text-emerald-600 font-bold">
                        {t('offers.discount')}: {offer.discountRate}% (-€{Number(offer.discountAmount || 0).toFixed(2)})
                      </p>
                    )}
                    <p>ДДВ ({offer.taxRate || 18}%): €{Number(offer.taxAmount || 0).toFixed(2)}</p>
                  </div>

                  <div className="flex justify-between items-center pt-2">
                    <div className="text-left">
                      <span className="text-[10px] text-muted-foreground block font-semibold uppercase">{t('offers.total')}</span>
                      <span className="font-black text-foreground">
                        €{Number(offer.totalAmount || 0).toFixed(2)}
                      </span>
                    </div>

                    <div className="flex items-center gap-1">
                      {offer.status === 'ACCEPTED' && (
                        <Link
                          href="/projects"
                          className="p-1.5 bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 rounded-lg font-semibold flex items-center gap-1 text-[10px]"
                          title="View Operational Project"
                        >
                          <Briefcase className="w-3.5 h-3.5" />
                        </Link>
                      )}
                      <button
                        onClick={() => setSelectedOfferForPdf(offer)}
                        className="p-1.5 bg-blue-500/10 text-blue-600 hover:bg-blue-500/20 rounded-lg font-semibold flex items-center gap-1 text-[10px]"
                        title={t('offers.pdf_preview')}
                      >
                        <FileText className="w-3.5 h-3.5" /> PDF
                      </button>
                      <Link
                        href={`/offers/${offer.id}`}
                        className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg border border-border bg-card"
                        title="Edit Offer"
                      >
                        <Edit3 className="w-4 h-4" />
                      </Link>
                      <button
                        onClick={() => handleDelete(offer.id)}
                        className="p-1.5 text-red-500 hover:bg-red-500/10 rounded-lg"
                        title="Delete Offer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto w-full">
              <table className="w-full text-left text-xs min-w-[950px]">
                <thead className="bg-muted/50 font-bold border-b border-border text-muted-foreground uppercase text-[10px]">
                  <tr>
                    <th className="p-4">{t('offers.offer_number')}</th>
                    <th className="p-4">{t('offers.customer')}</th>
                    <th className="p-4">{t('offers.items')}</th>
                    <th className="p-4">{t('offers.status')}</th>
                    <th className="p-4">{t('offers.discount')} / {t('offers.tax_rate')}</th>
                    <th className="p-4 text-right">{t('offers.total')}</th>
                    <th className="p-4 text-center">{t('offers.action')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filtered.map((offer) => (
                    <tr key={offer.id} className="hover:bg-muted/20 transition-colors">
                      <td className="p-4 font-extrabold text-primary">{offer.offerNumber}</td>
                      <td className="p-4">
                        <p className="font-bold text-foreground">
                          {offer.customer?.companyName || offer.customer?.name || 'Customer'}
                        </p>
                        <p className="text-[10px] text-muted-foreground">{offer.customer?.email}</p>
                      </td>
                      <td className="p-4 text-muted-foreground">
                        {(offer.items || []).length} item(s) configured
                      </td>
                      <td className="p-4">
                        <div className="w-32">
                          <SearchableSelect
                            options={statusOptions}
                            value={offer.status}
                            onChange={(val) => handleSetStatus(offer.id, val)}
                            className={`px-2.5 py-1 rounded-lg text-[10px] font-extrabold uppercase border-0 outline-none cursor-pointer ${
                              offer.status === 'ACCEPTED'
                                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-black'
                                : offer.status === 'SENT'
                                ? 'bg-blue-500/10 text-blue-500'
                                : offer.status === 'REJECTED'
                                ? 'bg-red-500/10 text-red-500'
                                : offer.status === 'EXPIRED'
                                ? 'bg-gray-500/10 text-gray-500'
                                : 'bg-amber-500/10 text-amber-500'
                            }`}
                          />
                        </div>
                      </td>
                      <td className="p-4 text-muted-foreground">
                        {Number(offer.discountRate || 0) > 0 && (
                          <span className="block text-[10px] text-emerald-600 font-bold">
                            {t('offers.discount')}: {offer.discountRate}% (-€{Number(offer.discountAmount || 0).toFixed(2)})
                          </span>
                        )}
                        <span>ДДВ ({offer.taxRate || 18}%): €{Number(offer.taxAmount || 0).toFixed(2)}</span>
                      </td>
                      <td className="p-4 text-right font-black text-base text-foreground">
                        €{Number(offer.totalAmount || 0).toFixed(2)}
                      </td>
                      <td className="p-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          {offer.status === 'ACCEPTED' && (
                            <Link
                              href="/projects"
                              className="p-1.5 bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 rounded-lg font-semibold flex items-center gap-1 text-[11px]"
                              title="View Operational Project"
                            >
                              <Briefcase className="w-3.5 h-3.5" /> {t('projects.title')}
                            </Link>
                          )}
                          <button
                            onClick={() => setSelectedOfferForPdf(offer)}
                            className="p-1.5 bg-blue-500/10 text-blue-600 hover:bg-blue-500/20 rounded-lg font-semibold flex items-center gap-1 text-[11px]"
                            title={t('offers.pdf_preview')}
                          >
                            <FileText className="w-3.5 h-3.5" /> PDF
                          </button>
                          <Link
                            href={`/offers/${offer.id}`}
                            className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg"
                            title="Edit Offer"
                          >
                            <Edit3 className="w-4 h-4" />
                          </Link>
                          <button
                            onClick={() => handleDelete(offer.id)}
                            className="p-1.5 text-red-500 hover:bg-red-500/10 rounded-lg"
                            title="Delete Offer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {/* PDF Viewer Modal */}
      {selectedOfferForPdf && (
        <PdfModal
          isOpen={!!selectedOfferForPdf}
          onClose={() => setSelectedOfferForPdf(null)}
          offer={selectedOfferForPdf}
          products={imfexStore.getProducts()}
        />
      )}
    </div>
  );
}
