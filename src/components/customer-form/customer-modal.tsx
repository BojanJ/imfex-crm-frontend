'use client';

import React, { useState, useEffect } from 'react';
import { Customer, CustomerType } from '@/types';
import { imfexStore } from '@/lib/store';
import { X, Building2, User, UserCheck, ShieldCheck } from 'lucide-react';

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
    onSaveSuccess();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-card border border-border rounded-xl shadow-2xl w-full max-w-xl overflow-hidden flex flex-col max-h-[90vh]">
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
                {customerToEdit ? 'Edit Customer Record' : 'Add New Customer'}
              </h3>
              <p className="text-xs text-muted-foreground">
                Configure client metadata & billing specifics for quote generation.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Dynamic Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto flex-1">
          {/* Customer Type Selector */}
          <div>
            <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">
              Customer Classification
            </label>
            <div className="grid grid-cols-4 gap-2">
              {(['COMPANY', 'PARTNER', 'INDIVIDUAL', 'OTHER'] as CustomerType[]).map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setCustomerType(type)}
                  className={`py-2 px-2 rounded-lg border text-xs font-semibold flex flex-col items-center gap-1 transition-all ${
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
                  {type}
                </button>
              ))}
            </div>
          </div>

          {/* Conditional Input Fields */}
          {customerType === 'INDIVIDUAL' ? (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold mb-1">First Name *</label>
                <input
                  type="text"
                  required
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="e.g. Alexander"
                  className="w-full px-3 py-2 text-xs rounded-lg border border-border bg-background outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1">Last Name *</label>
                <input
                  type="text"
                  required
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="e.g. Wright"
                  className="w-full px-3 py-2 text-xs rounded-lg border border-border bg-background outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold mb-1">Company Name *</label>
                <input
                  type="text"
                  required
                  value={companyName}
                  onChange={(e) => {
                    setCompanyName(e.target.value);
                    setName(e.target.value);
                  }}
                  placeholder="e.g. Logistics Hub Europe GmbH"
                  className="w-full px-3 py-2 text-xs rounded-lg border border-border bg-background outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold mb-1">VAT / Tax ID (EDB)</label>
                  <input
                    type="text"
                    value={taxId}
                    onChange={(e) => setTaxId(e.target.value)}
                    placeholder="e.g. DE812345678"
                    className="w-full px-3 py-2 text-xs rounded-lg border border-border bg-background outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1">Contact Person</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Hans Mueller (Procurement Manager)"
                    className="w-full px-3 py-2 text-xs rounded-lg border border-border bg-background outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Shared Fields */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold mb-1">Email Address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="client@company.com"
                className="w-full px-3 py-2 text-xs rounded-lg border border-border bg-background outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1">Phone Number</label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+49 89 1234567"
                className="w-full px-3 py-2 text-xs rounded-lg border border-border bg-background outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold mb-1">Billing / Shipping Address</label>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Industriestrasse 42"
                className="w-full px-3 py-2 text-xs rounded-lg border border-border bg-background outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1">City & Country</label>
              <input
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="Munich, Germany"
                className="w-full px-3 py-2 text-xs rounded-lg border border-border bg-background outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold mb-1">Account Notes / Special Requirements</label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Requires 18% standard VAT breakdown. Key account."
              className="w-full px-3 py-2 text-xs rounded-lg border border-border bg-background outline-none focus:ring-2 focus:ring-primary resize-none"
            />
          </div>

          {/* Footer actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold rounded-lg border border-border bg-card hover:bg-muted transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-xs font-semibold rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-all shadow-sm"
            >
              {customerToEdit ? 'Update Customer' : 'Save Customer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
