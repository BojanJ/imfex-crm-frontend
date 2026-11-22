'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useI18n } from '@/lib/i18n-context';
import { Offer, SalesInvoice } from '@/types';
import { imfexStore, useImfexStore } from '@/lib/store';
import { useOffersQuery, useProjectsQuery, useDeleteOfferMutation } from '@/lib/queries';
import { formatDate } from '@/lib/date-format';
import { formatCurrency } from '@/lib/formatters';
import { getOfferStatusLabel } from '@/lib/enum-labels';
import { PdfModal } from '@/components/pdf/pdf-modal';
import { AdvancePaymentModal } from '@/components/finance/advance-payment-modal';
import { FinancePdfModal } from '@/components/pdf/printable-finance-document';
import {
  FileSpreadsheet,
  Plus,
  FileText,
  Edit3,
  Trash2,
  Briefcase,
  Euro,
  Receipt,
} from 'lucide-react';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { toast } from '@/components/ui/toastr';
import { ConfirmModal } from '@/components/ui/confirm-modal';
import { PageLoadingSkeleton } from '@/components/ui/loading-skeleton';
import { PageHeader, FilterBar, EmptyState } from '@/components/ui/page-primitives';

function offerStatusSelectStyle(status: string) {
  switch (status) {
    case 'ACCEPTED':
      return 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20';
    case 'SENT':
      return 'bg-primary/10 text-blue-700 dark:text-blue-400 border-primary/20';
    case 'REJECTED':
      return 'bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/20';
    case 'EXPIRED':
      return 'bg-muted text-muted-foreground border-border';
    default:
      return 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20';
  }
}

export default function OffersPage() {
  const { t, locale } = useI18n();
  useImfexStore();
  const offersQuery = useOffersQuery();
  const projectsQuery = useProjectsQuery();
  const deleteOfferMutation = useDeleteOfferMutation();

  const offers = offersQuery.data ?? imfexStore.getOffers();
  const projects = projectsQuery.data ?? imfexStore.getProjects();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [selectedOfferForPdf, setSelectedOfferForPdf] = useState<Offer | null>(null);
  const [advanceOffer, setAdvanceOffer] = useState<Offer | null>(null);
  const [previewInvoice, setPreviewInvoice] = useState<SalesInvoice | null>(null);
  const [confirmState, setConfirmState] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    confirmLabel?: string;
    variant?: 'danger' | 'warning' | 'primary' | 'success';
    onConfirm: () => void;
  } | null>(null);

  const statusOptions = [
    { value: 'DRAFT', label: getOfferStatusLabel('DRAFT', locale) },
    { value: 'SENT', label: getOfferStatusLabel('SENT', locale) },
    { value: 'ACCEPTED', label: getOfferStatusLabel('ACCEPTED', locale) },
    { value: 'REJECTED', label: getOfferStatusLabel('REJECTED', locale) },
    { value: 'EXPIRED', label: getOfferStatusLabel('EXPIRED', locale) },
  ];

  const refreshList = () => {
    void offersQuery.refetch();
  };

  const handleDelete = (id: string) => {
    const offer = offers.find((o) => o.id === id);
    setConfirmState({
      isOpen: true,
      title: 'Избриши Понуда',
      message: `Дали сте сигурни дека сакате да ја избришете понудата „${offer?.offerNumber || id}“?`,
      confirmLabel: 'Да, избриши',
      variant: 'danger',
      onConfirm: () => {
        deleteOfferMutation.mutate(id, {
          onSuccess: () => {
            toast.info('Понудата е избришана');
          },
        });
        setConfirmState(null);
      },
    });
  };

  const handleSetStatus = (id: string, st: any) => {
    const offer = offers.find((o) => o.id === id);
    if (!offer || offer.status === st) return;
    const statusLabel = statusOptions.find((opt) => opt.value === st)?.label || st;
    setConfirmState({
      isOpen: true,
      title: 'Промена на статус на понуда',
      message: `Дали сте сигурни дека сакате да го промените статусот на понудата „${offer.offerNumber}“ во „${statusLabel}“?${
        st === 'ACCEPTED' ? ' (Ќе се креира оперативен проект доколку веќе не постои)' : ''
      }`,
      confirmLabel: 'Да, промени статус',
      variant: st === 'ACCEPTED' ? 'success' : st === 'REJECTED' ? 'danger' : 'warning',
      onConfirm: () => {
        imfexStore.setOfferStatus(id, st);
        refreshList();
        toast.success('Статусот е ажуриран!', `Понудата ${offer?.offerNumber || ''} е поставена во ${statusLabel}.`);
        setConfirmState(null);
      },
    });
  };

  const handleCreateProforma = (offer: Offer) => {
    const pro = imfexStore.createSalesInvoiceFromOfferOrProject({
      invoiceType: 'PROFORMA',
      offerId: offer.id,
      customerId: offer.customerId,
    });
    setPreviewInvoice(pro);
    toast.success('Креирана Про-фактура!', pro.invoiceNumber);
  };

  const filtered = offers.filter((o) => {
    const term = search.toLowerCase().trim();
    const matchesSearch =
      !term ||
      o.offerNumber.toLowerCase().includes(term) ||
      (o.customer?.companyName || o.customer?.name || '').toLowerCase().includes(term) ||
      (o.customer?.taxId || '').toLowerCase().includes(term) ||
      (o.customer?.city || '').toLowerCase().includes(term) ||
      (o.items || []).some(
        (it) =>
          (it.customTitle || '').toLowerCase().includes(term) ||
          (it.productId || '').toLowerCase().includes(term)
      );

    const matchesStatus = statusFilter === 'ALL' || o.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  if (!imfexStore.isLoadedFromBackend) {
    return <PageLoadingSkeleton cards={0} rows={6} />;
  }

  return (
    <div className="space-y-6 pb-10">
      <PageHeader
        title={t('offers.title')}
        subtitle={t('offers.subtitle')}
        icon={<FileSpreadsheet className="w-5 h-5" />}
        actions={
          <Link
            href="/offers/new"
            className="h-9 px-3.5 text-xs font-semibold rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors inline-flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>{t('offers.create_offer')}</span>
          </Link>
        }
      />

      <FilterBar
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder={t('offers.search_placeholder')}
      >
        {['ALL', 'DRAFT', 'SENT', 'ACCEPTED', 'REJECTED', 'EXPIRED'].map((st) => (
          <button
            key={st}
            type="button"
            onClick={() => setStatusFilter(st)}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors cursor-pointer ${
              statusFilter === st
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
            }`}
          >
            {getOfferStatusLabel(st, locale)}
          </button>
        ))}
      </FilterBar>

      {/* Offers Table Surface */}
      <div className="surface-card rounded-xl overflow-hidden">
        {filtered.length === 0 ? (
          <EmptyState
            icon={<FileSpreadsheet className="w-5 h-5" />}
            title="Нема пронајдено понуди"
            description="Кликнете „Креирај Нова Понуда“ за да креирате нова понуда."
          />
        ) : (
          <>
            {/* Mobile & Tablet Cards (prevents table crowding below 1024px) */}
            <div className="divide-y divide-border lg:hidden text-xs">
              {filtered.map((offer) => (
                <div key={offer.id} className="p-4 space-y-3">
                  <div className="flex justify-between items-start gap-2">
                    <div>
                      <Link
                        href={`/offers/${offer.id}`}
                        className="font-mono font-semibold text-primary hover:underline"
                      >
                        {offer.offerNumber}
                      </Link>
                      <p className="text-[11px] text-muted-foreground">{formatDate(offer.createdAt)}</p>
                    </div>
                    <div className="w-32 shrink-0">
                      <SearchableSelect
                        options={statusOptions}
                        value={offer.status}
                        onChange={(val) => handleSetStatus(offer.id, val)}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-medium border outline-none cursor-pointer ${offerStatusSelectStyle(
                          offer.status
                        )}`}
                      />
                    </div>
                  </div>

                  <div>
                    <p className="font-medium text-foreground">
                      {offer.customer?.companyName || offer.customer?.name || t('offers.customer')}
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      {(offer.items || []).length} {t('offers.items').toLowerCase()} • ДДВ {Number(offer.taxRate ?? 18)}%
                    </p>
                  </div>

                  <div className="flex justify-between items-center pt-2.5 border-t border-border/60">
                    <span className="font-semibold text-sm text-foreground tabular-nums">
                      {formatCurrency(offer.totalAmount)}
                    </span>

                    <div className="flex items-center gap-1">
                      {(offer.status === 'SENT' || offer.status === 'ACCEPTED') && (
                        <button
                          type="button"
                          onClick={() => setAdvanceOffer(offer)}
                          className="p-1.5 rounded-lg border border-border bg-background hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer"
                          title="Евидентирај аванс"
                        >
                          <Euro className="w-3.5 h-3.5" />
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => setSelectedOfferForPdf(offer)}
                        className="px-2 py-1 rounded-lg border border-border bg-background hover:bg-muted text-foreground font-medium inline-flex items-center gap-1 text-[11px] cursor-pointer"
                        title={t('offers.pdf_preview')}
                      >
                        <FileText className="w-3.5 h-3.5 text-muted-foreground" /> PDF
                      </button>
                      <Link
                        href={`/offers/${offer.id}`}
                        className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg"
                        title="Уреди понуда"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </Link>
                      <button
                        type="button"
                        onClick={() => handleDelete(offer.id)}
                        className="p-1.5 text-muted-foreground hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-500/10 rounded-lg cursor-pointer"
                        title="Избриши понуда"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop Table — Compact, Zero Horizontal Overflow */}
            <div className="hidden lg:block overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-muted/40 border-b border-border text-[11px] font-medium text-muted-foreground">
                  <tr>
                    <th className="px-2.5 xl:px-3.5 py-3 whitespace-nowrap">{t('offers.offer_number')}</th>
                    <th className="px-2 xl:px-2.5 py-3">{t('offers.customer')}</th>
                    <th className="px-2 xl:px-2.5 py-3 whitespace-nowrap">{t('offers.status')}</th>
                    <th className="hidden xl:table-cell px-2.5 py-3 whitespace-nowrap">ДДВ / Попуст</th>
                    <th className="px-2 xl:px-2.5 py-3 text-right whitespace-nowrap">{t('offers.total')}</th>
                    <th className="px-2.5 xl:px-3.5 py-3 text-right whitespace-nowrap">{t('offers.action')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/70">
                  {filtered.map((offer) => (
                    <tr key={offer.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-2.5 xl:px-3.5 py-3 whitespace-nowrap">
                        <Link
                          href={`/offers/${offer.id}`}
                          className="font-mono font-semibold text-primary hover:underline block"
                        >
                          {offer.offerNumber}
                        </Link>
                        <span className="text-[11px] text-muted-foreground">
                          {formatDate(offer.createdAt)} • {(offer.items || []).length} {t('offers.items').toLowerCase()}
                        </span>
                      </td>

                      <td className="px-2 xl:px-2.5 py-3 max-w-[140px] xl:max-w-[180px]">
                        <p className="font-medium text-foreground truncate">
                          {offer.customer?.companyName || offer.customer?.name || t('offers.customer')}
                        </p>
                        {offer.customer?.email && (
                          <p className="text-[11px] text-muted-foreground truncate">
                            {offer.customer.email}
                          </p>
                        )}
                      </td>

                      <td className="px-2 xl:px-2.5 py-3 whitespace-nowrap">
                        <div className="w-24 xl:w-28">
                          <SearchableSelect
                            options={statusOptions}
                            value={offer.status}
                            onChange={(val) => handleSetStatus(offer.id, val)}
                            className={`px-2 py-1 rounded-lg text-[11px] font-medium border outline-none cursor-pointer ${offerStatusSelectStyle(
                              offer.status
                            )}`}
                          />
                        </div>
                      </td>

                      <td className="hidden xl:table-cell px-2.5 py-3 text-muted-foreground whitespace-nowrap tabular-nums">
                        {Number(offer.discountRate || 0) > 0 && (
                          <span className="block text-[11px] text-emerald-700 dark:text-emerald-400 font-medium">
                            -{Number(offer.discountRate)}% ({formatCurrency(offer.discountAmount)})
                          </span>
                        )}
                        <span className="text-[11px]">
                          ДДВ {Number(offer.taxRate ?? 18)}%: {formatCurrency(offer.taxAmount)}
                        </span>
                      </td>

                      <td className="px-2 xl:px-2.5 py-3 text-right font-semibold text-sm text-foreground tabular-nums whitespace-nowrap">
                        <span className="block">{formatCurrency(offer.totalAmount)}</span>
                        <span className="block xl:hidden text-[10px] font-normal text-muted-foreground">
                          ДДВ {Number(offer.taxRate ?? 18)}%
                          {Number(offer.discountRate || 0) > 0 ? ` • -${Number(offer.discountRate)}%` : ''}
                        </span>
                      </td>

                      <td className="px-2.5 xl:px-3.5 py-3 text-right whitespace-nowrap">
                        <div className="inline-flex items-center justify-end gap-1">
                          {(offer.status === 'SENT' || offer.status === 'ACCEPTED') && (
                            <>
                              <button
                                type="button"
                                onClick={() => setAdvanceOffer(offer)}
                                className="h-7 px-1.5 xl:px-2 rounded-md border border-border bg-background hover:bg-muted text-foreground font-medium inline-flex items-center gap-1 text-[11px] cursor-pointer transition-colors"
                                title="Евидентирај уплата на аванс"
                                aria-label="Евидентирај уплата на аванс"
                              >
                                <Euro className="w-3 h-3 text-muted-foreground" />
                                <span className="hidden xl:inline">Аванс</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => handleCreateProforma(offer)}
                                className="h-7 w-7 rounded-md border border-border bg-background hover:bg-muted text-muted-foreground hover:text-foreground inline-flex items-center justify-center cursor-pointer transition-colors"
                                title="Генерирај Про-фактура"
                                aria-label="Генерирај Про-фактура"
                              >
                                <Receipt className="w-3.5 h-3.5" />
                              </button>
                            </>
                          )}

                          {offer.status === 'ACCEPTED' && (() => {
                            const linkedProject = projects.find((p) => p.offerId === offer.id);
                            return (
                              <Link
                                href={linkedProject ? `/projects/${linkedProject.id}` : '/projects'}
                                className="h-7 w-7 rounded-md border border-border bg-background hover:bg-muted text-primary inline-flex items-center justify-center transition-colors"
                                title={
                                  linkedProject
                                    ? `Отвори Оперативен Проект (${linkedProject.projectNumber})`
                                    : 'Отвори Оперативен Проект'
                                }
                                aria-label="Отвори Оперативен Проект"
                              >
                                <Briefcase className="w-3.5 h-3.5" />
                              </Link>
                            );
                          })()}

                          <button
                            type="button"
                            onClick={() => setSelectedOfferForPdf(offer)}
                            className="h-7 px-2 rounded-md border border-border bg-background hover:bg-muted text-foreground font-medium inline-flex items-center gap-1 text-[11px] cursor-pointer transition-colors"
                            title={t('offers.pdf_preview')}
                          >
                            <FileText className="w-3 h-3 text-primary" />
                            <span>PDF</span>
                          </button>

                          <Link
                            href={`/offers/${offer.id}`}
                            className="h-7 w-7 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted inline-flex items-center justify-center transition-colors"
                            title="Уреди понуда"
                            aria-label="Уреди понуда"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </Link>

                          <button
                            type="button"
                            onClick={() => handleDelete(offer.id)}
                            className="h-7 w-7 rounded-md text-muted-foreground hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-500/10 inline-flex items-center justify-center cursor-pointer transition-colors"
                            title="Избриши понуда"
                            aria-label="Избриши понуда"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
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

      {/* Advance Payment Modal */}
      <AdvancePaymentModal
        isOpen={Boolean(advanceOffer)}
        onClose={() => setAdvanceOffer(null)}
        offer={advanceOffer}
        onSuccess={({ advanceInvoice }) => {
          refreshList();
          if (advanceInvoice) {
            setPreviewInvoice(advanceInvoice);
          }
        }}
      />

      {/* Official Finance Invoice PDF Modal */}
      <FinancePdfModal
        isOpen={Boolean(previewInvoice)}
        onClose={() => setPreviewInvoice(null)}
        invoice={previewInvoice}
      />

      {/* Confirmation Modal */}
      <ConfirmModal
        isOpen={Boolean(confirmState?.isOpen)}
        title={confirmState?.title || ''}
        message={confirmState?.message || ''}
        confirmLabel={confirmState?.confirmLabel}
        variant={confirmState?.variant || 'warning'}
        onConfirm={() => confirmState?.onConfirm()}
        onCancel={() => setConfirmState(null)}
      />
    </div>
  );
}
