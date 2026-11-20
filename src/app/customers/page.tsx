'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useI18n } from '@/lib/i18n-context';
import { Customer, Offer } from '@/types';
import { imfexStore, useImfexStore } from '@/lib/store';
import { formatDate } from '@/lib/date-format';
import { CustomerModal } from '@/components/customer-form/customer-modal';
import { PdfModal } from '@/components/pdf/pdf-modal';
import {
  Users,
  Building2,
  User,
  Plus,
  Search,
  Mail,
  Phone,
  Trash2,
  Edit3,
  FolderOpen,
  Wrench,
  PackageCheck,
  Download,
  FileText,
  FileSpreadsheet,
  Image as ImageIcon,
  File,
} from 'lucide-react';

import { toast } from '@/components/ui/toastr';
import { ConfirmModal } from '@/components/ui/confirm-modal';
import { PageLoadingSkeleton } from '@/components/ui/loading-skeleton';
import { useEscapeKey } from '@/components/ui/use-escape-key';

export default function CustomersPage() {
  const { t } = useI18n();
  const storeVersion = useImfexStore(); // Auto-subscribe to live store updates

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<string>('ALL');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [customerToDelete, setCustomerToDelete] = useState<Customer | null>(null);
  const [previewOffer, setPreviewOffer] = useState<Offer | null>(null);

  const [activeCustomerDetail, setActiveCustomerDetail] = useState<Customer | null>(null);
  const [detailTab, setDetailTab] = useState<'DETAILS' | 'DOCS' | 'EQUIPMENT' | 'SERVICE'>('DOCS');

  useEscapeKey(Boolean(activeCustomerDetail) && !previewOffer, () => setActiveCustomerDetail(null));

  const refreshList = () => {
    setCustomers(imfexStore.getCustomers());
  };

  useEffect(() => {
    refreshList();
  }, [storeVersion]);

  const handleDelete = (id: string) => {
    const found = customers.find((c) => c.id === id);
    if (found) setCustomerToDelete(found);
  };

  const filtered = customers.filter((c) => {
    const term = search.toLowerCase().trim();
    const matchesSearch =
      !term ||
      (c.name || '').toLowerCase().includes(term) ||
      (c.companyName || '').toLowerCase().includes(term) ||
      (c.taxId || '').toLowerCase().includes(term) ||
      (c.phone || '').toLowerCase().includes(term) ||
      (c.city || '').toLowerCase().includes(term) ||
      (c.address || '').toLowerCase().includes(term) ||
      (c.email || '').toLowerCase().includes(term);

    const matchesType = filterType === 'ALL' || c.customerType === filterType;
    return matchesSearch && matchesType;
  });

  const docsForActiveCust = activeCustomerDetail
    ? imfexStore.getDocumentsByCustomer(activeCustomerDetail.id)
    : [];

  const equipmentForActiveCust = activeCustomerDetail
    ? imfexStore.getInstalledItemsByCustomer(activeCustomerDetail.id)
    : [];

  const serviceForActiveCust = activeCustomerDetail
    ? imfexStore.getServiceTickets().filter((st) => st.customerId === activeCustomerDetail.id)
    : [];

  if (!imfexStore.isLoadedFromBackend) {
    return <PageLoadingSkeleton cards={0} rows={6} />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-card p-6 rounded-xl border border-border">
        <div>
          <h1 className="font-extrabold text-xl tracking-tight flex items-center gap-2">
            <Users className="w-5 h-5 text-primary" />
            <span>{t('customers.title')}</span>
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            {t('customers.subtitle')}
          </p>
        </div>

        <button
          onClick={() => {
            setEditingCustomer(null);
            setIsModalOpen(true);
          }}
          className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-all shadow-md shrink-0 cursor-pointer"
        >
          <Plus className="w-4 h-4" /> {t('customers.add_customer')}
        </button>
      </div>

      {/* Search & Filter Toolbar */}
      <div className="flex flex-wrap gap-3 items-center justify-between bg-card p-4 rounded-xl border border-border">
        <div className="relative flex-1 min-w-[220px] max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-muted-foreground" />
          <input
            type="text"
            placeholder={t('customers.search_placeholder')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-border bg-background outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-bold text-muted-foreground uppercase">{t('customers.customer_type')}:</span>
          {['ALL', 'COMPANY', 'PARTNER', 'INDIVIDUAL', 'OTHER'].map((type) => (
            <button
              key={type}
              onClick={() => setFilterType(type)}
              className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                filterType === type
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'bg-muted text-muted-foreground hover:text-foreground'
              }`}
            >
              {type === 'COMPANY' ? t('customers.company') : type === 'INDIVIDUAL' ? t('customers.individual') : type === 'PARTNER' ? t('customers.partner') : type}
            </button>
          ))}
        </div>
      </div>

      {/* Customer Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((customer) => {
            const isSelected = activeCustomerDetail?.id === customer.id;

            return (
              <div
                key={customer.id}
                onClick={() => setActiveCustomerDetail(customer)}
                className={`bg-card border rounded-xl p-5 shadow-sm space-y-4 cursor-pointer transition-all flex flex-col justify-between min-w-0 overflow-hidden ${
                  isSelected ? 'border-primary ring-2 ring-primary/20 shadow-md' : 'border-border hover:border-primary/50'
                }`}
              >
                <div className="space-y-3 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="p-2 bg-primary/10 text-primary rounded-lg shrink-0">
                        {customer.customerType === 'INDIVIDUAL' ? (
                          <User className="w-5 h-5" />
                        ) : (
                          <Building2 className="w-5 h-5" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <span className="text-[9px] font-extrabold uppercase bg-primary/10 text-primary px-2 py-0.5 rounded">
                          {customer.customerType}
                        </span>
                        <h3 className="font-bold text-sm leading-tight text-foreground mt-1 truncate">
                          {customer.companyName || customer.name}
                        </h3>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                      <Link
                        href={`/offers/new?customerId=${customer.id}`}
                        className="p-1.5 text-emerald-600 hover:bg-emerald-500/10 rounded-lg"
                        title="Create Offer for Customer"
                        aria-label="Креирај понуда за клиент"
                      >
                        <FileText className="w-4 h-4" />
                      </Link>
                      <button
                        type="button"
                        onClick={() => {
                          setEditingCustomer(customer);
                          setIsModalOpen(true);
                        }}
                        className="p-1.5 text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted cursor-pointer"
                        title="Edit Customer"
                        aria-label="Уреди клиент"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(customer.id)}
                        className="p-1.5 text-red-500 hover:bg-red-500/10 rounded-lg cursor-pointer"
                        title="Delete Customer"
                        aria-label="Избриши клиент"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {customer.customerType !== 'INDIVIDUAL' && customer.name && (
                    <p className="text-xs font-medium text-muted-foreground">
                      {t('customers.full_name')}: <span className="text-foreground">{customer.name}</span>
                    </p>
                  )}

                  <div className="space-y-1.5 text-xs text-muted-foreground pt-2 border-t border-border">
                    {customer.email && (
                      <p className="flex items-center gap-2">
                        <Mail className="w-3.5 h-3.5 text-primary" /> {customer.email}
                      </p>
                    )}
                    {customer.phone && (
                      <p className="flex items-center gap-2">
                        <Phone className="w-3.5 h-3.5 text-primary" /> {customer.phone}
                      </p>
                    )}
                  </div>
                </div>

                <div className="pt-2 border-t border-border flex items-center justify-between text-[11px] font-bold">
                  <span className="text-primary">{t('customers.view_history')} →</span>
                  <Link
                    href={`/offers/new?customerId=${customer.id}`}
                    onClick={(e) => e.stopPropagation()}
                    className="text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1"
                  >
                    + {t('offers.create_offer') || 'Create Offer'}
                  </Link>
                </div>
              </div>
            );
          })}
        </div>

        {/* Client Documentation & History Slide-Over Drawer */}
        {activeCustomerDetail && (
          <div
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex justify-end"
            onClick={() => setActiveCustomerDetail(null)}
            role="dialog"
            aria-modal="true"
            aria-label={`Документација и историја за ${activeCustomerDetail.companyName || activeCustomerDetail.name}`}
          >
            <div
              className="w-full max-w-2xl h-full bg-card border-l border-border p-6 shadow-2xl space-y-6 overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
            <div className="flex items-start justify-between gap-3 border-b border-border pb-4">
              <div className="min-w-0">
                <span className="text-[10px] font-extrabold uppercase text-primary bg-primary/10 px-2 py-0.5 rounded">
                  {t('customers.documentation')}
                </span>
                <h2 className="text-lg font-black text-foreground mt-1 truncate">
                  {activeCustomerDetail.companyName || activeCustomerDetail.name}
                </h2>
                <p className="text-xs text-muted-foreground">
                  {[
                    activeCustomerDetail.email,
                    activeCustomerDetail.phone,
                    [activeCustomerDetail.address, activeCustomerDetail.city].filter(Boolean).join(', '),
                  ]
                    .filter(Boolean)
                    .join(' • ') || '—'}
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <Link
                  href={`/offers/new?customerId=${activeCustomerDetail.id}`}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-all shadow-sm"
                >
                  <FileText className="w-4 h-4" /> {t('offers.create_offer') || 'Create Offer'}
                </Link>

                <button
                  type="button"
                  onClick={() => setActiveCustomerDetail(null)}
                  aria-label="Затвори"
                  className="text-xs text-muted-foreground hover:text-foreground font-bold border border-border px-2.5 py-1.5 rounded-xl hover:bg-muted cursor-pointer"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Sub-tabs */}
            <div className="flex items-center gap-2 border-b border-border pb-2 flex-wrap">
              <button
                onClick={() => setDetailTab('DOCS')}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                  detailTab === 'DOCS' ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:bg-muted'
                }`}
              >
                <FolderOpen className="w-4 h-4" /> {t('customers.documentation')} ({docsForActiveCust.length})
              </button>
              <button
                onClick={() => setDetailTab('EQUIPMENT')}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                  detailTab === 'EQUIPMENT' ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:bg-muted'
                }`}
              >
                <PackageCheck className="w-4 h-4" /> {t('customers.installed_equipment')} ({equipmentForActiveCust.length})
              </button>
              <button
                onClick={() => setDetailTab('SERVICE')}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                  detailTab === 'SERVICE' ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:bg-muted'
                }`}
              >
                <Wrench className="w-4 h-4" /> {t('customers.service_history')} ({serviceForActiveCust.length})
              </button>
            </div>

            {/* Tab 1: Client Documentation */}
            {detailTab === 'DOCS' && (
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-muted-foreground uppercase">{t('customers.documentation')}</h4>
                {docsForActiveCust.length === 0 ? (
                  <div className="p-8 text-center border border-dashed border-border rounded-xl text-xs text-muted-foreground">
                    {t('customers.no_docs')}
                  </div>
                ) : (
                  <div className="space-y-2">
                    {docsForActiveCust.map((doc) => {
                      const isLegacyFakeOfferUrl = Boolean(doc.fileUrl && doc.fileUrl.startsWith('/docs/'));
                      const linkedOffer = doc.offerId
                        ? imfexStore.getOfferById(doc.offerId)
                        : isLegacyFakeOfferUrl
                        ? imfexStore
                            .getOffers()
                            .find((o) => doc.fileUrl.includes(o.offerNumber) || doc.title.includes(o.offerNumber))
                        : undefined;
                      const hasRealUrl =
                        Boolean(doc.fileUrl) &&
                        doc.fileUrl !== '#' &&
                        !isLegacyFakeOfferUrl &&
                        (doc.fileUrl.startsWith('data:') ||
                          doc.fileUrl.startsWith('http://') ||
                          doc.fileUrl.startsWith('https://') ||
                          doc.fileUrl.startsWith('blob:'));
                      const upperType = (doc.fileType || 'PDF').toUpperCase();

                      return (
                        <div
                          key={doc.id}
                          className="p-3 bg-muted/30 border border-border rounded-xl flex items-center justify-between gap-3 text-xs"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            {upperType === 'IMAGE' && hasRealUrl ? (
                              <img
                                src={doc.fileUrl}
                                alt={doc.title}
                                className="w-9 h-9 rounded-lg object-cover border border-border shrink-0"
                              />
                            ) : upperType === 'EXCEL' ? (
                              <FileSpreadsheet className="w-5 h-5 text-emerald-500 shrink-0" />
                            ) : upperType === 'WORD' ? (
                              <FileText className="w-5 h-5 text-indigo-500 shrink-0" />
                            ) : upperType === 'IMAGE' ? (
                              <ImageIcon className="w-5 h-5 text-sky-500 shrink-0" />
                            ) : upperType === 'OTHER' ? (
                              <File className="w-5 h-5 text-amber-500 shrink-0" />
                            ) : (
                              <FileText className="w-5 h-5 text-red-500 shrink-0" />
                            )}
                            <div className="min-w-0">
                              <p className="font-bold text-foreground truncate" title={doc.title}>
                                {doc.title}
                              </p>
                              <p className="text-[10px] text-muted-foreground">
                                {formatDate(doc.createdAt)} • {doc.fileType}
                                {doc.sizeBytes
                                  ? ` • ${
                                      doc.sizeBytes < 1024 * 1024
                                        ? `${(doc.sizeBytes / 1024).toFixed(1)} KB`
                                        : `${(doc.sizeBytes / (1024 * 1024)).toFixed(2)} MB`
                                    }`
                                  : ''}
                              </p>
                            </div>
                          </div>

                          {linkedOffer ? (
                            <button
                              type="button"
                              onClick={() => setPreviewOffer(linkedOffer)}
                              className="flex items-center gap-1 px-3 py-1.5 text-[11px] font-bold rounded-lg bg-primary/10 text-primary hover:bg-primary/20 shrink-0 cursor-pointer"
                            >
                              <Download className="w-3.5 h-3.5" /> {t('customers.download_pdf')}
                            </button>
                          ) : hasRealUrl ? (
                            <a
                              href={doc.fileUrl}
                              download={doc.fileName || doc.title}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-1 px-3 py-1.5 text-[11px] font-bold rounded-lg bg-primary/10 text-primary hover:bg-primary/20 shrink-0"
                            >
                              <Download className="w-3.5 h-3.5" /> {t('customers.download_pdf')}
                            </a>
                          ) : (
                            <button
                              type="button"
                              onClick={() => toast.info(`Документ: ${doc.title}`, 'Овој запис нема прикачен фајл за преземање.')}
                              className="flex items-center gap-1 px-3 py-1.5 text-[11px] font-bold rounded-lg bg-primary/10 text-primary hover:bg-primary/20 shrink-0 cursor-pointer"
                            >
                              <Download className="w-3.5 h-3.5" /> {t('customers.download_pdf')}
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Tab 2: Installed Equipment Ledger */}
            {detailTab === 'EQUIPMENT' && (
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-muted-foreground uppercase">{t('customers.installed_equipment')}</h4>
                {equipmentForActiveCust.length === 0 ? (
                  <div className="p-8 text-center border border-dashed border-border rounded-xl text-xs text-muted-foreground">
                    {t('customers.no_equipment')}
                  </div>
                ) : (
                  <div className="space-y-2">
                    {equipmentForActiveCust.map((item) => (
                      <div key={item.id} className="p-4 bg-card border border-border rounded-xl space-y-1 text-xs">
                        <div className="flex items-center justify-between font-extrabold text-foreground">
                          <span>{item.title}</span>
                          <span className="font-mono text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded">
                            {item.serialNumber || 'SN-N/A'}
                          </span>
                        </div>
                        <p className="text-[11px] text-muted-foreground">
                          Монтирано: {formatDate(item.installationDate)}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Tab 3: Service History */}
            {detailTab === 'SERVICE' && (
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-muted-foreground uppercase">{t('customers.service_history')}</h4>
                {serviceForActiveCust.length === 0 ? (
                  <div className="p-8 text-center border border-dashed border-border rounded-xl text-xs text-muted-foreground">
                    {t('customers.no_service')}
                  </div>
                ) : (
                  <div className="space-y-2">
                    {serviceForActiveCust.map((st) => (
                      <div key={st.id} className="p-4 bg-card border border-border rounded-xl space-y-2 text-xs">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-primary">{st.ticketNumber}</span>
                          <span className="font-extrabold text-[10px] bg-blue-500/10 text-blue-500 px-2 py-0.5 rounded uppercase">
                            {st.status}
                          </span>
                        </div>
                        <p className="font-semibold text-foreground">{st.defectDescription}</p>
                        <p className="text-[11px] text-muted-foreground">
                          {st.solution || 'Во тек...'}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
            </div>
          </div>
        )}

      {/* Customer Modal */}
      <CustomerModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        customerToEdit={editingCustomer}
        onSaveSuccess={refreshList}
      />

      {/* Offer PDF Preview Modal */}
      {previewOffer && (
        <PdfModal
          isOpen={Boolean(previewOffer)}
          onClose={() => setPreviewOffer(null)}
          offer={previewOffer}
          products={imfexStore.getProducts()}
        />
      )}

      {/* Delete Customer Confirm Modal */}
      <ConfirmModal
        isOpen={Boolean(customerToDelete)}
        title="Избриши Клиент / Партнер"
        message={`Дали сте сигурни дека сакате да го избришете клиентот „${customerToDelete?.companyName || customerToDelete?.name || ''}“?`}
        confirmLabel="Да, избриши"
        variant="danger"
        onConfirm={() => {
          if (customerToDelete) {
            imfexStore.deleteCustomer(customerToDelete.id);
            if (activeCustomerDetail?.id === customerToDelete.id) setActiveCustomerDetail(null);
            refreshList();
            toast.info('Клиентот е избришан');
          }
          setCustomerToDelete(null);
        }}
        onCancel={() => setCustomerToDelete(null)}
      />
    </div>
  );
}
