'use client';

import React, { useState } from 'react';
import { useI18n } from '@/lib/i18n-context';
import { Product, ProductModel, SpecificationKey, SpecificationOption, SpecInputType } from '@/types';
import { imfexStore, useImfexStore } from '@/lib/store';
import { Plus, Trash2, ShieldAlert, Layers, Settings2, Loader2 } from 'lucide-react';

interface ProductEditorProps {
  product: Product;
  onUpdate: () => void;
  isSuperAdmin: boolean;
}

export const ProductEditor: React.FC<ProductEditorProps> = ({ product, onUpdate, isSuperAdmin }) => {
  const { t } = useI18n();
  useImfexStore(); // Auto-subscribe to store state changes

  const [activeTab, setActiveTab] = useState<'models' | 'specs'>('models');
  const [isSaving, setIsSaving] = useState(false);

  // Model state
  const [newModelName, setNewModelName] = useState('');
  const [newModelPrice, setNewModelPrice] = useState(0);

  // Spec state
  const [newSpecName, setNewSpecName] = useState('');
  const [newSpecType, setNewSpecType] = useState<SpecInputType>('SELECT');

  // Option state
  const [selectedSpecId, setSelectedSpecId] = useState<string | null>(
    (product?.specificationKeys && product.specificationKeys[0]?.id) || null
  );
  const [newOptionLabel, setNewOptionLabel] = useState('');
  const [newOptionPrice, setNewOptionPrice] = useState(0);

  if (!product) {
    return <div className="p-8 text-center text-xs text-muted-foreground">Нема податоци за производот.</div>;
  }

  const models = product.models || [];
  const specificationKeys = product.specificationKeys || [];

  // Model actions
  const handleAddModel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newModelName.trim() || !isSuperAdmin) return;
    setIsSaving(true);

    const newModel: ProductModel = {
      id: `mod-${Date.now()}`,
      productId: product.id,
      name: newModelName.trim(),
      basePrice: Number(newModelPrice) || 0,
    };

    const updatedProduct = {
      ...product,
      models: [...models, newModel],
    };

    await imfexStore.saveProduct(updatedProduct);
    setNewModelName('');
    setNewModelPrice(0);
    setIsSaving(false);
    onUpdate();
  };

  const handleDeleteModel = async (modelId: string) => {
    if (!isSuperAdmin) return;
    setIsSaving(true);
    const updatedProduct = {
      ...product,
      models: models.filter((m) => m.id !== modelId),
    };
    await imfexStore.saveProduct(updatedProduct);
    setIsSaving(false);
    onUpdate();
  };

  // Spec actions
  const handleAddSpecKey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSpecName.trim() || !isSuperAdmin) return;
    setIsSaving(true);

    const newKey: SpecificationKey = {
      id: `spec-${Date.now()}`,
      productId: product.id,
      name: newSpecName.trim(),
      inputType: newSpecType,
      options: [],
    };

    const updatedProduct = {
      ...product,
      specificationKeys: [...specificationKeys, newKey],
    };

    await imfexStore.saveProduct(updatedProduct);
    setNewSpecName('');
    setSelectedSpecId(newKey.id);
    setIsSaving(false);
    onUpdate();
  };

  const handleDeleteSpecKey = async (keyId: string) => {
    if (!isSuperAdmin) return;
    setIsSaving(true);
    const updatedProduct = {
      ...product,
      specificationKeys: specificationKeys.filter((k) => k.id !== keyId),
    };
    await imfexStore.saveProduct(updatedProduct);
    if (selectedSpecId === keyId) setSelectedSpecId(null);
    setIsSaving(false);
    onUpdate();
  };

  // Option actions
  const handleAddOption = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSpecId || !newOptionLabel.trim() || !isSuperAdmin) return;
    setIsSaving(true);

    const newOpt: SpecificationOption = {
      id: `opt-${Date.now()}`,
      specificationKeyId: selectedSpecId,
      label: newOptionLabel.trim(),
      priceModifier: Number(newOptionPrice) || 0,
    };

    const updatedKeys = specificationKeys.map((key) => {
      if (key.id === selectedSpecId) {
        return {
          ...key,
          options: [...(key.options || []), newOpt],
        };
      }
      return key;
    });

    const updatedProduct = {
      ...product,
      specificationKeys: updatedKeys,
    };

    await imfexStore.saveProduct(updatedProduct);
    setNewOptionLabel('');
    setNewOptionPrice(0);
    setIsSaving(false);
    onUpdate();
  };

  const handleDeleteOption = async (specKeyId: string, optId: string) => {
    if (!isSuperAdmin) return;
    setIsSaving(true);
    const updatedKeys = specificationKeys.map((key) => {
      if (key.id === specKeyId) {
        return {
          ...key,
          options: (key.options || []).filter((o) => o.id !== optId),
        };
      }
      return key;
    });

    const updatedProduct = {
      ...product,
      specificationKeys: updatedKeys,
    };

    await imfexStore.saveProduct(updatedProduct);
    setIsSaving(false);
    onUpdate();
  };

  const selectedKeyObj = specificationKeys.find((k) => k.id === selectedSpecId);

  return (
    <div className="bg-card border border-border rounded-2xl p-6 shadow-xs space-y-6">
      {/* Product Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="bg-primary/20 text-primary text-[10px] font-black px-2 py-0.5 rounded font-mono uppercase">
              {product.code}
            </span>
            <h2 className="font-extrabold text-xl">{product.name}</h2>
            {isSaving && <Loader2 className="w-4 h-4 animate-spin text-primary ml-2" />}
          </div>
          <p className="text-xs text-muted-foreground mt-1">{product.description}</p>
        </div>

        {/* Tab Controls */}
        <div className="flex items-center bg-muted p-1 rounded-xl border border-border">
          <button
            onClick={() => setActiveTab('models')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
              activeTab === 'models'
                ? 'bg-primary text-primary-foreground shadow-xs'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            {t('products.models')} ({models.length})
          </button>
          <button
            onClick={() => setActiveTab('specs')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
              activeTab === 'specs'
                ? 'bg-primary text-primary-foreground shadow-xs'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Settings2 className="w-3.5 h-3.5" />
            {t('products.specifications')} ({specificationKeys.length})
          </button>
        </div>
      </div>

      {/* Models Tab */}
      {activeTab === 'models' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              {t('products.pricing_matrix')}
            </h3>
          </div>

          {/* Add Model Form (Super Admin only) */}
          {isSuperAdmin ? (
            <form onSubmit={handleAddModel} className="flex gap-2 items-center bg-muted/30 p-3 rounded-xl border border-border">
              <input
                type="text"
                required
                placeholder={t('products.new_model_placeholder')}
                value={newModelName}
                onChange={(e) => setNewModelName(e.target.value)}
                className="flex-1 px-3 py-2 text-xs rounded-xl border border-border bg-background outline-none focus:ring-2 focus:ring-primary font-medium"
              />
              <div className="relative w-36">
                <input
                  type="number"
                  step="0.01"
                  placeholder={t('products.base_price')}
                  value={newModelPrice || ''}
                  onChange={(e) => setNewModelPrice(parseFloat(e.target.value))}
                  className="w-full pl-6 pr-3 py-2 text-xs rounded-xl border border-border bg-background outline-none focus:ring-2 focus:ring-primary font-medium"
                />
                <span className="absolute left-2.5 top-2.5 text-xs font-bold text-muted-foreground">€</span>
              </div>
              <button
                type="submit"
                disabled={isSaving}
                className="flex items-center gap-1 px-4 py-2 text-xs font-bold rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-all shadow-xs cursor-pointer disabled:opacity-50"
              >
                {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                <span>{t('products.add_model')}</span>
              </button>
            </form>
          ) : (
            <div className="p-3 bg-muted/40 rounded-xl text-xs text-muted-foreground flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-amber-500" />
              <span>{t('products.read_only')}</span>
            </div>
          )}

          {/* Models Table */}
          <div className="border border-border rounded-xl overflow-hidden text-xs">
            <div className="overflow-x-auto w-full">
              <table className="w-full text-left min-w-[500px]">
                <thead className="bg-muted/50 font-bold border-b border-border text-muted-foreground uppercase text-[10px]">
                  <tr>
                    <th className="p-3">{t('products.models')}</th>
                    <th className="p-3 text-right">{t('products.base_price')}</th>
                    {isSuperAdmin && <th className="p-3 text-center">{t('offers.action')}</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {models.map((model) => (
                    <tr key={model.id} className="hover:bg-muted/20">
                      <td className="p-3 font-semibold text-foreground">{model.name}</td>
                      <td className="p-3 text-right font-bold text-primary">€{Number(model.basePrice || 0).toFixed(2)}</td>
                      {isSuperAdmin && (
                        <td className="p-3 text-center">
                          <button
                            onClick={() => handleDeleteModel(model.id)}
                            className="p-1 text-red-500 hover:bg-red-500/10 rounded-lg transition-colors cursor-pointer"
                            title="Delete Model"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Dynamic Specifications Tab */}
      {activeTab === 'specs' && (
        <div className="space-y-6">
          {/* Add Specification Key Form */}
          {isSuperAdmin && (
            <form onSubmit={handleAddSpecKey} className="flex gap-2 items-center bg-muted/30 p-3 rounded-xl border border-border">
              <input
                type="text"
                required
                placeholder={t('products.new_spec_placeholder')}
                value={newSpecName}
                onChange={(e) => setNewSpecName(e.target.value)}
                className="flex-1 px-3 py-2 text-xs rounded-xl border border-border bg-background outline-none focus:ring-2 focus:ring-primary font-medium"
              />
              <select
                value={newSpecType}
                onChange={(e) => setNewSpecType(e.target.value as SpecInputType)}
                className="px-3 py-2 text-xs rounded-xl border border-border bg-background outline-none font-bold"
              >
                <option value="SELECT">SELECT (Единечен Избор)</option>
                <option value="MULTISELECT">MULTISELECT (Повеќекратен Избор)</option>
                <option value="TEXT">TEXT (Текст Внес)</option>
                <option value="NUMBER">NUMBER (Бројчен Внес)</option>
              </select>
              <button
                type="submit"
                disabled={isSaving}
                className="flex items-center gap-1 px-4 py-2 text-xs font-bold rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-all shadow-xs cursor-pointer disabled:opacity-50"
              >
                {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                <span>{t('products.add_spec')}</span>
              </button>
            </form>
          )}

          {/* Keys & Options Configurator Split Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            {/* Keys List */}
            <div className="border border-border rounded-xl p-3 space-y-2 bg-muted/20">
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2">
                {t('products.attributes')}
              </p>
              {specificationKeys.map((key) => (
                <div
                  key={key.id}
                  onClick={() => setSelectedSpecId(key.id)}
                  className={`p-3 rounded-xl border cursor-pointer flex items-center justify-between transition-all ${
                    selectedSpecId === key.id
                      ? 'border-primary bg-primary/10 font-bold text-primary shadow-xs'
                      : 'border-border bg-card hover:bg-muted text-foreground'
                  }`}
                >
                  <div>
                    <p className="leading-tight font-extrabold">{key.name}</p>
                    <span className="text-[9px] font-extrabold text-muted-foreground uppercase">
                      {key.inputType} • {(key.options || []).length} опции
                    </span>
                  </div>
                  {isSuperAdmin && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteSpecKey(key.id);
                      }}
                      className="p-1 text-red-500 hover:bg-red-500/10 rounded-lg transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ))}
            </div>

            {/* Selected Key Options Editor */}
            <div className="md:col-span-2 border border-border rounded-xl p-4 bg-card space-y-4">
              {selectedKeyObj ? (
                <>
                  <div className="flex items-center justify-between border-b border-border pb-3">
                    <div>
                      <h4 className="font-bold text-sm text-foreground">
                        Опции за "{selectedKeyObj.name}"
                      </h4>
                      <p className="text-[11px] text-muted-foreground">
                        {t('products.input_type')}: <span className="font-semibold text-primary">{selectedKeyObj.inputType}</span>
                      </p>
                    </div>
                  </div>

                  {/* Add Option Form (Super Admin) */}
                  {isSuperAdmin && selectedKeyObj.inputType !== 'TEXT' && selectedKeyObj.inputType !== 'NUMBER' && (
                    <form onSubmit={handleAddOption} className="flex gap-2 items-center">
                      <input
                        type="text"
                        required
                        placeholder={t('products.option_label')}
                        value={newOptionLabel}
                        onChange={(e) => setNewOptionLabel(e.target.value)}
                        className="flex-1 px-3 py-2 text-xs rounded-xl border border-border bg-background outline-none focus:ring-2 focus:ring-primary font-medium"
                      />
                      <div className="relative w-36">
                        <input
                          type="number"
                          step="0.01"
                          placeholder={t('products.price_modifier')}
                          value={newOptionPrice || ''}
                          onChange={(e) => setNewOptionPrice(parseFloat(e.target.value))}
                          className="w-full pl-6 pr-3 py-2 text-xs rounded-xl border border-border bg-background outline-none focus:ring-2 focus:ring-primary font-medium"
                        />
                        <span className="absolute left-2.5 top-2.5 text-xs font-bold text-muted-foreground">€</span>
                      </div>
                      <button
                        type="submit"
                        disabled={isSaving}
                        className="flex items-center gap-1 px-4 py-2 text-xs font-bold rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-all shadow-xs cursor-pointer disabled:opacity-50"
                      >
                        {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                        <span>{t('products.add_option')}</span>
                      </button>
                    </form>
                  )}

                  {/* Options List */}
                  {selectedKeyObj.inputType === 'TEXT' || selectedKeyObj.inputType === 'NUMBER' ? (
                    <div className="p-4 bg-muted/30 rounded-xl text-xs text-muted-foreground italic">
                      Овој атрибут користи тип на внес {selectedKeyObj.inputType}. Продажните агенти ќе внесат сопствен текст/број за време на креирање понуда.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {(selectedKeyObj.options || []).map((opt) => (
                        <div
                          key={opt.id}
                          className="flex items-center justify-between p-2.5 bg-muted/20 border border-border rounded-xl text-xs"
                        >
                          <span className="font-semibold text-foreground">{opt.label}</span>
                          <div className="flex items-center gap-3">
                            <span className="font-extrabold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-lg border border-emerald-500/20">
                              {Number(opt.priceModifier || 0) >= 0
                                ? `+€${Number(opt.priceModifier || 0).toFixed(2)}`
                                : `-€${Math.abs(Number(opt.priceModifier || 0)).toFixed(2)}`}
                            </span>
                            {isSuperAdmin && (
                              <button
                                onClick={() => handleDeleteOption(selectedKeyObj.id, opt.id)}
                                className="p-1 text-red-500 hover:bg-red-500/10 rounded-lg transition-colors cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <div className="p-8 text-center text-xs text-muted-foreground">
                  Изберете клуч на спецификација за да ги конфигурирате нејзините опции.
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
