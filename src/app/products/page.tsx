'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useI18n } from '@/lib/i18n-context';
import { Product, ProductStockType, UserRole, Project, SalesInvoice } from '@/types';
import { imfexStore, useImfexStore } from '@/lib/store';
import {
  useProductsQuery,
  useCategoriesQuery,
  useProjectsQuery,
  useOffersQuery,
  useInventoryMovementsQuery,
} from '@/lib/queries';
import { ProductEditor } from '@/components/product-spec-builder/product-editor';
import { AdvancePaymentModal } from '@/components/finance/advance-payment-modal';
import { FinancePdfModal } from '@/components/pdf/printable-finance-document';
import { ProductSelect, ProjectSelect } from '@/components/ui/entity-selectors';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { formatDate } from '@/lib/date-format';
import { formatTime24 } from '@/lib/formatters';
import { toast } from '@/components/ui/toastr';
import { ConfirmModal } from '@/components/ui/confirm-modal';
import { PageLoadingSkeleton } from '@/components/ui/loading-skeleton';
import { useEscapeKey } from '@/components/ui/use-escape-key';
import {
  PageHeader,
  StatCard,
  TabBar,
  StatusBadge,
} from '@/components/ui/page-primitives';
import {
  Package,
  Plus,
  Layers,
  Search,
  XCircle,
  ArrowRight,
  History,
  Settings2,
  Briefcase,
  Boxes,
  SlidersHorizontal,
} from 'lucide-react';

type ActiveTab = 'catalog' | 'config' | 'moves' | 'projects';

export default function ProductsPage() {
  const { t } = useI18n();
  useImfexStore();
  const productsQuery = useProductsQuery();
  const categoriesQuery = useCategoriesQuery();
  const projectsQuery = useProjectsQuery();
  const offersQuery = useOffersQuery();
  useInventoryMovementsQuery();

  const products = useMemo(() => productsQuery.data ?? imfexStore.getProducts(), [productsQuery.data]);
  const categories = useMemo(() => categoriesQuery.data ?? imfexStore.getCategories(), [categoriesQuery.data]);
  const projectsList = useMemo(() => projectsQuery.data ?? imfexStore.getProjects(), [projectsQuery.data]);
  const offersList = useMemo(() => offersQuery.data ?? imfexStore.getOffers(), [offersQuery.data]);
  const [role, setRole] = useState<UserRole>('SUPER_ADMIN');
  const [activeTab, setActiveTab] = useState<ActiveTab>('catalog');
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const selectedProductCodeRef = React.useRef<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [isMounted, setIsMounted] = useState(false);

  // Configuration tab state: linked warehouse accessories (motor, rail) & advanced specs toggle
  const [selectedMotorId, setSelectedMotorId] = useState<string>('');
  const [selectedRailId, setSelectedRailId] = useState<string>('');
  const [showAdvancedEditor, setShowAdvancedEditor] = useState(false);

  // Project / Order tab state (real CRM projects)
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');

  // Modals for adding product / categories
  const [showAddModal, setShowAddModal] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showAdvanceModal, setShowAdvanceModal] = useState(false);
  const [previewInvoice, setPreviewInvoice] = useState<SalesInvoice | null>(null);
  const [confirmState, setConfirmState] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    confirmLabel?: string;
    variant?: 'danger' | 'warning' | 'primary' | 'success';
    onConfirm: () => void;
  } | null>(null);
  const [newProdName, setNewProdName] = useState('');
  const [newProdCode, setNewProdCode] = useState('');
  const [newProdCatId, setNewProdCatId] = useState('');
  const [newProdType, setNewProdType] = useState<ProductStockType>('STOCK');
  const [newProdStock, setNewProdStock] = useState<number>(10);
  const [newProdPrice, setNewProdPrice] = useState<number>(250);
  const [newProdPurchasePrice, setNewProdPurchasePrice] = useState<number>(0);
  const [newProdDesc, setNewProdDesc] = useState('');

  const refreshProducts = () => {
    void productsQuery.refetch();
    void categoriesQuery.refetch();
    void projectsQuery.refetch();
  };

  useEffect(() => {
    setIsMounted(true);
    setRole(imfexStore.getCurrentRole());
  }, []);

  useEffect(() => {
    if (projectsList.length > 0) {
      setSelectedProjectId((prev) =>
        prev && projectsList.some((pr) => pr.id === prev) ? prev : projectsList[0].id
      );
    } else {
      setSelectedProjectId('');
    }
  }, [projectsList]);

  useEffect(() => {
    if (products.length > 0) {
      setSelectedProductId((prev) => {
        if (prev && products.some((p) => p.id === prev)) return prev;
        if (selectedProductCodeRef.current) {
          const byCode = products.find((p) => p.code === selectedProductCodeRef.current);
          if (byCode) return byCode.id;
        }
        return products[0].id;
      });

      setSelectedMotorId((prev) => {
        if (prev && products.some((p) => p.id === prev)) return prev;
        const motor = products.find((p) => getProductCatName(p, categories) === 'Автоматика');
        return motor ? motor.id : '';
      });

      setSelectedRailId((prev) => {
        if (prev && products.some((p) => p.id === prev)) return prev;
        const rail = products.find((p) => getProductCatName(p, categories) === 'Шини');
        return rail ? rail.id : '';
      });
    } else {
      setSelectedProductId(null);
      setSelectedMotorId('');
      setSelectedRailId('');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [products, categories]);

  useEscapeKey(showAddModal, () => setShowAddModal(false));

  if (!isMounted || (!imfexStore.isLoadedFromBackend && productsQuery.isLoading)) {
    return <PageLoadingSkeleton cards={3} rows={6} />;
  }

  const isSuperAdmin = role === 'SUPER_ADMIN';

  function getProductCatName(p: Product, catsList = categories): string {
    if (p.category?.name) return p.category.name;
    const found = catsList.find((c) => c.id === p.categoryId);
    if (found) return found.name;
    if (p.code.startsWith('GV')) return 'Гаражни врати';
    if (p.code.startsWith('AV')) return 'Автоматика';
    if (p.code.startsWith('SH')) return 'Шини';
    if (p.code.startsWith('SV')) return 'Собни врати';
    if (p.code.startsWith('EL') || p.code.startsWith('DO')) return 'Додатоци';
    return 'Општо';
  }

  // Counters matching the HTML specification
  const totalCount = products.length;
  const zeroStockCount = products.filter(
    (p) => (p.stockType || 'STOCK') === 'STOCK' && (p.stockQuantity ?? 0) === 0
  ).length;
  const customOrderCount = products.filter((p) => p.stockType === 'CUSTOM').length;

  // Categories list for dropdown
  const uniqueCategoryNames = [
    'ALL',
    ...Array.from(new Set(products.map((p) => getProductCatName(p)))),
  ];

  // Filtered catalog list
  const filteredCatalog = products.filter((p) => {
    const catName = getProductCatName(p);
    const matchesCat = categoryFilter === 'ALL' || catName === categoryFilter;
    const matchesSearch =
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.code.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCat && matchesSearch;
  });

  const selectedProduct =
    products.find((p) => p.id === selectedProductId) || filteredCatalog[0] || products[0];

  const motorProducts = products.filter((p) => getProductCatName(p) === 'Автоматика');
  const railProducts = products.filter((p) => getProductCatName(p) === 'Шини');
  const motorProd = products.find((p) => p.id === selectedMotorId) || motorProducts[0];
  const railProd = products.find((p) => p.id === selectedRailId) || railProducts[0];

  const movements = imfexStore.getInventoryMovements();
  const realProjects = imfexStore.getProjects();
  const activeRealProject: Project | undefined =
    realProjects.find((pr) => pr.id === selectedProjectId) || realProjects[0];

  const openProductConfig = (id: string) => {
    setSelectedProductId(id);
    setActiveTab('config');
  };

  // Warehouse receive / sell handlers
  const handleReceive = (id: string) => {
    const prod = products.find((item) => item.id === id);
    setConfirmState({
      isOpen: true,
      title: 'Прием во магацин (+1)',
      message: `Дали сте сигурни дека сакате да евидентирате прием во магацин (+1) за артиклот „${prod?.name || id}“?`,
      confirmLabel: 'Да, прими во залиха',
      variant: 'success',
      onConfirm: () => {
        const p = imfexStore.receiveProductStock(id, 1);
        if (p) {
          toast.success('Прием во магацин', `+1 ${p.name} (Нова залиха: ${p.stockQuantity})`);
          refreshProducts();
        }
        setConfirmState(null);
      },
    });
  };

  const handleSell = (id: string) => {
    const prod = products.find((item) => item.id === id);
    setConfirmState({
      isOpen: true,
      title: 'Магацински излез (-1)',
      message: `Дали сте сигурни дека сакате да евидентирате магацински излез (-1) за артиклот „${prod?.name || id}“?`,
      confirmLabel: 'Да, потврди излез',
      variant: 'warning',
      onConfirm: () => {
        const p = imfexStore.issueProductStock(id, 1);
        if (p) {
          toast.info('Магацински излез', `−1 ${p.name} (Преостаната залиха: ${p.stockQuantity})`);
          refreshProducts();
        }
        setConfirmState(null);
      },
    });
  };

  // Real Project 5-Step Flow Handlers
  const handleStep1Accept = () => {
    if (!activeRealProject || activeRealProject.acceptedAt) return;
    setConfirmState({
      isOpen: true,
      title: 'Чекор 1: Прифати финална понуда',
      message: `Дали сте сигурни дека сакате да ја потврдите финалната понуда за проектот „${activeRealProject.projectNumber}“ и да резервирате магацински додатоци?`,
      confirmLabel: 'Да, потврди',
      variant: 'success',
      onConfirm: () => {
        const reservedIds: string[] = [];
        for (const acc of [motorProd, railProd]) {
          if (acc) {
            const res = imfexStore.reserveProductStock(acc.id, 1);
            if (res > 0) reservedIds.push(acc.id);
          }
        }
        imfexStore.addInventoryMovement(
          'РЕЗЕРВАЦИЈА',
          `Прифатена финална понуда ${activeRealProject.projectNumber} — резервирани достапни додатоци`,
          { projectId: activeRealProject.id }
        );
        imfexStore.saveProject({
          ...activeRealProject,
          acceptedAt: new Date().toISOString(),
          reservedAccessoryIds: reservedIds,
        });
        toast.success('Финална понуда прифатена', 'Достапните магацински додатоци се резервирани.');
        refreshProducts();
        setConfirmState(null);
      },
    });
  };

  const handleStep2Payment = () => {
    if (!activeRealProject) return;
    setShowAdvanceModal(true);
  };

  const handleStep3Order = () => {
    if (!activeRealProject) return;
    setConfirmState({
      isOpen: true,
      title: 'Чекор 3: Нарачај кај добавувач',
      message: `Дали сте сигурни дека сакате да го промените статусот на набавка во „Нарачано кај добавувач“ за проектот „${activeRealProject.projectNumber}“?`,
      confirmLabel: 'Да, нарачај',
      variant: 'primary',
      onConfirm: () => {
        imfexStore.projectStepOrderSupplier(activeRealProject.id, selectedProduct?.name);
        toast.success('Набавка', `Нарачано кај добавувач за ${activeRealProject.projectNumber}.`);
        refreshProducts();
        setConfirmState(null);
      },
    });
  };

  const handleStep4ReceiveDoor = () => {
    if (!activeRealProject) return;
    setConfirmState({
      isOpen: true,
      title: 'Чекор 4: Прими врата во магацин',
      message: `Дали сте сигурни дека сакате да потврдите прием на вратата во магацин за проектот „${activeRealProject.projectNumber}“?`,
      confirmLabel: 'Да, прими во магацин',
      variant: 'success',
      onConfirm: () => {
        imfexStore.projectStepReceiveWarehouse(activeRealProject.id, selectedProduct?.name);
        toast.success('Прием во магацин', `Вратата е примена и резервирана за ${activeRealProject.projectNumber}.`);
        refreshProducts();
        setConfirmState(null);
      },
    });
  };

  const handleStep5IssueDispatch = () => {
    if (!activeRealProject) return;
    setConfirmState({
      isOpen: true,
      title: 'Чекор 5: Издај испратница',
      message: `Дали сте сигурни дека сакате да издадете испратница и магацински излез за проектот „${activeRealProject.projectNumber}“?`,
      confirmLabel: 'Да, издај испратница',
      variant: 'warning',
      onConfirm: () => {
        const ids = [motorProd?.id, railProd?.id].filter(Boolean) as string[];
        imfexStore.projectStepIssueDispatch(activeRealProject.id, ids);
        toast.success('Испратница издадена', `Издадена испратница за ${activeRealProject.projectNumber}.`);
        refreshProducts();
        setConfirmState(null);
      },
    });
  };

  const handleCreateProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProdName.trim() || !newProdCode.trim()) return;

    const catObj = categories.find((c) => c.id === newProdCatId);
    const prodId = `prod-${Date.now()}`;
    const newProd: Product = {
      id: prodId,
      name: newProdName.trim(),
      code: newProdCode.trim().toUpperCase(),
      categoryId: newProdCatId || null,
      category: catObj,
      description: newProdDesc.trim() || `${catObj?.name || 'Каталог'} · ${newProdType === 'CUSTOM' ? 'По нарачка' : 'Залиха'}`,
      isActive: true,
      stockType: newProdType,
      stockQuantity: newProdType === 'CUSTOM' ? 0 : Number(newProdStock || 0),
      reservedQuantity: 0,
      purchasePrice: Math.max(0, Number(newProdPurchasePrice || 0)),
      models: [
        {
          id: `mod-${Date.now()}`,
          productId: prodId,
          name: `${newProdName.trim()} Стандард`,
          basePrice: Number(newProdPrice || 250),
        },
      ],
      specificationKeys: [],
    };

    imfexStore.saveProduct(newProd);
    selectedProductCodeRef.current = newProd.code;
    refreshProducts();
    setSelectedProductId(newProd.id);
    setNewProdName('');
    setNewProdCode('');
    setNewProdPurchasePrice(0);
    setNewProdDesc('');
    setShowAddModal(false);
    toast.success('Артиклот е додаден', `${newProd.code} — ${newProd.name}`);
  };

  // Current project flow flags
  const isAccepted = activeRealProject ? Boolean(activeRealProject.acceptedAt || activeRealProject.offerId) : false;
  const isPaid = activeRealProject ? Boolean(activeRealProject.advancePaid) : false;
  const isOrdered = activeRealProject
    ? Boolean(activeRealProject.supplierOrdered || activeRealProject.procurementStatus === 'ORDERED' || activeRealProject.procurementStatus === 'DELIVERED')
    : false;
  const isReceived = activeRealProject
    ? Boolean(activeRealProject.warehouseReceived || activeRealProject.procurementStatus === 'DELIVERED')
    : false;
  const isIssued = activeRealProject
    ? Boolean(activeRealProject.dispatchIssued || activeRealProject.status === 'COMPLETED' || activeRealProject.status === 'CLOSED')
    : false;

  const missingAccessories = [motorProd, railProd]
    .filter((acc): acc is Product => Boolean(acc))
    .filter((acc) => {
      const stockQty = acc.stockQuantity ?? 0;
      const resQty = acc.reservedQuantity ?? 0;
      return stockQty - resQty <= 0 && !(resQty > 0);
    })
    .map((acc) => acc.name);

  return (
    <div className="space-y-5 pb-12">
      {/* Unified Minimal Page Header */}
      <PageHeader
        title={t('products.title')}
        subtitle={t('products.subtitle')}
        icon={<Package className="w-5 h-5" />}
        actions={
          isSuperAdmin ? (
            <>
              <button
                type="button"
                onClick={() => setShowCategoryModal(true)}
                className="h-9 px-3 text-xs font-medium rounded-lg border border-border bg-card hover:bg-muted text-foreground inline-flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Layers className="w-3.5 h-3.5 text-muted-foreground" />
                <span>{t('products.categories_btn')}</span>
              </button>
              <button
                type="button"
                onClick={() => setShowAddModal(true)}
                className="h-9 px-3.5 text-xs font-semibold rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 inline-flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>{t('products.new_item_btn')}</span>
              </button>
            </>
          ) : undefined
        }
      />

      {/* Compact 3-Column KPI Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          label={t('products.kpi_total')}
          value={totalCount}
          tone="primary"
          icon={<Boxes className="w-4 h-4" />}
        />
        <StatCard
          label={t('products.kpi_out_of_stock')}
          value={zeroStockCount}
          tone={zeroStockCount > 0 ? 'danger' : 'success'}
          icon={<XCircle className="w-4 h-4" />}
        />
        <StatCard
          label={t('products.kpi_custom_order')}
          value={customOrderCount}
          tone="neutral"
          icon={<SlidersHorizontal className="w-4 h-4" />}
        />
      </div>

      {/* BIZ-07: Per-SKU Low-Stock Alert Banner with 1-Click Draft PO Reorder */}
      {(() => {
        const lowStockItems = products.filter((p) => {
          if (p.stockType === 'CUSTOM') return false;
          const available = (p.stockQuantity ?? 0) - (p.reservedQuantity ?? 0);
          const threshold = p.minStockLevel ?? 3;
          return available <= threshold;
        });
        if (lowStockItems.length === 0) return null;
        return (
          <div className="p-4 rounded-xl border border-amber-500/35 bg-amber-500/[0.07] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div>
              <strong className="font-semibold text-foreground block">
                {t('products.low_stock_alert_title')} ({lowStockItems.length})
              </strong>
              <span className="text-muted-foreground">
                {lowStockItems
                  .slice(0, 4)
                  .map((p) => `${p.code} (${Math.max(0, (p.stockQuantity ?? 0) - (p.reservedQuantity ?? 0))}/${p.minStockLevel ?? 3})`)
                  .join(' · ')}
                {lowStockItems.length > 4 ? ` +${lowStockItems.length - 4}` : ''}
              </span>
            </div>
            <button
              type="button"
              onClick={() => {
                const poItems = lowStockItems.map((p, idx) => {
                  const targetQty = Math.max(1, (p.minStockLevel ?? 3) * 2 - Math.max(0, (p.stockQuantity ?? 0) - (p.reservedQuantity ?? 0)));
                  const unitCost = Number(p.purchasePrice || 0);
                  return {
                    id: `pi-low-${Date.now()}-${idx}`,
                    itemType: 'STOCK' as const,
                    productId: p.id,
                    title: `${p.code} — ${p.name}`,
                    quantity: targetQty,
                    unitCost,
                    totalCost: Math.round(unitCost * targetQty * 100) / 100,
                  };
                });
                const subtotal = Math.round(poItems.reduce((s, it) => s + it.totalCost, 0) * 100) / 100;
                const taxAmount = Math.round(subtotal * 0.18 * 100) / 100;
                const po = imfexStore.savePurchaseInvoice({
                  id: `pinv-${Date.now()}`,
                  internalNumber: imfexStore.generatePurchaseNumber(),
                  supplierId: '',
                  supplierName: 'Добавувач (Дополнување залиха)',
                  issueDate: new Date().toISOString().split('T')[0],
                  status: 'DRAFT',
                  receiptStatus: 'PENDING',
                  taxRate: 18,
                  subtotal,
                  taxAmount,
                  totalAmount: Math.round((subtotal + taxAmount) * 100) / 100,
                  paidAmount: 0,
                  notes: 'Автоматски нацрт-нарачка од аларм за ниска залиха.',
                  items: poItems,
                  createdAt: new Date().toISOString(),
                });
                toast.success(t('products.reorder_po_created'), `${po.internalNumber} (${poItems.length})`);
              }}
              className="h-8 px-3 rounded-lg bg-primary text-primary-foreground font-semibold text-xs hover:bg-primary/90 cursor-pointer shrink-0"
            >
              {t('products.btn_create_reorder_po')}
            </button>
          </div>
        );
      })()}

      {/* Unified Horizontal Tab Bar */}
      <TabBar
        activeTab={activeTab}
        onChange={(id) => setActiveTab(id as ActiveTab)}
        tabs={[
          { id: 'catalog', label: t('products.tab_catalog'), count: products.length, icon: <Boxes className="w-3.5 h-3.5" /> },
          { id: 'config', label: t('products.tab_config'), icon: <Settings2 className="w-3.5 h-3.5" /> },
          { id: 'moves', label: t('products.tab_moves'), count: movements.length, icon: <History className="w-3.5 h-3.5" /> },
          { id: 'projects', label: t('products.tab_projects'), icon: <Briefcase className="w-3.5 h-3.5" /> },
        ]}
      />

      {/* Main Content Panel */}
      <section className="surface-card rounded-xl p-5 sm:p-6">
        {/* TAB 1: КАТАЛОГ */}
        {activeTab === 'catalog' && (
          <div className="space-y-4">
            {/* Compact Filter Row */}
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="sm:w-56 shrink-0">
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="w-full h-9 px-3 py-0 leading-9 text-xs rounded-lg border border-border bg-background text-foreground outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary font-medium cursor-pointer"
                >
                  {uniqueCategoryNames.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat === 'ALL' ? t('products.all_categories') : cat}
                    </option>
                  ))}
                </select>
              </div>
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                <input
                  type="text"
                  placeholder={t('products.search_placeholder')}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full h-9 pl-9 pr-3 text-xs rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground/70 outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                />
              </div>
            </div>

            {/* Catalog Table */}
            <div className="overflow-x-auto -mx-5 sm:-mx-6">
              <table className="w-full border-collapse text-left text-xs">
                <thead>
                  <tr className="bg-muted/40 border-y border-border text-muted-foreground text-[11px] font-medium">
                    <th className="py-3 px-5">{t('products.col_code')}</th>
                    <th className="py-3 px-4">{t('products.col_product')}</th>
                    <th className="py-3 px-4">{t('products.col_category')}</th>
                    <th className="py-3 px-4">{t('products.purchase_cost_short')}</th>
                    <th className="py-3 px-4">{t('products.base_price_short')}</th>
                    <th className="py-3 px-4">{t('products.col_physical_stock')}</th>
                    <th className="py-3 px-4">{t('products.col_reserved')}</th>
                    <th className="py-3 px-5 text-right">{t('products.col_action')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/70">
                  {filteredCatalog.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-10 text-center text-muted-foreground">
                        {t('products.empty_filtered')}
                      </td>
                    </tr>
                  ) : (
                    filteredCatalog.map((p) => {
                      const catName = getProductCatName(p);
                      const isCustom = p.stockType === 'CUSTOM';
                      const stockQty = p.stockQuantity ?? 0;
                      const resQty = p.reservedQuantity ?? 0;
                      const costPrice = Number(p.purchasePrice ?? 0);
                      const baseSellPrice = Number(p.models?.[0]?.basePrice ?? 0);

                      const minLevel = p.minStockLevel ?? 3;
                      const stockVariant = isCustom
                        ? 'primary'
                        : stockQty <= 0
                        ? 'danger'
                        : stockQty <= minLevel
                        ? 'warning'
                        : 'success';

                      return (
                        <tr key={p.id} className="hover:bg-muted/30 transition-colors">
                          <td className="py-3.5 px-5 font-mono text-xs text-muted-foreground whitespace-nowrap">
                            {p.code}
                          </td>
                          <td className="py-3.5 px-4 font-medium text-foreground">
                            {p.name}
                          </td>
                          <td className="py-3.5 px-4 text-muted-foreground">
                            {catName}
                          </td>
                          <td className="py-3.5 px-4 tabular-nums text-muted-foreground whitespace-nowrap">
                            {costPrice > 0 ? `€${costPrice.toFixed(2)}` : '—'}
                          </td>
                          <td className="py-3.5 px-4 tabular-nums font-semibold text-foreground whitespace-nowrap">
                            {baseSellPrice > 0 ? `€${baseSellPrice.toFixed(2)}` : '—'}
                          </td>
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            <StatusBadge variant={stockVariant} dot>
                              {isCustom
                                ? t('products.badge_custom')
                                : stockQty <= 0
                                ? t('products.out_of_stock')
                                : `${stockQty} ${t('products.pcs_short')}`}
                            </StatusBadge>
                          </td>
                          <td className="py-3.5 px-4 font-medium text-foreground tabular-nums">
                            {resQty}
                          </td>
                          <td className="py-3.5 px-5 text-right whitespace-nowrap">
                            <button
                              type="button"
                              onClick={() => openProductConfig(p.id)}
                              className="h-7 px-3 rounded-md border border-border bg-background hover:bg-muted text-xs font-medium text-foreground transition-colors cursor-pointer"
                            >
                              {t('products.open')}
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 2: КОНФИГУРАЦИЈА */}
        {activeTab === 'config' && !selectedProduct && (
          <div className="p-8 text-center text-muted-foreground space-y-3">
            <p className="text-xs sm:text-sm">{t('products.empty_catalog')}</p>
            {isSuperAdmin && (
              <button
                onClick={() => setShowAddModal(true)}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-lg bg-primary text-primary-foreground hover:brightness-110 transition-all cursor-pointer"
              >
                <Plus className="w-4 h-4" /> {t('products.add_item_plus')}
              </button>
            )}
          </div>
        )}
        {activeTab === 'config' && selectedProduct && (
          <div className="space-y-5">
            {/* Quick Product Switcher Bar + Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
              <div>
                <div className="flex flex-wrap items-center gap-2.5">
                  <h2 className="text-xl font-extrabold text-foreground">
                    {selectedProduct.name}
                  </h2>
                  <span
                    className={`inline-block rounded-md px-2.5 py-1 text-xs font-semibold border ${
                      selectedProduct.stockType === 'CUSTOM'
                        ? 'bg-sky-500/15 text-sky-700 dark:text-sky-300 border-sky-500/30'
                        : (selectedProduct.stockQuantity ?? 0) <= 0
                        ? 'bg-red-500/15 text-red-700 dark:text-red-300 border-red-500/30'
                        : (selectedProduct.stockQuantity ?? 0) <= 3
                        ? 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30'
                        : 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30'
                    }`}
                  >
                    {selectedProduct.stockType === 'CUSTOM'
                      ? t('products.badge_custom')
                      : (selectedProduct.stockQuantity ?? 0) <= 0
                      ? t('products.out_of_stock')
                      : t('products.badge_stock')}
                  </span>
                </div>
                <small className="text-xs text-muted-foreground block mt-1">
                  {selectedProduct.code} · {getProductCatName(selectedProduct)}
                </small>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <div className="min-w-[220px] max-w-xs">
                  <ProductSelect
                    value={selectedProduct.id}
                    onChange={(id) => id && setSelectedProductId(id)}
                    products={products}
                  />
                </div>

                <button
                  onClick={() => setShowAdvancedEditor((prev) => !prev)}
                  className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg bg-secondary text-secondary-foreground hover:brightness-110 transition-all cursor-pointer"
                >
                  <SlidersHorizontal className="w-3.5 h-3.5" />
                  <span>{showAdvancedEditor ? t('products.hide_pricing_editor') : t('products.show_pricing_editor')}</span>
                </button>
              </div>
            </div>

            {selectedProduct.stockType === 'CUSTOM' ? (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Left Block: Real Product Specifications */}
                  <div className="p-4 sm:p-5 bg-background/60 border border-border rounded-xl space-y-3">
                    <b className="text-sm font-bold text-foreground block border-b border-border pb-2">
                      {t('products.product_specs')}
                    </b>
                    {selectedProduct.specificationKeys && selectedProduct.specificationKeys.length > 0 ? (
                      selectedProduct.specificationKeys.map((spec) => {
                        const defOpt = spec.options?.find((o) => o.isDefault) || spec.options?.[0];
                        const displayVal = defOpt?.label || spec.defaultValue || t('products.spec_by_choice');
                        return (
                          <div
                            key={spec.id}
                            className="flex justify-between items-center text-xs sm:text-sm py-1 border-b border-border/40"
                          >
                            <span className="text-muted-foreground">{spec.name}</span>
                            <b className="text-foreground">{displayVal}</b>
                          </div>
                        );
                      })
                    ) : (
                      <p className="text-xs text-muted-foreground italic py-1">
                        {t('products.no_specs_defined')}
                      </p>
                    )}
                    <div className="flex justify-between items-center text-xs sm:text-sm py-1">
                      <span className="text-muted-foreground">{t('products.manufacturing')}</span>
                      <b className="text-sky-400">{t('products.badge_custom')}</b>
                    </div>
                  </div>

                  {/* Right Block: Linked Warehouse Articles */}
                  <div className="p-4 sm:p-5 bg-background/60 border border-border rounded-xl space-y-4">
                    <b className="text-sm font-bold text-foreground block border-b border-border pb-2">
                      {t('products.linked_warehouse_items')}
                    </b>

                    <div className="space-y-1.5">
                      <small className="text-xs text-muted-foreground block font-semibold">{t('products.automation')}</small>
                      <ProductSelect
                        value={motorProd?.id || ''}
                        onChange={(id) => setSelectedMotorId(id)}
                        products={motorProducts}
                        placeholder={t('products.select_motor_placeholder')}
                      />
                      {motorProd && (
                        <p className="text-xs text-muted-foreground pt-0.5">
                          {t('products.stock_label')}{' '}
                          <b className="text-foreground">{motorProd.stockQuantity ?? 0}</b> · {t('products.reserved_label')}{' '}
                          <b className="text-foreground">{motorProd.reservedQuantity ?? 0}</b> · {t('products.available_label')}{' '}
                          <b className="text-emerald-400">
                            {Math.max(0, (motorProd.stockQuantity ?? 0) - (motorProd.reservedQuantity ?? 0))}
                          </b>
                        </p>
                      )}
                    </div>

                    <div className="space-y-1.5">
                      <small className="text-xs text-muted-foreground block font-semibold">{t('products.rail')}</small>
                      <ProductSelect
                        value={railProd?.id || ''}
                        onChange={(id) => setSelectedRailId(id)}
                        products={railProducts}
                        placeholder={t('products.select_rail_placeholder')}
                      />
                      {railProd && (
                        <p className="text-xs text-muted-foreground pt-0.5">
                          {t('products.stock_label')}{' '}
                          <b className="text-foreground">{railProd.stockQuantity ?? 0}</b> · {t('products.reserved_label')}{' '}
                          <b className="text-foreground">{railProd.reservedQuantity ?? 0}</b> · {t('products.available_label')}{' '}
                          <b className="text-emerald-400">
                            {Math.max(0, (railProd.stockQuantity ?? 0) - (railProd.reservedQuantity ?? 0))}
                          </b>
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Notice Box */}
                <div className="p-4 rounded-xl bg-primary/10 border border-primary/25 text-xs sm:text-sm text-foreground leading-relaxed">
                  {t('products.custom_notice')}
                </div>

                <div className="flex flex-wrap items-center gap-3 pt-1">
                  <button
                    onClick={() => setActiveTab('projects')}
                    className="px-4 py-2.5 rounded-lg bg-primary text-primary-foreground text-xs sm:text-sm font-bold hover:brightness-110 transition-all cursor-pointer inline-flex items-center gap-2"
                  >
                    <span>{t('products.open_sample_project')}</span>
                  </button>
                  <Link
                    href={`/offers/new?productId=${selectedProduct.id}`}
                    className="px-4 py-2.5 rounded-lg bg-secondary text-secondary-foreground text-xs sm:text-sm font-semibold hover:brightness-110 transition-all inline-flex items-center gap-2"
                  >
                    <span>{t('products.create_offer_with_product')}</span>
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="p-5 bg-background/60 border border-border rounded-xl space-y-4">
                  <div>
                    <h2 className="text-2xl font-extrabold text-foreground">
                      {selectedProduct.stockQuantity ?? 0} {t('products.pcs_full')}
                    </h2>
                    <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                      {t('products.reserved_label')} <b className="text-foreground">{selectedProduct.reservedQuantity ?? 0}</b> · {t('products.available_label')}{' '}
                      <b className="text-emerald-400">
                        {Math.max(0, (selectedProduct.stockQuantity ?? 0) - (selectedProduct.reservedQuantity ?? 0))}
                      </b>
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2.5">
                    <button
                      onClick={() => handleReceive(selectedProduct.id)}
                      className="px-4 py-2.5 rounded-lg bg-primary text-primary-foreground text-xs sm:text-sm font-bold hover:brightness-110 transition-all cursor-pointer"
                    >
                      {t('products.receive_one')}
                    </button>
                    <button
                      onClick={() => handleSell(selectedProduct.id)}
                      disabled={(selectedProduct.stockQuantity ?? 0) <= 0}
                      className="px-4 py-2.5 rounded-lg bg-secondary text-secondary-foreground text-xs sm:text-sm font-semibold hover:brightness-110 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {t('products.sell_one')}
                    </button>
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-primary/10 border border-primary/25 text-xs sm:text-sm text-foreground leading-relaxed">
                  {t('products.stock_notice')}
                </div>
              </div>
            )}

            {/* Collapsible Advanced Pricing & Dynamic Specifications Editor */}
            {showAdvancedEditor && (
              <div className="pt-4 border-t border-border">
                <ProductEditor
                  product={selectedProduct}
                  onUpdate={refreshProducts}
                  isSuperAdmin={isSuperAdmin}
                />
              </div>
            )}
          </div>
        )}

        {/* TAB 3: МАГАЦИНСКИ ДВИЖЕЊА */}
        {activeTab === 'moves' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg sm:text-xl font-bold text-foreground">{t('products.moves_title')}</h2>
              <span className="text-xs text-muted-foreground">
                {t('products.moves_total')} {movements.length}
              </span>
            </div>

            {movements.length === 0 ? (
              <div className="p-5 bg-background/60 border border-border rounded-xl text-xs sm:text-sm text-muted-foreground">
                {t('products.moves_empty')}
              </div>
            ) : (
              <div className="divide-y divide-border border border-border rounded-xl overflow-hidden bg-background/40">
                {movements.map((m) => {
                  let tagStyle = 'bg-sky-500/20 text-sky-300 border border-sky-500/30';
                  if (m.kind === 'ПРИЕМ') {
                    tagStyle = 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30';
                  } else if (m.kind === 'ИЗЛЕЗ') {
                    tagStyle = 'bg-amber-500/20 text-amber-300 border border-amber-500/30';
                  } else if (m.kind === 'РЕЗЕРВАЦИЈА') {
                    tagStyle = 'bg-blue-500/20 text-blue-300 border border-blue-500/30';
                  } else if (m.kind === 'УПЛАТА') {
                    tagStyle = 'bg-purple-500/20 text-purple-300 border border-purple-500/30';
                  } else if (m.kind === 'НАБАВКА') {
                    tagStyle = 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30';
                  }

                  return (
                    <div
                      key={m.id}
                      className="p-3.5 sm:p-4 flex items-center justify-between gap-4 hover:bg-muted/20 transition-colors text-xs sm:text-sm"
                    >
                      <div className="flex items-center gap-3 flex-wrap">
                        <span className={`inline-block rounded-md px-2.5 py-1 text-xs font-bold ${tagStyle}`}>
                          {m.kind}
                        </span>
                        <span className="text-foreground font-medium">{m.detail}</span>
                      </div>
                      <small className="text-xs text-muted-foreground shrink-0 font-mono tabular-nums">
                        {formatDate(m.createdAt || m.at)}{' '}
                        {formatTime24(m.createdAt || m.at)}
                      </small>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB 4: ПРОЕКТ / НАРАЧКА */}
        {activeTab === 'projects' && (
          <div className="space-y-5">
            {!activeRealProject ? (
              <div className="p-8 text-center text-muted-foreground space-y-2">
                <p className="text-xs sm:text-sm font-medium">{t('products.no_active_projects')}</p>
                <p className="text-xs text-muted-foreground">
                  {t('products.no_active_projects_hint')}
                </p>
              </div>
            ) : (
              <>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-4">
                  <div>
                    <h2 className="text-lg sm:text-xl font-bold text-foreground">
                      {t('products.project_label')} {activeRealProject.projectNumber} ({activeRealProject.customer?.companyName || activeRealProject.customer?.name || t('offers.customer')})
                    </h2>
                    <small className="text-xs text-muted-foreground block mt-0.5">
                      {(() => {
                        const linkedOffer =
                          offersList.find((o) => o.id === activeRealProject.offerId) || activeRealProject.offer;
                        const firstTitle =
                          linkedOffer?.items?.[0]?.customTitle ||
                          selectedProduct?.name ||
                          t('products.col_product');
                        return `${firstTitle} · ${t('products.linked_offer')} ${linkedOffer?.offerNumber || 'N/A'}`;
                      })()}
                    </small>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="min-w-[240px] max-w-sm">
                      <ProjectSelect
                        value={activeRealProject.id}
                        onChange={(id) => id && setSelectedProjectId(id)}
                        projects={realProjects}
                        placeholder={t('products.search_project_placeholder')}
                      />
                    </div>
                    <Link
                      href={`/projects/${activeRealProject.id}`}
                      className="px-3 py-2 rounded-lg bg-secondary text-secondary-foreground text-xs font-semibold hover:brightness-110 transition-all shrink-0"
                    >
                      {t('products.details_link')}
                    </Link>
                  </div>
                </div>

                {/* 2-Column Interactive Workflow Grid (.grid) */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Left Block: Понуди и аванс */}
                  <div className="p-5 bg-background/60 border border-border rounded-xl space-y-4">
                    <b className="text-sm font-bold text-foreground block">{t('products.offers_and_advance')}</b>
                    <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                      {t('products.offers_and_advance_desc')}
                    </p>

                    <div>
                      <span
                        className={`inline-block rounded-md px-2.5 py-1 text-xs font-bold ${
                          isAccepted
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                            : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                        }`}
                      >
                        {isAccepted ? t('products.final_offer_accepted') : t('products.awaiting_acceptance')}
                      </span>
                    </div>

                    <div className="space-y-2.5 pt-1">
                      <button
                        onClick={handleStep1Accept}
                        disabled={isAccepted}
                        className="w-full sm:w-auto px-4 py-2.5 rounded-lg bg-primary text-primary-foreground text-xs sm:text-sm font-semibold hover:brightness-110 transition-all cursor-pointer disabled:bg-muted disabled:text-muted-foreground disabled:border disabled:border-border disabled:opacity-70 disabled:hover:brightness-100 disabled:cursor-not-allowed block"
                      >
                        {t('products.step1_accept')}
                      </button>

                      <button
                        onClick={handleStep2Payment}
                        disabled={!isAccepted || isPaid}
                        className="w-full sm:w-auto px-4 py-2.5 rounded-lg bg-primary text-primary-foreground text-xs sm:text-sm font-semibold hover:brightness-110 transition-all cursor-pointer disabled:bg-muted disabled:text-muted-foreground disabled:border disabled:border-border disabled:opacity-70 disabled:hover:brightness-100 disabled:cursor-not-allowed block"
                      >
                        {t('products.step2_advance')} {imfexStore.getCompanySettings().defaultAdvancePercent ?? 50}%
                      </button>
                    </div>
                  </div>

                  {/* Right Block: Набавка и магацин */}
                  <div className="p-5 bg-background/60 border border-border rounded-xl space-y-4">
                    <b className="text-sm font-bold text-foreground block">{t('products.procurement_and_warehouse')}</b>

                    <div>
                      <span
                        className={`inline-block rounded-md px-2.5 py-1 text-xs font-bold ${
                          isOrdered
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                            : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                        }`}
                      >
                        {isOrdered ? t('products.door_ordered') : t('products.not_ordered')}
                      </span>
                    </div>

                    <div className="space-y-2.5 pt-1">
                      <button
                        onClick={handleStep3Order}
                        disabled={!isPaid || isOrdered}
                        className="w-full sm:w-auto px-4 py-2.5 rounded-lg bg-primary text-primary-foreground text-xs sm:text-sm font-semibold hover:brightness-110 transition-all cursor-pointer disabled:bg-muted disabled:text-muted-foreground disabled:border disabled:border-border disabled:opacity-70 disabled:hover:brightness-100 disabled:cursor-not-allowed block"
                      >
                        {t('products.step3_order')}
                      </button>

                      <button
                        onClick={handleStep4ReceiveDoor}
                        disabled={!isOrdered || isReceived}
                        className="w-full sm:w-auto px-4 py-2.5 rounded-lg bg-primary text-primary-foreground text-xs sm:text-sm font-semibold hover:brightness-110 transition-all cursor-pointer disabled:bg-muted disabled:text-muted-foreground disabled:border disabled:border-border disabled:opacity-70 disabled:hover:brightness-100 disabled:cursor-not-allowed block"
                      >
                        {t('products.step4_receive')}
                      </button>

                      <button
                        onClick={handleStep5IssueDispatch}
                        disabled={!isReceived || isIssued}
                        className="w-full sm:w-auto px-4 py-2.5 rounded-lg bg-primary text-primary-foreground text-xs sm:text-sm font-semibold hover:brightness-110 transition-all cursor-pointer disabled:bg-muted disabled:text-muted-foreground disabled:border disabled:border-border disabled:opacity-70 disabled:hover:brightness-100 disabled:cursor-not-allowed block"
                      >
                        {t('products.step5_dispatch')}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Status & Missing Accessories Notice (.notice) */}
                <div className="p-4 rounded-xl bg-primary/10 border border-primary/25 text-xs sm:text-sm text-foreground space-y-2 leading-relaxed">
                  <div>
                    <b>{t('products.state_label')}</b>{' '}
                    {isIssued
                      ? t('products.state_issued')
                      : isReceived
                      ? t('products.state_received')
                      : isOrdered
                      ? t('products.state_ordered')
                      : isPaid
                      ? t('products.state_paid')
                      : isAccepted
                      ? t('products.state_accepted')
                      : t('products.state_draft')}
                  </div>
                  <div>
                    <b>{t('products.missing_accessories_label')}</b>{' '}
                    {missingAccessories.length > 0 ? (
                      <span className="text-amber-400 font-semibold">{missingAccessories.join(', ')}</span>
                    ) : (
                      <span>{t('products.no_missing_accessories')}</span>
                    )}
                  </div>
                </div>

                <p className="text-xs text-muted-foreground">
                  {t('products.dispatch_note_footer')}
                </p>
              </>
            )}
          </div>
        )}
      </section>

      {/* Create Product Modal */}
      {showAddModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4"
          onClick={() => setShowAddModal(false)}
          role="dialog"
          aria-modal="true"
          aria-label={t('products.add_modal_title')}
        >
          <div
            className="bg-card border border-border rounded-2xl p-6 w-full max-w-md space-y-4 shadow-2xl text-xs"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h3 className="font-extrabold text-base flex items-center gap-2">
                <Package className="w-5 h-5 text-primary" />
                <span>{t('products.add_modal_title')}</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                aria-label={t('products.close')}
                className="text-muted-foreground hover:text-foreground cursor-pointer p-1 rounded-lg hover:bg-muted"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreateProduct} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1">{t('products.field_code')}</label>
                  <input
                    type="text"
                    required
                    placeholder="AV-005"
                    value={newProdCode}
                    onChange={(e) => setNewProdCode(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-border bg-background outline-none uppercase font-mono font-bold focus:ring-2 focus:ring-primary"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1">{t('products.field_stock_type')}</label>
                  <select
                    value={newProdType}
                    onChange={(e) => setNewProdType(e.target.value as ProductStockType)}
                    className="w-full px-3 py-2 rounded-lg border border-border bg-background outline-none focus:ring-2 focus:ring-primary font-semibold"
                  >
                    <option value="STOCK">{t('products.stock_type_stock')}</option>
                    <option value="CUSTOM">{t('products.stock_type_custom')}</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold mb-1">{t('products.field_name')}</label>
                <input
                  type="text"
                  required
                  placeholder={t('products.field_name_placeholder')}
                  value={newProdName}
                  onChange={(e) => setNewProdName(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-border bg-background outline-none focus:ring-2 focus:ring-primary font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1">{t('products.field_category')}</label>
                  <SearchableSelect
                    options={[
                      { value: '', label: t('products.no_category') },
                      ...categories.map((c) => ({ value: c.id, label: c.name })),
                    ]}
                    value={newProdCatId}
                    onChange={(val) => setNewProdCatId(val)}
                    placeholder={t('products.select_category')}
                    searchPlaceholder={t('products.search_category')}
                  />
                </div>

                <div>
                  <label className="block font-semibold mb-1">{t('products.field_base_price')}</label>
                  <input
                    type="number"
                    step="0.01"
                    value={newProdPrice}
                    onChange={(e) => setNewProdPrice(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 rounded-lg border border-border bg-background outline-none focus:ring-2 focus:ring-primary font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1">{t('products.purchase_cost_ex_vat')} (€)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={newProdPurchasePrice}
                    onChange={(e) => setNewProdPurchasePrice(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 rounded-lg border border-border bg-background outline-none focus:ring-2 focus:ring-primary font-bold"
                  />
                </div>
                {newProdType === 'STOCK' && (
                  <div>
                    <label className="block font-semibold mb-1">{t('products.field_initial_stock')}</label>
                    <input
                      type="number"
                      min="0"
                      value={newProdStock}
                      onChange={(e) => setNewProdStock(parseInt(e.target.value) || 0)}
                      className="w-full px-3 py-2 rounded-lg border border-border bg-background outline-none focus:ring-2 focus:ring-primary font-bold"
                    />
                  </div>
                )}
              </div>

              <div>
                <label className="block font-semibold mb-1">{t('products.field_notes')}</label>
                <textarea
                  rows={2}
                  placeholder={t('products.field_notes_placeholder')}
                  value={newProdDesc}
                  onChange={(e) => setNewProdDesc(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-border bg-background outline-none resize-none focus:ring-2 focus:ring-primary font-medium"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 font-semibold rounded-lg bg-secondary text-secondary-foreground cursor-pointer"
                >
                  {t('products.cancel')}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 font-bold rounded-lg bg-primary text-primary-foreground cursor-pointer shadow-md"
                >
                  {t('products.save_item')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Categories Modal */}
      {showCategoryModal && (
        <CategoriesModal onClose={() => setShowCategoryModal(false)} />
      )}

      {/* Advance Payment Modal with 3 Workflow Choices */}
      <AdvancePaymentModal
        isOpen={showAdvanceModal}
        onClose={() => setShowAdvanceModal(false)}
        project={activeRealProject}
        onSuccess={({ advanceInvoice }) => {
          refreshProducts();
          if (advanceInvoice) {
            setPreviewInvoice(advanceInvoice);
          }
        }}
      />

      {/* Official Finance Invoice PDF Modal */}
      <FinancePdfModal
        isOpen={Boolean(previewInvoice)}
        onClose={() => setPreviewInvoice(null)}
        invoice={previewInvoice}
      />

      {/* Confirmation Modal */}
      <ConfirmModal
        isOpen={Boolean(confirmState?.isOpen)}
        title={confirmState?.title || ''}
        message={confirmState?.message || ''}
        confirmLabel={confirmState?.confirmLabel}
        variant={confirmState?.variant || 'warning'}
        onConfirm={() => confirmState?.onConfirm()}
        onCancel={() => setConfirmState(null)}
      />
    </div>
  );
}

function CategoriesModal({ onClose }: { onClose: () => void }) {
  const { t } = useI18n();
  const [categories, setCategories] = useState(imfexStore.getCategories());
  const [newCatName, setNewCatName] = useState('');
  const [confirmDeleteCat, setConfirmDeleteCat] = useState<{ id: string; name: string } | null>(null);

  useEscapeKey(!confirmDeleteCat, onClose);

  useEffect(() => {
    const unsubscribe = imfexStore.subscribe(() => {
      setCategories(imfexStore.getCategories());
    });
    return unsubscribe;
  }, []);

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim()) return;
    imfexStore.saveCategory({
      id: `cat-${Date.now()}`,
      name: newCatName.trim(),
    });
    setNewCatName('');
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={t('products.categories_modal_title')}
    >
      <div
        className="bg-card border border-border rounded-2xl p-6 w-full max-w-md space-y-4 shadow-2xl text-xs"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h3 className="font-extrabold text-base flex items-center gap-2">
            <Layers className="w-5 h-5 text-primary" />
            <span>{t('products.categories_modal_title')}</span>
          </h3>
          <button
            type="button"
            onClick={onClose}
            aria-label={t('products.close')}
            className="p-1 hover:bg-muted rounded-lg text-muted-foreground cursor-pointer"
          >
            <XCircle className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleAdd} className="flex gap-2">
          <input
            type="text"
            required
            placeholder={t('products.category_placeholder')}
            value={newCatName}
            onChange={(e) => setNewCatName(e.target.value)}
            className="flex-1 px-3 py-2 rounded-lg border border-border bg-background outline-none focus:ring-2 focus:ring-primary font-medium"
          />
          <button
            type="submit"
            className="px-4 py-2 font-bold rounded-lg bg-primary text-primary-foreground hover:brightness-110 transition-all shadow-md"
          >
            {t('products.add_btn')}
          </button>
        </form>

        <div className="space-y-2 max-h-64 overflow-y-auto pt-2">
          {categories.length === 0 ? (
            <div className="text-center text-muted-foreground p-4">{t('products.no_categories')}</div>
          ) : (
            categories.map((c) => (
              <div
                key={c.id}
                className="flex items-center justify-between p-3 border border-border rounded-lg bg-muted/20"
              >
                <span className="font-bold">{c.name}</span>
                <button
                  onClick={() => setConfirmDeleteCat({ id: c.id, name: c.name })}
                  className="text-red-500 hover:bg-red-500/10 p-1.5 rounded-lg transition-colors"
                  title="Избриши категорија"
                >
                  <XCircle className="w-4 h-4" />
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      <ConfirmModal
        isOpen={Boolean(confirmDeleteCat)}
        title="Избриши Категорија"
        message={`Дали сте сигурни дека сакате да ја избришете категоријата „${confirmDeleteCat?.name || ''}“?`}
        confirmLabel="Да, избриши"
        variant="danger"
        onConfirm={() => {
          if (confirmDeleteCat) {
            imfexStore.deleteCategory(confirmDeleteCat.id);
          }
          setConfirmDeleteCat(null);
        }}
        onCancel={() => setConfirmDeleteCat(null)}
      />
    </div>
  );
}
