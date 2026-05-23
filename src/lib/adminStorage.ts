import { productsData, loadsData } from '../data';
import { AnyModel, CanvasNode, LoadModel } from '../types';

export type ProductCategory = 'pv' | 'mppt' | 'battery' | 'inverter' | 'generator';

export type ProductCatalog = typeof productsData;

export interface BusinessSettings {
  companyName: string;
  phone: string;
  whatsapp: string;
  address: string;
  quoteValidityDays: number;
  accessoriesRate: number;
  installationRate: number;
  currency: string;
  adminPassword: string;
}

export interface CustomerRecord {
  id: string;
  name: string;
  phone: string;
  province: string;
  address: string;
  notes: string;
  createdAt: string;
}

export interface SavedProject {
  id: string;
  customerId: string;
  name: string;
  notes: string;
  nodes: CanvasNode[];
  cityKey: string;
  seasonKey: string;
  isGenEnabled: boolean;
  totalCost: number;
  createdAt: string;
  updatedAt: string;
}

export interface AdminState {
  catalog: ProductCatalog;
  loads: LoadModel[];
  customers: CustomerRecord[];
  projects: SavedProject[];
  settings: BusinessSettings;
}

export const defaultBusinessSettings: BusinessSettings = {
  companyName: 'Solar Smart Simulator',
  phone: '+964 770 000 0000',
  whatsapp: '9647700000000',
  address: 'العراق',
  quoteValidityDays: 7,
  accessoriesRate: 15,
  installationRate: 8,
  currency: '$',
  adminPassword: 'admin1234'
};

const STORAGE_KEY = 'solar-smart-admin-state-v1';

const cloneCatalog = (): ProductCatalog => JSON.parse(JSON.stringify(productsData));
const cloneLoads = (): LoadModel[] => JSON.parse(JSON.stringify(loadsData));

export const createEmptyAdminState = (): AdminState => ({
  catalog: cloneCatalog(),
  loads: cloneLoads(),
  customers: [],
  projects: [],
  settings: defaultBusinessSettings
});

export const loadAdminState = (): AdminState => {
  if (typeof window === 'undefined') return createEmptyAdminState();

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return createEmptyAdminState();
    const parsed = JSON.parse(raw) as Partial<AdminState>;

    return {
      catalog: parsed.catalog || cloneCatalog(),
      loads: parsed.loads || cloneLoads(),
      customers: parsed.customers || [],
      projects: parsed.projects || [],
      settings: { ...defaultBusinessSettings, ...(parsed.settings || {}) }
    };
  } catch {
    return createEmptyAdminState();
  }
};

export const saveAdminState = (state: AdminState) => {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
};

export const makeId = (prefix: string) => `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;

export const getAllManagedModels = (state: AdminState): AnyModel[] => [
  ...state.catalog.pv,
  ...state.catalog.mppt,
  ...state.catalog.battery,
  ...state.catalog.inverter,
  ...state.catalog.generator,
  ...state.loads
];

export const hydrateNodesFromCatalog = (nodes: CanvasNode[], state: AdminState): CanvasNode[] => {
  const modelLookup = new Map(getAllManagedModels(state).map((model) => [model.id, model]));
  return nodes.map((node) => {
    const updatedModel = modelLookup.get(node.model.id);
    return updatedModel ? { ...node, model: updatedModel } : node;
  });
};

export const createCustomer = (input: Omit<CustomerRecord, 'id' | 'createdAt'>): CustomerRecord => ({
  ...input,
  id: makeId('customer'),
  createdAt: new Date().toISOString()
});

export const createSavedProject = (input: Omit<SavedProject, 'id' | 'createdAt' | 'updatedAt'>): SavedProject => {
  const now = new Date().toISOString();
  return {
    ...input,
    id: makeId('project'),
    createdAt: now,
    updatedAt: now
  };
};
