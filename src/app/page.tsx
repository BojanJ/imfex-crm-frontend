'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useI18n } from '@/lib/i18n-context';
import { imfexStore, useImfexStore } from '@/lib/store';
import { useOffersQuery, useProjectsQuery, useServiceTicketsQuery } from '@/lib/queries';
import { canViewFinance, canWriteSales } from '@/lib/rbac';
import { formatDate } from '@/lib/date-format';
import { formatCurrency } from '@/lib/formatters';
import {
  getOfferStatusLabel,
  getProjectStatusLabel,
  getServicePriorityLabel,
} from '@/lib/enum-labels';
import { Offer } from '@/types';
import {
  TrendingUp,
  Users,
  CheckCircle2,
  Plus,
  Euro,
  FileText,
  Briefcase,
  Wrench,
  AlertTriangle,
  Clock,
  ChevronRight,
  Package,
} from 'lucide-react';
import { PdfModal } from '@/components/pdf/pdf-modal';
import { PageLoadingSkeleton } from '@/components/ui/loading-skeleton';
import {
  PageHeader,
  StatCard,
  SectionCard,
  StatusBadge,
  EmptyState,
  BadgeVariant,
} from '@/components/ui/page-primitives';

function offerBadgeVariant(status: string): BadgeVariant {
  if (status === 'ACCEPTED') return 'success';
  if (status === 'SENT') return 'primary';
  if (status === 'REJECTED') return 'danger';
  if (status === 'EXPIRED') return 'neutral';
  return 'warning';
}

function projectBadgeVariant(status: string): BadgeVariant {
  if (status === 'COMPLETED' || status === 'CLOSED') return 'success';
  if (status === 'INSTALLATION') return 'warning';
  if (status === 'PROCUREMENT') return 'purple';
  return 'primary';
}

export default function DashboardPage() {
  const { t, locale } = useI18n();
  useImfexStore();
  const currentUser = imfexStore.getCurrentUser();
  const currentRole = currentUser?.role ?? imfexStore.getCurrentRole();
  const showFinance = canViewFinance(currentRole);
  const allowSalesWrite = canWriteSales(currentRole);

  const offersQuery = useOffersQuery();
  const projectsQuery = useProjectsQuery();
  const ticketsQuery = useServiceTicketsQuery();

  const offers = offersQuery.data ?? imfexStore.getOffers();
  const projects = projectsQuery.data ?? imfexStore.getProjects();
  const serviceTickets = ticketsQuery.data ?? imfexStore.getServiceTickets();
  const [selectedOfferForPdf, setSelectedOfferForPdf] = useState<Offer | null>(null);

  const isLoading =
    (offersQuery.isPending && offers.length === 0) ||
    (projectsQuery.isPending && projects.length === 0) ||
    (ticketsQuery.isPending && serviceTickets.length === 0);

  // BIZ-15: Accurate executive KPIs — separate signed ACCEPTED revenue from open SENT pipeline; exclude DRAFTs from win rate
  const acceptedOffers = offers.filter((o) => o.status === 'ACCEPTED');
  const sentOffers = offers.filter((o) => o.status === 'SENT');
  const signedRevenue = acceptedOffers.reduce((acc, o) => acc + (Number(o.totalAmount) || 0), 0);
  const openPipelineRevenue = sentOffers.reduce((acc, o) => acc + (Number(o.totalAmount) || 0), 0);

  const acceptedCount = acceptedOffers.length;
  const nonDraftOffersCount = offers.filter((o) => o.status !== 'DRAFT').length;
  const acceptanceRate =
    nonDraftOffersCount > 0 ? Math.round((acceptedCount / nonDraftOffersCount) * 100) : 0;

  const activeProjects = projects.filter(
    (p) => p.status !== 'CLOSED' && p.status !== 'COMPLETED'
  );
  const activeProjectsCount = activeProjects.length;
  const urgentServiceTickets = serviceTickets.filter(
    (st) => (st.priority === 'URGENT' || st.priority === 'HIGH') && st.status !== 'CLOSED'
  );
  const myAssignedTickets = serviceTickets.filter(
    (st) => st.status !== 'CLOSED' && currentUser?.id && st.assignedTechnicianId === currentUser.id
  );

  // 6-month signed revenue trend for Executive / Sales / Finance roles (BIZ-15)
  const monthlySeries = (() => {
    const now = new Date();
    const buckets: { key: string; label: string; amount: number; count: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const label = d.toLocaleDateString(locale === 'mk' ? 'mk-MK' : 'en-GB', { month: 'short' });
      buckets.push({ key, label, amount: 0, count: 0 });
    }
    for (const o of acceptedOffers) {
      const dt = new Date(o.createdAt);
      if (Number.isNaN(dt.getTime())) continue;
      const key = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}`;
      const b = buckets.find((x) => x.key === key);
      if (b) {
        b.amount += Number(o.totalAmount || 0);
        b.count += 1;
      }
    }
    const maxVal = Math.max(...buckets.map((b) => b.amount), 1);
    return { buckets, maxVal };
  })();

  if (isLoading) {
    return <PageLoadingSkeleton cards={4} rows={4} />;
  }

  const progressMap: Record<string, number> = {
    PLANNED: 20,
    PROCUREMENT: 40,
    PRODUCTION: 60,
    INSTALLATION: 80,
    COMPLETED: 100,
    CLOSED: 100,
  };

  return (
    <div className="space-y-6 pb-10">
      {/* Clean Minimal Page Header */}
      <PageHeader
        title={t('dashboard.welcome')}
        subtitle={t('dashboard.subtitle')}
        actions={
          <>
            <Link
              href="/customers"
              className="h-9 px-3 text-xs font-medium rounded-lg border border-border bg-card hover:bg-muted text-foreground inline-flex items-center gap-1.5 transition-colors"
            >
              <Users className="w-3.5 h-3.5 text-muted-foreground" />
              <span>{t('dashboard.new_customer')}</span>
            </Link>
            <Link
              href="/products"
              className="h-9 px-3 text-xs font-medium rounded-lg border border-border bg-card hover:bg-muted text-foreground inline-flex items-center gap-1.5 transition-colors"
            >
              <Package className="w-3.5 h-3.5 text-muted-foreground" />
              <span>{t('nav.products')}</span>
            </Link>
            {showFinance && (
              <Link
                href="/finance"
                className="h-9 px-3 text-xs font-medium rounded-lg border border-border bg-card hover:bg-muted text-foreground inline-flex items-center gap-1.5 transition-colors"
              >
                <Euro className="w-3.5 h-3.5 text-muted-foreground" />
                <span>{t('nav.finance') || 'Финансии'}</span>
              </Link>
            )}
            {allowSalesWrite && (
              <Link
                href="/offers/new"
                className="h-9 px-3.5 text-xs font-semibold rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 inline-flex items-center gap-1.5 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>{t('dashboard.new_offer')}</span>
              </Link>
            )}
          </>
        }
      />

      {/* Calm 4-Column KPI Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label={t('dashboard.signed_revenue')}
          value={formatCurrency(signedRevenue)}
          tone="success"
          icon={<Euro className="w-4 h-4" />}
          helper={
            <>
              <TrendingUp className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span>
                {openPipelineRevenue > 0
                  ? `${t('dashboard.open_pipeline')}: ${formatCurrency(openPipelineRevenue)}`
                  : t('dashboard.pipeline_growth')}
              </span>
            </>
          }
        />

        <StatCard
          label={t('dashboard.active_projects')}
          value={activeProjectsCount}
          tone="primary"
          icon={<Briefcase className="w-4 h-4" />}
          helper={
            <>
              <Clock className="w-3.5 h-3.5 text-primary shrink-0" />
              <span>{t('dashboard.in_procurement_install')}</span>
            </>
          }
        />

        <StatCard
          label={t('nav.service')}
          value={serviceTickets.length}
          tone="warning"
          icon={<Wrench className="w-4 h-4" />}
          badge={
            urgentServiceTickets.length > 0 ? (
              <StatusBadge variant="danger">
                {urgentServiceTickets.length} {t('dashboard.urgent')}
              </StatusBadge>
            ) : undefined
          }
          helper={t('dashboard.field_dispatch')}
        />

        <StatCard
          label={t('dashboard.accepted_ratio')}
          value={`${acceptanceRate}%`}
          tone="primary"
          icon={<CheckCircle2 className="w-4 h-4" />}
          helper={`${acceptedCount} ${t('dashboard.quotes_signed')}`}
        />
      </div>

      {/* Role-Tailored Focus Strip & Monthly Signed Revenue Chart (BIZ-15) */}
      {currentRole === 'TECHNICIAN' ? (
        <div className="p-4 rounded-xl border border-amber-500/25 bg-amber-500/[0.06] flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2.5">
            <Wrench className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
            <div>
              <strong className="font-semibold text-foreground block">{t('dashboard.tech_focus_title')}</strong>
              <span className="text-muted-foreground">
                {t('dashboard.tech_focus_sub')}: {myAssignedTickets.length} · {t('dashboard.urgent')}: {urgentServiceTickets.length}
              </span>
            </div>
          </div>
          <Link
            href="/service"
            className="h-8 px-3 rounded-lg bg-primary text-primary-foreground font-semibold inline-flex items-center gap-1"
          >
            {t('nav.service')}
            <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      ) : (
        <SectionCard
          title={t('dashboard.monthly_revenue_title')}
          subtitle={t('dashboard.monthly_revenue_sub')}
          icon={<TrendingUp className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />}
        >
          <div className="grid grid-cols-6 gap-2 sm:gap-4 items-end h-28 pt-2">
            {monthlySeries.buckets.map((b) => {
              const pct = Math.max(b.amount > 0 ? 12 : 4, Math.round((b.amount / monthlySeries.maxVal) * 100));
              return (
                <div key={b.key} className="flex flex-col items-center gap-1.5 h-full justify-end">
                  <span className="text-[10px] font-semibold tabular-nums text-muted-foreground truncate max-w-full">
                    {b.amount > 0 ? formatCurrency(b.amount) : '—'}
                  </span>
                  <div className="w-full max-w-[44px] flex-1 flex items-end bg-muted/40 rounded-md overflow-hidden">
                    <div
                      className={`w-full rounded-t-md transition-all ${
                        b.amount > 0 ? 'bg-primary/80' : 'bg-border/60'
                      }`}
                      style={{ height: `${pct}%` }}
                      title={`${b.label}: ${formatCurrency(b.amount)} (${b.count})`}
                    />
                  </div>
                  <span className="text-[11px] font-medium text-muted-foreground capitalize">{b.label}</span>
                </div>
              );
            })}
          </div>
        </SectionCard>
      )}

      {/* Operational Widgets Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Active Projects Pipeline */}
        <SectionCard
          className="lg:col-span-2"
          title={t('dashboard.active_projects_status')}
          subtitle={t('dashboard.progress_desc')}
          icon={<Briefcase className="w-4 h-4" />}
          action={
            <Link
              href="/projects"
              className="text-xs font-medium text-primary hover:underline inline-flex items-center gap-0.5"
            >
              {t('dashboard.view_all_pipeline')}
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          }
        >
          {activeProjects.length === 0 ? (
            <EmptyState
              icon={<Briefcase className="w-5 h-5" />}
              title={t('dashboard.no_active_projects')}
              description={t('dashboard.progress_desc')}
            />
          ) : (
            <div className="divide-y divide-border/70 -mx-5">
              {activeProjects.slice(0, 4).map((prj) => {
                const pct = progressMap[prj.status] || 10;

                return (
                  <Link
                    key={prj.id}
                    href={`/projects/${prj.id}`}
                    className="block px-5 py-3.5 hover:bg-muted/35 transition-colors space-y-2"
                  >
                    <div className="flex items-center justify-between gap-3 text-xs">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="font-mono font-semibold text-primary shrink-0">
                          {prj.projectNumber}
                        </span>
                        <span className="font-medium text-foreground truncate">
                          {prj.customer?.companyName || prj.customer?.name}
                        </span>
                      </div>
                      <StatusBadge variant={projectBadgeVariant(prj.status)} dot>
                        {getProjectStatusLabel(prj.status, locale)}
                      </StatusBadge>
                    </div>

                    <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
                      <div
                        className="bg-primary h-full rounded-full transition-all duration-300"
                        style={{ width: `${pct}%` }}
                      />
                    </div>

                    <div className="flex items-center justify-between gap-2 text-[11px] text-muted-foreground">
                      <span>
                        {prj.installationDate ? t('projects.installation_date') : t('projects.target_deadline')}:{' '}
                        {formatDate(prj.installationDate || prj.targetDeliveryDate, '—')}
                      </span>
                      <span className="truncate">
                        {t('projects.responsible')}: {prj.responsibleUser?.fullName || '—'}
                      </span>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </SectionCard>

        {/* Urgent Service Alerts */}
        <SectionCard
          title={t('dashboard.urgent_service_alerts')}
          icon={<AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400" />}
          action={
            <Link
              href="/service"
              className="text-xs font-medium text-primary hover:underline inline-flex items-center gap-0.5 whitespace-nowrap"
            >
              {t('nav.service')}
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          }
        >
          {urgentServiceTickets.length === 0 ? (
            <div className="py-8 text-center border border-dashed border-border rounded-xl text-xs text-muted-foreground">
              {t('dashboard.no_urgent_tickets')}
            </div>
          ) : (
            <div className="space-y-2.5">
              {urgentServiceTickets.map((st) => (
                <Link
                  key={st.id}
                  href={`/service/${st.id}`}
                  className="block p-3.5 rounded-xl border border-rose-500/20 bg-rose-500/[0.05] hover:bg-rose-500/[0.09] transition-colors space-y-1.5"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-xs font-semibold text-rose-700 dark:text-rose-400">
                      {st.ticketNumber}
                    </span>
                    <StatusBadge variant="danger">
                      {getServicePriorityLabel(st.priority, locale)}
                    </StatusBadge>
                  </div>
                  <p className="text-xs font-medium text-foreground truncate">
                    {st.defectDescription}
                  </p>
                  <p className="text-[11px] text-muted-foreground truncate">
                    {st.customer?.companyName || st.customer?.name}
                  </p>
                </Link>
              ))}
            </div>
          )}
        </SectionCard>
      </div>

      {/* Recent Offers Table */}
      <SectionCard
        title={t('dashboard.recent_offers')}
        subtitle={t('dashboard.latest_quotes_desc')}
        noPadding
        action={
          <Link
            href="/offers"
            className="text-xs font-medium text-primary hover:underline inline-flex items-center gap-0.5"
          >
            {t('dashboard.view_all_quotes')}
            <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        }
      >
        {offers.length === 0 ? (
          <EmptyState
            icon={<FileText className="w-5 h-5" />}
            title={t('dashboard.recent_offers')}
            description={t('dashboard.latest_quotes_desc')}
          />
        ) : (
          <>
            {/* Mobile Cards */}
            <div className="divide-y divide-border md:hidden">
              {offers.slice(0, 6).map((offer) => (
                <div key={offer.id} className="p-4 space-y-2.5 text-xs">
                  <div className="flex items-center justify-between gap-2">
                    <Link
                      href={`/offers/${offer.id}`}
                      className="font-mono font-semibold text-primary hover:underline"
                    >
                      {offer.offerNumber}
                    </Link>
                    <StatusBadge variant={offerBadgeVariant(offer.status)} dot>
                      {getOfferStatusLabel(offer.status, locale)}
                    </StatusBadge>
                  </div>
                  <div>
                    <p className="font-medium text-foreground">
                      {offer.customer?.companyName || offer.customer?.name || t('offers.customer')}
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      {offer.items.length}{' '}
                      {offer.items.length === 1 ? t('offers.item_singular') : t('offers.items').toLowerCase()}
                    </p>
                  </div>
                  <div className="flex items-center justify-between pt-2 border-t border-border/60">
                    <span className="font-semibold text-foreground tabular-nums">
                      {formatCurrency(offer.totalAmount)}
                    </span>
                    <button
                      type="button"
                      onClick={() => setSelectedOfferForPdf(offer)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-lg border border-border bg-background hover:bg-muted text-foreground transition-colors cursor-pointer"
                    >
                      <FileText className="w-3.5 h-3.5 text-primary" /> PDF
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop Table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-muted/40 border-b border-border text-[11px] font-medium text-muted-foreground">
                  <tr>
                    <th className="px-5 py-3">{t('offers.offer_number')}</th>
                    <th className="px-4 py-3">{t('offers.customer')}</th>
                    <th className="px-4 py-3">{t('offers.items')}</th>
                    <th className="px-4 py-3">{t('offers.status')}</th>
                    <th className="px-4 py-3 text-right">{t('offers.total')}</th>
                    <th className="px-5 py-3 text-right">{t('offers.action')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/70">
                  {offers.slice(0, 6).map((offer) => (
                    <tr key={offer.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-5 py-3.5 whitespace-nowrap">
                        <Link
                          href={`/offers/${offer.id}`}
                          className="font-mono font-semibold text-primary hover:underline"
                        >
                          {offer.offerNumber}
                        </Link>
                      </td>
                      <td className="px-4 py-3.5 font-medium text-foreground">
                        {offer.customer?.companyName || offer.customer?.name || t('offers.customer')}
                      </td>
                      <td className="px-4 py-3.5 text-muted-foreground tabular-nums">
                        {offer.items.length}{' '}
                        {offer.items.length === 1 ? t('offers.item_singular') : t('offers.items').toLowerCase()}
                      </td>
                      <td className="px-4 py-3.5">
                        <StatusBadge variant={offerBadgeVariant(offer.status)} dot>
                          {getOfferStatusLabel(offer.status, locale)}
                        </StatusBadge>
                      </td>
                      <td className="px-4 py-3.5 text-right font-semibold text-foreground tabular-nums whitespace-nowrap">
                        {formatCurrency(offer.totalAmount)}
                      </td>
                      <td className="px-5 py-3.5 text-right whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => setSelectedOfferForPdf(offer)}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-lg border border-border bg-background hover:bg-muted text-foreground transition-colors cursor-pointer"
                        >
                          <FileText className="w-3.5 h-3.5 text-muted-foreground" /> PDF
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </SectionCard>

      {/* PDF Export Modal */}
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
