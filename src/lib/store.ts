import { useEffect, useState } from 'react';
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
  CalendarEvent,
} from '@/types';

export const getApiUrl = () => {
  return process.env.NEXT_PUBLIC_API_URL || 'https://imfex-crm-backend.onrender.com';
};

class ImfexStore {
  private products: Product[] = [];
  private customers: Customer[] = [];
  private offers: Offer[] = [];
  private profiles: UserProfile[] = [];
  private projects: Project[] = [];
  private serviceTickets: ServiceTicket[] = [];
  private installedItems: InstalledItem[] = [];
  private documents: ClientDocument[] = [];
  private calendarEvents: CalendarEvent[] = [];
  private currentUser: UserProfile | null = null;
  public isLoadedFromBackend: boolean = false;
  private listeners: Array<() => void> = [];

  constructor() {
    if (typeof window !== 'undefined') {
      const storedUser = sessionStorage.getItem('imfex_current_user');
      if (storedUser) {
        try {
          this.currentUser = JSON.parse(storedUser);
        } catch (e) {}
      }

      const storedEvents = localStorage.getItem('imfex_calendar_events');
      if (storedEvents) {
        try {
          this.calendarEvents = JSON.parse(storedEvents);
        } catch (e) {}
      }

      this.fetchInitialDataFromBackend();
    }
  }

  subscribe(listener: () => void) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  notifyListeners() {
    this.listeners.forEach((l) => l());
  }

  // Live Sync with Supabase REST Backend API
  async fetchInitialDataFromBackend() {
    const baseUrl = getApiUrl();
    try {
      const [resProd, resCust, resOff, resProj, resServ, resProf, resCal, resInst, resDocs] = await Promise.all([
        fetch(`${baseUrl}/api/products`).catch(() => null),
        fetch(`${baseUrl}/api/customers`).catch(() => null),
        fetch(`${baseUrl}/api/offers`).catch(() => null),
        fetch(`${baseUrl}/api/projects`).catch(() => null),
        fetch(`${baseUrl}/api/service-tickets`).catch(() => null),
        fetch(`${baseUrl}/api/profiles`).catch(() => null),
        fetch(`${baseUrl}/api/calendar-events`).catch(() => null),
        fetch(`${baseUrl}/api/installed-items`).catch(() => null),
        fetch(`${baseUrl}/api/client-documents`).catch(() => null),
      ]);

      if (resProd && resProd.ok) this.products = await resProd.json();
      if (resCust && resCust.ok) this.customers = await resCust.json();
      if (resOff && resOff.ok) {
        const dbOffers = await resOff.json();
        if (Array.isArray(dbOffers)) {
          this.offers = dbOffers.map((o: any) => ({
            ...o,
            items: (o.items || []).map((it: any) => ({
              ...it,
              specifications: (it.specifications && it.specifications.length > 0)
                ? it.specifications
                : (it.offerItemSpecifications || []),
            })),
          }));
        }
      }
      if (resProj && resProj.ok) this.projects = await resProj.json();
      if (resServ && resServ.ok) this.serviceTickets = await resServ.json();
      if (resProf && resProf.ok) this.profiles = await resProf.json();
      if (resInst && resInst.ok) this.installedItems = await resInst.json();
      if (resDocs && resDocs.ok) this.documents = await resDocs.json();
      if (resCal && resCal.ok) {
        const dbEvents = await resCal.json();
        if (Array.isArray(dbEvents) && dbEvents.length > 0) {
          this.calendarEvents = dbEvents;
          if (typeof window !== 'undefined') {
            localStorage.setItem('imfex_calendar_events', JSON.stringify(this.calendarEvents));
          }
        }
      }

      this.isLoadedFromBackend = true;
      this.notifyListeners();
    } catch (e) {
      console.warn('Backend API sync notice:', e);
    }
  }

  async purgeCorruptedAndSyncBackend() {
    const baseUrl = getApiUrl();
    try {
      await fetch(`${baseUrl}/api/admin/clean-database`, { method: 'POST' }).catch(() => null);
      await this.fetchInitialDataFromBackend();
    } catch (e) {
      console.warn('Purge & sync notice:', e);
    }
  }

  async resetDatabaseToFreshState() {
    const baseUrl = getApiUrl();
    try {
      await fetch(`${baseUrl}/api/admin/reset-database`, { method: 'POST' }).catch(() => null);
      this.products = [];
      this.customers = [];
      this.offers = [];
      this.projects = [];
      this.serviceTickets = [];
      this.installedItems = [];
      this.documents = [];
      this.calendarEvents = [];
      if (typeof window !== 'undefined') {
        localStorage.removeItem('imfex_calendar_events');
      }
      await this.fetchInitialDataFromBackend();
      this.notifyListeners();
    } catch (e) {
      console.warn('Database reset notice:', e);
    }
  }

  // Pure REST API Authentication via Supabase Database
  async loginAsync(email: string, password?: string): Promise<UserProfile | null> {
    const cleanEmail = email.trim().toLowerCase();
    const cleanPassword = password ? password.trim() : '';

    if (!cleanPassword || !cleanEmail) {
      return null;
    }

    const baseUrl = getApiUrl();
    try {
      const res = await fetch(`${baseUrl}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: cleanEmail, password: cleanPassword }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.token) {
          sessionStorage.setItem('imfex_auth_token', data.token);
        }
        this.currentUser = data.user;
        sessionStorage.setItem('imfex_current_user', JSON.stringify(data.user));
        await this.fetchInitialDataFromBackend();
        this.notifyListeners();
        return data.user;
      } else {
        return null;
      }
    } catch (err) {
      console.warn('Backend API login network error:', err);
      return null;
    }
  }

  login(email: string, password?: string): UserProfile | null {
    return this.currentUser;
  }

  logout() {
    this.currentUser = null;
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem('imfex_auth_token');
      sessionStorage.removeItem('imfex_current_user');
    }
    this.notifyListeners();
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
    return [...this.profiles];
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
    this.notifyListeners();

    const baseUrl = getApiUrl();
    fetch(`${baseUrl}/api/profiles`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newUser),
    }).catch(console.warn);
    return newUser;
  }

  updateUserProfile(profile: UserProfile): UserProfile {
    const idx = this.profiles.findIndex((p) => p.id === profile.id);
    if (idx >= 0) {
      this.profiles[idx] = profile;
      if (this.currentUser?.id === profile.id) {
        this.currentUser = profile;
      }
      this.notifyListeners();
    }
    const baseUrl = getApiUrl();
    fetch(`${baseUrl}/api/profiles/${profile.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(profile),
    }).catch(console.warn);
    return profile;
  }

  resetUserPassword(userId: string, newTempPassword?: string): string {
    const tempPass = newTempPassword || 'TempPass2026!';
    const user = this.profiles.find((p) => p.id === userId);
    if (user) {
      user.password = tempPass;
      user.mustChangePassword = true;
      this.notifyListeners();
      const baseUrl = getApiUrl();
      fetch(`${baseUrl}/api/profiles/${userId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: tempPass }),
      }).catch(console.warn);
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
      this.notifyListeners();
      const baseUrl = getApiUrl();
      fetch(`${baseUrl}/api/profiles/${userId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: newPassword }),
      }).catch(console.warn);
      return true;
    }
    return false;
  }

  toggleUserStatus(userId: string): UserProfile | undefined {
    const user = this.profiles.find((p) => p.id === userId);
    if (user) {
      user.status = user.status === 'DISABLED' ? 'ACTIVE' : 'DISABLED';
      this.notifyListeners();
      const baseUrl = getApiUrl();
      fetch(`${baseUrl}/api/profiles/${userId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: user.status }),
      }).catch(console.warn);
    }
    return user;
  }

  deleteUserProfile(id: string) {
    this.profiles = this.profiles.filter((p) => p.id !== id);
    this.notifyListeners();
    const baseUrl = getApiUrl();
    fetch(`${baseUrl}/api/profiles/${id}`, { method: 'DELETE' }).catch(console.warn);
  }

  // Products
  getProducts(): Product[] {
    return [...this.products];
  }

  getProductById(id: string): Product | undefined {
    return this.products.find((p) => p.id === id);
  }

  saveProduct(product: Product): Product {
    const idx = this.products.findIndex((p) => p.id === product.id || p.code === product.code);
    if (idx >= 0) {
      this.products[idx] = product;
    } else {
      this.products.push(product);
    }
    this.notifyListeners();

    const baseUrl = getApiUrl();
    fetch(`${baseUrl}/api/products`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(product),
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((savedProd) => {
        if (savedProd && savedProd.id) {
          const freshIdx = this.products.findIndex((p) => p.id === product.id || p.code === product.code || p.id === savedProd.id);
          if (freshIdx >= 0) {
            this.products[freshIdx] = savedProd;
          } else {
            this.products.push(savedProd);
          }
          this.notifyListeners();
        }
      })
      .catch((e) => console.warn('saveProduct API notice:', e));

    return product;
  }

  deleteProduct(id: string) {
    this.products = this.products.filter((p) => p.id !== id);
    this.notifyListeners();
    const baseUrl = getApiUrl();
    fetch(`${baseUrl}/api/products/${id}`, { method: 'DELETE' }).catch(console.warn);
  }

  // Customers
  getCustomers(): Customer[] {
    return [...this.customers];
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
    this.notifyListeners();

    const baseUrl = getApiUrl();
    fetch(`${baseUrl}/api/customers`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(customer),
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((savedCust) => {
        if (savedCust && savedCust.id) {
          const freshIdx = this.customers.findIndex((c) => c.id === customer.id || c.id === savedCust.id);
          if (freshIdx >= 0) this.customers[freshIdx] = savedCust;
          this.notifyListeners();
        }
      })
      .catch((e) => console.warn('saveCustomer API notice:', e));

    return customer;
  }

  deleteCustomer(id: string) {
    this.customers = this.customers.filter((c) => c.id !== id);
    this.notifyListeners();
    const baseUrl = getApiUrl();
    fetch(`${baseUrl}/api/customers/${id}`, { method: 'DELETE' }).catch(console.warn);
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
    this.notifyListeners();

    const baseUrl = getApiUrl();
    fetch(`${baseUrl}/api/offers`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(offer),
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((savedOffer) => {
        if (savedOffer && savedOffer.id) {
          const formatted = {
            ...savedOffer,
            items: (savedOffer.items || []).map((it: any) => ({
              ...it,
              specifications: (it.specifications && it.specifications.length > 0)
                ? it.specifications
                : (it.offerItemSpecifications || []),
            })),
          };
          const freshIdx = this.offers.findIndex((o) => o.id === offer.id || o.id === savedOffer.id);
          if (freshIdx >= 0) this.offers[freshIdx] = formatted;
          this.notifyListeners();
        }
      })
      .catch((e) => console.warn('saveOffer API notice:', e));

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
    this.notifyListeners();
    const baseUrl = getApiUrl();
    fetch(`${baseUrl}/api/offers/${id}`, { method: 'DELETE' }).catch(console.warn);
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
    this.notifyListeners();
    const baseUrl = getApiUrl();
    fetch(`${baseUrl}/api/client-documents`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(doc),
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((savedDoc) => {
        if (savedDoc && savedDoc.id) {
          const freshIdx = this.documents.findIndex((d) => d.id === doc.id || d.id === savedDoc.id);
          if (freshIdx >= 0) this.documents[freshIdx] = savedDoc;
          this.notifyListeners();
        }
      })
      .catch((e) => console.warn('saveDocument API notice:', e));
    return doc;
  }

  deleteDocument(id: string) {
    this.documents = this.documents.filter((d) => d.id !== id);
    this.notifyListeners();
    const baseUrl = getApiUrl();
    fetch(`${baseUrl}/api/client-documents/${id}`, { method: 'DELETE' }).catch(console.warn);
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
      procurementNotes: `Генерирано од прифатена понуда ${offer.offerNumber}. Ставки: ${offer.items?.map((i) => i.customTitle).join(', ') || ''}`,
      installationAddress: cust?.address ? `${cust.address}, ${cust.city || ''}` : '',
      installationContact: `${cust?.name || ''} (${cust?.phone || ''})`,
      createdAt: new Date().toISOString(),
    };
    this.projects.push(newProject);
    this.notifyListeners();

    const baseUrl = getApiUrl();
    fetch(`${baseUrl}/api/projects`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newProject),
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((savedProj) => {
        if (savedProj && savedProj.id) {
          const freshIdx = this.projects.findIndex((p) => p.id === newProject.id || p.projectNumber === newProject.projectNumber || p.id === savedProj.id);
          if (freshIdx >= 0) this.projects[freshIdx] = savedProj;
          this.notifyListeners();
        }
      })
      .catch(console.warn);
    return newProject;
  }

  saveProject(project: Project): Project {
    const idx = this.projects.findIndex((p) => p.id === project.id);
    if (idx >= 0) {
      this.projects[idx] = project;
    } else {
      this.projects.push(project);
    }
    this.notifyListeners();

    const baseUrl = getApiUrl();
    fetch(`${baseUrl}/api/projects`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(project),
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((savedProj) => {
        if (savedProj && savedProj.id) {
          const freshIdx = this.projects.findIndex((p) => p.id === project.id || p.projectNumber === project.projectNumber || p.id === savedProj.id);
          if (freshIdx >= 0) this.projects[freshIdx] = savedProj;
          this.notifyListeners();
        }
      })
      .catch((e) => console.warn('saveProject API notice:', e));

    return project;
  }

  deleteProject(id: string) {
    this.projects = this.projects.filter((p) => p.id !== id);
    this.notifyListeners();
    const baseUrl = getApiUrl();
    fetch(`${baseUrl}/api/projects/${id}`, { method: 'DELETE' }).catch(console.warn);
  }

  // Installed Equipment Registry
  getInstalledItemsByCustomer(customerId: string): InstalledItem[] {
    return this.installedItems.filter((item) => item.customerId === customerId);
  }

  getAllInstalledItems(): InstalledItem[] {
    return [...this.installedItems];
  }

  saveInstalledItem(item: InstalledItem): InstalledItem {
    const idx = this.installedItems.findIndex((i) => i.id === item.id);
    if (idx >= 0) {
      this.installedItems[idx] = item;
    } else {
      this.installedItems.push(item);
    }
    this.notifyListeners();

    const baseUrl = getApiUrl();
    fetch(`${baseUrl}/api/installed-items`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(item),
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((savedItem) => {
        if (savedItem && savedItem.id) {
          const freshIdx = this.installedItems.findIndex((i) => i.id === item.id || i.id === savedItem.id);
          if (freshIdx >= 0) this.installedItems[freshIdx] = savedItem;
          this.notifyListeners();
        }
      })
      .catch((e) => console.warn('saveInstalledItem API notice:', e));

    return item;
  }

  deleteInstalledItem(id: string) {
    this.installedItems = this.installedItems.filter((i) => i.id !== id);
    this.notifyListeners();
    const baseUrl = getApiUrl();
    fetch(`${baseUrl}/api/installed-items/${id}`, { method: 'DELETE' }).catch(console.warn);
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
    this.notifyListeners();

    const baseUrl = getApiUrl();
    fetch(`${baseUrl}/api/service-tickets`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(ticket),
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((savedTicket) => {
        if (savedTicket && savedTicket.id) {
          const freshIdx = this.serviceTickets.findIndex((t) => t.id === ticket.id || t.ticketNumber === ticket.ticketNumber || t.id === savedTicket.id);
          if (freshIdx >= 0) this.serviceTickets[freshIdx] = savedTicket;
          this.notifyListeners();
        }
      })
      .catch((e) => console.warn('saveServiceTicket API notice:', e));

    return ticket;
  }

  deleteServiceTicket(id: string) {
    this.serviceTickets = this.serviceTickets.filter((st) => st.id !== id);
    this.notifyListeners();
    const baseUrl = getApiUrl();
    fetch(`${baseUrl}/api/service-tickets/${id}`, { method: 'DELETE' }).catch(console.warn);
  }

  // Calendar Events Management
  getCalendarEvents(): CalendarEvent[] {
    const customEvents = [...this.calendarEvents];

    // Project Events (Generated from Projects startDate, installationDate, and targetDeliveryDate)
    const projectEvents: CalendarEvent[] = [];
    this.projects.forEach((p) => {
      const cust = p.customer || this.getCustomerById(p.customerId);
      const clientName = cust?.companyName || cust?.name || 'N/A';

      // 1. Project Start Event (appears on project start date)
      const startDateStr = p.startDate ? (typeof p.startDate === 'string' ? p.startDate.split('T')[0] : new Date(p.startDate).toISOString().split('T')[0]) : null;
      if (startDateStr) {
        projectEvents.push({
          id: `proj-start-${p.id}`,
          title: `Project Start: ${p.projectNumber}`,
          description: `Status: ${p.status} | Client: ${clientName}`,
          startDate: startDateStr,
          allDay: true,
          eventType: 'PROJECT',
          customerId: p.customerId,
          customer: cust,
          projectId: p.id,
          location: p.installationAddress,
          color: p.status === 'COMPLETED' ? 'emerald' : p.status === 'INSTALLATION' ? 'amber' : 'blue',
          createdAt: p.createdAt,
        });
      }

      // 2. Installation Event (if installation date is set and different from start date)
      const installDateStr = p.installationDate ? (typeof p.installationDate === 'string' ? p.installationDate.split('T')[0] : new Date(p.installationDate).toISOString().split('T')[0]) : null;
      if (installDateStr && installDateStr !== startDateStr) {
        projectEvents.push({
          id: `proj-install-${p.id}`,
          title: `Installation: ${p.projectNumber}`,
          description: `Status: ${p.status} | Contact: ${p.installationContact || clientName}`,
          startDate: installDateStr,
          allDay: true,
          eventType: 'INSTALLATION',
          customerId: p.customerId,
          customer: cust,
          projectId: p.id,
          location: p.installationAddress,
          color: 'amber',
          createdAt: p.createdAt,
        });
      }

      // 3. Target Delivery Event (if target delivery date is set and different from start/installation date)
      const deliveryDateStr = p.targetDeliveryDate ? (typeof p.targetDeliveryDate === 'string' ? p.targetDeliveryDate.split('T')[0] : new Date(p.targetDeliveryDate).toISOString().split('T')[0]) : null;
      if (deliveryDateStr && deliveryDateStr !== startDateStr && deliveryDateStr !== installDateStr) {
        projectEvents.push({
          id: `proj-delivery-${p.id}`,
          title: `Target Delivery: ${p.projectNumber}`,
          description: `Status: ${p.status} | Client: ${clientName}`,
          startDate: deliveryDateStr,
          allDay: true,
          eventType: 'PROJECT',
          customerId: p.customerId,
          customer: cust,
          projectId: p.id,
          location: p.installationAddress,
          color: p.status === 'COMPLETED' ? 'emerald' : 'purple',
          createdAt: p.createdAt,
        });
      }

      // Fallback: If project has no start/install/delivery dates, show on createdAt date
      if (!startDateStr && !installDateStr && !deliveryDateStr && p.createdAt) {
        const createdDateStr = p.createdAt.split('T')[0];
        projectEvents.push({
          id: `proj-created-${p.id}`,
          title: `Project: ${p.projectNumber}`,
          description: `Status: ${p.status} | Client: ${clientName}`,
          startDate: createdDateStr,
          allDay: true,
          eventType: 'PROJECT',
          customerId: p.customerId,
          customer: cust,
          projectId: p.id,
          location: p.installationAddress,
          color: 'blue',
          createdAt: p.createdAt,
        });
      }
    });

    // Service Ticket Events (Generated from Service Tickets scheduledDate)
    const serviceEvents: CalendarEvent[] = this.serviceTickets
      .filter((s) => s.scheduledDate)
      .map((s) => {
        const cust = s.customer || this.getCustomerById(s.customerId);
        return {
          id: `serv-event-${s.id}`,
          title: `Service: ${s.ticketNumber} (${s.priority})`,
          description: `Defect: ${s.defectDescription} | Tech: ${s.assignedTechnician?.fullName || 'Unassigned'}`,
          startDate: s.scheduledDate!,
          allDay: !s.scheduledDate?.includes('T'),
          eventType: 'SERVICE',
          customerId: s.customerId,
          customer: cust,
          serviceTicketId: s.id,
          color: s.priority === 'URGENT' || s.priority === 'HIGH' ? 'red' : 'purple',
          createdAt: s.createdAt,
        };
      });

    return [...customEvents, ...projectEvents, ...serviceEvents];
  }

  saveCalendarEvent(event: CalendarEvent): CalendarEvent {
    const idx = this.calendarEvents.findIndex((e) => e.id === event.id);
    if (idx >= 0) {
      this.calendarEvents[idx] = event;
    } else {
      this.calendarEvents.push(event);
    }
    if (typeof window !== 'undefined') {
      localStorage.setItem('imfex_calendar_events', JSON.stringify(this.calendarEvents));
    }
    this.notifyListeners();

    const baseUrl = getApiUrl();
    fetch(`${baseUrl}/api/calendar-events`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(event),
    }).catch(console.warn);

    return event;
  }

  deleteCalendarEvent(id: string) {
    this.calendarEvents = this.calendarEvents.filter((e) => e.id !== id);
    if (typeof window !== 'undefined') {
      localStorage.setItem('imfex_calendar_events', JSON.stringify(this.calendarEvents));
    }
    this.notifyListeners();

    const baseUrl = getApiUrl();
    fetch(`${baseUrl}/api/calendar-events/${id}`, {
      method: 'DELETE',
    }).catch(console.warn);
  }
}

export const imfexStore = new ImfexStore();

export function useImfexStore() {
  const [_, setTick] = useState(0);
  useEffect(() => {
    return imfexStore.subscribe(() => setTick((t) => t + 1));
  }, []);
}
