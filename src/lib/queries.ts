'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient, ApiError } from './api-client';
import { getAuthToken } from './api';
import { queryKeys } from './query-client';
import { imfexStore } from './store';
import { toast } from '@/components/ui/toastr';
import type {
  CalendarEvent,
  CompanySettings,
  Customer,
  Offer,
  Project,
  ServiceTicket,
} from '@/types';

const isAuthed = () => Boolean(getAuthToken());

// =========================================================================
// COLLECTION QUERIES
// =========================================================================

export function useCustomersQuery() {
  return useQuery({
    queryKey: queryKeys.customers,
    queryFn: async () => {
      const data = await apiClient.customers.list();
      imfexStore.syncCollectionFromQuery('customers', data);
      return data;
    },
    enabled: isAuthed(),
  });
}

export function useOffersQuery() {
  return useQuery({
    queryKey: queryKeys.offers,
    queryFn: async () => {
      const data = await apiClient.offers.list();
      imfexStore.syncCollectionFromQuery('offers', data);
      return data;
    },
    enabled: isAuthed(),
  });
}

export function useOfferQuery(id?: string) {
  const qc = useQueryClient();
  return useQuery({
    queryKey: queryKeys.offer(id || ''),
    queryFn: async () => {
      const offer = await apiClient.offers.getById(id!);
      return offer;
    },
    initialData: () => {
      if (!id) return undefined;
      const list = qc.getQueryData<Offer[]>(queryKeys.offers);
      return list?.find((o) => o.id === id) || imfexStore.getOfferById(id);
    },
    enabled: Boolean(id) && isAuthed(),
  });
}

export function useProjectsQuery() {
  return useQuery({
    queryKey: queryKeys.projects,
    queryFn: async () => {
      const data = await apiClient.projects.list();
      imfexStore.syncCollectionFromQuery('projects', data);
      return data;
    },
    enabled: isAuthed(),
  });
}

export function useProjectQuery(id?: string) {
  const qc = useQueryClient();
  return useQuery({
    queryKey: queryKeys.project(id || ''),
    queryFn: async () => {
      return await apiClient.projects.getById(id!);
    },
    initialData: () => {
      if (!id) return undefined;
      const list = qc.getQueryData<Project[]>(queryKeys.projects);
      return list?.find((p) => p.id === id) || imfexStore.getProjectById(id);
    },
    enabled: Boolean(id) && isAuthed(),
  });
}

export function useProductsQuery() {
  return useQuery({
    queryKey: queryKeys.products,
    queryFn: async () => {
      const data = await apiClient.products.list();
      imfexStore.syncCollectionFromQuery('products', data);
      return data;
    },
    enabled: isAuthed(),
  });
}

export function useCategoriesQuery() {
  return useQuery({
    queryKey: queryKeys.categories,
    queryFn: async () => {
      const data = await apiClient.categories.list();
      imfexStore.syncCollectionFromQuery('categories', data);
      return data;
    },
    enabled: isAuthed(),
  });
}

export function useProfilesQuery() {
  return useQuery({
    queryKey: queryKeys.profiles,
    queryFn: async () => {
      const data = await apiClient.profiles.list();
      imfexStore.syncCollectionFromQuery('profiles', data);
      return data;
    },
    enabled: isAuthed(),
  });
}

export function useServiceTicketsQuery() {
  return useQuery({
    queryKey: queryKeys.serviceTickets,
    queryFn: async () => {
      const data = await apiClient.serviceTickets.list();
      imfexStore.syncCollectionFromQuery('serviceTickets', data);
      return data;
    },
    enabled: isAuthed(),
  });
}

export function useServiceTicketQuery(id?: string) {
  const qc = useQueryClient();
  return useQuery({
    queryKey: queryKeys.serviceTicket(id || ''),
    queryFn: async () => {
      return await apiClient.serviceTickets.getById(id!);
    },
    initialData: () => {
      if (!id) return undefined;
      const list = qc.getQueryData<ServiceTicket[]>(queryKeys.serviceTickets);
      return list?.find((t) => t.id === id) || imfexStore.getServiceTicketById(id);
    },
    enabled: Boolean(id) && isAuthed(),
  });
}

export function useInstalledItemsQuery() {
  return useQuery({
    queryKey: queryKeys.installedItems,
    queryFn: async () => {
      const data = await apiClient.installedItems.list();
      imfexStore.syncCollectionFromQuery('installedItems', data);
      return data;
    },
    enabled: isAuthed(),
  });
}

export function useClientDocumentsQuery() {
  return useQuery({
    queryKey: queryKeys.documents,
    queryFn: async () => {
      const data = await apiClient.documents.list();
      imfexStore.syncCollectionFromQuery('documents', data);
      return data;
    },
    enabled: isAuthed(),
  });
}

export function useCalendarEventsQuery() {
  return useQuery({
    queryKey: queryKeys.calendarEvents,
    queryFn: async () => {
      const data = await apiClient.calendarEvents.list();
      imfexStore.syncCollectionFromQuery('calendarEvents', data);
      return data;
    },
    enabled: isAuthed(),
  });
}

export function usePurchaseInvoicesQuery() {
  return useQuery({
    queryKey: queryKeys.purchaseInvoices,
    queryFn: async () => {
      const data = await apiClient.finance.listPurchaseInvoices();
      imfexStore.syncCollectionFromQuery('purchaseInvoices', data);
      return data;
    },
    enabled: isAuthed(),
  });
}

export function useSalesInvoicesQuery() {
  return useQuery({
    queryKey: queryKeys.salesInvoices,
    queryFn: async () => {
      const data = await apiClient.finance.listSalesInvoices();
      imfexStore.syncCollectionFromQuery('salesInvoices', data);
      return data;
    },
    enabled: isAuthed(),
  });
}

export function useDispatchNotesQuery() {
  return useQuery({
    queryKey: queryKeys.dispatchNotes,
    queryFn: async () => {
      const data = await apiClient.finance.listDispatchNotes();
      imfexStore.syncCollectionFromQuery('dispatchNotes', data);
      return data;
    },
    enabled: isAuthed(),
  });
}

export function usePaymentsQuery() {
  return useQuery({
    queryKey: queryKeys.payments,
    queryFn: async () => {
      const data = await apiClient.finance.listPayments();
      imfexStore.syncCollectionFromQuery('payments', data);
      return data;
    },
    enabled: isAuthed(),
  });
}

export function useInventoryMovementsQuery() {
  return useQuery({
    queryKey: queryKeys.inventoryMovements,
    queryFn: async () => {
      const data = await apiClient.finance.listInventoryMovements();
      imfexStore.syncCollectionFromQuery('inventoryMovements', data);
      return data;
    },
    enabled: isAuthed(),
  });
}

export function useCompanySettingsQuery() {
  return useQuery({
    queryKey: queryKeys.companySettings,
    queryFn: async () => {
      const data = await apiClient.companySettings.get();
      imfexStore.syncCollectionFromQuery('companySettings', data);
      return data;
    },
    enabled: isAuthed(),
  });
}

export function useAuditLogsQuery(enabled = true, limit = 50) {
  return useQuery({
    queryKey: queryKeys.auditLogs(limit),
    queryFn: () => apiClient.auditLogs.list(limit),
    enabled: enabled && isAuthed(),
    staleTime: 15_000,
  });
}

// =========================================================================
// MUTATIONS WITH OPTIMISTIC UPDATES & ROLLBACK
// =========================================================================

export function useSaveCustomerMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: Partial<Customer>) => apiClient.customers.save(payload),
    onMutate: async (payload) => {
      await qc.cancelQueries({ queryKey: queryKeys.customers });
      const previous = qc.getQueryData<Customer[]>(queryKeys.customers) || [];
      if (payload.id) {
        const next = previous.map((c) => (c.id === payload.id ? { ...c, ...payload } : c));
        qc.setQueryData(queryKeys.customers, next);
      }
      return { previous };
    },
    onError: (err, _vars, ctx) => {
      if (ctx?.previous) {
        qc.setQueryData(queryKeys.customers, ctx.previous);
        imfexStore.syncCollectionFromQuery('customers', ctx.previous);
      }
      toast.error('Грешка при зачувување на клиент', err instanceof ApiError ? err.message : undefined);
    },
    onSuccess: (saved) => {
      qc.setQueryData<Customer[]>(queryKeys.customers, (old = []) => {
        const exists = old.some((c) => c.id === saved.id);
        const next = exists ? old.map((c) => (c.id === saved.id ? { ...c, ...saved } : c)) : [saved, ...old];
        imfexStore.syncCollectionFromQuery('customers', next);
        return next;
      });
      void qc.invalidateQueries({ queryKey: queryKeys.customers });
    },
  });
}

export function useDeleteCustomerMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiClient.customers.remove(id),
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: queryKeys.customers });
      const previous = qc.getQueryData<Customer[]>(queryKeys.customers) || [];
      const next = previous.filter((c) => c.id !== id);
      qc.setQueryData(queryKeys.customers, next);
      imfexStore.syncCollectionFromQuery('customers', next);
      return { previous };
    },
    onError: (err, _id, ctx) => {
      if (ctx?.previous) {
        qc.setQueryData(queryKeys.customers, ctx.previous);
        imfexStore.syncCollectionFromQuery('customers', ctx.previous);
      }
      toast.error(
        'Клиентот не може да се избрише',
        err instanceof ApiError ? err.message : 'Можеби има поврзани понуди или проекти.'
      );
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.customers });
    },
  });
}

export function useDeleteOfferMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiClient.offers.remove(id),
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: queryKeys.offers });
      const previous = qc.getQueryData<Offer[]>(queryKeys.offers) || [];
      const next = previous.filter((o) => o.id !== id);
      qc.setQueryData(queryKeys.offers, next);
      imfexStore.syncCollectionFromQuery('offers', next);
      return { previous };
    },
    onError: (err, _id, ctx) => {
      if (ctx?.previous) {
        qc.setQueryData(queryKeys.offers, ctx.previous);
        imfexStore.syncCollectionFromQuery('offers', ctx.previous);
      }
      toast.error(
        'Понудата не може да се избрише',
        err instanceof ApiError ? err.message : 'Можеби е поврзана со активен проект.'
      );
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.offers });
    },
  });
}

export function useSaveProjectMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: Partial<Project>) => apiClient.projects.save(payload),
    onMutate: async (payload) => {
      await qc.cancelQueries({ queryKey: queryKeys.projects });
      const previous = qc.getQueryData<Project[]>(queryKeys.projects) || [];
      if (payload.id) {
        const next = previous.map((p) => (p.id === payload.id ? { ...p, ...payload } : p));
        qc.setQueryData(queryKeys.projects, next);
        imfexStore.syncCollectionFromQuery('projects', next);
      }
      return { previous };
    },
    onError: (err, _vars, ctx) => {
      if (ctx?.previous) {
        qc.setQueryData(queryKeys.projects, ctx.previous);
        imfexStore.syncCollectionFromQuery('projects', ctx.previous);
      }
      toast.error('Грешка при зачувување на проект', err instanceof ApiError ? err.message : undefined);
    },
    onSuccess: (saved) => {
      qc.setQueryData<Project[]>(queryKeys.projects, (old = []) => {
        const exists = old.some((p) => p.id === saved.id);
        const next = exists ? old.map((p) => (p.id === saved.id ? { ...p, ...saved } : p)) : [saved, ...old];
        imfexStore.syncCollectionFromQuery('projects', next);
        return next;
      });
      qc.setQueryData(queryKeys.project(saved.id), saved);
      void qc.invalidateQueries({ queryKey: queryKeys.projects });
      void qc.invalidateQueries({ queryKey: queryKeys.calendarEvents });
    },
  });
}

export function useSaveServiceTicketMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: Partial<ServiceTicket>) => apiClient.serviceTickets.save(payload),
    onError: (err) => {
      toast.error('Грешка при зачувување на сервисен тикет', err instanceof ApiError ? err.message : undefined);
    },
    onSuccess: (saved) => {
      qc.setQueryData<ServiceTicket[]>(queryKeys.serviceTickets, (old = []) => {
        const exists = old.some((t) => t.id === saved.id);
        const next = exists ? old.map((t) => (t.id === saved.id ? { ...t, ...saved } : t)) : [saved, ...old];
        imfexStore.syncCollectionFromQuery('serviceTickets', next);
        return next;
      });
      qc.setQueryData(queryKeys.serviceTicket(saved.id), saved);
      void qc.invalidateQueries({ queryKey: queryKeys.serviceTickets });
      void qc.invalidateQueries({ queryKey: queryKeys.calendarEvents });
    },
  });
}

export function useDeleteServiceTicketMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiClient.serviceTickets.remove(id),
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: queryKeys.serviceTickets });
      const previous = qc.getQueryData<ServiceTicket[]>(queryKeys.serviceTickets) || [];
      const next = previous.filter((t) => t.id !== id);
      qc.setQueryData(queryKeys.serviceTickets, next);
      imfexStore.syncCollectionFromQuery('serviceTickets', next);
      return { previous };
    },
    onError: (err, _id, ctx) => {
      if (ctx?.previous) {
        qc.setQueryData(queryKeys.serviceTickets, ctx.previous);
        imfexStore.syncCollectionFromQuery('serviceTickets', ctx.previous);
      }
      toast.error('Тикетот не може да се избрише', err instanceof ApiError ? err.message : undefined);
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.serviceTickets });
    },
  });
}

export function useSaveCalendarEventMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: Partial<CalendarEvent>) => apiClient.calendarEvents.save(payload),
    onError: (err) => {
      toast.error('Грешка при зачувување на настан', err instanceof ApiError ? err.message : undefined);
    },
    onSuccess: (saved) => {
      qc.setQueryData<CalendarEvent[]>(queryKeys.calendarEvents, (old = []) => {
        const exists = old.some((e) => e.id === saved.id);
        const next = exists ? old.map((e) => (e.id === saved.id ? { ...e, ...saved } : e)) : [...old, saved];
        imfexStore.syncCollectionFromQuery('calendarEvents', next);
        return next;
      });
      void qc.invalidateQueries({ queryKey: queryKeys.calendarEvents });
    },
  });
}

export function useDeleteCalendarEventMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiClient.calendarEvents.remove(id),
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: queryKeys.calendarEvents });
      const previous = qc.getQueryData<CalendarEvent[]>(queryKeys.calendarEvents) || [];
      const next = previous.filter((e) => e.id !== id);
      qc.setQueryData(queryKeys.calendarEvents, next);
      imfexStore.syncCollectionFromQuery('calendarEvents', next);
      return { previous };
    },
    onError: (err, _id, ctx) => {
      if (ctx?.previous) {
        qc.setQueryData(queryKeys.calendarEvents, ctx.previous);
        imfexStore.syncCollectionFromQuery('calendarEvents', ctx.previous);
      }
      toast.error('Настанот не може да се избрише', err instanceof ApiError ? err.message : undefined);
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.calendarEvents });
    },
  });
}

export function useUpdateCompanySettingsMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: Partial<CompanySettings>) => apiClient.companySettings.update(payload),
    onMutate: async (payload) => {
      await qc.cancelQueries({ queryKey: queryKeys.companySettings });
      const previous = qc.getQueryData<CompanySettings>(queryKeys.companySettings);
      if (previous) {
        const next = { ...previous, ...payload };
        qc.setQueryData(queryKeys.companySettings, next);
        imfexStore.syncCollectionFromQuery('companySettings', next);
      }
      return { previous };
    },
    onError: (err, _vars, ctx) => {
      if (ctx?.previous) {
        qc.setQueryData(queryKeys.companySettings, ctx.previous);
        imfexStore.syncCollectionFromQuery('companySettings', ctx.previous);
      }
      toast.error('Грешка при зачувување на податоците за компанијата', err instanceof ApiError ? err.message : undefined);
    },
    onSuccess: (saved) => {
      qc.setQueryData(queryKeys.companySettings, saved);
      imfexStore.syncCollectionFromQuery('companySettings', saved);
      void qc.invalidateQueries({ queryKey: queryKeys.companySettings });
    },
  });
}
