'use client';

import React, { useState, useEffect } from 'react';
import { Offer, Project, ProjectStatus, PaymentMethod, SalesInvoice } from '@/types';
import { imfexStore } from '@/lib/store';
import { toast } from '@/components/ui/toastr';
import {
  Euro,
  X,
  CheckCircle2,
  Truck,
  SlidersHorizontal,
  BookmarkCheck,
  FileText,
} from 'lucide-react';

interface AdvancePaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  project?: Project | null;
  offer?: Offer | null;
  onSuccess?: (result: {
    project?: Project;
    advanceInvoice?: SalesInvoice;
  }) => void;
}

export const AdvancePaymentModal: React.FC<AdvancePaymentModalProps> = ({
  isOpen,
  onClose,
  project,
  offer,
  onSuccess,
}) => {
  const resolvedOffer = offer || (project?.offerId ? imfexStore.getOfferById(project.offerId) : project?.offer);
  const totalAmount = Number(resolvedOffer?.totalAmount || 1000);
  const defaultAdvance = Math.round(totalAmount * 0.7 * 100) / 100;

  const [amount, setAmount] = useState<number>(defaultAdvance);
  const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [method, setMethod] = useState<PaymentMethod>('BANK');
  const [bankAccount, setBankAccount] = useState<string>('Комерцијална Банка — Ж-сметка');
  const [createAdvanceInvoice, setCreateAdvanceInvoice] = useState<boolean>(true);
  const [nextAction, setNextAction] = useState<'PROCUREMENT_AND_DRAFT' | 'CUSTOM_STATUS' | 'ONLY_RECORD'>(
    'PROCUREMENT_AND_DRAFT'
  );
  const [customStatus, setCustomStatus] = useState<ProjectStatus>('PROCUREMENT');
  const [supplierName, setSupplierName] = useState<string>('Doors Impex');
  const [notes, setNotes] = useState<string>('');

  const partners = imfexStore
    .getCustomers()
    .filter((c) => c.customerType === 'PARTNER' || c.customerType === 'COMPANY');

  useEffect(() => {
    if (isOpen) {
      const baseTot = Number(resolvedOffer?.totalAmount || 1000);
      setAmount(Math.round(baseTot * 0.7 * 100) / 100);
      setDate(new Date().toISOString().split('T')[0]);
    }
  }, [isOpen, resolvedOffer?.id, project?.id]);

  if (!isOpen) return null;

  const clientLabel =
    project?.customer?.companyName ||
    project?.customer?.name ||
    resolvedOffer?.customer?.companyName ||
    resolvedOffer?.customer?.name ||
    'Клиент';

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const customerId = project?.customerId || resolvedOffer?.customerId || '';

    const result = imfexStore.executeAdvancePaymentFlow({
      projectId: project?.id,
      offerId: resolvedOffer?.id,
      customerId,
      amount: Number(amount || 0),
      date,
      method,
      bankAccount,
      createAdvanceInvoice,
      nextAction,
      customProjectStatus: customStatus,
      preferredSupplierName: supplierName || 'Doors Impex',
      notes,
    });

    if (nextAction === 'PROCUREMENT_AND_DRAFT') {
      toast.success(
        'Аванс евидентиран & Нацрт-набавка креирана!',
        `Проектот е во статус НАБАВКА и креирана е нацрт-набавка (${result.draftPurchase?.internalNumber || ''}).`
      );
    } else if (nextAction === 'CUSTOM_STATUS') {
      toast.success(
        'Аванс евидентиран!',
        `Проектот е префрлен во статус ${customStatus}.`
      );
    } else {
      toast.success(
        'Уплатата на аванс е евидентирана',
        `Запишана уплата од €${Number(amount).toFixed(2)}${result.advanceInvoice ? ` со Авансна фактура ${result.advanceInvoice.invoiceNumber}` : ''}.`
      );
    }

    if (onSuccess) {
      onSuccess({ project: result.project, advanceInvoice: result.advanceInvoice });
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/65 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-card border border-border rounded-2xl max-w-xl w-full p-6 shadow-2xl space-y-5 text-xs max-h-[92vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-border pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-500/15 text-emerald-500">
              <Euro className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-base text-foreground">
                Евидентирај уплата на аванс
              </h3>
              <p className="text-[11px] text-muted-foreground">
                Клиент: <strong>{clientLabel}</strong>{' '}
                {project ? `• Проект: ${project.projectNumber}` : ''}{' '}
                {resolvedOffer ? `• Понуда: ${resolvedOffer.offerNumber} (€${totalAmount.toFixed(2)})` : ''}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Payment Details */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-muted/30 p-3.5 rounded-xl border border-border">
            <div>
              <label className="block font-bold mb-1 text-foreground">Износ на аванс (€) *</label>
              <input
                type="number"
                step="0.01"
                required
                value={amount}
                onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-2 rounded-lg border border-border bg-background font-extrabold text-emerald-500 outline-none"
              />
              <div className="flex gap-1.5 mt-1.5">
                {[50, 70, 100].map((pct) => (
                  <button
                    key={pct}
                    type="button"
                    onClick={() => setAmount(Math.round(((totalAmount * pct) / 100) * 100) / 100)}
                    className="px-2 py-0.5 text-[10px] font-bold rounded bg-secondary text-secondary-foreground hover:bg-primary hover:text-primary-foreground cursor-pointer"
                  >
                    {pct}%
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block font-bold mb-1 text-foreground">Датум на уплата *</label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-border bg-background font-semibold outline-none"
              />
            </div>

            <div>
              <label className="block font-bold mb-1 text-foreground">Начин / Сметка</label>
              <select
                value={method}
                onChange={(e) => setMethod(e.target.value as PaymentMethod)}
                className="w-full px-3 py-2 rounded-lg border border-border bg-background font-semibold outline-none"
              >
                <option value="BANK">Банкарска сметка (Извод)</option>
                <option value="CASH">Готовина / Благајна</option>
                <option value="CARD">Картичка</option>
              </select>
            </div>
          </div>

          {/* Checkbox: Generate Official Advance Invoice */}
          <label className="flex items-center gap-2.5 p-3 rounded-xl border border-primary/30 bg-primary/5 cursor-pointer">
            <input
              type="checkbox"
              checked={createAdvanceInvoice}
              onChange={(e) => setCreateAdvanceInvoice(e.target.checked)}
              className="w-4 h-4 accent-primary"
            />
            <div className="flex-1">
              <span className="font-bold text-foreground flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-primary" /> Автоматски издај Авансна Фактура (со пресметан 18% ДДВ)
              </span>
              <span className="text-[11px] text-muted-foreground block">
                Овој аванс автоматски ќе се одбие кога ќе се издава Конечната фактура за проектот.
              </span>
            </div>
          </label>

          {/* 3 Choices for What Happens Next */}
          <div className="space-y-2.5">
            <label className="block font-extrabold text-foreground uppercase tracking-wider text-[11px]">
              Избери што да се случи со проектот и набавката:
            </label>

            {/* Option 1 */}
            <label
              onClick={() => setNextAction('PROCUREMENT_AND_DRAFT')}
              className={`flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer transition-all ${
                nextAction === 'PROCUREMENT_AND_DRAFT'
                  ? 'border-primary bg-primary/10 ring-1 ring-primary/30'
                  : 'border-border bg-background hover:bg-muted/40'
              }`}
            >
              <input
                type="radio"
                name="advanceNextAction"
                checked={nextAction === 'PROCUREMENT_AND_DRAFT'}
                onChange={() => setNextAction('PROCUREMENT_AND_DRAFT')}
                className="mt-1 accent-primary"
              />
              <div className="space-y-2 flex-1">
                <div className="flex items-center gap-2 font-bold text-foreground">
                  <Truck className="w-4 h-4 text-primary" />
                  <span>1. Премини во „Набавка“ + Креирај нацрт-набавка за ставките што ги нема на залиха</span>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Проектот веднаш добива статус <strong>НАБАВКА</strong> и во Финансии/Набавки се отвора нацрт-нарачка кон добавувач за вратите по нарачка и артиклите без залиха.
                </p>
                {nextAction === 'PROCUREMENT_AND_DRAFT' && (
                  <div className="pt-1">
                    <label className="block text-[10px] font-bold uppercase text-muted-foreground mb-1">
                      Добавувач / Партнер за нацрт-набавката:
                    </label>
                    <input
                      type="text"
                      list="suppliers-datalist"
                      value={supplierName}
                      onChange={(e) => setSupplierName(e.target.value)}
                      placeholder="пр. Doors Impex"
                      className="w-full px-3 py-1.5 rounded-lg border border-border bg-card font-bold text-foreground outline-none"
                    />
                    <datalist id="suppliers-datalist">
                      <option value="Doors Impex" />
                      {partners.map((p) => (
                        <option key={p.id} value={p.companyName || p.name} />
                      ))}
                    </datalist>
                  </div>
                )}
              </div>
            </label>

            {/* Option 2 */}
            <label
              onClick={() => setNextAction('CUSTOM_STATUS')}
              className={`flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer transition-all ${
                nextAction === 'CUSTOM_STATUS'
                  ? 'border-primary bg-primary/10 ring-1 ring-primary/30'
                  : 'border-border bg-background hover:bg-muted/40'
              }`}
            >
              <input
                type="radio"
                name="advanceNextAction"
                checked={nextAction === 'CUSTOM_STATUS'}
                onChange={() => setNextAction('CUSTOM_STATUS')}
                className="mt-1 accent-primary"
              />
              <div className="space-y-2 flex-1">
                <div className="flex items-center gap-2 font-bold text-foreground">
                  <SlidersHorizontal className="w-4 h-4 text-amber-500" />
                  <span>2. Избери рачно каде (во кој статус) да отиде проектот</span>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Проектот преминува во избраниот статус без автоматско креирање нацрт-набавка.
                </p>
                {nextAction === 'CUSTOM_STATUS' && (
                  <div className="pt-1">
                    <select
                      value={customStatus}
                      onChange={(e) => setCustomStatus(e.target.value as ProjectStatus)}
                      className="w-full px-3 py-1.5 rounded-lg border border-border bg-card font-bold text-primary outline-none"
                    >
                      <option value="PLANNED">1. Планирано (PLANNED)</option>
                      <option value="PROCUREMENT">2. Набавка (PROCUREMENT)</option>
                      <option value="PRODUCTION">3. Производство (PRODUCTION)</option>
                      <option value="INSTALLATION">4. Закажана Монтажа (INSTALLATION)</option>
                    </select>
                  </div>
                )}
              </div>
            </label>

            {/* Option 3 */}
            <label
              onClick={() => setNextAction('ONLY_RECORD')}
              className={`flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer transition-all ${
                nextAction === 'ONLY_RECORD'
                  ? 'border-primary bg-primary/10 ring-1 ring-primary/30'
                  : 'border-border bg-background hover:bg-muted/40'
              }`}
            >
              <input
                type="radio"
                name="advanceNextAction"
                checked={nextAction === 'ONLY_RECORD'}
                onChange={() => setNextAction('ONLY_RECORD')}
                className="mt-1 accent-primary"
              />
              <div className="space-y-1 flex-1">
                <div className="flex items-center gap-2 font-bold text-foreground">
                  <BookmarkCheck className="w-4 h-4 text-emerald-500" />
                  <span>3. Само евидентирај уплата на аванс (без промена на статус и без нарачка)</span>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Се запишува само финансиската уплата и авансната фактура, а проектот останува во тековната состојба.
                </p>
              </div>
            </label>
          </div>

          <div>
            <label className="block font-bold mb-1 text-muted-foreground">Забелешка за уплатата (Опционално)</label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="пр. Уплата по извод бр. 45 од Комерцијална Банка..."
              className="w-full px-3 py-2 rounded-lg border border-border bg-background outline-none"
            />
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-border">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-border bg-card hover:bg-muted font-bold cursor-pointer"
            >
              Откажи
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-emerald-600 text-white font-extrabold hover:bg-emerald-700 shadow-md flex items-center gap-1.5 cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4" /> Потврди и Евидентирај Аванс
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

