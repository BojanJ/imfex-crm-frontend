'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useI18n } from '@/lib/i18n-context';
import { imfexStore, useImfexStore } from '@/lib/store';
import { Offer, Customer, Project, ServiceTicket } from '@/types';
import {
  TrendingUp,
  FileSpreadsheet,
  Users,
  CheckCircle2,
  Plus,
  ArrowUpRight,
  Euro,
  FileText,
  Briefcase,
  Wrench,
  AlertTriangle,
  Clock,
  Sparkles,
  ChevronRight,
} from 'lucide-react';
import { PdfModal } from '@/components/pdf/pdf-modal';

export default function DashboardPage() {
  const { t } = useI18n();
  useImfexStore(); // Auto-subscribe to live store updates

  const [offers, setOffers] = useState<Offer[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [serviceTickets, setServiceTickets] = useState<ServiceTicket[]>([]);
  const [selectedOfferForPdf, setSelectedOfferForPdf] = useState<Offer | null>(null);

  const refreshDashboard = () => {
    setOffers(imfexStore.getOffers());
    setCustomers(imfexStore.getCustomers());
    setProjects(imfexStore.getProjects());
    setServiceTickets(imfexStore.getServiceTickets());
  };

  useEffect(() => {
    refreshDashboard();
  }, []);

  useEffect(() => {
    refreshDashboard();
  }, [imfexStore.getOffers().length, imfexStore.getProjects().length, imfexStore.getCustomers().length]);

  const totalRevenue = offers
    .filter((o) => o.status === 'ACCEPTED' || o.status === 'SENT')
    .reduce((acc, o) => acc + (o.totalAmount || 0), 0);

  const acceptedCount = offers.filter((o) => o.status === 'ACCEPTED').length;
  const acceptanceRate = offers.length > 0 ? Math.round((acceptedCount / offers.length) * 100) : 0;

  const activeProjectsCount = projects.filter((p) => p.status !== 'CLOSED' && p.status !== 'COMPLETED').length;
  const urgentServiceTickets = serviceTickets.filter((t) => (t.priority === 'URGENT' || t.priority === 'HIGH') && t.status !== 'CLOSED');

  return (
    <div className="space-y-6 pb-12">
      {/* Hero Welcome Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-gradient-to-r from-primary/20 via-card to-card p-6 sm:p-8 rounded-2xl border border-primary/20 shadow-md relative overflow-hidden">
        <div className="space-y-2 max-w-2xl relative z-10">
          <div className="inline-flex items-center gap-2 bg-primary/10 border border-primary/20 px-3 py-1 rounded-full text-primary text-xs font-black">
            <Sparkles className="w-3.5 h-3.5 text-amber-500" /> {t('dashboard.command_hub')}
          </div>
          <h1 className="font-extrabold text-2xl sm:text-3xl tracking-tight text-foreground">
            {t('dashboard.welcome')}
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
            {t('dashboard.subtitle')}
          </p>
        </div>

        {/* Quick Action Shortcuts */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-3 relative z-10 shrink-0">
          <Link
            href="/offers/new"
            className="flex items-center gap-1.5 px-4 py-2.5 text-xs font-bold rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-all shadow-md"
          >
            <Plus className="w-4 h-4" /> {t('dashboard.new_offer')}
          </Link>
          <Link
            href="/service/new"
            className="flex items-center gap-1.5 px-4 py-2.5 text-xs font-bold rounded-xl border border-border bg-card hover:bg-muted text-foreground transition-all shadow-sm"
          >
            <Wrench className="w-4 h-4 text-orange-500" /> {t('nav.service')}
          </Link>
          <Link
            href="/customers"
            className="flex items-center gap-1.5 px-4 py-2.5 text-xs font-bold rounded-xl border border-border bg-card hover:bg-muted text-foreground transition-all shadow-sm"
          >
            <Users className="w-4 h-4 text-blue-500" /> {t('dashboard.new_customer')}
          </Link>
        </div>
      </div>

      {/* KPI Metrics Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Revenue */}
        <div className="bg-card border border-border rounded-xl p-5 shadow-sm space-y-2 relative overflow-hidden group hover:border-emerald-500/50 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
              {t('dashboard.quoted_revenue')}
            </span>
            <div className="p-2 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-xl">
              <Euro className="w-5 h-5" />
            </div>
          </div>
          <p className="text-2xl font-black text-foreground">€{totalRevenue.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
          <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
            <TrendingUp className="w-3.5 h-3.5" /> {t('dashboard.pipeline_growth')}
          </p>
        </div>

        {/* Active Projects */}
        <div className="bg-card border border-border rounded-xl p-5 shadow-sm space-y-2 relative overflow-hidden group hover:border-primary/50 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
              {t('dashboard.active_projects')}
            </span>
            <div className="p-2 bg-primary/10 text-primary rounded-xl">
              <Briefcase className="w-5 h-5" />
            </div>
          </div>
          <p className="text-2xl font-black text-foreground">{activeProjectsCount}</p>
          <p className="text-[11px] text-primary font-medium flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" /> {t('dashboard.in_procurement_install')}
          </p>
        </div>

        {/* Urgent Service Desk */}
        <div className="bg-card border border-border rounded-xl p-5 shadow-sm space-y-2 relative overflow-hidden group hover:border-amber-500/50 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
              {t('nav.service')}
            </span>
            <div className="p-2 bg-amber-500/10 text-amber-500 rounded-xl">
              <Wrench className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <p className="text-2xl font-black text-foreground">{serviceTickets.length}</p>
            {urgentServiceTickets.length > 0 && (
              <span className="text-[10px] font-black bg-red-500/10 text-red-500 px-2 py-0.5 rounded-full animate-pulse">
                {urgentServiceTickets.length} {t('dashboard.urgent')}
              </span>
            )}
          </div>
          <p className="text-[11px] text-muted-foreground font-medium">{t('dashboard.field_dispatch')}</p>
        </div>

        {/* Acceptance Rate */}
        <div className="bg-card border border-border rounded-xl p-5 shadow-sm space-y-2 relative overflow-hidden group hover:border-blue-500/50 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
              {t('dashboard.accepted_ratio')}
            </span>
            <div className="p-2 bg-blue-500/10 text-blue-500 rounded-xl">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>
          <p className="text-2xl font-black text-foreground">{acceptanceRate}%</p>
          <p className="text-[11px] text-muted-foreground font-medium">{acceptedCount} {t('dashboard.quotes_signed')}</p>
        </div>
      </div>

      {/* Operational Widgets Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Widget 1: Active Projects Status Pipeline Summary */}
        <div className="lg:col-span-2 bg-card border border-border rounded-xl p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <div>
              <h2 className="font-extrabold text-base flex items-center gap-2 text-foreground">
                <Briefcase className="w-4 h-4 text-primary" /> {t('dashboard.active_projects_status')}
              </h2>
              <p className="text-xs text-muted-foreground">{t('dashboard.progress_desc')}</p>
            </div>
            <Link href="/projects" className="text-xs font-bold text-primary hover:underline flex items-center gap-1">
              {t('dashboard.view_all_pipeline')} <ChevronRight className="w-4 h-4" />
            </Link>
          </div>

          <div className="space-y-3 text-xs">
            {projects.slice(0, 3).map((prj) => {
              const progressMap: Record<string, number> = {
                PLANNED: 20,
                PROCUREMENT: 40,
                PRODUCTION: 60,
                INSTALLATION: 80,
                COMPLETED: 95,
                CLOSED: 100,
              };
              const pct = progressMap[prj.status] || 10;

              return (
                <div key={prj.id} className="p-4 bg-muted/20 border border-border rounded-xl space-y-2">
                  <div className="flex items-center justify-between font-bold">
                    <span className="text-primary">{prj.projectNumber}</span>
                    <span className="text-foreground">{prj.customer?.companyName || prj.customer?.name}</span>
                    <span className="text-[10px] uppercase bg-primary/10 text-primary px-2 py-0.5 rounded font-black">
                      {prj.status}
                    </span>
                  </div>

                  <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                    <div className="bg-primary h-full transition-all duration-500" style={{ width: `${pct}%` }} />
                  </div>

                  <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                    <span>{t('projects.installation_date')}: {prj.installationDate || 'TBD'}</span>
                    <span>{t('projects.responsible')}: {prj.responsibleUser?.fullName || 'IMFEX Agent'}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Widget 2: Urgent Service Desk Alerts */}
        <div className="bg-card border border-border rounded-xl p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <h2 className="font-extrabold text-base flex items-center gap-2 text-foreground">
              <AlertTriangle className="w-4 h-4 text-amber-500" /> {t('dashboard.urgent_service_alerts')}
            </h2>
            <Link href="/service" className="text-xs font-bold text-primary hover:underline">
              {t('nav.service')} →
            </Link>
          </div>

          <div className="space-y-3 text-xs">
            {urgentServiceTickets.length === 0 ? (
              <div className="p-6 text-center border border-dashed border-border rounded-xl text-muted-foreground italic">
                {t('dashboard.no_urgent_tickets')}
              </div>
            ) : (
              urgentServiceTickets.map((st) => (
                <Link
                  key={st.id}
                  href={`/service/${st.id}`}
                  className="block p-3 bg-red-500/10 border border-red-500/20 hover:border-red-500/40 rounded-xl space-y-1 transition-all"
                >
                  <div className="flex items-center justify-between font-extrabold">
                    <span className="text-red-600 dark:text-red-400">{st.ticketNumber}</span>
                    <span className="text-[9px] uppercase bg-red-500 text-white px-2 py-0.5 rounded font-black">
                      {st.priority}
                    </span>
                  </div>
                  <p className="font-semibold text-foreground truncate">{st.defectDescription}</p>
                  <p className="text-[10px] text-muted-foreground">{st.customer?.companyName || st.customer?.name}</p>
                </Link>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Recent Offers Table Section */}
      <div className="bg-card border border-border rounded-xl p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-border pb-4">
          <div>
            <h2 className="font-extrabold text-base text-foreground">{t('dashboard.recent_offers')}</h2>
            <p className="text-xs text-muted-foreground">{t('dashboard.latest_quotes_desc')}</p>
          </div>
          <Link href="/offers" className="text-xs font-bold text-primary hover:underline flex items-center gap-1">
            {t('dashboard.view_all_quotes')} <ArrowUpRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="border border-border rounded-xl overflow-hidden text-xs">
          <table className="w-full text-left">
            <thead className="bg-muted/50 font-bold border-b border-border text-muted-foreground uppercase text-[10px]">
              <tr>
                <th className="p-3.5">{t('offers.offer_number')}</th>
                <th className="p-3.5">{t('offers.customer')}</th>
                <th className="p-3.5">{t('offers.items')}</th>
                <th className="p-3.5">{t('offers.status')}</th>
                <th className="p-3.5 text-right">{t('offers.total')}</th>
                <th className="p-3.5 text-center">{t('offers.action')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {offers.map((offer) => (
                <tr key={offer.id} className="hover:bg-muted/20 transition-colors">
                  <td className="p-3.5 font-extrabold text-primary">{offer.offerNumber}</td>
                  <td className="p-3.5 font-semibold text-foreground">
                    {offer.customer?.companyName || offer.customer?.name || 'Customer'}
                  </td>
                  <td className="p-3.5 text-muted-foreground">{offer.items.length} line item(s)</td>
                  <td className="p-3.5">
                    <span
                      className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase ${
                        offer.status === 'ACCEPTED'
                          ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                          : offer.status === 'SENT'
                          ? 'bg-blue-500/10 text-blue-500'
                          : 'bg-amber-500/10 text-amber-500'
                      }`}
                    >
                      {offer.status}
                    </span>
                  </td>
                  <td className="p-3.5 text-right font-black text-foreground">
                    €{Number(offer.totalAmount).toFixed(2)}
                  </td>
                  <td className="p-3.5 text-center">
                    <button
                      onClick={() => setSelectedOfferForPdf(offer)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold rounded-lg bg-muted hover:bg-muted/80 text-foreground transition-colors"
                    >
                      <FileText className="w-3.5 h-3.5 text-blue-500" /> PDF
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

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
