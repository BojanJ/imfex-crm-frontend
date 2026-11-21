import type { Locale } from './i18n-context';

const ENUM_TRANSLATIONS: Record<Locale, Record<string, Record<string, string>>> = {
  mk: {
    offerStatus: {
      ALL: 'Сите',
      DRAFT: 'Нацрт',
      SENT: 'Испратена',
      ACCEPTED: 'Прифатена',
      REJECTED: 'Одбиена',
      EXPIRED: 'Истечена',
    },
    projectStatus: {
      PLANNED: 'Планирано',
      PROCUREMENT: 'Набавка',
      PRODUCTION: 'Производство',
      INSTALLATION: 'Монтажа',
      COMPLETED: 'Завршено',
      CLOSED: 'Затворено',
    },
    customerType: {
      COMPANY: 'Правно Лице',
      PARTNER: 'Партнер',
      INDIVIDUAL: 'Физичко Лице',
      OTHER: 'Останато',
    },
    userRole: {
      SUPER_ADMIN: 'Супер Администратор',
      USER: 'Продажен Агент',
    },
    serviceType: {
      PRODUCT: 'Производ',
      INSTALLATION: 'Монтажа',
      SERVICE: 'Сервис',
    },
    servicePriority: {
      ALL: 'Сите',
      LOW: 'Низок',
      MEDIUM: 'Среден',
      HIGH: 'Висок',
      URGENT: 'Итно',
    },
    serviceStatus: {
      ALL: 'Сите',
      OPEN: 'Отворен',
      ASSIGNED: 'Доделен',
      IN_PROGRESS: 'Во тек',
      COMPLETED: 'Завршен',
      CLOSED: 'Затворен',
    },
    calendarEventType: {
      ALL: 'Сите',
      PROJECT: 'Проект',
      SERVICE: 'Сервис',
      MEETING: 'Состанок',
      INSTALLATION: 'Монтажа',
      MAINTENANCE: 'Одржување',
      EVENT: 'Настан',
    },
  },
  en: {
    offerStatus: {
      ALL: 'All',
      DRAFT: 'Draft',
      SENT: 'Sent',
      ACCEPTED: 'Accepted',
      REJECTED: 'Rejected',
      EXPIRED: 'Expired',
    },
    projectStatus: {
      PLANNED: 'Planned',
      PROCUREMENT: 'Procurement',
      PRODUCTION: 'Production',
      INSTALLATION: 'Installation',
      COMPLETED: 'Completed',
      CLOSED: 'Closed',
    },
    customerType: {
      COMPANY: 'Company',
      PARTNER: 'Partner',
      INDIVIDUAL: 'Individual',
      OTHER: 'Other',
    },
    userRole: {
      SUPER_ADMIN: 'Super Admin',
      USER: 'Sales Agent',
    },
    serviceType: {
      PRODUCT: 'Product',
      INSTALLATION: 'Installation',
      SERVICE: 'Service',
    },
    servicePriority: {
      ALL: 'All',
      LOW: 'Low',
      MEDIUM: 'Medium',
      HIGH: 'High',
      URGENT: 'Urgent',
    },
    serviceStatus: {
      ALL: 'All',
      OPEN: 'Open',
      ASSIGNED: 'Assigned',
      IN_PROGRESS: 'In Progress',
      COMPLETED: 'Completed',
      CLOSED: 'Closed',
    },
    calendarEventType: {
      ALL: 'All',
      PROJECT: 'Project',
      SERVICE: 'Service',
      MEETING: 'Meeting',
      INSTALLATION: 'Installation',
      MAINTENANCE: 'Maintenance',
      EVENT: 'Task',
    },
  },
};

function lookup(category: string, value: string | undefined | null, locale: Locale = 'mk'): string {
  if (!value) return '';
  return ENUM_TRANSLATIONS[locale]?.[category]?.[value] ?? ENUM_TRANSLATIONS.mk[category]?.[value] ?? value;
}

export const getOfferStatusLabel = (v?: string | null, locale: Locale = 'mk') => lookup('offerStatus', v, locale);
export const getProjectStatusLabel = (v?: string | null, locale: Locale = 'mk') => lookup('projectStatus', v, locale);
export const getCustomerTypeLabel = (v?: string | null, locale: Locale = 'mk') => lookup('customerType', v, locale);
export const getUserRoleLabel = (v?: string | null, locale: Locale = 'mk') => lookup('userRole', v, locale);
export const getServiceTypeLabel = (v?: string | null, locale: Locale = 'mk') => lookup('serviceType', v, locale);
export const getServicePriorityLabel = (v?: string | null, locale: Locale = 'mk') => lookup('servicePriority', v, locale);
export const getServiceStatusLabel = (v?: string | null, locale: Locale = 'mk') => lookup('serviceStatus', v, locale);
export const getCalendarEventTypeLabel = (v?: string | null, locale: Locale = 'mk') =>
  lookup('calendarEventType', v, locale);
