import {
  Customer,
  Offer,
  Product,
  UserProfile,
  UserRole,
  Project,
  ServiceTicket,
  ClientDocument,
  InstalledItem,
  OfferStatus,
  ProjectStatus,
  ServicePriority,
  ServiceStatus,
} from '@/types';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || '';

class ImfexStore {
  private products: Product[] = [];
  private customers: Customer[] = [];
  private offers: Offer[] = [];
  private profiles: UserProfile[] = [];
  private projects: Project[] = [];
  private serviceTickets: ServiceTicket[] = [];
  private installedItems: InstalledItem[] = [];
  private documents: ClientDocument[] = [];
  private currentUser: UserProfile | null = null;
  private isLoadedFromBackend: boolean = false;

  constructor() {
    if (typeof window !== 'undefined') {
      this.loadFromLocalStorage();
      this.fetchInitialDataFromBackend();
    }
  }

  // Live Sync with Supabase REST Backend API
  async fetchInitialDataFromBackend() {
    if (!API_BASE_URL) return;
    try {
      const [resProd, resCust, resOff, resProj, resServ, resProf] = await Promise.all([
        fetch(`${API_BASE_URL}/api/products`).catch(() => null),
        fetch(`${API_BASE_URL}/api/customers`).catch(() => null),
        fetch(`${API_BASE_URL}/api/offers`).catch(() => null),
        fetch(`${API_BASE_URL}/api/projects`).catch(() => null),
        fetch(`${API_BASE_URL}/api/service-tickets`).catch(() => null),
        fetch(`${API_BASE_URL}/api/profiles`).catch(() => null),
      ]);

      if (resProd && resProd.ok) this.products = await resProd.json();
      if (resCust && resCust.ok) this.customers = await resCust.json();
      if (resOff && resOff.ok) this.offers = await resOff.json();
      if (resProj && resProj.ok) this.projects = await resProj.json();
      if (resServ && resServ.ok) this.serviceTickets = await resServ.json();
      if (resProf && resProf.ok) this.profiles = await resProf.json();

      this.isLoadedFromBackend = true;
      this.saveToLocalStorage();
    } catch (e) {
      console.warn('Backend API sync notice:', e);
    }
  }

  private loadFromLocalStorage() {
    try {
      const pr = localStorage.getItem('imfex_user_profiles');
      if (pr) this.profiles = JSON.parse(pr);
      const p = localStorage.getItem('imfex_products');
      if (p) this.products = JSON.parse(p);
      const c = localStorage.getItem('imfex_customers');
      if (c) this.customers = JSON.parse(c);
      const o = localStorage.getItem('imfex_offers');
      if (o) this.offers = JSON.parse(o);
      const proj = localStorage.getItem('imfex_projects');
      if (proj) this.projects = JSON.parse(proj);
      const st = localStorage.getItem('imfex_service_tickets');
      if (st) this.serviceTickets = JSON.parse(st);
      const ii = localStorage.getItem('imfex_installed_items');
      if (ii) this.installedItems = JSON.parse(ii);
      const doc = localStorage.getItem('imfex_documents');
      if (doc) this.documents = JSON.parse(doc);
      const user = localStorage.getItem('imfex_current_user');
      if (user) this.currentUser = JSON.parse(user);
    } catch (e) {
      console.warn('LocalStorage error:', e);
    }
  }

  private saveToLocalStorage() {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem('imfex_user_profiles', JSON.stringify(this.profiles));
      localStorage.setItem('imfex_products', JSON.stringify(this.products));
      localStorage.setItem('imfex_customers', JSON.stringify(this.customers));
      localStorage.setItem('imfex_offers', JSON.stringify(this.offers));
      localStorage.setItem('imfex_projects', JSON.stringify(this.projects));
      localStorage.setItem('imfex_service_tickets', JSON.stringify(this.serviceTickets));
      localStorage.setItem('imfex_installed_items', JSON.stringify(this.installedItems));
      localStorage.setItem('imfex_documents', JSON.stringify(this.documents));
      if (this.currentUser) {
        localStorage.setItem('imfex_current_user', JSON.stringify(this.currentUser));
      } else {
        localStorage.removeItem('imfex_current_user');
      }
    } catch (e) {
      console.warn('LocalStorage save error:', e);
    }
  }

  // Strict Authentication API & Store Handler
  async loginAsync(email: string, password?: string): Promise<UserProfile | null> {
    const cleanEmail = email.trim().toLowerCase();
    const cleanPassword = password ? password.trim() : '';

    // 1. If backend API URL is configured, authenticate via REST API
    if (API_BASE_URL) {
      try {
        const res = await fetch(`${API_BASE_URL}/api/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: cleanEmail, password: cleanPassword }),
        });

        if (res.ok) {
          const data = await res.json();
          if (data.token) {
            localStorage.setItem('imfex_auth_token', data.token);
          }
          this.currentUser = data.user;
          this.saveToLocalStorage();
          await this.fetchInitialDataFromBackend();
          return data.user;
        } else {
          return null;
        }
      } catch (err) {
        console.warn('Backend API login offline, using strict local auth:', err);
      }
    }

    // 2. Local Strict Password Authentication Fallback
    const found = this.profiles.find((p) => p.email.toLowerCase() === cleanEmail && p.status !== 'DISABLED');
    if (found) {
      if (found.password && found.password !== cleanPassword) {
        return null;
      }
      this.currentUser = found;
      this.saveToLocalStorage();
      return found;
    }

    return null;
  }

  login(email: string, password?: string): UserProfile | null {
    const cleanEmail = email.trim().toLowerCase();
    const cleanPassword = password ? password.trim() : '';

    const found = this.profiles.find((p) => p.email.toLowerCase() === cleanEmail && p.status !== 'DISABLED');
    if (found) {
      if (found.password && found.password !== cleanPassword) {
        return null;
      }
      this.currentUser = found;
      this.saveToLocalStorage();
      return found;
    }
    return null;
  }

  logout() {
    this.currentUser = null;
    if (typeof window !== 'undefined') {
      localStorage.removeItem('imfex_auth_token');
    }
    this.saveToLocalStorage();
  }

  isAuthenticated(): boolean {
    return this.currentUser !== null;
  }

  getCurrentUser(): UserProfile | null {
    return this.currentUser;
  }

  getCurrentRole(): UserRole {
    return this.currentUser?.role || 'USER';
  }

  // User Management by Super Admin
  getProfiles(): UserProfile[] {
    return this.profiles;
  }

  createUserProfile(fullName: string, email: string, role: UserRole, tempPassword?: string): UserProfile {
    const newUser: UserProfile = {
      id: `usr-${Date.now()}`,
      email: email.trim().toLowerCase(),
      fullName: fullName.trim(),
      role,
      password: tempPassword || 'IMFEX123!',
      mustChangePassword: true,
      status: 'ACTIVE',
      createdAt: new Date().toISOString(),
    };
    this.profiles.push(newUser);
    this.saveToLocalStorage();

    if (API_BASE_URL) {
      fetch(`${API_BASE_URL}/api/profiles`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newUser),
      }).catch(console.warn);
    }
    return newUser;
  }

  updateUserProfile(profile: UserProfile): UserProfile {
    const idx = this.profiles.findIndex((p) => p.id === profile.id);
    if (idx >= 0) {
      this.profiles[idx] = profile;
      if (this.currentUser?.id === profile.id) {
        this.currentUser = profile;
      }
      this.saveToLocalStorage();
    }
    return profile;
  }

  resetUserPassword(userId: string, newTempPassword?: string): string {
    const tempPass = newTempPassword || 'TempPass2026!';
    const user = this.profiles.find((p) => p.id === userId);
    if (user) {
      user.password = tempPass;
      user.mustChangePassword = true;
      this.saveToLocalStorage();
    }
    return tempPass;
  }

  changeUserPassword(userId: string, newPassword: string): boolean {
    const user = this.profiles.find((p) => p.id === userId);
    if (user) {
      user.password = newPassword;
      user.mustChangePassword = false;
      if (this.currentUser?.id === userId) {
        this.currentUser.mustChangePassword = false;
      }
      this.saveToLocalStorage();
      return true;
    }
    return false;
  }

  toggleUserStatus(userId: string): UserProfile | undefined {
    const user = this.profiles.find((p) => p.id === userId);
    if (user) {
      user.status = user.status === 'DISABLED' ? 'ACTIVE' : 'DISABLED';
      this.saveToLocalStorage();
    }
    return user;
  }

  deleteUserProfile(id: string) {
    this.profiles = this.profiles.filter((p) => p.id !== id);
    this.saveToLocalStorage();
  }

  // Products
  getProducts(): Product[] {
    return this.products;
  }

  getProductById(id: string): Product | undefined {
    return this.products.find((p) => p.id === id);
  }

  saveProduct(product: Product): Product {
    const idx = this.products.findIndex((p) => p.id === product.id);
    if (idx >= 0) {
      this.products[idx] = product;
    } else {
      this.products.push(product);
    }
    this.saveToLocalStorage();

    if (API_BASE_URL) {
      fetch(`${API_BASE_URL}/api/products`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(product),
      }).catch(console.warn);
    }
    return product;
  }

  deleteProduct(id: string) {
    this.products = this.products.filter((p) => p.id !== id);
    this.saveToLocalStorage();
  }

  // Customers
  getCustomers(): Customer[] {
    return this.customers;
  }

  getCustomerById(id: string): Customer | undefined {
    return this.customers.find((c) => c.id === id);
  }

  saveCustomer(customer: Customer): Customer {
    const idx = this.customers.findIndex((c) => c.id === customer.id);
    if (idx >= 0) {
      this.customers[idx] = customer;
    } else {
      this.customers.push(customer);
    }
    this.saveToLocalStorage();

    if (API_BASE_URL) {
      fetch(`${API_BASE_URL}/api/customers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(customer),
      }).catch(console.warn);
    }
    return customer;
  }

  deleteCustomer(id: string) {
    this.customers = this.customers.filter((c) => c.id !== id);
    this.saveToLocalStorage();
  }

  // Offers & 4.1 Sales Workflow
  getOffers(): Offer[] {
    return this.offers.map((o) => ({
      ...o,
      customer: o.customer || this.getCustomerById(o.customerId),
    }));
  }

  getOfferById(id: string): Offer | undefined {
    const o = this.offers.find((off) => off.id === id);
    if (!o) return undefined;
    return {
      ...o,
      customer: o.customer || this.getCustomerById(o.customerId),
    };
  }

  generateOfferNumber(): string {
    const year = new Date().getFullYear();
    const count = this.offers.length + 1;
    const numStr = String(count).padStart(4, '0');
    return `OFF-${year}-${numStr}`;
  }

  saveOffer(offer: Offer): Offer {
    const idx = this.offers.findIndex((o) => o.id === offer.id);
    if (idx >= 0) {
      this.offers[idx] = offer;
    } else {
      this.offers.push(offer);
    }
    this.saveToLocalStorage();

    if (API_BASE_URL) {
      fetch(`${API_BASE_URL}/api/offers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(offer),
      }).catch(console.warn);
    }
    return offer;
  }

  setOfferStatus(offerId: string, status: OfferStatus): Offer | undefined {
    const offer = this.getOfferById(offerId);
    if (!offer) return undefined;
    offer.status = status;
    this.saveOffer(offer);

    if (status === 'ACCEPTED') {
      const existingProj = this.projects.find((p) => p.offerId === offerId);
      if (!existingProj) {
        this.createProjectFromOffer(offer);
      }
    }
    return offer;
  }

  deleteOffer(id: string) {
    this.offers = this.offers.filter((o) => o.id !== id);
    this.saveToLocalStorage();
  }

  // Documents & Client Documentation
  getDocumentsByCustomer(customerId: string): ClientDocument[] {
    return this.documents.filter((d) => d.customerId === customerId);
  }

  saveDocument(doc: ClientDocument): ClientDocument {
    const idx = this.documents.findIndex((d) => d.id === doc.id);
    if (idx >= 0) {
      this.documents[idx] = doc;
    } else {
      this.documents.push(doc);
    }
    this.saveToLocalStorage();
    return doc;
  }

  // Projects & 4.2 Operational Workflow
  getProjects(): Project[] {
    return this.projects.map((p) => ({
      ...p,
      customer: p.customer || this.getCustomerById(p.customerId),
      offer: p.offer || this.getOfferById(p.offerId),
      responsibleUser: p.responsibleUser || this.profiles.find((pr) => pr.id === p.responsibleUserId),
    }));
  }

  getProjectById(id: string): Project | undefined {
    const p = this.projects.find((prj) => prj.id === id);
    if (!p) return undefined;
    return {
      ...p,
      customer: p.customer || this.getCustomerById(p.customerId),
      offer: p.offer || this.getOfferById(p.offerId),
      responsibleUser: p.responsibleUser || this.profiles.find((pr) => pr.id === p.responsibleUserId),
    };
  }

  generateProjectNumber(): string {
    const year = new Date().getFullYear();
    const count = this.projects.length + 1;
    const numStr = String(count).padStart(4, '0');
    return `PRJ-${year}-${numStr}`;
  }

  createProjectFromOffer(offer: Offer): Project {
    const cust = this.getCustomerById(offer.customerId);
    const newProject: Project = {
      id: `proj-${Date.now()}`,
      projectNumber: this.generateProjectNumber(),
      offerId: offer.id,
      offer,
      customerId: offer.customerId,
      customer: cust,
      responsibleUserId: this.currentUser?.id || 'usr-admin-1',
      responsibleUser: this.currentUser || undefined,
      status: 'PLANNED',
      startDate: new Date().toISOString().split('T')[0],
      targetDeliveryDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      procurementStatus: 'NOT_STARTED',
      procurementNotes: `Генерирано од прифатена понуда ${offer.offerNumber}. Ставки: ${offer.items.map((i) => i.customTitle).join(', ')}`,
      installationAddress: cust?.address ? `${cust.address}, ${cust.city || ''}` : '',
      installationContact: `${cust?.name || ''} (${cust?.phone || ''})`,
      createdAt: new Date().toISOString(),
    };
    this.projects.push(newProject);
    this.saveToLocalStorage();

    if (API_BASE_URL) {
      fetch(`${API_BASE_URL}/api/projects`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newProject),
      }).catch(console.warn);
    }
    return newProject;
  }

  saveProject(project: Project): Project {
    const idx = this.projects.findIndex((p) => p.id === project.id);
    if (idx >= 0) {
      this.projects[idx] = project;
    } else {
      this.projects.push(project);
    }

    if (project.status === 'CLOSED') {
      const existingItem = this.installedItems.find((ii) => ii.projectId === project.id);
      if (!existingItem) {
        const itemTitle = project.offer?.items[0]?.customTitle || `Инсталиран Систем (${project.projectNumber})`;
        this.saveInstalledItem({
          id: `inst-${Date.now()}`,
          customerId: project.customerId,
          projectId: project.id,
          productId: project.offer?.items[0]?.productId,
          title: itemTitle,
          serialNumber: `SN-${Date.now().toString().slice(-6)}`,
          installationDate: project.installationDate || new Date().toISOString().split('T')[0],
        });
      }
    }

    this.saveToLocalStorage();
    return project;
  }

  // Installed Equipment Registry
  getInstalledItemsByCustomer(customerId: string): InstalledItem[] {
    return this.installedItems.filter((item) => item.customerId === customerId);
  }

  getAllInstalledItems(): InstalledItem[] {
    return this.installedItems;
  }

  saveInstalledItem(item: InstalledItem): InstalledItem {
    const idx = this.installedItems.findIndex((i) => i.id === item.id);
    if (idx >= 0) {
      this.installedItems[idx] = item;
    } else {
      this.installedItems.push(item);
    }
    this.saveToLocalStorage();
    return item;
  }

  // Service Tickets & 4.3 Service Workflow
  getServiceTickets(): ServiceTicket[] {
    return this.serviceTickets.map((st) => ({
      ...st,
      customer: st.customer || this.getCustomerById(st.customerId),
      installedItem: st.installedItem || this.installedItems.find((i) => i.id === st.installedItemId),
      assignedTechnician: st.assignedTechnician || this.profiles.find((p) => p.id === st.assignedTechnicianId),
    }));
  }

  getServiceTicketById(id: string): ServiceTicket | undefined {
    const st = this.serviceTickets.find((t) => t.id === id);
    if (!st) return undefined;
    return {
      ...st,
      customer: st.customer || this.getCustomerById(st.customerId),
      installedItem: st.installedItem || this.installedItems.find((i) => i.id === st.installedItemId),
      assignedTechnician: st.assignedTechnician || this.profiles.find((p) => p.id === st.assignedTechnicianId),
    };
  }

  generateTicketNumber(): string {
    const year = new Date().getFullYear();
    const count = this.serviceTickets.length + 1;
    const numStr = String(count).padStart(4, '0');
    return `SRV-${year}-${numStr}`;
  }

  saveServiceTicket(ticket: ServiceTicket): ServiceTicket {
    const idx = this.serviceTickets.findIndex((t) => t.id === ticket.id);
    if (idx >= 0) {
      this.serviceTickets[idx] = ticket;
    } else {
      this.serviceTickets.push(ticket);
    }
    this.saveToLocalStorage();

    if (API_BASE_URL) {
      fetch(`${API_BASE_URL}/api/service-tickets`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(ticket),
      }).catch(console.warn);
    }
    return ticket;
  }
}

export const imfexStore = new ImfexStore();
