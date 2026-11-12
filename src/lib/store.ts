import { useEffect, useState } from 'react';
import {
  Customer,
  Offer,
  OfferItemSpecSelection,
  Product,
  SpecificationKey,
  UserProfile,
  UserRole,
  Project,
  ProjectStatus,
  ProjectAttachment,
  ProjectFileCategory,
  ServiceTicket,
  ClientDocument,
  InstalledItem,
  OfferStatus,
  CalendarEvent,
  ProductCategory,
  InventoryMovement,
  InventoryMoveKind,
  ProductStockType,
  PurchaseInvoice,
  PurchaseInvoiceItem,
  SalesInvoice,
  SalesInvoiceType,
  SalesInvoiceItem,
  DispatchNote,
  DispatchNoteItem,
  PaymentRecord,
  PaymentMethod,
} from '@/types';

export const getApiUrl = () => {
  return process.env.NEXT_PUBLIC_API_URL || 'https://imfex-crm-backend.onrender.com';
};

class ImfexStore {
  private categories: ProductCategory[] = [];
  private products: Product[] = [];
  private customers: Customer[] = [];
  private offers: Offer[] = [];
  private profiles: UserProfile[] = [];
  private projects: Project[] = [];
  private serviceTickets: ServiceTicket[] = [];
  private installedItems: InstalledItem[] = [];
  private documents: ClientDocument[] = [];
  private calendarEvents: CalendarEvent[] = [];
  private movements: InventoryMovement[] = [];
  private purchaseInvoices: PurchaseInvoice[] = [];
  private salesInvoices: SalesInvoice[] = [];
  private dispatchNotes: DispatchNote[] = [];
  private payments: PaymentRecord[] = [];
  private stockOverlay: Record<string, { stockType?: ProductStockType; stockQuantity: number; reservedQuantity: number; purchasePrice?: number }> = {};
  private specDefaultsOverlay: Record<string, Record<string, { defaultValue?: string; defaultOptionId?: string }>> = {};
  private offerSpecsOverlay: Record<string, OfferItemSpecSelection[][]> = {};
  private projectFlowOverlay: Record<string, Partial<Project>> = {};
  private projectAttachments: Record<string, ProjectAttachment[]> = {};
  private currentUser: UserProfile | null = null;
  public isLoadedFromBackend: boolean = false;
  private listeners: Array<() => void> = [];

  constructor() {
    if (typeof window !== 'undefined') {
      if (localStorage.getItem('imfex_clean_state_v1') !== 'true') {
        localStorage.removeItem('imfex_calendar_events');
        localStorage.removeItem('imfex_inventory_movements');
        localStorage.removeItem('imfex_stock_overlay');
        localStorage.removeItem('imfex_project_flow_overlay');
        localStorage.setItem('imfex_clean_state_v1', 'true');
      }

      const storedUser = sessionStorage.getItem('imfex_current_user');
      if (storedUser) {
        try {
          this.currentUser = JSON.parse(storedUser);
        } catch (e) {}
      }

      const storedEvents = localStorage.getItem('imfex_calendar_events');
      if (storedEvents) {
        try {
          this.calendarEvents = JSON.parse(storedEvents);
        } catch (e) {}
      }

      const storedMoves = localStorage.getItem('imfex_inventory_movements');
      if (storedMoves) {
        try {
          this.movements = JSON.parse(storedMoves);
        } catch (e) {}
      }

      const storedStock = localStorage.getItem('imfex_stock_overlay');
      if (storedStock) {
        try {
          this.stockOverlay = JSON.parse(storedStock);
        } catch (e) {}
      }

      const storedSpecDefaults = localStorage.getItem('imfex_spec_defaults_overlay');
      if (storedSpecDefaults) {
        try {
          this.specDefaultsOverlay = JSON.parse(storedSpecDefaults);
        } catch (e) {}
      }

      const storedOfferSpecs = localStorage.getItem('imfex_offer_specs_overlay');
      if (storedOfferSpecs) {
        try {
          this.offerSpecsOverlay = JSON.parse(storedOfferSpecs);
        } catch (e) {}
      }

      const storedProjFlow = localStorage.getItem('imfex_project_flow_overlay');
      if (storedProjFlow) {
        try {
          this.projectFlowOverlay = JSON.parse(storedProjFlow);
        } catch (e) {}
      }

      const storedPurchases = localStorage.getItem('imfex_purchase_invoices');
      if (storedPurchases) {
        try {
          this.purchaseInvoices = JSON.parse(storedPurchases);
        } catch (e) {}
      }

      const storedSales = localStorage.getItem('imfex_sales_invoices');
      if (storedSales) {
        try {
          this.salesInvoices = JSON.parse(storedSales);
        } catch (e) {}
      }

      const storedDispatches = localStorage.getItem('imfex_dispatch_notes');
      if (storedDispatches) {
        try {
          this.dispatchNotes = JSON.parse(storedDispatches);
        } catch (e) {}
      }

      const storedPayments = localStorage.getItem('imfex_payments');
      if (storedPayments) {
        try {
          this.payments = JSON.parse(storedPayments);
        } catch (e) {}
      }

      const storedProjectAttachments = localStorage.getItem('imfex_project_attachments');
      if (storedProjectAttachments) {
        try {
          this.projectAttachments = JSON.parse(storedProjectAttachments);
        } catch (e) {}
      }

      const storedDocuments = localStorage.getItem('imfex_client_documents');
      if (storedDocuments) {
        try {
          this.documents = JSON.parse(storedDocuments);
        } catch (e) {}
      }

      this.ensureWarehouseCatalog();
      this.fetchInitialDataFromBackend();
    }
  }

  private safeSetLocalStorage(key: string, value: string): boolean {
    if (typeof window === 'undefined') return false;
    try {
      localStorage.setItem(key, value);
      return true;
    } catch (e) {
      console.warn(`localStorage quota/write notice for ${key}:`, e);
      return false;
    }
  }

  private persistProjectAttachments(): boolean {
    if (typeof window === 'undefined') return false;
    return this.safeSetLocalStorage('imfex_project_attachments', JSON.stringify(this.projectAttachments));
  }

  private clientDocToProjectAttachment(doc: ClientDocument): ProjectAttachment | null {
    if (!doc.projectId || !doc.fileUrl || doc.fileUrl === '#') return null;
    if (!doc.fileUrl.startsWith('data:') && !doc.fileUrl.startsWith('http')) return null;
    const upperType = (doc.fileType || '').toUpperCase();
    if (upperType === 'PROTOCOL' || upperType === 'SIGNATURE') return null;

    const cleanName = doc.fileName || doc.title.replace(/\s*\(PRJ-[^)]+\)\s*$/, '') || doc.title || 'Документ';
    let mimeType = 'application/octet-stream';
    const dataMimeMatch = doc.fileUrl.match(/^data:([^;,]+)[;,]/i);
    if (dataMimeMatch && dataMimeMatch[1]) {
      mimeType = dataMimeMatch[1];
    }

    let category: ProjectFileCategory = 'OTHER';
    if (['IMAGE', 'PDF', 'EXCEL', 'WORD', 'OTHER'].includes(upperType)) {
      category = upperType as ProjectFileCategory;
    } else if (mimeType.startsWith('image/') || /\.(jpg|jpeg|png|gif|webp|bmp|svg|heic|avif)$/i.test(cleanName)) {
      category = 'IMAGE';
    } else if (mimeType === 'application/pdf' || /\.pdf$/i.test(cleanName)) {
      category = 'PDF';
    } else if (
      mimeType.includes('excel') ||
      mimeType.includes('spreadsheet') ||
      mimeType === 'text/csv' ||
      /\.(xls|xlsx|csv|ods)$/i.test(cleanName)
    ) {
      category = 'EXCEL';
    } else if (
      mimeType.includes('word') ||
      mimeType.includes('msword') ||
      mimeType.includes('wordprocessingml') ||
      /\.(doc|docx|rtf|odt)$/i.test(cleanName)
    ) {
      category = 'WORD';
    }

    let estimatedSize = doc.sizeBytes ?? 0;
    if (!estimatedSize && doc.fileUrl.startsWith('data:')) {
      const commaIdx = doc.fileUrl.indexOf(',');
      if (commaIdx > 0) {
        const base64Len = doc.fileUrl.length - (commaIdx + 1);
        estimatedSize = Math.round((base64Len * 3) / 4);
      }
    }

    return {
      id: doc.id,
      projectId: doc.projectId,
      customerId: doc.customerId,
      name: cleanName,
      mimeType,
      category,
      sizeBytes: estimatedSize,
      dataUrl: doc.fileUrl,
      createdAt: doc.createdAt || new Date().toISOString(),
    };
  }

  private hydrateProjectAttachmentsFromDocs(docs: ClientDocument[]) {
    let changed = false;
    for (const doc of docs) {
      const att = this.clientDocToProjectAttachment(doc);
      if (!att) continue;
      const list = this.projectAttachments[att.projectId] || [];
      const existingIdx = list.findIndex(
        (a) => a.id === att.id || (a.name === att.name && Math.abs((a.sizeBytes || 0) - (att.sizeBytes || 0)) <= 4)
      );
      if (existingIdx >= 0) {
        if (list[existingIdx].id !== att.id || !list[existingIdx].dataUrl) {
          list[existingIdx] = { ...list[existingIdx], ...att };
          this.projectAttachments[att.projectId] = list;
          changed = true;
        }
      } else {
        this.projectAttachments[att.projectId] = [att, ...list];
        changed = true;
      }
    }
    if (changed) {
      this.persistProjectAttachments();
    }
  }

  private persistClientDocuments(): boolean {
    if (typeof window === 'undefined') return false;
    // Strip heavy data: URLs from imfex_client_documents to avoid duplicating base64 in localStorage;
    // dataUrls are resolved from projectAttachments on read.
    const lightDocs = this.documents.map((d) =>
      d.fileUrl && d.fileUrl.startsWith('data:') ? { ...d, fileUrl: '' } : d
    );
    return this.safeSetLocalStorage('imfex_client_documents', JSON.stringify(lightDocs));
  }

  private persistWarehouseState() {
    if (typeof window !== 'undefined') {
      this.safeSetLocalStorage('imfex_inventory_movements', JSON.stringify(this.movements));
      this.safeSetLocalStorage('imfex_stock_overlay', JSON.stringify(this.stockOverlay));
      this.safeSetLocalStorage('imfex_spec_defaults_overlay', JSON.stringify(this.specDefaultsOverlay));
      this.safeSetLocalStorage('imfex_offer_specs_overlay', JSON.stringify(this.offerSpecsOverlay));
      this.safeSetLocalStorage('imfex_project_flow_overlay', JSON.stringify(this.projectFlowOverlay));
      this.safeSetLocalStorage('imfex_purchase_invoices', JSON.stringify(this.purchaseInvoices));
      this.safeSetLocalStorage('imfex_sales_invoices', JSON.stringify(this.salesInvoices));
      this.safeSetLocalStorage('imfex_dispatch_notes', JSON.stringify(this.dispatchNotes));
      this.safeSetLocalStorage('imfex_payments', JSON.stringify(this.payments));
      this.persistClientDocuments();
    }
  }

  public ensureWarehouseCatalog() {
    // Ensure any products from backend have stockType and stockQuantity initialized, plus specification defaults
    this.products = this.products.map((p) => {
      const overlay = this.stockOverlay[p.code];
      const specOverlay = this.specDefaultsOverlay[p.code] || this.specDefaultsOverlay[p.id] || {};
      const catObj = p.category || this.categories.find((c) => c.id === p.categoryId);
      const isDoorCustom =
        p.stockType === 'CUSTOM' ||
        (catObj?.name || '').toLowerCase().includes('гараж') ||
        p.code.startsWith('GV-') ||
        p.code.startsWith('PROD-GAR');
      const inferredType: ProductStockType = overlay?.stockType || p.stockType || (isDoorCustom ? 'CUSTOM' : 'STOCK');
      const mergedKeys = (p.specificationKeys || []).map((k) => {
        const kOverlay = specOverlay[k.id] || specOverlay[k.name];
        const defaultOptId = kOverlay?.defaultOptionId;
        const options = (k.options || []).map((opt) => ({
          ...opt,
          isDefault: opt.isDefault ?? (defaultOptId ? opt.id === defaultOptId || opt.label === defaultOptId : false),
        }));
        return {
          ...k,
          defaultValue: k.defaultValue ?? kOverlay?.defaultValue,
          options,
        };
      });
      return {
        ...p,
        category: catObj,
        stockType: inferredType,
        stockQuantity: overlay ? overlay.stockQuantity : (p.stockQuantity ?? 0),
        reservedQuantity: overlay ? overlay.reservedQuantity : (p.reservedQuantity ?? 0),
        purchasePrice: overlay?.purchasePrice ?? p.purchasePrice,
        specificationKeys: mergedKeys,
      };
    });
  }

  subscribe(listener: () => void) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  notifyListeners() {
    this.listeners.forEach((l) => l());
  }

  // Live Sync with Supabase REST Backend API
  async fetchInitialDataFromBackend() {
    const baseUrl = getApiUrl();
    try {
      const [resCat, resProd, resCust, resOff, resProj, resServ, resProf, resCal, resInst, resDocs] = await Promise.all([
        fetch(`${baseUrl}/api/categories`).catch(() => null),
        fetch(`${baseUrl}/api/products`).catch(() => null),
        fetch(`${baseUrl}/api/customers`).catch(() => null),
        fetch(`${baseUrl}/api/offers`).catch(() => null),
        fetch(`${baseUrl}/api/projects`).catch(() => null),
        fetch(`${baseUrl}/api/service-tickets`).catch(() => null),
        fetch(`${baseUrl}/api/profiles`).catch(() => null),
        fetch(`${baseUrl}/api/calendar-events`).catch(() => null),
        fetch(`${baseUrl}/api/installed-items`).catch(() => null),
        fetch(`${baseUrl}/api/client-documents`).catch(() => null),
      ]);

      if (resCat && resCat.ok) this.categories = await resCat.json();
      if (resProd && resProd.ok) this.products = await resProd.json();
      if (resCust && resCust.ok) this.customers = await resCust.json();
      if (resOff && resOff.ok) {
        const dbOffers = await resOff.json();
        if (Array.isArray(dbOffers)) {
          this.offers = dbOffers.map((o: any) => {
            const ov = this.offerSpecsOverlay[o.offerNumber] || this.offerSpecsOverlay[o.id];
            return {
              ...o,
              taxRate: Number(o.taxRate || 0),
              discountRate: Number(o.discountRate || 0),
              discountAmount: Number(o.discountAmount || 0),
              subtotal: Number(o.subtotal || 0),
              taxAmount: Number(o.taxAmount || 0),
              totalAmount: Number(o.totalAmount || 0),
              items: (o.items || []).map((it: any, itemIdx: number) => {
                const dbSpecs =
                  it.specifications && it.specifications.length > 0
                    ? it.specifications
                    : it.offerItemSpecifications || [];
                const overlaySpecs = ov && Array.isArray(ov[itemIdx]) ? ov[itemIdx] : null;
                return {
                  ...it,
                  quantity: Number(it.quantity || 1),
                  unitPrice: Number(it.unitPrice || 0),
                  totalPrice: Number(it.totalPrice || 0),
                  specifications: overlaySpecs !== null ? overlaySpecs : dbSpecs,
                };
              }),
            };
          });
        }
      }
      if (resProj && resProj.ok) {
        const dbProjs = await resProj.json();
        if (Array.isArray(dbProjs)) {
          this.projects = dbProjs.map((pr: Project & { documents?: ClientDocument[] }) => {
            if (Array.isArray(pr.documents) && pr.documents.length > 0) {
              this.hydrateProjectAttachmentsFromDocs(pr.documents);
            }
            const { attachments: _legacyOvAtts, ...flowOv } =
              this.projectFlowOverlay[pr.id] || this.projectFlowOverlay[pr.projectNumber] || {};
            const storedAtts =
              this.projectAttachments[pr.id] ||
              this.projectAttachments[pr.projectNumber] ||
              pr.attachments ||
              [];
            if (storedAtts.length > 0) {
              this.projectAttachments[pr.id] = storedAtts;
              if (pr.projectNumber && pr.projectNumber !== pr.id && this.projectAttachments[pr.projectNumber]) {
                delete this.projectAttachments[pr.projectNumber];
              }
            }
            return {
              ...pr,
              ...flowOv,
              attachments: storedAtts,
            };
          });
        }
      }
      if (resServ && resServ.ok) this.serviceTickets = await resServ.json();
      if (resProf && resProf.ok) this.profiles = await resProf.json();
      if (resInst && resInst.ok) this.installedItems = await resInst.json();
      if (resDocs && resDocs.ok) {
        const dbDocs = await resDocs.json();
        if (Array.isArray(dbDocs)) {
          this.hydrateProjectAttachmentsFromDocs(dbDocs);
          const mergedMap = new Map<string, ClientDocument>();
          dbDocs.forEach((d: ClientDocument) => mergedMap.set(d.id, d));
          this.documents.forEach((d) => {
            if (!mergedMap.has(d.id)) {
              const dup = dbDocs.find(
                (bd: ClientDocument) =>
                  bd.title === d.title &&
                  ((bd.projectId && bd.projectId === d.projectId) || bd.customerId === d.customerId)
              );
              if (!dup) {
                mergedMap.set(d.id, d);
              }
            }
          });
          this.documents = Array.from(mergedMap.values());
          this.persistClientDocuments();
          this.projects = this.projects.map((pr) => ({
            ...pr,
            attachments: this.projectAttachments[pr.id] || pr.attachments || [],
          }));
        }
      }
      if (resCal && resCal.ok) {
        const dbEvents = await resCal.json();
        if (Array.isArray(dbEvents)) {
          this.calendarEvents = dbEvents;
          if (typeof window !== 'undefined') {
            localStorage.setItem('imfex_calendar_events', JSON.stringify(this.calendarEvents));
          }
        }
      }

      this.ensureWarehouseCatalog();
      this.isLoadedFromBackend = true;
      this.notifyListeners();
    } catch (e) {
      console.warn('Backend API sync notice:', e);
      this.ensureWarehouseCatalog();
      this.notifyListeners();
    }
  }

  async purgeCorruptedAndSyncBackend() {
    const baseUrl = getApiUrl();
    try {
      await fetch(`${baseUrl}/api/admin/clean-database`, { method: 'POST' }).catch(() => null);
      await this.fetchInitialDataFromBackend();
    } catch (e) {
      console.warn('Purge & sync notice:', e);
    }
  }

  async resetDatabaseToFreshState() {
    const baseUrl = getApiUrl();
    try {
      await fetch(`${baseUrl}/api/admin/reset-database`, { method: 'POST' }).catch(() => null);
      this.categories = [];
      this.products = [];
      this.customers = [];
      this.offers = [];
      this.projects = [];
      this.serviceTickets = [];
      this.installedItems = [];
      this.documents = [];
      this.calendarEvents = [];
      this.movements = [];
      this.stockOverlay = {};
      this.projectFlowOverlay = {};
      this.projectAttachments = {};
      if (typeof window !== 'undefined') {
        localStorage.removeItem('imfex_calendar_events');
        localStorage.removeItem('imfex_inventory_movements');
        localStorage.removeItem('imfex_stock_overlay');
        localStorage.removeItem('imfex_project_flow_overlay');
        localStorage.removeItem('imfex_project_attachments');
        localStorage.removeItem('imfex_client_documents');
      }
      await this.fetchInitialDataFromBackend();
      this.notifyListeners();
    } catch (e) {
      console.warn('Database reset notice:', e);
    }
  }

  // Pure REST API Authentication via Supabase Database
  async loginAsync(email: string, password?: string): Promise<UserProfile | null> {
    const cleanEmail = email.trim().toLowerCase();
    const cleanPassword = password ? password.trim() : '';

    if (!cleanPassword || !cleanEmail) {
      return null;
    }

    const baseUrl = getApiUrl();
    try {
      const res = await fetch(`${baseUrl}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: cleanEmail, password: cleanPassword }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.token) {
          sessionStorage.setItem('imfex_auth_token', data.token);
        }
        this.currentUser = data.user;
        sessionStorage.setItem('imfex_current_user', JSON.stringify(data.user));
        await this.fetchInitialDataFromBackend();
        this.notifyListeners();
        return data.user;
      } else {
        return null;
      }
    } catch (err) {
      console.warn('Backend API login network error:', err);
      return null;
    }
  }

  login(_email: string, _password?: string): UserProfile | null {
    return this.currentUser;
  }

  logout() {
    this.currentUser = null;
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem('imfex_auth_token');
      sessionStorage.removeItem('imfex_current_user');
    }
    this.notifyListeners();
  }

  isAuthenticated(): boolean {
    return this.currentUser !== null;
  }

  getCurrentUser(): UserProfile | null {
    return this.currentUser;
  }

  getCurrentRole(): UserRole {
    return this.currentUser?.role || 'USER';
  }

  // User Management by Super Admin
  getProfiles(): UserProfile[] {
    return [...this.profiles];
  }

  createUserProfile(fullName: string, email: string, role: UserRole, tempPassword?: string): UserProfile {
    const newUser: UserProfile = {
      id: `usr-${Date.now()}`,
      email: email.trim().toLowerCase(),
      fullName: fullName.trim(),
      role,
      password: tempPassword || 'IMFEX123!',
      mustChangePassword: true,
      status: 'ACTIVE',
      createdAt: new Date().toISOString(),
    };
    this.profiles.push(newUser);
    this.notifyListeners();

    const baseUrl = getApiUrl();
    fetch(`${baseUrl}/api/profiles`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newUser),
    }).catch(console.warn);
    return newUser;
  }

  updateUserProfile(profile: UserProfile): UserProfile {
    const idx = this.profiles.findIndex((p) => p.id === profile.id);
    if (idx >= 0) {
      this.profiles[idx] = profile;
      if (this.currentUser?.id === profile.id) {
        this.currentUser = profile;
      }
      this.notifyListeners();
    }
    const baseUrl = getApiUrl();
    fetch(`${baseUrl}/api/profiles/${profile.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(profile),
    }).catch(console.warn);
    return profile;
  }

  resetUserPassword(userId: string, newTempPassword?: string): string {
    const tempPass = newTempPassword || 'TempPass2026!';
    const user = this.profiles.find((p) => p.id === userId);
    if (user) {
      user.password = tempPass;
      user.mustChangePassword = true;
      this.notifyListeners();
      const baseUrl = getApiUrl();
      fetch(`${baseUrl}/api/profiles/${userId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: tempPass }),
      }).catch(console.warn);
    }
    return tempPass;
  }

  changeUserPassword(userId: string, newPassword: string): boolean {
    const user = this.profiles.find((p) => p.id === userId);
    if (user) {
      user.password = newPassword;
      user.mustChangePassword = false;
      if (this.currentUser?.id === userId) {
        this.currentUser.mustChangePassword = false;
      }
      this.notifyListeners();
      const baseUrl = getApiUrl();
      fetch(`${baseUrl}/api/profiles/${userId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: newPassword }),
      }).catch(console.warn);
      return true;
    }
    return false;
  }

  toggleUserStatus(userId: string): UserProfile | undefined {
    const user = this.profiles.find((p) => p.id === userId);
    if (user) {
      user.status = user.status === 'DISABLED' ? 'ACTIVE' : 'DISABLED';
      this.notifyListeners();
      const baseUrl = getApiUrl();
      fetch(`${baseUrl}/api/profiles/${userId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: user.status }),
      }).catch(console.warn);
    }
    return user;
  }

  deleteUserProfile(id: string) {
    this.profiles = this.profiles.filter((p) => p.id !== id);
    this.notifyListeners();
    const baseUrl = getApiUrl();
    fetch(`${baseUrl}/api/profiles/${id}`, { method: 'DELETE' }).catch(console.warn);
  }

  // Categories
  getCategories(): ProductCategory[] {
    return [...this.categories];
  }

  saveCategory(category: ProductCategory): ProductCategory {
    const idx = this.categories.findIndex((c) => c.id === category.id);
    if (idx >= 0) {
      this.categories[idx] = category;
    } else {
      this.categories.push(category);
    }
    this.notifyListeners();

    const baseUrl = getApiUrl();
    fetch(`${baseUrl}/api/categories`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(category),
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((savedCat) => {
        if (savedCat && savedCat.id) {
          const freshIdx = this.categories.findIndex((c) => c.id === category.id || c.id === savedCat.id);
          if (freshIdx >= 0) {
            this.categories[freshIdx] = savedCat;
          } else {
            this.categories.push(savedCat);
          }
          this.notifyListeners();
        }
      })
      .catch((e) => console.warn('saveCategory API notice:', e));

    return category;
  }

  deleteCategory(id: string) {
    this.categories = this.categories.filter((c) => c.id !== id);
    this.notifyListeners();
    const baseUrl = getApiUrl();
    fetch(`${baseUrl}/api/categories/${id}`, { method: 'DELETE' }).catch(console.warn);
  }

  // Products & Warehouse Inventory
  getProducts(): Product[] {
    return [...this.products];
  }

  getProductById(id: string): Product | undefined {
    return this.products.find((p) => p.id === id);
  }

  getProductByCode(code: string): Product | undefined {
    return this.products.find((p) => p.code.toUpperCase() === code.toUpperCase());
  }

  getInventoryMovements(): InventoryMovement[] {
    return [...this.movements];
  }

  addInventoryMovement(
    kind: InventoryMoveKind,
    detail: string,
    meta?: { productId?: string; projectId?: string; offerId?: string; quantity?: number }
  ): InventoryMovement {
    const move: InventoryMovement = {
      id: `mov-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      kind,
      detail,
      productId: meta?.productId,
      projectId: meta?.projectId,
      offerId: meta?.offerId,
      quantity: meta?.quantity,
      at: new Date().toLocaleTimeString('mk-MK'),
      createdAt: new Date().toISOString(),
    };
    this.movements.unshift(move);
    this.persistWarehouseState();
    this.notifyListeners();
    return move;
  }

  receiveProductStock(productId: string, qty: number = 1, customNote?: string, purchasePrice?: number): Product | undefined {
    const p = this.getProductById(productId);
    if (!p) return undefined;
    const nextStock = (p.stockQuantity ?? 0) + qty;
    p.stockQuantity = nextStock;
    if (purchasePrice !== undefined && purchasePrice > 0) {
      p.purchasePrice = purchasePrice;
    }
    this.stockOverlay[p.code] = {
      stockType: p.stockType || 'STOCK',
      stockQuantity: nextStock,
      reservedQuantity: p.reservedQuantity ?? 0,
      purchasePrice: p.purchasePrice,
    };
    this.addInventoryMovement('ПРИЕМ', customNote || `+${qty} ${p.name}`, { productId: p.id, quantity: qty });
    return p;
  }

  issueProductStock(productId: string, qty: number = 1, customNote?: string): Product | undefined {
    const p = this.getProductById(productId);
    if (!p) return undefined;
    const currentStock = p.stockQuantity ?? 0;
    if (currentStock <= 0) return p;
    const deduct = Math.min(currentStock, qty);
    const nextStock = Math.max(0, currentStock - deduct);
    p.stockQuantity = nextStock;
    this.stockOverlay[p.code] = {
      stockType: p.stockType || 'STOCK',
      stockQuantity: nextStock,
      reservedQuantity: p.reservedQuantity ?? 0,
    };
    this.addInventoryMovement('ИЗЛЕЗ', customNote || `−${deduct} ${p.name}`, { productId: p.id, quantity: deduct });
    return p;
  }

  reserveProductStock(productId: string, qty: number = 1): number {
    const p = this.getProductById(productId);
    if (!p || p.stockType === 'CUSTOM') return 0;
    const currentStock = p.stockQuantity ?? 0;
    const currentRes = p.reservedQuantity ?? 0;
    const free = Math.max(0, currentStock - currentRes);
    const toReserve = Math.min(qty, free);
    const nextRes = currentRes + toReserve;
    p.reservedQuantity = nextRes;
    this.stockOverlay[p.code] = {
      stockType: p.stockType || 'STOCK',
      stockQuantity: currentStock,
      reservedQuantity: nextRes,
    };
    this.persistWarehouseState();
    this.notifyListeners();
    return toReserve;
  }

  releaseAndIssueReservedStock(productId: string, qty: number = 1) {
    const p = this.getProductById(productId);
    if (!p || p.stockType === 'CUSTOM') return;
    const currentStock = p.stockQuantity ?? 0;
    const currentRes = p.reservedQuantity ?? 0;
    if (currentStock > 0) {
      const nextStock = Math.max(0, currentStock - qty);
      const nextRes = Math.max(0, currentRes - qty);
      p.stockQuantity = nextStock;
      p.reservedQuantity = nextRes;
      this.stockOverlay[p.code] = {
        stockType: p.stockType || 'STOCK',
        stockQuantity: nextStock,
        reservedQuantity: nextRes,
      };
      this.persistWarehouseState();
      this.notifyListeners();
    }
  }

  saveProduct(product: Product): Product {
    const idx = this.products.findIndex((p) => p.id === product.id || p.code === product.code);
    if (idx >= 0) {
      this.products[idx] = product;
    } else {
      this.products.push(product);
    }
    this.stockOverlay[product.code] = {
      stockType: product.stockType || 'STOCK',
      stockQuantity: product.stockQuantity ?? 0,
      reservedQuantity: product.reservedQuantity ?? 0,
      purchasePrice: product.purchasePrice,
    };
    const specMap: Record<string, { defaultValue?: string; defaultOptionId?: string }> = {};
    (product.specificationKeys || []).forEach((k) => {
      const defOpt = (k.options || []).find((o) => o.isDefault);
      const entry = {
        defaultValue: k.defaultValue,
        defaultOptionId: defOpt ? defOpt.label || defOpt.id : undefined,
      };
      specMap[k.id] = entry;
      specMap[k.name] = entry;
    });
    this.specDefaultsOverlay[product.code] = specMap;
    this.specDefaultsOverlay[product.id] = specMap;
    this.persistWarehouseState();
    this.notifyListeners();

    const baseUrl = getApiUrl();
    fetch(`${baseUrl}/api/products`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(product),
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((savedProd) => {
        if (savedProd && savedProd.id) {
          const overlay = this.stockOverlay[savedProd.code] || this.stockOverlay[product.code];
          const sOverlay = this.specDefaultsOverlay[savedProd.code] || this.specDefaultsOverlay[product.code] || {};
          const mergedKeys = (savedProd.specificationKeys || product.specificationKeys || []).map((k: SpecificationKey) => {
            const kOv = sOverlay[k.id] || sOverlay[k.name];
            const defOptId = kOv?.defaultOptionId;
            return {
              ...k,
              defaultValue: k.defaultValue ?? kOv?.defaultValue,
              options: (k.options || []).map((opt) => ({
                ...opt,
                isDefault: opt.isDefault ?? (defOptId ? opt.id === defOptId || opt.label === defOptId : false),
              })),
            };
          });
          const merged: Product = {
            ...product,
            ...savedProd,
            stockType: overlay?.stockType || product.stockType || 'STOCK',
            stockQuantity: overlay ? overlay.stockQuantity : (product.stockQuantity ?? 0),
            reservedQuantity: overlay ? overlay.reservedQuantity : (product.reservedQuantity ?? 0),
            specificationKeys: mergedKeys,
          };
          const freshIdx = this.products.findIndex((p) => p.id === product.id || p.code === product.code || p.id === savedProd.id);
          if (freshIdx >= 0) {
            this.products[freshIdx] = merged;
          } else {
            this.products.push(merged);
          }
          this.notifyListeners();
        }
      })
      .catch((e) => console.warn('saveProduct API notice:', e));

    return product;
  }

  deleteProduct(id: string) {
    this.products = this.products.filter((p) => p.id !== id);
    this.notifyListeners();
    const baseUrl = getApiUrl();
    fetch(`${baseUrl}/api/products/${id}`, { method: 'DELETE' }).catch(console.warn);
  }

  // Customers
  getCustomers(): Customer[] {
    return [...this.customers];
  }

  getCustomerById(id: string): Customer | undefined {
    return this.customers.find((c) => c.id === id);
  }

  saveCustomer(customer: Customer): Customer {
    const idx = this.customers.findIndex((c) => c.id === customer.id);
    if (idx >= 0) {
      this.customers[idx] = customer;
    } else {
      this.customers.push(customer);
    }
    this.notifyListeners();

    const baseUrl = getApiUrl();
    fetch(`${baseUrl}/api/customers`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(customer),
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((savedCust) => {
        if (savedCust && savedCust.id) {
          const freshIdx = this.customers.findIndex((c) => c.id === customer.id || c.id === savedCust.id);
          if (freshIdx >= 0) this.customers[freshIdx] = savedCust;
          this.notifyListeners();
        }
      })
      .catch((e) => console.warn('saveCustomer API notice:', e));

    return customer;
  }

  deleteCustomer(id: string) {
    this.customers = this.customers.filter((c) => c.id !== id);
    this.notifyListeners();
    const baseUrl = getApiUrl();
    fetch(`${baseUrl}/api/customers/${id}`, { method: 'DELETE' }).catch(console.warn);
  }

  // Offers & 4.1 Sales Workflow
  getOffers(): Offer[] {
    return this.offers.map((o) => ({
      ...o,
      taxRate: Number(o.taxRate || 0),
      discountRate: Number(o.discountRate || 0),
      discountAmount: Number(o.discountAmount || 0),
      subtotal: Number(o.subtotal || 0),
      taxAmount: Number(o.taxAmount || 0),
      totalAmount: Number(o.totalAmount || 0),
      customer: o.customer || this.getCustomerById(o.customerId),
    }));
  }

  getOfferById(id: string): Offer | undefined {
    const o = this.offers.find((off) => off.id === id);
    if (!o) return undefined;
    return {
      ...o,
      taxRate: Number(o.taxRate || 0),
      discountRate: Number(o.discountRate || 0),
      discountAmount: Number(o.discountAmount || 0),
      subtotal: Number(o.subtotal || 0),
      taxAmount: Number(o.taxAmount || 0),
      totalAmount: Number(o.totalAmount || 0),
      customer: o.customer || this.getCustomerById(o.customerId),
    };
  }

  generateOfferNumber(): string {
    const year = new Date().getFullYear();
    const count = this.offers.length + 1;
    const numStr = String(count).padStart(4, '0');
    return `OFF-${year}-${numStr}`;
  }

  saveOffer(offer: Offer): Offer {
    const idx = this.offers.findIndex((o) => o.id === offer.id);
    if (idx >= 0) {
      this.offers[idx] = offer;
    } else {
      this.offers.push(offer);
    }
    const specsByItem = (offer.items || []).map((it) => it.specifications || []);
    if (offer.offerNumber) this.offerSpecsOverlay[offer.offerNumber] = specsByItem;
    if (offer.id) this.offerSpecsOverlay[offer.id] = specsByItem;
    this.persistWarehouseState();
    this.notifyListeners();

    const baseUrl = getApiUrl();
    fetch(`${baseUrl}/api/offers`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(offer),
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((savedOffer) => {
        if (savedOffer && savedOffer.id) {
          this.offerSpecsOverlay[savedOffer.id] = specsByItem;
          if (savedOffer.offerNumber) this.offerSpecsOverlay[savedOffer.offerNumber] = specsByItem;
          this.persistWarehouseState();
          const formatted = {
            ...savedOffer,
            taxRate: Number(savedOffer.taxRate || 0),
            discountRate: Number(savedOffer.discountRate || 0),
            discountAmount: Number(savedOffer.discountAmount || 0),
            subtotal: Number(savedOffer.subtotal || 0),
            taxAmount: Number(savedOffer.taxAmount || 0),
            totalAmount: Number(savedOffer.totalAmount || 0),
            items: (savedOffer.items || []).map((it: any, itemIdx: number) => ({
              ...it,
              quantity: Number(it.quantity || 1),
              unitPrice: Number(it.unitPrice || 0),
              totalPrice: Number(it.totalPrice || 0),
              specifications:
                specsByItem[itemIdx] !== undefined
                  ? specsByItem[itemIdx]
                  : it.specifications && it.specifications.length > 0
                  ? it.specifications
                  : it.offerItemSpecifications || [],
            })),
          };
          const freshIdx = this.offers.findIndex((o) => o.id === offer.id || o.id === savedOffer.id);
          if (freshIdx >= 0) this.offers[freshIdx] = formatted;
          this.notifyListeners();
        }
      })
      .catch((e) => console.warn('saveOffer API notice:', e));

    return offer;
  }

  setOfferStatus(offerId: string, status: OfferStatus): Offer | undefined {
    const offer = this.getOfferById(offerId);
    if (!offer) return undefined;
    offer.status = status;
    this.saveOffer(offer);

    if (status === 'ACCEPTED') {
      const existingProj = this.projects.find((p) => p.offerId === offerId);
      if (!existingProj) {
        this.createProjectFromOffer(offer);
      }
    }
    return offer;
  }

  deleteOffer(id: string) {
    this.offers = this.offers.filter((o) => o.id !== id);
    this.notifyListeners();
    const baseUrl = getApiUrl();
    fetch(`${baseUrl}/api/offers/${id}`, { method: 'DELETE' }).catch(console.warn);
  }

  // Documents & Client Documentation
  private resolveDocumentWithAttachmentUrl(doc: ClientDocument): ClientDocument {
    if (doc.fileUrl && doc.fileUrl !== '#') return doc;
    if (doc.projectId) {
      const prjAtts = this.projectAttachments[doc.projectId] || [];
      const found = prjAtts.find((a) => a.id === doc.id);
      if (found?.dataUrl) {
        return { ...doc, fileUrl: found.dataUrl };
      }
    }
    for (const attList of Object.values(this.projectAttachments)) {
      const found = attList.find((a) => a.id === doc.id);
      if (found?.dataUrl) {
        return { ...doc, fileUrl: found.dataUrl };
      }
    }
    return doc;
  }

  getDocumentsByCustomer(customerId: string): ClientDocument[] {
    return this.documents
      .filter((d) => d.customerId === customerId)
      .map((d) => this.resolveDocumentWithAttachmentUrl(d));
  }

  getDocumentsByProject(projectId: string): ClientDocument[] {
    return this.documents
      .filter((d) => d.projectId === projectId)
      .map((d) => this.resolveDocumentWithAttachmentUrl(d));
  }

  saveDocument(doc: ClientDocument): ClientDocument {
    const idx = this.documents.findIndex((d) => d.id === doc.id);
    if (idx >= 0) {
      this.documents[idx] = doc;
    } else {
      this.documents.unshift(doc);
    }
    this.persistClientDocuments();
    this.notifyListeners();
    const baseUrl = getApiUrl();
    // Backend API sync (note: large data: URLs may be rejected by backend payload limits, handled via catch)
    fetch(`${baseUrl}/api/client-documents`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(doc),
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((savedDoc) => {
        if (savedDoc && savedDoc.id) {
          const mergedDoc = { ...doc, ...savedDoc, fileUrl: savedDoc.fileUrl || doc.fileUrl };
          const freshIdx = this.documents.findIndex((d) => d.id === doc.id || d.id === savedDoc.id);
          if (freshIdx >= 0) this.documents[freshIdx] = mergedDoc;
          const targetProjId = savedDoc.projectId || doc.projectId;
          if (targetProjId) {
            const keysToCheck = Array.from(new Set([targetProjId, doc.projectId].filter(Boolean) as string[]));
            let attUpdated = false;
            for (const key of keysToCheck) {
              const list = this.projectAttachments[key];
              if (Array.isArray(list)) {
                const aIdx = list.findIndex((a) => a.id === doc.id || a.id === savedDoc.id);
                if (aIdx >= 0 && list[aIdx].id !== savedDoc.id) {
                  list[aIdx] = { ...list[aIdx], id: savedDoc.id, projectId: targetProjId };
                  this.projectAttachments[key] = [...list];
                  attUpdated = true;
                }
              }
            }
            if (attUpdated) {
              this.persistProjectAttachments();
              this.projects = this.projects.map((p) =>
                p.id === targetProjId || p.id === doc.projectId
                  ? { ...p, attachments: this.projectAttachments[p.id] || p.attachments }
                  : p
              );
            }
          }
          this.persistClientDocuments();
          this.notifyListeners();
        }
      })
      .catch((e) => console.warn('saveDocument API notice:', e));
    return doc;
  }

  deleteDocument(id: string) {
    this.documents = this.documents.filter((d) => d.id !== id);
    this.persistClientDocuments();
    this.notifyListeners();
    const baseUrl = getApiUrl();
    fetch(`${baseUrl}/api/client-documents/${id}`, { method: 'DELETE' }).catch(console.warn);
  }

  // Project Global File Attachments
  getProjectAttachments(projectId: string): ProjectAttachment[] {
    const byId = this.projectAttachments[projectId];
    if (byId && byId.length > 0) return [...byId];
    const prj = this.projects.find((p) => p.id === projectId || p.projectNumber === projectId);
    if (prj) {
      const byResolvedId = this.projectAttachments[prj.id];
      if (byResolvedId && byResolvedId.length > 0) return [...byResolvedId];
      const byNum = prj.projectNumber ? this.projectAttachments[prj.projectNumber] : undefined;
      if (byNum && byNum.length > 0) return [...byNum];
      if (prj.attachments && prj.attachments.length > 0) return [...prj.attachments];
    }
    return [];
  }

  addProjectAttachment(
    projectId: string,
    attachment: ProjectAttachment
  ): { attachments: ProjectAttachment[]; persisted: boolean } {
    const prj = this.getProjectById(projectId);
    const canonicalId = prj?.id || projectId;
    const existing = this.getProjectAttachments(canonicalId);
    const nextList = [attachment, ...existing.filter((a) => a.id !== attachment.id)];

    // Store single copy under canonicalId only (do not duplicate under projectNumber or projectFlowOverlay)
    this.projectAttachments[canonicalId] = nextList;
    if (prj?.projectNumber && prj.projectNumber !== canonicalId && this.projectAttachments[prj.projectNumber]) {
      delete this.projectAttachments[prj.projectNumber];
    }

    const persisted = this.persistProjectAttachments();

    if (prj) {
      const updatedPrj: Project = {
        ...prj,
        attachments: nextList,
      };
      const idx = this.projects.findIndex((p) => p.id === prj.id);
      if (idx >= 0) {
        this.projects[idx] = updatedPrj;
      }
    }

    const custId = attachment.customerId || prj?.customerId;
    if (custId) {
      this.saveDocument({
        id: attachment.id,
        customerId: custId,
        projectId: canonicalId,
        offerId: prj?.offerId,
        title: `${attachment.name}${prj?.projectNumber ? ` (${prj.projectNumber})` : ''}`,
        fileName: attachment.name,
        fileType: attachment.category,
        fileUrl: attachment.dataUrl,
        sizeBytes: attachment.sizeBytes,
        createdAt: attachment.createdAt,
      });
    } else {
      this.notifyListeners();
    }

    return { attachments: nextList, persisted };
  }

  deleteProjectAttachment(projectId: string, attachmentId: string): ProjectAttachment[] {
    const prj = this.getProjectById(projectId);
    const canonicalId = prj?.id || projectId;
    const existing = this.getProjectAttachments(canonicalId);
    const nextList = existing.filter((a) => a.id !== attachmentId);
    this.projectAttachments[canonicalId] = nextList;
    if (prj?.projectNumber && prj.projectNumber !== canonicalId && this.projectAttachments[prj.projectNumber]) {
      delete this.projectAttachments[prj.projectNumber];
    }
    this.persistProjectAttachments();

    if (prj) {
      const updatedPrj: Project = {
        ...prj,
        attachments: nextList,
      };
      const idx = this.projects.findIndex((p) => p.id === prj.id);
      if (idx >= 0) {
        this.projects[idx] = updatedPrj;
      }
    }

    this.deleteDocument(attachmentId);
    return nextList;
  }

  // Projects & 4.2 Operational Workflow
  getProjects(): Project[] {
    return this.projects.map((p) => ({
      ...p,
      customer: p.customer || this.getCustomerById(p.customerId),
      offer: p.offer || this.getOfferById(p.offerId),
      responsibleUser: p.responsibleUser || this.profiles.find((pr) => pr.id === p.responsibleUserId),
      attachments: this.projectAttachments[p.id] || this.projectAttachments[p.projectNumber] || p.attachments || [],
    }));
  }

  getProjectById(id: string): Project | undefined {
    const p = this.projects.find((prj) => prj.id === id);
    if (!p) return undefined;
    return {
      ...p,
      customer: p.customer || this.getCustomerById(p.customerId),
      offer: p.offer || this.getOfferById(p.offerId),
      responsibleUser: p.responsibleUser || this.profiles.find((pr) => pr.id === p.responsibleUserId),
      attachments: this.projectAttachments[p.id] || this.projectAttachments[p.projectNumber] || p.attachments || [],
    };
  }

  generateProjectNumber(): string {
    const year = new Date().getFullYear();
    const count = this.projects.length + 1;
    const numStr = String(count).padStart(4, '0');
    return `PRJ-${year}-${numStr}`;
  }

  createProjectFromOffer(offer: Offer): Project {
    const cust = this.getCustomerById(offer.customerId);
    const prjNumber = this.generateProjectNumber();

    // Reserve stock items included in the offer or linked accessories
    const reservedAccIds: string[] = [];
    const missingNames: string[] = [];

    (offer.items || []).forEach((it) => {
      if (it.productId) {
        const prod = this.getProductById(it.productId);
        if (prod && prod.stockType !== 'CUSTOM') {
          const resCount = this.reserveProductStock(prod.id, it.quantity || 1);
          if (resCount > 0) {
            reservedAccIds.push(prod.id);
          } else {
            missingNames.push(prod.name);
          }
        }
      }
      if (it.selectedAccessories) {
        Object.values(it.selectedAccessories).forEach((accId) => {
          if (accId) {
            const accProd = this.getProductById(accId);
            if (accProd) {
              const resCount = this.reserveProductStock(accProd.id, 1);
              if (resCount > 0) {
                reservedAccIds.push(accProd.id);
              } else {
                missingNames.push(accProd.name);
              }
            }
          }
        });
      }
    });

    this.addInventoryMovement(
      'РЕЗЕРВАЦИЈА',
      `Прифатена финална понуда ${offer.offerNumber} (${prjNumber}) — резервирани достапни додатоци`,
      { offerId: offer.id }
    );

    const newProject: Project = {
      id: `proj-${Date.now()}`,
      projectNumber: prjNumber,
      offerId: offer.id,
      offer,
      customerId: offer.customerId,
      customer: cust,
      responsibleUserId: this.currentUser?.id || 'usr-admin-1',
      responsibleUser: this.currentUser || undefined,
      status: 'PLANNED',
      startDate: new Date().toISOString().split('T')[0],
      targetDeliveryDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      procurementStatus: 'NOT_STARTED',
      procurementNotes: `Генерирано од прифатена понуда ${offer.offerNumber}. Ставки: ${offer.items?.map((i) => i.customTitle).join(', ') || ''}${missingNames.length ? ` | За набавка: ${missingNames.join(', ')}` : ''}`,
      installationAddress: cust?.address ? `${cust.address}, ${cust.city || ''}` : '',
      installationContact: `${cust?.name || ''} (${cust?.phone || ''})`,
      acceptedAt: new Date().toISOString(),
      advancePaid: false,
      supplierOrdered: false,
      warehouseReceived: false,
      dispatchIssued: false,
      reservedAccessoryIds: reservedAccIds,
      missingAccessoryNames: missingNames,
      createdAt: new Date().toISOString(),
    };
    this.projectFlowOverlay[newProject.id] = {
      acceptedAt: newProject.acceptedAt,
      advancePaid: false,
      supplierOrdered: false,
      warehouseReceived: false,
      dispatchIssued: false,
      reservedAccessoryIds: reservedAccIds,
      missingAccessoryNames: missingNames,
    };
    this.projectFlowOverlay[newProject.projectNumber] = this.projectFlowOverlay[newProject.id];
    this.persistWarehouseState();
    this.projects.push(newProject);
    this.notifyListeners();

    const baseUrl = getApiUrl();
    fetch(`${baseUrl}/api/projects`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newProject),
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((savedProj) => {
        if (savedProj && savedProj.id) {
          const overlay = this.projectFlowOverlay[newProject.id] || this.projectFlowOverlay[newProject.projectNumber] || {};
          const merged = { ...newProject, ...savedProj, ...overlay };
          this.projectFlowOverlay[savedProj.id] = overlay;
          this.persistWarehouseState();
          const freshIdx = this.projects.findIndex((p) => p.id === newProject.id || p.projectNumber === newProject.projectNumber || p.id === savedProj.id);
          if (freshIdx >= 0) this.projects[freshIdx] = merged;
          this.notifyListeners();
        }
      })
      .catch(console.warn);
    return newProject;
  }

  // 5-Step Project / Order / Warehouse Flow Actions
  projectStepRecordAdvance(projectId: string): Project | undefined {
    const prj = this.getProjectById(projectId);
    if (!prj || prj.advancePaid) return prj;
    const updated: Project = {
      ...prj,
      advancePaid: true,
      advancePaidAt: new Date().toISOString(),
      procurementNotes: `${prj.procurementNotes || ''}\n[УПЛАТА] Евидентиран аванс 70% (${new Date().toLocaleDateString('mk-MK')})`.trim(),
    };
    this.addInventoryMovement('УПЛАТА', `Евидентиран аванс 70% за проект ${prj.projectNumber}`, { projectId: prj.id });
    return this.saveProject(updated);
  }

  projectStepOrderSupplier(projectId: string, itemLabel?: string): Project | undefined {
    const prj = this.getProjectById(projectId);
    if (!prj || prj.supplierOrdered) return prj;
    const title = itemLabel || prj.offer?.items?.[0]?.customTitle || 'врата по нарачка';
    const updated: Project = {
      ...prj,
      status: 'PROCUREMENT',
      procurementStatus: 'ORDERED',
      supplierOrdered: true,
      supplierOrderedAt: new Date().toISOString(),
      procurementNotes: `${prj.procurementNotes || ''}\n[НАБАВКА] Нарачано кај добавувач: ${title}`.trim(),
    };
    this.addInventoryMovement('НАБАВКА', `Нарачана ${title} за ${prj.projectNumber}`, { projectId: prj.id });
    return this.saveProject(updated);
  }

  projectStepReceiveWarehouse(projectId: string, itemLabel?: string): Project | undefined {
    const prj = this.getProjectById(projectId);
    if (!prj || prj.warehouseReceived) return prj;
    const title = itemLabel || prj.offer?.items?.[0]?.customTitle || 'сегментна врата';
    const today = new Date().toISOString().split('T')[0];
    const updated: Project = {
      ...prj,
      status: 'INSTALLATION',
      procurementStatus: 'DELIVERED',
      actualDeliveryDate: today,
      warehouseReceived: true,
      warehouseReceivedAt: new Date().toISOString(),
      procurementNotes: `${prj.procurementNotes || ''}\n[ПРИЕМ] Примена во магацин и резервирана за ${prj.projectNumber}`.trim(),
    };
    this.addInventoryMovement('ПРИЕМ', `Примена 1 ${title}, резервирана за ${prj.projectNumber}`, { projectId: prj.id });
    return this.saveProject(updated);
  }

  projectStepIssueDispatch(projectId: string, accessoryProductIds?: string[]): Project | undefined {
    const prj = this.getProjectById(projectId);
    if (!prj || prj.dispatchIssued) return prj;
    const idsToIssue = accessoryProductIds || prj.reservedAccessoryIds || [];
    idsToIssue.forEach((id) => {
      this.releaseAndIssueReservedStock(id, 1);
    });
    const updated: Project = {
      ...prj,
      status: 'COMPLETED',
      dispatchIssued: true,
      dispatchIssuedAt: new Date().toISOString(),
      procurementNotes: `${prj.procurementNotes || ''}\n[ИЗЛЕЗ] Издадена испратница за ${prj.projectNumber}: врата + резервирани додатоци`.trim(),
    };
    this.addInventoryMovement(
      'ИЗЛЕЗ',
      `Испратница ${prj.projectNumber}: врата + достапни резервирани додатоци`,
      { projectId: prj.id }
    );
    return this.saveProject(updated);
  }

  saveProject(project: Project): Project {
    const resolvedAttachments =
      project.attachments ??
      this.projectAttachments[project.id] ??
      (project.projectNumber ? this.projectAttachments[project.projectNumber] : undefined) ??
      [];
    this.projectAttachments[project.id] = resolvedAttachments;
    if (project.projectNumber && project.projectNumber !== project.id && this.projectAttachments[project.projectNumber]) {
      delete this.projectAttachments[project.projectNumber];
    }
    this.persistProjectAttachments();

    const flowMeta: Partial<Project> = {
      acceptedAt: project.acceptedAt,
      advancePaid: project.advancePaid,
      advancePaidAt: project.advancePaidAt,
      supplierOrdered: project.supplierOrdered,
      supplierOrderedAt: project.supplierOrderedAt,
      warehouseReceived: project.warehouseReceived,
      warehouseReceivedAt: project.warehouseReceivedAt,
      dispatchIssued: project.dispatchIssued,
      dispatchIssuedAt: project.dispatchIssuedAt,
      selectedMotorId: project.selectedMotorId,
      selectedRailId: project.selectedRailId,
      reservedAccessoryIds: project.reservedAccessoryIds,
      missingAccessoryNames: project.missingAccessoryNames,
    };
    this.projectFlowOverlay[project.id] = flowMeta;
    if (project.projectNumber) {
      this.projectFlowOverlay[project.projectNumber] = flowMeta;
    }
    this.persistWarehouseState();

    const projectWithAtts: Project = {
      ...project,
      attachments: resolvedAttachments,
    };

    const idx = this.projects.findIndex((p) => p.id === project.id);
    if (idx >= 0) {
      this.projects[idx] = projectWithAtts;
    } else {
      this.projects.push(projectWithAtts);
    }
    this.notifyListeners();

    // Strip heavy base64 attachments from backend /api/projects payload
    const { attachments: _omitAttachments, ...apiProjectPayload } = projectWithAtts;
    const baseUrl = getApiUrl();
    fetch(`${baseUrl}/api/projects`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(apiProjectPayload),
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((savedProj) => {
        if (savedProj && savedProj.id) {
          const merged = { ...projectWithAtts, ...savedProj, ...flowMeta, attachments: resolvedAttachments };
          const freshIdx = this.projects.findIndex((p) => p.id === project.id || p.projectNumber === project.projectNumber || p.id === savedProj.id);
          if (freshIdx >= 0) this.projects[freshIdx] = merged;
          this.notifyListeners();
        }
      })
      .catch((e) => console.warn('saveProject API notice:', e));

    return projectWithAtts;
  }

  deleteProject(id: string) {
    this.projects = this.projects.filter((p) => p.id !== id);
    this.notifyListeners();
    const baseUrl = getApiUrl();
    fetch(`${baseUrl}/api/projects/${id}`, { method: 'DELETE' }).catch(console.warn);
  }

  // Installed Equipment Registry
  getInstalledItemsByCustomer(customerId: string): InstalledItem[] {
    return this.installedItems.filter((item) => item.customerId === customerId);
  }

  getAllInstalledItems(): InstalledItem[] {
    return [...this.installedItems];
  }

  saveInstalledItem(item: InstalledItem): InstalledItem {
    const idx = this.installedItems.findIndex((i) => i.id === item.id);
    if (idx >= 0) {
      this.installedItems[idx] = item;
    } else {
      this.installedItems.push(item);
    }
    this.notifyListeners();

    const baseUrl = getApiUrl();
    fetch(`${baseUrl}/api/installed-items`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(item),
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((savedItem) => {
        if (savedItem && savedItem.id) {
          const freshIdx = this.installedItems.findIndex((i) => i.id === item.id || i.id === savedItem.id);
          if (freshIdx >= 0) this.installedItems[freshIdx] = savedItem;
          this.notifyListeners();
        }
      })
      .catch((e) => console.warn('saveInstalledItem API notice:', e));

    return item;
  }

  deleteInstalledItem(id: string) {
    this.installedItems = this.installedItems.filter((i) => i.id !== id);
    this.notifyListeners();
    const baseUrl = getApiUrl();
    fetch(`${baseUrl}/api/installed-items/${id}`, { method: 'DELETE' }).catch(console.warn);
  }

  // Service Tickets & 4.3 Service Workflow
  getServiceTickets(): ServiceTicket[] {
    return this.serviceTickets.map((st) => ({
      ...st,
      customer: st.customer || this.getCustomerById(st.customerId),
      installedItem: st.installedItem || this.installedItems.find((i) => i.id === st.installedItemId),
      assignedTechnician: st.assignedTechnician || this.profiles.find((p) => p.id === st.assignedTechnicianId),
    }));
  }

  getServiceTicketById(id: string): ServiceTicket | undefined {
    const st = this.serviceTickets.find((t) => t.id === id);
    if (!st) return undefined;
    return {
      ...st,
      customer: st.customer || this.getCustomerById(st.customerId),
      installedItem: st.installedItem || this.installedItems.find((i) => i.id === st.installedItemId),
      assignedTechnician: st.assignedTechnician || this.profiles.find((p) => p.id === st.assignedTechnicianId),
    };
  }

  generateTicketNumber(): string {
    const year = new Date().getFullYear();
    const count = this.serviceTickets.length + 1;
    const numStr = String(count).padStart(4, '0');
    return `SRV-${year}-${numStr}`;
  }

  saveServiceTicket(ticket: ServiceTicket): ServiceTicket {
    const idx = this.serviceTickets.findIndex((t) => t.id === ticket.id);
    if (idx >= 0) {
      this.serviceTickets[idx] = ticket;
    } else {
      this.serviceTickets.push(ticket);
    }
    this.notifyListeners();

    const baseUrl = getApiUrl();
    fetch(`${baseUrl}/api/service-tickets`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(ticket),
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((savedTicket) => {
        if (savedTicket && savedTicket.id) {
          const freshIdx = this.serviceTickets.findIndex((t) => t.id === ticket.id || t.ticketNumber === ticket.ticketNumber || t.id === savedTicket.id);
          if (freshIdx >= 0) this.serviceTickets[freshIdx] = savedTicket;
          this.notifyListeners();
        }
      })
      .catch((e) => console.warn('saveServiceTicket API notice:', e));

    return ticket;
  }

  deleteServiceTicket(id: string) {
    this.serviceTickets = this.serviceTickets.filter((st) => st.id !== id);
    this.notifyListeners();
    const baseUrl = getApiUrl();
    fetch(`${baseUrl}/api/service-tickets/${id}`, { method: 'DELETE' }).catch(console.warn);
  }

  // Calendar Events Management
  getCalendarEvents(): CalendarEvent[] {
    const customEvents = [...this.calendarEvents];

    // Project Events (Generated from Projects startDate, installationDate, and targetDeliveryDate)
    const projectEvents: CalendarEvent[] = [];
    this.projects.forEach((p) => {
      const cust = p.customer || this.getCustomerById(p.customerId);
      const clientName = cust?.companyName || cust?.name || 'N/A';

      // 1. Project Start Event (appears on project start date)
      const startDateStr = p.startDate ? (typeof p.startDate === 'string' ? p.startDate.split('T')[0] : new Date(p.startDate).toISOString().split('T')[0]) : null;
      if (startDateStr) {
        projectEvents.push({
          id: `proj-start-${p.id}`,
          title: `Project Start: ${p.projectNumber}`,
          description: `Status: ${p.status} | Client: ${clientName}`,
          startDate: startDateStr,
          allDay: true,
          eventType: 'PROJECT',
          customerId: p.customerId,
          customer: cust,
          projectId: p.id,
          location: p.installationAddress,
          color: p.status === 'COMPLETED' ? 'emerald' : p.status === 'INSTALLATION' ? 'amber' : 'blue',
          createdAt: p.createdAt,
        });
      }

      // 2. Installation Event (if installation date is set and different from start date)
      const installDateStr = p.installationDate ? (typeof p.installationDate === 'string' ? p.installationDate.split('T')[0] : new Date(p.installationDate).toISOString().split('T')[0]) : null;
      if (installDateStr && installDateStr !== startDateStr) {
        projectEvents.push({
          id: `proj-install-${p.id}`,
          title: `Installation: ${p.projectNumber}`,
          description: `Status: ${p.status} | Contact: ${p.installationContact || clientName}`,
          startDate: installDateStr,
          allDay: true,
          eventType: 'INSTALLATION',
          customerId: p.customerId,
          customer: cust,
          projectId: p.id,
          location: p.installationAddress,
          color: 'amber',
          createdAt: p.createdAt,
        });
      }

      // 3. Target Delivery Event (if target delivery date is set and different from start/installation date)
      const deliveryDateStr = p.targetDeliveryDate ? (typeof p.targetDeliveryDate === 'string' ? p.targetDeliveryDate.split('T')[0] : new Date(p.targetDeliveryDate).toISOString().split('T')[0]) : null;
      if (deliveryDateStr && deliveryDateStr !== startDateStr && deliveryDateStr !== installDateStr) {
        projectEvents.push({
          id: `proj-delivery-${p.id}`,
          title: `Target Delivery: ${p.projectNumber}`,
          description: `Status: ${p.status} | Client: ${clientName}`,
          startDate: deliveryDateStr,
          allDay: true,
          eventType: 'PROJECT',
          customerId: p.customerId,
          customer: cust,
          projectId: p.id,
          location: p.installationAddress,
          color: p.status === 'COMPLETED' ? 'emerald' : 'purple',
          createdAt: p.createdAt,
        });
      }

      // Fallback: If project has no start/install/delivery dates, show on createdAt date
      if (!startDateStr && !installDateStr && !deliveryDateStr && p.createdAt) {
        const createdDateStr = p.createdAt.split('T')[0];
        projectEvents.push({
          id: `proj-created-${p.id}`,
          title: `Project: ${p.projectNumber}`,
          description: `Status: ${p.status} | Client: ${clientName}`,
          startDate: createdDateStr,
          allDay: true,
          eventType: 'PROJECT',
          customerId: p.customerId,
          customer: cust,
          projectId: p.id,
          location: p.installationAddress,
          color: 'blue',
          createdAt: p.createdAt,
        });
      }
    });

    // Service Ticket Events (Generated from Service Tickets scheduledDate)
    const serviceEvents: CalendarEvent[] = this.serviceTickets
      .filter((s) => s.scheduledDate)
      .map((s) => {
        const cust = s.customer || this.getCustomerById(s.customerId);
        return {
          id: `serv-event-${s.id}`,
          title: `Service: ${s.ticketNumber} (${s.priority})`,
          description: `Defect: ${s.defectDescription} | Tech: ${s.assignedTechnician?.fullName || 'Unassigned'}`,
          startDate: s.scheduledDate!,
          allDay: !s.scheduledDate?.includes('T'),
          eventType: 'SERVICE',
          customerId: s.customerId,
          customer: cust,
          serviceTicketId: s.id,
          color: s.priority === 'URGENT' || s.priority === 'HIGH' ? 'red' : 'purple',
          createdAt: s.createdAt,
        };
      });

    return [...customEvents, ...projectEvents, ...serviceEvents];
  }

  saveCalendarEvent(event: CalendarEvent): CalendarEvent {
    const idx = this.calendarEvents.findIndex((e) => e.id === event.id);
    if (idx >= 0) {
      this.calendarEvents[idx] = event;
    } else {
      this.calendarEvents.push(event);
    }
    if (typeof window !== 'undefined') {
      localStorage.setItem('imfex_calendar_events', JSON.stringify(this.calendarEvents));
    }
    this.notifyListeners();

    const baseUrl = getApiUrl();
    fetch(`${baseUrl}/api/calendar-events`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(event),
    }).catch(console.warn);

    return event;
  }

  deleteCalendarEvent(id: string) {
    this.calendarEvents = this.calendarEvents.filter((e) => e.id !== id);
    if (typeof window !== 'undefined') {
      localStorage.setItem('imfex_calendar_events', JSON.stringify(this.calendarEvents));
    }
    this.notifyListeners();

    const baseUrl = getApiUrl();
    fetch(`${baseUrl}/api/calendar-events/${id}`, {
      method: 'DELETE',
    }).catch(console.warn);
  }

  // ==========================================================================
  // ФИНАНСИИ И НАБАВКИ (Purchase Invoices, Sales Invoices, Dispatch, Payments)
  // ==========================================================================

  // 1. Purchase Invoices (Влезни фактури: Стока за залиха + Трошоци)
  getPurchaseInvoices(): PurchaseInvoice[] {
    return [...this.purchaseInvoices].sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
  }

  getPurchaseInvoiceById(id: string): PurchaseInvoice | undefined {
    return this.purchaseInvoices.find((inv) => inv.id === id);
  }

  generatePurchaseNumber(): string {
    const year = new Date().getFullYear();
    const count = this.purchaseInvoices.length + 1;
    return `NAB-${year}-${String(count).padStart(4, '0')}`;
  }

  savePurchaseInvoice(inv: PurchaseInvoice): PurchaseInvoice {
    const idx = this.purchaseInvoices.findIndex((p) => p.id === inv.id);
    if (idx >= 0) {
      this.purchaseInvoices[idx] = inv;
    } else {
      this.purchaseInvoices.unshift(inv);
    }
    this.persistWarehouseState();
    this.notifyListeners();
    return inv;
  }

  deletePurchaseInvoice(id: string) {
    this.purchaseInvoices = this.purchaseInvoices.filter((p) => p.id !== id);
    this.persistWarehouseState();
    this.notifyListeners();
  }

  receivePurchaseInvoiceToWarehouse(invoiceId: string): PurchaseInvoice | undefined {
    const inv = this.getPurchaseInvoiceById(invoiceId);
    if (!inv) return undefined;

    let anyReceived = false;
    const updatedItems: PurchaseInvoiceItem[] = inv.items.map((item) => {
      if (item.itemType === 'STOCK' && !item.receivedInWarehouse) {
        anyReceived = true;
        if (item.productId) {
          const prod = this.getProductById(item.productId);
          if (prod) {
            const nextStock = (prod.stockQuantity ?? 0) + Number(item.quantity || 1);
            prod.stockQuantity = nextStock;
            if (item.unitCost > 0) {
              prod.purchasePrice = Number(item.unitCost);
            }
            const targetProjectId = item.projectId || inv.projectId;
            let nextRes = prod.reservedQuantity ?? 0;
            if (targetProjectId) {
              nextRes += Number(item.quantity || 1);
              prod.reservedQuantity = nextRes;
            }
            this.stockOverlay[prod.code] = {
              stockType: prod.stockType || 'STOCK',
              stockQuantity: nextStock,
              reservedQuantity: nextRes,
              purchasePrice: prod.purchasePrice,
            };
            this.addInventoryMovement(
              'ПРИЕМ',
              `Примено по влезна фактура ${inv.supplierInvoiceNumber || inv.internalNumber} од ${inv.supplierName}: +${item.quantity} ${prod.name} (Набавна: €${Number(item.unitCost).toFixed(2)})`,
              {
                productId: prod.id,
                projectId: targetProjectId,
                quantity: item.quantity,
              }
            );
          }
        } else {
          this.addInventoryMovement(
            'ПРИЕМ',
            `Примено по влезна фактура ${inv.supplierInvoiceNumber || inv.internalNumber}: +${item.quantity} ${item.title}`,
            { projectId: item.projectId || inv.projectId, quantity: item.quantity }
          );
        }
        return {
          ...item,
          receivedInWarehouse: true,
          receivedAt: new Date().toISOString(),
        };
      }
      return item;
    });

    // If linked to a project, also mark warehouseReceived on that project
    if (inv.projectId && anyReceived) {
      const prj = this.getProjectById(inv.projectId);
      if (prj && !prj.warehouseReceived) {
        this.saveProject({
          ...prj,
          status: prj.status === 'PROCUREMENT' || prj.status === 'PLANNED' ? 'INSTALLATION' : prj.status,
          procurementStatus: 'DELIVERED',
          warehouseReceived: true,
          warehouseReceivedAt: new Date().toISOString(),
          actualDeliveryDate: new Date().toISOString().split('T')[0],
          procurementNotes: `${prj.procurementNotes || ''}\n[ПРИЕМ] Примена стока по фактура ${inv.supplierInvoiceNumber || inv.internalNumber} од ${inv.supplierName}`.trim(),
        });
      }
    }

    const updatedInv: PurchaseInvoice = {
      ...inv,
      items: updatedItems,
      receiptStatus: 'RECEIVED',
      status: inv.status === 'DRAFT' ? 'INVOICED' : inv.status,
    };
    return this.savePurchaseInvoice(updatedInv);
  }

  // 2. Sales Invoices (Излезни фактури: Про-фактури, Авансни фактури, Конечни фактури)
  getSalesInvoices(): SalesInvoice[] {
    return this.salesInvoices
      .map((inv) => ({
        ...inv,
        customer: inv.customer || this.getCustomerById(inv.customerId),
      }))
      .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
  }

  getSalesInvoiceById(id: string): SalesInvoice | undefined {
    const inv = this.salesInvoices.find((s) => s.id === id);
    if (!inv) return undefined;
    return {
      ...inv,
      customer: inv.customer || this.getCustomerById(inv.customerId),
    };
  }

  generateSalesInvoiceNumber(type: SalesInvoiceType): string {
    const year = new Date().getFullYear();
    const prefix = type === 'PROFORMA' ? 'PRO' : type === 'ADVANCE' ? 'AVN' : 'FAK';
    const count = this.salesInvoices.filter((s) => s.invoiceType === type).length + 1;
    return `${prefix}-${year}-${String(count).padStart(4, '0')}`;
  }

  saveSalesInvoice(inv: SalesInvoice): SalesInvoice {
    const idx = this.salesInvoices.findIndex((s) => s.id === inv.id);
    if (idx >= 0) {
      this.salesInvoices[idx] = inv;
    } else {
      this.salesInvoices.unshift(inv);
    }
    this.persistWarehouseState();
    this.notifyListeners();
    return inv;
  }

  deleteSalesInvoice(id: string) {
    this.salesInvoices = this.salesInvoices.filter((s) => s.id !== id);
    this.persistWarehouseState();
    this.notifyListeners();
  }

  createSalesInvoiceFromOfferOrProject(params: {
    invoiceType: SalesInvoiceType;
    offerId?: string;
    projectId?: string;
    customerId?: string;
    advanceAmountOverride?: number;
    externalAccountingNumber?: string;
    notes?: string;
  }): SalesInvoice {
    const project = params.projectId ? this.getProjectById(params.projectId) : undefined;
    const offer = params.offerId
      ? this.getOfferById(params.offerId)
      : project?.offerId
      ? this.getOfferById(project.offerId)
      : undefined;
    const customerId = params.customerId || project?.customerId || offer?.customerId || '';
    const customer = this.getCustomerById(customerId);
    const taxRate = offer?.taxRate ?? 18;
    const discountRate = offer?.discountRate ?? 0;

    let items: SalesInvoiceItem[] = [];
    let subtotal = 0;
    let discountAmount = 0;
    let taxAmount = 0;
    let grossTotalAmount = 0;

    if (params.invoiceType === 'ADVANCE') {
      const advGross = params.advanceAmountOverride ?? Math.round((offer?.totalAmount || 1000) * 0.7 * 100) / 100;
      const net = Math.round((advGross / (1 + taxRate / 100)) * 100) / 100;
      const vat = Math.round((advGross - net) * 100) / 100;
      subtotal = net;
      taxAmount = vat;
      grossTotalAmount = advGross;
      items = [
        {
          id: `sinv-item-${Date.now()}`,
          title: `Авансна уплата по ${project ? `Проект ${project.projectNumber}` : `Понуда ${offer?.offerNumber || ''}`}`.trim(),
          description: `Аванс за испорака и монтажа согласно понуда ${offer?.offerNumber || ''}`,
          quantity: 1,
          unitPrice: net,
          totalPrice: net,
        },
      ];
    } else if (offer && offer.items && offer.items.length > 0) {
      items = offer.items.map((it, idx) => ({
        id: `sinv-item-${Date.now()}-${idx}`,
        productId: it.productId,
        title: it.customTitle || 'Ставка од понуда',
        description: it.widthMm && it.heightMm ? `Димензии: ${it.widthMm} x ${it.heightMm} mm` : undefined,
        quantity: Number(it.quantity || 1),
        unitPrice: Number(it.unitPrice || 0),
        totalPrice: Number(it.totalPrice || 0),
      }));
      subtotal = Number(offer.subtotal || items.reduce((s, i) => s + i.totalPrice, 0));
      discountAmount = Number(offer.discountAmount || 0);
      taxAmount = Number(offer.taxAmount || 0);
      grossTotalAmount = Number(offer.totalAmount || subtotal - discountAmount + taxAmount);
    }

    // Check if there is an existing ADVANCE invoice for this project/offer when creating a FINAL invoice
    let linkedAdvanceInvoiceId: string | undefined;
    let linkedAdvanceInvoiceNumber: string | undefined;
    let advanceDeductedAmount = 0;

    if (params.invoiceType === 'FINAL') {
      const priorAdvances = this.salesInvoices.filter(
        (s) =>
          s.invoiceType === 'ADVANCE' &&
          s.status !== 'CANCELLED' &&
          ((project && s.projectId === project.id) || (offer && s.offerId === offer.id))
      );
      if (priorAdvances.length > 0) {
        linkedAdvanceInvoiceId = priorAdvances[0].id;
        linkedAdvanceInvoiceNumber = priorAdvances.map((a) => a.invoiceNumber).join(', ');
        advanceDeductedAmount = priorAdvances.reduce((sum, a) => sum + Number(a.totalAmount || 0), 0);
      } else {
        // Also check direct advance payments if no formal advance invoice was generated
        const advPayments = this.payments.filter(
          (p) =>
            p.direction === 'IN' &&
            p.isAdvance &&
            ((project && p.projectId === project.id) || (offer && p.offerId === offer.id))
        );
        if (advPayments.length > 0) {
          advanceDeductedAmount = advPayments.reduce((sum, p) => sum + Number(p.amount || 0), 0);
          linkedAdvanceInvoiceNumber = advPayments.map((p) => p.paymentNumber).join(', ');
        }
      }
    }

    const totalAmount = Math.max(0, Math.round((grossTotalAmount - advanceDeductedAmount) * 100) / 100);
    const invoiceNumber = this.generateSalesInvoiceNumber(params.invoiceType);

    const newInvoice: SalesInvoice = {
      id: `sinv-${Date.now()}`,
      invoiceNumber,
      externalAccountingNumber: params.externalAccountingNumber,
      invoiceType: params.invoiceType,
      status: params.invoiceType === 'ADVANCE' ? 'PAID' : 'ISSUED',
      customerId,
      customer,
      offerId: offer?.id,
      projectId: project?.id,
      issueDate: new Date().toISOString().split('T')[0],
      dueDate: new Date(Date.now() + 8 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      taxRate,
      discountRate,
      discountAmount,
      subtotal,
      taxAmount,
      grossTotalAmount,
      linkedAdvanceInvoiceId,
      linkedAdvanceInvoiceNumber,
      advanceDeductedAmount,
      totalAmount,
      paidAmount: params.invoiceType === 'ADVANCE' ? totalAmount : 0,
      notes: params.notes,
      items,
      createdAt: new Date().toISOString(),
    };

    return this.saveSalesInvoice(newInvoice);
  }

  // 3. Dispatch Notes (Испратници — физички излез од залиха)
  getDispatchNotes(): DispatchNote[] {
    return this.dispatchNotes
      .map((d) => ({
        ...d,
        customer: d.customer || this.getCustomerById(d.customerId),
      }))
      .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
  }

  getDispatchNoteById(id: string): DispatchNote | undefined {
    const d = this.dispatchNotes.find((n) => n.id === id);
    if (!d) return undefined;
    return {
      ...d,
      customer: d.customer || this.getCustomerById(d.customerId),
    };
  }

  generateDispatchNumber(): string {
    const year = new Date().getFullYear();
    const count = this.dispatchNotes.length + 1;
    return `ISP-${year}-${String(count).padStart(4, '0')}`;
  }

  saveDispatchNote(note: DispatchNote): DispatchNote {
    const idx = this.dispatchNotes.findIndex((n) => n.id === note.id);
    if (idx >= 0) {
      this.dispatchNotes[idx] = note;
    } else {
      this.dispatchNotes.unshift(note);
    }
    this.persistWarehouseState();
    this.notifyListeners();
    return note;
  }

  deleteDispatchNote(id: string) {
    this.dispatchNotes = this.dispatchNotes.filter((n) => n.id !== id);
    this.persistWarehouseState();
    this.notifyListeners();
  }

  confirmAndIssueDispatchNote(dispatchId: string): DispatchNote | undefined {
    const note = this.getDispatchNoteById(dispatchId);
    if (!note) return undefined;

    if (!note.stockDeducted) {
      note.items.forEach((it) => {
        if (it.productId) {
          const prod = this.getProductById(it.productId);
          if (prod) {
            const currentStock = prod.stockQuantity ?? 0;
            const currentRes = prod.reservedQuantity ?? 0;
            const qty = Number(it.quantity || 1);
            const nextStock = Math.max(0, currentStock - qty);
            const nextRes = Math.max(0, currentRes - qty);
            prod.stockQuantity = nextStock;
            prod.reservedQuantity = nextRes;
            this.stockOverlay[prod.code] = {
              stockType: prod.stockType || 'STOCK',
              stockQuantity: nextStock,
              reservedQuantity: nextRes,
              purchasePrice: prod.purchasePrice,
            };
            this.addInventoryMovement(
              'ИЗЛЕЗ',
              `Испратница ${note.dispatchNumber}: −${qty} ${prod.name} (${note.customer?.companyName || note.customer?.name || 'Клиент'})`,
              {
                productId: prod.id,
                projectId: note.projectId,
                offerId: note.offerId,
                quantity: qty,
              }
            );
          }
        } else {
          this.addInventoryMovement(
            'ИЗЛЕЗ',
            `Испратница ${note.dispatchNumber}: −${it.quantity} ${it.title}`,
            { projectId: note.projectId, offerId: note.offerId, quantity: it.quantity }
          );
        }

        // Register in customer's Installed Equipment history
        if (note.customerId) {
          this.saveInstalledItem({
            id: `inst-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
            customerId: note.customerId,
            projectId: note.projectId,
            productId: it.productId,
            title: it.title,
            serialNumber: it.serialNumber || note.dispatchNumber,
            installationDate: note.issueDate || new Date().toISOString().split('T')[0],
          });
        }
      });
    }

    const updatedNote: DispatchNote = {
      ...note,
      status: 'ISSUED',
      stockDeducted: true,
    };
    this.saveDispatchNote(updatedNote);

    if (note.projectId) {
      const prj = this.getProjectById(note.projectId);
      if (prj && !prj.dispatchIssued) {
        this.saveProject({
          ...prj,
          status: 'COMPLETED',
          dispatchIssued: true,
          dispatchIssuedAt: new Date().toISOString(),
          procurementNotes: `${prj.procurementNotes || ''}\n[ИЗЛЕЗ] Издадена испратница ${note.dispatchNumber} — залихата е раздолжена`.trim(),
        });
      }
    }

    return updatedNote;
  }

  // 4. Payments (Уплати од клиенти и Исплати кон добавувачи/трошоци)
  getPayments(): PaymentRecord[] {
    return [...this.payments].sort((a, b) => (b.date || b.createdAt || '').localeCompare(a.date || a.createdAt || ''));
  }

  generatePaymentNumber(): string {
    const year = new Date().getFullYear();
    const count = this.payments.length + 1;
    return `UPL-${year}-${String(count).padStart(4, '0')}`;
  }

  recordPayment(payment: Omit<PaymentRecord, 'id' | 'paymentNumber' | 'createdAt'>): PaymentRecord {
    const record: PaymentRecord = {
      ...payment,
      id: `pay-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      paymentNumber: this.generatePaymentNumber(),
      createdAt: new Date().toISOString(),
    };
    this.payments.unshift(record);

    if (record.salesInvoiceId) {
      const sinv = this.getSalesInvoiceById(record.salesInvoiceId);
      if (sinv) {
        const nextPaid = Number(sinv.paidAmount || 0) + Number(record.amount || 0);
        sinv.paidAmount = nextPaid;
        sinv.status = nextPaid >= Number(sinv.totalAmount || 0) ? 'PAID' : 'PARTIAL_PAID';
        this.saveSalesInvoice(sinv);
      }
    }

    if (record.purchaseInvoiceId) {
      const pinv = this.getPurchaseInvoiceById(record.purchaseInvoiceId);
      if (pinv) {
        const nextPaid = Number(pinv.paidAmount || 0) + Number(record.amount || 0);
        pinv.paidAmount = nextPaid;
        pinv.status = nextPaid >= Number(pinv.totalAmount || 0) ? 'PAID' : 'PARTIAL_PAID';
        this.savePurchaseInvoice(pinv);
      }
    }

    this.persistWarehouseState();
    this.notifyListeners();
    return record;
  }

  deletePayment(id: string) {
    this.payments = this.payments.filter((p) => p.id !== id);
    this.persistWarehouseState();
    this.notifyListeners();
  }

  // 5. Interactive Advance Payment Flow ("Евидентирај уплата на аванс" со избор)
  executeAdvancePaymentFlow(params: {
    projectId?: string;
    offerId?: string;
    customerId: string;
    amount: number;
    date: string;
    method: PaymentMethod;
    bankAccount?: string;
    createAdvanceInvoice: boolean;
    nextAction: 'PROCUREMENT_AND_DRAFT' | 'CUSTOM_STATUS' | 'ONLY_RECORD';
    customProjectStatus?: ProjectStatus;
    preferredSupplierId?: string;
    preferredSupplierName?: string;
    notes?: string;
  }): {
    project?: Project;
    advanceInvoice?: SalesInvoice;
    payment: PaymentRecord;
    draftPurchase?: PurchaseInvoice;
  } {
    let project = params.projectId ? this.getProjectById(params.projectId) : undefined;
    const offer = params.offerId
      ? this.getOfferById(params.offerId)
      : project?.offerId
      ? this.getOfferById(project.offerId)
      : undefined;

    if (!project && offer) {
      // Ensure offer is marked ACCEPTED and project is created
      if (offer.status !== 'ACCEPTED') {
        this.setOfferStatus(offer.id, 'ACCEPTED');
      }
      project = this.projects.find((p) => p.offerId === offer.id) || this.createProjectFromOffer(offer);
    }

    const cust = this.getCustomerById(params.customerId || project?.customerId || offer?.customerId || '');
    let advanceInvoice: SalesInvoice | undefined;

    if (params.createAdvanceInvoice) {
      advanceInvoice = this.createSalesInvoiceFromOfferOrProject({
        invoiceType: 'ADVANCE',
        offerId: offer?.id,
        projectId: project?.id,
        customerId: cust?.id,
        advanceAmountOverride: params.amount,
        notes: params.notes || `Авансна фактура по уплата од ${params.date}`,
      });
    }

    const payment = this.recordPayment({
      direction: 'IN',
      amount: params.amount,
      date: params.date,
      method: params.method,
      bankAccount: params.bankAccount || 'Комерцијална Банка - Денарска/Евро',
      customerId: cust?.id,
      partnerName: cust?.companyName || cust?.name || 'Клиент',
      projectId: project?.id,
      offerId: offer?.id,
      salesInvoiceId: advanceInvoice?.id,
      isAdvance: true,
      notes: params.notes || `Уплата на аванс за ${project?.projectNumber || offer?.offerNumber || ''}`,
    });

    this.addInventoryMovement(
      'УПЛАТА',
      `Евидентиран аванс €${Number(params.amount).toFixed(2)} за ${project?.projectNumber || offer?.offerNumber || ''}`,
      { projectId: project?.id, offerId: offer?.id }
    );

    let draftPurchase: PurchaseInvoice | undefined;

    if (project) {
      let nextStatus: ProjectStatus = project.status;
      let nextProcStatus = project.procurementStatus || 'NOT_STARTED';
      let supplierOrdered = Boolean(project.supplierOrdered);

      if (params.nextAction === 'PROCUREMENT_AND_DRAFT') {
        nextStatus = 'PROCUREMENT';
        nextProcStatus = 'ORDERED';
        supplierOrdered = true;

        // Build draft PurchaseInvoice items for CUSTOM products or missing stock items
        const draftItems: PurchaseInvoiceItem[] = [];
        (offer?.items || []).forEach((it, idx) => {
          const prod = it.productId ? this.getProductById(it.productId) : undefined;
          const isCustom = !prod || prod.stockType === 'CUSTOM';
          const available = prod ? (prod.stockQuantity ?? 0) - (prod.reservedQuantity ?? 0) : 0;
          const needed = Number(it.quantity || 1);

          if (isCustom || available < needed) {
            const estCost = prod?.purchasePrice || Math.round(Number(it.unitPrice || 500) * 0.62 * 100) / 100;
            draftItems.push({
              id: `pitem-${Date.now()}-${idx}`,
              itemType: 'STOCK',
              productId: prod?.id,
              productCode: prod?.code,
              title: it.customTitle || prod?.name || 'Ставка за набавка',
              projectId: project!.id,
              quantity: needed,
              unitCost: estCost,
              totalCost: Math.round(estCost * needed * 100) / 100,
              receivedInWarehouse: false,
            });
          }

          if (it.selectedAccessories) {
            Object.values(it.selectedAccessories).forEach((accId) => {
              if (!accId) return;
              const accProd = this.getProductById(accId);
              if (accProd) {
                const freeAcc = (accProd.stockQuantity ?? 0);
                if (freeAcc <= 0) {
                  const estAccCost = accProd.purchasePrice || Math.round(Number(accProd.models?.[0]?.basePrice || 120) * 0.6 * 100) / 100;
                  draftItems.push({
                    id: `pitem-acc-${Date.now()}-${accProd.id}`,
                    itemType: 'STOCK',
                    productId: accProd.id,
                    productCode: accProd.code,
                    title: accProd.name,
                    projectId: project!.id,
                    quantity: 1,
                    unitCost: estAccCost,
                    totalCost: estAccCost,
                    receivedInWarehouse: false,
                  });
                }
              }
            });
          }
        });

        if (draftItems.length === 0) {
          // Fallback: add main item from offer
          const firstIt = offer?.items?.[0];
          const prod = firstIt?.productId ? this.getProductById(firstIt.productId) : undefined;
          const estCost = prod?.purchasePrice || Math.round(Number(firstIt?.unitPrice || 600) * 0.62 * 100) / 100;
          draftItems.push({
            id: `pitem-${Date.now()}-0`,
            itemType: 'STOCK',
            productId: prod?.id,
            productCode: prod?.code,
            title: firstIt?.customTitle || prod?.name || `Набавка за ${project.projectNumber}`,
            projectId: project.id,
            quantity: Number(firstIt?.quantity || 1),
            unitCost: estCost,
            totalCost: Math.round(estCost * Number(firstIt?.quantity || 1) * 100) / 100,
            receivedInWarehouse: false,
          });
        }

        const sub = draftItems.reduce((s, i) => s + i.totalCost, 0);
        const vat = Math.round(sub * 0.18 * 100) / 100;
        const tot = Math.round((sub + vat) * 100) / 100;

        draftPurchase = this.savePurchaseInvoice({
          id: `pinv-${Date.now()}`,
          internalNumber: this.generatePurchaseNumber(),
          supplierInvoiceNumber: '',
          supplierId: params.preferredSupplierId || 'partner-doors-impex',
          supplierName: params.preferredSupplierName || 'Doors Impex (Добавувач)',
          projectId: project.id,
          offerId: offer?.id,
          issueDate: params.date,
          status: 'DRAFT',
          receiptStatus: 'PENDING',
          taxRate: 18,
          subtotal: sub,
          taxAmount: vat,
          totalAmount: tot,
          paidAmount: 0,
          notes: `Автоматски креирана нацрт-набавка по уплатен аванс за проект ${project.projectNumber}`,
          items: draftItems,
          createdAt: new Date().toISOString(),
        });

        this.addInventoryMovement(
          'НАБАВКА',
          `Креирана нацрт-набавка ${draftPurchase.internalNumber} за ${project.projectNumber}`,
          { projectId: project.id, offerId: offer?.id }
        );
      } else if (params.nextAction === 'CUSTOM_STATUS' && params.customProjectStatus) {
        nextStatus = params.customProjectStatus;
        if (nextStatus === 'PROCUREMENT') {
          nextProcStatus = 'ORDERED';
          supplierOrdered = true;
        }
      }

      project = this.saveProject({
        ...project,
        status: nextStatus,
        procurementStatus: nextProcStatus,
        advancePaid: true,
        advancePaidAt: new Date().toISOString(),
        supplierOrdered,
        supplierOrderedAt: supplierOrdered ? (project.supplierOrderedAt || new Date().toISOString()) : undefined,
        procurementNotes: `${project.procurementNotes || ''}\n[АВАНС] Уплатен аванс €${Number(params.amount).toFixed(2)} (${params.date})${draftPurchase ? ` → Нацрт-набавка ${draftPurchase.internalNumber}` : ''}`.trim(),
      });
    }

    return { project, advanceInvoice, payment, draftPurchase };
  }

  // 6. Real-time Project Profitability & Financial Balance
  getProjectFinancialSummary(projectId: string) {
    const project = this.getProjectById(projectId);
    const offer = project?.offerId ? this.getOfferById(project.offerId) : undefined;
    const agreedRevenue = Number(offer?.totalAmount || 0);

    const projectSalesInvoices = this.salesInvoices.filter(
      (s) => s.status !== 'CANCELLED' && (s.projectId === projectId || (offer && s.offerId === offer.id))
    );

    const projectPaymentsIn = this.payments.filter(
      (p) => p.direction === 'IN' && (p.projectId === projectId || (offer && p.offerId === offer.id))
    );
    const paidByCustomer = projectPaymentsIn.reduce((sum, p) => sum + Number(p.amount || 0), 0);
    const remainingToPay = Math.max(0, Math.round((agreedRevenue - paidByCustomer) * 100) / 100);

    // Purchase costs (STOCK vs EXPENSE) linked to this project
    let stockPurchaseCost = 0;
    let directExpensesCost = 0;
    const linkedPurchases: PurchaseInvoice[] = [];

    this.purchaseInvoices.forEach((pinv) => {
      let hasProjectItem = pinv.projectId === projectId;
      pinv.items.forEach((item) => {
        if (item.projectId === projectId || pinv.projectId === projectId) {
          hasProjectItem = true;
          if (item.itemType === 'STOCK') {
            stockPurchaseCost += Number(item.totalCost || 0);
          } else {
            directExpensesCost += Number(item.totalCost || 0);
          }
        }
      });
      if (hasProjectItem) {
        linkedPurchases.push(pinv);
      }
    });

    // If no purchase invoice for stock yet, estimate from product purchasePrice if available
    let estimatedStockCost = 0;
    (offer?.items || []).forEach((it) => {
      if (it.productId) {
        const prod = this.getProductById(it.productId);
        if (prod?.purchasePrice) {
          estimatedStockCost += Number(prod.purchasePrice) * Number(it.quantity || 1);
        }
      }
    });

    const effectiveStockCost = stockPurchaseCost > 0 ? stockPurchaseCost : estimatedStockCost;
    const totalCosts = Math.round((effectiveStockCost + directExpensesCost) * 100) / 100;
    const netProfit = Math.round((agreedRevenue - totalCosts) * 100) / 100;
    const marginPercent = agreedRevenue > 0 ? Math.round((netProfit / agreedRevenue) * 1000) / 10 : 0;

    return {
      agreedRevenue,
      paidByCustomer,
      remainingToPay,
      stockPurchaseCost: Math.round(effectiveStockCost * 100) / 100,
      hasActualStockInvoice: stockPurchaseCost > 0,
      directExpensesCost: Math.round(directExpensesCost * 100) / 100,
      totalCosts,
      netProfit,
      marginPercent,
      projectSalesInvoices,
      projectPaymentsIn,
      linkedPurchases,
    };
  }
}

export const imfexStore = new ImfexStore();

export function useImfexStore() {
  const [_, setTick] = useState(0);
  useEffect(() => {
    return imfexStore.subscribe(() => setTick((t) => t + 1));
  }, []);
}
