import type { UserRole } from '@/types';

/**
 * Centralized frontend RBAC helpers mirroring backend ROLE_GROUPS (`imfex-crm-backend/src/auth.ts`).
 * Used to hide unauthorized navigation items and destructive actions cleanly before hitting 403s (BIZ-15).
 */
export function isSuperAdmin(role?: UserRole | string | null): boolean {
  return role === 'SUPER_ADMIN';
}

export function canViewFinance(role?: UserRole | string | null): boolean {
  return role === 'SUPER_ADMIN' || role === 'ACCOUNTANT' || role === 'SALES';
}

export function canWriteFinance(role?: UserRole | string | null): boolean {
  return role === 'SUPER_ADMIN' || role === 'ACCOUNTANT';
}

export function canWriteSales(role?: UserRole | string | null): boolean {
  return role === 'SUPER_ADMIN' || role === 'SALES';
}

export function canWriteOperations(role?: UserRole | string | null): boolean {
  return role === 'SUPER_ADMIN' || role === 'SALES' || role === 'TECHNICIAN';
}

export function canManageCatalog(role?: UserRole | string | null): boolean {
  return role === 'SUPER_ADMIN' || role === 'SALES';
}

export function canDeleteRecords(role?: UserRole | string | null): boolean {
  return role === 'SUPER_ADMIN';
}

export function canManageSettings(role?: UserRole | string | null): boolean {
  return role === 'SUPER_ADMIN';
}
