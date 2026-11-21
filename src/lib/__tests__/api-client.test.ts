import { describe, it, expect, vi, afterEach } from 'vitest';
import { apiClient, ApiError } from '../api-client';
import { createQueryClient, queryKeys } from '../query-client';

describe('Typed apiClient & TanStack Query Client (IMP-02)', () => {
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it('sends JSON requests and parses typed responses cleanly', async () => {
    const mockCustomers = [{ id: 'c-1', name: 'Test Client', customerType: 'COMPANY' }];
    globalThis.fetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify(mockCustomers), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    );

    const data = await apiClient.customers.list();
    expect(data).toHaveLength(1);
    expect(data[0].name).toBe('Test Client');
    expect(globalThis.fetch).toHaveBeenCalledTimes(1);
    const [calledUrl] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(String(calledUrl)).toMatch(/\/api\/customers$/);
  });

  it('throws typed ApiError with backend message and status on HTTP errors', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ error: 'Cannot delete customer with linked offers.' }), {
        status: 409,
        headers: { 'Content-Type': 'application/json' },
      })
    );

    await expect(apiClient.customers.remove('c-1')).rejects.toMatchObject({
      name: 'ApiError',
      status: 409,
      message: 'Cannot delete customer with linked offers.',
    });

    try {
      await apiClient.customers.remove('c-1');
    } catch (err) {
      expect(err).toBeInstanceOf(ApiError);
    }
  });

  it('posts public forgot-password without failing when unauthenticated', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ success: true, message: 'Sent' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    );

    const res = await apiClient.auth.forgotPassword('user@example.com');
    expect(res.success).toBe(true);
    const [, init] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(init.method).toBe('POST');
    expect(JSON.parse(init.body)).toEqual({ email: 'user@example.com' });
  });

  it('configures QueryClient defaults and supports cache seeding & invalidation', async () => {
    const qc = createQueryClient();
    expect(qc.getDefaultOptions().queries?.staleTime).toBe(30_000);
    expect(qc.getDefaultOptions().queries?.refetchOnWindowFocus).toBe(false);

    qc.setQueryData(queryKeys.companySettings, { companyName: 'IMFEX', defaultAdvancePercent: 50 });
    expect(qc.getQueryData(queryKeys.companySettings)).toEqual({
      companyName: 'IMFEX',
      defaultAdvancePercent: 50,
    });

    qc.clear();
    expect(qc.getQueryData(queryKeys.companySettings)).toBeUndefined();
  });

  it('fetches single-entity detail endpoints and finance/calendar collections cleanly', async () => {
    const fetchMock = vi.fn().mockImplementation((url: string) => {
      if (url.endsWith('/api/offers/off-42')) {
        return Promise.resolve(new Response(JSON.stringify({ id: 'off-42', offerNumber: 'OFF-2026-0042' }), { status: 200 }));
      }
      if (url.endsWith('/api/projects/prj-7')) {
        return Promise.resolve(new Response(JSON.stringify({ id: 'prj-7', projectNumber: 'PRJ-2026-0007' }), { status: 200 }));
      }
      if (url.endsWith('/api/service-tickets/srv-3')) {
        return Promise.resolve(new Response(JSON.stringify({ id: 'srv-3', ticketNumber: 'SRV-2026-0003' }), { status: 200 }));
      }
      return Promise.resolve(new Response(JSON.stringify([]), { status: 200 }));
    });
    globalThis.fetch = fetchMock;

    const offer = await apiClient.offers.getById('off-42');
    const project = await apiClient.projects.getById('prj-7');
    const ticket = await apiClient.serviceTickets.getById('srv-3');
    const purchases = await apiClient.finance.listPurchaseInvoices();
    const events = await apiClient.calendarEvents.list();

    expect(offer.offerNumber).toBe('OFF-2026-0042');
    expect(project.projectNumber).toBe('PRJ-2026-0007');
    expect(ticket.ticketNumber).toBe('SRV-2026-0003');
    expect(purchases).toEqual([]);
    expect(events).toEqual([]);
    expect(queryKeys.offer('off-42')).toEqual(['offers', 'off-42']);
    expect(queryKeys.project('prj-7')).toEqual(['projects', 'prj-7']);
    expect(queryKeys.serviceTicket('srv-3')).toEqual(['service-tickets', 'srv-3']);
  });
});
