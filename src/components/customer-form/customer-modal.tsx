'use client';

import React, { useState, useEffect } from 'react';
import { Customer, CustomerType } from '@/types';
import { imfexStore } from '@/lib/store';
import { useI18n } from '@/lib/i18n-context';
import { getCustomerTypeLabel } from '@/lib/enum-labels';
import { X, Building2, User } from 'lucide-react';
import { toast } from '@/components/ui/toastr';
import { useEscapeKey } from '@/components/ui/use-escape-key';

interface CustomerModalProps {
  isOpen: boolean;
  onClose: () => void;
  customerToEdit?: Customer | null;
  onSaveSuccess: () => void;
}

export const CustomerModal: React.FC<CustomerModalProps> = ({
  isOpen,
  onClose,
  customerToEdit,
  onSaveSuccess,
}) => {
  const { t, locale } = useI18n();
  const [customerType, setCustomerType] = useState<CustomerType>('COMPANY');
  const [name, setName] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [taxId, setTaxId] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (customerToEdit) {
      setCustomerType(customerToEdit.customerType || 'COMPANY');
      if (customerToEdit.customerType === 'INDIVIDUAL') {
        const parts = (customerToEdit.name || '').split(' ');
        setFirstName(parts[0] || '');
        setLastName(parts.slice(1).join(' ') || '');
      } else {
        setName(customerToEdit.name || '');
      }
      setCompanyName(customerToEdit.companyName || '');
      setTaxId(customerToEdit.taxId || '');
      setEmail(customerToEdit.email || '');
      setPhone(customerToEdit.phone || '');
      setAddress(customerToEdit.address || '');
      setCity(customerToEdit.city || '');
      setNotes(customerToEdit.notes || '');
    } else {
      resetForm();
    }
  }, [customerToEdit, isOpen]);

  const resetForm = () => {
    setCustomerType('COMPANY');
    setName('');
    setFirstName('');
    setLastName('');
    setCompanyName('');
    setTaxId('');
    setEmail('');
    setPhone('');
    setAddress('');
    setCity('');
    setNotes('');
  };

  useEscapeKey(isOpen, onClose);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const finalName =
      customerType === 'INDIVIDUAL'
        ? `${firstName.trim()} ${lastName.trim()}`.trim() || 'Unnamed Individual'
        : name.trim() || companyName.trim() || 'Unnamed Company';

    const newId = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `cust-${Date.now()}`;
    const payload: Customer = {
      id: customerToEdit?.id || newId,
      customerType,
      name: finalName,
      companyName: customerType !== 'INDIVIDUAL' ? companyName : undefined,
      taxId: customerType !== 'INDIVIDUAL' ? taxId : undefined,
      email,
      phone,
      address,
      city,
      notes,
      createdAt: customerToEdit?.createdAt || new Date().toISOString(),
    };

    imfexStore.saveCustomer(payload);
    toast.success('Клиентот е зачуван!', `Клиентот ${finalName} е снимен во базата.`);
    onSaveSuccess();
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4"
      role="dialog"
      aria-modal="true"
      aria-label={customerToEdit ? 'Уреди клиент' : 'Нов клиент'}
    >
      <div className="bg-card border border-border rounded-2xl shadow-xl w-full max-w-xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-muted/40">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-primary/10 text-primary rounded-lg">
              {customerType === 'INDIVIDUAL' ? (
                <User className="w-5 h-5" />
              ) : (
                <Building2 className="w-5 h-5" />
              )}
            </div>
            <div>
              <h3 className="font-bold text-base">
                {customerToEdit ? t('customer_modal.edit_title') : t('customer_modal.add_title')}
              </h3>
              <p className="text-xs text-muted-foreground">
                {t('customer_modal.subtitle')}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={t('customer_modal.cancel')}
            className="p-1.5 text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Dynamic Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto flex-1">
          {/* Customer Type Selector */}
          <div>
            <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">
              {t('customer_modal.classification')}
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {(['COMPANY', 'PARTNER', 'INDIVIDUAL', 'OTHER'] as CustomerType[]).map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setCustomerType(type)}
                  className={`py-2 px-2 rounded-lg border text-xs font-semibold flex flex-col items-center gap-1 transition-all cursor-pointer ${
                    customerType === type
                      ? 'border-primary bg-primary/10 text-primary shadow-sm'
                      : 'border-border bg-card text-muted-foreground hover:bg-muted'
                  }`}
                >
                  {type === 'INDIVIDUAL' ? (
                    <User className="w-4 h-4" />
                  ) : (
                    <Building2 className="w-4 h-4" />
                  )}
                  <span className="text-[11px]">{getCustomerTypeLabel(type, locale)}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Conditional Input Fields */}
          {customerType === 'INDIVIDUAL' ? (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold mb-1">{t('customer_modal.first_name')}</label>
                <input
                  type="text"
                  required
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="пр. Александар"
                  className="w-full px-3 py-2 text-xs rounded-lg border border-border bg-background outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1">{t('customer_modal.last_name')}</label>
                <input
                  type="text"
                  required
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="пр. Петровски"
                  className="w-full px-3 py-2 text-xs rounded-lg border border-border bg-background outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold mb-1">{t('customer_modal.company_name')}</label>
                <input
                  type="text"
                  required
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="пр. Логистика Плус ДООЕЛ"
                  className="w-full px-3 py-2 text-xs rounded-lg border border-border bg-background outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold mb-1">{t('customer_modal.tax_id')}</label>
                  <input
                    type="text"
                    value={taxId}
                    onChange={(e) => setTaxId(e.target.value)}
                    placeholder="пр. MK4030012345678"
                    className="w-full px-3 py-2 text-xs rounded-lg border border-border bg-background outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1">{t('customer_modal.contact_person')}</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="пр. Марко Стојановски"
                    className="w-full px-3 py-2 text-xs rounded-lg border border-border bg-background outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Shared Fields */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold mb-1">{t('customer_modal.email')}</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="client@company.com"
                className="w-full px-3 py-2 text-xs rounded-lg border border-border bg-background outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1">{t('customer_modal.phone')}</label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+389 70 123 456"
                className="w-full px-3 py-2 text-xs rounded-lg border border-border bg-background outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold mb-1">{t('customer_modal.address')}</label>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Ул. Индустриска бр. 12"
                className="w-full px-3 py-2 text-xs rounded-lg border border-border bg-background outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1">{t('customer_modal.city')}</label>
              <input
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="Скопје"
                className="w-full px-3 py-2 text-xs rounded-lg border border-border bg-background outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold mb-1">{t('customer_modal.notes')}</label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="..."
              className="w-full px-3 py-2 text-xs rounded-lg border border-border bg-background outline-none focus:ring-2 focus:ring-primary resize-none"
            />
          </div>

          {/* Footer actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold rounded-lg border border-border bg-card hover:bg-muted transition-colors cursor-pointer"
            >
              {t('customer_modal.cancel')}
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-xs font-semibold rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-all shadow-sm cursor-pointer"
            >
              {customerToEdit ? t('customer_modal.update') : t('customer_modal.save')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
