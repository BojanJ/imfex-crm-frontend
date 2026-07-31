'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Customer, Offer, OfferItem, OfferStatus, Product, ServiceType } from '@/types';
import { imfexStore } from '@/lib/store';
import { CustomerModal } from '@/components/customer-form/customer-modal';
import { PdfModal } from '@/components/pdf/pdf-modal';
import { generateMultiPagePdf } from '@/lib/pdf-generator';
import { PrintableOfferDocument } from '@/components/pdf/printable-offer-document';
import { SearchableSelect } from '@/components/ui/searchable-select';
import {
  Plus,
  Trash2,
  Save,
  FileText,
  UserPlus,
  Building2,
  Calculator,
  CheckSquare,
  Square,
  Sparkles,
  ArrowLeft,
  Mail,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Percent,
} from 'lucide-react';

interface OfferBuilderFormProps {
  existingOffer?: Offer | null;
}

export const OfferBuilderForm: React.FC<OfferBuilderFormProps> = ({ existingOffer }) => {
  const router = useRouter();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>(
    existingOffer?.customerId || ''
  );

  const [status, setStatus] = useState<OfferStatus>(existingOffer?.status || 'DRAFT');
  const [taxRate, setTaxRate] = useState<number>(existingOffer?.taxRate ?? 18.00);
  const [discountRate, setDiscountRate] = useState<number>(existingOffer?.discountRate ?? 0.00);
  const [validUntil, setValidUntil] = useState<string>(
    existingOffer?.validUntil || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  );

  const [items, setItems] = useState<OfferItem[]>(
    existingOffer?.items || [
      {
        id: `item-${Date.now()}`,
        serviceTypes: ['PRODUCT', 'INSTALLATION'],
        productId: 'prod-gar-01',
        productModelId: 'mod-gar-1',
        customTitle: 'Main Entrance Sectional Garage Door',
        widthMm: 4000,
        heightMm: 3000,
        quantity: 1,
        unitPrice: 945,
        totalPrice: 945,
        specifications: [
          { specificationKeyId: 'spec-gar-panel', specificationOptionId: 'opt-gar-p2' },
        ],
      },
    ]
  );

  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);
  const [isPdfModalOpen, setIsPdfModalOpen] = useState(false);
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
  const [emailSuccessMsg, setEmailSuccessMsg] = useState('');
  const [savedOfferForPdf, setSavedOfferForPdf] = useState<Offer | null>(existingOffer || null);

  useEffect(() => {
    setCustomers(imfexStore.getCustomers());
    const prods = imfexStore.getProducts();
    setProducts(prods);

    if (!selectedCustomerId && customers.length > 0) {
      setSelectedCustomerId(customers[0].id);
    }
  }, []);

  const refreshCustomers = () => {
    const list = imfexStore.getCustomers();
    setCustomers(list);
    if (list.length > 0) setSelectedCustomerId(list[list.length - 1].id);
  };

  const calculateItemUnitPrice = (item: OfferItem): number => {
    if (!item.productId || !item.productModelId) return item.unitPrice || 0;
    const product = products.find((p) => p.id === item.productId);
    if (!product) return item.unitPrice || 0;
    const model = product.models.find((m) => m.id === item.productModelId);
    let price = Number(model?.basePrice || 0);

    item.specifications.forEach((specSel) => {
      const key = product.specificationKeys.find((k) => k.id === specSel.specificationKeyId);
      if (key && specSel.specificationOptionId) {
        const option = key.options.find((o) => o.id === specSel.specificationOptionId);
        if (option) price += Number(option.priceModifier || 0);
      }
    });

    if (item.widthMm && item.heightMm) {
      const areaSqM = (item.widthMm * item.heightMm) / 1000000;
      if (areaSqM > 8) {
        price += (areaSqM - 8) * 45;
      }
    }
    return Math.round(price * 100) / 100;
  };

  const handleUpdateItem = (index: number, updatedFields: Partial<OfferItem>) => {
    setItems((prev) => {
      const copy = [...prev];
      const current = { ...copy[index], ...updatedFields };

      if (
        updatedFields.productId !== undefined ||
        updatedFields.productModelId !== undefined ||
        updatedFields.specifications !== undefined ||
        updatedFields.widthMm !== undefined ||
        updatedFields.heightMm !== undefined
      ) {
        current.unitPrice = calculateItemUnitPrice(current);
      }

      current.totalPrice = Math.round(current.unitPrice * current.quantity * 100) / 100;
      copy[index] = current;
      return copy;
    });
  };

  const handleAddItem = () => {
    const firstProd = products[0];
    const firstModel = firstProd?.models[0];
    const newItem: OfferItem = {
      id: `item-${Date.now()}`,
      serviceTypes: ['PRODUCT', 'INSTALLATION'],
      productId: firstProd?.id,
      productModelId: firstModel?.id,
      customTitle: firstProd ? `${firstProd.name}` : 'New Offer Item',
      widthMm: 3000,
      heightMm: 2500,
      quantity: 1,
      unitPrice: firstModel?.basePrice || 500,
      totalPrice: firstModel?.basePrice || 500,
      specifications: [],
    };
    setItems((prev) => [...prev, newItem]);
  };

  const handleRemoveItem = (index: number) => {
    if (items.length <= 1) return;
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleToggleServiceType = (index: number, service: ServiceType) => {
    const item = items[index];
    const hasService = item.serviceTypes.includes(service);
    const updatedServices = hasService
      ? item.serviceTypes.filter((s) => s !== service)
      : [...item.serviceTypes, service];

    handleUpdateItem(index, { serviceTypes: updatedServices });
  };

  const handleSpecOptionChange = (
    itemIndex: number,
    specKeyId: string,
    optionId?: string,
    customValue?: string
  ) => {
    const item = items[itemIndex];
    const existingSpecs = [...item.specifications];
    const specIdx = existingSpecs.findIndex((s) => s.specificationKeyId === specKeyId);

    if (specIdx >= 0) {
      existingSpecs[specIdx] = {
        specificationKeyId: specKeyId,
        specificationOptionId: optionId,
        customValue: customValue,
      };
    } else {
      existingSpecs.push({
        specificationKeyId: specKeyId,
        specificationOptionId: optionId,
        customValue: customValue,
      });
    }

    handleUpdateItem(itemIndex, { specifications: existingSpecs });
  };

  // Calculations with Discount (Workflow 4.1.3)
  const subtotal = items.reduce((acc, i) => acc + (i.totalPrice || 0), 0);
  const discountAmount = Math.round(((subtotal * discountRate) / 100) * 100) / 100;
  const taxableSubtotal = Math.max(0, subtotal - discountAmount);
  const taxAmount = Math.round(((taxableSubtotal * taxRate) / 100) * 100) / 100;
  const totalAmount = Math.round((taxableSubtotal + taxAmount) * 100) / 100;

  const selectedCustomerObj = customers.find((c) => c.id === selectedCustomerId);

  const handleSaveOffer = (forcedStatus?: OfferStatus): Offer => {
    const targetStatus = forcedStatus || status;
    const offerPayload: Offer = {
      id: existingOffer?.id || `off-${Date.now()}`,
      offerNumber: existingOffer?.offerNumber || imfexStore.generateOfferNumber(),
      customerId: selectedCustomerId,
      customer: selectedCustomerObj,
      createdByUserId: 'usr-admin-1',
      status: targetStatus,
      taxRate,
      discountRate,
      discountAmount,
      subtotal,
      taxAmount,
      totalAmount,
      validUntil,
      createdAt: existingOffer?.createdAt || new Date().toISOString(),
      items,
    };

    const saved = imfexStore.saveOffer(offerPayload);
    // Trigger status setter to fire auto-project creation if ACCEPTED
    imfexStore.setOfferStatus(saved.id, targetStatus);
    setSavedOfferForPdf(saved);

    // Save PDF document record to Client Documentation
    imfexStore.saveDocument({
      id: `doc-${Date.now()}`,
      customerId: selectedCustomerId,
      offerId: saved.id,
      title: `Quote ${saved.offerNumber}.pdf`,
      fileType: 'PDF',
      fileUrl: `/docs/${saved.offerNumber}.pdf`,
      createdAt: new Date().toISOString(),
    });

    return saved;
  };

  const handleSaveAndRedirect = () => {
    handleSaveOffer();
    router.push('/offers');
  };

  const handlePreviewPdf = () => {
    const saved = handleSaveOffer();
    setIsPdfModalOpen(true);
  };

  const [recipientEmail, setRecipientEmail] = useState('');
  const [customEmailMessage, setCustomEmailMessage] = useState('');
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [emailErrorMsg, setEmailErrorMsg] = useState('');

  useEffect(() => {
    if (selectedCustomerObj?.email) {
      setRecipientEmail(selectedCustomerObj.email);
    }
  }, [selectedCustomerObj]);

  const handleSendEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setEmailErrorMsg('');
    setIsSendingEmail(true);

    const saved = handleSaveOffer('SENT');
    setStatus('SENT');

    let pdfBase64 = '';
    try {
      const element = document.getElementById('printable-offer-document') || document.getElementById('email-printable-offer-container');
      if (element) {
        const result = await generateMultiPagePdf(element);
        pdfBase64 = result.pdfBase64;
      }
    } catch (e) {
      console.warn('PDF capture notice:', e);
    }

    const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://imfex-crm-backend.onrender.com';

    try {
      const res = await fetch(`${API_BASE_URL}/api/email/send-offer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: recipientEmail || selectedCustomerObj?.email || 'nabavki@logistika.mk',
          customerName: selectedCustomerObj?.name || 'Клиент',
          offerNumber: saved.offerNumber,
          totalAmount: totalAmount,
          customMessage: customEmailMessage,
          pdfBase64: pdfBase64,
        }),
      });

      if (res.ok) {
        setEmailSuccessMsg('Понудата и PDF документот се успешно испратени по е-пошта! Статусот е ажуриран во SENT.');
        setTimeout(() => {
          setEmailSuccessMsg('');
          setIsEmailModalOpen(false);
        }, 2200);
      } else {
        const data = await res.json();
        setEmailErrorMsg(data.error || 'Настана грешка при испраќање на е-поштата.');
      }
    } catch (err: any) {
      setEmailErrorMsg('Мрежна грешка при испраќање е-пошта.');
    } finally {
      setIsSendingEmail(false);
    }
  };

  return (
    <div className="space-y-6 pb-24">
      {/* Top Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-card p-4 rounded-xl border border-border">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push('/offers')}
            className="p-2 border border-border rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h2 className="font-extrabold text-lg flex items-center gap-2">
              <span>{existingOffer ? `Edit Offer ${existingOffer.offerNumber}` : 'Create Interactive Offer Quote'}</span>
            </h2>
            <p className="text-xs text-muted-foreground">
              Sales workflow 4.1: Custom specifications, discounts, VAT totals & auto-project creation.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setIsEmailModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 hover:bg-emerald-500/20 transition-all shadow-sm"
          >
            <Mail className="w-4 h-4" /> Send Email
          </button>
          <button
            onClick={handlePreviewPdf}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg border border-border bg-card hover:bg-muted text-foreground transition-all shadow-sm"
          >
            <FileText className="w-4 h-4 text-blue-500" /> Export PDF
          </button>
          <button
            onClick={handleSaveAndRedirect}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-all shadow-sm"
          >
            <Save className="w-4 h-4" /> Save Offer
          </button>
        </div>
      </div>

      {/* Customer Selection & Quote Metadata Box */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Customer Select Card */}
        <div className="md:col-span-2 bg-card border border-border rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <h3 className="font-bold text-sm text-foreground flex items-center gap-2">
              <Building2 className="w-4 h-4 text-primary" /> Target Customer Selection
            </h3>
            <button
              onClick={() => setIsCustomerModalOpen(true)}
              className="flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
            >
              <UserPlus className="w-3.5 h-3.5" /> + New Customer
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold mb-1">Choose Client Account</label>
              <SearchableSelect
                options={customers.map((c) => ({
                  value: c.id,
                  label: `${c.companyName || c.name} (${c.customerType})`,
                  sublabel: c.email ? `${c.email} • ${c.phone || ''}` : undefined,
                }))}
                value={selectedCustomerId}
                onChange={(val) => setSelectedCustomerId(val)}
                placeholder="Choose Client Account..."
                searchPlaceholder="Search client account..."
                className="w-full px-3 py-2 text-xs rounded-lg border border-border bg-background outline-none font-semibold focus:ring-2 focus:ring-primary"
              />
            </div>

            {selectedCustomerObj && (
              <div className="p-3 bg-muted/40 rounded-lg text-xs space-y-1 border border-border">
                <p className="font-bold text-foreground">{selectedCustomerObj.companyName || selectedCustomerObj.name}</p>
                {selectedCustomerObj.taxId && <p className="text-muted-foreground">VAT: {selectedCustomerObj.taxId}</p>}
                <p className="text-muted-foreground">{selectedCustomerObj.email} • {selectedCustomerObj.phone}</p>
                <p className="text-muted-foreground">{selectedCustomerObj.address}, {selectedCustomerObj.city}</p>
              </div>
            )}
          </div>
        </div>

        {/* Offer Settings Card */}
        <div className="bg-card border border-border rounded-xl p-5 space-y-4">
          <h3 className="font-bold text-sm text-foreground flex items-center gap-2 border-b border-border pb-3">
            <Calculator className="w-4 h-4 text-primary" /> Status & Calculation Rules
          </h3>

          <div className="space-y-3">
            <div>
              <label className="block text-xs font-semibold mb-1">Quote Status Workflow</label>
              <SearchableSelect
                options={[
                  { value: 'DRAFT', label: 'DRAFT' },
                  { value: 'SENT', label: 'SENT' },
                  { value: 'ACCEPTED', label: 'ACCEPTED (Auto-Creates Project)' },
                  { value: 'REJECTED', label: 'REJECTED' },
                  { value: 'EXPIRED', label: 'EXPIRED' },
                ]}
                value={status}
                onChange={(val) => {
                  const newSt = val as OfferStatus;
                  setStatus(newSt);
                  if (newSt === 'ACCEPTED') {
                    alert('Quote marked as ACCEPTED! An Operational Project will be automatically generated upon save.');
                  }
                }}
                className="w-full px-3 py-1.5 text-xs rounded-lg border border-border bg-background font-bold text-primary outline-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold mb-1 flex items-center gap-1">
                  <Percent className="w-3 h-3 text-muted-foreground" /> Discount (%)
                </label>
                <input
                  type="number"
                  step="0.5"
                  min="0"
                  max="100"
                  value={discountRate}
                  onChange={(e) => setDiscountRate(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-1.5 text-xs rounded-lg border border-border bg-background font-bold text-emerald-600 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1">Tax Rate (%)</label>
                <input
                  type="number"
                  step="0.5"
                  value={taxRate}
                  onChange={(e) => setTaxRate(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-1.5 text-xs rounded-lg border border-border bg-background font-bold outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1">Quote Validity Date</label>
              <input
                type="date"
                value={validUntil}
                onChange={(e) => setValidUntil(e.target.value)}
                className="w-full px-3 py-1.5 text-xs rounded-lg border border-border bg-background outline-none font-medium"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Dynamic Line Items Builder */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Configured Line Items ({items.length})
          </h3>
          <button
            onClick={handleAddItem}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-all"
          >
            <Plus className="w-3.5 h-3.5" /> Add Line Item
          </button>
        </div>

        {/* Items List */}
        <div className="space-y-4">
          {items.map((item, idx) => {
            const hasProduct = item.serviceTypes.includes('PRODUCT');
            const selectedProd = products.find((p) => p.id === item.productId);

            return (
              <div
                key={item.id || idx}
                className="bg-card border border-border rounded-xl p-5 shadow-sm space-y-4 relative group"
              >
                {/* Item Header & Scope Selector */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-3">
                  <div className="flex items-center gap-3">
                    <span className="w-6 h-6 rounded-full bg-primary/10 text-primary font-bold text-xs flex items-center justify-center">
                      #{idx + 1}
                    </span>
                    <input
                      type="text"
                      value={item.customTitle || ''}
                      onChange={(e) => handleUpdateItem(idx, { customTitle: e.target.value })}
                      placeholder="Line Item Title / Custom Service Description"
                      className="font-bold text-sm px-2 py-1 rounded border border-transparent hover:border-border focus:border-primary outline-none bg-transparent w-72 sm:w-96"
                    />
                  </div>

                  {/* Scope Checkboxes */}
                  <div className="flex items-center gap-3 bg-muted/50 px-3 py-1.5 rounded-lg border border-border text-xs font-semibold">
                    <span className="text-[10px] text-muted-foreground uppercase font-bold">Scope:</span>
                    {(['PRODUCT', 'INSTALLATION', 'SERVICE'] as ServiceType[]).map((service) => {
                      const checked = item.serviceTypes.includes(service);
                      return (
                        <button
                          key={service}
                          type="button"
                          onClick={() => handleToggleServiceType(idx, service)}
                          className={`flex items-center gap-1.5 px-2 py-0.5 rounded transition-all ${
                            checked
                              ? 'bg-primary text-primary-foreground font-bold shadow-xs'
                              : 'text-muted-foreground hover:text-foreground'
                          }`}
                        >
                          {checked ? <CheckSquare className="w-3.5 h-3.5" /> : <Square className="w-3.5 h-3.5" />}
                          {service}
                        </button>
                      );
                    })}

                    {items.length > 1 && (
                      <button
                        onClick={() => handleRemoveItem(idx)}
                        className="ml-2 text-red-500 hover:text-red-600 p-1 hover:bg-red-500/10 rounded transition-colors"
                        title="Remove Line Item"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Product & Spec Configurator Grid */}
                {hasProduct ? (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
                    {/* Product & Model Picker */}
                    <div className="space-y-3">
                      <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider">
                        Product & Base Model
                      </label>
                      <div>
                        <label className="block text-[11px] font-semibold text-muted-foreground mb-1">Product Family</label>
                        <SearchableSelect
                          options={products.map((p) => ({
                            value: p.id,
                            label: `${p.name} (${p.code})`,
                          }))}
                          value={item.productId || ''}
                          onChange={(pId) => {
                            const pObj = products.find((p) => p.id === pId);
                            const firstMod = pObj?.models[0];
                            handleUpdateItem(idx, {
                              productId: pId,
                              productModelId: firstMod?.id,
                              customTitle: pObj?.name || item.customTitle,
                              specifications: [],
                            });
                          }}
                          placeholder="Select Product Family..."
                          searchPlaceholder="Search products..."
                          className="w-full px-3 py-1.5 text-xs rounded-lg border border-border bg-background outline-none font-semibold"
                        />
                      </div>

                      {selectedProd && (
                        <div>
                          <label className="block text-[11px] font-semibold text-muted-foreground mb-1">Model Variant</label>
                          <SearchableSelect
                            options={selectedProd.models.map((m) => ({
                              value: m.id,
                              label: `${m.name} - (€${Number(m.basePrice).toFixed(2)})`,
                            }))}
                            value={item.productModelId || ''}
                            onChange={(val) => handleUpdateItem(idx, { productModelId: val })}
                            placeholder="Select Model Variant..."
                            searchPlaceholder="Search model variants..."
                            className="w-full px-3 py-1.5 text-xs rounded-lg border border-border bg-background outline-none font-semibold"
                          />
                        </div>
                      )}

                      {/* Dimensions (W x H) */}
                      <div className="grid grid-cols-2 gap-2 pt-1">
                        <div>
                          <label className="block text-[10px] font-bold text-muted-foreground uppercase">Width (mm)</label>
                          <input
                            type="number"
                            value={item.widthMm || ''}
                            onChange={(e) => handleUpdateItem(idx, { widthMm: parseInt(e.target.value) || 0 })}
                            className="w-full px-2 py-1 text-xs rounded border border-border bg-background font-semibold outline-none"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-muted-foreground uppercase">Height (mm)</label>
                          <input
                            type="number"
                            value={item.heightMm || ''}
                            onChange={(e) => handleUpdateItem(idx, { heightMm: parseInt(e.target.value) || 0 })}
                            className="w-full px-2 py-1 text-xs rounded border border-border bg-background font-semibold outline-none"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Dynamic Specifications Configurator */}
                    <div className="md:col-span-2 bg-muted/20 border border-border rounded-xl p-4 space-y-3">
                      <div className="flex items-center justify-between border-b border-border pb-2">
                        <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                          <Sparkles className="w-3.5 h-3.5 text-amber-500" /> Dynamic Product Specifications
                        </span>
                        <span className="text-[10px] text-muted-foreground">Auto-updates unit price</span>
                      </div>

                      {selectedProd?.specificationKeys.length === 0 ? (
                        <p className="text-xs text-muted-foreground italic">No specifications defined for this product.</p>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {selectedProd?.specificationKeys.map((key) => {
                            const specSel = item.specifications.find((s) => s.specificationKeyId === key.id);

                            return (
                              <div key={key.id} className="space-y-1">
                                <label className="block text-[11px] font-bold text-foreground">
                                  {key.name}
                                </label>

                                {key.inputType === 'SELECT' || key.inputType === 'MULTISELECT' ? (
                                  <SearchableSelect
                                    options={[
                                      { value: '', label: '-- Select Option --' },
                                      ...key.options.map((opt) => ({
                                        value: opt.id,
                                        label: `${opt.label} ${opt.priceModifier !== 0 ? `(+€${opt.priceModifier})` : ''}`,
                                      })),
                                    ]}
                                    value={specSel?.specificationOptionId || ''}
                                    onChange={(val) => handleSpecOptionChange(idx, key.id, val)}
                                    placeholder="-- Select Option --"
                                    searchPlaceholder="Search options..."
                                    className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-border bg-background outline-none font-medium"
                                  />
                                ) : (
                                  <input
                                    type={key.inputType === 'NUMBER' ? 'number' : 'text'}
                                    value={specSel?.customValue || ''}
                                    onChange={(e) => handleSpecOptionChange(idx, key.id, undefined, e.target.value)}
                                    placeholder={`Enter ${key.name}`}
                                    className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-border bg-background outline-none"
                                  />
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="p-4 bg-muted/20 border border-border rounded-xl text-xs text-muted-foreground italic">
                    Pure Service / Installation item without dynamic physical product options.
                  </div>
                )}

                {/* Price Calculation Footer Bar */}
                <div className="flex flex-wrap items-center justify-between gap-4 pt-3 border-t border-border bg-muted/30 -mx-5 -mb-5 p-4 rounded-b-xl">
                  <div className="flex items-center gap-4">
                    <div>
                      <span className="block text-[10px] font-bold text-muted-foreground uppercase">Unit Price (€)</span>
                      <input
                        type="number"
                        step="0.01"
                        value={item.unitPrice}
                        onChange={(e) => handleUpdateItem(idx, { unitPrice: parseFloat(e.target.value) || 0 })}
                        className="w-28 px-2 py-1 text-xs font-extrabold rounded border border-border bg-background text-primary outline-none"
                      />
                    </div>
                    <div>
                      <span className="block text-[10px] font-bold text-muted-foreground uppercase">Quantity</span>
                      <input
                        type="number"
                        min="1"
                        value={item.quantity}
                        onChange={(e) => handleUpdateItem(idx, { quantity: parseInt(e.target.value) || 1 })}
                        className="w-16 px-2 py-1 text-xs font-bold rounded border border-border bg-background outline-none text-center"
                      />
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase block">Line Item Total</span>
                    <span className="text-base font-extrabold text-foreground">
                      €{Number(item.totalPrice).toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Sticky Bottom Quote Summary Bar */}
      <div className="fixed bottom-0 left-0 right-0 z-20 bg-card/95 backdrop-blur-md border-t border-border p-4 shadow-2xl">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-6 text-xs">
            <div>
              <span className="text-muted-foreground block text-[10px] uppercase font-bold">Subtotal</span>
              <span className="font-bold text-sm">€{subtotal.toFixed(2)}</span>
            </div>
            {discountRate > 0 && (
              <div>
                <span className="text-muted-foreground block text-[10px] uppercase font-bold text-emerald-600">Discount ({discountRate}%)</span>
                <span className="font-bold text-sm text-emerald-600">-€{discountAmount.toFixed(2)}</span>
              </div>
            )}
            <div>
              <span className="text-muted-foreground block text-[10px] uppercase font-bold">VAT ({taxRate}%)</span>
              <span className="font-bold text-sm text-muted-foreground">€{taxAmount.toFixed(2)}</span>
            </div>
            <div className="pl-4 border-l border-border">
              <span className="text-muted-foreground block text-[10px] uppercase font-extrabold text-primary">Grand Total</span>
              <span className="font-black text-xl text-primary">€{totalAmount.toFixed(2)}</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsEmailModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-xl bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 hover:bg-emerald-500/20 transition-all shadow-sm"
            >
              <Mail className="w-4 h-4" /> Send Email
            </button>
            <button
              onClick={handlePreviewPdf}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl border border-border bg-card hover:bg-muted text-foreground transition-all shadow-sm"
            >
              <FileText className="w-4 h-4 text-blue-500" /> Export PDF
            </button>
            <button
              onClick={handleSaveAndRedirect}
              className="flex items-center gap-1.5 px-6 py-2 text-xs font-bold rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-all shadow-md"
            >
              <Save className="w-4 h-4" /> Save Quote
            </button>
          </div>
        </div>
      </div>

      {/* E-mail Dispatch Modal (Sales Workflow 4.1 Step 5) */}
      {isEmailModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="font-extrabold text-base flex items-center gap-2 text-foreground">
                <Mail className="w-5 h-5 text-emerald-500" /> Испрати Понуда по Е-пошта (Resend API)
              </h3>
              <button
                onClick={() => setIsEmailModalOpen(false)}
                className="text-muted-foreground hover:text-foreground text-sm font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            {emailSuccessMsg ? (
              <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 rounded-xl text-xs font-bold flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5 shrink-0" />
                <span>{emailSuccessMsg}</span>
              </div>
            ) : (
              <form onSubmit={handleSendEmailSubmit} className="space-y-4 text-xs">
                {emailErrorMsg && (
                  <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-600 rounded-xl text-xs font-semibold flex items-center gap-2">
                    <XCircle className="w-4 h-4 shrink-0" />
                    <span>{emailErrorMsg}</span>
                  </div>
                )}

                <div>
                  <label className="block font-semibold mb-1 text-foreground">Е-пошта на Примач *</label>
                  <input
                    type="email"
                    required
                    value={recipientEmail}
                    onChange={(e) => setRecipientEmail(e.target.value)}
                    placeholder="nabavki@logistika.mk"
                    className="w-full px-3 py-2 rounded-xl border border-border bg-background outline-none font-bold focus:ring-2 focus:ring-primary"
                  />
                </div>

                <div>
                  <label className="block font-semibold mb-1 text-foreground">Наслов на Пораката</label>
                  <input
                    type="text"
                    readOnly
                    value={`Комерцијална Понуда ${existingOffer?.offerNumber || 'OFF-2026-0001'} - ИМФЕКС ЕКСПОРТ-ИМПОРТ`}
                    className="w-full px-3 py-2 rounded-xl border border-border bg-muted text-muted-foreground outline-none font-bold cursor-not-allowed"
                  />
                </div>

                <div>
                  <label className="block font-semibold mb-1 text-foreground">Дополнителна Белешка / Соопштение</label>
                  <textarea
                    rows={3}
                    placeholder="Додадете сопствена белешка до клиентот за условите на понудата..."
                    value={customEmailMessage}
                    onChange={(e) => setCustomEmailMessage(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-border bg-background outline-none font-medium focus:ring-2 focus:ring-primary"
                  />
                </div>

                <div className="p-3 bg-muted/40 rounded-xl border border-border flex items-center justify-between text-muted-foreground text-[11px]">
                  <span className="flex items-center gap-1.5 font-semibold">
                    <FileText className="w-4 h-4 text-red-500" /> Прикачен PDF: Quote_${existingOffer?.offerNumber || 'OFF-2026'}.pdf
                  </span>
                  <span className="font-extrabold text-emerald-600 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">
                    Статусот се менува во SENT
                  </span>
                </div>

                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsEmailModalOpen(false)}
                    className="px-4 py-2 rounded-xl border border-border bg-card hover:bg-muted font-bold cursor-pointer"
                  >
                    Откажи
                  </button>
                  <button
                    type="submit"
                    disabled={isSendingEmail}
                    className="px-5 py-2 rounded-xl bg-emerald-600 text-white font-extrabold hover:bg-emerald-700 shadow-md flex items-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    <Mail className="w-4 h-4" />
                    <span>{isSendingEmail ? 'Се испраќа...' : 'Испрати по Е-пошта'}</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Customer Modal */}
      <CustomerModal
        isOpen={isCustomerModalOpen}
        onClose={() => setIsCustomerModalOpen(false)}
        onSaveSuccess={refreshCustomers}
      />

      {/* PDF Modal */}
      {savedOfferForPdf && (
        <PdfModal
          isOpen={isPdfModalOpen}
          onClose={() => setIsPdfModalOpen(false)}
          offer={savedOfferForPdf}
          products={products}
        />
      )}

      {/* Hidden Offscreen PDF Render Container for Email Dispatch Attachment */}
      {savedOfferForPdf && (
        <div style={{ position: 'absolute', left: '-9999px', top: '-9999px', width: '800px' }} id="email-printable-offer-container">
          <PrintableOfferDocument offer={savedOfferForPdf} products={products} />
        </div>
      )}
    </div>
  );
};
