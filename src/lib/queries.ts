'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient, ApiError } from './api-client';
import { getAuthToken } from './api';
import { queryKeys } from './query-client';
import { imfexStore } from './store';
import { toast } from '@/components/ui/toastr';
import type { CompanySettings, Customer, Offer } from '@/types';

const isAuthed = () => Boolean(getAuthToken());

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
