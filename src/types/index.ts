export type UserRole = 'SUPER_ADMIN' | 'USER';

export type SpecInputType = 'SELECT' | 'MULTISELECT' | 'TEXT' | 'NUMBER';

export type CustomerType = 'INDIVIDUAL' | 'COMPANY' | 'PARTNER' | 'OTHER';

export type OfferStatus = 'DRAFT' | 'SENT' | 'ACCEPTED' | 'REJECTED' | 'EXPIRED';

export type ServiceType = 'PRODUCT' | 'INSTALLATION' | 'SERVICE';

export type ProjectStatus = 'PLANNED' | 'PROCUREMENT' | 'PRODUCTION' | 'INSTALLATION' | 'COMPLETED' | 'CLOSED';

export type ServicePriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';

export type ServiceStatus = 'OPEN' | 'ASSIGNED' | 'IN_PROGRESS' | 'COMPLETED' | 'CLOSED';

export interface UserProfile {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  password?: string;
  mustChangePassword?: boolean;
  status?: 'ACTIVE' | 'DISABLED';
  createdAt: string;
}

export interface SpecificationOption {
  id: string;
  specificationKeyId: string;
  label: string;
  priceModifier: number;
  isDefault?: boolean;
}

export interface SpecificationKey {
  id: string;
  productId: string;
  name: string;
  inputType: SpecInputType;
  defaultValue?: string;
  options: SpecificationOption[];
}

export interface ProductModel {
  id: string;
  productId: string;
  name: string;
  basePrice: number;
}

export interface ProductCategory {
  id: string;
  name: string;
  parentId?: string | null;
  children?: ProductCategory[];
  createdAt?: string;
}

export type ProductStockType = 'STOCK' | 'CUSTOM';

export type InventoryMoveKind = 'ПРИЕМ' | 'ИЗЛЕЗ' | 'РЕЗЕРВАЦИЈА' | 'УПЛАТА' | 'НАБАВКА';

export interface InventoryMovement {
  id: string;
  kind: InventoryMoveKind;
  detail: string;
  productId?: string;
  projectId?: string;
  offerId?: string;
  quantity?: number;
  at: string;
  createdAt: string;
}

export interface Product {
  id: string;
  categoryId?: string | null;
  category?: ProductCategory;
  name: string;
  code: string;
  description?: string;
  isActive: boolean;
  stockType?: ProductStockType; // 'STOCK' (Залиха) | 'CUSTOM' (По нарачка)
  stockQuantity?: number;
  reservedQuantity?: number;
  purchasePrice?: number; // Набавна цена (€)
  linkedAccessoryCategories?: string[]; // e.g. ['Автоматика', 'Шини', 'Додатоци']
  defaultAccessories?: Record<string, string>; // categoryName -> productId
  models: ProductModel[];
  specificationKeys: SpecificationKey[];
}

export interface Customer {
  id: string;
  customerType: CustomerType;
  name: string;
  companyName?: string;
  taxId?: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  notes?: string;
  createdAt: string;
}

export interface OfferItemSpecSelection {
  specificationKeyId: string;
  specificationOptionId?: string;
  customValue?: string;
  customKeyName?: string;
  customPriceModifier?: number;
}

export interface OfferItem {
  id: string;
  offerId?: string;
  serviceTypes: ServiceType[];
  categoryId?: string;
  productId?: string;
  productModelId?: string;
  customTitle?: string;
  widthMm?: number;
  heightMm?: number;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  specifications?: OfferItemSpecSelection[];
  selectedAccessories?: Record<string, string>; // e.g. { motorId: '...', railId: '...' }
  // Service & Maintenance embedded fields (when 'SERVICE' is in serviceTypes)
  serviceEquipmentId?: string;
  serviceEquipmentTitle?: string;
  defectDescription?: string;
  laborHours?: number;
  consumedPartProductId?: string;
  consumedPartQty?: number;
}

export interface Offer {
  id: string;
  offerNumber: string;
  version?: number; // V1, V2 (Финална)
  parentOfferId?: string;
  customerId: string;
  customer?: Customer;
  createdByUserId?: string;
  createdByUser?: UserProfile;
  status: OfferStatus;
  taxRate: number; // default 18.00
  discountRate: number; // e.g. 10 (%)
  discountAmount: number; // e.g. 250 ($)
  subtotal: number;
  taxAmount: number;
  totalAmount: number;
  validUntil?: string;
  createdAt: string;
  items: OfferItem[];
}

export type ProjectFileCategory = 'IMAGE' | 'PDF' | 'EXCEL' | 'WORD' | 'OTHER';

export interface ProjectAttachment {
  id: string;
  projectId: string;
  customerId?: string;
  name: string;
  mimeType: string;
  category: ProjectFileCategory;
  sizeBytes: number;
  dataUrl: string;
  uploadedBy?: string;
  createdAt: string;
}

export interface ClientDocument {
  id: string;
  customerId: string;
  offerId?: string;
  projectId?: string;
  serviceId?: string;
  title: string;
  fileType: string; // 'PDF' | 'IMAGE' | 'EXCEL' | 'WORD' | 'PROTOCOL' | 'SIGNATURE' | 'OTHER'
  fileUrl: string;
  fileName?: string;
  sizeBytes?: number;
  createdAt: string;
}

export interface Project {
  id: string;
  projectNumber: string;
  offerId: string;
  offer?: Offer;
  customerId: string;
  customer?: Customer;
  responsibleUserId?: string;
  responsibleUser?: UserProfile;
  status: ProjectStatus;
  startDate?: string;
  targetDeliveryDate?: string;
  actualDeliveryDate?: string;
  procurementStatus?: string; // 'NOT_STARTED' | 'ORDERED' | 'IN_PRODUCTION' | 'DELIVERED'
  procurementNotes?: string;
  installationTeam?: string;
  installationDate?: string;
  installationAddress?: string;
  installationContact?: string;
  installationMinutes?: string;
  signatureUrl?: string;
  photos?: string[];
  attachments?: ProjectAttachment[];
  // 5-Step Warehouse & Order Flow fields
  acceptedAt?: string;
  advancePaid?: boolean;
  advancePaidAt?: string;
  supplierOrdered?: boolean;
  supplierOrderedAt?: string;
  warehouseReceived?: boolean;
  warehouseReceivedAt?: string;
  dispatchIssued?: boolean;
  dispatchIssuedAt?: string;
  selectedMotorId?: string;
  selectedRailId?: string;
  reservedAccessoryIds?: string[];
  missingAccessoryNames?: string[];
  createdAt: string;
}

export interface InstalledItem {
  id: string;
  customerId: string;
  projectId?: string;
  productId?: string;
  title: string;
  serialNumber?: string;
  installationDate: string;
}

export interface ConsumedPart {
  id: string;
  name: string;
  code?: string;
  quantity: number;
  unitCost: number;
}

export interface ServiceTicket {
  id: string;
  ticketNumber: string;
  customerId: string;
  customer?: Customer;
  installedItemId?: string;
  installedItem?: InstalledItem;
  defectDescription: string;
  priority: ServicePriority;
  status: ServiceStatus;
  assignedTechnicianId?: string;
  assignedTechnician?: UserProfile;
  scheduledDate?: string;
  partsConsumed: ConsumedPart[];
  laborHours: number;
  solution?: string;
  closedAt?: string;
  createdAt: string;
}

export type CalendarEventType = 'EVENT' | 'PROJECT' | 'SERVICE' | 'MEETING' | 'INSTALLATION' | 'MAINTENANCE';

export interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  startDate: string; // ISO date string (YYYY-MM-DD or YYYY-MM-DDTHH:mm)
  endDate?: string;
  allDay?: boolean;
  eventType: CalendarEventType;
  customerId?: string;
  customer?: Customer;
  projectId?: string;
  serviceTicketId?: string;
  location?: string;
  color?: string;
  createdAt: string;
}

// ============================================================================
// ФИНАНСИИ И НАБАВКИ (Finance, Procurement, Sales Invoices, Dispatch & Payments)
// ============================================================================

export type PurchaseItemType = 'STOCK' | 'EXPENSE';

export type ExpenseCategory =
  | 'ГОРИВО'
  | 'ПОТРОШЕН_МАТЕРИЈАЛ'
  | 'СТРУЈА_ТЕЛЕФОН_КИРИЈА'
  | 'ТРАНСПОРТ_И_ЦАРИНА'
  | 'АЛАТ_И_ОПРЕМА'
  | 'ОСТАНАТО';

export type PurchaseInvoiceStatus = 'DRAFT' | 'INVOICED' | 'PARTIAL_PAID' | 'PAID';
export type WarehouseReceiptStatus = 'PENDING' | 'PARTIAL' | 'RECEIVED';

export interface PurchaseInvoiceItem {
  id: string;
  itemType: PurchaseItemType; // 'STOCK' (Стока за залиха) | 'EXPENSE' (Трошок)
  productId?: string; // If STOCK, linked to existing or newly created Product
  productCode?: string;
  title: string;
  expenseCategory?: ExpenseCategory; // If EXPENSE
  projectId?: string; // Optional link to Project (both for STOCK or EXPENSE)
  quantity: number;
  unitCost: number; // Набавна цена без ДДВ или со ДДВ
  totalCost: number;
  receivedInWarehouse?: boolean;
  receivedAt?: string;
}

export interface PurchaseInvoice {
  id: string;
  internalNumber: string; // e.g. NAB-2026-0001
  supplierInvoiceNumber?: string; // Број на влезна фактура / фискална од добавувач
  supplierId: string; // Links to Customer (PARTNER / COMPANY)
  supplierName: string;
  projectId?: string; // Optional main project link
  offerId?: string;
  issueDate: string;
  dueDate?: string;
  status: PurchaseInvoiceStatus;
  receiptStatus: WarehouseReceiptStatus;
  taxRate: number; // 18% or 5% or 0%
  subtotal: number;
  taxAmount: number;
  totalAmount: number;
  paidAmount: number;
  notes?: string;
  items: PurchaseInvoiceItem[];
  createdAt: string;
}

export type SalesInvoiceType = 'PROFORMA' | 'ADVANCE' | 'FINAL';
export type SalesInvoiceStatus = 'DRAFT' | 'ISSUED' | 'PARTIAL_PAID' | 'PAID' | 'CANCELLED';

export interface SalesInvoiceItem {
  id: string;
  productId?: string;
  title: string;
  description?: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

export interface SalesInvoice {
  id: string;
  invoiceNumber: string; // e.g. PRO-2026-0001, AVN-2026-0001, FAK-2026-0001
  externalAccountingNumber?: string; // Број од сметководство (опционално)
  invoiceType: SalesInvoiceType;
  status: SalesInvoiceStatus;
  customerId: string;
  customer?: Customer;
  offerId?: string;
  projectId?: string;
  issueDate: string;
  dueDate?: string;
  taxRate: number;
  discountRate: number;
  discountAmount: number;
  subtotal: number;
  taxAmount: number;
  grossTotalAmount: number; // Вкупна вредност на ставките со ДДВ
  // Advance deduction fields (for FINAL invoices that deduct a prior ADVANCE)
  linkedAdvanceInvoiceId?: string;
  linkedAdvanceInvoiceNumber?: string;
  advanceDeductedAmount: number; // Износ на веќе платен аванс што се одбива
  totalAmount: number; // Конечен износ за доплата (grossTotalAmount - advanceDeductedAmount)
  paidAmount: number;
  notes?: string;
  items: SalesInvoiceItem[];
  createdAt: string;
}

export type DispatchNoteStatus = 'DRAFT' | 'ISSUED';

export interface DispatchNoteItem {
  id: string;
  productId?: string;
  productCode?: string;
  title: string;
  quantity: number;
  serialNumber?: string;
}

export interface DispatchNote {
  id: string;
  dispatchNumber: string; // e.g. ISP-2026-0001
  status: DispatchNoteStatus;
  customerId: string;
  customer?: Customer;
  projectId?: string;
  offerId?: string;
  salesInvoiceId?: string;
  issueDate: string;
  deliveryAddress?: string;
  receivedBy?: string;
  issuedBy?: string;
  notes?: string;
  items: DispatchNoteItem[];
  stockDeducted: boolean;
  createdAt: string;
}

export type PaymentDirection = 'IN' | 'OUT';
export type PaymentMethod = 'BANK' | 'CASH' | 'CARD';

export interface PaymentRecord {
  id: string;
  paymentNumber: string; // e.g. UPL-2026-0001
  direction: PaymentDirection; // 'IN' (Уплата од клиент) | 'OUT' (Исплата кон добавувач/трошок)
  amount: number;
  date: string;
  method: PaymentMethod;
  bankAccount?: string;
  customerId?: string;
  partnerName?: string;
  projectId?: string;
  offerId?: string;
  salesInvoiceId?: string;
  purchaseInvoiceId?: string;
  isAdvance?: boolean;
  notes?: string;
  createdAt: string;
}

