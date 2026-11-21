import { authFetch, getApiUrl } from './api';
import type {
  CalendarEvent,
  ClientDocument,
  CompanySettings,
  Customer,
  DispatchNote,
  InstalledItem,
  InventoryMovement,
  Offer,
  PaymentRecord,
  Product,
  ProductCategory,
  Project,
  PurchaseInvoice,
  SalesInvoice,
  ServiceTicket,
  UserProfile,
} from '@/types';

export interface AuditLogEntry {
  id: string;
  actorUserId?: string | null;
  actorEmail?: string | null;
  action: string;
  entityType?: string | null;
  entityId?: string | null;
  metadata?: Record<string, unknown> | null;
  ipAddress?: string | null;
  createdAt: string;
}

export class ApiError extends Error {
  public readonly status: number;
  public readonly payload?: unknown;

  constructor(message: string, status: number, payload?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.payload = payload;
  }
}

async function requestJson<T>(
  path: string,
  init: RequestInit = {},
  options: { authenticated?: boolean } = {}
): Promise<T> {
  const { authenticated = true } = options;
  const url = `${getApiUrl()}${path.startsWith('/') ? path : `/${path}`}`;
  const headers = new Headers(init.headers);
  if (init.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const res = authenticated
    ? await authFetch(url, { ...init, headers })
    : await fetch(url, { ...init, headers });

  if (!res.ok) {
    let payload: unknown = undefined;
    let message = `Request failed with status ${res.status}`;
    try {
      payload = await res.json();
      if (payload && typeof payload === 'object' && 'error' in payload && typeof (payload as { error: unknown }).error === 'string') {
        message = (payload as { error: string }).error;
      }
    } catch {
      // Non-JSON error body
    }
    throw new ApiError(message, res.status, payload);
  }

  if (res.status === 204) {
    return undefined as T;
  }
  return (await res.json()) as T;
}

export const apiClient = {
  auth: {
    login: (email: string, password: string) =>
      requestJson<{ token: string; user: UserProfile }>(
        '/api/auth/login',
        { method: 'POST', body: JSON.stringify({ email, password }) },
        { authenticated: false }
      ),
    me: () => requestJson<{ user: UserProfile }>('/api/auth/me'),
    changePassword: (currentPassword: string, newPassword: string) =>
      requestJson<{ success: boolean; user: UserProfile }>('/api/auth/change-password', {
        method: 'POST',
        body: JSON.stringify({ currentPassword, newPassword }),
      }),
    forgotPassword: (email: string) =>
      requestJson<{ success: boolean; message: string }>(
        '/api/auth/forgot-password',
        { method: 'POST', body: JSON.stringify({ email }) },
        { authenticated: false }
      ),
    resetPassword: (token: string, newPassword: string) =>
      requestJson<{ success: boolean; message: string }>(
        '/api/auth/reset-password',
        { method: 'POST', body: JSON.stringify({ token, newPassword }) },
        { authenticated: false }
      ),
  },

  categories: {
    list: () => requestJson<ProductCategory[]>('/api/categories'),
    save: (payload: Partial<ProductCategory>) =>
      requestJson<ProductCategory>('/api/categories', { method: 'POST', body: JSON.stringify(payload) }),
    remove: (id: string) => requestJson<{ success: boolean; id: string }>(`/api/categories/${id}`, { method: 'DELETE' }),
  },

  products: {
    list: () => requestJson<Product[]>('/api/products'),
    save: (payload: Partial<Product>) =>
      requestJson<Product>('/api/products', { method: 'POST', body: JSON.stringify(payload) }),
    remove: (id: string) => requestJson<{ success: boolean; id: string }>(`/api/products/${id}`, { method: 'DELETE' }),
  },

  customers: {
    list: () => requestJson<Customer[]>('/api/customers'),
    save: (payload: Partial<Customer>) =>
      requestJson<Customer>('/api/customers', { method: 'POST', body: JSON.stringify(payload) }),
    remove: (id: string) => requestJson<{ success: boolean; id: string }>(`/api/customers/${id}`, { method: 'DELETE' }),
  },

  offers: {
    list: () => requestJson<Offer[]>('/api/offers'),
    getById: (id: string) => requestJson<Offer>(`/api/offers/${id}`),
    save: (payload: Partial<Offer>) =>
      requestJson<Offer>('/api/offers', { method: 'POST', body: JSON.stringify(payload) }),
    remove: (id: string) => requestJson<{ success: boolean; id: string }>(`/api/offers/${id}`, { method: 'DELETE' }),
  },

  projects: {
    list: () => requestJson<Project[]>('/api/projects'),
    getById: (id: string) => requestJson<Project>(`/api/projects/${id}`),
    save: (payload: Partial<Project>) =>
      requestJson<Project>('/api/projects', { method: 'POST', body: JSON.stringify(payload) }),
    remove: (id: string) => requestJson<{ success: boolean; id: string }>(`/api/projects/${id}`, { method: 'DELETE' }),
  },

  serviceTickets: {
    list: () => requestJson<ServiceTicket[]>('/api/service-tickets'),
    getById: (id: string) => requestJson<ServiceTicket>(`/api/service-tickets/${id}`),
    save: (payload: Partial<ServiceTicket>) =>
      requestJson<ServiceTicket>('/api/service-tickets', { method: 'POST', body: JSON.stringify(payload) }),
    remove: (id: string) => requestJson<{ success: boolean; id: string }>(`/api/service-tickets/${id}`, { method: 'DELETE' }),
  },

  installedItems: {
    list: () => requestJson<InstalledItem[]>('/api/installed-items'),
    save: (payload: Partial<InstalledItem>) =>
      requestJson<InstalledItem>('/api/installed-items', { method: 'POST', body: JSON.stringify(payload) }),
    remove: (id: string) => requestJson<{ success: boolean; id: string }>(`/api/installed-items/${id}`, { method: 'DELETE' }),
  },

  documents: {
    list: () => requestJson<ClientDocument[]>('/api/client-documents'),
    getById: (id: string) => requestJson<ClientDocument>(`/api/client-documents/${id}`),
    save: (payload: Partial<ClientDocument>) =>
      requestJson<ClientDocument>('/api/client-documents', { method: 'POST', body: JSON.stringify(payload) }),
    remove: (id: string) => requestJson<{ success: boolean; id: string }>(`/api/client-documents/${id}`, { method: 'DELETE' }),
  },

  calendarEvents: {
    list: () => requestJson<CalendarEvent[]>('/api/calendar-events'),
    save: (payload: Partial<CalendarEvent>) =>
      requestJson<CalendarEvent>('/api/calendar-events', { method: 'POST', body: JSON.stringify(payload) }),
    remove: (id: string) => requestJson<{ success: boolean; id: string }>(`/api/calendar-events/${id}`, { method: 'DELETE' }),
  },

  profiles: {
    list: () => requestJson<UserProfile[]>('/api/profiles'),
    create: (payload: { email: string; fullName?: string; role?: string; password?: string }) =>
      requestJson<UserProfile>('/api/profiles', { method: 'POST', body: JSON.stringify(payload) }),
    update: (id: string, payload: Record<string, unknown>) =>
      requestJson<UserProfile>(`/api/profiles/${id}`, { method: 'PUT', body: JSON.stringify(payload) }),
    remove: (id: string) => requestJson<{ success: boolean; id: string }>(`/api/profiles/${id}`, { method: 'DELETE' }),
  },

  finance: {
    listPurchaseInvoices: () => requestJson<PurchaseInvoice[]>('/api/purchase-invoices'),
    savePurchaseInvoice: (payload: PurchaseInvoice) =>
      requestJson<PurchaseInvoice>('/api/purchase-invoices', { method: 'POST', body: JSON.stringify(payload) }),
    deletePurchaseInvoice: (id: string) =>
      requestJson<{ success: boolean; id: string }>(`/api/purchase-invoices/${id}`, { method: 'DELETE' }),

    listSalesInvoices: () => requestJson<SalesInvoice[]>('/api/sales-invoices'),
    saveSalesInvoice: (payload: SalesInvoice) =>
      requestJson<SalesInvoice>('/api/sales-invoices', { method: 'POST', body: JSON.stringify(payload) }),
    deleteSalesInvoice: (id: string) =>
      requestJson<{ success: boolean; id: string }>(`/api/sales-invoices/${id}`, { method: 'DELETE' }),

    listDispatchNotes: () => requestJson<DispatchNote[]>('/api/dispatch-notes'),
    saveDispatchNote: (payload: DispatchNote) =>
      requestJson<DispatchNote>('/api/dispatch-notes', { method: 'POST', body: JSON.stringify(payload) }),
    deleteDispatchNote: (id: string) =>
      requestJson<{ success: boolean; id: string }>(`/api/dispatch-notes/${id}`, { method: 'DELETE' }),

    listPayments: () => requestJson<PaymentRecord[]>('/api/payments'),
    savePayment: (payload: PaymentRecord) =>
      requestJson<PaymentRecord>('/api/payments', { method: 'POST', body: JSON.stringify(payload) }),
    deletePayment: (id: string) =>
      requestJson<{ success: boolean; id: string }>(`/api/payments/${id}`, { method: 'DELETE' }),

    listInventoryMovements: () => requestJson<InventoryMovement[]>('/api/inventory-movements'),
    saveInventoryMovement: (payload: InventoryMovement) =>
      requestJson<InventoryMovement>('/api/inventory-movements', { method: 'POST', body: JSON.stringify(payload) }),
  },

  companySettings: {
    get: () => requestJson<CompanySettings>('/api/company-settings'),
    update: (payload: Partial<CompanySettings>) =>
      requestJson<CompanySettings>('/api/company-settings', { method: 'PUT', body: JSON.stringify(payload) }),
  },

  auditLogs: {
    list: (limit = 50) => requestJson<AuditLogEntry[]>(`/api/audit-logs?limit=${Math.max(1, Math.min(200, limit))}`),
  },

  admin: {
    cleanDatabase: () =>
      requestJson<{ success: boolean; message: string; purgedCorruptedCount: number }>('/api/admin/clean-database', {
        method: 'POST',
        body: JSON.stringify({ confirm: 'CLEAN_DATABASE' }),
      }),
    resetDatabase: () =>
      requestJson<{ success: boolean; message: string }>('/api/admin/reset-database', {
        method: 'POST',
        body: JSON.stringify({ confirm: 'RESET_DATABASE' }),
      }),
  },

  email: {
    sendOffer: (payload: {
      to: string;
      customerName: string;
      offerNumber: string;
      totalAmount: number;
      pdfBase64?: string;
      customMessage?: string;
    }) =>
      requestJson<{ success: boolean; id?: string }>('/api/email/send-offer', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    sendInvoice: (payload: {
      to: string;
      customerName: string;
      invoiceNumber: string;
      invoiceType?: 'PROFORMA' | 'ADVANCE' | 'FINAL' | 'DISPATCH';
      totalAmount?: number;
      dueDate?: string;
      pdfBase64?: string;
      customMessage?: string;
    }) =>
      requestJson<{ success: boolean; id?: string }>('/api/email/send-invoice', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
  },
};
