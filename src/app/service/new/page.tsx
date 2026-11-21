'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useI18n } from '@/lib/i18n-context';
import { Customer, InstalledItem, ServicePriority, ServiceTicket } from '@/types';
import { imfexStore } from '@/lib/store';
import { CustomerModal } from '@/components/customer-form/customer-modal';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { CustomerSelect } from '@/components/ui/entity-selectors';
import { formatDate } from '@/lib/date-format';
import { getServicePriorityLabel } from '@/lib/enum-labels';
import { toast } from '@/components/ui/toastr';
import { PageHeader, SectionCard } from '@/components/ui/page-primitives';
import {
  Wrench,
  UserPlus,
  Building2,
  AlertTriangle,
  Save,
} from 'lucide-react';

export default function NewServiceTicketPage() {
  const router = useRouter();
  const { locale } = useI18n();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [customerInstalledItems, setCustomerInstalledItems] = useState<InstalledItem[]>([]);
  const [selectedInstalledItemId, setSelectedInstalledItemId] = useState<string>('');
  const [defectDescription, setDefectDescription] = useState('');
  const [priority, setPriority] = useState<ServicePriority>('MEDIUM');
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);

  useEffect(() => {
    const list = imfexStore.getCustomers();
    setCustomers(list);
    if (list.length > 0) {
      setSelectedCustomerId(list[0].id);
    }
  }, []);

  useEffect(() => {
    if (selectedCustomerId) {
      const items = imfexStore.getInstalledItemsByCustomer(selectedCustomerId);
      setCustomerInstalledItems(items);
      if (items.length > 0) {
        setSelectedInstalledItemId(items[0].id);
      } else {
        setSelectedInstalledItemId('');
      }
    }
  }, [selectedCustomerId]);

  const refreshCustomers = () => {
    const list = imfexStore.getCustomers();
    setCustomers(list);
    if (list.length > 0) setSelectedCustomerId(list[list.length - 1].id);
  };

  const handleCreateTicket = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomerId) {
      toast.error('Изберете клиент', 'Ве молиме изберете клиент за сервисниот тикет.');
      return;
    }

    const selectedCustObj = imfexStore.getCustomerById(selectedCustomerId);
    const selectedItemObj = imfexStore.getAllInstalledItems().find((i) => i.id === selectedInstalledItemId);

    const newTicket: ServiceTicket = {
      id: `srv-${Date.now()}`,
      ticketNumber: imfexStore.generateTicketNumber(),
      customerId: selectedCustomerId,
      customer: selectedCustObj,
      installedItemId: selectedInstalledItemId || undefined,
      installedItem: selectedItemObj,
      defectDescription,
      priority,
      status: 'OPEN',
      partsConsumed: [],
      laborHours: 0,
      createdAt: new Date().toISOString(),
    };

    const saved = imfexStore.saveServiceTicket(newTicket);
    toast.success(`Сервисниот тикет ${saved.ticketNumber} е креиран!`);
    router.push(`/service/${saved.id}`);
  };

  const selectedCustObj = customers.find((c) => c.id === selectedCustomerId);

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-16">
      <PageHeader
        backHref="/service"
        title="Нов Сервисен Тикет"
        subtitle="Изберете клиент, опрема, приоритет и опишете го пријавениот дефект."
      />

      <form onSubmit={handleCreateTicket} className="space-y-5 text-xs">
        <SectionCard
          title="1. Клиент"
          icon={<Building2 className="w-4 h-4" />}
          action={
            <button
              type="button"
              onClick={() => setIsCustomerModalOpen(true)}
              className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline cursor-pointer"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Нов клиент</span>
            </button>
          }
        >
          <div className="space-y-3">
            <CustomerSelect
              customers={customers}
              value={selectedCustomerId}
              onChange={(val) => setSelectedCustomerId(val)}
              placeholder="Изберете клиент..."
              searchPlaceholder="Пребарај по име, компанија, ЕДБ или телефон..."
            />

            {selectedCustObj && (
              <div className="p-3 bg-muted/35 rounded-lg border border-border/80 text-muted-foreground space-y-0.5">
                <p className="font-medium text-foreground">
                  {selectedCustObj.companyName || selectedCustObj.name}
                </p>
                <p className="text-[11px]">
                  {[selectedCustObj.email, selectedCustObj.phone].filter(Boolean).join(' • ') || '—'}
                </p>
              </div>
            )}
          </div>
        </SectionCard>

        <SectionCard
          title="2. Опрема / Монтиран Систем"
          icon={<Wrench className="w-4 h-4" />}
        >
          {customerInstalledItems.length > 0 ? (
            <SearchableSelect
              options={customerInstalledItems.map((item) => ({
                value: item.id,
                label: `${item.title} (SN: ${item.serialNumber || 'N/A'}) — Монтирано ${formatDate(item.installationDate)}`,
              }))}
              value={selectedInstalledItemId}
              onChange={(val) => setSelectedInstalledItemId(val)}
              placeholder="Изберете монтирана опрема..."
              searchPlaceholder="Пребарај опрема..."
              className="w-full px-3 py-2 rounded-lg border border-border bg-background outline-none font-medium text-xs"
            />
          ) : (
            <p className="p-3 bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-400 rounded-lg">
              Нема евидентирана монтирана опрема за овој клиент. Тикетот ќе биде заведен под општо одржување.
            </p>
          )}
        </SectionCard>

        <SectionCard
          title="3. Дефект и Приоритет"
          icon={<AlertTriangle className="w-4 h-4" />}
        >
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="block font-medium text-muted-foreground">Приоритет</label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {(['LOW', 'MEDIUM', 'HIGH', 'URGENT'] as ServicePriority[]).map((p) => {
                  const isActive = priority === p;
                  return (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setPriority(p)}
                      className={`py-2.5 px-3 rounded-lg border text-center font-medium transition-colors cursor-pointer ${
                        isActive
                          ? p === 'URGENT'
                            ? 'bg-rose-600 text-white border-rose-600'
                            : 'bg-primary text-primary-foreground border-primary'
                          : 'bg-background border-border text-muted-foreground hover:bg-muted hover:text-foreground'
                      }`}
                    >
                      {getServicePriorityLabel(p, locale)}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block font-medium text-muted-foreground">Опис на дефект / проблем</label>
              <textarea
                required
                rows={4}
                value={defectDescription}
                onChange={(e) => setDefectDescription(e.target.value)}
                placeholder="Опишете го пријавениот проблем (на пр. неисправен сензор на мотор, скршена пружина, грешка на контролна плоча...)"
                className="w-full px-3 py-2.5 rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground/70 outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary text-xs transition-colors"
              />
            </div>
          </div>
        </SectionCard>

        <div className="flex items-center justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={() => router.push('/service')}
            className="h-9 px-4 rounded-lg border border-border bg-card font-medium text-foreground hover:bg-muted transition-colors cursor-pointer"
          >
            Откажи
          </button>
          <button
            type="submit"
            className="h-9 px-5 rounded-lg bg-primary text-primary-foreground font-semibold hover:bg-primary/90 transition-colors inline-flex items-center gap-1.5 cursor-pointer"
          >
            <Save className="w-4 h-4" />
            <span>Отвори Сервисен Тикет</span>
          </button>
        </div>
      </form>

      <CustomerModal
        isOpen={isCustomerModalOpen}
        onClose={() => setIsCustomerModalOpen(false)}
        onSaveSuccess={refreshCustomers}
      />
    </div>
  );
}
