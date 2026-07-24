'use client';

import React, { useState } from 'react';
import { useI18n } from '@/lib/i18n-context';
import { Product, ProductModel, SpecificationKey, SpecificationOption, SpecInputType } from '@/types';
import { imfexStore } from '@/lib/store';
import { Plus, Trash2, ShieldAlert, Layers, Settings2 } from 'lucide-react';

interface ProductEditorProps {
  product: Product;
  onUpdate: () => void;
  isSuperAdmin: boolean;
}

export const ProductEditor: React.FC<ProductEditorProps> = ({ product, onUpdate, isSuperAdmin }) => {
  const { t } = useI18n();
  const [activeTab, setActiveTab] = useState<'models' | 'specs'>('models');

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
  const handleAddModel = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newModelName.trim() || !isSuperAdmin) return;

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

    imfexStore.saveProduct(updatedProduct);
    setNewModelName('');
    setNewModelPrice(0);
    onUpdate();
  };

  const handleDeleteModel = (modelId: string) => {
    if (!isSuperAdmin) return;
    const updatedProduct = {
      ...product,
      models: models.filter((m) => m.id !== modelId),
    };
    imfexStore.saveProduct(updatedProduct);
    onUpdate();
  };

  // Spec actions
  const handleAddSpecKey = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSpecName.trim() || !isSuperAdmin) return;

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

    imfexStore.saveProduct(updatedProduct);
    setNewSpecName('');
    setSelectedSpecId(newKey.id);
    onUpdate();
  };

  const handleDeleteSpecKey = (keyId: string) => {
    if (!isSuperAdmin) return;
    const updatedProduct = {
      ...product,
      specificationKeys: specificationKeys.filter((k) => k.id !== keyId),
    };
    imfexStore.saveProduct(updatedProduct);
    if (selectedSpecId === keyId) setSelectedSpecId(null);
    onUpdate();
  };

  // Option actions
  const handleAddOption = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSpecId || !newOptionLabel.trim() || !isSuperAdmin) return;

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

    imfexStore.saveProduct(updatedProduct);
    setNewOptionLabel('');
    setNewOptionPrice(0);
    onUpdate();
  };

  const handleDeleteOption = (specKeyId: string, optId: string) => {
    if (!isSuperAdmin) return;
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

    imfexStore.saveProduct(updatedProduct);
    onUpdate();
  };

  const selectedKeyObj = specificationKeys.find((k) => k.id === selectedSpecId);

  return (
    <div className="bg-card border border-border rounded-xl p-6 shadow-sm space-y-6">
      {/* Product Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="bg-primary/10 text-primary text-[10px] font-extrabold px-2 py-0.5 rounded uppercase">
              {product.code}
            </span>
            <h2 className="font-extrabold text-xl">{product.name}</h2>
          </div>
          <p className="text-xs text-muted-foreground mt-1">{product.description}</p>
        </div>

        {/* Tab Controls */}
        <div className="flex items-center bg-muted p-1 rounded-xl border border-border">
          <button
            onClick={() => setActiveTab('models')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
              activeTab === 'models'
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            {t('products.models')} ({models.length})
          </button>
          <button
            onClick={() => setActiveTab('specs')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
              activeTab === 'specs'
                ? 'bg-primary text-primary-foreground shadow-sm'
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
                className="flex-1 px-3 py-1.5 text-xs rounded-lg border border-border bg-background outline-none focus:ring-2 focus:ring-primary"
              />
              <div className="relative w-36">
                <input
                  type="number"
                  step="0.01"
                  placeholder={t('products.base_price')}
                  value={newModelPrice || ''}
                  onChange={(e) => setNewModelPrice(parseFloat(e.target.value))}
                  className="w-full pl-6 pr-3 py-1.5 text-xs rounded-lg border border-border bg-background outline-none focus:ring-2 focus:ring-primary"
                />
                <span className="absolute left-2.5 top-2 text-xs font-bold text-muted-foreground">€</span>
              </div>
              <button
                type="submit"
                className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-all shadow-sm"
              >
                <Plus className="w-3.5 h-3.5" /> {t('products.add_model')}
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
            <table className="w-full text-left">
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
                          className="p-1 text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
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
                className="flex-1 px-3 py-1.5 text-xs rounded-lg border border-border bg-background outline-none focus:ring-2 focus:ring-primary"
              />
              <select
                value={newSpecType}
                onChange={(e) => setNewSpecType(e.target.value as SpecInputType)}
                className="px-3 py-1.5 text-xs rounded-lg border border-border bg-background outline-none font-semibold"
              >
                <option value="SELECT">SELECT (Единечен Избор)</option>
                <option value="MULTISELECT">MULTISELECT (Повеќекратен Избор)</option>
                <option value="TEXT">TEXT (Текст Внес)</option>
                <option value="NUMBER">NUMBER (Бројчен Внес)</option>
              </select>
              <button
                type="submit"
                className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-all shadow-sm"
              >
                <Plus className="w-3.5 h-3.5" /> {t('products.add_spec')}
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
                  className={`p-3 rounded-lg border cursor-pointer flex items-center justify-between transition-all ${
                    selectedSpecId === key.id
                      ? 'border-primary bg-primary/10 font-bold text-primary shadow-sm'
                      : 'border-border bg-card hover:bg-muted text-foreground'
                  }`}
                >
                  <div>
                    <p className="leading-tight">{key.name}</p>
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
                      className="p-1 text-red-500 hover:bg-red-500/10 rounded transition-colors"
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
                        className="flex-1 px-3 py-1.5 text-xs rounded-lg border border-border bg-background outline-none focus:ring-2 focus:ring-primary"
                      />
                      <div className="relative w-36">
                        <input
                          type="number"
                          step="0.01"
                          placeholder={t('products.price_modifier')}
                          value={newOptionPrice || ''}
                          onChange={(e) => setNewOptionPrice(parseFloat(e.target.value))}
                          className="w-full pl-6 pr-3 py-1.5 text-xs rounded-lg border border-border bg-background outline-none focus:ring-2 focus:ring-primary"
                        />
                        <span className="absolute left-2.5 top-2 text-xs font-bold text-muted-foreground">€</span>
                      </div>
                      <button
                        type="submit"
                        className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-all shadow-sm"
                      >
                        <Plus className="w-3.5 h-3.5" /> {t('products.add_option')}
                      </button>
                    </form>
                  )}

                  {/* Options List */}
                  {selectedKeyObj.inputType === 'TEXT' || selectedKeyObj.inputType === 'NUMBER' ? (
                    <div className="p-4 bg-muted/30 rounded-lg text-xs text-muted-foreground italic">
                      Овој атрибут користи тип на внес {selectedKeyObj.inputType}. Продажните агенти ќе внесат сопствен текст/број за време на креирање понуда.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {(selectedKeyObj.options || []).map((opt) => (
                        <div
                          key={opt.id}
                          className="flex items-center justify-between p-2.5 bg-muted/20 border border-border rounded-lg text-xs"
                        >
                          <span className="font-medium text-foreground">{opt.label}</span>
                          <div className="flex items-center gap-3">
                            <span className="font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded">
                              {Number(opt.priceModifier || 0) >= 0
                                ? `+€${Number(opt.priceModifier || 0).toFixed(2)}`
                                : `-€${Math.abs(Number(opt.priceModifier || 0)).toFixed(2)}`}
                            </span>
                            {isSuperAdmin && (
                              <button
                                onClick={() => handleDeleteOption(selectedKeyObj.id, opt.id)}
                                className="p-1 text-red-500 hover:bg-red-500/10 rounded transition-colors"
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
