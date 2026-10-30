'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useI18n } from '@/lib/i18n-context';
import { Product, ProductStockType, UserRole, Project } from '@/types';
import { imfexStore, useImfexStore } from '@/lib/store';
import { ProductEditor } from '@/components/product-spec-builder/product-editor';
import { toast } from '@/components/ui/toastr';
import {
  Package,
  ShieldAlert,
  Plus,
  Layers,
  Search,
  XCircle,
  Loader2,
  ArrowRight,
  History,
  Settings2,
  Briefcase,
  Boxes,
  CheckCircle2,
  AlertTriangle,
  Truck,
  FileCheck,
  CreditCard,
  SlidersHorizontal,
} from 'lucide-react';

type ActiveTab = 'catalog' | 'config' | 'moves' | 'projects';

export default function ProductsPage() {
  const { t } = useI18n();
  useImfexStore(); // Auto-subscribe to live store updates

  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState(imfexStore.getCategories());
  const [role, setRole] = useState<UserRole>('SUPER_ADMIN');
  const [activeTab, setActiveTab] = useState<ActiveTab>('catalog');
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('Сите категории');
  const [isMounted, setIsMounted] = useState(false);

  // Configuration tab state: linked warehouse accessories (motor, rail) & advanced specs toggle
  const [selectedMotorId, setSelectedMotorId] = useState<string>('');
  const [selectedRailId, setSelectedRailId] = useState<string>('');
  const [showAdvancedEditor, setShowAdvancedEditor] = useState(false);

  // Project / Order tab state (supports both interactive prototype PRJ-001 and real CRM projects)
  const [selectedProjectId, setSelectedProjectId] = useState<string>('DEMO-PRJ-001');
  const [demoAccepted, setDemoAccepted] = useState(false);
  const [demoPaid, setDemoPaid] = useState(false);
  const [demoOrdered, setDemoOrdered] = useState(false);
  const [demoReceived, setDemoReceived] = useState(false);
  const [demoIssued, setDemoIssued] = useState(false);

  // Modals for adding product / categories
  const [showAddModal, setShowAddModal] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [newProdName, setNewProdName] = useState('');
  const [newProdCode, setNewProdCode] = useState('');
  const [newProdCatId, setNewProdCatId] = useState('');
  const [newProdType, setNewProdType] = useState<ProductStockType>('STOCK');
  const [newProdStock, setNewProdStock] = useState<number>(10);
  const [newProdPrice, setNewProdPrice] = useState<number>(250);
  const [newProdDesc, setNewProdDesc] = useState('');

  const refreshProducts = () => {
    const list = imfexStore.getProducts() || [];
    const cats = imfexStore.getCategories() || [];
    setProducts(list);
    setCategories(cats);

    if (list.length > 0) {
      setSelectedProductId((prev) => {
        if (prev && list.some((p) => p.id === prev)) return prev;
        const gv001 = list.find((p) => p.code === 'GV-001');
        return gv001 ? gv001.id : list[0].id;
      });

      setSelectedMotorId((prev) => {
        if (prev && list.some((p) => p.id === prev)) return prev;
        const av001 = list.find((p) => p.code === 'AV-001') || list.find((p) => getProductCatName(p, cats) === 'Автоматика');
        return av001 ? av001.id : '';
      });

      setSelectedRailId((prev) => {
        if (prev && list.some((p) => p.id === prev)) return prev;
        const sh002 = list.find((p) => p.code === 'SH-002') || list.find((p) => getProductCatName(p, cats) === 'Шини');
        return sh002 ? sh002.id : '';
      });
    }
  };

  useEffect(() => {
    setIsMounted(true);
    setRole(imfexStore.getCurrentRole());
    refreshProducts();
  }, []);

  useEffect(() => {
    refreshProducts();
  }, [imfexStore.getProducts().length, imfexStore.getCategories().length, imfexStore.getInventoryMovements().length]);

  if (!isMounted) {
    return (
      <div className="flex items-center justify-center p-12 text-xs text-muted-foreground gap-2">
        <Loader2 className="w-4 h-4 animate-spin text-primary" />
        <span>{t('products.loading')}</span>
      </div>
    );
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
    'Сите категории',
    ...Array.from(new Set(products.map((p) => getProductCatName(p)))),
  ];

  // Filtered catalog list
  const filteredCatalog = products.filter((p) => {
    const catName = getProductCatName(p);
    const matchesCat = categoryFilter === 'Сите категории' || catName === categoryFilter;
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
    selectedProjectId !== 'DEMO-PRJ-001'
      ? realProjects.find((pr) => pr.id === selectedProjectId)
      : undefined;

  const openProductConfig = (id: string) => {
    setSelectedProductId(id);
    setActiveTab('config');
  };

  // Warehouse receive / sell handlers
  const handleReceive = (id: string) => {
    const p = imfexStore.receiveProductStock(id, 1);
    if (p) {
      toast.success('Прием во магацин', `+1 ${p.name} (Нова залиха: ${p.stockQuantity})`);
      refreshProducts();
    }
  };

  const handleSell = (id: string) => {
    const p = imfexStore.issueProductStock(id, 1);
    if (p) {
      toast.info('Магацински излез', `−1 ${p.name} (Преостаната залиха: ${p.stockQuantity})`);
      refreshProducts();
    }
  };

  // Demo & Real Project 5-Step Flow Handlers
  const handleStep1Accept = () => {
    if (activeRealProject) {
      if (activeRealProject.acceptedAt) return;
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
      return;
    }

    if (demoAccepted) return;
    setDemoAccepted(true);
    for (const acc of [motorProd, railProd]) {
      if (acc) {
        imfexStore.reserveProductStock(acc.id, 1);
      }
    }
    imfexStore.addInventoryMovement(
      'РЕЗЕРВАЦИЈА',
      'Прифатена финална понуда PRJ-001 — резервирани достапни додатоци'
    );
    toast.success('Финална понуда прифатена', 'Резервирани се достапните додатоци за PRJ-001.');
    refreshProducts();
  };

  const handleStep2Payment = () => {
    if (activeRealProject) {
      imfexStore.projectStepRecordAdvance(activeRealProject.id);
      toast.success('Авансна уплата', `Евидентиран аванс 70% за ${activeRealProject.projectNumber}.`);
      refreshProducts();
      return;
    }
    if (!demoAccepted || demoPaid) return;
    setDemoPaid(true);
    imfexStore.addInventoryMovement('УПЛАТА', 'Евидентиран аванс 70% — пример');
    toast.success('Уплата евидентирана', 'Евидентиран аванс 70% — може да се нарача вратата.');
    refreshProducts();
  };

  const handleStep3Order = () => {
    if (activeRealProject) {
      imfexStore.projectStepOrderSupplier(activeRealProject.id, selectedProduct?.name);
      toast.success('Набавка', `Нарачано кај добавувач за ${activeRealProject.projectNumber}.`);
      refreshProducts();
      return;
    }
    if (!demoPaid || demoOrdered) return;
    setDemoOrdered(true);
    imfexStore.addInventoryMovement('НАБАВКА', 'Нарачана сегментна врата за PRJ-001');
    toast.success('Нарачано кај добавувач', 'Нарачана сегментна врата за PRJ-001.');
    refreshProducts();
  };

  const handleStep4ReceiveDoor = () => {
    if (activeRealProject) {
      imfexStore.projectStepReceiveWarehouse(activeRealProject.id, selectedProduct?.name);
      toast.success('Прием во магацин', `Вратата е примена и резервирана за ${activeRealProject.projectNumber}.`);
      refreshProducts();
      return;
    }
    if (!demoOrdered || demoReceived) return;
    setDemoReceived(true);
    imfexStore.addInventoryMovement('ПРИЕМ', 'Примена 1 сегментна врата, резервирана за PRJ-001');
    toast.success('Прием во магацин', 'Примена 1 сегментна врата, резервирана за PRJ-001.');
    refreshProducts();
  };

  const handleStep5IssueDispatch = () => {
    if (activeRealProject) {
      const ids = [motorProd?.id, railProd?.id].filter(Boolean) as string[];
      imfexStore.projectStepIssueDispatch(activeRealProject.id, ids);
      toast.success('Испратница издадена', `Издадена испратница за ${activeRealProject.projectNumber}.`);
      refreshProducts();
      return;
    }
    if (!demoReceived || demoIssued) return;
    setDemoIssued(true);
    for (const acc of [motorProd, railProd]) {
      if (acc) {
        imfexStore.releaseAndIssueReservedStock(acc.id, 1);
      }
    }
    imfexStore.addInventoryMovement(
      'ИЗЛЕЗ',
      'Испратница PRJ-001: врата + достапни резервирани додатоци'
    );
    toast.success('Испратница издадена', 'Испратница PRJ-001: врата + достапни резервирани додатоци.');
    refreshProducts();
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
    refreshProducts();
    setSelectedProductId(newProd.id);
    setNewProdName('');
    setNewProdCode('');
    setNewProdDesc('');
    setShowAddModal(false);
    toast.success('Артиклот е додаден', `${newProd.code} — ${newProd.name}`);
  };

  // Current project flow flags (either from selected real project or demo PRJ-001)
  const isAccepted = activeRealProject ? Boolean(activeRealProject.acceptedAt || activeRealProject.offerId) : demoAccepted;
  const isPaid = activeRealProject ? Boolean(activeRealProject.advancePaid) : demoPaid;
  const isOrdered = activeRealProject
    ? Boolean(activeRealProject.supplierOrdered || activeRealProject.procurementStatus === 'ORDERED' || activeRealProject.procurementStatus === 'DELIVERED')
    : demoOrdered;
  const isReceived = activeRealProject
    ? Boolean(activeRealProject.warehouseReceived || activeRealProject.procurementStatus === 'DELIVERED')
    : demoReceived;
  const isIssued = activeRealProject
    ? Boolean(activeRealProject.dispatchIssued || activeRealProject.status === 'COMPLETED' || activeRealProject.status === 'CLOSED')
    : demoIssued;

  const missingAccessories = [motorProd, railProd]
    .filter((acc): acc is Product => Boolean(acc))
    .filter((acc) => {
      const stockQty = acc.stockQuantity ?? 0;
      const resQty = acc.reservedQuantity ?? 0;
      return stockQty - resQty <= 0 && !(resQty > 0);
    })
    .map((acc) => acc.name);

  return (
    <div className="space-y-5 pb-16">
      {/* Header matching HTML specification */}
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-5 bg-card p-6 rounded-2xl shadow-xs">
        <div>
          <small className="text-xs font-bold tracking-wider uppercase text-muted-foreground block">
            IMFEX CRM / МАГАЦИН
          </small>
          <h1 className="font-extrabold text-2xl sm:text-3xl tracking-tight text-foreground mt-1">
            Производи и залиха
          </h1>
          <span className="text-xs text-muted-foreground">
            Интегриран каталог, конфигурација на артикли, магацински движења и нарачки по проект
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {isSuperAdmin && (
            <>
              <button
                onClick={() => setShowCategoryModal(true)}
                className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg border border-border bg-secondary/60 text-foreground hover:bg-secondary transition-all cursor-pointer"
              >
                <Layers className="w-3.5 h-3.5 text-primary" /> Категории
              </button>
              <button
                onClick={() => setShowAddModal(true)}
                className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-lg bg-primary text-primary-foreground hover:brightness-110 transition-all shadow-sm cursor-pointer"
              >
                <Plus className="w-4 h-4" /> + Нов Артикл
              </button>
            </>
          )}
          <span className="border border-primary/50 bg-primary/10 rounded-full px-3 py-1 text-primary text-xs font-bold">
            МАГАЦИН & CRM
          </span>
        </div>
      </header>

      {/* 3 KPI Summary Cards matching HTML (.cards) */}
      <div className="grid grid-cols-3 gap-3 sm:gap-4">
        <div className="bg-card border border-border rounded-xl p-4 sm:p-5 shadow-xs">
          <small className="text-xs text-muted-foreground font-medium block">Вкупно артикли</small>
          <strong className="block text-2xl sm:text-3xl font-extrabold text-foreground mt-2">
            {totalCount}
          </strong>
        </div>
        <div className="bg-card border border-border rounded-xl p-4 sm:p-5 shadow-xs">
          <small className="text-xs text-muted-foreground font-medium block">Без залиха</small>
          <strong className="block text-2xl sm:text-3xl font-extrabold text-rose-500 mt-2">
            {zeroStockCount}
          </strong>
        </div>
        <div className="bg-card border border-border rounded-xl p-4 sm:p-5 shadow-xs">
          <small className="text-xs text-muted-foreground font-medium block">По нарачка</small>
          <strong className="block text-2xl sm:text-3xl font-extrabold text-sky-400 mt-2">
            {customOrderCount}
          </strong>
        </div>
      </div>

      {/* 4 Main Navigation Tabs matching HTML (.tabs) */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setActiveTab('catalog')}
          className={`px-4 py-2.5 rounded-lg text-xs sm:text-sm font-semibold transition-all cursor-pointer flex items-center gap-2 ${
            activeTab === 'catalog'
              ? 'bg-primary text-primary-foreground shadow-sm brightness-110'
              : 'bg-secondary text-secondary-foreground hover:brightness-110'
          }`}
        >
          <Boxes className="w-4 h-4" />
          <span>Каталог</span>
        </button>

        <button
          onClick={() => setActiveTab('config')}
          className={`px-4 py-2.5 rounded-lg text-xs sm:text-sm font-semibold transition-all cursor-pointer flex items-center gap-2 ${
            activeTab === 'config'
              ? 'bg-primary text-primary-foreground shadow-sm brightness-110'
              : 'bg-secondary text-secondary-foreground hover:brightness-110'
          }`}
        >
          <Settings2 className="w-4 h-4" />
          <span>Конфигурација</span>
        </button>

        <button
          onClick={() => setActiveTab('moves')}
          className={`px-4 py-2.5 rounded-lg text-xs sm:text-sm font-semibold transition-all cursor-pointer flex items-center gap-2 ${
            activeTab === 'moves'
              ? 'bg-primary text-primary-foreground shadow-sm brightness-110'
              : 'bg-secondary text-secondary-foreground hover:brightness-110'
          }`}
        >
          <History className="w-4 h-4" />
          <span>Движења</span>
          {movements.length > 0 && (
            <span className="bg-background/30 px-1.5 py-0.5 rounded text-[10px] font-extrabold">
              {movements.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('projects')}
          className={`px-4 py-2.5 rounded-lg text-xs sm:text-sm font-semibold transition-all cursor-pointer flex items-center gap-2 ${
            activeTab === 'projects'
              ? 'bg-primary text-primary-foreground shadow-sm brightness-110'
              : 'bg-secondary text-secondary-foreground hover:brightness-110'
          }`}
        >
          <Briefcase className="w-4 h-4" />
          <span>Проект / нарачка</span>
        </button>
      </div>

      {/* Main Content Panel (.panel) */}
      <section className="bg-card border border-border rounded-xl p-5 sm:p-6 shadow-xs">
        {/* TAB 1: КАТАЛОГ */}
        {activeTab === 'catalog' && (
          <div className="space-y-4">
            <h2 className="text-lg sm:text-xl font-bold text-foreground">Каталог на производи</h2>

            {/* Filters (.filters: 1fr 1.6fr) */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
              <div className="md:col-span-5">
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs sm:text-sm rounded-lg border border-border bg-background text-foreground outline-none focus:ring-2 focus:ring-primary font-medium cursor-pointer"
                >
                  {uniqueCategoryNames.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>
              <div className="md:col-span-7 relative">
                <Search className="w-4 h-4 absolute left-3.5 top-3 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Пребарај по шифра или име"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 text-xs sm:text-sm rounded-lg border border-border bg-background text-foreground outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>

            {/* Catalog Table */}
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left text-xs sm:text-sm">
                <thead>
                  <tr className="border-b border-border text-muted-foreground text-xs">
                    <th className="py-3 px-3 font-semibold">Шифра</th>
                    <th className="py-3 px-3 font-semibold">Производ</th>
                    <th className="py-3 px-3 font-semibold">Категорија</th>
                    <th className="py-3 px-3 font-semibold">Физичка залиха</th>
                    <th className="py-3 px-3 font-semibold">Резервирано</th>
                    <th className="py-3 px-3 text-right font-semibold"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredCatalog.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-muted-foreground">
                        Не се пронајдени артикли за избраниот филтер.
                      </td>
                    </tr>
                  ) : (
                    filteredCatalog.map((p) => {
                      const catName = getProductCatName(p);
                      const isCustom = p.stockType === 'CUSTOM';
                      const stockQty = p.stockQuantity ?? 0;
                      const resQty = p.reservedQuantity ?? 0;

                      let badgeClass = 'bg-sky-500/15 text-sky-400 border border-sky-500/30';
                      if (!isCustom) {
                        if (stockQty === 0) {
                          badgeClass = 'bg-rose-500/20 text-rose-300 border border-rose-500/30';
                        } else if (stockQty <= 3) {
                          badgeClass = 'bg-amber-500/20 text-amber-300 border border-amber-500/30';
                        } else {
                          badgeClass = 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30';
                        }
                      }

                      return (
                        <tr key={p.id} className="hover:bg-muted/30 transition-colors">
                          <td className="py-3 px-3 font-mono text-xs text-muted-foreground">
                            {p.code}
                          </td>
                          <td className="py-3 px-3 font-bold text-foreground">
                            {p.name}
                          </td>
                          <td className="py-3 px-3 text-muted-foreground">
                            {catName}
                          </td>
                          <td className="py-3 px-3">
                            {isCustom ? (
                              <span className="inline-block rounded-md px-2.5 py-1 text-xs font-semibold bg-sky-500/15 text-sky-300 border border-sky-500/30">
                                По нарачка
                              </span>
                            ) : (
                              <span className={`inline-block rounded-md px-2.5 py-1 text-xs font-semibold ${badgeClass}`}>
                                {stockQty} пар.
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-3 font-semibold text-foreground">
                            {resQty}
                          </td>
                          <td className="py-3 px-3 text-right">
                            <button
                              onClick={() => openProductConfig(p.id)}
                              className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-secondary text-secondary-foreground hover:brightness-110 transition-all cursor-pointer"
                            >
                              Отвори
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
        {activeTab === 'config' && selectedProduct && (
          <div className="space-y-5">
            {/* Quick Product Switcher Bar + Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
              <div>
                <div className="flex flex-wrap items-center gap-2.5">
                  <h2 className="text-xl font-extrabold text-foreground">
                    {selectedProduct.name}
                  </h2>
                  <span className="inline-block rounded-md px-2.5 py-1 text-xs font-semibold bg-sky-500/15 text-sky-300 border border-sky-500/30">
                    {selectedProduct.stockType === 'CUSTOM' ? 'По нарачка' : 'Залиха'}
                  </span>
                </div>
                <small className="text-xs text-muted-foreground block mt-1">
                  {selectedProduct.code} · {getProductCatName(selectedProduct)}
                </small>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <select
                  value={selectedProduct.id}
                  onChange={(e) => setSelectedProductId(e.target.value)}
                  className="px-3 py-2 text-xs rounded-lg border border-border bg-background text-foreground font-semibold outline-none focus:ring-2 focus:ring-primary cursor-pointer"
                >
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.code} — {p.name}
                    </option>
                  ))}
                </select>

                <button
                  onClick={() => setShowAdvancedEditor((prev) => !prev)}
                  className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg bg-secondary text-secondary-foreground hover:brightness-110 transition-all cursor-pointer"
                >
                  <SlidersHorizontal className="w-3.5 h-3.5" />
                  <span>{showAdvancedEditor ? 'Сокриј Ценовник/Опции' : 'Ценовник и Спецификации'}</span>
                </button>
              </div>
            </div>

            {selectedProduct.stockType === 'CUSTOM' ? (
              /* Custom-made Door Configuration View (matches HTML id===0 block) */
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Left Block: Door Specifications */}
                  <div className="p-4 sm:p-5 bg-background/60 border border-border rounded-xl space-y-3">
                    <b className="text-sm font-bold text-foreground block border-b border-border pb-2">
                      Спецификации на врата
                    </b>
                    <div className="flex justify-between items-center text-xs sm:text-sm py-1 border-b border-border/40">
                      <span className="text-muted-foreground">Структура</span>
                      <b className="text-foreground">M-Line</b>
                    </div>
                    <div className="flex justify-between items-center text-xs sm:text-sm py-1 border-b border-border/40">
                      <span className="text-muted-foreground">Боја</span>
                      <b className="text-foreground">RAL 7016</b>
                    </div>
                    <div className="flex justify-between items-center text-xs sm:text-sm py-1 border-b border-border/40">
                      <span className="text-muted-foreground">Димензии</span>
                      <b className="text-foreground">4000 × 3000 mm</b>
                    </div>
                    <div className="flex justify-between items-center text-xs sm:text-sm py-1">
                      <span className="text-muted-foreground">Изработка</span>
                      <b className="text-sky-400">По нарачка</b>
                    </div>
                  </div>

                  {/* Right Block: Linked Warehouse Articles */}
                  <div className="p-4 sm:p-5 bg-background/60 border border-border rounded-xl space-y-4">
                    <b className="text-sm font-bold text-foreground block border-b border-border pb-2">
                      Поврзани магацински артикли
                    </b>

                    <div className="space-y-1.5">
                      <small className="text-xs text-muted-foreground block font-semibold">Автоматика</small>
                      <select
                        value={motorProd?.id || ''}
                        onChange={(e) => setSelectedMotorId(e.target.value)}
                        className="w-full px-3 py-2 text-xs sm:text-sm rounded-lg border border-border bg-card text-foreground outline-none focus:ring-2 focus:ring-primary cursor-pointer"
                      >
                        {motorProducts.map((m) => (
                          <option key={m.id} value={m.id}>
                            {m.name} ({m.code})
                          </option>
                        ))}
                      </select>
                      {motorProd && (
                        <p className="text-xs text-muted-foreground pt-0.5">
                          Физичка залиха:{' '}
                          <b className="text-foreground">{motorProd.stockQuantity ?? 0}</b> · Резервирано:{' '}
                          <b className="text-foreground">{motorProd.reservedQuantity ?? 0}</b> · Слободно:{' '}
                          <b className="text-emerald-400">
                            {Math.max(0, (motorProd.stockQuantity ?? 0) - (motorProd.reservedQuantity ?? 0))}
                          </b>
                        </p>
                      )}
                    </div>

                    <div className="space-y-1.5">
                      <small className="text-xs text-muted-foreground block font-semibold">Шина</small>
                      <select
                        value={railProd?.id || ''}
                        onChange={(e) => setSelectedRailId(e.target.value)}
                        className="w-full px-3 py-2 text-xs sm:text-sm rounded-lg border border-border bg-card text-foreground outline-none focus:ring-2 focus:ring-primary cursor-pointer"
                      >
                        {railProducts.map((r) => (
                          <option key={r.id} value={r.id}>
                            {r.name} ({r.code})
                          </option>
                        ))}
                      </select>
                      {railProd && (
                        <p className="text-xs text-muted-foreground pt-0.5">
                          Физичка залиха:{' '}
                          <b className="text-foreground">{railProd.stockQuantity ?? 0}</b> · Резервирано:{' '}
                          <b className="text-foreground">{railProd.reservedQuantity ?? 0}</b> · Слободно:{' '}
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
                  Во реалниот систем, спецификациите и изборот на додатоци се зачувуваат во верзијата на понудата. При прифаќање се резервираат достапните артикли; недостатокот се означува „За набавка“. Нема физички излез додека не се издаде магацински документ.
                </div>

                <div className="flex flex-wrap items-center gap-3 pt-1">
                  <button
                    onClick={() => setActiveTab('projects')}
                    className="px-4 py-2.5 rounded-lg bg-primary text-primary-foreground text-xs sm:text-sm font-bold hover:brightness-110 transition-all cursor-pointer inline-flex items-center gap-2"
                  >
                    <span>Отвори пример проект →</span>
                  </button>
                  <Link
                    href={`/offers/new?productId=${selectedProduct.id}`}
                    className="px-4 py-2.5 rounded-lg bg-secondary text-secondary-foreground text-xs sm:text-sm font-semibold hover:brightness-110 transition-all inline-flex items-center gap-2"
                  >
                    <span>Креирај Нова Понуда со овој производ</span>
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              </div>
            ) : (
              /* Stock Item Configuration View (matches HTML stock item block) */
              <div className="space-y-4">
                <div className="p-5 bg-background/60 border border-border rounded-xl space-y-4">
                  <div>
                    <h2 className="text-2xl font-extrabold text-foreground">
                      {selectedProduct.stockQuantity ?? 0} парчиња
                    </h2>
                    <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                      Резервирано: <b className="text-foreground">{selectedProduct.reservedQuantity ?? 0}</b> · Слободно:{' '}
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
                      + Прием 1 парче
                    </button>
                    <button
                      onClick={() => handleSell(selectedProduct.id)}
                      disabled={(selectedProduct.stockQuantity ?? 0) <= 0}
                      className="px-4 py-2.5 rounded-lg bg-secondary text-secondary-foreground text-xs sm:text-sm font-semibold hover:brightness-110 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Продажба / излез 1 парче
                    </button>
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-primary/10 border border-primary/25 text-xs sm:text-sm text-foreground leading-relaxed">
                  Истиот артикл се користи и при самостојна продажба и како додаток на друг производ — нема дупла залиха.
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
              <h2 className="text-lg sm:text-xl font-bold text-foreground">Магацински движења</h2>
              <span className="text-xs text-muted-foreground">
                Вкупно логови: {movements.length}
              </span>
            </div>

            {movements.length === 0 ? (
              <div className="p-5 bg-background/60 border border-border rounded-xl text-xs sm:text-sm text-muted-foreground">
                Нема движења. Пробај прием или излез на артикл.
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
                      <small className="text-xs text-muted-foreground shrink-0 font-mono">
                        {m.at}
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
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-4">
              <div>
                <h2 className="text-lg sm:text-xl font-bold text-foreground">
                  {activeRealProject
                    ? `Проект ${activeRealProject.projectNumber} (${activeRealProject.customer?.companyName || activeRealProject.customer?.name || 'Клиент'})`
                    : 'Пример проект PRJ-001'}
                </h2>
                <small className="text-xs text-muted-foreground block mt-0.5">
                  {activeRealProject
                    ? `${activeRealProject.offer?.items?.[0]?.customTitle || 'Резидентна сегментна врата'} · Поврзана понуда: ${activeRealProject.offer?.offerNumber || 'N/A'}`
                    : `Резидентна сегментна врата · M-Line · RAL 7016 · 4000 × 3000 mm (Поврзани: ${motorProd?.name || 'Rocco 60'} + ${railProd?.name || 'Шина 3600 mm'})`}
                </small>
              </div>

              {/* Project Selector: Switch between PRJ-001 Concept or any real CRM Project */}
              <div className="flex items-center gap-2">
                <select
                  value={selectedProjectId}
                  onChange={(e) => setSelectedProjectId(e.target.value)}
                  className="px-3 py-2 text-xs rounded-lg border border-border bg-background text-foreground font-semibold outline-none focus:ring-2 focus:ring-primary cursor-pointer"
                >
                  <option value="DEMO-PRJ-001">Концепт Проект: PRJ-001 (Интерактивен тест)</option>
                  {realProjects.map((rp) => (
                    <option key={rp.id} value={rp.id}>
                      {rp.projectNumber} — {rp.customer?.companyName || rp.customer?.name || 'Клиент'}
                    </option>
                  ))}
                </select>
                {activeRealProject && (
                  <Link
                    href={`/projects/${activeRealProject.id}`}
                    className="px-3 py-2 rounded-lg bg-secondary text-secondary-foreground text-xs font-semibold hover:brightness-110 transition-all shrink-0"
                  >
                    Детали →
                  </Link>
                )}
              </div>
            </div>

            {/* 2-Column Interactive Workflow Grid (.grid) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Left Block: Понуди и аванс */}
              <div className="p-5 bg-background/60 border border-border rounded-xl space-y-4">
                <b className="text-sm font-bold text-foreground block">Понуди и аванс</b>
                <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                  Понуда V1 → теренско мерење → понуда V2 (финална). Двете верзии се зачувани.
                </p>

                <div>
                  <span
                    className={`inline-block rounded-md px-2.5 py-1 text-xs font-bold ${
                      isAccepted
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                        : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                    }`}
                  >
                    {isAccepted ? 'Финална понуда прифатена' : 'Чека прифаќање'}
                  </span>
                </div>

                <div className="space-y-2.5 pt-1">
                  <button
                    onClick={handleStep1Accept}
                    disabled={isAccepted}
                    className="w-full sm:w-auto px-4 py-2.5 rounded-lg bg-primary text-primary-foreground text-xs sm:text-sm font-bold hover:brightness-110 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed block"
                  >
                    1. Прифати финална понуда
                  </button>

                  <button
                    onClick={handleStep2Payment}
                    disabled={!isAccepted || isPaid}
                    className="w-full sm:w-auto px-4 py-2.5 rounded-lg bg-secondary text-secondary-foreground text-xs sm:text-sm font-semibold hover:brightness-110 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed block"
                  >
                    2. Евидентирај аванс 70%
                  </button>
                </div>
              </div>

              {/* Right Block: Набавка и магацин */}
              <div className="p-5 bg-background/60 border border-border rounded-xl space-y-4">
                <b className="text-sm font-bold text-foreground block">Набавка и магацин</b>

                <div>
                  <span
                    className={`inline-block rounded-md px-2.5 py-1 text-xs font-bold ${
                      isOrdered
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                        : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                    }`}
                  >
                    {isOrdered ? 'Вратата е нарачана' : 'Не е нарачана'}
                  </span>
                </div>

                <div className="space-y-2.5 pt-1">
                  <button
                    onClick={handleStep3Order}
                    disabled={!isPaid || isOrdered}
                    className="w-full sm:w-auto px-4 py-2.5 rounded-lg bg-primary text-primary-foreground text-xs sm:text-sm font-bold hover:brightness-110 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed block"
                  >
                    3. Нарачај кај добавувач
                  </button>

                  <button
                    onClick={handleStep4ReceiveDoor}
                    disabled={!isOrdered || isReceived}
                    className="w-full sm:w-auto px-4 py-2.5 rounded-lg bg-secondary text-secondary-foreground text-xs sm:text-sm font-semibold hover:brightness-110 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed block"
                  >
                    4. Прими врата во магацин
                  </button>

                  <button
                    onClick={handleStep5IssueDispatch}
                    disabled={!isReceived || isIssued}
                    className="w-full sm:w-auto px-4 py-2.5 rounded-lg bg-secondary text-secondary-foreground text-xs sm:text-sm font-semibold hover:brightness-110 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed block"
                  >
                    5. Издај испратница
                  </button>
                </div>
              </div>
            </div>

            {/* Status & Missing Accessories Notice (.notice) */}
            <div className="p-4 rounded-xl bg-primary/10 border border-primary/25 text-xs sm:text-sm text-foreground space-y-2 leading-relaxed">
              <div>
                <b>Состојба:</b>{' '}
                {isIssued
                  ? 'Испратница издадена — следува монтажа, протокол и финална фактура.'
                  : isReceived
                  ? 'Вратата е примена и поврзана со проектот.'
                  : isOrdered
                  ? 'Се чека пристигнување на вратата.'
                  : isPaid
                  ? 'Авансот е платен — може да се нарача вратата.'
                  : isAccepted
                  ? 'Чека авансна уплата.'
                  : 'Се чека прифаќање на финалната понуда.'}
              </div>
              <div>
                <b>Додатоци за набавка:</b>{' '}
                {missingAccessories.length > 0 ? (
                  <span className="text-amber-400 font-semibold">{missingAccessories.join(', ')}</span>
                ) : (
                  <span>Нема тековно утврден недостаток.</span>
                )}
              </div>
            </div>

            <p className="text-xs text-muted-foreground">
              Напомена: При издавање испратница системот проверува дали сите задолжителни артикли се физички достапни, ги намалува од магацинската залиха и ги запишува во табот „Движења“.
            </p>
          </div>
        )}
      </section>

      {/* Create Product Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4">
          <div className="bg-card border border-border rounded-2xl p-6 w-full max-w-md space-y-4 shadow-2xl text-xs">
            <div className="flex items-center justify-between">
              <h3 className="font-extrabold text-base flex items-center gap-2">
                <Package className="w-5 h-5 text-primary" />
                <span>Додај Нов Артикл во Магацин / Каталог</span>
              </h3>
              <button onClick={() => setShowAddModal(false)} className="text-muted-foreground hover:text-foreground">
                <XCircle className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreateProduct} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1">Шифра *</label>
                  <input
                    type="text"
                    required
                    placeholder="пр. AV-005"
                    value={newProdCode}
                    onChange={(e) => setNewProdCode(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-border bg-background outline-none uppercase font-mono font-bold focus:ring-2 focus:ring-primary"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1">Тип на залиха *</label>
                  <select
                    value={newProdType}
                    onChange={(e) => setNewProdType(e.target.value as ProductStockType)}
                    className="w-full px-3 py-2 rounded-lg border border-border bg-background outline-none focus:ring-2 focus:ring-primary font-semibold"
                  >
                    <option value="STOCK">Залиха (Магацин)</option>
                    <option value="CUSTOM">По нарачка</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold mb-1">Назив на производ *</label>
                <input
                  type="text"
                  required
                  placeholder="пр. Резидентна сегментна врата"
                  value={newProdName}
                  onChange={(e) => setNewProdName(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-border bg-background outline-none focus:ring-2 focus:ring-primary font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1">Категорија</label>
                  <select
                    value={newProdCatId}
                    onChange={(e) => setNewProdCatId(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-border bg-background outline-none focus:ring-2 focus:ring-primary font-medium"
                  >
                    <option value="">-- Избери категорија --</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold mb-1">Основна цена (€)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={newProdPrice}
                    onChange={(e) => setNewProdPrice(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 rounded-lg border border-border bg-background outline-none focus:ring-2 focus:ring-primary font-bold"
                  />
                </div>
              </div>

              {newProdType === 'STOCK' && (
                <div>
                  <label className="block font-semibold mb-1">Почетна физичка залиха (парчиња)</label>
                  <input
                    type="number"
                    min="0"
                    value={newProdStock}
                    onChange={(e) => setNewProdStock(parseInt(e.target.value) || 0)}
                    className="w-full px-3 py-2 rounded-lg border border-border bg-background outline-none focus:ring-2 focus:ring-primary font-bold"
                  />
                </div>
              )}

              <div>
                <label className="block font-semibold mb-1">Опис / Забелешка</label>
                <textarea
                  rows={2}
                  placeholder="Опис на производот или спецификација..."
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
                  Откажи
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 font-bold rounded-lg bg-primary text-primary-foreground cursor-pointer shadow-md"
                >
                  Зачувај Артикл
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
    </div>
  );
}

function CategoriesModal({ onClose }: { onClose: () => void }) {
  const [categories, setCategories] = useState(imfexStore.getCategories());
  const [newCatName, setNewCatName] = useState('');

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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4">
      <div className="bg-card border border-border rounded-2xl p-6 w-full max-w-md space-y-4 shadow-2xl text-xs">
        <div className="flex items-center justify-between">
          <h3 className="font-extrabold text-base flex items-center gap-2">
            <Layers className="w-5 h-5 text-primary" />
            <span>Менаџирање со Категории</span>
          </h3>
          <button onClick={onClose} className="p-1 hover:bg-muted rounded-lg text-muted-foreground">
            <XCircle className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleAdd} className="flex gap-2">
          <input
            type="text"
            required
            placeholder="Име на категорија (пр. Автоматика)"
            value={newCatName}
            onChange={(e) => setNewCatName(e.target.value)}
            className="flex-1 px-3 py-2 rounded-lg border border-border bg-background outline-none focus:ring-2 focus:ring-primary font-medium"
          />
          <button
            type="submit"
            className="px-4 py-2 font-bold rounded-lg bg-primary text-primary-foreground hover:brightness-110 transition-all shadow-md"
          >
            Додади
          </button>
        </form>

        <div className="space-y-2 max-h-64 overflow-y-auto pt-2">
          {categories.length === 0 ? (
            <div className="text-center text-muted-foreground p-4">Нема внесено категории.</div>
          ) : (
            categories.map((c) => (
              <div
                key={c.id}
                className="flex items-center justify-between p-3 border border-border rounded-lg bg-muted/20"
              >
                <span className="font-bold">{c.name}</span>
                <button
                  onClick={() => imfexStore.deleteCategory(c.id)}
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
    </div>
  );
}
