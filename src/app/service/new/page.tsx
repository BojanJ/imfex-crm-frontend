'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Customer, InstalledItem, ServicePriority, ServiceTicket } from '@/types';
import { imfexStore } from '@/lib/store';
import { CustomerModal } from '@/components/customer-form/customer-modal';
import { SearchableSelect } from '@/components/ui/searchable-select';
import {
  Wrench,
  ArrowLeft,
  UserPlus,
  Building2,
  AlertTriangle,
  Plus,
  Save,
} from 'lucide-react';

export default function NewServiceTicketPage() {
  const router = useRouter();
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
      alert('Please select a customer.');
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
    alert(`Service Request ${saved.ticketNumber} created successfully.`);
    router.push(`/service/${saved.id}`);
  };

  const selectedCustObj = customers.find((c) => c.id === selectedCustomerId);

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-24">
      {/* Top Bar */}
      <div className="flex items-center justify-between bg-card p-4 rounded-xl border border-border">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push('/service')}
            className="p-2 border border-border rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h1 className="font-extrabold text-lg flex items-center gap-2">
              <Wrench className="w-5 h-5 text-primary" />
              <span>Open New Service Request</span>
            </h1>
            <p className="text-xs text-muted-foreground">
              Workflow 4.3.1 & 4.3.2: Select customer, defect, equipment & priority level.
            </p>
          </div>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleCreateTicket} className="bg-card border border-border rounded-xl p-6 shadow-sm space-y-6 text-xs">
        {/* Customer Selector */}
        <div className="space-y-3 border-b border-border pb-4">
          <div className="flex items-center justify-between">
            <label className="font-bold text-sm text-foreground flex items-center gap-2">
              <Building2 className="w-4 h-4 text-primary" /> 1. Select Customer Account
            </label>
            <button
              type="button"
              onClick={() => setIsCustomerModalOpen(true)}
              className="flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
            >
              <UserPlus className="w-3.5 h-3.5" /> + Quick New Customer
            </button>
          </div>

          <SearchableSelect
            options={customers.map((c) => ({
              value: c.id,
              label: `${c.companyName || c.name} (${c.customerType})`,
              sublabel: c.email ? `${c.email} • ${c.phone || ''}` : undefined,
            }))}
            value={selectedCustomerId}
            onChange={(val) => setSelectedCustomerId(val)}
            placeholder="Select Customer Account..."
            searchPlaceholder="Search customer..."
            className="w-full px-3 py-2 rounded-lg border border-border bg-background outline-none font-bold text-xs"
          />

          {selectedCustObj && (
            <div className="p-3 bg-muted/40 rounded-lg border border-border text-muted-foreground">
              <p className="font-bold text-foreground">{selectedCustObj.companyName || selectedCustObj.name}</p>
              <p>{selectedCustObj.email} • {selectedCustObj.phone}</p>
            </div>
          )}
        </div>

        {/* Product / Installed System Selection */}
        <div className="space-y-3 border-b border-border pb-4">
          <label className="font-bold text-sm text-foreground flex items-center gap-2">
            <Wrench className="w-4 h-4 text-primary" /> 2. Target Equipment / Product Installation
          </label>

          {customerInstalledItems.length > 0 ? (
            <SearchableSelect
              options={customerInstalledItems.map((item) => ({
                value: item.id,
                label: `${item.title} (SN: ${item.serialNumber || 'N/A'}) - Installed ${item.installationDate}`,
              }))}
              value={selectedInstalledItemId}
              onChange={(val) => setSelectedInstalledItemId(val)}
              placeholder="Select Installed Equipment..."
              searchPlaceholder="Search equipment..."
              className="w-full px-3 py-2 rounded-lg border border-border bg-background outline-none font-bold text-xs"
            />
          ) : (
            <p className="p-3 bg-amber-500/10 border border-amber-500/20 text-amber-600 rounded-lg italic">
              No previous installed equipment recorded for this client. The service request will be logged under general site maintenance.
            </p>
          )}
        </div>

        {/* Defect Description & Priority */}
        <div className="space-y-4">
          <label className="font-bold text-sm text-foreground flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-primary" /> 3. Defect Description & Priority Level
          </label>

          <div>
            <label className="block font-semibold mb-1 text-muted-foreground">Priority Badge</label>
            <div className="grid grid-cols-4 gap-3">
              {(['LOW', 'MEDIUM', 'HIGH', 'URGENT'] as ServicePriority[]).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPriority(p)}
                  className={`p-3 rounded-xl border text-center font-extrabold transition-all ${
                    priority === p
                      ? p === 'URGENT'
                        ? 'bg-red-500 text-white border-red-600 shadow-md'
                        : 'bg-primary text-primary-foreground border-primary shadow-md'
                      : 'bg-muted/40 border-border text-muted-foreground hover:bg-muted'
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block font-semibold mb-1 text-muted-foreground">Defect / Symptom Details</label>
            <textarea
              required
              rows={4}
              value={defectDescription}
              onChange={(e) => setDefectDescription(e.target.value)}
              placeholder="Describe the issue reported by the customer (e.g., motor sensor failure, broken spring, control board error...)"
              className="w-full px-3 py-2 rounded-lg border border-border bg-background outline-none text-xs"
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 pt-4">
          <button
            type="button"
            onClick={() => router.push('/service')}
            className="px-4 py-2 rounded-xl border border-border bg-card font-bold hover:bg-muted"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-6 py-2 rounded-xl bg-primary text-primary-foreground font-bold hover:bg-primary/90 shadow-md flex items-center gap-2"
          >
            <Save className="w-4 h-4" /> Open Service Ticket
          </button>
        </div>
      </form>

      {/* Customer Modal */}
      <CustomerModal
        isOpen={isCustomerModalOpen}
        onClose={() => setIsCustomerModalOpen(false)}
        onSaveSuccess={refreshCustomers}
      />
    </div>
  );
}
