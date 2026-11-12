'use client';

import React, { useMemo } from 'react';
import { Project, Product, Offer, Customer, ProjectStatus, OfferStatus } from '@/types';
import { imfexStore, useImfexStore } from '@/lib/store';
import { SearchableSelect, SearchableSelectOption } from '@/components/ui/searchable-select';

// ============================================================================
// 1. PROJECT SELECT (Пребарување по код PRJ-..., назив на клиент, статус)
// ============================================================================

export interface ProjectSelectProps {
  value: string;
  onChange: (projectId: string, project?: Project) => void;
  projects?: Project[];
  onlyActive?: boolean;
  showActiveToggle?: boolean;
  placeholder?: string;
  searchPlaceholder?: string;
  className?: string;
  allowClear?: boolean;
  clearLabel?: string;
  disabled?: boolean;
}

const PROJECT_STATUS_LABELS: Record<ProjectStatus, string> = {
  PLANNED: 'ПЛАНИРАНО',
  PROCUREMENT: 'НАБАВКА',
  PRODUCTION: 'ПРОИЗВОДСТВО',
  INSTALLATION: 'МОНТАЖА',
  COMPLETED: 'ЗАВРШЕНО',
  CLOSED: 'ЗАТВОРЕНО',
};

const PROJECT_STATUS_COLORS: Record<ProjectStatus, string> = {
  PLANNED: 'bg-blue-500/10 text-blue-500 border border-blue-500/20',
  PROCUREMENT: 'bg-purple-500/10 text-purple-500 border border-purple-500/20',
  PRODUCTION: 'bg-amber-500/10 text-amber-500 border border-amber-500/20',
  INSTALLATION: 'bg-orange-500/10 text-orange-500 border border-orange-500/20',
  COMPLETED: 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20',
  CLOSED: 'bg-gray-500/10 text-gray-500 border border-gray-500/20',
};

export const ProjectSelect: React.FC<ProjectSelectProps> = ({
  value,
  onChange,
  projects: customProjects,
  onlyActive = false,
  showActiveToggle = true,
  placeholder = 'Пребарај и избери Проект...',
  searchPlaceholder = 'Пребарај по код (PRJ-...), клиент, град...',
  className = '',
  allowClear = false,
  clearLabel = '-- Без проект --',
  disabled = false,
}) => {
  useImfexStore(); // Live reactivity if store changes
  const allProjects = customProjects || imfexStore.getProjects();

  const options: SearchableSelectOption[] = useMemo(() => {
    return allProjects.map((p) => {
      const custName = p.customer?.companyName || p.customer?.name || 'Непознат клиент';
      const statusLabel = PROJECT_STATUS_LABELS[p.status] || p.status;
      const isProjActive = p.status !== 'COMPLETED' && p.status !== 'CLOSED';

      const sublabelParts = [
        p.installationAddress ? `Адреса: ${p.installationAddress}` : '',
        p.offer?.offerNumber ? `Понуда: ${p.offer.offerNumber}` : '',
        p.targetDeliveryDate ? `Рок: ${p.targetDeliveryDate}` : '',
        p.responsibleUser?.fullName ? `Одговорен: ${p.responsibleUser.fullName}` : '',
      ].filter(Boolean);

      return {
        value: p.id,
        code: p.projectNumber,
        label: `${custName}`,
        customerName: custName,
        sublabel: sublabelParts.join(' • '),
        badge: statusLabel,
        badgeColor: PROJECT_STATUS_COLORS[p.status],
        isActive: isProjActive,
        keywords: [
          p.projectNumber,
          custName,
          p.customer?.name || '',
          p.customer?.companyName || '',
          p.customer?.taxId || '',
          p.customer?.phone || '',
          p.customer?.city || '',
          p.installationAddress || '',
          p.offer?.offerNumber || '',
          p.responsibleUser?.fullName || '',
          statusLabel,
        ],
      };
    });
  }, [allProjects]);

  return (
    <SearchableSelect
      options={options}
      value={value}
      onChange={(val) => {
        const found = allProjects.find((p) => p.id === val);
        onChange(val, found);
      }}
      placeholder={placeholder}
      searchPlaceholder={searchPlaceholder}
      className={className}
      allowClear={allowClear}
      clearLabel={clearLabel}
      showActiveToggle={showActiveToggle}
      defaultActiveOnly={onlyActive}
      disabled={disabled}
      emptyMessage="Нема пронајдено проекти"
    />
  );
};

// ============================================================================
// 2. PRODUCT SELECT (Пребарување по код PRD-..., назив, залиха, категорија)
// ============================================================================

export interface ProductSelectProps {
  value: string;
  onChange: (productId: string, product?: Product) => void;
  products?: Product[];
  categoryFilter?: string;
  stockTypeFilter?: 'STOCK' | 'CUSTOM' | 'ALL';
  onlyActive?: boolean;
  showActiveToggle?: boolean;
  placeholder?: string;
  searchPlaceholder?: string;
  className?: string;
  allowClear?: boolean;
  clearLabel?: string;
  disabled?: boolean;
}

export const ProductSelect: React.FC<ProductSelectProps> = ({
  value,
  onChange,
  products: customProducts,
  categoryFilter,
  stockTypeFilter = 'ALL',
  onlyActive = false,
  showActiveToggle = true,
  placeholder = 'Пребарај и избери Производ...',
  searchPlaceholder = 'Пребарај по код (PRD-...), назив, категорија...',
  className = '',
  allowClear = false,
  clearLabel = '-- Без производ --',
  disabled = false,
}) => {
  useImfexStore();
  const allProducts = customProducts || imfexStore.getProducts();

  const options: SearchableSelectOption[] = useMemo(() => {
    let filtered = allProducts;

    if (categoryFilter) {
      filtered = filtered.filter(
        (p) =>
          p.categoryId === categoryFilter ||
          p.category?.name?.toLowerCase() === categoryFilter.toLowerCase()
      );
    }

    if (stockTypeFilter && stockTypeFilter !== 'ALL') {
      filtered = filtered.filter((p) => p.stockType === stockTypeFilter);
    }

    return filtered.map((p) => {
      const isCustom = p.stockType === 'CUSTOM';
      const stock = p.stockQuantity ?? 0;
      const reserved = p.reservedQuantity ?? 0;
      const freeStock = Math.max(0, stock - reserved);
      const isProdActive = p.isActive !== false;

      let badge = isCustom ? 'ПО НАРАЧКА' : `ЗАЛИХА: ${stock}`;
      let badgeColor = isCustom
        ? 'bg-sky-500/10 text-sky-400 border border-sky-500/20'
        : stock > 0
        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
        : 'bg-rose-500/10 text-rose-400 border border-rose-500/20';

      const catName = p.category?.name;
      const price = p.models?.[0]?.basePrice || p.purchasePrice;

      const sublabelParts = [
        catName ? `Категорија: ${catName}` : '',
        price ? `Цена: €${Number(price).toFixed(2)}` : '',
        !isCustom && reserved > 0 ? `(Слободно: ${freeStock}, Резерв: ${reserved})` : '',
      ].filter(Boolean);

      return {
        value: p.id,
        code: p.code,
        label: p.name,
        sublabel: sublabelParts.join(' • '),
        badge,
        badgeColor,
        isActive: isProdActive,
        keywords: [
          p.code,
          p.name,
          p.description || '',
          catName || '',
          p.stockType || '',
          ...(p.models?.map((m) => m.name) || []),
        ],
      };
    });
  }, [allProducts, categoryFilter, stockTypeFilter]);

  return (
    <SearchableSelect
      options={options}
      value={value}
      onChange={(val) => {
        const found = allProducts.find((p) => p.id === val);
        onChange(val, found);
      }}
      placeholder={placeholder}
      searchPlaceholder={searchPlaceholder}
      className={className}
      allowClear={allowClear}
      clearLabel={clearLabel}
      showActiveToggle={showActiveToggle}
      defaultActiveOnly={onlyActive}
      disabled={disabled}
      emptyMessage="Нема пронајдено производи"
    />
  );
};

// ============================================================================
// 3. OFFER SELECT (Пребарување по код OFF-..., клиент, износ, статус)
// ============================================================================

export interface OfferSelectProps {
  value: string;
  onChange: (offerId: string, offer?: Offer) => void;
  offers?: Offer[];
  onlyActive?: boolean;
  showActiveToggle?: boolean;
  placeholder?: string;
  searchPlaceholder?: string;
  className?: string;
  allowClear?: boolean;
  clearLabel?: string;
  disabled?: boolean;
}

const OFFER_STATUS_LABELS: Record<OfferStatus, string> = {
  DRAFT: 'НАЦРТ',
  SENT: 'ИСПРАТЕНА',
  ACCEPTED: 'ПРИФАТЕНА',
  REJECTED: 'ОДБИЕНА',
  EXPIRED: 'ИСТЕЧЕНА',
};

const OFFER_STATUS_COLORS: Record<OfferStatus, string> = {
  DRAFT: 'bg-amber-500/10 text-amber-500 border border-amber-500/20',
  SENT: 'bg-blue-500/10 text-blue-500 border border-blue-500/20',
  ACCEPTED: 'bg-emerald-500/10 text-emerald-400 font-extrabold border border-emerald-500/20',
  REJECTED: 'bg-rose-500/10 text-rose-500 border border-rose-500/20',
  EXPIRED: 'bg-gray-500/10 text-gray-500 border border-gray-500/20',
};

export const OfferSelect: React.FC<OfferSelectProps> = ({
  value,
  onChange,
  offers: customOffers,
  onlyActive = false,
  showActiveToggle = true,
  placeholder = 'Пребарај и избери Понуда...',
  searchPlaceholder = 'Пребарај по број (OFF-...), клиент, износ...',
  className = '',
  allowClear = false,
  clearLabel = '-- Без понуда --',
  disabled = false,
}) => {
  useImfexStore();
  const allOffers = customOffers || imfexStore.getOffers();

  const options: SearchableSelectOption[] = useMemo(() => {
    return allOffers.map((o) => {
      const custName = o.customer?.companyName || o.customer?.name || 'Непознат клиент';
      const statusLabel = OFFER_STATUS_LABELS[o.status] || o.status;
      const isOfferActive = o.status !== 'REJECTED' && o.status !== 'EXPIRED';

      const sublabelParts = [
        `Износ: €${Number(o.totalAmount || 0).toFixed(2)}`,
        o.validUntil ? `Важи до: ${o.validUntil}` : '',
        `Ставки: ${(o.items || []).length}`,
      ].filter(Boolean);

      return {
        value: o.id,
        code: o.offerNumber,
        label: `${custName}`,
        customerName: custName,
        sublabel: sublabelParts.join(' • '),
        badge: statusLabel,
        badgeColor: OFFER_STATUS_COLORS[o.status],
        isActive: isOfferActive,
        keywords: [
          o.offerNumber,
          custName,
          o.customer?.name || '',
          o.customer?.companyName || '',
          o.customer?.taxId || '',
          o.customer?.email || '',
          o.customer?.phone || '',
          `${o.totalAmount}`,
          statusLabel,
        ],
      };
    });
  }, [allOffers]);

  return (
    <SearchableSelect
      options={options}
      value={value}
      onChange={(val) => {
        const found = allOffers.find((o) => o.id === val);
        onChange(val, found);
      }}
      placeholder={placeholder}
      searchPlaceholder={searchPlaceholder}
      className={className}
      allowClear={allowClear}
      clearLabel={clearLabel}
      showActiveToggle={showActiveToggle}
      defaultActiveOnly={onlyActive}
      disabled={disabled}
      emptyMessage="Нема пронајдено понуди"
    />
  );
};

// ============================================================================
// 4. CUSTOMER SELECT (Пребарување по компанија, име, ЕДБ, тел, е-пошта, град)
// ============================================================================

export interface CustomerSelectProps {
  value: string;
  onChange: (customerId: string, customer?: Customer) => void;
  customers?: Customer[];
  includeSuppliers?: boolean;
  placeholder?: string;
  searchPlaceholder?: string;
  className?: string;
  allowClear?: boolean;
  clearLabel?: string;
  disabled?: boolean;
}

export const CustomerSelect: React.FC<CustomerSelectProps> = ({
  value,
  onChange,
  customers: customCustomers,
  includeSuppliers = false,
  placeholder = 'Пребарај и избери Клиент...',
  searchPlaceholder = 'Пребарај по назив, контакт, ЕДБ, град...',
  className = '',
  allowClear = false,
  clearLabel = '-- Без клиент --',
  disabled = false,
}) => {
  useImfexStore();
  const allCustomers = customCustomers || imfexStore.getCustomers();

  const options: SearchableSelectOption[] = useMemo(() => {
    const list: SearchableSelectOption[] = allCustomers.map((c) => {
      const displayName = c.companyName || c.name;
      const sublabelParts = [
        c.taxId ? `ЕДБ: ${c.taxId}` : '',
        c.city ? `Град: ${c.city}` : '',
        c.phone ? `Тел: ${c.phone}` : '',
        c.email ? `${c.email}` : '',
      ].filter(Boolean);

      return {
        value: c.id,
        code: c.taxId ? `ЕДБ:${c.taxId}` : undefined,
        label: displayName,
        sublabel: sublabelParts.join(' • '),
        badge: c.customerType,
        badgeColor:
          c.customerType === 'COMPANY'
            ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20'
            : c.customerType === 'PARTNER'
            ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20'
            : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
        isActive: true,
        keywords: [
          c.name,
          c.companyName || '',
          c.taxId || '',
          c.email || '',
          c.phone || '',
          c.city || '',
          c.address || '',
          c.customerType,
        ],
      };
    });

    if (includeSuppliers) {
      list.push(
        {
          value: 'SUPPLIER:Doors Impex',
          label: 'Doors Impex (Фабрички добавувач)',
          sublabel: 'Главен партнер за мотори, шини и сегменти',
          badge: 'ДОБАВУВАЧ',
          badgeColor: 'bg-sky-500/10 text-sky-400 border border-sky-500/20',
          isActive: true,
          keywords: ['Doors Impex', 'добавувач', 'партнер', 'увоз'],
        },
        {
          value: 'SUPPLIER:Макпетрол (Гориво)',
          label: 'Макпетрол (Гориво & Мазива)',
          sublabel: 'Флота возила / гориво',
          badge: 'ДОБАВУВАЧ',
          badgeColor: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
          isActive: true,
          keywords: ['Макпетрол', 'гориво', 'нафта', 'бензин'],
        },
        {
          value: 'SUPPLIER:ЕВН Македонија',
          label: 'ЕВН Македонија',
          sublabel: 'Режиски трошоци за струја',
          badge: 'РЕЖИЈА',
          badgeColor: 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20',
          isActive: true,
          keywords: ['ЕВН', 'струја', 'режија'],
        },
        {
          value: 'SUPPLIER:Железарија Профи',
          label: 'Железарија Профи (Штрафчиња / Материјал)',
          sublabel: 'Потрошен материјал за монтажа',
          badge: 'МАТЕРИЈАЛ',
          badgeColor: 'bg-orange-500/10 text-orange-400 border border-orange-500/20',
          isActive: true,
          keywords: ['Железарија', 'штрафови', 'материјал', 'профи'],
        }
      );
    }

    return list;
  }, [allCustomers, includeSuppliers]);

  return (
    <SearchableSelect
      options={options}
      value={value}
      onChange={(val) => {
        const found = allCustomers.find((c) => c.id === val);
        onChange(val, found);
      }}
      placeholder={placeholder}
      searchPlaceholder={searchPlaceholder}
      className={className}
      allowClear={allowClear}
      clearLabel={clearLabel}
      disabled={disabled}
      emptyMessage="Нема пронајдено клиенти"
    />
  );
};

// ============================================================================
// 5. UNIFIED ENTITY SELECT (Комбинирано пребарување низ Проекти, Производи, Понуди, Клиенти)
// ============================================================================

export type UnifiedEntityType = 'project' | 'product' | 'offer' | 'customer';

export interface UnifiedEntitySelectProps {
  entities?: UnifiedEntityType[];
  value: string;
  onChange: (value: string, entityType: UnifiedEntityType, entity: any) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  className?: string;
  onlyActive?: boolean;
  allowClear?: boolean;
  clearLabel?: string;
  disabled?: boolean;
}

export const UnifiedEntitySelect: React.FC<UnifiedEntitySelectProps> = ({
  entities = ['project', 'product', 'offer', 'customer'],
  value,
  onChange,
  placeholder = 'Пребарај низ проекти, понуди, производи, клиенти...',
  searchPlaceholder = 'Внеси код (PRJ-, OFF-, PRD-), клиент, назив...',
  className = '',
  onlyActive = false,
  allowClear = false,
  clearLabel = '-- Без избор --',
  disabled = false,
}) => {
  useImfexStore();
  const projects = imfexStore.getProjects();
  const products = imfexStore.getProducts();
  const offers = imfexStore.getOffers();
  const customers = imfexStore.getCustomers();

  const options: SearchableSelectOption[] = useMemo(() => {
    const list: SearchableSelectOption[] = [];

    if (entities.includes('project')) {
      projects.forEach((p) => {
        const custName = p.customer?.companyName || p.customer?.name || 'Клиент';
        list.push({
          value: `project:${p.id}`,
          code: p.projectNumber,
          label: `${custName} (${PROJECT_STATUS_LABELS[p.status] || p.status})`,
          customerName: custName,
          sublabel: `Проект • ${p.installationAddress || 'Без адреса'}`,
          badge: 'ПРОЕКТ',
          badgeColor: 'bg-blue-500/10 text-blue-500 border border-blue-500/20',
          isActive: p.status !== 'COMPLETED' && p.status !== 'CLOSED',
          keywords: [p.projectNumber, custName, p.installationAddress || '', 'проект', 'project'],
        });
      });
    }

    if (entities.includes('offer')) {
      offers.forEach((o) => {
        const custName = o.customer?.companyName || o.customer?.name || 'Клиент';
        list.push({
          value: `offer:${o.id}`,
          code: o.offerNumber,
          label: `${custName} (€${Number(o.totalAmount || 0).toFixed(2)})`,
          customerName: custName,
          sublabel: `Понуда • Статус: ${OFFER_STATUS_LABELS[o.status] || o.status}`,
          badge: 'ПОНУДА',
          badgeColor: 'bg-amber-500/10 text-amber-500 border border-amber-500/20',
          isActive: o.status !== 'REJECTED' && o.status !== 'EXPIRED',
          keywords: [o.offerNumber, custName, `${o.totalAmount}`, 'понуда', 'offer'],
        });
      });
    }

    if (entities.includes('product')) {
      products.forEach((prod) => {
        list.push({
          value: `product:${prod.id}`,
          code: prod.code,
          label: prod.name,
          sublabel: `Производ • Залиха: ${prod.stockQuantity ?? 0} • ${prod.category?.name || 'Општо'}`,
          badge: 'ПРОИЗВОД',
          badgeColor: 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20',
          isActive: prod.isActive !== false,
          keywords: [prod.code, prod.name, prod.category?.name || '', 'производ', 'продукт', 'product'],
        });
      });
    }

    if (entities.includes('customer')) {
      customers.forEach((c) => {
        const name = c.companyName || c.name;
        list.push({
          value: `customer:${c.id}`,
          code: c.taxId ? `ЕДБ:${c.taxId}` : undefined,
          label: `${name} (${c.customerType})`,
          sublabel: `Клиент • ${[c.city, c.phone].filter(Boolean).join(' • ')}`,
          badge: 'КЛИЕНТ',
          badgeColor: 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20',
          isActive: true,
          keywords: [name, c.taxId || '', c.phone || '', c.city || '', 'клиент', 'customer'],
        });
      });
    }

    return list;
  }, [entities, projects, products, offers, customers]);

  return (
    <SearchableSelect
      options={options}
      value={value}
      onChange={(rawVal) => {
        if (!rawVal) {
          onChange('', 'project', null);
          return;
        }
        const [type, id] = rawVal.split(':') as [UnifiedEntityType, string];
        let entityObj: any = null;
        if (type === 'project') entityObj = projects.find((p) => p.id === id);
        if (type === 'offer') entityObj = offers.find((o) => o.id === id);
        if (type === 'product') entityObj = products.find((p) => p.id === id);
        if (type === 'customer') entityObj = customers.find((c) => c.id === id);
        onChange(id, type, entityObj);
      }}
      placeholder={placeholder}
      searchPlaceholder={searchPlaceholder}
      className={className}
      allowClear={allowClear}
      clearLabel={clearLabel}
      showActiveToggle={true}
      defaultActiveOnly={onlyActive}
      disabled={disabled}
      emptyMessage="Нема пронајдено резултати"
    />
  );
};
