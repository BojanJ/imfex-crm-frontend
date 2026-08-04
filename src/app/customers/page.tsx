'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useI18n } from '@/lib/i18n-context';
import { Customer } from '@/types';
import { imfexStore, useImfexStore } from '@/lib/store';
import { CustomerModal } from '@/components/customer-form/customer-modal';
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
} from 'lucide-react';

export default function CustomersPage() {
  const { t } = useI18n();
  useImfexStore(); // Auto-subscribe to live store updates

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<string>('ALL');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);

  const [activeCustomerDetail, setActiveCustomerDetail] = useState<Customer | null>(null);
  const [detailTab, setDetailTab] = useState<'DETAILS' | 'DOCS' | 'EQUIPMENT' | 'SERVICE'>('DOCS');

  const refreshList = () => {
    setCustomers(imfexStore.getCustomers());
  };

  useEffect(() => {
    refreshList();
  }, []);

  useEffect(() => {
    refreshList();
  }, [imfexStore.getCustomers().length]);

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this customer record?')) {
      imfexStore.deleteCustomer(id);
      if (activeCustomerDetail?.id === id) setActiveCustomerDetail(null);
      refreshList();
    }
  };

  const filtered = customers.filter((c) => {
    const matchesSearch =
      (c.name || '').toLowerCase().includes(search.toLowerCase()) ||
      (c.companyName || '').toLowerCase().includes(search.toLowerCase()) ||
      (c.email || '').toLowerCase().includes(search.toLowerCase()) ||
      (c.taxId || '').toLowerCase().includes(search.toLowerCase());

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
          className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-all shadow-md"
        >
          <Plus className="w-4 h-4" /> {t('customers.add_customer')}
        </button>
      </div>

      {/* Search & Filter Toolbar */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between bg-card p-4 rounded-xl border border-border">
        <div className="relative flex-1 max-w-md">
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
              className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all ${
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

      {/* Main Grid & Customer Detail Drawer Container */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Customer Cards List */}
        <div className={`space-y-4 ${activeCustomerDetail ? 'lg:col-span-1' : 'lg:col-span-3 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 space-y-0'}`}>
          {filtered.map((customer) => {
            const isSelected = activeCustomerDetail?.id === customer.id;

            return (
              <div
                key={customer.id}
                onClick={() => setActiveCustomerDetail(customer)}
                className={`bg-card border rounded-xl p-5 shadow-sm space-y-4 cursor-pointer transition-all flex flex-col justify-between ${
                  isSelected ? 'border-primary ring-2 ring-primary/20 shadow-md' : 'border-border hover:border-primary/50'
                }`}
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="p-2 bg-primary/10 text-primary rounded-lg">
                        {customer.customerType === 'INDIVIDUAL' ? (
                          <User className="w-5 h-5" />
                        ) : (
                          <Building2 className="w-5 h-5" />
                        )}
                      </div>
                      <div>
                        <span className="text-[9px] font-extrabold uppercase bg-primary/10 text-primary px-2 py-0.5 rounded">
                          {customer.customerType}
                        </span>
                        <h3 className="font-bold text-sm leading-tight text-foreground mt-1">
                          {customer.companyName || customer.name}
                        </h3>
                      </div>
                    </div>

                    <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                      <Link
                        href={`/offers/new?customerId=${customer.id}`}
                        className="p-1.5 text-emerald-600 hover:bg-emerald-500/10 rounded-lg"
                        title="Create Offer for Customer"
                      >
                        <FileText className="w-4 h-4" />
                      </Link>
                      <button
                        onClick={() => {
                          setEditingCustomer(customer);
                          setIsModalOpen(true);
                        }}
                        className="p-1.5 text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted"
                        title="Edit Customer"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(customer.id)}
                        className="p-1.5 text-red-500 hover:bg-red-500/10 rounded-lg"
                        title="Delete Customer"
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

        {/* Client Documentation & History Detail Panel */}
        {activeCustomerDetail && (
          <div className="lg:col-span-2 bg-card border border-border rounded-xl p-6 shadow-md space-y-6">
            <div className="flex items-center justify-between border-b border-border pb-4">
              <div>
                <span className="text-[10px] font-extrabold uppercase text-primary bg-primary/10 px-2 py-0.5 rounded">
                  {t('customers.documentation')}
                </span>
                <h2 className="text-lg font-black text-foreground mt-1">
                  {activeCustomerDetail.companyName || activeCustomerDetail.name}
                </h2>
                <p className="text-xs text-muted-foreground">
                  {activeCustomerDetail.email} • {activeCustomerDetail.phone} • {activeCustomerDetail.address}, {activeCustomerDetail.city}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <Link
                  href={`/offers/new?customerId=${activeCustomerDetail.id}`}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-all shadow-sm"
                >
                  <FileText className="w-4 h-4" /> {t('offers.create_offer') || 'Create Offer'}
                </Link>

                <button
                  onClick={() => setActiveCustomerDetail(null)}
                  className="text-xs text-muted-foreground hover:text-foreground font-bold border border-border px-2.5 py-1.5 rounded-xl hover:bg-muted"
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
                    {docsForActiveCust.map((doc) => (
                      <div
                        key={doc.id}
                        className="p-3 bg-muted/30 border border-border rounded-xl flex items-center justify-between text-xs"
                      >
                        <div className="flex items-center gap-3">
                          <FileText className="w-5 h-5 text-red-500" />
                          <div>
                            <p className="font-bold text-foreground">{doc.title}</p>
                            <p className="text-[10px] text-muted-foreground">
                              {new Date(doc.createdAt).toLocaleDateString()} • {doc.fileType}
                            </p>
                          </div>
                        </div>

                        <a
                          href="#"
                          onClick={(e) => {
                            e.preventDefault();
                            alert(`Преземање на документ ${doc.title}...`);
                          }}
                          className="flex items-center gap-1 px-3 py-1.5 text-[11px] font-bold rounded-lg bg-primary/10 text-primary hover:bg-primary/20"
                        >
                          <Download className="w-3.5 h-3.5" /> {t('customers.download_pdf')}
                        </a>
                      </div>
                    ))}
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
                          {item.installationDate}
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
        )}
      </div>

      {/* Customer Modal */}
      <CustomerModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        customerToEdit={editingCustomer}
        onSaveSuccess={refreshList}
      />
    </div>
  );
}
