'use client';

import React, { useState, useEffect } from 'react';
import { useI18n } from '@/lib/i18n-context';
import { Product, UserRole } from '@/types';
import { imfexStore } from '@/lib/store';
import { ProductEditor } from '@/components/product-spec-builder/product-editor';
import {
  Package,
  ShieldAlert,
  Plus,
  Layers,
  Search,
  CheckCircle2,
  XCircle,
  ChevronRight,
  Filter,
  SlidersHorizontal,
  Loader2,
} from 'lucide-react';

export default function ProductsPage() {
  const { t } = useI18n();
  const [products, setProducts] = useState<Product[]>([]);
  const [role, setRole] = useState<UserRole>('SUPER_ADMIN');
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');
  const [isMounted, setIsMounted] = useState(false);

  // New product state
  const [showAddModal, setShowAddModal] = useState(false);
  const [newProdName, setNewProdName] = useState('');
  const [newProdCode, setNewProdCode] = useState('');
  const [newProdDesc, setNewProdDesc] = useState('');

  const refreshProducts = () => {
    const list = imfexStore.getProducts() || [];
    setProducts(list);
    if (list.length > 0) {
      setSelectedProductId((prev) => (prev && list.some((p) => p.id === prev) ? prev : list[0].id));
    }
  };

  useEffect(() => {
    setIsMounted(true);
    setRole(imfexStore.getCurrentRole());
    refreshProducts();
  }, []);

  if (!isMounted) {
    return (
      <div className="flex items-center justify-center p-12 text-xs text-muted-foreground gap-2">
        <Loader2 className="w-4 h-4 animate-spin text-primary" />
        <span>{t('products.loading')}</span>
      </div>
    );
  }

  const handleCreateProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProdName.trim() || !newProdCode.trim() || role !== 'SUPER_ADMIN') return;

    const newProd: Product = {
      id: `prod-${Date.now()}`,
      name: newProdName.trim(),
      code: newProdCode.trim().toUpperCase(),
      description: newProdDesc.trim(),
      isActive: true,
      models: [
        {
          id: `mod-${Date.now()}`,
          productId: `prod-${Date.now()}`,
          name: `${newProdName.trim()} Стандарден Модел`,
          basePrice: 500.0,
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
  };

  const isSuperAdmin = role === 'SUPER_ADMIN';

  // Filter products by search query & status
  const filteredProducts = products.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.description && p.description.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesStatus =
      statusFilter === 'ALL'
        ? true
        : statusFilter === 'ACTIVE'
        ? p.isActive !== false
        : p.isActive === false;

    return matchesSearch && matchesStatus;
  });

  const selectedProduct = products.find((p) => p.id === selectedProductId) || filteredProducts[0] || products[0];

  return (
    <div className="space-y-6 pb-16">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-card p-6 rounded-2xl border border-border shadow-xs">
        <div>
          <h1 className="font-extrabold text-xl tracking-tight flex items-center gap-2">
            <Package className="w-5 h-5 text-primary" />
            <span>Каталог на Производи и Спецификации</span>
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            Пребарувајте, конфигурирајте модели, динамички спецификации и матрица на цени.
          </p>
        </div>

        {isSuperAdmin ? (
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-1.5 px-4 py-2.5 text-xs font-bold rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-all shadow-md cursor-pointer shrink-0"
          >
            <Plus className="w-4 h-4" /> {t('products.create_product')}
          </button>
        ) : (
          <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 rounded-xl text-xs font-semibold">
            <ShieldAlert className="w-4 h-4" />
            <span>{t('products.read_only')}</span>
          </div>
        )}
      </div>

      {/* Master-Detail Split Studio Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Master Left Sidebar: Search & Product List (4 Cols on Desktop) */}
        <div className="lg:col-span-4 bg-card border border-border rounded-2xl p-4 shadow-xs space-y-4">
          {/* Search Input & Status Filters */}
          <div className="space-y-3">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-3 text-muted-foreground" />
              <input
                type="text"
                placeholder="Пребарај по назив или шифра..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-border bg-background outline-none focus:ring-2 focus:ring-primary font-medium"
              />
            </div>

            <div className="flex items-center gap-1 bg-muted/60 p-1 rounded-xl border border-border text-[11px] font-bold">
              <button
                onClick={() => setStatusFilter('ALL')}
                className={`flex-1 py-1.5 rounded-lg transition-all text-center ${
                  statusFilter === 'ALL' ? 'bg-card text-foreground shadow-xs' : 'text-muted-foreground'
                }`}
              >
                Сите ({products.length})
              </button>
              <button
                onClick={() => setStatusFilter('ACTIVE')}
                className={`flex-1 py-1.5 rounded-lg transition-all text-center ${
                  statusFilter === 'ACTIVE' ? 'bg-card text-emerald-600 dark:text-emerald-400 shadow-xs' : 'text-muted-foreground'
                }`}
              >
                Активни
              </button>
              <button
                onClick={() => setStatusFilter('INACTIVE')}
                className={`flex-1 py-1.5 rounded-lg transition-all text-center ${
                  statusFilter === 'INACTIVE' ? 'bg-card text-red-500 shadow-xs' : 'text-muted-foreground'
                }`}
              >
                Неактивни
              </button>
            </div>
          </div>

          {/* Master Product Cards List */}
          <div className="space-y-2.5 max-h-[600px] overflow-y-auto pr-1">
            {filteredProducts.length === 0 ? (
              <div className="p-8 text-center text-xs text-muted-foreground">
                Не се пронајдени производи за пребарувањето.
              </div>
            ) : (
              filteredProducts.map((p) => {
                const isSelected = selectedProduct?.id === p.id;
                const modelsCount = (p.models || []).length;
                const specsCount = (p.specificationKeys || []).length;

                return (
                  <div
                    key={p.id}
                    onClick={() => setSelectedProductId(p.id)}
                    className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                      isSelected
                        ? 'border-primary bg-primary/10 shadow-sm font-bold'
                        : 'border-border bg-card hover:bg-muted/40 text-foreground'
                    }`}
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="bg-primary/20 text-primary text-[10px] font-black px-2 py-0.5 rounded font-mono uppercase">
                          {p.code}
                        </span>
                        <span
                          className={`w-2 h-2 rounded-full ${
                            p.isActive !== false ? 'bg-emerald-500' : 'bg-red-500'
                          }`}
                        />
                      </div>
                      <h3 className="text-xs font-extrabold leading-snug">{p.name}</h3>
                      <div className="flex items-center gap-2 text-[10px] text-muted-foreground font-medium">
                        <span className="bg-muted px-2 py-0.5 rounded border border-border">
                          {modelsCount} Модели
                        </span>
                        <span className="bg-muted px-2 py-0.5 rounded border border-border">
                          {specsCount} Атрибути
                        </span>
                      </div>
                    </div>

                    <ChevronRight
                      className={`w-4 h-4 transition-transform ${
                        isSelected ? 'text-primary translate-x-1' : 'text-muted-foreground'
                      }`}
                    />
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Detail Right Studio: Product Editor & Specs Configurator (8 Cols on Desktop) */}
        <div className="lg:col-span-8 space-y-6">
          {selectedProduct ? (
            <ProductEditor
              product={selectedProduct}
              onUpdate={refreshProducts}
              isSuperAdmin={isSuperAdmin}
            />
          ) : (
            <div className="bg-card border border-border rounded-2xl p-12 text-center text-xs text-muted-foreground space-y-3 shadow-xs">
              <Package className="w-8 h-8 text-primary mx-auto opacity-50" />
              <p className="font-bold">Изберете производ од листата лево за преглед и уредување.</p>
            </div>
          )}
        </div>
      </div>

      {/* Create Product Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4">
          <div className="bg-card border border-border rounded-2xl p-6 w-full max-w-md space-y-4 shadow-2xl text-xs">
            <h3 className="font-extrabold text-base flex items-center gap-2">
              <Package className="w-5 h-5 text-primary" />
              <span>{t('products.create_product')}</span>
            </h3>
            <form onSubmit={handleCreateProduct} className="space-y-3">
              <div>
                <label className="block font-semibold mb-1">{t('products.product_name')} *</label>
                <input
                  type="text"
                  required
                  placeholder="пр. Индустриска Пожарна Врата"
                  value={newProdName}
                  onChange={(e) => setNewProdName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-border bg-background outline-none focus:ring-2 focus:ring-primary font-medium"
                />
              </div>

              <div>
                <label className="block font-semibold mb-1">{t('products.product_code')} *</label>
                <input
                  type="text"
                  required
                  placeholder="пр. SHU-FIRE-100"
                  value={newProdCode}
                  onChange={(e) => setNewProdCode(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-border bg-background outline-none uppercase font-mono font-bold focus:ring-2 focus:ring-primary"
                />
              </div>

              <div>
                <label className="block font-semibold mb-1">{t('products.description')}</label>
                <textarea
                  rows={3}
                  placeholder="Опис на производот, карактеристики и сертификати..."
                  value={newProdDesc}
                  onChange={(e) => setNewProdDesc(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-border bg-background outline-none resize-none focus:ring-2 focus:ring-primary font-medium"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 font-semibold rounded-xl border border-border cursor-pointer"
                >
                  {t('products.cancel')}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 font-bold rounded-xl bg-primary text-primary-foreground cursor-pointer shadow-md"
                >
                  {t('products.create_product')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
