'use client';

import React, { useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import {
  PurchaseInvoice,
  PurchaseInvoiceItem,
  PurchaseItemType,
  ExpenseCategory,
  SalesInvoice,
  SalesInvoiceType,
  SalesInvoiceItem,
  DispatchNote,
  DispatchNoteItem,
  PaymentMethod,
  Product,
  ProductStockType,
  Project,
  Offer,
} from '@/types';
import { imfexStore, useImfexStore } from '@/lib/store';
import { queryKeys } from '@/lib/query-client';
import {
  usePurchaseInvoicesQuery,
  useSalesInvoicesQuery,
  useDispatchNotesQuery,
  usePaymentsQuery,
  useProductsQuery,
  useCustomersQuery,
  useProjectsQuery,
  useOffersQuery,
} from '@/lib/queries';
import { FinancePdfModal } from '@/components/pdf/printable-finance-document';
import { AdvancePaymentModal } from '@/components/finance/advance-payment-modal';
import { CustomerModal } from '@/components/customer-form/customer-modal';
import { SearchableSelect } from '@/components/ui/searchable-select';
import {
  ProjectSelect,
  ProductSelect,
  OfferSelect,
  CustomerSelect,
} from '@/components/ui/entity-selectors';
import { formatDate } from '@/lib/date-format';
import { formatCurrency } from '@/lib/formatters';
import { ConfirmModal } from '@/components/ui/confirm-modal';
import { toast } from '@/components/ui/toastr';
import { PageLoadingSkeleton } from '@/components/ui/loading-skeleton';
import { useEscapeKey } from '@/components/ui/use-escape-key';
import {
  PageHeader,
  StatCard,
  TabBar,
  FilterBar,
  StatusBadge,
} from '@/components/ui/page-primitives';
import {
  Landmark,
  ShoppingCart,
  FileText,
  Truck,
  CreditCard,
  Building2,
  Plus,
  Search,
  PackagePlus,
  CheckCircle2,
  ArrowDownLeft,
  ArrowUpRight,
  Fuel,
  Boxes,
  Trash2,
  Printer,
  Mail,
  Euro,
  Sparkles,
  Percent,
  X,
} from 'lucide-react';

type FinanceTab = 'purchases' | 'invoices' | 'dispatches' | 'payments' | 'partners';

const EXPENSE_CATEGORY_SHORT: Record<ExpenseCategory, string> = {
  ГОРИВО: 'Гориво',
  ПОТРОШЕН_МАТЕРИЈАЛ: 'Материјал',
  СТРУЈА_ТЕЛЕФОН_КИРИЈА: 'Режии',
  ТРАНСПОРТ_И_ЦАРИНА: 'Транспорт',
  АЛАТ_И_ОПРЕМА: 'Алат и опрема',
  ОСТАНАТО: 'Останато',
};

const EXPENSE_CATEGORY_LABELS: Record<ExpenseCategory, string> = {
  ГОРИВО: 'Гориво и возила (Бензин / Дизел)',
  ПОТРОШЕН_МАТЕРИЈАЛ: 'Потрошен монтажен материјал (сврзни елементи, типли, силикон)',
  СТРУЈА_ТЕЛЕФОН_КИРИЈА: 'Режиски трошоци (Струја, телефон, интернет, кирија)',
  ТРАНСПОРТ_И_ЦАРИНА: 'Транспорт, шпедиција и царина',
  АЛАТ_И_ОПРЕМА: 'Алат и работна опрема',
  ОСТАНАТО: 'Останати оперативни трошоци',
};

function FinancePageContent() {
  useImfexStore();
  const qc = useQueryClient();
  const searchParams = useSearchParams();
  const initialTab = (searchParams?.get('tab') as FinanceTab) || 'purchases';

  const purchasesQuery = usePurchaseInvoicesQuery();
  const salesInvoicesQuery = useSalesInvoicesQuery();
  const dispatchesQuery = useDispatchNotesQuery();
  const paymentsQuery = usePaymentsQuery();
  useProductsQuery();
  const customersQuery = useCustomersQuery();
  const projectsQuery = useProjectsQuery();
  const offersQuery = useOffersQuery();

  const [activeTab, setActiveTab] = useState<FinanceTab>(initialTab);
  const [search, setSearch] = useState('');
  const [purchaseFilter, setPurchaseFilter] = useState<'ALL' | 'STOCK' | 'EXPENSE' | 'PENDING_RECEIPT'>('ALL');
  const [invoiceTypeFilter, setInvoiceTypeFilter] = useState<'ALL' | SalesInvoiceType>('ALL');

  const purchases = purchasesQuery.data ?? imfexStore.getPurchaseInvoices();
  const salesInvoices = salesInvoicesQuery.data ?? imfexStore.getSalesInvoices();
  const dispatches = dispatchesQuery.data ?? imfexStore.getDispatchNotes();
  const payments = paymentsQuery.data ?? imfexStore.getPayments();
  const customers = customersQuery.data ?? imfexStore.getCustomers();
  const projects = projectsQuery.data ?? imfexStore.getProjects();
  const offers = offersQuery.data ?? imfexStore.getOffers();

  // Modals state
  const [showPurchaseModal, setShowPurchaseModal] = useState(false);
  const [showSalesInvoiceModal, setShowSalesInvoiceModal] = useState(false);
  const [showDispatchModal, setShowDispatchModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showAdvanceModal, setShowAdvanceModal] = useState(false);
  const [showPartnerModal, setShowPartnerModal] = useState(false);

  // PDF Preview state
  const [pdfInvoice, setPdfInvoice] = useState<SalesInvoice | null>(null);
  const [pdfDispatch, setPdfDispatch] = useState<DispatchNote | null>(null);
  const [pdfInitialEmailOpen, setPdfInitialEmailOpen] = useState(false);

  // Selected project/offer for Advance Modal
  const [advanceTargetProject, setAdvanceTargetProject] = useState<Project | null>(null);
  const [advanceTargetOffer, setAdvanceTargetOffer] = useState<Offer | null>(null);

  // --- New Purchase Invoice / Expense Form State ---
  const [pSupplierName, setPSupplierName] = useState('Doors Impex');
  const [pSupplierInvNum, setPSupplierInvNum] = useState('');
  const [pProjectId, setPProjectId] = useState('');
  const [pIssueDate, setPIssueDate] = useState(new Date().toISOString().split('T')[0]);
  const [pTaxRate, setPTaxRate] = useState<number>(18);
  const [pReceiveImmediately, setPReceiveImmediately] = useState<boolean>(true);
  const [pPaidImmediately, setPPaidImmediately] = useState<boolean>(false);
  const [pPaymentMethod, setPPaymentMethod] = useState<PaymentMethod>('BANK');
  const [pNotes, setPNotes] = useState('');
  const [pItems, setPItems] = useState<PurchaseInvoiceItem[]>([
    {
      id: `pi-${Date.now()}`,
      itemType: 'STOCK',
      title: '',
      quantity: 1,
      unitCost: 0,
      totalCost: 0,
    },
  ]);

  // Inline Quick Create Product inside Purchase Invoice Modal
  const [inlineNewProdRowIndex, setInlineNewProdRowIndex] = useState<number | null>(null);
  const [inlineProdCode, setInlineProdCode] = useState('');
  const [inlineProdName, setInlineProdName] = useState('');
  const [inlineProdCategoryId, setInlineProdCategoryId] = useState('');
  const [inlineProdStockType, setInlineProdStockType] = useState<ProductStockType>('STOCK');
  const [inlineProdSellPrice, setInlineProdSellPrice] = useState<number>(350);
  const [inlineProdPurchasePrice, setInlineProdPurchasePrice] = useState<number>(200);

  // --- New Sales Invoice Form State ---
  const [sType, setSType] = useState<SalesInvoiceType>('FINAL');
  const [sSourceMode, setSSourceMode] = useState<'PROJECT_OR_OFFER' | 'MANUAL'>('PROJECT_OR_OFFER');
  const [sSelectedProjectId, setSSelectedProjectId] = useState('');
  const [sSelectedOfferId, setSSelectedOfferId] = useState('');
  const [sCustomerId, setSCustomerId] = useState('');
  const [sExternalAccNum, setSExternalAccNum] = useState('');
  const [sTaxRate, setSTaxRate] = useState<number>(18);
  const [sAdvancePercent, setSAdvancePercent] = useState<string>('70');
  const [sNotes, setSNotes] = useState('');
  const [sManualItems, setSManualItems] = useState<SalesInvoiceItem[]>([
    { id: `si-${Date.now()}`, title: '', quantity: 1, unitPrice: 0, totalPrice: 0 },
  ]);

  // --- New Dispatch Note Form State ---
  const [dProjectId, setDProjectId] = useState('');
  const [dCustomerId, setDCustomerId] = useState('');
  const [dAddress, setDAddress] = useState('');
  const [dReceivedBy, setDReceivedBy] = useState('');
  const [dIssueImmediately, setDIssueImmediately] = useState(true);
  const [dNotes, setDNotes] = useState('');
  const [dItems, setDItems] = useState<DispatchNoteItem[]>([
    { id: `di-${Date.now()}`, title: '', quantity: 1 },
  ]);

  // --- New Payment Record Form State ---
  const [payDirection, setPayDirection] = useState<'IN' | 'OUT'>('IN');
  const [payAmount, setPayAmount] = useState<number>(0);
  const [payDate, setPayDate] = useState(new Date().toISOString().split('T')[0]);
  const [payMethod, setPayMethod] = useState<PaymentMethod>('BANK');
  const [payCustomerId, setPayCustomerId] = useState('');
  const [payPartnerName, setPayPartnerName] = useState('');
  const [paySalesInvoiceId, setPaySalesInvoiceId] = useState('');
  const [payPurchaseInvoiceId, setPayPurchaseInvoiceId] = useState('');
  const [payProjectId, setPayProjectId] = useState('');
  const [payOfferId, setPayOfferId] = useState('');
  const [payNotes, setPayNotes] = useState('');

  // --- Confirmation Modal State ---
  const [confirmState, setConfirmState] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    variant?: 'danger' | 'warning' | 'primary' | 'success';
    confirmLabel?: string;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
  });

  const refreshAll = () => {
    imfexStore.seedQueryCache();
    void Promise.all([
      qc.invalidateQueries({ queryKey: queryKeys.purchaseInvoices }),
      qc.invalidateQueries({ queryKey: queryKeys.salesInvoices }),
      qc.invalidateQueries({ queryKey: queryKeys.dispatchNotes }),
      qc.invalidateQueries({ queryKey: queryKeys.payments }),
      qc.invalidateQueries({ queryKey: queryKeys.products }),
      qc.invalidateQueries({ queryKey: queryKeys.customers }),
      qc.invalidateQueries({ queryKey: queryKeys.projects }),
      qc.invalidateQueries({ queryKey: queryKeys.offers }),
    ]);
  };

  // KPI calculations
  const totalPaymentsIn = payments
    .filter((p) => p.direction === 'IN')
    .reduce((sum, p) => sum + Number(p.amount || 0), 0);

  const totalPaymentsOut = payments
    .filter((p) => p.direction === 'OUT')
    .reduce((sum, p) => sum + Number(p.amount || 0), 0);

  const totalOpenReceivables = salesInvoices
    .filter((s) => s.invoiceType !== 'PROFORMA' && s.status !== 'CANCELLED')
    .reduce((sum, s) => sum + Math.max(0, Number(s.totalAmount || 0) - Number(s.paidAmount || 0)), 0);

  let totalStockPurchases = 0;
  let totalOperationalExpenses = 0;
  purchases.forEach((pinv) => {
    pinv.items.forEach((it) => {
      if (it.itemType === 'STOCK') {
        totalStockPurchases += Number(it.totalCost || 0);
      } else {
        totalOperationalExpenses += Number(it.totalCost || 0);
      }
    });
  });

  const netCashBalance = Math.round((totalPaymentsIn - totalPaymentsOut) * 100) / 100;

  // --- Purchase Invoice Helpers ---
  const handleUpdatePItem = (index: number, patch: Partial<PurchaseInvoiceItem>) => {
    setPItems((prev) => {
      const copy = [...prev];
      const current = { ...copy[index], ...patch };
      current.totalCost = Math.round(Number(current.quantity || 1) * Number(current.unitCost || 0) * 100) / 100;
      copy[index] = current;
      return copy;
    });
  };

  const handleCreateInlineProduct = (rowIndex: number) => {
    if (!inlineProdName.trim() || !inlineProdCode.trim()) {
      toast.error('Внесете шифра и назив на производот');
      return;
    }
    const categories = imfexStore.getCategories();
    const catObj = categories.find((c) => c.id === inlineProdCategoryId);
    const prodId = `prod-${Date.now()}`;
    const newProd: Product = {
      id: prodId,
      name: inlineProdName.trim(),
      code: inlineProdCode.trim().toUpperCase(),
      categoryId: inlineProdCategoryId || null,
      category: catObj,
      description: `Креирано од влезна фактура (${pSupplierName || 'Добавувач'})`,
      isActive: true,
      stockType: inlineProdStockType,
      stockQuantity: 0, // Will be incremented when purchase invoice is received
      reservedQuantity: 0,
      purchasePrice: Number(inlineProdPurchasePrice || 0),
      models: [
        {
          id: `mod-${Date.now()}`,
          productId: prodId,
          name: `${inlineProdName.trim()} Стандард`,
          basePrice: Number(inlineProdSellPrice || 350),
        },
      ],
      specificationKeys: [],
    };
    imfexStore.saveProduct(newProd);
    refreshAll();
    handleUpdatePItem(rowIndex, {
      productId: newProd.id,
      productCode: newProd.code,
      title: newProd.name,
      unitCost: Number(inlineProdPurchasePrice || 0),
    });
    setInlineNewProdRowIndex(null);
    setInlineProdCode('');
    setInlineProdName('');
    toast.success('Нов производ креиран во Каталог!', `${newProd.code} — ${newProd.name}`);
  };

  const handleSavePurchaseInvoice = (e: React.FormEvent) => {
    e.preventDefault();
    const validItems = pItems.filter((i) => i.title.trim() !== '');
    if (validItems.length === 0) {
      toast.error('Додајте барем една ставка во влезната фактура / трошок.');
      return;
    }

    const subtotal = validItems.reduce((s, i) => s + Number(i.totalCost || 0), 0);
    const taxAmount = Math.round(((subtotal * pTaxRate) / 100) * 100) / 100;
    const totalAmount = Math.round((subtotal + taxAmount) * 100) / 100;

    const hasStockItems = validItems.some((i) => i.itemType === 'STOCK');
    const newPurchase: PurchaseInvoice = {
      id: `pinv-${Date.now()}`,
      internalNumber: imfexStore.generatePurchaseNumber(),
      supplierInvoiceNumber: pSupplierInvNum.trim() || undefined,
      supplierId: 'partner',
      supplierName: pSupplierName.trim() || 'Добавувач',
      projectId: pProjectId || undefined,
      issueDate: pIssueDate,
      status: 'INVOICED',
      receiptStatus: hasStockItems ? 'PENDING' : 'RECEIVED',
      taxRate: pTaxRate,
      subtotal,
      taxAmount,
      totalAmount,
      paidAmount: 0,
      notes: pNotes,
      items: validItems,
      createdAt: new Date().toISOString(),
    };

    const extraNotes: string[] = [];
    if (hasStockItems && pReceiveImmediately) {
      extraNotes.push('производите веднаш ќе се примат во магацинска залиха');
    }
    if (pPaidImmediately) {
      extraNotes.push('сметката веднаш ќе се означи како ПЛАТЕНА');
    }

    setConfirmState({
      isOpen: true,
      title: 'Потврда за Влезна Фактура / Трошок',
      message: `Дали сте сигурни дека сакате да ја зачувате влезната фактура од „${newPurchase.supplierName}“ со вкупен износ од €${totalAmount.toFixed(2)}${
        extraNotes.length > 0 ? ` (${extraNotes.join(' и ')})` : ''
      }?`,
      variant: 'success',
      confirmLabel: 'Да, зачувај',
      onConfirm: () => {
        setConfirmState((prev) => ({ ...prev, isOpen: false }));
        const saved = imfexStore.savePurchaseInvoice(newPurchase);

        if (hasStockItems && pReceiveImmediately) {
          imfexStore.receivePurchaseInvoiceToWarehouse(saved.id);
        }

        if (pPaidImmediately) {
          imfexStore.recordPayment({
            direction: 'OUT',
            amount: totalAmount,
            date: pIssueDate,
            method: pPaymentMethod,
            partnerName: saved.supplierName,
            projectId: saved.projectId,
            purchaseInvoiceId: saved.id,
            notes: `Платена влезна сметка ${saved.supplierInvoiceNumber || saved.internalNumber}`,
          });
        }

        refreshAll();
        setShowPurchaseModal(false);
        setPSupplierInvNum('');
        setPNotes('');
        setPItems([{ id: `pi-${Date.now()}`, itemType: 'STOCK', title: '', quantity: 1, unitCost: 0, totalCost: 0 }]);
        toast.success(
          'Влезната фактура / трошок е зачувана!',
          hasStockItems && pReceiveImmediately
            ? `${saved.internalNumber} — Производите автоматски влегоа во магацинска залиха.`
            : `${saved.internalNumber} е евидентирана во Финансии.`
        );
      },
    });
  };

  // Create outgoing Sales Invoice directly from a Purchase Invoice's stock items
  const handleCreateSalesInvoiceFromPurchase = (pinv: PurchaseInvoice) => {
    const stockItems = pinv.items.filter((i) => i.itemType === 'STOCK');
    setSType('FINAL');
    setSSourceMode('MANUAL');
    setSSelectedProjectId(pinv.projectId || '');
    if (pinv.projectId) {
      const prj = imfexStore.getProjectById(pinv.projectId);
      if (prj?.customerId) setSCustomerId(prj.customerId);
    }
    setSManualItems(
      stockItems.map((st, idx) => {
        const prod = st.productId ? imfexStore.getProductById(st.productId) : undefined;
        const sellPrice =
          prod?.models?.[0]?.basePrice && Number(prod.models[0].basePrice) > 0
            ? Number(prod.models[0].basePrice)
            : Math.round(Number(st.unitCost || 100) * 1.45 * 100) / 100;
        return {
          id: `si-from-p-${Date.now()}-${idx}`,
          productId: st.productId,
          title: st.title,
          quantity: st.quantity,
          unitPrice: sellPrice,
          totalPrice: Math.round(sellPrice * st.quantity * 100) / 100,
        };
      })
    );
    setActiveTab('invoices');
    setShowSalesInvoiceModal(true);
  };

  // --- Sales Invoice Creation Handler ---
  const handleSaveSalesInvoice = (e: React.FormEvent) => {
    e.preventDefault();

    const pctNum = Math.max(0.01, Math.min(100, parseFloat(sAdvancePercent) || 70));

    if (sSourceMode === 'PROJECT_OR_OFFER' && (sSelectedProjectId || sSelectedOfferId)) {
      const selProj = sSelectedProjectId ? imfexStore.getProjectById(sSelectedProjectId) : undefined;
      const selOffer = sSelectedOfferId
        ? imfexStore.getOfferById(sSelectedOfferId)
        : selProj?.offerId
        ? imfexStore.getOfferById(selProj.offerId)
        : selProj?.offer;
      const baseOfferTotal = Number(selOffer?.totalAmount || 1000);
      const advanceAmountOverride =
        sType === 'ADVANCE' ? Math.round(((baseOfferTotal * pctNum) / 100) * 100) / 100 : undefined;

      const created = imfexStore.createSalesInvoiceFromOfferOrProject({
        invoiceType: sType,
        projectId: sSelectedProjectId || undefined,
        offerId: sSelectedOfferId || undefined,
        customerId: sCustomerId || undefined,
        advanceAmountOverride,
        externalAccountingNumber: sExternalAccNum.trim() || undefined,
        notes:
          sNotes.trim() ||
          (sType === 'ADVANCE' ? `Авансна фактура (${pctNum}% од вкупната сума €${baseOfferTotal.toFixed(2)})` : undefined),
      });
      refreshAll();
      setShowSalesInvoiceModal(false);
      toast.success(
        `Креирана е ${created.invoiceNumber}!`,
        created.advanceDeductedAmount > 0
          ? `Автоматски е одбиен платен аванс од €${created.advanceDeductedAmount.toFixed(2)}.`
          : sType === 'ADVANCE'
          ? `Аванс ${pctNum}% (€${created.totalAmount.toFixed(2)}) — подготвено за PDF печатење.`
          : 'Документот е подготвен за PDF печатење.'
      );
      setPdfInvoice(created);
      return;
    }

    // Manual / Warehouse stock items mode
    if (!sCustomerId) {
      toast.error('Изберете клиент за фактурата.');
      return;
    }
    const cust = imfexStore.getCustomerById(sCustomerId);
    const validItems = sManualItems.filter((i) => i.title.trim() !== '');
    const rawSubtotal = validItems.reduce((s, i) => s + Number(i.totalPrice || 0), 0);
    const factor = sType === 'ADVANCE' ? pctNum / 100 : 1;
    const subtotal = Math.round(rawSubtotal * factor * 100) / 100;
    const taxAmount = Math.round(((subtotal * sTaxRate) / 100) * 100) / 100;
    const grossTotalAmount = Math.round((subtotal + taxAmount) * 100) / 100;

    let linkedAdvanceInvoiceNumber: string | undefined;
    let advanceDeductedAmount = 0;
    if (sType === 'FINAL' && sSelectedProjectId) {
      const priorAdv = salesInvoices.filter(
        (inv) => inv.invoiceType === 'ADVANCE' && inv.projectId === sSelectedProjectId && inv.status !== 'CANCELLED'
      );
      if (priorAdv.length > 0) {
        linkedAdvanceInvoiceNumber = priorAdv.map((a) => a.invoiceNumber).join(', ');
        advanceDeductedAmount = priorAdv.reduce((s, a) => s + Number(a.totalAmount || 0), 0);
      }
    }

    const totalAmount = Math.max(0, Math.round((grossTotalAmount - advanceDeductedAmount) * 100) / 100);
    const finalItems =
      sType === 'ADVANCE' && pctNum < 100
        ? [
            {
              id: `si-adv-${Date.now()}`,
              title: `Авансна уплата (${pctNum}% од вкупна вредност €${Math.round(rawSubtotal * (1 + sTaxRate / 100) * 100) / 100})`,
              quantity: 1,
              unitPrice: subtotal,
              totalPrice: subtotal,
            },
          ]
        : validItems;

    const created = imfexStore.saveSalesInvoice({
      id: `sinv-${Date.now()}`,
      invoiceNumber: imfexStore.generateSalesInvoiceNumber(sType),
      externalAccountingNumber: sExternalAccNum.trim() || undefined,
      invoiceType: sType,
      status: 'ISSUED',
      customerId: sCustomerId,
      customer: cust,
      projectId: sSelectedProjectId || undefined,
      issueDate: new Date().toISOString().split('T')[0],
      dueDate: new Date(Date.now() + 8 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      taxRate: sTaxRate,
      discountRate: 0,
      discountAmount: 0,
      subtotal,
      taxAmount,
      grossTotalAmount,
      linkedAdvanceInvoiceNumber,
      advanceDeductedAmount,
      totalAmount,
      paidAmount: 0,
      notes: sNotes.trim() || (sType === 'ADVANCE' ? `Авансна фактура (${pctNum}%)` : undefined),
      items: finalItems,
      createdAt: new Date().toISOString(),
    });

    refreshAll();
    setShowSalesInvoiceModal(false);
    toast.success(`Издадена е фактура ${created.invoiceNumber}!`);
    setPdfInvoice(created);
  };

  // --- Dispatch Note Creation Handler ---
  const handleSelectDispatchProject = (prjId: string) => {
    setDProjectId(prjId);
    const prj = imfexStore.getProjectById(prjId);
    if (!prj) return;
    setDCustomerId(prj.customerId);
    setDAddress(prj.installationAddress || prj.customer?.address || '');
    setDReceivedBy(prj.customer?.companyName || prj.customer?.name || '');

    const offer = prj.offerId ? imfexStore.getOfferById(prj.offerId) : prj.offer;
    const autoItems: DispatchNoteItem[] = [];
    (offer?.items || []).forEach((it, idx) => {
      const prod = it.productId ? imfexStore.getProductById(it.productId) : undefined;
      autoItems.push({
        id: `di-prj-${Date.now()}-${idx}`,
        productId: prod?.id,
        productCode: prod?.code,
        title: it.customTitle || prod?.name || 'Производ',
        quantity: Number(it.quantity || 1),
      });
      if (it.selectedAccessories) {
        Object.values(it.selectedAccessories).forEach((accId) => {
          if (!accId) return;
          const acc = imfexStore.getProductById(accId);
          if (acc) {
            autoItems.push({
              id: `di-acc-${Date.now()}-${acc.id}`,
              productId: acc.id,
              productCode: acc.code,
              title: acc.name,
              quantity: 1,
            });
          }
        });
      }
    });
    if (autoItems.length > 0) {
      setDItems(autoItems);
    }
  };

  const handleSaveDispatchNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!dCustomerId) {
      toast.error('Изберете клиент за испратницата.');
      return;
    }
    const cust = imfexStore.getCustomerById(dCustomerId);
    const validItems = dItems.filter((i) => i.title.trim() !== '');
    if (validItems.length === 0) {
      toast.error('Додајте барем еден производ во испратницата.');
      return;
    }

    setConfirmState({
      isOpen: true,
      title: dIssueImmediately ? 'Потврда за Издавање Испратница и Магацински Излез' : 'Креирај Нацрт Испратница',
      message: `Дали сте сигурни дека сакате да ${
        dIssueImmediately
          ? 'ја издадете испратницата и веднаш да ја намалите магацинската залиха'
          : 'ја зачувате испратницата како нацрт'
      } за клиентот „${cust?.companyName || cust?.name || ''}“?`,
      variant: dIssueImmediately ? 'warning' : 'primary',
      confirmLabel: dIssueImmediately ? 'Да, издај испратница' : 'Зачувај нацрт',
      onConfirm: () => {
        setConfirmState((prev) => ({ ...prev, isOpen: false }));
        const note = imfexStore.saveDispatchNote({
          id: `disp-${Date.now()}`,
          dispatchNumber: imfexStore.generateDispatchNumber(),
          status: 'DRAFT',
          customerId: dCustomerId,
          customer: cust,
          projectId: dProjectId || undefined,
          issueDate: new Date().toISOString().split('T')[0],
          deliveryAddress: dAddress,
          receivedBy: dReceivedBy || cust?.companyName || cust?.name,
          issuedBy: imfexStore.getCurrentUser()?.fullName || 'Магацин IMFEX',
          notes: dNotes,
          items: validItems,
          stockDeducted: false,
          createdAt: new Date().toISOString(),
        });

        const finalNote = dIssueImmediately
          ? imfexStore.confirmAndIssueDispatchNote(note.id) || note
          : note;

        refreshAll();
        setShowDispatchModal(false);
        toast.success(
          `Испратница ${finalNote.dispatchNumber} е креирана!`,
          dIssueImmediately ? 'Залихата во магацинот е автоматски намалена.' : 'Зачувана како нацрт.'
        );
        setPdfDispatch(finalNote);
      },
    });
  };

  // --- Record Payment Handler ---
  const handleSavePayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!payAmount || payAmount <= 0) {
      toast.error('Внесете валиден износ.');
      return;
    }
    const partnerLabel = payPartnerName || (payDirection === 'IN' ? 'Клиент' : 'Добавувач');
    setConfirmState({
      isOpen: true,
      title: payDirection === 'IN' ? 'Потврда за Прилив (Уплата)' : 'Потврда за Одлив (Исплата)',
      message: `Дали сте сигурни дека сакате да ја потврдите ${
        payDirection === 'IN' ? 'уплатата од' : 'исплатата кон'
      } „${partnerLabel}“ во износ од €${Number(payAmount).toFixed(2)}?`,
      variant: payDirection === 'IN' ? 'success' : 'warning',
      confirmLabel: 'Потврди Трансакција',
      onConfirm: () => {
        setConfirmState((prev) => ({ ...prev, isOpen: false }));
        imfexStore.recordPayment({
          direction: payDirection,
          amount: Number(payAmount),
          date: payDate,
          method: payMethod,
          customerId: payCustomerId || undefined,
          partnerName: partnerLabel,
          salesInvoiceId: paySalesInvoiceId || undefined,
          purchaseInvoiceId: payPurchaseInvoiceId || undefined,
          projectId: payProjectId || undefined,
          offerId: payOfferId || undefined,
          notes: payNotes,
        });
        refreshAll();
        setShowPaymentModal(false);
        setPayAmount(0);
        setPayNotes('');
        toast.success('Уплатата / трансакцијата е евидентирана!');
      },
    });
  };

  // Filtered Lists
  const filteredPurchases = purchases.filter((p) => {
    const q = search.toLowerCase();
    const matchText =
      p.internalNumber.toLowerCase().includes(q) ||
      (p.supplierInvoiceNumber || '').toLowerCase().includes(q) ||
      p.supplierName.toLowerCase().includes(q) ||
      p.items.some((i) => i.title.toLowerCase().includes(q));
    if (!matchText) return false;
    if (purchaseFilter === 'STOCK') return p.items.some((i) => i.itemType === 'STOCK');
    if (purchaseFilter === 'EXPENSE') return p.items.some((i) => i.itemType === 'EXPENSE');
    if (purchaseFilter === 'PENDING_RECEIPT')
      return p.items.some((i) => i.itemType === 'STOCK' && !i.receivedInWarehouse);
    return true;
  });

  const filteredSalesInvoices = salesInvoices.filter((s) => {
    const q = search.toLowerCase();
    const matchText =
      s.invoiceNumber.toLowerCase().includes(q) ||
      (s.customer?.companyName || s.customer?.name || '').toLowerCase().includes(q);
    if (!matchText) return false;
    if (invoiceTypeFilter !== 'ALL' && s.invoiceType !== invoiceTypeFilter) return false;
    return true;
  });

  const filteredDispatches = dispatches.filter((d) => {
    const q = search.toLowerCase();
    return (
      d.dispatchNumber.toLowerCase().includes(q) ||
      (d.customer?.companyName || d.customer?.name || '').toLowerCase().includes(q) ||
      d.items.some((i) => i.title.toLowerCase().includes(q))
    );
  });

  const filteredPayments = payments.filter((p) => {
    const q = search.toLowerCase();
    return (
      p.paymentNumber.toLowerCase().includes(q) ||
      (p.partnerName || '').toLowerCase().includes(q) ||
      (p.notes || '').toLowerCase().includes(q)
    );
  });

  const partnersList = customers.filter((c) => c.customerType === 'PARTNER' || c.customerType === 'COMPANY');

  useEscapeKey(showPurchaseModal && !confirmState.isOpen, () => setShowPurchaseModal(false));
  useEscapeKey(showSalesInvoiceModal, () => setShowSalesInvoiceModal(false));
  useEscapeKey(showDispatchModal && !confirmState.isOpen, () => setShowDispatchModal(false));
  useEscapeKey(showPaymentModal, () => setShowPaymentModal(false));

  if (
    !imfexStore.isLoadedFromBackend &&
    (purchasesQuery.isLoading || salesInvoicesQuery.isLoading || dispatchesQuery.isLoading || paymentsQuery.isLoading)
  ) {
    return <PageLoadingSkeleton cards={4} rows={5} />;
  }

  return (
    <div className="space-y-6 pb-16 text-xs">
      {/* Unified Minimal Page Header */}
      <PageHeader
        title="Финансии и Набавки"
        subtitle="Влезни и излезни фактури, аванси, испратници, уплати и добавувачи."
        icon={<Landmark className="w-5 h-5" />}
        actions={
          <>
            <button
              type="button"
              onClick={() => {
                setAdvanceTargetProject(projects[0] || null);
                setAdvanceTargetOffer(offers[0] || null);
                setShowAdvanceModal(true);
              }}
              className="h-9 px-3 text-xs font-medium rounded-lg border border-border bg-card hover:bg-muted text-foreground inline-flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap"
            >
              <Euro className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>Аванс</span>
            </button>

            <button
              type="button"
              onClick={() => setShowSalesInvoiceModal(true)}
              className="h-9 px-3 text-xs font-medium rounded-lg border border-border bg-card hover:bg-muted text-foreground inline-flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap"
            >
              <FileText className="w-3.5 h-3.5 text-primary" />
              <span>Излезна</span>
            </button>

            <button
              type="button"
              onClick={() => setShowDispatchModal(true)}
              className="h-9 px-3 text-xs font-medium rounded-lg border border-border bg-card hover:bg-muted text-foreground inline-flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap"
            >
              <Truck className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
              <span>Испратница</span>
            </button>

            <button
              type="button"
              onClick={() => setShowPurchaseModal(true)}
              className="h-9 px-3.5 text-xs font-semibold rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 inline-flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap"
            >
              <Plus className="w-4 h-4" />
              <span>Влезна / Трошок</span>
            </button>
          </>
        }
      />

      {/* Calm 4-Column Financial KPI Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Наплатени средства"
          value={formatCurrency(totalPaymentsIn)}
          tone="success"
          icon={<ArrowDownLeft className="w-4 h-4" />}
          helper={
            <>
              <span>Реален прилив (бруто) • За наплата:</span>
              <strong className="text-foreground tabular-nums">{formatCurrency(totalOpenReceivables)}</strong>
            </>
          }
        />

        <StatCard
          label="Набавка на стока (без ДДВ)"
          value={formatCurrency(totalStockPurchases)}
          tone="primary"
          icon={<Boxes className="w-4 h-4" />}
          helper="Фактурирана нето набавка (вкл. неплатени)"
        />

        <StatCard
          label="Оперативни трошоци (без ДДВ)"
          value={formatCurrency(totalOperationalExpenses)}
          tone="warning"
          icon={<Fuel className="w-4 h-4" />}
          helper="Фактурирани нето трошоци (гориво, материјал)"
        />

        <StatCard
          label="Нето кеш биланс"
          value={
            <span className={netCashBalance >= 0 ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-700 dark:text-rose-400'}>
              {formatCurrency(netCashBalance)}
            </span>
          }
          tone={netCashBalance >= 0 ? 'success' : 'danger'}
          icon={<Sparkles className="w-4 h-4" />}
          helper="Реални уплати (прилив) минус исплати (одлив)"
        />
      </div>

      {/* Unified Horizontal Tab Bar */}
      <TabBar
        activeTab={activeTab}
        onChange={(id) => setActiveTab(id as FinanceTab)}
        tabs={[
          { id: 'purchases', label: 'Набавки и Трошоци', count: purchases.length, icon: <ShoppingCart className="w-3.5 h-3.5" /> },
          { id: 'invoices', label: 'Излезни Фактури', count: salesInvoices.length, icon: <FileText className="w-3.5 h-3.5" /> },
          { id: 'dispatches', label: 'Испратници', count: dispatches.length, icon: <Truck className="w-3.5 h-3.5" /> },
          { id: 'payments', label: 'Уплати', count: payments.length, icon: <CreditCard className="w-3.5 h-3.5" /> },
          { id: 'partners', label: 'Партнери', count: partnersList.length, icon: <Building2 className="w-3.5 h-3.5" /> },
        ]}
      />

      {/* ===================================================================== */}
      {/* TAB 1: НАБАВКИ И ТРОШОЦИ (ВЛЕЗ ВО ФИРМАТА)                            */}
      {/* ===================================================================== */}
      {activeTab === 'purchases' && (
        <div className="space-y-4">
          <FilterBar
            searchValue={search}
            onSearchChange={setSearch}
            searchPlaceholder="Пребарај документ, добавувач или ставка..."
          >
            {[
              { key: 'ALL', label: 'Сите' },
              { key: 'STOCK', label: 'Стока (Залиха)' },
              { key: 'EXPENSE', label: 'Трошоци' },
              { key: 'PENDING_RECEIPT', label: 'Чека прием' },
            ].map((f) => (
              <button
                key={f.key}
                type="button"
                onClick={() => setPurchaseFilter(f.key as any)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                  purchaseFilter === f.key
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                }`}
              >
                {f.label}
              </button>
            ))}
          </FilterBar>

          <div className="surface-card rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-muted/40 border-b border-border text-[11px] font-medium text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3 whitespace-nowrap">Документ</th>
                    <th className="px-3 py-3">Добавувач</th>
                    <th className="px-3 py-3">Ставки</th>
                    <th className="px-3 py-3 whitespace-nowrap">Статус</th>
                    <th className="px-3 py-3 text-right whitespace-nowrap">Вкупно</th>
                    <th className="px-4 py-3 text-right whitespace-nowrap">Акции</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/70">
                  {filteredPurchases.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-10 text-center text-muted-foreground">
                        Нема евидентирани влезни фактури или трошоци.
                      </td>
                    </tr>
                  ) : (
                    filteredPurchases.map((pinv) => {
                      const hasUnreceivedStock = pinv.items.some(
                        (i) => i.itemType === 'STOCK' && !i.receivedInWarehouse
                      );
                      const hasStock = pinv.items.some((i) => i.itemType === 'STOCK');
                      const linkedProj = pinv.projectId ? projects.find((p) => p.id === pinv.projectId) : undefined;

                      return (
                        <tr key={pinv.id} className="hover:bg-muted/30 transition-colors">
                          <td className="px-4 py-3.5 whitespace-nowrap align-top">
                            <p className="font-mono font-semibold text-primary">{pinv.internalNumber}</p>
                            <p className="text-[11px] text-muted-foreground">{formatDate(pinv.issueDate)}</p>
                            {pinv.supplierInvoiceNumber && (
                              <p className="text-[10px] font-mono text-muted-foreground">
                                #{pinv.supplierInvoiceNumber}
                              </p>
                            )}
                          </td>

                          <td className="px-3 py-3.5 align-top">
                            <p className="font-medium text-foreground">{pinv.supplierName}</p>
                            <p className="text-[11px] text-muted-foreground mt-0.5">
                              {linkedProj ? linkedProj.projectNumber : 'Општ / Магацин'}
                            </p>
                          </td>

                          <td className="px-3 py-3.5 space-y-1.5 align-top max-w-xs">
                            {pinv.items.map((item) => (
                              <div key={item.id} className="flex items-center gap-1.5 flex-wrap">
                                <StatusBadge variant={item.itemType === 'STOCK' ? 'primary' : 'warning'}>
                                  {item.itemType === 'STOCK'
                                    ? 'Стока'
                                    : (item.expenseCategory && EXPENSE_CATEGORY_SHORT[item.expenseCategory]) || 'Трошок'}
                                </StatusBadge>
                                <span className="text-foreground font-medium truncate">
                                  {item.quantity}× {item.title}
                                </span>
                                <span className="text-muted-foreground tabular-nums text-[11px]">
                                  ({formatCurrency(item.unitCost)})
                                </span>
                              </div>
                            ))}
                          </td>

                          <td className="px-3 py-3.5 align-top whitespace-nowrap">
                            <div className="flex flex-col items-start gap-1">
                              <StatusBadge
                                variant={
                                  pinv.status === 'PAID'
                                    ? 'success'
                                    : pinv.status === 'DRAFT'
                                    ? 'purple'
                                    : 'danger'
                                }
                                dot
                              >
                                {pinv.status === 'PAID'
                                  ? 'Платено'
                                  : pinv.status === 'DRAFT'
                                  ? 'Нацрт'
                                  : 'За плаќање'}
                              </StatusBadge>
                              {hasStock && (
                                <StatusBadge variant={hasUnreceivedStock ? 'warning' : 'success'}>
                                  {hasUnreceivedStock ? 'Чека прием' : 'Примено'}
                                </StatusBadge>
                              )}
                            </div>
                          </td>

                          <td className="px-3 py-3.5 text-right font-semibold text-sm text-foreground tabular-nums whitespace-nowrap align-top">
                            {formatCurrency(pinv.totalAmount)}
                          </td>

                          <td className="px-4 py-3.5 text-right whitespace-nowrap align-top">
                            <div className="inline-flex items-center justify-end gap-1">
                              {hasUnreceivedStock && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setConfirmState({
                                      isOpen: true,
                                      title: 'Потврда за Прием во Магацинска Залиха',
                                      message: `Дали сте сигурни дека сакате да го потврдите приемот во магацин за влезната фактура „${pinv.internalNumber}“ (${pinv.supplierName}) и да ја зголемите залихата?`,
                                      variant: 'success',
                                      confirmLabel: 'Прими во Залиха',
                                      onConfirm: () => {
                                        setConfirmState((prev) => ({ ...prev, isOpen: false }));
                                        imfexStore.receivePurchaseInvoiceToWarehouse(pinv.id);
                                        refreshAll();
                                        toast.success(
                                          'Примено во магацин!',
                                          `Стоката од ${pinv.internalNumber} е додадена во залиха.`
                                        );
                                      },
                                    });
                                  }}
                                  className="h-7 px-2.5 rounded-md bg-emerald-600 text-white font-medium text-[11px] hover:bg-emerald-700 cursor-pointer inline-flex items-center gap-1"
                                  title="Потврди прием во залиха"
                                >
                                  <CheckCircle2 className="w-3 h-3" />
                                  <span>Прими</span>
                                </button>
                              )}

                              {hasStock && (
                                <button
                                  type="button"
                                  onClick={() => handleCreateSalesInvoiceFromPurchase(pinv)}
                                  className="h-7 px-2.5 rounded-md border border-border bg-background hover:bg-muted text-foreground font-medium text-[11px] cursor-pointer transition-colors"
                                  title="Креирај излезна фактура од оваа набавка"
                                >
                                  Фактурирај
                                </button>
                              )}

                              {pinv.status !== 'PAID' && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setPayDirection('OUT');
                                    setPayPurchaseInvoiceId(pinv.id);
                                    setPayPartnerName(pinv.supplierName);
                                    setPayProjectId(pinv.projectId || '');
                                    setPayAmount(
                                      Math.max(0, Number(pinv.totalAmount || 0) - Number(pinv.paidAmount || 0))
                                    );
                                    setShowPaymentModal(true);
                                  }}
                                  className="h-7 px-2.5 rounded-md border border-border bg-background hover:bg-muted text-foreground font-medium text-[11px] cursor-pointer transition-colors"
                                >
                                  Плати
                                </button>
                              )}

                              <button
                                type="button"
                                onClick={() => {
                                  setConfirmState({
                                    isOpen: true,
                                    title: 'Избриши Влезна Фактура / Трошок',
                                    message: `Дали сте сигурни дека сакате да ја избришете влезната фактура / трошок „${pinv.internalNumber}“ (${pinv.supplierName})?`,
                                    variant: 'danger',
                                    confirmLabel: 'Избриши',
                                    onConfirm: () => {
                                      setConfirmState((prev) => ({ ...prev, isOpen: false }));
                                      imfexStore.deletePurchaseInvoice(pinv.id);
                                      refreshAll();
                                    },
                                  });
                                }}
                                className="h-7 w-7 rounded-md text-muted-foreground hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-500/10 inline-flex items-center justify-center cursor-pointer transition-colors"
                                title="Избриши"
                                aria-label="Избриши"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* TAB 2: ИЗЛЕЗНИ ФАКТУРИ, ПРО-ФАКТУРИ И АВАНСНИ ФАКТУРИ                 */}
      {/* ===================================================================== */}
      {activeTab === 'invoices' && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 bg-card p-4 rounded-xl border border-border">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-bold text-muted-foreground uppercase text-[10px]">Тип на документ:</span>
              {[
                { key: 'ALL', label: 'Сите документи' },
                { key: 'PROFORMA', label: 'Про-фактури (PRO)' },
                { key: 'ADVANCE', label: 'Авансни фактури (AVN)' },
                { key: 'FINAL', label: 'Конечни фактури (FAK)' },
              ].map((t) => (
                <button
                  key={t.key}
                  onClick={() => setInvoiceTypeFilter(t.key as any)}
                  className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                    invoiceTypeFilter === t.key
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowAdvanceModal(true)}
                className="px-3.5 py-2 rounded-xl bg-emerald-600 text-white font-bold flex items-center gap-1.5 cursor-pointer"
              >
                <Euro className="w-4 h-4" /> Евидентирај Уплата на Аванс
              </button>
              <button
                onClick={() => setShowSalesInvoiceModal(true)}
                className="px-4 py-2 rounded-xl bg-primary text-primary-foreground font-extrabold flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-4 h-4" /> Нова Фактура / Про-фактура
              </button>
            </div>
          </div>

          <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left min-w-[950px]">
                <thead className="bg-muted/50 border-b border-border text-[10px] font-extrabold uppercase text-muted-foreground">
                  <tr>
                    <th className="p-4">Број / Датум</th>
                    <th className="p-4">Тип</th>
                    <th className="p-4">Клиент</th>
                    <th className="p-4">Вкупно со ДДВ</th>
                    <th className="p-4">Одбиен Аванс</th>
                    <th className="p-4 text-right">За Наплата</th>
                    <th className="p-4">Статус</th>
                    <th className="p-4 text-center">Акции (PDF / Уплата / Испратница)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredSalesInvoices.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="p-10 text-center text-muted-foreground">
                        Нема креирани излезни фактури. Кликнете на <strong>„+ Нова Фактура / Про-фактура“</strong> или <strong>„Евидентирај Уплата на Аванс“</strong>.
                      </td>
                    </tr>
                  ) : (
                    filteredSalesInvoices.map((sinv) => (
                      <tr key={sinv.id} className="hover:bg-muted/20 transition-colors">
                        <td className="p-4">
                          <p className="font-extrabold text-primary">{sinv.invoiceNumber}</p>
                          <p className="text-[10px] text-muted-foreground">{formatDate(sinv.issueDate)}</p>
                        </td>
                        <td className="p-4">
                          <span
                            className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase ${
                              sinv.invoiceType === 'ADVANCE'
                                ? 'bg-amber-500/15 text-amber-400'
                                : sinv.invoiceType === 'PROFORMA'
                                ? 'bg-sky-500/15 text-sky-400'
                                : 'bg-primary/15 text-primary'
                            }`}
                          >
                            {sinv.invoiceType === 'ADVANCE'
                              ? 'АВАНСНА Ф-РА'
                              : sinv.invoiceType === 'PROFORMA'
                              ? 'ПРО-ФАКТУРА'
                              : 'КОНЕЧНА Ф-РА'}
                          </span>
                        </td>
                        <td className="p-4 font-bold text-foreground">
                          {sinv.customer?.companyName || sinv.customer?.name || 'Клиент'}
                        </td>
                        <td className="p-4 font-bold text-foreground">
                          €{Number(sinv.grossTotalAmount || sinv.totalAmount || 0).toFixed(2)}
                        </td>
                        <td className="p-4">
                          {sinv.advanceDeductedAmount > 0 ? (
                            <span className="text-amber-400 font-bold">
                              -€{Number(sinv.advanceDeductedAmount).toFixed(2)} ({sinv.linkedAdvanceInvoiceNumber || 'Аванс'})
                            </span>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </td>
                        <td className="p-4 text-right font-black text-sm text-foreground tabular-nums">
                          {(() => {
                            const invTotal = Number(sinv.totalAmount || 0);
                            const invPaid = Number(sinv.paidAmount || 0);
                            const remainingDue =
                              sinv.status === 'PAID' ? 0 : Math.max(0, Math.round((invTotal - invPaid) * 100) / 100);
                            return (
                              <div>
                                <span className={remainingDue === 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-foreground'}>
                                  {formatCurrency(remainingDue)}
                                </span>
                                {invPaid > 0 && (
                                  <span className="block text-[10px] font-medium text-muted-foreground">
                                    од {formatCurrency(invTotal)}
                                  </span>
                                )}
                              </div>
                            );
                          })()}
                        </td>
                        <td className="p-4">
                          <span
                            className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase ${
                              sinv.status === 'PAID'
                                ? 'bg-emerald-500/15 text-emerald-400'
                                : sinv.status === 'PARTIAL_PAID'
                                ? 'bg-amber-500/15 text-amber-400'
                                : 'bg-blue-500/15 text-blue-400'
                            }`}
                          >
                            {sinv.status === 'PAID'
                              ? 'ПЛАТЕНО'
                              : sinv.status === 'PARTIAL_PAID'
                              ? `ДЕЛУМНО (€${Number(sinv.paidAmount).toFixed(2)})`
                              : 'ИЗДАДЕНО'}
                          </span>
                        </td>
                        <td className="p-4">
                          <div className="flex items-center justify-center gap-1.5 flex-wrap">
                            <button
                              onClick={() => {
                                setPdfInitialEmailOpen(false);
                                setPdfInvoice(sinv);
                              }}
                              className="px-2.5 py-1.5 rounded-lg bg-primary text-primary-foreground font-bold text-[10px] hover:brightness-110 flex items-center gap-1 cursor-pointer"
                            >
                              <Printer className="w-3.5 h-3.5" /> PDF Фактура
                            </button>

                            <button
                              onClick={() => {
                                setPdfInitialEmailOpen(true);
                                setPdfInvoice(sinv);
                              }}
                              className="px-2.5 py-1.5 rounded-lg border border-blue-500/30 bg-blue-500/10 text-blue-600 dark:text-blue-400 font-bold text-[10px] hover:bg-blue-500/20 flex items-center gap-1 cursor-pointer"
                              title="Испрати фактура по е-пошта"
                            >
                              <Mail className="w-3.5 h-3.5" /> Е-пошта
                            </button>

                            {sinv.status !== 'PAID' && (
                              <button
                                onClick={() => {
                                  setPayDirection('IN');
                                  setPaySalesInvoiceId(sinv.id);
                                  setPayPartnerName(sinv.customer?.companyName || sinv.customer?.name || 'Клиент');
                                  setPayProjectId(sinv.projectId || '');
                                  setPayAmount(
                                    Math.max(0, Number(sinv.totalAmount || 0) - Number(sinv.paidAmount || 0))
                                  );
                                  setShowPaymentModal(true);
                                }}
                                className="px-2.5 py-1.5 rounded-lg bg-emerald-600 text-white font-bold text-[10px] hover:bg-emerald-700 cursor-pointer"
                              >
                                + Уплата
                              </button>
                            )}

                            <button
                              onClick={() => {
                                setConfirmState({
                                  isOpen: true,
                                  title: 'Избриши Излезна Фактура',
                                  message: `Дали сте сигурни дека сакате да ја избришете фактурата „${sinv.invoiceNumber}“ за клиент „${sinv.customer?.companyName || sinv.customer?.name || 'Клиент'}“?`,
                                  variant: 'danger',
                                  confirmLabel: 'Избриши',
                                  onConfirm: () => {
                                    setConfirmState((prev) => ({ ...prev, isOpen: false }));
                                    imfexStore.deleteSalesInvoice(sinv.id);
                                    refreshAll();
                                  },
                                });
                              }}
                              className="p-1.5 text-rose-500 hover:bg-rose-500/10 rounded-lg cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* TAB 3: ИСПРАТНИЦИ (ФИЗИЧКИ ИЗЛЕЗ ОД ЗАЛИХА)                           */}
      {/* ===================================================================== */}
      {activeTab === 'dispatches' && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 bg-card p-4 rounded-xl border border-border">
            <div>
              <h3 className="font-extrabold text-sm text-foreground">
                Испратници — Физичко раздолжување на магацинска залиха
              </h3>
              <p className="text-[11px] text-muted-foreground">
                Залихата се намалува при потврда на Испратницата (резервираното од проектот се претвора во излезено), а не при фактурирање.
              </p>
            </div>
            <button
              onClick={() => setShowDispatchModal(true)}
              className="px-4 py-2 rounded-xl bg-primary text-primary-foreground font-extrabold flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-4 h-4" /> Креирај Испратница
            </button>
          </div>

          <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left min-w-[900px]">
                <thead className="bg-muted/50 border-b border-border text-[10px] font-extrabold uppercase text-muted-foreground">
                  <tr>
                    <th className="p-4">Испратница Бр.</th>
                    <th className="p-4">Датум</th>
                    <th className="p-4">Клиент & Адреса</th>
                    <th className="p-4">Ставки за излез од магацин</th>
                    <th className="p-4">Статус на Залиха</th>
                    <th className="p-4 text-center">Акции</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredDispatches.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-10 text-center text-muted-foreground">
                        Нема издадени испратници. Кликнете на <strong>„+ Креирај Испратница“</strong> кога стоката физички излегува од магацин.
                      </td>
                    </tr>
                  ) : (
                    filteredDispatches.map((d) => (
                      <tr key={d.id} className="hover:bg-muted/20 transition-colors">
                        <td className="p-4 font-extrabold text-primary">{d.dispatchNumber}</td>
                        <td className="p-4 text-muted-foreground">{formatDate(d.issueDate)}</td>
                        <td className="p-4">
                          <p className="font-bold text-foreground">
                            {d.customer?.companyName || d.customer?.name || 'Клиент'}
                          </p>
                          <p className="text-[10px] text-muted-foreground">{d.deliveryAddress}</p>
                        </td>
                        <td className="p-4 space-y-1">
                          {d.items.map((it) => (
                            <p key={it.id} className="font-semibold text-foreground">
                              • {it.quantity}x {it.title} {it.productCode ? `(${it.productCode})` : ''}
                            </p>
                          ))}
                        </td>
                        <td className="p-4">
                          {d.stockDeducted ? (
                            <span className="px-2.5 py-1 rounded-full bg-emerald-500/15 text-emerald-400 font-extrabold text-[10px]">
                              ✓ ИЗДАДЕНО (Залиха намалена)
                            </span>
                          ) : (
                            <span className="px-2.5 py-1 rounded-full bg-amber-500/15 text-amber-400 font-extrabold text-[10px]">
                              НАЦРТ (Чека излез)
                            </span>
                          )}
                        </td>
                        <td className="p-4">
                          <div className="flex items-center justify-center gap-1.5">
                            {!d.stockDeducted && (
                              <button
                                onClick={() => {
                                  setConfirmState({
                                    isOpen: true,
                                    title: 'Потврда за Излез на Стока од Магацин',
                                    message: `Дали сте сигурни дека сакате да го потврдите излезот за испратницата „${d.dispatchNumber}“ и да ја намалите залихата во магацин?`,
                                    variant: 'warning',
                                    confirmLabel: 'Потврди Излез',
                                    onConfirm: () => {
                                      setConfirmState((prev) => ({ ...prev, isOpen: false }));
                                      imfexStore.confirmAndIssueDispatchNote(d.id);
                                      refreshAll();
                                      toast.success('Испратницата е потврдена!', 'Залихата во магацинот е намалена.');
                                    },
                                  });
                                }}
                                className="px-2.5 py-1.5 rounded-lg bg-emerald-600 text-white font-bold text-[10px] hover:bg-emerald-700 cursor-pointer"
                              >
                                Потврди Излез
                              </button>
                            )}
                            <button
                              onClick={() => setPdfDispatch(d)}
                              className="px-2.5 py-1.5 rounded-lg bg-primary text-primary-foreground font-bold text-[10px] flex items-center gap-1 cursor-pointer"
                            >
                              <Printer className="w-3.5 h-3.5" /> PDF Испратница
                            </button>
                            <button
                              onClick={() => {
                                setConfirmState({
                                  isOpen: true,
                                  title: 'Избриши Испратница',
                                  message: `Дали сте сигурни дека сакате да ја избришете испратницата „${d.dispatchNumber}“?`,
                                  variant: 'danger',
                                  confirmLabel: 'Избриши',
                                  onConfirm: () => {
                                    setConfirmState((prev) => ({ ...prev, isOpen: false }));
                                    imfexStore.deleteDispatchNote(d.id);
                                    refreshAll();
                                  },
                                });
                              }}
                              className="p-1.5 text-rose-500 hover:bg-rose-500/10 rounded-lg cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* TAB 4: УПЛАТИ И ТРАНСАКЦИИ                                            */}
      {/* ===================================================================== */}
      {activeTab === 'payments' && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 bg-card p-4 rounded-xl border border-border">
            <div>
              <h3 className="font-extrabold text-sm text-foreground">Регистар на сите уплати и исплати</h3>
              <p className="text-[11px] text-muted-foreground">
                Сите приливи од клиенти (аванси, фактури) и исплати кон добавувачи / трошоци.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowAdvanceModal(true)}
                className="px-3.5 py-2 rounded-xl bg-emerald-600 text-white font-bold flex items-center gap-1.5 cursor-pointer"
              >
                <Euro className="w-4 h-4" /> Евидентирај Уплата на Аванс
              </button>
              <button
                onClick={() => {
                  setPayDirection('IN');
                  setPaySalesInvoiceId('');
                  setPayPurchaseInvoiceId('');
                  setPayPartnerName('');
                  setPayAmount(0);
                  setPayProjectId('');
                  setPayNotes('');
                  setShowPaymentModal(true);
                }}
                className="px-4 py-2 rounded-xl bg-primary text-primary-foreground font-extrabold flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-4 h-4" /> Нова Уплата / Исплата
              </button>
            </div>
          </div>

          <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left min-w-[850px]">
                <thead className="bg-muted/50 border-b border-border text-[10px] font-extrabold uppercase text-muted-foreground">
                  <tr>
                    <th className="p-4">Бр. на Уплата</th>
                    <th className="p-4">Датум</th>
                    <th className="p-4">Насока</th>
                    <th className="p-4">Клиент / Партнер</th>
                    <th className="p-4">Начин / Сметка</th>
                    <th className="p-4">Забелешка / Документ</th>
                    <th className="p-4 text-right">Износ (€)</th>
                    <th className="p-4 text-center">Акции</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredPayments.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="p-10 text-center text-muted-foreground">
                        Нема евидентирани уплати.
                      </td>
                    </tr>
                  ) : (
                    filteredPayments.map((pay) => (
                      <tr key={pay.id} className="hover:bg-muted/20 transition-colors">
                        <td className="p-4 font-extrabold text-primary">{pay.paymentNumber}</td>
                        <td className="p-4 text-muted-foreground">{formatDate(pay.date)}</td>
                        <td className="p-4">
                          <span
                            className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase inline-flex items-center gap-1 ${
                              pay.direction === 'IN'
                                ? 'bg-emerald-500/15 text-emerald-400'
                                : 'bg-rose-500/15 text-rose-400'
                            }`}
                          >
                            {pay.direction === 'IN' ? (
                              <>
                                <ArrowDownLeft className="w-3 h-3" /> ПРИЛИВ {pay.isAdvance ? '(АВАНС)' : ''}
                              </>
                            ) : (
                              <>
                                <ArrowUpRight className="w-3 h-3" /> ОДЛИВ (ТРОШОК/НАБАВКА)
                              </>
                            )}
                          </span>
                        </td>
                        <td className="p-4 font-bold text-foreground">{pay.partnerName || '—'}</td>
                        <td className="p-4 text-muted-foreground">{pay.method}</td>
                        <td className="p-4 text-muted-foreground">{pay.notes || '—'}</td>
                        <td
                          className={`p-4 text-right font-black text-sm ${
                            pay.direction === 'IN' ? 'text-emerald-400' : 'text-rose-400'
                          }`}
                        >
                          {pay.direction === 'IN' ? '+' : '-'}€{Number(pay.amount || 0).toFixed(2)}
                        </td>
                        <td className="p-4 text-center">
                          <button
                            onClick={() => {
                              setConfirmState({
                                isOpen: true,
                                title: 'Избриши Трансакција / Уплата',
                                message: `Дали сте сигурни дека сакате да ја избришете трансакцијата „${pay.paymentNumber}“ (${pay.partnerName || '—'}, €${Number(pay.amount || 0).toFixed(2)})?`,
                                variant: 'danger',
                                confirmLabel: 'Избриши',
                                onConfirm: () => {
                                  setConfirmState((prev) => ({ ...prev, isOpen: false }));
                                  imfexStore.deletePayment(pay.id);
                                  refreshAll();
                                },
                              });
                            }}
                            className="p-1.5 text-rose-500 hover:bg-rose-500/10 rounded-lg cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* TAB 5: ПАРТНЕРИ И ДОБАВУВАЧИ                                          */}
      {/* ===================================================================== */}
      {activeTab === 'partners' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between bg-card p-4 rounded-xl border border-border">
            <div>
              <h3 className="font-extrabold text-sm text-foreground">Партнери и Добавувачи (пр. Doors Impex)</h3>
              <p className="text-[11px] text-muted-foreground">
                Преглед на деловни партнери и компании од CRM. Добавувачите со евидентирани набавки се означени со беџ „ДОБАВУВАЧ“.
              </p>
            </div>
            <button
              onClick={() => setShowPartnerModal(true)}
              className="px-4 py-2 rounded-xl bg-primary text-primary-foreground font-extrabold flex items-center gap-1.5 cursor-pointer shrink-0"
            >
              <Plus className="w-4 h-4" /> Додај Партнер / Добавувач
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {partnersList.map((partner) => {
              const pName = partner.companyName || partner.name;
              const cyrillicToLatin = (str: string) => {
                const map: Record<string, string> = {
                  а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', ѓ: 'gj', е: 'e', ж: 'zh', з: 'z',
                  ѕ: 'dz', и: 'i', ј: 'j', к: 'k', л: 'l', љ: 'lj', м: 'm', н: 'n', њ: 'nj',
                  о: 'o', п: 'p', р: 'r', с: 's', т: 't', ќ: 'kj', у: 'u', ф: 'f', х: 'h',
                  ц: 'c', ч: 'ch', џ: 'dzh', ш: 'sh',
                };
                return str
                  .toLowerCase()
                  .split('')
                  .map((ch) => map[ch] ?? ch)
                  .join('')
                  .replace(/ks/g, 'x')
                  .replace(/[^a-z0-9\s]/g, ' ')
                  .replace(/\s+/g, ' ')
                  .trim();
              };
              const normPartnerNames = [partner.companyName, partner.name]
                .filter(Boolean)
                .map((s) => cyrillicToLatin(String(s)));

              const partnerPurchases = purchases.filter((p) => {
                if (p.supplierId && p.supplierId === partner.id) return true;
                const normSup = cyrillicToLatin(p.supplierName || '');
                if (!normSup) return false;
                return normPartnerNames.some((np) => {
                  if (!np) return false;
                  if (np === normSup || np.includes(normSup) || normSup.includes(np)) return true;
                  const supTokens = normSup.split(' ').filter((w) => w.length >= 3);
                  return supTokens.length >= 2 && supTokens.every((tok) => np.includes(tok));
                });
              });
              const totalBought = partnerPurchases.reduce((s, p) => s + Number(p.totalAmount || 0), 0);
              const isSupplier = partnerPurchases.length > 0;

              return (
                <div key={partner.id} className="bg-card border border-border rounded-xl p-5 space-y-3 shadow-sm">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="px-2 py-0.5 rounded bg-primary/10 text-primary font-extrabold text-[10px] uppercase whitespace-nowrap">
                        {partner.customerType === 'PARTNER' ? 'ПАРТНЕР' : 'КОМПАНИЈА'}
                      </span>
                      {isSupplier && (
                        <span className="px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-500 font-extrabold text-[10px] uppercase whitespace-nowrap">
                          ДОБАВУВАЧ
                        </span>
                      )}
                    </div>
                    <span className="text-[11px] text-muted-foreground shrink-0">ЕДБ: {partner.taxId || '—'}</span>
                  </div>
                  <h4 className="font-extrabold text-base text-foreground">{pName}</h4>
                  <p className="text-muted-foreground text-[11px]">
                    {[partner.phone, partner.email].filter(Boolean).join(' • ') || '—'}
                  </p>
                  <div className="pt-2 border-t border-border flex items-center justify-between">
                    <span className="text-muted-foreground">Вкупно набавки:</span>
                    <strong className="text-foreground">€{totalBought.toFixed(2)} ({partnerPurchases.length} ф-ри)</strong>
                  </div>
                  <button
                    onClick={() => {
                      setPSupplierName(pName);
                      setShowPurchaseModal(true);
                    }}
                    className="w-full py-2 rounded-lg bg-secondary hover:bg-primary hover:text-primary-foreground font-bold text-xs transition-all cursor-pointer"
                  >
                    + Внеси Влезна Фактура од {pName}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* MODAL 1: НОВА ВЛЕЗНА ФАКТУРА / НАБАВКА / ТРОШОК                       */}
      {/* ===================================================================== */}
      {showPurchaseModal && (
        <div className="fixed inset-0 z-50 bg-black/65 backdrop-blur-sm flex items-center justify-center p-4" role="dialog" aria-modal="true">
          <div className="bg-card border border-border rounded-2xl max-w-4xl w-full p-6 shadow-2xl space-y-5 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div>
                <h3 className="font-extrabold text-base text-foreground flex items-center gap-2">
                  <ShoppingCart className="w-5 h-5 text-primary" />
                  <span>Внеси Влезна Фактура / Набавка на Стока / Трошок</span>
                </h3>
                <p className="text-[11px] text-muted-foreground">
                  Секоја ставка може да биде <strong>СТОКА</strong> (влегува во залиха со набавна цена) или <strong>ТРОШОК</strong> (гориво, режии, потрошен материјал).
                </p>
              </div>
              <button
                onClick={() => setShowPurchaseModal(false)}
                className="p-1.5 text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSavePurchaseInvoice} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 bg-muted/30 p-4 rounded-xl border border-border">
                <div>
                  <label className="block font-bold mb-1">Добавувач / Партнер *</label>
                  <input
                    type="text"
                    required
                    list="purchase-partners-list"
                    value={pSupplierName}
                    onChange={(e) => setPSupplierName(e.target.value)}
                    placeholder="пр. Doors Impex, Макпетрол..."
                    className="w-full px-3 py-2 rounded-lg border border-border bg-background font-bold outline-none"
                  />
                  <datalist id="purchase-partners-list">
                    <option value="Doors Impex" />
                    <option value="Макпетрол (Гориво)" />
                    <option value="ЕВН Македонија" />
                    <option value="Железарија Профи (Монтажен материјал)" />
                    {partnersList.map((p) => (
                      <option key={p.id} value={p.companyName || p.name} />
                    ))}
                  </datalist>
                </div>

                <div>
                  <label className="block font-bold mb-1">Број на влезна ф-ра / сметка</label>
                  <input
                    type="text"
                    value={pSupplierInvNum}
                    onChange={(e) => setPSupplierInvNum(e.target.value)}
                    placeholder="пр. DF-2026-884"
                    className="w-full px-3 py-2 rounded-lg border border-border bg-background font-mono outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold mb-1">Датум</label>
                  <input
                    type="date"
                    value={pIssueDate}
                    onChange={(e) => setPIssueDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-border bg-background outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold mb-1">Поврзи со Проект (Опционално)</label>
                  <ProjectSelect
                    value={pProjectId}
                    onChange={(val) => setPProjectId(val)}
                    allowClear
                    clearLabel="-- Општа набавка / Магацин --"
                    placeholder="-- Пребарај проект по код PRJ- или клиент --"
                  />
                </div>
              </div>

              {/* Items Builder */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="font-extrabold uppercase text-[11px] text-muted-foreground">
                    Ставки на документот ({pItems.length})
                  </label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        setPItems((prev) => [
                          ...prev,
                          { id: `pi-${Date.now()}`, itemType: 'STOCK', title: '', quantity: 1, unitCost: 0, totalCost: 0 },
                        ])
                      }
                      className="px-3 py-1.5 rounded-lg bg-sky-500/15 text-sky-400 font-bold hover:bg-sky-500/25 cursor-pointer"
                    >
                      + Додај Стока за Залиха
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setPItems((prev) => [
                          ...prev,
                          {
                            id: `pi-${Date.now()}`,
                            itemType: 'EXPENSE',
                            expenseCategory: 'ГОРИВО',
                            title: '',
                            quantity: 1,
                            unitCost: 0,
                            totalCost: 0,
                          },
                        ])
                      }
                      className="px-3 py-1.5 rounded-lg bg-amber-500/15 text-amber-400 font-bold hover:bg-amber-500/25 cursor-pointer"
                    >
                      + Додај Трошок (Гориво / Материјал / Сметка)
                    </button>
                  </div>
                </div>

                {pItems.map((item, idx) => (
                  <div key={item.id} className="p-4 rounded-xl border border-border bg-background/70 space-y-3">
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
                      {/* Item Type Switch */}
                      <div className="md:col-span-2">
                        <label className="block text-[10px] font-bold uppercase text-muted-foreground mb-1">
                          Тип на ставка
                        </label>
                        <select
                          value={item.itemType}
                          onChange={(e) =>
                            handleUpdatePItem(idx, {
                              itemType: e.target.value as PurchaseItemType,
                              expenseCategory: e.target.value === 'EXPENSE' ? 'ГОРИВО' : undefined,
                            })
                          }
                          className={`w-full px-2.5 py-2 rounded-lg border font-extrabold outline-none ${
                            item.itemType === 'STOCK'
                              ? 'border-sky-500/40 bg-sky-500/10 text-sky-400'
                              : 'border-amber-500/40 bg-amber-500/10 text-amber-400'
                          }`}
                        >
                          <option value="STOCK">СТОКА (Залиха)</option>
                          <option value="EXPENSE">ТРОШОК</option>
                        </select>
                      </div>

                      {/* Dynamic Middle Column: Product Selector OR Expense Category */}
                      {item.itemType === 'STOCK' ? (
                        <div className="md:col-span-5 space-y-1">
                          <div className="flex items-center justify-between">
                            <label className="text-[10px] font-bold uppercase text-muted-foreground">
                              Производ од магацин
                            </label>
                            <button
                              type="button"
                              onClick={() =>
                                setInlineNewProdRowIndex(inlineNewProdRowIndex === idx ? null : idx)
                              }
                              className="text-[10px] font-extrabold text-primary hover:underline flex items-center gap-1 cursor-pointer"
                            >
                              <PackagePlus className="w-3 h-3" /> + Креирај нов производ тука
                            </button>
                          </div>
                          <ProductSelect
                            value={item.productId || ''}
                            onChange={(val, prod) => {
                              handleUpdatePItem(idx, {
                                productId: prod?.id,
                                productCode: prod?.code,
                                title: prod?.name || item.title,
                                unitCost: prod?.purchasePrice || item.unitCost || 0,
                              });
                            }}
                            allowClear
                            clearLabel="-- Избери постоечки производ --"
                            placeholder="-- Пребарај производ по шифра од каталог или назив --"
                          />
                        </div>
                      ) : (
                        <div className="md:col-span-5 grid grid-cols-2 gap-2">
                          <div>
                            <label className="block text-[10px] font-bold uppercase text-muted-foreground mb-1">
                              Категорија на трошок
                            </label>
                            <select
                              value={item.expenseCategory || 'ГОРИВО'}
                              onChange={(e) =>
                                handleUpdatePItem(idx, { expenseCategory: e.target.value as ExpenseCategory })
                              }
                              className="w-full px-2.5 py-2 rounded-lg border border-border bg-card font-semibold outline-none"
                            >
                              {Object.entries(EXPENSE_CATEGORY_LABELS).map(([k, lbl]) => (
                                <option key={k} value={k}>
                                  {lbl}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold uppercase text-muted-foreground mb-1">
                              Опис на трошокот *
                            </label>
                            <input
                              type="text"
                              value={item.title}
                              onChange={(e) => handleUpdatePItem(idx, { title: e.target.value })}
                              placeholder="пр. Дизел гориво / Монтажен материјал"
                              className="w-full px-2.5 py-2 rounded-lg border border-border bg-card font-semibold outline-none"
                            />
                          </div>
                        </div>
                      )}

                      {item.itemType === 'STOCK' && (
                        <div className="md:col-span-2">
                          <label className="block text-[10px] font-bold uppercase text-muted-foreground mb-1">
                            Назив на ставка *
                          </label>
                          <input
                            type="text"
                            value={item.title}
                            onChange={(e) => handleUpdatePItem(idx, { title: e.target.value })}
                            placeholder="пр. Врата Doors Impex"
                            className="w-full px-2.5 py-2 rounded-lg border border-border bg-card font-semibold outline-none"
                          />
                        </div>
                      )}

                      <div className="md:col-span-1">
                        <label className="block text-[10px] font-bold uppercase text-muted-foreground mb-1">
                          Кол.
                        </label>
                        <input
                          type="number"
                          min="1"
                          value={item.quantity}
                          onChange={(e) => handleUpdatePItem(idx, { quantity: parseInt(e.target.value) || 1 })}
                          className="w-full px-2 py-2 rounded-lg border border-border bg-card font-bold text-center outline-none"
                        />
                      </div>

                      <div className="md:col-span-2">
                        <label className="block text-[10px] font-bold uppercase text-muted-foreground mb-1">
                          Набавна Ед. Цена (€)
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          value={item.unitCost}
                          onChange={(e) => handleUpdatePItem(idx, { unitCost: parseFloat(e.target.value) || 0 })}
                          className="w-full px-2.5 py-2 rounded-lg border border-border bg-card font-extrabold text-primary outline-none"
                        />
                      </div>
                    </div>

                    {/* Inline Quick Create New Product Box */}
                    {inlineNewProdRowIndex === idx && (
                      <div className="p-3.5 rounded-xl border border-primary/40 bg-primary/5 space-y-3">
                        <p className="font-extrabold text-primary text-xs">
                          Креирај нов производ на самото место (автоматски се додава во Магацин/Каталог):
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-5 gap-2.5">
                          <input
                            type="text"
                            placeholder="Шифра (пр. GV-DI-01)"
                            value={inlineProdCode}
                            onChange={(e) => setInlineProdCode(e.target.value)}
                            className="px-2.5 py-1.5 rounded-lg border border-border bg-card font-mono font-bold"
                          />
                          <input
                            type="text"
                            placeholder="Назив (пр. Врата Doors Impex)"
                            value={inlineProdName}
                            onChange={(e) => setInlineProdName(e.target.value)}
                            className="sm:col-span-2 px-2.5 py-1.5 rounded-lg border border-border bg-card font-bold"
                          />
                          <div>
                            <label className="block text-[9px] text-muted-foreground">Набавна (€)</label>
                            <input
                              type="number"
                              value={inlineProdPurchasePrice}
                              onChange={(e) => setInlineProdPurchasePrice(parseFloat(e.target.value) || 0)}
                              className="w-full px-2.5 py-1 rounded-lg border border-border bg-card font-bold"
                            />
                          </div>
                          <div>
                            <label className="block text-[9px] text-muted-foreground">Продажна (€)</label>
                            <input
                              type="number"
                              value={inlineProdSellPrice}
                              onChange={(e) => setInlineProdSellPrice(parseFloat(e.target.value) || 0)}
                              className="w-full px-2.5 py-1 rounded-lg border border-border bg-card font-bold text-emerald-500"
                            />
                          </div>
                        </div>
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => setInlineNewProdRowIndex(null)}
                            className="px-3 py-1 rounded-lg border border-border bg-card font-bold"
                          >
                            Откажи
                          </button>
                          <button
                            type="button"
                            onClick={() => handleCreateInlineProduct(idx)}
                            className="px-3.5 py-1 rounded-lg bg-primary text-primary-foreground font-extrabold cursor-pointer"
                          >
                            + Зачувај Производ и Избери го
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Separate Receipt & Payment Checkboxes */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <label className="flex items-start gap-2.5 p-3.5 rounded-xl border border-emerald-500/30 bg-emerald-500/5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={pReceiveImmediately}
                    onChange={(e) => setPReceiveImmediately(e.target.checked)}
                    className="mt-0.5 w-4 h-4 accent-emerald-500"
                  />
                  <div>
                    <span className="font-extrabold text-foreground block">
                      Потврди „ПРИМЕНО ВО МАГАЦИН“ веднаш (Внеси во залиха)
                    </span>
                    <span className="text-[11px] text-muted-foreground">
                      Отштиклирајте ако фактурата стигнала пред стоката (ќе можете да кликнете „Прими во Залиха“ подоцна кога ќе пристигне).
                    </span>
                  </div>
                </label>

                <label className="flex items-start gap-2.5 p-3.5 rounded-xl border border-border bg-muted/20 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={pPaidImmediately}
                    onChange={(e) => setPPaidImmediately(e.target.checked)}
                    className="mt-0.5 w-4 h-4 accent-primary"
                  />
                  <div>
                    <span className="font-extrabold text-foreground block">
                      Веднаш евидентирај дека сметката е ПЛАТЕНА
                    </span>
                    <span className="text-[11px] text-muted-foreground">
                      Се запишува во Уплати и Трансакции (пр. за готовински сметки за гориво или потрошен материјал).
                    </span>
                  </div>
                </label>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-border">
                <button
                  type="button"
                  onClick={() => setShowPurchaseModal(false)}
                  className="px-4 py-2 rounded-xl border border-border bg-card font-bold cursor-pointer"
                >
                  Откажи
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 rounded-xl bg-primary text-primary-foreground font-extrabold shadow-md cursor-pointer"
                >
                  Зачувај Влезна Фактура / Трошок
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* MODAL 2: НОВА ИЗЛЕЗНА ФАКТУРА / ПРО-ФАКТУРА / АВАНСНА                  */}
      {/* ===================================================================== */}
      {showSalesInvoiceModal && (
        <div className="fixed inset-0 z-50 bg-black/65 backdrop-blur-sm flex items-center justify-center p-4" role="dialog" aria-modal="true">
          <div className="bg-card border border-border rounded-2xl max-w-3xl w-full p-6 shadow-2xl space-y-5 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div>
                <h3 className="font-extrabold text-base text-foreground">
                  Издавање Излезна Фактура / Про-фактура / Авансна фактура
                </h3>
                <p className="text-[11px] text-muted-foreground">
                  При Конечна фактура од проект, системот автоматски го одбива претходно платениот аванс.
                </p>
              </div>
              <button
                onClick={() => setShowSalesInvoiceModal(false)}
                className="p-1.5 text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveSalesInvoice} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-muted/30 p-4 rounded-xl border border-border">
                <div>
                  <label className="block font-bold mb-1">Тип на документ *</label>
                  <select
                    value={sType}
                    onChange={(e) => setSType(e.target.value as SalesInvoiceType)}
                    className="w-full px-3 py-2 rounded-lg border border-border bg-background font-extrabold text-primary outline-none"
                  >
                    <option value="FINAL">Конечна Фактура (FAK)</option>
                    <option value="PROFORMA">Про-Фактура (PRO)</option>
                    <option value="ADVANCE">Авансна Фактура (AVN)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold mb-1">Начин на креирање</label>
                  <select
                    value={sSourceMode}
                    onChange={(e) => setSSourceMode(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-lg border border-border bg-background font-bold outline-none"
                  >
                    <option value="PROJECT_OR_OFFER">Од Проект / Прифатена Понуда</option>
                    <option value="MANUAL">Со артикли од Магацин / Рачно</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold mb-1">Сметководствен бр. (опц.)</label>
                  <input
                    type="text"
                    value={sExternalAccNum}
                    onChange={(e) => setSExternalAccNum(e.target.value)}
                    placeholder="пр. 2026-0145"
                    className="w-full px-3 py-2 rounded-lg border border-border bg-background font-mono outline-none"
                  />
                </div>
              </div>

              {/* Manual Keyboard Percentage Input when creating Advance Invoice */}
              {sType === 'ADVANCE' && (
                <div className="p-4 rounded-xl border border-amber-500/40 bg-amber-500/10 space-y-2.5">
                  {(() => {
                    const selProj = sSelectedProjectId ? projects.find((p) => p.id === sSelectedProjectId) : undefined;
                    const selOff = sSelectedOfferId
                      ? offers.find((o) => o.id === sSelectedOfferId)
                      : selProj?.offerId
                      ? offers.find((o) => o.id === selProj.offerId)
                      : selProj?.offer;
                    const fullBase =
                      sSourceMode === 'PROJECT_OR_OFFER'
                        ? Number(selOff?.totalAmount || 0)
                        : sManualItems.reduce((acc, i) => acc + Number(i.totalPrice || 0), 0) * (1 + sTaxRate / 100);
                    const pctVal = parseFloat(sAdvancePercent) || 0;
                    const calcAdv = Math.round(((fullBase * pctVal) / 100) * 100) / 100;
                    return (
                      <>
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div>
                            <label className="font-extrabold text-amber-500 flex items-center gap-1.5 text-xs">
                              <Percent className="w-4 h-4" />
                              <span>Процент и Износ на Авансна Фактура од целосната сума (%) *</span>
                            </label>
                            <p className="text-[11px] text-muted-foreground">
                              Внесете рачно процент со тастатура, износ во € или изберете од брзите копчиња:
                            </p>
                          </div>
                          <div className="flex flex-wrap items-center gap-2">
                            <div className="relative w-28">
                              <input
                                type="number"
                                step="0.01"
                                min="0.01"
                                max="100"
                                required
                                value={sAdvancePercent}
                                onChange={(e) => setSAdvancePercent(e.target.value)}
                                placeholder="пр. 70"
                                className="w-full pr-7 pl-3 py-2 rounded-lg border border-amber-500/50 bg-background font-black text-amber-500 outline-none focus:ring-2 focus:ring-amber-500"
                              />
                              <span className="absolute right-2.5 top-2 font-black text-muted-foreground">%</span>
                            </div>
                            {fullBase > 0 && (
                              <div className="relative w-32">
                                <input
                                  type="number"
                                  step="0.01"
                                  min="0.01"
                                  value={calcAdv}
                                  onChange={(e) => {
                                    const newAmt = parseFloat(e.target.value) || 0;
                                    if (fullBase > 0) {
                                      const newPct = Math.round(((newAmt / fullBase) * 100) * 100) / 100;
                                      setSAdvancePercent(String(newPct));
                                    }
                                  }}
                                  placeholder="Износ (€)"
                                  className="w-full pr-7 pl-3 py-2 rounded-lg border border-emerald-500/50 bg-background font-black text-emerald-500 outline-none focus:ring-2 focus:ring-emerald-500"
                                />
                                <span className="absolute right-2.5 top-2 font-black text-muted-foreground">€</span>
                              </div>
                            )}
                            <div className="flex gap-1">
                              {[30, 50, 70, 100].map((pct) => (
                                <button
                                  key={pct}
                                  type="button"
                                  onClick={() => setSAdvancePercent(String(pct))}
                                  className={`px-2.5 py-1.5 rounded-lg font-extrabold text-[11px] cursor-pointer transition-colors ${
                                    Number(sAdvancePercent) === pct
                                      ? 'bg-amber-500 text-slate-950'
                                      : 'bg-card border border-border text-foreground hover:bg-muted'
                                  }`}
                                >
                                  {pct}%
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>
                        {fullBase > 0 && (
                          <div className="text-[11px] font-bold text-foreground pt-1 border-t border-amber-500/20 flex items-center justify-between">
                            <span>Целосна сума со ДДВ: €{fullBase.toFixed(2)}</span>
                            <span className="text-amber-500 font-black">
                              Износ на Авансна Фактура ({pctVal}%): €{calcAdv.toFixed(2)}
                            </span>
                          </div>
                        )}
                      </>
                    );
                  })()}
                </div>
              )}

              {sSourceMode === 'PROJECT_OR_OFFER' ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 rounded-xl border border-border bg-background">
                  <div>
                    <label className="block font-bold mb-1">Избери Проект</label>
                    <ProjectSelect
                      value={sSelectedProjectId}
                      onChange={(val, prj) => {
                        setSSelectedProjectId(val);
                        if (prj) {
                          setSCustomerId(prj.customerId);
                          setSSelectedOfferId(prj.offerId);
                        }
                      }}
                      allowClear
                      clearLabel="-- Без избран проект --"
                      placeholder="-- Пребарај проект по код PRJ- или клиент --"
                    />
                  </div>

                  <div>
                    <label className="block font-bold mb-1">Или избери Понуда</label>
                    <OfferSelect
                      value={sSelectedOfferId}
                      onChange={(val, off) => {
                        setSSelectedOfferId(val);
                        if (off) setSCustomerId(off.customerId);
                      }}
                      allowClear
                      clearLabel="-- Без избрана понуда --"
                      placeholder="-- Пребарај понуда по код OFF- или клиент --"
                    />
                  </div>
                </div>
              ) : (
                <div className="space-y-3 p-4 rounded-xl border border-border bg-background">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block font-bold mb-1">Клиент *</label>
                      <CustomerSelect
                        value={sCustomerId}
                        onChange={(val) => setSCustomerId(val)}
                        placeholder="-- Пребарај и избери Клиент --"
                      />
                    </div>
                    <div>
                      <label className="block font-bold mb-1">Поврзи со проект (за одбивање аванс)</label>
                      <ProjectSelect
                        value={sSelectedProjectId}
                        onChange={(val) => setSSelectedProjectId(val)}
                        allowClear
                        clearLabel="-- Без проект --"
                        placeholder="-- Пребарај проект по код PRJ- или клиент --"
                      />
                    </div>
                  </div>

                  {sManualItems.map((it, idx) => (
                    <div key={it.id} className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-end">
                      <div className="sm:col-span-4">
                        <label className="block text-[10px] text-muted-foreground mb-1">Производ од залиха</label>
                        <ProductSelect
                          value={it.productId || ''}
                          onChange={(val, prod) => {
                            const price = Number(prod?.models?.[0]?.basePrice || it.unitPrice || 0);
                            const copy = [...sManualItems];
                            copy[idx] = {
                              ...copy[idx],
                              productId: prod?.id,
                              title: prod?.name || copy[idx].title,
                              unitPrice: price,
                              totalPrice: Math.round(price * copy[idx].quantity * 100) / 100,
                            };
                            setSManualItems(copy);
                          }}
                          allowClear
                          clearLabel="-- Избери од магацин --"
                          placeholder="-- Пребарај производ по шифра од каталог или назив --"
                        />
                      </div>
                      <div className="sm:col-span-4">
                        <label className="block text-[10px] text-muted-foreground">Назив на фактура</label>
                        <input
                          type="text"
                          value={it.title}
                          onChange={(e) => {
                            const copy = [...sManualItems];
                            copy[idx].title = e.target.value;
                            setSManualItems(copy);
                          }}
                          className="w-full px-2.5 py-1.5 rounded-lg border border-border bg-card font-bold"
                        />
                      </div>
                      <div className="sm:col-span-2">
                        <label className="block text-[10px] text-muted-foreground">Кол.</label>
                        <input
                          type="number"
                          min="1"
                          value={it.quantity}
                          onChange={(e) => {
                            const q = parseInt(e.target.value) || 1;
                            const copy = [...sManualItems];
                            copy[idx].quantity = q;
                            copy[idx].totalPrice = Math.round(q * copy[idx].unitPrice * 100) / 100;
                            setSManualItems(copy);
                          }}
                          className="w-full px-2 py-1.5 rounded-lg border border-border bg-card text-center font-bold"
                        />
                      </div>
                      <div className="sm:col-span-2">
                        <label className="block text-[10px] text-muted-foreground">Ед. цена (€)</label>
                        <input
                          type="number"
                          step="0.01"
                          value={it.unitPrice}
                          onChange={(e) => {
                            const up = parseFloat(e.target.value) || 0;
                            const copy = [...sManualItems];
                            copy[idx].unitPrice = up;
                            copy[idx].totalPrice = Math.round(up * copy[idx].quantity * 100) / 100;
                            setSManualItems(copy);
                          }}
                          className="w-full px-2 py-1.5 rounded-lg border border-border bg-card font-bold text-primary"
                        />
                      </div>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() =>
                      setSManualItems((prev) => [
                        ...prev,
                        { id: `si-${Date.now()}`, title: '', quantity: 1, unitPrice: 0, totalPrice: 0 },
                      ])
                    }
                    className="text-primary font-bold hover:underline cursor-pointer"
                  >
                    + Додај ред
                  </button>
                </div>
              )}

              <div>
                <label className="block font-bold mb-1">Забелешка на фактурата</label>
                <input
                  type="text"
                  value={sNotes}
                  onChange={(e) => setSNotes(e.target.value)}
                  placeholder="пр. Испорака и монтажа согласно договор..."
                  className="w-full px-3 py-2 rounded-lg border border-border bg-background outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-border">
                <button
                  type="button"
                  onClick={() => setShowSalesInvoiceModal(false)}
                  className="px-4 py-2 rounded-xl border border-border bg-card font-bold cursor-pointer"
                >
                  Откажи
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 rounded-xl bg-primary text-primary-foreground font-extrabold shadow-md cursor-pointer"
                >
                  Генерирај Фактура и Отвори PDF
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* MODAL 3: НОВА ИСПРАТНИЦА                                              */}
      {/* ===================================================================== */}
      {showDispatchModal && (
        <div className="fixed inset-0 z-50 bg-black/65 backdrop-blur-sm flex items-center justify-center p-4" role="dialog" aria-modal="true">
          <div className="bg-card border border-border rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-4 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div>
                <h3 className="font-extrabold text-base text-foreground">Креирај Испратница (Физички излез)</h3>
                <p className="text-[11px] text-muted-foreground">
                  При потврда на испратницата, залихата се намалува и резервираните артикли се раздолжуваат.
                </p>
              </div>
              <button
                onClick={() => setShowDispatchModal(false)}
                className="p-1.5 text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveDispatchNote} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-muted/30 p-4 rounded-xl border border-border">
                <div>
                  <label className="block font-bold mb-1">Повлечи ставки од Проект</label>
                  <ProjectSelect
                    value={dProjectId}
                    onChange={(val) => handleSelectDispatchProject(val)}
                    allowClear
                    clearLabel="-- Избери Проект (или рачно) --"
                    placeholder="-- Пребарај проект по код PRJ- или клиент --"
                  />
                </div>

                <div>
                  <label className="block font-bold mb-1">Клиент *</label>
                  <CustomerSelect
                    value={dCustomerId}
                    onChange={(val) => setDCustomerId(val)}
                    placeholder="-- Пребарај и избери Клиент --"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="block font-bold text-muted-foreground uppercase text-[10px]">
                  Производи кои излегуваат од магацин:
                </label>
                {dItems.map((it, idx) => (
                  <div key={it.id} className="grid grid-cols-12 gap-2 items-center">
                    <div className="col-span-5">
                      <ProductSelect
                        value={it.productId || ''}
                        onChange={(val, prod) => {
                          const copy = [...dItems];
                          copy[idx] = {
                            ...copy[idx],
                            productId: prod?.id,
                            productCode: prod?.code,
                            title: prod?.name || copy[idx].title,
                          };
                          setDItems(copy);
                        }}
                        placeholder="-- Пребарај производ по код или назив --"
                        allowClear
                        clearLabel="-- Избери од залиха --"
                      />
                    </div>
                    <input
                      type="text"
                      value={it.title}
                      onChange={(e) => {
                        const copy = [...dItems];
                        copy[idx].title = e.target.value;
                        setDItems(copy);
                      }}
                      placeholder="Назив на артикл"
                      className="col-span-5 px-2.5 py-1.5 rounded-lg border border-border bg-background font-bold"
                    />
                    <input
                      type="number"
                      min="1"
                      value={it.quantity}
                      onChange={(e) => {
                        const copy = [...dItems];
                        copy[idx].quantity = parseInt(e.target.value) || 1;
                        setDItems(copy);
                      }}
                      className="col-span-2 px-2 py-1.5 rounded-lg border border-border bg-background text-center font-bold"
                    />
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() =>
                    setDItems((prev) => [...prev, { id: `di-${Date.now()}`, title: '', quantity: 1 }])
                  }
                  className="text-primary font-bold hover:underline cursor-pointer"
                >
                  + Додај производ за излез
                </button>
              </div>

              <label className="flex items-center gap-2 p-3 rounded-xl border border-emerald-500/30 bg-emerald-500/5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={dIssueImmediately}
                  onChange={(e) => setDIssueImmediately(e.target.checked)}
                  className="w-4 h-4 accent-emerald-500"
                />
                <span className="font-bold text-foreground">
                  Веднаш раздолжи ја залихата во магацинот (Статус: ИЗДАДЕНА)
                </span>
              </label>

              <div className="flex justify-end gap-2 pt-3 border-t border-border">
                <button
                  type="button"
                  onClick={() => setShowDispatchModal(false)}
                  className="px-4 py-2 rounded-xl border border-border bg-card font-bold cursor-pointer"
                >
                  Откажи
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 rounded-xl bg-primary text-primary-foreground font-extrabold shadow-md cursor-pointer"
                >
                  Издај Испратница и Отвори PDF
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* MODAL 4: ЕВИДЕНТИРАЈ УПЛАТА / ИСПЛАТА                                 */}
      {/* ===================================================================== */}
      {showPaymentModal && (
        <div className="fixed inset-0 z-50 bg-black/65 backdrop-blur-sm flex items-center justify-center p-4" role="dialog" aria-modal="true">
          <div className="bg-card border border-border rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="font-extrabold text-base text-foreground">Евидентирај Уплата / Исплата</h3>
              <button
                onClick={() => setShowPaymentModal(false)}
                className="p-1.5 text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSavePayment} className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setPayDirection('IN')}
                  className={`py-2 rounded-lg font-extrabold cursor-pointer ${
                    payDirection === 'IN'
                      ? 'bg-emerald-600 text-white'
                      : 'bg-muted text-muted-foreground'
                  }`}
                >
                  + Прилив од Клиент
                </button>
                <button
                  type="button"
                  onClick={() => setPayDirection('OUT')}
                  className={`py-2 rounded-lg font-extrabold cursor-pointer ${
                    payDirection === 'OUT'
                      ? 'bg-rose-600 text-white'
                      : 'bg-muted text-muted-foreground'
                  }`}
                >
                  - Одлив кон Добавувач
                </button>
              </div>

              <div className="space-y-2">
                <label className="block font-bold mb-1">
                  Избери Клиент / Партнер (со пребарување) *
                </label>
                <CustomerSelect
                  includeSuppliers
                  value={payCustomerId || (payPartnerName ? `SUPPLIER:${payPartnerName}` : '')}
                  onChange={(val, cust) => {
                    if (val.startsWith('SUPPLIER:')) {
                      setPayCustomerId('');
                      setPayPartnerName(val.replace('SUPPLIER:', ''));
                    } else if (cust) {
                      setPayCustomerId(cust.id);
                      setPayPartnerName(cust.companyName || cust.name);
                    } else {
                      setPayCustomerId('');
                      setPayPartnerName('');
                    }
                  }}
                  placeholder="Пребарај и избери клиент или партнер..."
                  searchPlaceholder="Пребарај по име, компанија, ЕДБ, телефон..."
                />
                <input
                  type="text"
                  value={payPartnerName}
                  onChange={(e) => {
                    setPayPartnerName(e.target.value);
                    const matched = customers.find(
                      (c) => (c.companyName || c.name).toLowerCase() === e.target.value.trim().toLowerCase()
                    );
                    setPayCustomerId(matched?.id || '');
                  }}
                  placeholder="Или внесете / коригирајте назив на клиент или партнер..."
                  className="w-full px-3 py-1.5 text-xs rounded-lg border border-border bg-background/70 font-semibold outline-none"
                />
              </div>

              {/* Link Payment with Project or Offer */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-muted/20 rounded-xl border border-border">
                <div>
                  <label className="block text-[11px] font-bold mb-1">Поврзи со Проект (опц.)</label>
                  <ProjectSelect
                    value={payProjectId}
                    onChange={(val) => setPayProjectId(val)}
                    allowClear
                    clearLabel="-- Без проект --"
                    placeholder="-- Избери проект (PRJ-) --"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold mb-1">Поврзи со Понуда (опц.)</label>
                  <OfferSelect
                    value={payOfferId}
                    onChange={(val) => setPayOfferId(val)}
                    allowClear
                    clearLabel="-- Без понуда --"
                    placeholder="-- Избери понуда (OFF-) --"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold mb-1">Начин на плаќање</label>
                <select
                  value={payMethod}
                  onChange={(e) => setPayMethod(e.target.value as PaymentMethod)}
                  className="w-full px-3 py-2 rounded-lg border border-border bg-background font-bold outline-none"
                >
                  <option value="BANK">Банкарска сметка (Извод)</option>
                  <option value="CASH">Готовина / Благајна</option>
                  <option value="CARD">Картичка</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold mb-1">Износ (€) *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={payAmount}
                    onChange={(e) => setPayAmount(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 rounded-lg border border-border bg-background font-extrabold text-primary"
                  />
                </div>
                <div>
                  <label className="block font-bold mb-1">Датум</label>
                  <input
                    type="date"
                    value={payDate}
                    onChange={(e) => setPayDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-border bg-background"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold mb-1">Забелешка</label>
                <input
                  type="text"
                  value={payNotes}
                  onChange={(e) => setPayNotes(e.target.value)}
                  placeholder="пр. Уплата по конечна фактура..."
                  className="w-full px-3 py-2 rounded-lg border border-border bg-background"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-border">
                <button
                  type="button"
                  onClick={() => setShowPaymentModal(false)}
                  className="px-4 py-2 rounded-xl border border-border bg-card font-bold cursor-pointer"
                >
                  Откажи
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-primary text-primary-foreground font-extrabold cursor-pointer"
                >
                  Зачувај Уплата
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Advance Payment Modal with 3 Workflow Choices */}
      <AdvancePaymentModal
        isOpen={showAdvanceModal}
        onClose={() => setShowAdvanceModal(false)}
        project={advanceTargetProject}
        offer={advanceTargetOffer}
        onSuccess={({ advanceInvoice }) => {
          refreshAll();
          if (advanceInvoice) {
            setPdfInvoice(advanceInvoice);
          }
        }}
      />

      {/* Official PDF Preview Modal for Invoices & Dispatch Notes */}
      <FinancePdfModal
        isOpen={Boolean(pdfInvoice || pdfDispatch)}
        onClose={() => {
          setPdfInvoice(null);
          setPdfDispatch(null);
          setPdfInitialEmailOpen(false);
        }}
        invoice={pdfInvoice}
        dispatchNote={pdfDispatch}
        initialEmailOpen={pdfInitialEmailOpen}
      />

      {/* Partner / Supplier Modal */}
      <CustomerModal
        isOpen={showPartnerModal}
        onClose={() => setShowPartnerModal(false)}
        onSaveSuccess={refreshAll}
      />

      <ConfirmModal
        isOpen={confirmState.isOpen}
        title={confirmState.title}
        message={confirmState.message}
        variant={confirmState.variant}
        confirmLabel={confirmState.confirmLabel}
        onConfirm={confirmState.onConfirm}
        onCancel={() => setConfirmState((prev) => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
}

export default function FinancePage() {
  return (
    <Suspense fallback={<div className="p-8 text-xs text-muted-foreground">Се вчитува модулот Финансии и Набавки...</div>}>
      <FinancePageContent />
    </Suspense>
  );
}
