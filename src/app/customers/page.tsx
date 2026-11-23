'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useI18n } from '@/lib/i18n-context';
import { Customer, Offer } from '@/types';
import { imfexStore, useImfexStore } from '@/lib/store';
import {
  canDeleteRecords,
  canViewFinance,
  canViewOffers,
  canWriteCustomers,
  canWriteOffers,
} from '@/lib/rbac';
import { useCustomersQuery, useDeleteCustomerMutation } from '@/lib/queries';
import { formatDate } from '@/lib/date-format';
import { formatCurrency } from '@/lib/formatters';
import { computeCustomerFinancialProfile } from '@/lib/selectors';
import {
  getCustomerTypeLabel,
  getOfferStatusLabel,
  getProjectStatusLabel,
  getServiceStatusLabel,
} from '@/lib/enum-labels';
import { CustomerModal } from '@/components/customer-form/customer-modal';
import { PdfModal } from '@/components/pdf/pdf-modal';
import {
  Users,
  Building2,
  User,
  Plus,
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
  ChevronRight,
  X,
  Briefcase,
  Receipt,
} from 'lucide-react';
import { toast } from '@/components/ui/toastr';
import { ConfirmModal } from '@/components/ui/confirm-modal';
import { PageLoadingSkeleton } from '@/components/ui/loading-skeleton';
import { useEscapeKey } from '@/components/ui/use-escape-key';
import {
  PageHeader,
  FilterBar,
  StatusBadge,
  TabBar,
  EmptyState,
  BadgeVariant,
} from '@/components/ui/page-primitives';

function customerTypeVariant(type: string): BadgeVariant {
  if (type === 'COMPANY') return 'primary';
  if (type === 'PARTNER') return 'purple';
  if (type === 'INDIVIDUAL') return 'success';
  return 'neutral';
}

export default function CustomersPage() {
  const { t, locale } = useI18n();
  useImfexStore();
  const customersQuery = useCustomersQuery();
  const deleteCustomerMutation = useDeleteCustomerMutation();

  const customers = customersQuery.data ?? imfexStore.getCustomers();
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<string>('ALL');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [customerToDelete, setCustomerToDelete] = useState<Customer | null>(null);
  const [previewOffer, setPreviewOffer] = useState<Offer | null>(null);

  const currentRole = imfexStore.getCurrentRole();
  const allowCustomerWrite = canWriteCustomers(currentRole);
  const allowOfferWrite = canWriteOffers(currentRole);
  const showOffers = canViewOffers(currentRole);
  const showFinance = canViewFinance(currentRole);
  const allowDelete = canDeleteRecords(currentRole);

  const [activeCustomerDetail, setActiveCustomerDetail] = useState<Customer | null>(null);
  const [detailTab, setDetailTab] = useState<'OFFERS' | 'PROJECTS' | 'INVOICES' | 'DOCS' | 'EQUIPMENT' | 'SERVICE'>(
    showOffers ? 'OFFERS' : 'PROJECTS'
  );

  useEscapeKey(Boolean(activeCustomerDetail) && !previewOffer, () => setActiveCustomerDetail(null));

  const refreshList = () => {
    void customersQuery.refetch();
  };

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

  const offersForActiveCust =
    activeCustomerDetail && showOffers
      ? imfexStore.getOffers().filter((o) => o.customerId === activeCustomerDetail.id)
      : [];

  const projectsForActiveCust = activeCustomerDetail
    ? imfexStore.getProjects().filter((p) => p.customerId === activeCustomerDetail.id)
    : [];

  const invoicesForActiveCust =
    activeCustomerDetail && showFinance
      ? imfexStore.getSalesInvoices().filter((s) => s.customerId === activeCustomerDetail.id)
      : [];

  const activeCustFinance =
    activeCustomerDetail && showFinance
      ? computeCustomerFinancialProfile({
          customer: activeCustomerDetail,
          offers: imfexStore.getOffers(),
          salesInvoices: imfexStore.getSalesInvoices(),
          payments: imfexStore.getPayments(),
        })
      : null;

  if (!imfexStore.isLoadedFromBackend) {
    return <PageLoadingSkeleton cards={0} rows={6} />;
  }

  const filterTypes = ['ALL', 'COMPANY', 'PARTNER', 'INDIVIDUAL', 'OTHER'];

  return (
    <div className="space-y-6 pb-10">
      <PageHeader
        title={t('customers.title')}
        subtitle={t('customers.subtitle')}
        icon={<Users className="w-5 h-5" />}
        actions={
          allowCustomerWrite ? (
            <button
              type="button"
              onClick={() => {
                setEditingCustomer(null);
                setIsModalOpen(true);
              }}
              className="h-9 px-3.5 text-xs font-semibold rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors inline-flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>{t('customers.add_customer')}</span>
            </button>
          ) : undefined
        }
      />

      <FilterBar
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder={t('customers.search_placeholder')}
      >
        {filterTypes.map((type) => {
          const isActive = filterType === type;
          const label =
            type === 'ALL'
              ? locale === 'mk'
                ? 'Сите'
                : 'All'
              : getCustomerTypeLabel(type, locale);
          return (
            <button
              key={type}
              type="button"
              onClick={() => setFilterType(type)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors cursor-pointer ${
                isActive
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              }`}
            >
              {label}
            </button>
          );
        })}
      </FilterBar>

      {/* Customer Cards Grid */}
      {filtered.length === 0 ? (
        <div className="surface-card rounded-xl">
          <EmptyState
            icon={<Users className="w-5 h-5" />}
            title={locale === 'mk' ? 'Нема пронајдено клиенти' : 'No customers found'}
            description={t('customers.subtitle')}
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((customer) => {
            const isSelected = activeCustomerDetail?.id === customer.id;
            const displayTitle = customer.companyName || customer.name;
            const showDistinctContact =
              customer.customerType !== 'INDIVIDUAL' &&
              customer.name &&
              customer.name.trim().toLowerCase() !== (customer.companyName || '').trim().toLowerCase();

            return (
              <div
                key={customer.id}
                onClick={() => setActiveCustomerDetail(customer)}
                className={`surface-card rounded-xl p-5 cursor-pointer transition-colors flex flex-col justify-between gap-4 min-w-0 ${
                  isSelected
                    ? 'border-primary ring-1 ring-primary/30'
                    : 'hover:border-primary/40'
                }`}
              >
                <div className="space-y-3 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-3 min-w-0">
                      <div className="p-2 rounded-lg bg-muted text-muted-foreground shrink-0 mt-0.5">
                        {customer.customerType === 'INDIVIDUAL' ? (
                          <User className="w-4 h-4" />
                        ) : (
                          <Building2 className="w-4 h-4" />
                        )}
                      </div>
                      <div className="min-w-0 space-y-1">
                        <h3 className="font-semibold text-sm text-foreground leading-snug truncate">
                          {displayTitle}
                        </h3>
                        <StatusBadge variant={customerTypeVariant(customer.customerType)}>
                          {getCustomerTypeLabel(customer.customerType, locale)}
                        </StatusBadge>
                      </div>
                    </div>

                    <div
                      className="flex items-center gap-0.5 shrink-0"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {allowCustomerWrite && (
                        <button
                          type="button"
                          onClick={() => {
                            setEditingCustomer(customer);
                            setIsModalOpen(true);
                          }}
                          className="p-1.5 text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted cursor-pointer transition-colors"
                          title="Уреди клиент"
                          aria-label="Уреди клиент"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                      )}
                      {allowDelete && (
                        <button
                          type="button"
                          onClick={() => handleDelete(customer.id)}
                          className="p-1.5 text-muted-foreground hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-500/10 rounded-lg cursor-pointer transition-colors"
                          title="Избриши клиент"
                          aria-label="Избриши клиент"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  {showDistinctContact && (
                    <p className="text-xs text-muted-foreground truncate">
                      {customer.name}
                    </p>
                  )}

                  {(customer.email || customer.phone) && (
                    <div className="space-y-1.5 text-xs text-muted-foreground pt-2.5 border-t border-border/60">
                      {customer.email && (
                        <p className="flex items-center gap-2 truncate">
                          <Mail className="w-3.5 h-3.5 text-muted-foreground/70 shrink-0" />
                          <span className="truncate">{customer.email}</span>
                        </p>
                      )}
                      {customer.phone && (
                        <p className="flex items-center gap-2">
                          <Phone className="w-3.5 h-3.5 text-muted-foreground/70 shrink-0" />
                          <span className="tabular-nums">{customer.phone}</span>
                        </p>
                      )}
                    </div>
                  )}
                </div>

                <div className="pt-3 border-t border-border/60 flex items-center justify-between gap-2 text-xs">
                  <span className="font-medium text-muted-foreground inline-flex items-center gap-0.5 group-hover:text-foreground">
                    {t('customers.view_history')}
                    <ChevronRight className="w-3.5 h-3.5" />
                  </span>
                  {allowOfferWrite && (
                    <Link
                      href={`/offers/new?customerId=${customer.id}`}
                      onClick={(e) => e.stopPropagation()}
                      className="font-medium text-primary hover:underline inline-flex items-center gap-1"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>{t('offers.create_offer')}</span>
                    </Link>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Client Documentation & History Slide-Over Drawer */}
      {activeCustomerDetail && (
        <div
          className="fixed inset-0 z-[60] bg-black/55 backdrop-blur-sm flex justify-end"
          onClick={() => setActiveCustomerDetail(null)}
          role="dialog"
          aria-modal="true"
          aria-label={`Документација и историја за ${activeCustomerDetail.companyName || activeCustomerDetail.name}`}
        >
          <div
            className="w-full max-w-2xl h-full bg-card border-l border-border p-6 shadow-xl space-y-5 overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3 pb-4 border-b border-border">
              <div className="min-w-0 space-y-1">
                <StatusBadge variant={customerTypeVariant(activeCustomerDetail.customerType)}>
                  {getCustomerTypeLabel(activeCustomerDetail.customerType, locale)}
                </StatusBadge>
                <h2 className="text-lg font-semibold text-foreground truncate">
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
                {allowOfferWrite && (
                  <Link
                    href={`/offers/new?customerId=${activeCustomerDetail.id}`}
                    className="h-8 px-3 text-xs font-semibold rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 inline-flex items-center gap-1.5 transition-colors"
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>{t('offers.create_offer')}</span>
                  </Link>
                )}
                <button
                  type="button"
                  onClick={() => setActiveCustomerDetail(null)}
                  aria-label="Затвори"
                  className="h-8 w-8 inline-flex items-center justify-center text-muted-foreground hover:text-foreground border border-border rounded-lg hover:bg-muted cursor-pointer transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* BIZ-14: Customer 360 Financial Summary Strip */}
            {activeCustFinance && (
              <div className="grid grid-cols-3 gap-2.5 tabular-nums text-xs">
                <div className="p-3 rounded-lg bg-muted/25 border border-border/80">
                  <span className="text-[10px] text-muted-foreground block">{t('customers.lifetime_value')}</span>
                  <strong className="text-sm font-bold text-foreground">{formatCurrency(activeCustFinance.lifetimeValue)}</strong>
                </div>
                <div
                  className={`p-3 rounded-lg border ${
                    activeCustFinance.overdueBalance > 0
                      ? 'bg-rose-500/[0.07] border-rose-500/30'
                      : 'bg-muted/25 border-border/80'
                  }`}
                >
                  <span className="text-[10px] text-muted-foreground block">{t('customers.open_balance')}</span>
                  <strong
                    className={`text-sm font-bold ${
                      activeCustFinance.overdueBalance > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-foreground'
                    }`}
                  >
                    {formatCurrency(activeCustFinance.openBalance)}
                  </strong>
                </div>
                <div className="p-3 rounded-lg bg-muted/25 border border-border/80">
                  <span className="text-[10px] text-muted-foreground block">{t('customers.credit_limit')}</span>
                  <strong className="text-sm font-bold text-foreground">
                    {activeCustFinance.creditLimit !== null ? formatCurrency(activeCustFinance.creditLimit) : '—'}
                  </strong>
                </div>
              </div>
            )}

            <TabBar
              activeTab={detailTab}
              onChange={(id) =>
                setDetailTab(id as 'OFFERS' | 'PROJECTS' | 'INVOICES' | 'DOCS' | 'EQUIPMENT' | 'SERVICE')
              }
              tabs={[
                ...(showOffers
                  ? [
                      {
                        id: 'OFFERS',
                        label: t('nav.offers'),
                        count: offersForActiveCust.length,
                        icon: <FileText className="w-3.5 h-3.5" />,
                      },
                    ]
                  : []),
                {
                  id: 'PROJECTS',
                  label: t('nav.projects'),
                  count: projectsForActiveCust.length,
                  icon: <Briefcase className="w-3.5 h-3.5" />,
                },
                ...(showFinance
                  ? [
                      {
                        id: 'INVOICES',
                        label: t('customers.tab_invoices'),
                        count: invoicesForActiveCust.length,
                        icon: <Receipt className="w-3.5 h-3.5" />,
                      },
                    ]
                  : []),
                {
                  id: 'DOCS',
                  label: t('customers.documentation'),
                  count: docsForActiveCust.length,
                  icon: <FolderOpen className="w-3.5 h-3.5" />,
                },
                {
                  id: 'EQUIPMENT',
                  label: t('customers.installed_equipment'),
                  count: equipmentForActiveCust.length,
                  icon: <PackageCheck className="w-3.5 h-3.5" />,
                },
                {
                  id: 'SERVICE',
                  label: t('customers.service_history'),
                  count: serviceForActiveCust.length,
                  icon: <Wrench className="w-3.5 h-3.5" />,
                },
              ]}
            />

            {/* Tab: Offers (Customer 360 — BIZ-14) */}
            {showOffers && detailTab === 'OFFERS' && (
              <div className="space-y-2.5">
                {offersForActiveCust.length === 0 ? (
                  <div className="p-8 text-center border border-dashed border-border rounded-xl text-xs text-muted-foreground">
                    {t('customers.no_offers')}
                  </div>
                ) : (
                  offersForActiveCust.map((o) => (
                    <Link
                      key={o.id}
                      href={`/offers/${o.id}`}
                      className="flex items-center justify-between gap-3 p-3.5 bg-muted/25 hover:bg-muted/45 border border-border rounded-xl text-xs transition-colors"
                    >
                      <div className="min-w-0">
                        <span className="font-mono font-semibold text-primary block">{o.offerNumber}</span>
                        <span className="text-[11px] text-muted-foreground">{formatDate(o.createdAt)}</span>
                      </div>
                      <div className="text-right shrink-0 space-y-1">
                        <strong className="block font-semibold tabular-nums">{formatCurrency(o.totalAmount)}</strong>
                        <StatusBadge variant={o.status === 'ACCEPTED' ? 'success' : 'primary'}>
                          {getOfferStatusLabel(o.status, locale)}
                        </StatusBadge>
                      </div>
                    </Link>
                  ))
                )}
              </div>
            )}

            {/* Tab: Projects (Customer 360 — BIZ-14) */}
            {detailTab === 'PROJECTS' && (
              <div className="space-y-2.5">
                {projectsForActiveCust.length === 0 ? (
                  <div className="p-8 text-center border border-dashed border-border rounded-xl text-xs text-muted-foreground">
                    {t('customers.no_projects')}
                  </div>
                ) : (
                  projectsForActiveCust.map((pr) => (
                    <Link
                      key={pr.id}
                      href={`/projects/${pr.id}`}
                      className="flex items-center justify-between gap-3 p-3.5 bg-muted/25 hover:bg-muted/45 border border-border rounded-xl text-xs transition-colors"
                    >
                      <div className="min-w-0">
                        <span className="font-mono font-semibold text-primary block">{pr.projectNumber}</span>
                        <span className="text-[11px] text-muted-foreground truncate block">
                          {pr.installationAddress || formatDate(pr.createdAt)}
                        </span>
                      </div>
                      <StatusBadge variant={pr.status === 'COMPLETED' || pr.status === 'CLOSED' ? 'success' : 'primary'}>
                        {getProjectStatusLabel(pr.status, locale)}
                      </StatusBadge>
                    </Link>
                  ))
                )}
              </div>
            )}

            {/* Tab: Sales Invoices & Balance (Customer 360 — BIZ-14) */}
            {showFinance && detailTab === 'INVOICES' && (
              <div className="space-y-2.5">
                {invoicesForActiveCust.length === 0 ? (
                  <div className="p-8 text-center border border-dashed border-border rounded-xl text-xs text-muted-foreground">
                    {t('customers.no_invoices')}
                  </div>
                ) : (
                  invoicesForActiveCust.map((inv) => {
                    const rem = Math.max(0, Number(inv.totalAmount || 0) - Number(inv.paidAmount || 0));
                    return (
                      <div
                        key={inv.id}
                        className="flex items-center justify-between gap-3 p-3.5 bg-muted/25 border border-border rounded-xl text-xs tabular-nums"
                      >
                        <div className="min-w-0">
                          <span className="font-mono font-semibold text-foreground block">{inv.invoiceNumber}</span>
                          <span className="text-[11px] text-muted-foreground">
                            {formatDate(inv.issueDate)}
                            {inv.dueDate ? ` · ${t('finance.due_short')}: ${formatDate(inv.dueDate)}` : ''}
                          </span>
                        </div>
                        <div className="text-right shrink-0">
                          <strong className="block font-semibold">{formatCurrency(inv.totalAmount)}</strong>
                          <span
                            className={`text-[11px] ${
                              rem > 0 && inv.status !== 'CANCELLED'
                                ? 'text-rose-600 dark:text-rose-400 font-semibold'
                                : 'text-emerald-600 dark:text-emerald-400'
                            }`}
                          >
                            {inv.status === 'CANCELLED'
                              ? t('finance.status_void_upper')
                              : rem > 0
                              ? `${t('projects.fin_debt')}: ${formatCurrency(rem)}`
                              : t('finance.status_paid_upper')}
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            )}

            {/* Tab 1: Client Documentation */}
            {detailTab === 'DOCS' && (
              <div className="space-y-2.5">
                {docsForActiveCust.length === 0 ? (
                  <div className="p-8 text-center border border-dashed border-border rounded-xl text-xs text-muted-foreground">
                    {t('customers.no_docs')}
                  </div>
                ) : (
                  docsForActiveCust.map((doc) => {
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
                    const fileHint = `${doc.fileName || ''} ${doc.title || ''} ${doc.fileUrl || ''}`.toLowerCase();
                    const inferredType =
                      /\.(png|jpe?g|webp|gif)\b|data:image\//.test(fileHint)
                        ? 'IMAGE'
                        : /\.(xlsx?|csv)\b/.test(fileHint)
                        ? 'EXCEL'
                        : /\.(docx?)\b/.test(fileHint)
                        ? 'WORD'
                        : (doc.fileType || 'PDF').toUpperCase();
                    const upperType = inferredType;
                    const downloadLabel =
                      upperType === 'PDF'
                        ? t('customers.download_pdf')
                        : upperType === 'IMAGE'
                        ? locale === 'mk'
                          ? 'Преземи Слика'
                          : 'Download Image'
                        : upperType === 'EXCEL'
                        ? locale === 'mk'
                          ? 'Преземи Excel'
                          : 'Download Excel'
                        : upperType === 'WORD'
                        ? locale === 'mk'
                          ? 'Преземи Word'
                          : 'Download Word'
                        : locale === 'mk'
                        ? 'Преземи Фајл'
                        : 'Download File';

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
                            <FileSpreadsheet className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                          ) : upperType === 'WORD' ? (
                            <FileText className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
                          ) : upperType === 'IMAGE' ? (
                            <ImageIcon className="w-4 h-4 text-sky-600 dark:text-sky-400 shrink-0" />
                          ) : upperType === 'OTHER' ? (
                            <File className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                          ) : (
                            <FileText className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
                          )}
                          <div className="min-w-0">
                            <p className="font-medium text-foreground truncate" title={doc.title}>
                              {doc.title}
                            </p>
                            <p className="text-[11px] text-muted-foreground">
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
                            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-lg border border-border bg-card hover:bg-muted text-foreground shrink-0 cursor-pointer transition-colors"
                          >
                            <Download className="w-3.5 h-3.5 text-primary" /> {t('customers.download_pdf')}
                          </button>
                        ) : hasRealUrl ? (
                          <a
                            href={doc.fileUrl}
                            download={doc.fileName || doc.title}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-lg border border-border bg-card hover:bg-muted text-foreground shrink-0 transition-colors"
                          >
                            <Download className="w-3.5 h-3.5 text-primary" /> {downloadLabel}
                          </a>
                        ) : (
                          <button
                            type="button"
                            onClick={() =>
                              toast.info(`Документ: ${doc.title}`, 'Овој запис нема прикачен фајл за преземање.')
                            }
                            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-lg border border-border bg-card hover:bg-muted text-foreground shrink-0 cursor-pointer transition-colors"
                          >
                            <Download className="w-3.5 h-3.5 text-primary" /> {downloadLabel}
                          </button>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            )}

            {/* Tab 2: Installed Equipment */}
            {detailTab === 'EQUIPMENT' && (
              <div className="space-y-2.5">
                {equipmentForActiveCust.length === 0 ? (
                  <div className="p-8 text-center border border-dashed border-border rounded-xl text-xs text-muted-foreground">
                    {t('customers.no_equipment')}
                  </div>
                ) : (
                  equipmentForActiveCust.map((item) => (
                    <div key={item.id} className="p-4 bg-muted/25 border border-border rounded-xl space-y-1 text-xs">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-semibold text-foreground">{item.title}</span>
                        <span className="font-mono text-[11px] bg-primary/10 text-primary px-2 py-0.5 rounded-md">
                          {item.serialNumber || 'SN-N/A'}
                        </span>
                      </div>
                      <p className="text-[11px] text-muted-foreground">
                        Монтирано: {formatDate(item.installationDate)}
                      </p>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* Tab 3: Service History */}
            {detailTab === 'SERVICE' && (
              <div className="space-y-2.5">
                {serviceForActiveCust.length === 0 ? (
                  <div className="p-8 text-center border border-dashed border-border rounded-xl text-xs text-muted-foreground">
                    {t('customers.no_service')}
                  </div>
                ) : (
                  serviceForActiveCust.map((st) => (
                    <Link
                      key={st.id}
                      href={`/service/${st.id}`}
                      className="block p-4 bg-muted/25 hover:bg-muted/45 border border-border rounded-xl space-y-1.5 text-xs transition-colors"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-mono font-semibold text-primary">{st.ticketNumber}</span>
                        <StatusBadge variant="primary">
                          {getServiceStatusLabel(st.status, locale)}
                        </StatusBadge>
                      </div>
                      <p className="font-medium text-foreground">{st.defectDescription}</p>
                      <p className="text-[11px] text-muted-foreground">{st.solution || 'Во тек...'}</p>
                    </Link>
                  ))
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
            const targetId = customerToDelete.id;
            deleteCustomerMutation.mutate(targetId, {
              onSuccess: () => {
                if (activeCustomerDetail?.id === targetId) setActiveCustomerDetail(null);
                toast.info('Клиентот е избришан');
              },
            });
          }
          setCustomerToDelete(null);
        }}
        onCancel={() => setCustomerToDelete(null)}
      />
    </div>
  );
}
