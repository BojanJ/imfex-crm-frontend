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
}

export interface SpecificationKey {
  id: string;
  productId: string;
  name: string;
  inputType: SpecInputType;
  options: SpecificationOption[];
}

export interface ProductModel {
  id: string;
  productId: string;
  name: string;
  basePrice: number;
}

export interface Product {
  id: string;
  name: string;
  code: string;
  description?: string;
  isActive: boolean;
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
}

export interface OfferItem {
  id: string;
  offerId?: string;
  serviceTypes: ServiceType[];
  productId?: string;
  productModelId?: string;
  customTitle?: string;
  widthMm?: number;
  heightMm?: number;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  specifications?: OfferItemSpecSelection[];
}

export interface Offer {
  id: string;
  offerNumber: string;
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

export interface ClientDocument {
  id: string;
  customerId: string;
  offerId?: string;
  projectId?: string;
  serviceId?: string;
  title: string;
  fileType: string; // 'PDF' | 'IMAGE' | 'PROTOCOL' | 'SIGNATURE'
  fileUrl: string;
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
