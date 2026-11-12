'use client';

import React, { useState, useEffect } from 'react';
import { Offer, Project, ProjectStatus, PaymentMethod, SalesInvoice } from '@/types';
import { imfexStore, useImfexStore } from '@/lib/store';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { ConfirmModal } from '@/components/ui/confirm-modal';
import { toast } from '@/components/ui/toastr';
import {
  Euro,
  X,
  CheckCircle2,
  Truck,
  SlidersHorizontal,
  BookmarkCheck,
  FileText,
  Percent,
  FolderKanban,
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
  useImfexStore();

  const allProjects = imfexStore.getProjects();
  const allOffers = imfexStore.getOffers();
  const allCustomers = imfexStore.getCustomers();

  const [selectedProjectId, setSelectedProjectId] = useState<string>(project?.id || '');
  const [selectedOfferId, setSelectedOfferId] = useState<string>(
    offer?.id || project?.offerId || project?.offer?.id || ''
  );

  const activeProject =
    allProjects.find((p) => p.id === selectedProjectId) ||
    (project && project.id === selectedProjectId ? project : null) ||
    (selectedOfferId ? allProjects.find((p) => p.offerId === selectedOfferId) || null : null);

  const resolvedOffer =
    allOffers.find((o) => o.id === selectedOfferId) ||
    (offer && offer.id === selectedOfferId ? offer : null) ||
    (activeProject?.offerId ? imfexStore.getOfferById(activeProject.offerId) : activeProject?.offer) ||
    null;

  const totalAmount = Number(resolvedOffer?.totalAmount || 0);
  const defaultAdvance = Math.round(totalAmount * 0.7 * 100) / 100;

  const [percentage, setPercentage] = useState<string>('70');
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
  const [isConfirmOpen, setIsConfirmOpen] = useState<boolean>(false);

  const partners = allCustomers.filter(
    (c) => c.customerType === 'PARTNER' || c.customerType === 'COMPANY'
  );

  useEffect(() => {
    if (isOpen) {
      const initProjId = project?.id || (offer?.id ? allProjects.find((p) => p.offerId === offer.id)?.id || '' : '');
      const initOffId = offer?.id || project?.offerId || project?.offer?.id || '';
      setSelectedProjectId(initProjId);
      setSelectedOfferId(initOffId);

      const initOfferObj =
        offer ||
        (initOffId ? imfexStore.getOfferById(initOffId) : undefined) ||
        project?.offer;
      const baseTot = Number(initOfferObj?.totalAmount || 0);
      setPercentage('70');
      setAmount(Math.round(baseTot * 0.7 * 100) / 100);
      setDate(new Date().toISOString().split('T')[0]);
      setIsConfirmOpen(false);
    }
  }, [isOpen, offer?.id, project?.id]);

  if (!isOpen) return null;

  const handleSelectTarget = (targetVal: string) => {
    if (!targetVal) {
      setSelectedProjectId('');
      setSelectedOfferId('');
      setAmount(0);
      return;
    }
    if (targetVal.startsWith('PROJECT:')) {
      const pId = targetVal.replace('PROJECT:', '');
      const proj = allProjects.find((p) => p.id === pId);
      const offId = proj?.offerId || proj?.offer?.id || '';
      setSelectedProjectId(pId);
      setSelectedOfferId(offId);
      const offObj = offId ? imfexStore.getOfferById(offId) : proj?.offer;
      const newTotal = Number(offObj?.totalAmount || 0);
      const pctNum = parseFloat(percentage) || 70;
      setAmount(Math.round(((newTotal * pctNum) / 100) * 100) / 100);
    } else if (targetVal.startsWith('OFFER:')) {
      const oId = targetVal.replace('OFFER:', '');
      const offObj = allOffers.find((o) => o.id === oId);
      const linkedProj = allProjects.find((p) => p.offerId === oId);
      setSelectedOfferId(oId);
      setSelectedProjectId(linkedProj?.id || '');
      const newTotal = Number(offObj?.totalAmount || 0);
      const pctNum = parseFloat(percentage) || 70;
      setAmount(Math.round(((newTotal * pctNum) / 100) * 100) / 100);
    }
  };

  const currentSelectorValue = selectedProjectId
    ? `PROJECT:${selectedProjectId}`
    : selectedOfferId
    ? `OFFER:${selectedOfferId}`
    : '';

  const targetOptions = [
    ...allProjects.map((p) => {
      const off = p.offerId ? imfexStore.getOfferById(p.offerId) : p.offer;
      const cust = p.customer || allCustomers.find((c) => c.id === p.customerId);
      const custName = cust?.companyName || cust?.name || 'Клиент';
      return {
        value: `PROJECT:${p.id}`,
        label: `Проект: ${p.projectNumber} — ${custName}${off ? ` (Понуда ${off.offerNumber})` : ''}`,
        sublabel: `Статус: ${p.status}${off ? ` • Вкупно по понуда: €${Number(off.totalAmount || 0).toFixed(2)}` : ''}`,
      };
    }),
    ...allOffers.map((o) => {
      const cust = o.customer || allCustomers.find((c) => c.id === o.customerId);
      const custName = cust?.companyName || cust?.name || 'Клиент';
      const linkedProj = allProjects.find((p) => p.offerId === o.id);
      return {
        value: `OFFER:${o.id}`,
        label: `Понуда: ${o.offerNumber} — ${custName} (€${Number(o.totalAmount || 0).toFixed(2)})`,
        sublabel: `Статус: ${o.status}${linkedProj ? ` • Поврзан проект: ${linkedProj.projectNumber}` : ' • Нема креиран проект'}`,
      };
    }),
  ];

  const handlePercentageChange = (rawPct: string) => {
    setPercentage(rawPct);
    const numPct = parseFloat(rawPct);
    if (!isNaN(numPct) && numPct >= 0) {
      setAmount(Math.round(((totalAmount * numPct) / 100) * 100) / 100);
    }
  };

  const handleAmountChange = (newAmt: number) => {
    setAmount(newAmt);
    if (totalAmount > 0) {
      const computedPct = Math.round(((newAmt / totalAmount) * 100) * 100) / 100;
      setPercentage(String(computedPct));
    }
  };

  const resolvedCustomer =
    activeProject?.customer ||
    resolvedOffer?.customer ||
    allCustomers.find((c) => c.id === (activeProject?.customerId || resolvedOffer?.customerId));

  const clientLabel =
    resolvedCustomer?.companyName ||
    resolvedCustomer?.name ||
    'Клиент';

  const executeConfirmedSubmit = () => {
    setIsConfirmOpen(false);
    const customerId = activeProject?.customerId || resolvedOffer?.customerId || resolvedCustomer?.id || '';

    const result = imfexStore.executeAdvancePaymentFlow({
      projectId: activeProject?.id,
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeProject && !resolvedOffer) {
      toast.error('Изберете Понуда или Проект за уплатата на аванс.');
      return;
    }
    setIsConfirmOpen(true);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/65 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-card border border-border rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-5 text-xs max-h-[92vh] overflow-y-auto">
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
                {activeProject ? `• Проект: ${activeProject.projectNumber}` : ''}{' '}
                {resolvedOffer ? `• Понуда: ${resolvedOffer.offerNumber} (Вкупно: €${totalAmount.toFixed(2)})` : ''}
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
          {/* Select Offer / Project */}
          <div className="bg-muted/20 p-3.5 rounded-xl border border-border space-y-1.5">
            <label className="block font-bold text-foreground flex items-center gap-1.5">
              <FolderKanban className="w-3.5 h-3.5 text-primary" />
              <span>Избери Понуда или Проект за уплатата на аванс *</span>
            </label>
            <SearchableSelect
              options={targetOptions}
              value={currentSelectorValue}
              onChange={handleSelectTarget}
              placeholder="Пребарај и избери Понуда или Проект..."
              searchPlaceholder="Пребарај по број на понуда, проект или клиент..."
              className="w-full px-3 py-2 rounded-lg border border-border bg-background font-bold text-foreground outline-none"
            />
          </div>

          {/* Payment Details */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 bg-muted/30 p-3.5 rounded-xl border border-border">
            <div>
              <label className="block font-bold mb-1 text-foreground flex items-center gap-1">
                <Percent className="w-3.5 h-3.5 text-primary" />
                <span>Процент (%) *</span>
              </label>
              <div className="relative">
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  required
                  value={percentage}
                  onChange={(e) => handlePercentageChange(e.target.value)}
                  placeholder="пр. 70"
                  className="w-full pr-7 pl-3 py-2 rounded-lg border border-border bg-background font-extrabold text-primary outline-none focus:ring-2 focus:ring-primary"
                />
                <span className="absolute right-2.5 top-2 text-xs font-extrabold text-muted-foreground">%</span>
              </div>
              <div className="flex flex-wrap gap-1 mt-1.5">
                {[30, 50, 70, 100].map((pct) => (
                  <button
                    key={pct}
                    type="button"
                    onClick={() => handlePercentageChange(String(pct))}
                    className={`px-2 py-0.5 text-[10px] font-bold rounded cursor-pointer transition-colors ${
                      Number(percentage) === pct
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-secondary text-secondary-foreground hover:bg-primary/20'
                    }`}
                  >
                    {pct}%
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block font-bold mb-1 text-foreground">Износ на аванс (€) *</label>
              <input
                type="number"
                step="0.01"
                required
                value={amount}
                onChange={(e) => handleAmountChange(parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-2 rounded-lg border border-border bg-background font-extrabold text-emerald-500 outline-none focus:ring-2 focus:ring-emerald-500"
              />
              <span className="text-[10px] text-muted-foreground block mt-1">
                Од вкупно €{totalAmount.toFixed(2)}
              </span>
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
                <FileText className="w-3.5 h-3.5 text-primary" /> Автоматски издај Авансна Фактура ({percentage || 0}% = €{Number(amount || 0).toFixed(2)} со пресметан 18% ДДВ)
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
                  <div className="pt-1 space-y-1.5" onClick={(e) => e.stopPropagation()}>
                    <label className="block text-[10px] font-bold uppercase text-muted-foreground">
                      Добавувач / Партнер за нацрт-набавката:
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <SearchableSelect
                        options={[
                          { value: 'Doors Impex', label: 'Doors Impex (Стандарден партнер)' },
                          ...partners.map((p) => ({
                            value: p.companyName || p.name,
                            label: `${p.companyName || p.name} (${p.customerType})`,
                            sublabel: p.phone || p.email || undefined,
                          })),
                        ]}
                        value={supplierName}
                        onChange={(val) => setSupplierName(val)}
                        placeholder="Избери од листа..."
                        searchPlaceholder="Пребарај партнер..."
                        className="w-full px-3 py-1.5 rounded-lg border border-border bg-card font-bold text-foreground outline-none"
                      />
                      <input
                        type="text"
                        value={supplierName}
                        onChange={(e) => setSupplierName(e.target.value)}
                        placeholder="Или внеси рачно назив на добавувач..."
                        className="w-full px-3 py-1.5 rounded-lg border border-border bg-card font-semibold text-foreground outline-none"
                      />
                    </div>
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
              disabled={!activeProject && !resolvedOffer}
              className="px-5 py-2 rounded-xl bg-emerald-600 text-white font-extrabold hover:bg-emerald-700 shadow-md flex items-center gap-1.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <CheckCircle2 className="w-4 h-4" /> Потврди и Евидентирај Аванс
            </button>
          </div>
        </form>

        <ConfirmModal
          isOpen={isConfirmOpen}
          title="Потврда за Уплата на Аванс"
          message={`Дали сте сигурни дека сакате да ја потврдите уплатата на аванс од €${Number(amount || 0).toFixed(2)} (${percentage || 0}%) за клиент „${clientLabel}“${
            !activeProject && resolvedOffer && resolvedOffer.status !== 'ACCEPTED'
              ? ` (Понудата ${resolvedOffer.offerNumber} автоматски ќе добие статус ПРИФАТЕНА и ќе се отвори оперативен проект)`
              : ''
          }${
            nextAction === 'PROCUREMENT_AND_DRAFT'
              ? ' и да го префрлите проектот во статус НАБАВКА со креирање нацрт-нарачка'
              : nextAction === 'CUSTOM_STATUS'
              ? ` и да го промените статусот на проектот во ${customStatus}`
              : ''
          }?`}
          variant="success"
          confirmLabel="Потврди Уплата"
          onConfirm={executeConfirmedSubmit}
          onCancel={() => setIsConfirmOpen(false)}
        />
      </div>
    </div>
  );
};

