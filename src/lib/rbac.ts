import type { UserRole } from '@/types';

/**
 * Centralized frontend RBAC helpers mirroring backend ROLE_GROUPS (`imfex-crm-backend/src/auth.ts`).
 * Used to hide unauthorized navigation items, sensitive financial/cost fields, and write/delete actions
 * cleanly across all 5 user roles before hitting 403s.
 */

export function isSuperAdmin(role?: UserRole | string | null): boolean {
  return role === 'SUPER_ADMIN';
}

/** Can access Commercial Offers (/offers, /offers/[id], Customer Offers tab, Dashboard Recent Offers) */
export function canViewOffers(role?: UserRole | string | null): boolean {
  return role === 'SUPER_ADMIN' || role === 'SALES' || role === 'ACCOUNTANT' || role === 'USER';
}

/** Can create, edit, clone, or change status of Offers */
export function canWriteOffers(role?: UserRole | string | null): boolean {
  return role === 'SUPER_ADMIN' || role === 'SALES' || role === 'USER';
}

/** Legacy alias for commercial offer write permissions */
export function canWriteSales(role?: UserRole | string | null): boolean {
  return canWriteOffers(role);
}

/** Can create or edit Customer / Partner records */
export function canWriteCustomers(role?: UserRole | string | null): boolean {
  return role === 'SUPER_ADMIN' || role === 'SALES' || role === 'ACCOUNTANT' || role === 'USER';
}

/** Can access Finance & Procurement module, Project P&L, and Customer Financial summaries */
export function canViewFinance(role?: UserRole | string | null): boolean {
  return role === 'SUPER_ADMIN' || role === 'ACCOUNTANT' || role === 'SALES';
}

/** Can write Procurement / Supplier Invoices, Void Invoices, Send Payment Reminders, and Reorder POs */
export function canWriteFinance(role?: UserRole | string | null): boolean {
  return role === 'SUPER_ADMIN' || role === 'ACCOUNTANT';
}

/** Can issue Sales Invoices, Advances, Proformas, Dispatch Notes, Service Invoices, and Customer Payments */
export function canWriteSalesFinance(role?: UserRole | string | null): boolean {
  return role === 'SUPER_ADMIN' || role === 'ACCOUNTANT' || role === 'SALES';
}

/** Can view internal supplier purchase costs and quote/project gross margins */
export function canViewPurchaseCosts(role?: UserRole | string | null): boolean {
  return role === 'SUPER_ADMIN' || role === 'ACCOUNTANT' || role === 'SALES';
}

/** Can add/edit Products, Categories, Models, Specifications, and adjust Warehouse Stock */
export function canManageCatalog(role?: UserRole | string | null): boolean {
  return role === 'SUPER_ADMIN' || role === 'SALES';
}

/** Can perform operational mutations (Projects, Service Tickets, Calendar Events, Field Attachments/Notes) */
export function canWriteOperations(role?: UserRole | string | null): boolean {
  return role === 'SUPER_ADMIN' || role === 'SALES' || role === 'TECHNICIAN' || role === 'USER';
}

/** Can send commercial offers via email */
export function canEmailOffers(role?: UserRole | string | null): boolean {
  return role === 'SUPER_ADMIN' || role === 'SALES';
}

/** Can send invoices via email */
export function canEmailInvoices(role?: UserRole | string | null): boolean {
  return role === 'SUPER_ADMIN' || role === 'ACCOUNTANT' || role === 'SALES';
}

/** Can permanently delete CRM records */
export function canDeleteRecords(role?: UserRole | string | null): boolean {
  return role === 'SUPER_ADMIN';
}

/** Can access admin Settings tabs (Users, Company, Audit Log, Maintenance) */
export function canManageSettings(role?: UserRole | string | null): boolean {
  return role === 'SUPER_ADMIN';
}
