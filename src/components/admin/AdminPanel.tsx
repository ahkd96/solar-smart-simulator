import React, { useEffect, useMemo, useState } from 'react';
import { CanvasNode, LoadModel } from '../../types';
import {
  AdminState,
  CustomerRecord,
  ProductCategory,
  SavedProject,
  createCustomer,
  createEmptyAdminState,
  createSavedProject,
  makeId
} from '../../lib/adminStorage';

type AdminTab = 'overview' | 'customers' | 'projects' | 'catalog' | 'settings';
type ManageCategory = ProductCategory | 'load';
type AdminNotice = { type: 'success' | 'warning'; text: string };
type ProjectEditForm = { customerId: string; name: string; notes: string };
type CustomerForm = Omit<CustomerRecord, 'id' | 'createdAt'>;
type ProductForm = {
  brand: string;
  model: string;
  name: string;
  price: string;
  warranty: string;
  power: string;
  description: string;
};

interface AdminPanelProps {
  isOpen: boolean;
  onClose: () => void;
  adminState: AdminState;
  onAdminStateChange: (state: AdminState) => void;
  nodes: CanvasNode[];
  calcs: Record<string, any>;
  cityKey: string;
  seasonKey: string;
  isGenEnabled: boolean;
  theme: 'light' | 'dark';
  onLoadProject: (project: SavedProject) => void;
  onOpenReport: () => void;
}

const tabs: Array<{ key: AdminTab; label: string; icon: string }> = [
  { key: 'overview', label: 'نظرة عامة', icon: 'fa-chart-pie' },
  { key: 'customers', label: 'الزبائن', icon: 'fa-users' },
  { key: 'projects', label: 'المشاريع', icon: 'fa-folder-open' },
  { key: 'catalog', label: 'المنتجات', icon: 'fa-boxes-stacked' },
  { key: 'settings', label: 'الإعدادات', icon: 'fa-sliders' }
];

const categoryOptions: Array<{ key: ManageCategory; label: string; icon: string; tone: string }> = [
  { key: 'pv', label: 'الألواح', icon: 'fa-solar-panel', tone: 'text-amber-400 border-amber-500/30' },
  { key: 'mppt', label: 'MPPT', icon: 'fa-microchip', tone: 'text-orange-400 border-orange-500/30' },
  { key: 'battery', label: 'البطاريات', icon: 'fa-battery-three-quarters', tone: 'text-emerald-400 border-emerald-500/30' },
  { key: 'inverter', label: 'الانفرترات', icon: 'fa-arrows-spin', tone: 'text-cyan-400 border-cyan-500/30' },
  { key: 'generator', label: 'المولدات', icon: 'fa-gears', tone: 'text-purple-400 border-purple-500/30' },
  { key: 'load', label: 'الأحمال', icon: 'fa-plug-circle-bolt', tone: 'text-rose-400 border-rose-500/30' }
];

const ADMIN_SESSION_KEY = 'solar-smart-admin-unlocked';

const provinceOptions = ['بغداد', 'ديالى', 'البصرة', 'أربيل', 'الموصل', 'النجف', 'كربلاء', 'بابل', 'واسط', 'كركوك'];

const getModelTitle = (item: any) => item.name || `${item.brand || ''} ${item.model || ''}`.trim();
const getModelSubtitle = (item: any) => item.desc || item.specsText || item.type || item.fuelType || '';

const createEmptyProductForm = (): ProductForm => ({
  brand: '',
  model: '',
  name: '',
  price: '',
  warranty: '',
  power: '',
  description: ''
});

const getProductPowerValue = (category: ManageCategory, item: any) => {
  if (category === 'mppt') return item.maxCurrent || 0;
  if (category === 'battery') return item.energy || 0;
  return item.power || 0;
};

const getProductPowerLabel = (category: ManageCategory) => {
  if (category === 'mppt') return 'تيار الشحن A';
  if (category === 'battery') return 'الطاقة Wh';
  if (category === 'load') return 'القدرة W';
  return 'القدرة W';
};

const productFormFromItem = (category: ManageCategory, item: any): ProductForm => ({
  brand: item.brand || '',
  model: item.model || '',
  name: item.name || '',
  price: String(item.price || 0),
  warranty: String(item.warranty || 0),
  power: String(getProductPowerValue(category, item)),
  description: item.desc || item.specsText || ''
});

const buildProductItem = (category: ManageCategory, form: ProductForm, existing?: any) => {
  const id = existing?.id || makeId(category);
  const price = Number(form.price || 0);
  const warranty = Number(form.warranty || 0);
  const mainValue = Number(form.power || 0);
  const brand = form.brand.trim() || existing?.brand || 'منتج جديد';
  const model = form.model.trim() || existing?.model || form.name.trim() || 'موديل جديد';
  const name = form.name.trim() || existing?.name || `${brand} ${model}`.trim();
  const description = form.description.trim() || existing?.desc || existing?.specsText || 'عنصر مضاف من لوحة التحكم';

  if (category === 'load') {
    return {
      ...(existing || {}),
      id,
      name,
      power: mainValue || existing?.power || 100,
      defaultQty: existing?.defaultQty || 1,
      dayHours: existing?.dayHours ?? 4,
      nightHours: existing?.nightHours ?? 2,
      iconClass: existing?.iconClass || 'fa-solid fa-plug',
      colorClass: existing?.colorClass || 'blue-text',
      price,
      desc: description
    };
  }

  if (category === 'pv') {
    return {
      ...(existing || {}),
      id,
      brand,
      model,
      power: mainValue || existing?.power || 550,
      voc: existing?.voc || 50,
      isc: existing?.isc || 14,
      vmp: existing?.vmp || 42,
      imp: existing?.imp || 13,
      eff: existing?.eff || 21,
      price,
      warranty,
      specsText: description
    };
  }

  if (category === 'mppt') {
    return {
      ...(existing || {}),
      id,
      brand,
      model,
      maxCurrent: mainValue || existing?.maxCurrent || 60,
      maxPvVoc: existing?.maxPvVoc || 150,
      batteryVoltage: existing?.batteryVoltage || '12V/24V/48V Auto',
      price,
      warranty,
      specsText: description
    };
  }

  if (category === 'battery') {
    const energy = mainValue || existing?.energy || 5120;
    return {
      ...(existing || {}),
      id,
      brand,
      model,
      chemistry: existing?.chemistry || 'Lithium (LFP)',
      capacity: existing?.capacity || 100,
      voltage: existing?.voltage || 51.2,
      energy,
      dod: existing?.dod || 80,
      price,
      warranty,
      specsText: description
    };
  }

  if (category === 'inverter') {
    return {
      ...(existing || {}),
      id,
      brand,
      model,
      power: mainValue || existing?.power || 5000,
      type: existing?.type || 'Hybrid',
      batVoltage: existing?.batVoltage || 48,
      maxPvVoc: existing?.maxPvVoc || 500,
      minPvVoc: existing?.minPvVoc || 120,
      efficiency: existing?.efficiency || 95,
      price,
      warranty,
      specsText: description
    };
  }

  return {
    ...(existing || {}),
    id,
    brand,
    model,
    power: mainValue || existing?.power || 5000,
    fuelType: existing?.fuelType || 'ديزل',
    price,
    warranty,
    specsText: description
  };
};

export default function AdminPanel({
  isOpen,
  onClose,
  adminState,
  onAdminStateChange,
  nodes,
  calcs,
  cityKey,
  seasonKey,
  isGenEnabled,
  theme,
  onLoadProject,
  onOpenReport
}: AdminPanelProps) {
  const [activeTab, setActiveTab] = useState<AdminTab>('overview');
  const [activeCategory, setActiveCategory] = useState<ManageCategory>('pv');
  const [customerForm, setCustomerForm] = useState({
    name: '',
    phone: '',
    province: provinceOptions[0],
    address: '',
    notes: ''
  });
  const [editingCustomerId, setEditingCustomerId] = useState<string | null>(null);
  const [customerEditForm, setCustomerEditForm] = useState<CustomerForm>({
    name: '',
    phone: '',
    province: provinceOptions[0],
    address: '',
    notes: ''
  });
  const [projectForm, setProjectForm] = useState({
    customerId: '',
    name: '',
    notes: ''
  });
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null);
  const [projectEditForm, setProjectEditForm] = useState<ProjectEditForm>({
    customerId: '',
    name: '',
    notes: ''
  });
  const [showProductForm, setShowProductForm] = useState(false);
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [productForm, setProductForm] = useState<ProductForm>(() => createEmptyProductForm());
  const [settingsDraft, setSettingsDraft] = useState<AdminState['settings']>(() => adminState.settings);
  const [isUnlocked, setIsUnlocked] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.sessionStorage.getItem(ADMIN_SESSION_KEY) === 'true';
  });
  const [passwordInput, setPasswordInput] = useState('');
  const [lockError, setLockError] = useState('');
  const [notice, setNotice] = useState<AdminNotice | null>(null);

  const selectedCustomer = useMemo<CustomerRecord | undefined>(() => {
    return adminState.customers.find((customer) => customer.id === projectForm.customerId) || adminState.customers[0];
  }, [adminState.customers, projectForm.customerId]);

  const activeItems = activeCategory === 'load'
    ? adminState.loads
    : adminState.catalog[activeCategory];

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(null), 3800);
    return () => window.clearTimeout(timer);
  }, [notice]);

  useEffect(() => {
    setShowProductForm(false);
    setEditingProductId(null);
    setProductForm(createEmptyProductForm());
  }, [activeCategory]);

  useEffect(() => {
    setSettingsDraft(adminState.settings);
  }, [adminState.settings]);

  const formatMoney = (value: number) => {
    const numberValue = Number(value || 0).toLocaleString('en-US', { maximumFractionDigits: 0 });
    return `${adminState.settings.currency} ${numberValue}`;
  };

  const updateSettingsDraft = (key: keyof AdminState['settings'], value: string | number) => {
    setSettingsDraft((prev) => ({
      ...prev,
      [key]: value
    }));
  };

  const handleSaveSettings = () => {
    onAdminStateChange({
      ...adminState,
      settings: {
        ...settingsDraft,
        quoteValidityDays: Number(settingsDraft.quoteValidityDays || 0),
        accessoriesRate: Number(settingsDraft.accessoriesRate || 0),
        installationRate: Number(settingsDraft.installationRate || 0),
        adminPassword: settingsDraft.adminPassword || 'admin1234'
      }
    });
    showNotice('تم حفظ الإعدادات بشكل مستقل عن المشاريع.');
  };

  const showNotice = (text: string, type: AdminNotice['type'] = 'success') => {
    setNotice({ text, type });
  };

  const handleUnlockAdmin = (event: React.FormEvent) => {
    event.preventDefault();
    const configuredPassword = adminState.settings.adminPassword || 'admin1234';
    if (passwordInput === configuredPassword) {
      window.sessionStorage.setItem(ADMIN_SESSION_KEY, 'true');
      setIsUnlocked(true);
      setPasswordInput('');
      setLockError('');
      showNotice('تم فتح لوحة التحكم بنجاح.');
      return;
    }

    setLockError('كلمة المرور غير صحيحة.');
  };

  const handleLockAdmin = () => {
    window.sessionStorage.removeItem(ADMIN_SESSION_KEY);
    setIsUnlocked(false);
    setPasswordInput('');
    setLockError('');
    setNotice(null);
  };

  const handleAddCustomer = () => {
    if (!customerForm.name.trim()) {
      window.alert('اكتب اسم الزبون أولاً.');
      return;
    }

    const customer = createCustomer({
      name: customerForm.name.trim(),
      phone: customerForm.phone.trim(),
      province: customerForm.province,
      address: customerForm.address.trim(),
      notes: customerForm.notes.trim()
    });

    onAdminStateChange({
      ...adminState,
      customers: [customer, ...adminState.customers]
    });
    setProjectForm((prev) => ({ ...prev, customerId: customer.id }));
    setCustomerForm({ name: '', phone: '', province: provinceOptions[0], address: '', notes: '' });
    showNotice(`تم إضافة الزبون "${customer.name}".`);
  };

  const handleDeleteCustomer = (customerId: string) => {
    if (!window.confirm('حذف الزبون سيحذف المشاريع المرتبطة به من التخزين المحلي. هل تريد المتابعة؟')) return;
    const customerName = adminState.customers.find((customer) => customer.id === customerId)?.name || 'الزبون';
    onAdminStateChange({
      ...adminState,
      customers: adminState.customers.filter((customer) => customer.id !== customerId),
      projects: adminState.projects.filter((project) => project.customerId !== customerId)
    });
    if (editingCustomerId === customerId) {
      setEditingCustomerId(null);
      setCustomerEditForm({ name: '', phone: '', province: provinceOptions[0], address: '', notes: '' });
    }
    showNotice(`تم حذف ${customerName} من قائمة الزبائن.`);
  };

  const handleStartEditCustomer = (customer: CustomerRecord) => {
    setEditingCustomerId(customer.id);
    setCustomerEditForm({
      name: customer.name,
      phone: customer.phone,
      province: customer.province,
      address: customer.address,
      notes: customer.notes
    });
    setNotice(null);
  };

  const handleCancelEditCustomer = () => {
    setEditingCustomerId(null);
    setCustomerEditForm({ name: '', phone: '', province: provinceOptions[0], address: '', notes: '' });
  };

  const handleUpdateCustomer = () => {
    if (!editingCustomerId) return;
    if (!customerEditForm.name.trim()) {
      showNotice('اكتب اسم الزبون قبل حفظ التعديل.', 'warning');
      return;
    }

    const updatedCustomer: CustomerRecord | undefined = adminState.customers.find((customer) => customer.id === editingCustomerId);
    if (!updatedCustomer) {
      handleCancelEditCustomer();
      showNotice('تعذر العثور على الزبون المطلوب تعديله.', 'warning');
      return;
    }

    const customer: CustomerRecord = {
      ...updatedCustomer,
      name: customerEditForm.name.trim(),
      phone: customerEditForm.phone.trim(),
      province: customerEditForm.province,
      address: customerEditForm.address.trim(),
      notes: customerEditForm.notes.trim()
    };

    onAdminStateChange({
      ...adminState,
      customers: adminState.customers.map((item) => item.id === editingCustomerId ? customer : item)
    });
    handleCancelEditCustomer();
    showNotice(`تم تعديل بيانات الزبون "${customer.name}".`);
  };

  const handleSaveProject = () => {
    const targetCustomerId = projectForm.customerId || selectedCustomer?.id;
    if (!targetCustomerId) {
      showNotice('أضف زبون أو اختر زبون قبل حفظ المشروع.', 'warning');
      setActiveTab('customers');
      return;
    }

    const project = createSavedProject({
      customerId: targetCustomerId,
      name: projectForm.name.trim() || `مشروع ${new Date().toLocaleDateString('ar-IQ')}`,
      notes: projectForm.notes.trim(),
      nodes,
      cityKey,
      seasonKey,
      isGenEnabled,
      totalCost: Number(calcs.grandTotal || 0)
    });

    onAdminStateChange({
      ...adminState,
      projects: [project, ...adminState.projects]
    });
    setProjectForm((prev) => ({ ...prev, name: '', notes: '' }));
    setActiveTab('projects');
    const customerName = adminState.customers.find((customer) => customer.id === targetCustomerId)?.name || 'الزبون المحدد';
    showNotice(`تم حفظ المشروع "${project.name}" ضمن أرشيف ${customerName}.`);
  };

  const handleDeleteProject = (projectId: string) => {
    if (!window.confirm('هل تريد حذف هذا المشروع المحفوظ؟')) return;
    onAdminStateChange({
      ...adminState,
      projects: adminState.projects.filter((project) => project.id !== projectId)
    });
    if (editingProjectId === projectId) {
      setEditingProjectId(null);
      setProjectEditForm({ customerId: '', name: '', notes: '' });
    }
  };

  const handleStartEditProject = (project: SavedProject) => {
    setEditingProjectId(project.id);
    setProjectEditForm({
      customerId: project.customerId,
      name: project.name,
      notes: project.notes
    });
    setNotice(null);
  };

  const handleCancelEditProject = () => {
    setEditingProjectId(null);
    setProjectEditForm({ customerId: '', name: '', notes: '' });
  };

  const handleUpdateProject = () => {
    if (!editingProjectId) return;

    const project = adminState.projects.find((item) => item.id === editingProjectId);
    if (!project) {
      showNotice('تعذر العثور على المشروع المطلوب تعديله.', 'warning');
      handleCancelEditProject();
      return;
    }

    if (!projectEditForm.customerId) {
      showNotice('اختر زبون للمشروع قبل حفظ التعديل.', 'warning');
      return;
    }

    if (!projectEditForm.name.trim()) {
      showNotice('اكتب اسم المشروع قبل حفظ التعديل.', 'warning');
      return;
    }

    const updatedProject: SavedProject = {
      ...project,
      customerId: projectEditForm.customerId,
      name: projectEditForm.name.trim(),
      notes: projectEditForm.notes.trim(),
      updatedAt: new Date().toISOString()
    };

    onAdminStateChange({
      ...adminState,
      projects: adminState.projects.map((item) => item.id === editingProjectId ? updatedProject : item)
    });
    handleCancelEditProject();
    showNotice(`تم تعديل المشروع "${updatedProject.name}" وحفظ التغييرات.`);
  };

  const updateManagedItem = (itemId: string, patch: Record<string, string | number>) => {
    if (activeCategory === 'load') {
      onAdminStateChange({
        ...adminState,
        loads: adminState.loads.map((item) => item.id === itemId ? { ...item, ...patch } as LoadModel : item)
      });
      return;
    }

    const category = activeCategory as ProductCategory;
    onAdminStateChange({
      ...adminState,
      catalog: {
        ...adminState.catalog,
        [category]: adminState.catalog[category].map((item) => item.id === itemId ? { ...item, ...patch } : item)
      }
    });
  };

  const handleStartAddProduct = () => {
    setEditingProductId(null);
    setProductForm(createEmptyProductForm());
    setShowProductForm(true);
    setNotice(null);
  };

  const handleStartEditProduct = (item: any) => {
    setEditingProductId(item.id);
    setProductForm(productFormFromItem(activeCategory, item));
    setShowProductForm(true);
    setNotice(null);
  };

  const handleCancelProductForm = () => {
    setEditingProductId(null);
    setProductForm(createEmptyProductForm());
    setShowProductForm(false);
  };

  const handleSaveProduct = () => {
    const needsLoadName = activeCategory === 'load';
    const hasMainName = needsLoadName ? productForm.name.trim() : productForm.brand.trim() || productForm.model.trim();
    if (!hasMainName) {
      showNotice(needsLoadName ? 'اكتب اسم الحمل قبل الإضافة.' : 'اكتب الماركة أو الموديل قبل الإضافة.', 'warning');
      return;
    }

    const existingItem = activeItems.find((item: any) => item.id === editingProductId);
    const savedItem = buildProductItem(activeCategory, productForm, existingItem);

    if (activeCategory === 'load') {
      const nextLoads = editingProductId
        ? adminState.loads.map((item) => item.id === editingProductId ? savedItem as LoadModel : item)
        : [savedItem as LoadModel, ...adminState.loads];

      onAdminStateChange({
        ...adminState,
        loads: nextLoads
      });
    } else {
      const category = activeCategory as ProductCategory;
      const catalog = adminState.catalog as any;
      const nextCategoryItems = editingProductId
        ? catalog[category].map((item: any) => item.id === editingProductId ? savedItem : item)
        : [savedItem, ...catalog[category]];

      onAdminStateChange({
        ...adminState,
        catalog: {
          ...adminState.catalog,
          [category]: nextCategoryItems
        } as AdminState['catalog']
      });
    }

    showNotice(editingProductId ? `تم تعديل المنتج "${getModelTitle(savedItem)}".` : `تمت إضافة "${getModelTitle(savedItem)}" إلى المنتجات.`);
    handleCancelProductForm();
  };

  const handleDeleteManagedItem = (itemId: string) => {
    if (activeItems.length <= 1) {
      showNotice('لا يمكن حذف آخر عنصر في هذا القسم حتى يبقى المحاكي قادراً على إضافة مكونات جديدة.', 'warning');
      return;
    }

    const itemName = getModelTitle(activeItems.find((item: any) => item.id === itemId) || {});
    if (!window.confirm(`هل تريد حذف "${itemName}" من قائمة المنتجات؟`)) return;

    if (activeCategory === 'load') {
      onAdminStateChange({
        ...adminState,
        loads: adminState.loads.filter((item) => item.id !== itemId)
      });
    } else {
      const category = activeCategory as ProductCategory;
      const catalog = adminState.catalog as any;
      onAdminStateChange({
        ...adminState,
        catalog: {
          ...adminState.catalog,
          [category]: catalog[category].filter((item: any) => item.id !== itemId)
        } as AdminState['catalog']
      });
    }

    if (editingProductId === itemId) {
      handleCancelProductForm();
    }
    showNotice(`تم حذف "${itemName}" من قائمة المنتجات.`);
  };

  const resetCatalog = () => {
    if (!window.confirm('إرجاع المنتجات والأسعار للقيم الأصلية؟')) return;
    const defaults = createEmptyAdminState();
    onAdminStateChange({
      ...adminState,
      catalog: defaults.catalog,
      loads: defaults.loads
    });
    handleCancelProductForm();
    showNotice('تم إرجاع المنتجات والأسعار للقيم الأصلية.');
  };

  if (!isOpen) return null;

  if (!isUnlocked) {
    return (
      <div className={`admin-panel-overlay ${theme === 'light' ? 'admin-light' : 'admin-dark'} fixed inset-0 z-[100] bg-black/80 backdrop-blur-md p-4 flex items-center justify-center no-print`} dir="rtl">
        <section className="w-full max-w-[430px] rounded-2xl border border-white/10 bg-[#07111f] text-white shadow-[0_30px_100px_rgba(0,0,0,0.65)] overflow-hidden">
          <header className="bg-[#0d1728] border-b border-white/10 p-5 text-center">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-cyan-500/10 border border-cyan-400/30 flex items-center justify-center text-cyan-300 text-xl">
              <i className="fa-solid fa-lock"></i>
            </div>
            <h2 className="text-lg font-black text-white mt-3">لوحة التحكم محمية</h2>
            <p className="text-xs text-slate-400 mt-1">ادخل كلمة المرور حتى تفتح إدارة الزبائن والمشاريع والمنتجات.</p>
          </header>

          <form onSubmit={handleUnlockAdmin} className="p-5 space-y-4">
            <label className="block">
              <span className="text-[11px] text-slate-400 font-bold block mb-1">كلمة المرور</span>
              <input
                type="password"
                value={passwordInput}
                autoFocus
                onChange={(event) => {
                  setPasswordInput(event.target.value);
                  setLockError('');
                }}
                className="w-full rounded-xl bg-[#050b15] border border-white/10 px-3 py-3 text-sm text-white outline-none focus:border-cyan-400"
              />
            </label>

            {lockError && (
              <div className="rounded-xl border border-rose-400/30 bg-rose-500/10 text-rose-100 text-xs font-bold px-3 py-2 flex items-center gap-2">
                <i className="fa-solid fa-triangle-exclamation text-rose-300"></i>
                {lockError}
              </div>
            )}

            <div className="flex items-center gap-2">
              <button
                type="submit"
                className="flex-1 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-[#06121c] font-black text-sm py-3 transition"
              >
                دخول
              </button>
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 font-bold text-sm px-4 py-3 transition"
              >
                إلغاء
              </button>
            </div>
          </form>
        </section>
      </div>
    );
  }

  return (
    <div className={`admin-panel-overlay ${theme === 'light' ? 'admin-light' : 'admin-dark'} fixed inset-0 z-[100] bg-black/75 backdrop-blur-md p-3 md:p-5 flex items-center justify-center no-print`} dir="rtl">
      <section className="w-full max-w-[1180px] max-h-[92vh] overflow-hidden rounded-2xl border border-white/10 bg-[#07111f] text-white shadow-[0_30px_100px_rgba(0,0,0,0.65)]">
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-white/10 bg-[#0d1728] px-4 md:px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-cyan-500/10 border border-cyan-400/30 flex items-center justify-center text-cyan-300">
              <i className="fa-solid fa-gauge-high"></i>
            </div>
            <div>
              <h2 className="text-base md:text-lg font-black text-white">لوحة تحكم المنظومة</h2>
              <p className="text-[11px] text-slate-400 mt-0.5">زبائن، عروض أسعار، منتجات، وإعدادات الشركة في مكان واحد.</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {activeTab === 'settings' ? (
              <button
                type="button"
                onClick={handleSaveSettings}
                className="rounded-xl bg-cyan-500 hover:bg-cyan-400 text-[#06121c] text-xs font-black px-4 py-2 flex items-center gap-2 transition"
              >
                <i className="fa-solid fa-floppy-disk"></i>
                حفظ الإعدادات
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSaveProject}
                className="rounded-xl bg-emerald-500 hover:bg-emerald-400 text-[#03110b] text-xs font-black px-4 py-2 flex items-center gap-2 transition"
              >
                <i className="fa-solid fa-floppy-disk"></i>
                حفظ المشروع الحالي
              </button>
            )}
            <button
              type="button"
              onClick={handleLockAdmin}
              className="rounded-xl bg-amber-500/10 hover:bg-amber-500/15 border border-amber-400/25 text-amber-200 text-xs font-bold px-3 py-2 flex items-center gap-2 transition"
            >
              <i className="fa-solid fa-lock"></i>
              قفل
            </button>
            <button
              type="button"
              onClick={onClose}
              className="w-10 h-10 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white transition"
              aria-label="إغلاق"
            >
              <i className="fa-solid fa-xmark"></i>
            </button>
          </div>
        </header>

        {notice && (
          <div className={`mx-4 md:mx-5 mt-4 rounded-xl border px-4 py-3 flex items-center justify-between gap-3 text-sm font-bold animate-fade-in ${
            notice.type === 'success'
              ? 'bg-emerald-500/12 border-emerald-400/35 text-emerald-100'
              : 'bg-amber-500/12 border-amber-400/35 text-amber-100'
          }`}>
            <span className="flex items-center gap-2">
              <i className={`fa-solid ${notice.type === 'success' ? 'fa-circle-check text-emerald-300' : 'fa-triangle-exclamation text-amber-300'}`}></i>
              {notice.text}
            </span>
            <button
              type="button"
              onClick={() => setNotice(null)}
              className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 text-white/80 transition"
              aria-label="إغلاق الإشعار"
            >
              <i className="fa-solid fa-xmark"></i>
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-[220px_1fr] max-h-[calc(92vh-82px)] min-h-[560px]">
          <aside className="border-b lg:border-b-0 lg:border-l border-white/10 bg-[#0a1424] p-3 space-y-2">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className={`w-full flex items-center justify-between gap-3 rounded-xl border px-3 py-3 text-sm font-bold transition ${
                  activeTab === tab.key
                    ? 'bg-cyan-500/12 border-cyan-400/40 text-cyan-200'
                    : 'bg-white/[0.03] border-white/5 text-slate-300 hover:bg-white/[0.06]'
                }`}
              >
                <span className="flex items-center gap-2">
                  <i className={`fa-solid ${tab.icon} w-4 text-center`}></i>
                  {tab.label}
                </span>
                <i className="fa-solid fa-chevron-left text-[10px] opacity-60"></i>
              </button>
            ))}
          </aside>

          <main className="overflow-y-auto p-4 md:p-5 bg-[#07111f]">
            {activeTab === 'overview' && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
                  <MetricCard icon="fa-users" label="الزبائن" value={adminState.customers.length.toString()} tone="text-cyan-300" />
                  <MetricCard icon="fa-folder-open" label="المشاريع المحفوظة" value={adminState.projects.length.toString()} tone="text-emerald-300" />
                  <MetricCard icon="fa-cubes" label="عناصر التصميم" value={nodes.length.toString()} tone="text-amber-300" />
                  <MetricCard icon="fa-receipt" label="قيمة العرض" value={formatMoney(calcs.grandTotal)} tone="text-rose-300" />
                </div>

                <div className="grid lg:grid-cols-[1.1fr_0.9fr] gap-4">
                  <section className="rounded-2xl border border-white/10 bg-white/[0.035] p-4">
                    <div className="flex items-center justify-between gap-3 mb-4">
                      <div>
                        <h3 className="font-black text-white">ملخص عرض السعر الحالي</h3>
                        <p className="text-[11px] text-slate-400 mt-1">هذه الأرقام مرتبطة مباشرة بالمخطط المفتوح الآن.</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          onClose();
                          onOpenReport();
                        }}
                        className="rounded-xl bg-blue-500 hover:bg-blue-400 text-white text-xs font-bold px-3 py-2 flex items-center gap-2 transition"
                      >
                        <i className="fa-solid fa-file-pdf"></i>
                        التقرير
                      </button>
                    </div>
                    <div className="grid sm:grid-cols-2 gap-3 text-sm">
                      <InfoLine label="المعدات" value={formatMoney(calcs.hardwareCost)} />
                      <InfoLine label="الملحقات" value={formatMoney(calcs.accessoriesCost)} />
                      <InfoLine label="النصب" value={formatMoney(calcs.installationCost)} />
                      <InfoLine label="المجموع" value={formatMoney(calcs.grandTotal)} highlight />
                      <InfoLine label="إنتاج يومي" value={`${Number(calcs.dailyPvYield || 0).toFixed(1)} kWh`} />
                      <InfoLine label="تشغيل البطارية" value={`${Number(calcs.batteryRuntimeHours || 0).toFixed(1)} ساعة`} />
                    </div>
                  </section>

                  <section className="rounded-2xl border border-white/10 bg-white/[0.035] p-4">
                    <h3 className="font-black text-white mb-3">خطوة العمل التالية</h3>
                    <div className="space-y-3 text-sm text-slate-300">
                      <div className="flex items-start gap-3">
                        <i className="fa-solid fa-circle-check text-emerald-400 mt-1"></i>
                        <span>أضف بيانات الزبون حتى تحفظ التصميم باسمه.</span>
                      </div>
                      <div className="flex items-start gap-3">
                        <i className="fa-solid fa-circle-check text-emerald-400 mt-1"></i>
                        <span>عدّل أسعار المنتجات من تبويب المنتجات قبل إصدار العرض النهائي.</span>
                      </div>
                      <div className="flex items-start gap-3">
                        <i className="fa-solid fa-circle-check text-emerald-400 mt-1"></i>
                        <span>اضبط اسم الشركة ونسب الملحقات والنصب من الإعدادات.</span>
                      </div>
                    </div>
                  </section>
                </div>
              </div>
            )}

            {activeTab === 'customers' && (
              <div className="grid xl:grid-cols-[380px_1fr] gap-4">
                <section className="rounded-2xl border border-white/10 bg-white/[0.035] p-4 space-y-3">
                  <h3 className="font-black text-white">إضافة زبون</h3>
                  <AdminInput label="اسم الزبون" value={customerForm.name} onChange={(value) => setCustomerForm({ ...customerForm, name: value })} />
                  <AdminInput label="رقم الهاتف" value={customerForm.phone} onChange={(value) => setCustomerForm({ ...customerForm, phone: value })} />
                  <label className="block">
                    <span className="text-[11px] text-slate-400 font-bold block mb-1">المحافظة</span>
                    <select
                      value={customerForm.province}
                      onChange={(event) => setCustomerForm({ ...customerForm, province: event.target.value })}
                      className="w-full rounded-xl bg-[#050b15] border border-white/10 px-3 py-2 text-sm text-white outline-none focus:border-cyan-400"
                    >
                      {provinceOptions.map((province) => (
                        <option key={province} value={province}>{province}</option>
                      ))}
                    </select>
                  </label>
                  <AdminInput label="العنوان" value={customerForm.address} onChange={(value) => setCustomerForm({ ...customerForm, address: value })} />
                  <AdminTextarea label="ملاحظات" value={customerForm.notes} onChange={(value) => setCustomerForm({ ...customerForm, notes: value })} />
                  <button
                    type="button"
                    onClick={handleAddCustomer}
                    className="w-full rounded-xl bg-cyan-500 hover:bg-cyan-400 text-[#06121c] font-black text-sm py-2.5 transition"
                  >
                    إضافة الزبون
                  </button>
                </section>

                <section className="rounded-2xl border border-white/10 bg-white/[0.035] p-4">
                  <h3 className="font-black text-white mb-3">قائمة الزبائن</h3>
                  <div className="space-y-2">
                    {adminState.customers.length === 0 ? (
                      <EmptyState icon="fa-user-plus" text="لا توجد أسماء بعد. أضف أول زبون حتى تبدأ أرشفة المشاريع." />
                    ) : adminState.customers.map((customer) => {
                      const isCustomerEditing = editingCustomerId === customer.id;
                      return (
                        <div key={customer.id} className={`rounded-xl border border-white/10 bg-[#050b15]/75 p-3 flex flex-col md:flex-row justify-between gap-3 ${isCustomerEditing ? 'md:items-stretch' : 'md:items-center'}`}>
                          {isCustomerEditing ? (
                            <>
                              <div className="flex-1 space-y-3">
                                <div className="grid md:grid-cols-2 gap-3">
                                  <AdminInput label="اسم الزبون" value={customerEditForm.name} onChange={(value) => setCustomerEditForm({ ...customerEditForm, name: value })} />
                                  <AdminInput label="رقم الهاتف" value={customerEditForm.phone} onChange={(value) => setCustomerEditForm({ ...customerEditForm, phone: value })} />
                                </div>
                                <div className="grid md:grid-cols-[180px_1fr] gap-3">
                                  <label className="block">
                                    <span className="text-[11px] text-slate-400 font-bold block mb-1">المحافظة</span>
                                    <select
                                      value={customerEditForm.province}
                                      onChange={(event) => setCustomerEditForm({ ...customerEditForm, province: event.target.value })}
                                      className="w-full rounded-xl bg-[#050b15] border border-white/10 px-3 py-2 text-sm text-white outline-none focus:border-cyan-400"
                                    >
                                      {provinceOptions.map((province) => (
                                        <option key={province} value={province}>{province}</option>
                                      ))}
                                    </select>
                                  </label>
                                  <AdminInput label="العنوان" value={customerEditForm.address} onChange={(value) => setCustomerEditForm({ ...customerEditForm, address: value })} />
                                </div>
                                <AdminTextarea label="ملاحظات" value={customerEditForm.notes} onChange={(value) => setCustomerEditForm({ ...customerEditForm, notes: value })} />
                              </div>
                              <div className="flex md:flex-col items-center md:items-stretch gap-2">
                                <button
                                  type="button"
                                  onClick={handleUpdateCustomer}
                                  className="rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-200 text-xs font-bold px-3 py-2"
                                >
                                  حفظ التعديل
                                </button>
                                <button
                                  type="button"
                                  onClick={handleCancelEditCustomer}
                                  className="rounded-lg bg-white/5 border border-white/10 text-slate-300 text-xs font-bold px-3 py-2"
                                >
                                  إلغاء
                                </button>
                              </div>
                            </>
                          ) : (
                            <>
                              <div>
                                <h4 className="font-black text-white">{customer.name}</h4>
                                <p className="text-xs text-slate-400 mt-1">{customer.phone || 'بدون رقم'} · {customer.province} · {customer.address || 'بدون عنوان'}</p>
                                {customer.notes && <p className="text-[11px] text-slate-500 mt-1">{customer.notes}</p>}
                              </div>
                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setProjectForm((prev) => ({ ...prev, customerId: customer.id }));
                                    setActiveTab('projects');
                                  }}
                                  className="rounded-lg bg-emerald-500/10 border border-emerald-500/25 text-emerald-300 text-xs font-bold px-3 py-2"
                                >
                                  مشروع جديد
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleStartEditCustomer(customer)}
                                  className="rounded-lg bg-amber-500/10 border border-amber-500/25 text-amber-300 text-xs font-bold px-3 py-2"
                                >
                                  تعديل
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteCustomer(customer.id)}
                                  className="rounded-lg bg-rose-500/10 border border-rose-500/25 text-rose-300 text-xs font-bold px-3 py-2"
                                >
                                  حذف
                                </button>
                              </div>
                            </>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </section>
              </div>
            )}

            {activeTab === 'projects' && (
              <div className="grid xl:grid-cols-[380px_1fr] gap-4">
                <section className="rounded-2xl border border-white/10 bg-white/[0.035] p-4 space-y-3">
                  <h3 className="font-black text-white">حفظ التصميم الحالي</h3>
                  <label className="block">
                    <span className="text-[11px] text-slate-400 font-bold block mb-1">الزبون</span>
                    <select
                      value={projectForm.customerId || selectedCustomer?.id || ''}
                      onChange={(event) => setProjectForm({ ...projectForm, customerId: event.target.value })}
                      className="w-full rounded-xl bg-[#050b15] border border-white/10 px-3 py-2 text-sm text-white outline-none focus:border-cyan-400"
                    >
                      <option value="">اختر زبون</option>
                      {adminState.customers.map((customer) => (
                        <option key={customer.id} value={customer.id}>{customer.name}</option>
                      ))}
                    </select>
                  </label>
                  <AdminInput label="اسم المشروع" value={projectForm.name} onChange={(value) => setProjectForm({ ...projectForm, name: value })} placeholder="مثلاً: بيت الكرادة 5kW" />
                  <AdminTextarea label="ملاحظات العرض" value={projectForm.notes} onChange={(value) => setProjectForm({ ...projectForm, notes: value })} />
                  <button
                    type="button"
                    onClick={handleSaveProject}
                    className="w-full rounded-xl bg-emerald-500 hover:bg-emerald-400 text-[#03110b] font-black text-sm py-2.5 transition"
                  >
                    حفظ نسخة من المشروع
                  </button>
                </section>

                <section className="rounded-2xl border border-white/10 bg-white/[0.035] p-4">
                  <h3 className="font-black text-white mb-3">الأرشيف المحلي</h3>
                  <div className="space-y-2">
                    {adminState.projects.length === 0 ? (
                      <EmptyState icon="fa-folder-open" text="لم يتم حفظ مشاريع بعد. احفظ التصميم الحالي حتى يظهر هنا." />
                    ) : adminState.projects.map((project) => {
                      const customer = adminState.customers.find((item) => item.id === project.customerId);
                      const isEditing = editingProjectId === project.id;
                      return (
                        <div key={project.id} className={`rounded-xl border border-white/10 bg-[#050b15]/75 p-3 flex flex-col md:flex-row justify-between gap-3 ${isEditing ? 'md:items-stretch' : 'md:items-center'}`}>
                          {isEditing ? (
                            <>
                              <div className="flex-1 space-y-3">
                                <div className="grid md:grid-cols-[1fr_190px] gap-3">
                                  <AdminInput
                                    label="اسم المشروع"
                                    value={projectEditForm.name}
                                    onChange={(value) => setProjectEditForm({ ...projectEditForm, name: value })}
                                  />
                                  <label className="block">
                                    <span className="text-[11px] text-slate-400 font-bold block mb-1">الزبون</span>
                                    <select
                                      value={projectEditForm.customerId}
                                      onChange={(event) => setProjectEditForm({ ...projectEditForm, customerId: event.target.value })}
                                      className="w-full rounded-xl bg-[#050b15] border border-white/10 px-3 py-2 text-sm text-white outline-none focus:border-cyan-400"
                                    >
                                      <option value="">اختر زبون</option>
                                      {adminState.customers.map((customerItem) => (
                                        <option key={customerItem.id} value={customerItem.id}>{customerItem.name}</option>
                                      ))}
                                    </select>
                                  </label>
                                </div>
                                <AdminTextarea
                                  label="ملاحظات المشروع"
                                  value={projectEditForm.notes}
                                  onChange={(value) => setProjectEditForm({ ...projectEditForm, notes: value })}
                                />
                              </div>
                              <div className="flex md:flex-col items-center md:items-stretch gap-2">
                                <button
                                  type="button"
                                  onClick={handleUpdateProject}
                                  className="rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-200 text-xs font-bold px-3 py-2"
                                >
                                  حفظ التعديل
                                </button>
                                <button
                                  type="button"
                                  onClick={handleCancelEditProject}
                                  className="rounded-lg bg-white/5 border border-white/10 text-slate-300 text-xs font-bold px-3 py-2"
                                >
                                  إلغاء
                                </button>
                              </div>
                            </>
                          ) : (
                            <>
                              <div>
                                <h4 className="font-black text-white">{project.name}</h4>
                                <p className="text-xs text-slate-400 mt-1">{customer?.name || 'زبون غير محدد'} · {new Date(project.updatedAt).toLocaleDateString('ar-IQ')} · {formatMoney(project.totalCost)}</p>
                                {project.notes && <p className="text-[11px] text-slate-500 mt-1">{project.notes}</p>}
                              </div>
                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => handleStartEditProject(project)}
                                  className="rounded-lg bg-amber-500/10 border border-amber-500/25 text-amber-300 text-xs font-bold px-3 py-2"
                                >
                                  تعديل
                                </button>
                                <button
                                  type="button"
                                  onClick={() => onLoadProject(project)}
                                  className="rounded-lg bg-blue-500/10 border border-blue-500/25 text-blue-300 text-xs font-bold px-3 py-2"
                                >
                                  تحميل
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteProject(project.id)}
                                  className="rounded-lg bg-rose-500/10 border border-rose-500/25 text-rose-300 text-xs font-bold px-3 py-2"
                                >
                                  حذف
                                </button>
                              </div>
                            </>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </section>
              </div>
            )}

            {activeTab === 'catalog' && (
              <div className="space-y-4">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                  <div>
                    <h3 className="font-black text-white">إدارة المنتجات والأسعار</h3>
                    <p className="text-[11px] text-slate-400 mt-1">أي تغيير هنا ينعكس على مكتبة المكونات والحسابات مباشرة.</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={handleStartAddProduct}
                      className="rounded-xl bg-cyan-500 hover:bg-cyan-400 text-[#06121c] text-xs font-black px-3 py-2 flex items-center gap-2 transition"
                    >
                      <i className="fa-solid fa-plus"></i>
                      {activeCategory === 'load' ? 'إضافة حمل' : 'إضافة منتج'}
                    </button>
                    <button
                      type="button"
                      onClick={resetCatalog}
                      className="rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 text-xs font-bold px-3 py-2 transition"
                    >
                      إرجاع الأسعار الأصلية
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-2">
                  {categoryOptions.map((category) => (
                    <button
                      key={category.key}
                      type="button"
                      onClick={() => setActiveCategory(category.key)}
                      className={`rounded-xl border px-3 py-2 text-xs font-black flex items-center justify-center gap-2 transition ${
                        activeCategory === category.key
                          ? `bg-white/10 ${category.tone}`
                          : 'bg-white/[0.03] border-white/10 text-slate-300 hover:bg-white/[0.06]'
                      }`}
                    >
                      <i className={`fa-solid ${category.icon}`}></i>
                      {category.label}
                    </button>
                  ))}
                </div>

                {showProductForm && (
                  <section className="rounded-2xl border border-cyan-400/25 bg-cyan-500/[0.055] p-4 space-y-3 animate-fade-in">
                    <div className="flex items-center justify-between gap-3">
                      <h4 className="font-black text-white">
                        {editingProductId ? 'تعديل المنتج' : activeCategory === 'load' ? 'إضافة حمل جديد' : 'إضافة منتج جديد'}
                      </h4>
                      <button
                        type="button"
                        onClick={handleCancelProductForm}
                        className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white transition"
                        aria-label="إغلاق نموذج المنتج"
                      >
                        <i className="fa-solid fa-xmark"></i>
                      </button>
                    </div>
                    {activeCategory === 'load' ? (
                      <div className="grid md:grid-cols-[1.2fr_110px_110px_1.6fr] gap-3">
                        <AdminInput label="اسم الحمل" value={productForm.name} onChange={(value) => setProductForm({ ...productForm, name: value })} />
                        <AdminInput label="السعر" type="number" value={productForm.price} onChange={(value) => setProductForm({ ...productForm, price: value })} />
                        <AdminInput label={getProductPowerLabel(activeCategory)} type="number" value={productForm.power} onChange={(value) => setProductForm({ ...productForm, power: value })} />
                        <AdminInput label="الوصف" value={productForm.description} onChange={(value) => setProductForm({ ...productForm, description: value })} />
                      </div>
                    ) : (
                      <div className="grid md:grid-cols-[1fr_1fr_105px_105px_115px] gap-3">
                        <AdminInput label="الماركة" value={productForm.brand} onChange={(value) => setProductForm({ ...productForm, brand: value })} />
                        <AdminInput label="الموديل" value={productForm.model} onChange={(value) => setProductForm({ ...productForm, model: value })} />
                        <AdminInput label="السعر" type="number" value={productForm.price} onChange={(value) => setProductForm({ ...productForm, price: value })} />
                        <AdminInput label="الضمان" type="number" value={productForm.warranty} onChange={(value) => setProductForm({ ...productForm, warranty: value })} />
                        <AdminInput label={getProductPowerLabel(activeCategory)} type="number" value={productForm.power} onChange={(value) => setProductForm({ ...productForm, power: value })} />
                        <div className="md:col-span-5">
                          <AdminInput label="وصف العرض" value={productForm.description} onChange={(value) => setProductForm({ ...productForm, description: value })} />
                        </div>
                      </div>
                    )}
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={handleSaveProduct}
                        className="rounded-xl bg-emerald-500 hover:bg-emerald-400 text-[#03110b] font-black text-sm px-4 py-2 transition"
                      >
                        {editingProductId ? 'حفظ تعديل المنتج' : 'إضافة إلى القائمة'}
                      </button>
                      <button
                        type="button"
                        onClick={handleCancelProductForm}
                        className="rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 font-bold text-sm px-4 py-2 transition"
                      >
                        إلغاء
                      </button>
                    </div>
                  </section>
                )}

                <section className="rounded-2xl border border-white/10 bg-white/[0.035] overflow-hidden">
                  <div className="hidden md:grid md:grid-cols-[1.2fr_100px_95px_1.3fr_150px] gap-3 px-4 py-3 border-b border-white/10 text-[11px] font-black text-slate-400">
                    <span>العنصر</span>
                    <span>السعر</span>
                    <span>{activeCategory === 'load' ? 'القدرة' : 'الضمان'}</span>
                    <span>وصف العرض</span>
                    <span>الإجراءات</span>
                  </div>
                  <div className="divide-y divide-white/10">
                    {activeItems.map((item: any) => (
                      <div key={item.id} className="grid grid-cols-1 md:grid-cols-[1.2fr_100px_95px_1.3fr_150px] gap-3 p-4 items-center">
                        <div>
                          <h4 className="font-black text-white text-sm">{getModelTitle(item)}</h4>
                          <p className="text-[11px] text-slate-400 mt-1">{item.power ? `${item.power}W · ` : ''}{item.energy ? `${item.energy}Wh · ` : ''}{getModelSubtitle(item)}</p>
                        </div>
                        <input
                          type="number"
                          min="0"
                          value={Number(item.price || 0)}
                          onChange={(event) => updateManagedItem(item.id, { price: Number(event.target.value || 0) })}
                          className="rounded-xl bg-[#050b15] border border-white/10 px-3 py-2 text-sm text-white outline-none focus:border-cyan-400"
                        />
                        {activeCategory === 'load' ? (
                          <input
                            type="number"
                            min="0"
                            value={Number(item.power || 0)}
                            onChange={(event) => updateManagedItem(item.id, { power: Number(event.target.value || 0) })}
                            className="rounded-xl bg-[#050b15] border border-white/10 px-3 py-2 text-sm text-white outline-none focus:border-cyan-400"
                          />
                        ) : (
                          <input
                            type="number"
                            min="0"
                            value={Number(item.warranty || 0)}
                            onChange={(event) => updateManagedItem(item.id, { warranty: Number(event.target.value || 0) })}
                            className="rounded-xl bg-[#050b15] border border-white/10 px-3 py-2 text-sm text-white outline-none focus:border-cyan-400"
                          />
                        )}
                        <input
                          type="text"
                          value={activeCategory === 'load' ? item.desc || '' : item.specsText || ''}
                          onChange={(event) => updateManagedItem(item.id, activeCategory === 'load' ? { desc: event.target.value } : { specsText: event.target.value })}
                          className="rounded-xl bg-[#050b15] border border-white/10 px-3 py-2 text-sm text-white outline-none focus:border-cyan-400"
                        />
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleStartEditProduct(item)}
                            className="rounded-lg bg-amber-500/10 border border-amber-500/25 text-amber-300 text-xs font-bold px-3 py-2"
                          >
                            تعديل
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteManagedItem(item.id)}
                            className="rounded-lg bg-rose-500/10 border border-rose-500/25 text-rose-300 text-xs font-bold px-3 py-2"
                          >
                            حذف
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              </div>
            )}

            {activeTab === 'settings' && (
              <div className="space-y-4">
                <section className="rounded-2xl border border-cyan-400/25 bg-cyan-500/[0.055] p-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
                  <div>
                    <h3 className="font-black text-white">حفظ الإعدادات مستقل</h3>
                    <p className="text-[11px] text-slate-400 mt-1">تغيير الإعدادات لا ينشئ مشروعاً ولا يغيّر أرشيف المشاريع؛ اضغط حفظ الإعدادات لتطبيقها.</p>
                  </div>
                  <button
                    type="button"
                    onClick={handleSaveSettings}
                    className="rounded-xl bg-cyan-500 hover:bg-cyan-400 text-[#06121c] font-black text-sm px-4 py-2 flex items-center justify-center gap-2 transition"
                  >
                    <i className="fa-solid fa-floppy-disk"></i>
                    حفظ الإعدادات
                  </button>
                </section>

                <div className="grid xl:grid-cols-[1fr_0.8fr] gap-4">
                <section className="rounded-2xl border border-white/10 bg-white/[0.035] p-4 space-y-3">
                  <h3 className="font-black text-white">بيانات الشركة</h3>
                  <AdminInput label="اسم المشروع / الشركة" value={settingsDraft.companyName} onChange={(value) => updateSettingsDraft('companyName', value)} />
                  <AdminInput label="الهاتف" value={settingsDraft.phone} onChange={(value) => updateSettingsDraft('phone', value)} />
                  <AdminInput label="واتساب" value={settingsDraft.whatsapp} onChange={(value) => updateSettingsDraft('whatsapp', value)} />
                  <AdminInput label="العنوان" value={settingsDraft.address} onChange={(value) => updateSettingsDraft('address', value)} />
                </section>

                <section className="rounded-2xl border border-white/10 bg-white/[0.035] p-4 space-y-3">
                  <h3 className="font-black text-white">إعدادات التسعير</h3>
                  <AdminInput label="العملة" value={settingsDraft.currency} onChange={(value) => updateSettingsDraft('currency', value)} />
                  <AdminInput label="صلاحية العرض بالأيام" type="number" value={settingsDraft.quoteValidityDays} onChange={(value) => updateSettingsDraft('quoteValidityDays', Number(value || 0))} />
                  <AdminInput label="نسبة الملحقات %" type="number" value={settingsDraft.accessoriesRate} onChange={(value) => updateSettingsDraft('accessoriesRate', Number(value || 0))} />
                  <AdminInput label="نسبة النصب %" type="number" value={settingsDraft.installationRate} onChange={(value) => updateSettingsDraft('installationRate', Number(value || 0))} />
                  <AdminInput label="كلمة مرور لوحة التحكم" type="password" value={settingsDraft.adminPassword} onChange={(value) => updateSettingsDraft('adminPassword', value)} />
                </section>
                </div>
              </div>
            )}
          </main>
        </div>
      </section>
    </div>
  );
}

function MetricCard({ icon, label, value, tone }: { icon: string; label: string; value: string; tone: string }) {
  return (
    <section className="rounded-2xl border border-white/10 bg-white/[0.035] p-4">
      <div className={`w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center ${tone}`}>
        <i className={`fa-solid ${icon}`}></i>
      </div>
      <span className="text-[11px] text-slate-400 block mt-3 font-bold">{label}</span>
      <strong className="text-xl font-black text-white block mt-1">{value}</strong>
    </section>
  );
}

function InfoLine({ label, value, highlight = false }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className={`rounded-xl border px-3 py-2 flex items-center justify-between gap-3 ${highlight ? 'bg-emerald-500/10 border-emerald-500/25' : 'bg-[#050b15]/75 border-white/10'}`}>
      <span className="text-slate-400 text-xs font-bold">{label}</span>
      <strong className={`${highlight ? 'text-emerald-300' : 'text-white'} text-sm font-black`}>{value}</strong>
    </div>
  );
}

function AdminInput({
  label,
  value,
  onChange,
  type = 'text',
  placeholder
}: {
  label: string;
  value: string | number;
  onChange: (value: string) => void;
  type?: string;
  placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="text-[11px] text-slate-400 font-bold block mb-1">{label}</span>
      <input
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-xl bg-[#050b15] border border-white/10 px-3 py-2 text-sm text-white outline-none focus:border-cyan-400"
      />
    </label>
  );
}

function AdminTextarea({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="block">
      <span className="text-[11px] text-slate-400 font-bold block mb-1">{label}</span>
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        rows={3}
        className="w-full rounded-xl bg-[#050b15] border border-white/10 px-3 py-2 text-sm text-white outline-none focus:border-cyan-400 resize-none"
      />
    </label>
  );
}

function EmptyState({ icon, text }: { icon: string; text: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-white/15 bg-white/[0.025] p-8 text-center text-slate-400">
      <i className={`fa-solid ${icon} text-2xl text-slate-500 mb-3`}></i>
      <p className="text-sm">{text}</p>
    </div>
  );
}
