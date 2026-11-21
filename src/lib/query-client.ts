import { QueryClient } from '@tanstack/react-query';

export const queryKeys = {
  categories: ['categories'] as const,
  products: ['products'] as const,
  customers: ['customers'] as const,
  offers: ['offers'] as const,
  offer: (id: string) => ['offers', id] as const,
  projects: ['projects'] as const,
  project: (id: string) => ['projects', id] as const,
  serviceTickets: ['service-tickets'] as const,
  serviceTicket: (id: string) => ['service-tickets', id] as const,
  installedItems: ['installed-items'] as const,
  documents: ['client-documents'] as const,
  calendarEvents: ['calendar-events'] as const,
  profiles: ['profiles'] as const,
  purchaseInvoices: ['purchase-invoices'] as const,
  salesInvoices: ['sales-invoices'] as const,
  dispatchNotes: ['dispatch-notes'] as const,
  payments: ['payments'] as const,
  inventoryMovements: ['inventory-movements'] as const,
  companySettings: ['company-settings'] as const,
  auditLogs: (limit = 50) => ['audit-logs', limit] as const,
};

export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        gcTime: 5 * 60_000,
        retry: 1,
        refetchOnWindowFocus: false,
      },
      mutations: {
        retry: 0,
      },
    },
  });
}

// Shared singleton so both React hooks and ImfexStore stay 100% cache-synchronized
export const queryClient = createQueryClient();
