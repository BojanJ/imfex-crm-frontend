'use client';

import React, { useState, useEffect } from 'react';
import { useI18n } from '@/lib/i18n-context';
import { Product, UserRole } from '@/types';
import { imfexStore } from '@/lib/store';
import { ProductEditor } from '@/components/product-spec-builder/product-editor';
import { Package, ShieldAlert, Plus, Layers, Loader2 } from 'lucide-react';

export default function ProductsPage() {
  const { t } = useI18n();
  const [products, setProducts] = useState<Product[]>([]);
  const [role, setRole] = useState<UserRole>('SUPER_ADMIN');
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
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
          name: `${newProdName.trim()} Основен Модел`,
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
  const selectedProduct = products.find((p) => p.id === selectedProductId) || products[0];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-card p-6 rounded-xl border border-border">
        <div>
          <h1 className="font-extrabold text-xl tracking-tight flex items-center gap-2">
            <Package className="w-5 h-5 text-primary" />
            <span>{t('products.title')}</span>
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            {t('products.subtitle')}
          </p>
        </div>

        {isSuperAdmin ? (
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-all shadow-md cursor-pointer"
          >
            <Plus className="w-4 h-4" /> {t('products.create_product')}
          </button>
        ) : (
          <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 rounded-lg text-xs font-semibold">
            <ShieldAlert className="w-4 h-4" />
            <span>{t('products.read_only')}</span>
          </div>
        )}
      </div>

      {/* Product Selection Tabs */}
      <div className="flex items-center gap-3 overflow-x-auto pb-2 border-b border-border">
        {products.map((p) => (
          <button
            key={p.id}
            onClick={() => setSelectedProductId(p.id)}
            className={`px-4 py-2 text-xs font-bold rounded-xl border flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
              (selectedProduct?.id || selectedProductId) === p.id
                ? 'border-primary bg-primary text-primary-foreground shadow-sm'
                : 'border-border bg-card text-muted-foreground hover:text-foreground'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            {p.name} ({p.code})
          </button>
        ))}
      </div>

      {/* Selected Product Configurator Editor */}
      {selectedProduct ? (
        <ProductEditor
          product={selectedProduct}
          onUpdate={refreshProducts}
          isSuperAdmin={isSuperAdmin}
        />
      ) : (
        <div className="p-12 text-center text-xs text-muted-foreground bg-card border border-border rounded-xl">
          /
        </div>
      )}

      {/* Create Product Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4">
          <div className="bg-card border border-border rounded-xl p-6 w-full max-w-md space-y-4 shadow-2xl text-xs">
            <h3 className="font-bold text-lg">{t('products.create_product')}</h3>
            <form onSubmit={handleCreateProduct} className="space-y-3">
              <div>
                <label className="block font-semibold mb-1">{t('products.product_name')} *</label>
                <input
                  type="text"
                  required
                  placeholder="пр. Индустриска Пожарна Врата"
                  value={newProdName}
                  onChange={(e) => setNewProdName(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg border border-border bg-background outline-none focus:ring-2 focus:ring-primary"
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
                  className="w-full px-3 py-1.5 rounded-lg border border-border bg-background outline-none uppercase font-mono focus:ring-2 focus:ring-primary"
                />
              </div>

              <div>
                <label className="block font-semibold mb-1">{t('products.description')}</label>
                <textarea
                  rows={2}
                  placeholder="Опис на производот и сертификација..."
                  value={newProdDesc}
                  onChange={(e) => setNewProdDesc(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg border border-border bg-background outline-none resize-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-1.5 font-semibold rounded-lg border border-border cursor-pointer"
                >
                  {t('products.cancel')}
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 font-bold rounded-lg bg-primary text-primary-foreground cursor-pointer shadow-sm"
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
