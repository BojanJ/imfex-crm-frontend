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

// Pre-populated initial user profiles with production credentials
const INITIAL_PROFILES: UserProfile[] = [
  {
    id: 'usr-admin-1',
    email: 'admin@imfex.com',
    fullName: 'Супер Администратор',
    role: 'SUPER_ADMIN',
    password: 'admin123',
    mustChangePassword: false,
    status: 'ACTIVE',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'usr-agent-2',
    email: 'sales@imfex.com',
    fullName: 'Менаџер за Продажба',
    role: 'USER',
    password: 'sales123',
    mustChangePassword: false,
    status: 'ACTIVE',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'usr-tech-3',
    email: 'tech@imfex.com',
    fullName: 'Главен Теренски Техничар',
    role: 'USER',
    password: 'tech123',
    mustChangePassword: false,
    status: 'ACTIVE',
    createdAt: new Date().toISOString(),
  },
];

const INITIAL_PRODUCTS: Product[] = [
  {
    id: 'prod-gar-01',
    name: 'Сегментна Гаражна Врата',
    code: 'GARAGE-SEC-40',
    description: 'Двослојни топлински изолирани челични панели (дебелина 40мм) со полиуретанско јадро.',
    isActive: true,
    models: [
      { id: 'mod-gar-1', productId: 'prod-gar-01', name: 'ThermoPro Стандардна (40мм)', basePrice: 850 },
      { id: 'mod-gar-2', productId: 'prod-gar-01', name: 'UltraShield Екстремна (60мм)', basePrice: 1250 },
      { id: 'mod-gar-3', productId: 'prod-gar-01', name: 'Панорамска Стаклена Плоча Pro', basePrice: 1600 },
    ],
    specificationKeys: [
      {
        id: 'spec-gar-panel',
        productId: 'prod-gar-01',
        name: 'Површина и Завршница на Панел',
        inputType: 'SELECT',
        options: [
          { id: 'opt-gar-p1', specificationKeyId: 'spec-gar-panel', label: 'Стуко Втиснат (Стандардна Бела)', priceModifier: 0 },
          { id: 'opt-gar-p2', specificationKeyId: 'spec-gar-panel', label: 'Мазна Мат - RAL 7016 Антрацит', priceModifier: 95 },
          { id: 'opt-gar-p3', specificationKeyId: 'spec-gar-panel', label: 'Златен Даб Дрвен Декор', priceModifier: 160 },
          { id: 'opt-gar-p4', specificationKeyId: 'spec-gar-panel', label: 'Микро-Ребрест Темно Бронзен', priceModifier: 180 },
        ],
      },
      {
        id: 'spec-gar-motor',
        productId: 'prod-gar-01',
        name: 'Автоматизиран Мотор и Погон',
        inputType: 'SELECT',
        options: [
          { id: 'opt-gar-m1', specificationKeyId: 'spec-gar-motor', label: 'Рачно Управување (Со синџир и брава)', priceModifier: 0 },
          { id: 'opt-gar-m2', specificationKeyId: 'spec-gar-motor', label: 'Somfy Dexxo Optimo Паметен Мотор (+2 далечински)', priceModifier: 240 },
          { id: 'opt-gar-m3', specificationKeyId: 'spec-gar-motor', label: 'Hörmann SupraMatic E Брз Погон', priceModifier: 390 },
        ],
      },
      {
        id: 'spec-gar-window',
        productId: 'prod-gar-01',
        name: 'Вградени Прозорци',
        inputType: 'SELECT',
        options: [
          { id: 'opt-gar-w1', specificationKeyId: 'spec-gar-window', label: 'Без Прозорци', priceModifier: 0 },
          { id: 'opt-gar-w2', specificationKeyId: 'spec-gar-window', label: '2x Правоаголни Двослојни Акрилни Прозорци', priceModifier: 110 },
          { id: 'opt-gar-w3', specificationKeyId: 'spec-gar-window', label: 'Инокс Рамка со Тркалезно Стакло (x3)', priceModifier: 220 },
        ],
      },
      {
        id: 'spec-gar-color',
        productId: 'prod-gar-01',
        name: 'Сопствена RAL Шифра за Боја',
        inputType: 'TEXT',
        options: [],
      },
    ],
  },
  {
    id: 'prod-win-02',
    name: 'Алуминиумски Архитектонски Прозорски Систем',
    code: 'WIN-ALU-90',
    description: 'Високоперформансен термалски изолиран алуминиумски профил.',
    isActive: true,
    models: [
      { id: 'mod-win-1', productId: 'prod-win-02', name: 'AluProf MB-70 Стандард', basePrice: 420 },
      { id: 'mod-win-2', productId: 'prod-win-02', name: 'Schüco AWS 75.SI Висока Изолација', basePrice: 680 },
    ],
    specificationKeys: [
      {
        id: 'spec-win-glass',
        productId: 'prod-win-02',
        name: 'Тип на Стаклопакет',
        inputType: 'SELECT',
        options: [
          { id: 'opt-win-g1', specificationKeyId: 'spec-win-glass', label: 'Двослојно Нискоемисионо (Ug 1.1)', priceModifier: 0 },
          { id: 'opt-win-g2', specificationKeyId: 'spec-win-glass', label: 'Трослојно Акустично и Соларно (Ug 0.5)', priceModifier: 130 },
          { id: 'opt-win-g3', specificationKeyId: 'spec-win-glass', label: 'Ламинирано Стакло Отпорно на Удари', priceModifier: 350 },
        ],
      },
      {
        id: 'spec-win-hardware',
        productId: 'prod-win-02',
        name: 'Оков и Механизам за Отварање',
        inputType: 'SELECT',
        options: [
          { id: 'opt-win-h1', specificationKeyId: 'spec-win-hardware', label: 'Нагибно-Вртлив Скриен Оков', priceModifier: 0 },
          { id: 'opt-win-h2', specificationKeyId: 'spec-win-hardware', label: 'Паралелно Лизгачки и Нагибен (PST)', priceModifier: 210 },
        ],
      },
    ],
  },
  {
    id: 'prod-shu-03',
    name: 'Екструдирана Сигурносна Ролетна',
    code: 'SHU-SEC-55',
    description: 'Зајакната алуминиумска ролетна за комерцијална и станбена безбедност.',
    isActive: true,
    models: [
      { id: 'mod-shu-1', productId: 'prod-shu-03', name: 'ShutterGuard 55 Стандард', basePrice: 310 },
      { id: 'mod-shu-2', productId: 'prod-shu-03', name: 'ShutterGuard 77 Индустриска Тешка', basePrice: 540 },
    ],
    specificationKeys: [
      {
        id: 'spec-shu-control',
        productId: 'prod-shu-03',
        name: 'Механизам за Управување',
        inputType: 'SELECT',
        options: [
          { id: 'opt-shu-c1', specificationKeyId: 'spec-shu-control', label: 'Жичен Ѕиден Прекинувач', priceModifier: 0 },
          { id: 'opt-shu-c2', specificationKeyId: 'spec-shu-control', label: 'Радио Далечинско Управување + Мобилна Апликација', priceModifier: 125 },
        ],
      },
    ],
  },
];

const INITIAL_CUSTOMERS: Customer[] = [
  {
    id: 'cust-1',
    customerType: 'COMPANY',
    name: 'Логистички Центар Скопје ДООЕЛ',
    companyName: 'Логистички Центар Скопје ДООЕЛ',
    taxId: 'MK4030012345678',
    email: 'nabavki@logistika.mk',
    phone: '+389 2 3123 456',
    address: 'Ул. Индустриска бр. 42',
    city: 'Скопје',
    notes: 'Главен комерцијален клиент. Стандардно фактурирање со 18% ДДВ.',
    createdAt: '2026-06-10T10:00:00.000Z',
  },
  {
    id: 'cust-2',
    customerType: 'INDIVIDUAL',
    name: 'Александар Стојановски',
    email: 'alex.stojanovski@gmail.com',
    phone: '+389 70 888 999',
    address: 'Ул. Партизански Одреди 74',
    city: 'Скопје',
    notes: 'Реновирање на приватна вила.',
    createdAt: '2026-07-01T14:30:00.000Z',
  },
  {
    id: 'cust-3',
    customerType: 'PARTNER',
    name: 'Апекс Градежни Солуции ДОО',
    companyName: 'Апекс Градежни Солуции ДОО',
    taxId: 'MK4080098765432',
    email: 'tenders@apeks.mk',
    phone: '+389 31 455 100',
    address: 'Ул. Гоце Делчев бб',
    city: 'Битола',
    notes: 'Партнер подизведувач за индустриски врати.',
    createdAt: '2026-07-15T09:15:00.000Z',
  },
];

const INITIAL_OFFERS: Offer[] = [
  {
    id: 'off-1',
    offerNumber: 'OFF-2026-0001',
    customerId: 'cust-1',
    customer: INITIAL_CUSTOMERS[0],
    createdByUserId: 'usr-admin-1',
    status: 'SENT',
    taxRate: 18.00,
    discountRate: 5.00,
    discountAmount: 127.00,
    subtotal: 2540.00,
    taxAmount: 434.34,
    totalAmount: 2847.34,
    validUntil: '2026-08-31',
    createdAt: '2026-07-20T11:00:00.000Z',
    items: [
      {
        id: 'item-1',
        offerId: 'off-1',
        serviceTypes: ['PRODUCT', 'INSTALLATION'],
        productId: 'prod-gar-01',
        productModelId: 'mod-gar-1',
        customTitle: 'Сегментна Гаражна Врата (Магацинска Врата 1)',
        widthMm: 4500,
        heightMm: 3200,
        quantity: 2,
        unitPrice: 1170.00,
        totalPrice: 2340.00,
        specifications: [
          { specificationKeyId: 'spec-gar-panel', specificationOptionId: 'opt-gar-p2' },
          { specificationKeyId: 'spec-gar-motor', specificationOptionId: 'opt-gar-m2' },
          { specificationKeyId: 'spec-gar-color', customValue: 'RAL 7016 Антрацит' },
        ],
      },
      {
        id: 'item-2',
        offerId: 'off-1',
        serviceTypes: ['SERVICE'],
        customTitle: 'Годишен Сервисен Преглед и Пакет за Одржување на Мотор',
        quantity: 1,
        unitPrice: 200.00,
        totalPrice: 200.00,
        specifications: [],
      },
    ],
  },
];

const INITIAL_DOCUMENTS: ClientDocument[] = [
  {
    id: 'doc-1',
    customerId: 'cust-1',
    offerId: 'off-1',
    title: 'Понуда OFF-2026-0001.pdf',
    fileType: 'PDF',
    fileUrl: '/docs/OFF-2026-0001.pdf',
    createdAt: '2026-07-20T11:05:00.000Z',
  },
];

const INITIAL_PROJECTS: Project[] = [
  {
    id: 'proj-1',
    projectNumber: 'PRJ-2026-0001',
    offerId: 'off-1',
    customerId: 'cust-1',
    customer: INITIAL_CUSTOMERS[0],
    responsibleUserId: 'usr-admin-1',
    responsibleUser: INITIAL_PROFILES[0],
    status: 'INSTALLATION',
    startDate: '2026-07-22',
    targetDeliveryDate: '2026-08-10',
    procurementStatus: 'IN_PRODUCTION',
    procurementNotes: 'Челичните панели се порачани од фабрика. Сетовите за мотори се во локален магацин.',
    installationTeam: 'Тим Алфа (Раководител: tech@imfex.com)',
    installationDate: '2026-08-12',
    installationAddress: 'Ул. Индустриска бр. 42, Скопје - Врата 1',
    installationContact: 'Михаил Бауер (+389 70 123 456)',
    installationMinutes: 'Предмонтажен увид завршен. Носечките шини се подготвени.',
    createdAt: '2026-07-21T09:00:00.000Z',
  },
];

const INITIAL_INSTALLED_ITEMS: InstalledItem[] = [
  {
    id: 'inst-1',
    customerId: 'cust-1',
    projectId: 'proj-1',
    productId: 'prod-gar-01',
    title: 'Сегментна Гаражна Врата - ThermoPro 40мм (Магацинска Врата 1)',
    serialNumber: 'GAR-2026-8849',
    installationDate: '2026-06-15',
  },
];

const INITIAL_SERVICE_TICKETS: ServiceTicket[] = [
  {
    id: 'srv-1',
    ticketNumber: 'SRV-2026-0001',
    customerId: 'cust-1',
    customer: INITIAL_CUSTOMERS[0],
    installedItemId: 'inst-1',
    installedItem: INITIAL_INSTALLED_ITEMS[0],
    defectDescription: 'Безбедносниот сензор за мотор не е порамнет. Вратата се враќа назад при автоматско затворање.',
    priority: 'HIGH',
    status: 'ASSIGNED',
    assignedTechnicianId: 'usr-tech-3',
    assignedTechnician: INITIAL_PROFILES[2],
    scheduledDate: '2026-07-25T14:00:00',
    partsConsumed: [
      { id: 'p1', name: 'Порамнувачки држач за опто-сензор', code: 'SNS-BRK-01', quantity: 1, unitCost: 35.00 },
    ],
    laborHours: 1.5,
    solution: 'Рекалибрирани држачи за оптички сензор и подмачкани водечки ролери.',
    createdAt: '2026-07-23T08:30:00.000Z',
  },
];

class ImfexStore {
  private products: Product[] = INITIAL_PRODUCTS;
  private customers: Customer[] = INITIAL_CUSTOMERS;
  private offers: Offer[] = INITIAL_OFFERS;
  private profiles: UserProfile[] = INITIAL_PROFILES;
  private projects: Project[] = INITIAL_PROJECTS;
  private serviceTickets: ServiceTicket[] = INITIAL_SERVICE_TICKETS;
  private installedItems: InstalledItem[] = INITIAL_INSTALLED_ITEMS;
  private documents: ClientDocument[] = INITIAL_DOCUMENTS;
  private currentUser: UserProfile | null = null;

  constructor() {
    if (typeof window !== 'undefined') {
      this.loadFromLocalStorage();
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
          return data.user;
        } else {
          return null; // Invalid credentials returned by backend API
        }
      } catch (err) {
        console.warn('Backend API login offline, using strict local auth:', err);
      }
    }

    // 2. Local Strict Password Authentication Fallback
    const found = this.profiles.find((p) => p.email.toLowerCase() === cleanEmail && p.status !== 'DISABLED');
    if (found) {
      // Enforce strict password validation
      if (found.password && found.password !== cleanPassword) {
        return null; // Invalid password
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
        return null; // Reject invalid password
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
      responsibleUser: this.currentUser || this.profiles[0],
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
    return ticket;
  }
}

export const imfexStore = new ImfexStore();
