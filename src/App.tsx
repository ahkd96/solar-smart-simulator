import React, { useState, useMemo, useRef, useEffect } from 'react';
import { CanvasNode, PVModel, MPPTModel, BatteryModel, InverterModel, GeneratorModel, LoadModel } from './types';
import { citiesData } from './data';
import { calculateSystem } from './calculator';
import RoofPlannerModal from './components/RoofPlannerModal';
import CartModal from './components/CartModal';
import ReportModal from './components/ReportModal';
import TemplatesModal from './components/TemplatesModal';
import AdminPanel from './components/admin/AdminPanel';
import { AdminState, SavedProject, hydrateNodesFromCatalog, loadAdminState, saveAdminState } from './lib/adminStorage';

export default function App() {
  const [adminState, setAdminState] = useState<AdminState>(() => loadAdminState());
  const productCatalog = adminState.catalog;
  const loadCatalog = adminState.loads;
  const appDisplayName = adminState.settings.companyName?.trim() || 'منصة محاكاة الطاقة الشمسية الذكية';

  // Global States
  const [cityKey, setCityKey] = useState<string>('baghdad');
  const [seasonKey, setSeasonKey] = useState<string>('summer');
  const [isGenEnabled, setIsGenEnabled] = useState<boolean>(false);
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');
  
  // Custom Zoom
  const [zoomLevel, setZoomLevel] = useState<number>(1.0);
  
  // Modals
  const [isRoofOpen, setIsRoofOpen] = useState<boolean>(false);
  const [isCartOpen, setIsCartOpen] = useState<boolean>(false);
  const [isReportOpen, setIsReportOpen] = useState<boolean>(false);
  const [isTemplatesOpen, setIsTemplatesOpen] = useState<boolean>(false);
  const [isAdminOpen, setIsAdminOpen] = useState<boolean>(false);

  // Active component configuration state
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);
  const [activeDashboardTab, setActiveDashboardTab] = useState<'profile' | 'voltage_amperage'>('profile');

  // Active draggable item references
  const canvasRef = useRef<HTMLDivElement>(null);
  const [draggingNodeId, setDraggingNodeId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // Chat message state
  const [chatMessage, setChatMessage] = useState<string>('');
  const [chatHistory, setChatHistory] = useState<Array<{
    sender: 'user' | 'system' | 'err' | 'warn' | 'success';
    senderName: string;
    text: string;
    icon: string;
  }>>([
    {
      sender: 'system',
      senderName: 'المهندس الشمسي الذكي',
      text: 'أهلاً بك في منصتك الفنية لتصميم ومحاكاة الخلايا الشمسية في العراق! قم بسحب المكونات من مكتبة المكونات الجانبية أو انقر عليها لإضافتها مباشرة إلى اللوحة. سأقوم بإجراء الحسابات الهندسية الفورية وفحص توافقية العناصر وتحميل التقرير المكتوب لتسليمه للزبائن.',
      icon: 'fa-user-astronaut'
    }
  ]);

  // Initializing state with 5kW default balanced design on startup
  const [nodes, setNodes] = useState<CanvasNode[]>([
    {
      id: "pv-init-1",
      type: "pv",
      x: 60,
      y: 60,
      specs: { quantity: 10 },
      model: productCatalog.pv[0] // Jinko 550W
    },
    {
      id: "inv-init-2",
      type: "inverter",
      x: 310,
      y: 120,
      specs: { quantity: 1 },
      model: productCatalog.inverter[2] // Growatt 5kW
    },
    {
      id: "bat-init-3",
      type: "battery",
      x: 180,
      y: 280,
      specs: { quantity: 2 },
      model: productCatalog.battery[0] // Felicity 5kWh LFP
    },
    {
      id: "load-init-4",
      type: "load",
      x: 540,
      y: 40,
      specs: { quantity: 1 },
      model: loadCatalog[0] // fridge
    },
    {
      id: "load-init-5",
      type: "load",
      x: 540,
      y: 170,
      specs: { quantity: 1 },
      model: loadCatalog[1] // ac 1 ton
    },
    {
      id: "load-init-6",
      type: "load",
      x: 540,
      y: 300,
      specs: { quantity: 1 },
      model: loadCatalog[5] // tv
    }
  ]);

  // Redirection when components are dragged
  const [draggedSidebarItem, setDraggedSidebarItem] = useState<{
    type: string;
    loadModel?: LoadModel;
  } | null>(null);

  // Run Calculations
  const calcs = useMemo(() => {
    return calculateSystem(nodes, cityKey, seasonKey, isGenEnabled, adminState.settings);
  }, [nodes, cityKey, seasonKey, isGenEnabled, adminState.settings]);

  useEffect(() => {
    saveAdminState(adminState);
  }, [adminState]);

  useEffect(() => {
    document.title = `${appDisplayName} - Solar Smart Simulator`;
  }, [appDisplayName]);

  useEffect(() => {
    setNodes(prev => hydrateNodesFromCatalog(prev, adminState));
  }, [adminState.catalog, adminState.loads]);

  // Diagnostics check (Errors / Warnings)
  const diagnostics = useMemo(() => {
    const errors: Array<{ id: string; title: string; text: string; solution: string }> = [];
    const warnings: Array<{ id: string; title: string; text: string; solution: string }> = [];

    const hasPanels = calcs.panelsCount > 0;
    const hasBatteries = calcs.batteriesCount > 0;
    const hasInverter = calcs.selectedInverter !== null;
    const hasLoads = calcs.activeLoads.length > 0;

    if (hasLoads && !hasInverter) {
      errors.push({
        id: "err-missing-inv",
        title: "عاكس مفقود (Inverter Required)",
        text: "لقد قمت بإضافة أحمال منزلية تيار متردد AC، ولكن لا يوجد انفرتر في اللوحة لتحويل التيار المستمر DC إلى تيار متردد AC لتشغيلها.",
        solution: "اضغط على 'انفرتر (عاكس)' في مكتبة المكونات اليمنى أو اسحبه إلى اللوحة."
      });
    }

    if (hasPanels && !hasInverter && !calcs.selectedMppt && !hasBatteries) {
      warnings.push({
        id: "warn-isolated-pv",
        title: "خلايا شمسية غير متصلة بالكامل",
        text: "الألواح الشمسية تولد تياراً مستمراً كبيراً، ولكنها تحتاج إلى منظم شحن MPPT لشحن البطاريات أو عاكس انفرتر هجين ناقل لتغذية الأحمال.",
        solution: "أضف منظم شحن وبطارية، أو أضف عاكس انفرتر هجين لتوفير التوازن الهيدروليكي الكهربائي."
      });
    }

    if (hasInverter && hasPanels) {
      const inv = calcs.selectedInverter;
      if (calcs.stringVoc > inv.maxPvVoc) {
        errors.push({
          id: "err-overvoltage",
          title: "جهد الخلايا يتجاوز حد الانفرتر (Overvoltage)!",
          text: `جهد تشكيل الألواح المتوالية يصل إلى (${calcs.stringVoc.toFixed(1)} فولت)، وهو يتجاوز الحد الأقصى الآمن للانفرتر المختار (${inv.maxPvVoc} فولت). خطر حدوث تماس داخلي أو تلف دوائر الانفرتر!`,
          solution: "قلل عدد الألواح الموصولة، أو قم ببرمجتها على مجموعات متوازية (Parallel) لتقليص جهد الربط."
        });
      }

      if (calcs.stringVoc > 0 && calcs.stringVoc < inv.minPvVoc) {
        warnings.push({
          id: "warn-undervoltage",
          title: "جهد بدء تشغيل منخفض (Low PV Voltage)",
          text: `جهد الألواح المتسلسل الحالي هو (${calcs.stringVoc.toFixed(1)} فولت)، وهو أقل من الحد الأدنى اللازم لبدء إنتاجية الانفرتر المختار (${inv.minPvVoc} فولت). لن تعمل المنظومة بنجاح في الصباح!`,
          solution: "قم بزيادة عدد الألواح وتوصيلها على التوالي (Series) لزيادة الجهد الكلي وتجاوز عتبة الإقلاع."
        });
      }
    }

    if (hasInverter) {
      if (calcs.inverterRatio > 100) {
        errors.push({
          id: "err-inverter-overload",
          title: "تحميل زائد على عاكس الطاقة (Inverter Overload)!",
          text: `إجمالي الأحمال الموصولة المشغلة معاً (${calcs.instantPeakLoad.toFixed(0)} واط) يتجاوز قدرة الانفرتر الموصول في اللوحة (${calcs.selectedInverter.power} واط). سيقوم جهاز الحماية التلقائي بفصل الانفرتر لمنع الاحتراق.`,
          solution: "قم بإلغاء أو إزالة جزء من الأحمال الكبيرة (مثل السبلت) أو اختر انفرتر بقدرة أكبر (مثل طراز 8kW أو 12kW)."
        });
      } else if (calcs.inverterRatio > 80) {
        warnings.push({
          id: "warn-high-inverter-loading",
          title: "نسبة تحميل حرجة على الانفرتر",
          text: `معدل استهلاك الأجهزة يبلغ (${calcs.inverterRatio.toFixed(0)}%) من طاقة الانفرتر. ينصح بترك مساحة أمان لا تقل عن 20% لضمان تبريد الجهاز وامتصاص تيارات بدء المحركات.`,
          solution: "تجنب تشغيل الأجهزة الثقيلة كالمضخات ومكيفات الهواء في لحظة واحدة."
        });
      }
    }

    if (hasInverter && calcs.selectedInverter.batVoltage > 0 && !hasBatteries) {
      if (calcs.selectedInverter.type.includes("Off-Grid") || calcs.selectedInverter.type.includes("Hybrid")) {
        errors.push({
          id: "err-missing-battery",
          title: "بنك البطاريات مطلوب كهربائياً",
          text: `موديل الانفرتر المختار يتطلب ربط بطارية بجهد (${calcs.selectedInverter.batVoltage} فولت) ليعمل بانتظام وتثبيت تيار التشغيل والتغذية الليلية.`,
          solution: "أضف بطارية خزن لليثيوم أو الجيل إلى ساحة التخطيط."
        });
      }
    }

    if (hasBatteries && calcs.nightLoadDemand > 0) {
      if (calcs.nightOperatingHours < 4) {
        warnings.push({
          id: "warn-low-battery-storage",
          title: "السعة التخزينية لا تضمن الكفاية الليلية",
          text: `بنك البطاريات الحالي يوفر فقط (${calcs.nightOperatingHours.toFixed(1)} ساعة) لتشغيل الأحمال المضافة ليلاً. ستنطفئ الكهرباء مبكراً أثناء النوم!`,
          solution: "قم بزيادة عدد البطاريات لرفع السعة التخزينية، أو قلل ساعات تشغيل أجهزة السبلت الثقيلة ليلاً."
        });
      }
    }

    return { errors, warnings };
  }, [calcs]);

  // Feed active advisory alerts into chat log automatically when diagnostics change
  useEffect(() => {
    if (nodes.length === 0) return;
    
    // Clear old state notifications to keep it updated nicely
    setChatHistory(prev => prev.filter(item => !['err', 'warn', 'success'].includes(item.sender)));

    diagnostics.errors.forEach(err => {
      setChatHistory(prev => [...prev, {
        sender: 'err',
        senderName: 'فحص هندسي (حرِج)',
        text: `❌ ${err.title}\n\n${err.text}\n\n💡 الحل المقترح: ${err.solution}`,
        icon: 'fa-triangle-exclamation text-rose-500 animate-pulse'
      }]);
    });

    diagnostics.warnings.forEach(warn => {
      setChatHistory(prev => [...prev, {
        sender: 'warn',
        senderName: 'فحص هندسي (تنبيه)',
        text: `⚠️ ${warn.title}\n\n${warn.text}\n\n💡 الحل المقترح: ${warn.solution}`,
        icon: 'fa-circle-exclamation text-orange-400'
      }]);
    });

    if (diagnostics.errors.length === 0 && diagnostics.warnings.length === 0 && calcs.panelsCount > 0 && calcs.selectedInverter) {
      setChatHistory(prev => [...prev, {
        sender: 'success',
        senderName: 'المهندس الشمسي المعتمد',
        text: `🏆 تصميم المنظومة متطابق ومستقر فنيًا بالكامل!\n\nالألواح تنتج طاقة شمسية وفيرة، والانفرتر يوفر هامش تشغيل كافٍ متسق ومحمي تماماً. يمنع تصميمك هذا انبعاث حوالي ${(calcs.co2Offset / 1000).toFixed(2)} طن من ثاني أكسيد الكربون سنوياً!`,
        icon: 'fa-trophy text-[#ffd600]'
      }]);
    }
  }, [diagnostics, calcs.panelsCount, calcs.selectedInverter]);

  // Handle click on sidebar item to automatically place / increment node on Canvas
  const handleSidebarItemClick = (type: string, loadModel?: LoadModel, specificModel?: any) => {
    const defaultX = 150 + (nodes.length * 15) % 150;
    const defaultY = 100 + (nodes.length * 15) % 120;
    
    // Toggle sidebar accordion expansion for generation/storage components
    if (['pv', 'mppt', 'battery', 'inverter', 'generator'].includes(type) && !specificModel) {
      setExpandedCategory(prev => prev === type ? null : type);
      return;
    }

    // Symmetrical design checks (prevent duplicating primary single hardware items)
    if (['inverter', 'mppt', 'generator'].includes(type)) {
      const existing = nodes.find(n => n.type === type);
      if (existing) {
        if (specificModel) {
          // Update model of existing component and select it 
          setNodes(prev => prev.map(n => n.type === type ? { ...n, model: specificModel } : n));
          setSelectedNodeId(existing.id);
          return;
        }
        alert(`المكون [${existing.model.brand || existing.model.name}] مضاف مسبقاً في لوحة المحاكاة. يمكنك حذفه لإعادة ربطه.`);
        return;
      }
    }

    if (type === 'pv') {
      const existing = nodes.find(n => n.type === 'pv');
      if (existing) {
        if (specificModel) {
          setNodes(prev => prev.map(n => n.type === 'pv' ? { ...n, model: specificModel, specs: { quantity: n.specs.quantity + 4 } } : n));
        } else {
          setNodes(prev => prev.map(n => n.type === 'pv' ? { ...n, specs: { quantity: n.specs.quantity + 4 } } : n));
        }
        setSelectedNodeId(existing.id);
        return;
      }
    }

    if (type === 'battery') {
      const existing = nodes.find(n => n.type === 'battery');
      if (existing) {
        if (specificModel) {
          setNodes(prev => prev.map(n => n.type === 'battery' ? { ...n, model: specificModel, specs: { quantity: n.specs.quantity + 2 } } : n));
        } else {
          setNodes(prev => prev.map(n => n.type === 'battery' ? { ...n, specs: { quantity: n.specs.quantity + 2 } } : n));
        }
        setSelectedNodeId(existing.id);
        return;
      }
    }

    // Default parameters
    let model: any = specificModel || null;
    let specs = { quantity: 1 };

    if (type === 'pv') {
      model = model || productCatalog.pv[0];
      specs.quantity = 6;
    } else if (type === 'mppt') {
      model = model || productCatalog.mppt[0];
    } else if (type === 'battery') {
      model = model || productCatalog.battery[0];
      specs.quantity = 2;
    } else if (type === 'inverter') {
      model = model || productCatalog.inverter[0]; // Deye 8kW
    } else if (type === 'generator') {
      model = model || productCatalog.generator[0];
    } else if (type === 'load') {
      model = loadModel || loadCatalog[0];
      
      // If appliance exists, just increment quantity instead of adding multiple duplicates
      const existingLoad = nodes.find(n => n.type === 'load' && n.model.id === model.id);
      if (existingLoad) {
        setNodes(prev => prev.map(n => (n.type === 'load' && n.model.id === model.id) ? { ...n, specs: { quantity: n.specs.quantity + 1 } } : n));
        return;
      }
      specs.quantity = 1;
    }

    const newNode: CanvasNode = {
      id: `${type}-${Date.now()}`,
      type: type as any,
      x: defaultX,
      y: defaultY,
      specs,
      model
    };

    setNodes(prev => [...prev, newNode]);
    setSelectedNodeId(newNode.id); // Auto-focus the added component in the inspector
  };

  // Drag-and-drop support
  const handleDragStartSidebar = (type: string, loadModel?: LoadModel) => {
    setDraggedSidebarItem({ type, loadModel });
  };

  const handleDropCanvas = (e: React.DragEvent) => {
    e.preventDefault();
    if (!draggedSidebarItem) return;

    if (!canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    
    // Calculate client coordinates corrected for zoom factors
    let x = (e.clientX - rect.left - 85) / zoomLevel;
    let y = (e.clientY - rect.top - 40) / zoomLevel;

    // Grid snap rules
    x = Math.round(x / 20) * 20;
    y = Math.round(y / 20) * 20;

    // Boundaries check standard width is 175px, height is 100px
    x = Math.max(15, Math.min(x, (rect.width / zoomLevel) - 180));
    y = Math.max(15, Math.min(y, (rect.height / zoomLevel) - 120));

    const { type, loadModel } = draggedSidebarItem;
    setDraggedSidebarItem(null);

    // Single hardware items existence constraint
    if (['inverter', 'mppt', 'generator'].includes(type)) {
      const existing = nodes.find(n => n.type === type);
      if (existing) {
        alert(`المكون مضاف مسبقاً في المخطط. يمكنك تعديل الكميات أو حذف العنصر لإعادة ربطه.`);
        return;
      }
    }

    let model: any = null;
    let specs = { quantity: 1 };

    if (type === 'pv') {
      model = productCatalog.pv[0];
      specs.quantity = 6;
    } else if (type === 'mppt') {
      model = productCatalog.mppt[0];
    } else if (type === 'battery') {
      model = productCatalog.battery[0];
      specs.quantity = 2;
    } else if (type === 'inverter') {
      model = productCatalog.inverter[0];
    } else if (type === 'generator') {
      model = productCatalog.generator[0];
    } else if (type === 'load') {
      model = loadModel || loadCatalog[0];
      const existingLoad = nodes.find(n => n.type === 'load' && n.model.id === model.id);
      if (existingLoad) {
        setNodes(prev => prev.map(n => (n.type === 'load' && n.model.id === model.id) ? { ...n, specs: { quantity: n.specs.quantity + 1 } } : n));
        return;
      }
      specs.quantity = 1;
    }

    const newNode: CanvasNode = {
      id: `${type}-${Date.now()}`,
      type: type as any,
      x,
      y,
      specs,
      model
    };

    setNodes(prev => [...prev, newNode]);
  };

  // Node parameter modifiers on canvas
  const handleNodeQtyChange = (nodeId: string, qty: number) => {
    setNodes(prev => prev.map(n => n.id === nodeId ? { ...n, specs: { quantity: Math.max(1, qty) } } : n));
  };

  const handleNodeDelete = (nodeId: string) => {
    setNodes(prev => prev.filter(n => n.id !== nodeId));
    if (selectedNodeId === nodeId) {
      setSelectedNodeId(null);
    }
  };

  const handleNodeModelChange = (nodeId: string, modelId: string) => {
    setNodes(prev => prev.map(n => {
      if (n.id !== nodeId) return n;
      const list = (productCatalog as any)[n.type];
      if (!list) return n;
      const newModel = list.find((m: any) => m.id === modelId);
      if (!newModel) return n;
      return { ...n, model: newModel };
    }));
  };

  // Custom visual node dragging state machine
  const handleNodeMouseDown = (e: React.MouseEvent, nodeId: string) => {
    if ((e.target as HTMLElement).closest('input') || (e.target as HTMLElement).closest('button') || (e.target as HTMLElement).closest('select')) {
      return; // Allow selecting inputs, dropdowns & close button on nodes
    }
    e.preventDefault();
    setSelectedNodeId(nodeId); // Select node on canvas click
    if (!canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const node = nodes.find(n => n.id === nodeId);
    if (!node) return;

    setDraggingNodeId(nodeId);
    setDragOffset({
      x: (e.clientX - rect.left) / zoomLevel - node.x,
      y: (e.clientY - rect.top) / zoomLevel - node.y
    });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!draggingNodeId || !canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();

    // Adjust the movement matching coordinate grid snap
    let relativeX = (e.clientX - rect.left) / zoomLevel - dragOffset.x;
    let relativeY = (e.clientY - rect.top) / zoomLevel - dragOffset.y;

    relativeX = Math.round(relativeX / 20) * 20;
    relativeY = Math.round(relativeY / 20) * 20;

    relativeX = Math.max(10, Math.min(relativeX, (rect.width / zoomLevel) - 180));
    relativeY = Math.max(10, Math.min(relativeY, (rect.height / zoomLevel) - 120));

    setNodes(prev => prev.map(n => n.id === draggingNodeId ? { ...n, x: relativeX, y: relativeY } : n));
  };

  const handleMouseUp = () => {
    if (draggingNodeId) {
      setDraggingNodeId(null);
    }
  };

  // Handle Quick suggestion prompt clicks inside advisory chat
  const handleQuickPromptClick = (promptText: string) => {
    const userMsg = {
      sender: 'user' as const,
      senderName: 'أنت',
      text: promptText,
      icon: 'fa-user'
    };

    setChatHistory(prev => [...prev, userMsg]);

    setTimeout(() => {
      let replyText = '';
      if (promptText.includes("الربط")) {
        replyText = `للربط الكهربي الصحيح والآمن للمنظومة المصممة بنجاح، اتبع التسلسل التالي:
1. يولد التيار من [الألواح الشمسية] ويوجه مباشرة للانفتر أو منظم الشحن MPPT عالي الكفاءة.
2. يتصل منظم الشحن ومخرج البطاريات بمنافذ الغيار المستمر DC الخاصة بالسبك.
3. يحول [الانفرتر] تيار البطارية والألواح المستمر إلى تيار متناوب منزلي AC بقوة 220V.
4. تتصل الأحمال والمفاتيح المنزلية بمخارج AC لتوزيع الطاقة بالتساوي.`;
      } else if (promptText.includes("زاوية")) {
        replyText = `زاوية تركيب وتوجيه الخلايا الأمثل في المحافظات العراقية:
- في الصيف: يُنصح بضبط الخلايا على زاوية (15 إلى 20 درجة) نظراً لارتفاع موقع الشمس العمودي.
- في الشتاء: يُنصح بضبط الخلايا على زاوية (40 إلى 45 درجة) لاستقبال أشعة الشمس المنخفضة.
- الضبط السنوي الثابت: يفضل تثبيت الحوامل على زاوية (30 درجة تماماً متجهة نحو الجنوب الجغرافي) لضمان أعلى معدل توليد طاقة متوسط على مدار العام.`;
      } else if (promptText.includes("اقتراح")) {
        const loadSum = calcs.instantPeakLoad;
        replyText = `بناءً على الأحمال المضافة حالياً في بيئة المحاكاة والتي تبلغ قدرتها لحظياً (${loadSum.toFixed(0)} واط):
${loadSum > 6000 
  ? '← ننصح تماماً باستخدام "المنظومة الاحترافية 10kW" التي تحمل انفرتر داي ثري فيز 12kW وبطاريات ليثيوم بسعة لا تقل عن 15kWh لتوفير الاستقرار التام للمعدات الحركية كالسبالت.' 
  : loadSum > 2000 
  ? '← المنظومة المتوسطة 5kW مناسبة تماماً لمتطلباتك الحالية، وتوفر كفاية تامة للإضاءة، الراوتر، ثلاجة، التلفاز، وتشغيل مكيف هواء بقوة 1 طن نهاراً.' 
  : '← أحمالك الحالية خفيفة وضئيلة، ويمكن سد متطلباتها بنجاح واقتصاد ممتاز بواسطة "المنظومة الاقتصادية 3kW" المكونة من 6 ألواح وبطارية جيل كلاسيك.'}`;
      }

      setChatHistory(prev => [...prev, {
        sender: 'system',
        senderName: 'المهندس الشمسي المعتمد',
        text: replyText,
        icon: 'fa-robot'
      }]);
    }, 500);
  };

  // Custom User Msg generator
  const handleChatSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatMessage.trim()) return;

    const typedText = chatMessage;
    setChatMessage('');

    setChatHistory(prev => [...prev, {
      sender: 'user',
      senderName: 'أنت',
      text: typedText,
      icon: 'fa-user'
    }]);

    setTimeout(() => {
      // Intelligent mock solar answers that incorporates placed metrics
      let botReply = `بصفتي مستشارك الهندسي، يسرني تقديم المشورة. `;
      
      const lower = typedText.toLowerCase();
      if (lower.includes('بطار') || lower.includes('خزن') || lower.includes('امبير')) {
        botReply += `منظومتك الحالية تحتوي على (${calcs.batteriesCount}) بطارية تخزين بسعة إجمالية تبلغ (${calcs.totalBatteryStorage.toFixed(1)} ك.و.س). في العراق يفضل دائماً تفريغ بطاريات الليثيوم بنسبة لا تتجاوز 85% والجيل بنسبة 50% لضمان إطالة العمر الافتراضي للخلية.`;
      } else if (lower.includes('لوح') || lower.includes('خلية') || lower.includes('توليد')) {
        botReply += `الحجم الحالي لمصفوفة الألواح يبلغ (${calcs.panelsCount}) لوح بقوة توليد كلية تصل لـ (${calcs.totalPvPower} واط). في مدينة ${citiesData[cityKey].name}، يوفر هذا النظام متوسط توليد كهربي يومي يصل لنحو (${calcs.dailyPvYield.toFixed(1)} كيلوواط ساعة) مع اعتبار فواقد التوصيل والغبار المقدرة بـ 25%.`;
      } else if (lower.includes('انفرتر') || lower.includes('عاكس') || lower.includes('داي')) {
        botReply += calcs.selectedInverter 
          ? `العاكس الحالي المستعمل هو بقوة [${calcs.selectedInverter.power} واط] ونسبة استغلال الحمل اللحظي الأقصى تبلغ (${calcs.inverterRatio.toFixed(0)}%). ننصح بعدم زيادة هذه النسبة عن 85% لضمان حماية ترانزستورات الإقلاع بمعدات الإنفيرت التنافسية.` 
          : `يرجى إضافة عاكس انفرتر هجين أو أوف جريد لكي يتم تقدير حجم فولتيات الربط ونسب التحميل المستقرة بنجاح.`;
      } else {
        botReply += `تشير حسابات المحاكاة الحالية لنظامك في ${citiesData[cityKey].name} إلى أن إجمالي الأحمال اليومية المطلوبة تبلغ (${calcs.totalLoadDemand.toFixed(1)} ك.و.س)، المنظومة تعمل بنوع [${calcs.selectedGen ? 'الهجين الشمسي المولد' : 'الشمسي المستقل'}]. هل تود استفسار محدد كحساب مقطع كابل الربط أو سعة قاطع تيار PV؟`;
      }

      setChatHistory(prev => [...prev, {
        sender: 'system',
        senderName: 'المهندس الشمسي المعتمد',
        text: botReply,
        icon: 'fa-robot'
      }]);
    }, 600);
  };

  // Predefined templates loading logic
  const handleTemplateSelect = (templateType: 'eco' | 'medium' | 'premium') => {
    const freshNodes: CanvasNode[] = [];
    const panelModel = productCatalog.pv[0]; // Jinko 550W
    const batModel = productCatalog.battery[0];  // Felicity 5kWh

    if (templateType === 'eco') {
      freshNodes.push(
        { id: `pv-${Date.now()}-1`, type: 'pv', x: 60, y: 60, specs: { quantity: 6 }, model: panelModel },
        { id: `inv-${Date.now()}-2`, type: 'inverter', x: 310, y: 110, specs: { quantity: 1 }, model: productCatalog.inverter[3] }, // Must 3kW Off-Grid
        { id: `bat-${Date.now()}-3`, type: 'battery', x: 180, y: 260, specs: { quantity: 1 }, model: batModel },
        { id: `load-${Date.now()}-4`, type: 'load', x: 530, y: 40, specs: { quantity: 1 }, model: loadCatalog[0] }, // fridge
        { id: `load-${Date.now()}-5`, type: 'load', x: 530, y: 160, specs: { quantity: 1 }, model: loadCatalog[3] }, // lights
        { id: `load-${Date.now()}-6`, type: 'load', x: 530, y: 280, specs: { quantity: 3 }, model: loadCatalog[4] }  // fans
      );
    } else if (templateType === 'medium') {
      freshNodes.push(
        { id: `pv-${Date.now()}-1`, type: 'pv', x: 60, y: 60, specs: { quantity: 10 }, model: panelModel },
        { id: `inv-${Date.now()}-2`, type: 'inverter', x: 310, y: 110, specs: { quantity: 1 }, model: productCatalog.inverter[2] }, // Growatt 5kW Off-Grid
        { id: `bat-${Date.now()}-3`, type: 'battery', x: 180, y: 260, specs: { quantity: 2 }, model: batModel },
        { id: `load-${Date.now()}-4`, type: 'load', x: 530, y: 40, specs: { quantity: 1 }, model: loadCatalog[0] }, // fridge
        { id: `load-${Date.now()}-5`, type: 'load', x: 530, y: 160, specs: { quantity: 1 }, model: loadCatalog[1] }, // ac 1ton
        { id: `load-${Date.now()}-6`, type: 'load', x: 530, y: 280, specs: { quantity: 1 }, model: loadCatalog[5] }  // tv
      );
    } else if (templateType === 'premium') {
      freshNodes.push(
        { id: `pv-${Date.now()}-1`, type: 'pv', x: 60, y: 60, specs: { quantity: 18 }, model: panelModel },
        { id: `inv-${Date.now()}-2`, type: 'inverter', x: 310, y: 110, specs: { quantity: 1 }, model: productCatalog.inverter[0] }, // Deye 8kW Hybrid
        { id: `bat-${Date.now()}-3`, type: 'battery', x: 180, y: 260, specs: { quantity: 4 }, model: batModel },
        { id: `load-${Date.now()}-4`, type: 'load', x: 530, y: 30, specs: { quantity: 1 }, model: loadCatalog[2] }, // ac 2ton
        { id: `load-${Date.now()}-5`, type: 'load', x: 530, y: 140, specs: { quantity: 1 }, model: loadCatalog[0] }, // fridge
        { id: `load-${Date.now()}-6`, type: 'load', x: 530, y: 250, specs: { quantity: 1 }, model: loadCatalog[6] }, // pump
        { id: `load-${Date.now()}-7`, type: 'load', x: 530, y: 360, specs: { quantity: 1 }, model: loadCatalog[7] }  // cctv
      );
    }
    
    setNodes(freshNodes);
  };

  const handleLoadSavedProject = (project: SavedProject) => {
    setNodes(hydrateNodesFromCatalog(project.nodes, adminState));
    setCityKey(project.cityKey);
    setSeasonKey(project.seasonKey);
    setIsGenEnabled(project.isGenEnabled);
    setSelectedNodeId(null);
    setIsAdminOpen(false);
  };

  // 2D Roof panels loading logic
  const handleApplyRoofPanels = (count: number, panelModel: PVModel) => {
    const existingIndex = nodes.findIndex(n => n.type === 'pv');
    if (existingIndex !== -1) {
      setNodes(prev => prev.map((n, idx) => idx === existingIndex ? { ...n, specs: { quantity: count }, model: panelModel } : n));
    } else {
      const newNode: CanvasNode = {
        id: `pv-${Date.now()}`,
        type: 'pv',
        x: 60,
        y: 60,
        specs: { quantity: count },
        model: panelModel
      };
      setNodes(prev => [...prev, newNode]);
    }
  };

  // Auto-wiring connection calculation between nodes
  const wiresPaths = useMemo(() => {
    const renderedWires: Array<{ d: string; className: string; pulseClass: string }> = [];

    const pvNodes = nodes.filter(n => n.type === 'pv');
    const mpptNodes = nodes.filter(n => n.type === 'mppt');
    const batNodes = nodes.filter(n => n.type === 'battery');
    const invNodes = nodes.filter(n => n.type === 'inverter');
    const genNodes = nodes.filter(n => n.type === 'generator');
    const loadNodes = nodes.filter(n => n.type === 'load');

    const hasError = diagnostics.errors.length > 0;
    
    // Choose wiring styling properties
    const normalPvWire = 'wire-green';
    const normalAcWire = 'wire-blue';
    const alertWire = 'wire-red';

    const calcCurve = (nodeA: CanvasNode, nodeB: CanvasNode) => {
      // output socket coords of A (left side)
      const x1 = nodeA.x;
      const y1 = nodeA.y + 40;

      // input socket coords of B (right side)
      const x2 = nodeB.x + 175;
      const y2 = nodeB.y + 40;

      const dx = Math.abs(x1 - x2) * 0.45;
      return `M ${x1} ${y1} C ${x1 - dx} ${y1}, ${x2 + dx} ${y2}, ${x2} ${y2}`;
    };

    // Panels connections
    pvNodes.forEach(pv => {
      if (mpptNodes.length > 0) {
        mpptNodes.forEach(mppt => {
          renderedWires.push({
            d: calcCurve(pv, mppt),
            className: hasError ? alertWire : 'wire-yellow',
            pulseClass: hasError ? '' : 'wire-yellow'
          });
        });
      } else if (batNodes.length > 0) {
        batNodes.forEach(bat => {
          renderedWires.push({
            d: calcCurve(pv, bat),
            className: hasError ? alertWire : normalPvWire,
            pulseClass: hasError ? '' : normalPvWire
          });
        });
      } else if (invNodes.length > 0) {
        invNodes.forEach(inv => {
          renderedWires.push({
            d: calcCurve(pv, inv),
            className: hasError ? alertWire : normalPvWire,
            pulseClass: hasError ? '' : normalPvWire
          });
        });
      }
    });

    // MPPT regulator connections
    mpptNodes.forEach(mppt => {
      batNodes.forEach(bat => {
        renderedWires.push({
          d: calcCurve(mppt, bat),
          className: hasError ? alertWire : normalPvWire,
          pulseClass: hasError ? '' : normalPvWire
        });
      });
    });

    // Batteries to inverter connection
    batNodes.forEach(bat => {
      invNodes.forEach(inv => {
        renderedWires.push({
          d: calcCurve(bat, inv),
          className: hasError ? alertWire : normalAcWire,
          pulseClass: hasError ? '' : normalAcWire
        });
      });
    });

    // Generator connection
    genNodes.forEach(gen => {
      invNodes.forEach(inv => {
        renderedWires.push({
          d: calcCurve(gen, inv),
          className: hasError ? alertWire : normalAcWire,
          pulseClass: hasError ? '' : normalAcWire
        });
      });
    });

    // Inverter output to load appliances
    invNodes.forEach(inv => {
      loadNodes.forEach(load => {
        renderedWires.push({
          d: calcCurve(inv, load),
          className: hasError ? alertWire : normalAcWire,
          pulseClass: hasError ? '' : normalAcWire
        });
      });
    });

    return renderedWires;
  }, [nodes, diagnostics]);

  // Daily power graph curve generation (parabolic solar path vs wavy household consumption)
  const chartPaths = useMemo(() => {
    const width = 300;
    const height = 100;

    const solarMaxH = Math.min(85, calcs.totalPvPower > 0 ? 80 : 0);
    const maxLoadH = Math.min(85, (calcs.instantPeakLoad / (calcs.selectedInverter ? calcs.selectedInverter.power : 5000)) * 60);

    const solarPts: Array<{ x: number; y: number }> = [];
    const loadPts: Array<{ x: number; y: number }> = [];

    for (let h = 0; h <= 24; h++) {
      const x = (h / 24) * width;

      // Parabolic Solar curves
      let solarY = height;
      if (h >= 6 && h <= 18) {
        const angle = Math.PI * (h - 6) / 12;
        solarY = height - Math.sin(angle) * solarMaxH;
      }
      solarPts.push({ x, y: solarY });

      // Double-peak typical Iraqi household load factors (peaks at 8 AM and 8 PM-10 PM)
      let loadFactor = 0.15;
      if (h >= 6 && h <= 10) {
        loadFactor = 0.25 + 0.3 * Math.sin(Math.PI * (h - 6) / 4);
      } else if (h > 10 && h < 16) {
        loadFactor = 0.3;
      } else if (h >= 16 && h <= 23) {
        loadFactor = 0.3 + 0.61 * Math.sin(Math.PI * (h - 16) / 7);
      }

      const finalLoadY = height - loadFactor * Math.max(12, maxLoadH);
      loadPts.push({ x, y: finalLoadY });
    }

    // Connect curve coordinates
    let solarLine = `M ${solarPts[0].x} ${solarPts[0].y}`;
    let solarArea = `M ${solarPts[0].x} ${height} L ${solarPts[0].x} ${solarPts[0].y}`;
    let loadLine = `M ${loadPts[0].x} ${loadPts[0].y}`;
    let loadArea = `M ${loadPts[0].x} ${height} L ${loadPts[0].x} ${loadPts[0].y}`;

    for (let i = 1; i < solarPts.length; i++) {
      solarLine += ` L ${solarPts[i].x} ${solarPts[i].y}`;
      solarArea += ` L ${solarPts[i].x} ${solarPts[i].y}`;
      loadLine += ` L ${loadPts[i].x} ${loadPts[i].y}`;
      loadArea += ` L ${loadPts[i].x} ${loadPts[i].y}`;
    }

    solarArea += ` L ${width} ${height} Z`;
    loadArea += ` L ${width} ${height} Z`;

    return { solarLine, solarArea, loadLine, loadArea };
  }, [calcs]);

  // Render warnings tags
  const alertsBannerClass = diagnostics.errors.length > 0 
    ? "footer-alerts-banner has-error bg-rose-950/40 border border-rose-500/35" 
    : diagnostics.warnings.length > 0 
    ? "footer-alerts-banner has-warning bg-orange-950/40 border border-orange-500/35" 
    : "footer-alerts-banner bg-emerald-950/40 border border-emerald-500/35";

  // Quick State values representation
  let socPercentage = 0;
  if (calcs.batteriesCount > 0) {
    if (calcs.panelsCount === 0 && calcs.totalLoadDemand > 0) {
      socPercentage = 15;
    } else if (calcs.totalPvPower > calcs.instantPeakLoad) {
      socPercentage = 100;
    } else if (calcs.totalPvPower > 0) {
      socPercentage = 75;
    } else {
      socPercentage = 50;
    }
  }

  const batteryRuntimeValue = calcs.batteriesCount === 0
    ? 'لا توجد بطارية'
    : calcs.instantPeakLoad <= 0
    ? 'لا يوجد حمل'
    : calcs.batteryRuntimeHours.toFixed(1);
  const batteryRuntimeUnit = calcs.batteriesCount > 0 && calcs.instantPeakLoad > 0 ? 'ساعة' : '';

  const batteryRuntimeFill = Math.min(100, Math.max(0, (calcs.batteryRuntimeHours / 12) * 100));
  const batteryRuntimeTone = calcs.batteriesCount === 0 || calcs.instantPeakLoad <= 0
    ? 'text-slate-400'
    : calcs.batteryRuntimeHours < 4
    ? 'text-rose-400'
    : calcs.batteryRuntimeHours < 8
    ? 'text-amber-500'
    : 'text-emerald-500';

  // Memoized currently selected node on canvas
  const selectedNode = useMemo(() => {
    return nodes.find(n => n.id === selectedNodeId) || null;
  }, [nodes, selectedNodeId]);

  return (
    <div className={`app-container font-sans min-h-screen h-auto overflow-y-auto flex flex-col p-3 pb-28 gap-3 relative select-none ${theme === 'light' ? 'light-theme text-slate-900 bg-[#f8fafc]' : 'dark-theme text-white bg-[#0A0A0B]'}`}>
      
      {/* Glow Lights background overlays */}
      <div className="glow-bg"></div>

      {/* Primary Header Section */}
      <header className="app-header glass flex flex-col lg:flex-row justify-between items-center px-4 py-2 pt-3 lg:gap-4 no-print h-auto lg:h-[75px] gap-3">
        <div className="header-logo flex items-center gap-3">
          <div className="logo-icon w-12 h-12 rounded-lg bg-[#232326] border border-[#2A2A2D] flex justify-center items-center text-2xl relative">
            <i className="fa-solid fa-solar-panel text-amber-500"></i>
            <div className="pulse-ring"></div>
          </div>
          <div className="logo-text">
            <h1 className="text-sm font-bold tracking-tight text-white">{appDisplayName}</h1>
            <span className="subtitle text-[10px] text-slate-400 block font-semibold font-mono tracking-wider">SOLAR SMART SIMULATOR PLATFORM</span>
          </div>
        </div>

        {/* Header selections dials */}
        <div className="header-controls flex flex-wrap items-center gap-4 lg:gap-6">
          <div className="control-group flex flex-col gap-0.5">
            <label className="text-[10px] text-slate-400 flex items-center gap-1">
              <i className="fa-solid fa-location-dot text-blue-400"></i> المدينة:
            </label>
            <select 
              value={cityKey} 
              onChange={(e) => setCityKey(e.target.value)}
              className="glass-input bg-[#232326] border border-[#3A3A3D] rounded px-2.5 py-1 text-xs text-white outline-none focus:border-blue-500"
            >
              <option value="baghdad">بغداد (6.4 س/يوم)</option>
              <option value="diyala">ديالى (6.2 س/يوم)</option>
              <option value="basra">البصرة (6.6 س/يوم)</option>
              <option value="erbil">أربيل (5.9 س/يوم)</option>
              <option value="mosul">الموصل (5.8 س/يوم)</option>
              <option value="najaf">النجف (6.4 س/يوم)</option>
              <option value="karbala">كربلاء (6.4 س/يوم)</option>
            </select>
          </div>

          <div className="control-group flex flex-col gap-0.5">
            <label className="text-[10px] text-slate-400 flex items-center gap-1">
              <i className="fa-solid fa-cloud-sun text-amber-500"></i> الفصل:
            </label>
            <select 
              value={seasonKey} 
              onChange={(e) => setSeasonKey(e.target.value)}
              className="glass-input bg-[#232326] border border-[#3A3A3D] rounded px-2.5 py-1 text-xs text-white outline-none focus:border-blue-500"
            >
              <option value="summer">موسم الصيف</option>
              <option value="winter">موسم الشتاء</option>
              <option value="annual">المعدل السنوي</option>
            </select>
          </div>

          <div className="control-group toggle-group flex items-center gap-2.5 self-end h-[34px] bg-[#232326] px-3 border border-[#2A2A2D] rounded-xl select-none">
            <span className="text-xs text-[#a0a0a0] font-sans flex items-center gap-1.5 leading-none">
              <i className="fa-solid fa-gears text-[12px] text-purple-400"></i>
              تشغيل المولد الاحتياطي:
            </span>
            <button 
              type="button"
              onClick={() => setIsGenEnabled(!isGenEnabled)}
              className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border border-white/10 transition-colors duration-200 ease-in-out focus:outline-none ${isGenEnabled ? 'bg-emerald-500' : 'bg-[#1a1a1c]'}`}
              id="generator-toggle-button"
            >
              <span
                className={`pointer-events-none inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow-lg ring-0 transition-all duration-200 ease-in-out absolute top-[2px] ${isGenEnabled ? 'left-[18px]' : 'left-[3px]'}`}
              />
            </button>
          </div>

          <div className="header-actions flex gap-2 self-end">
            <button
              type="button"
              onClick={() => setIsAdminOpen(true)}
              className="btn bg-emerald-500/15 border border-emerald-400/30 hover:bg-emerald-500/25 hover:border-emerald-300/60 text-emerald-200 rounded-xl text-xs px-3.5 py-1.5 font-bold flex items-center gap-1.5 cursor-pointer transition-colors"
              title="لوحة التحكم لإدارة الزبائن والمشاريع والمنتجات"
            >
              <i className="fa-solid fa-gauge-high"></i>
              لوحة التحكم
            </button>
            <button 
              type="button"
              onClick={() => setTheme(prev => prev === 'light' ? 'dark' : 'light')}
              className={`btn rounded-xl text-xs px-3.5 py-1.5 font-bold flex items-center gap-1.5 cursor-pointer transition-colors ${theme === 'light' ? 'bg-[#cbd5e1] border-[#cbd5e1] text-slate-800' : 'bg-[#232326] border-[#2A2A2D] text-white hover:bg-[#2D2D31]'}`}
              title="تبديل مظهر واجهة المنظومة (نهاري / ليلي)"
            >
              {theme === 'light' ? (
                <>
                  <i className="fa-solid fa-moon text-blue-600"></i>
                  <span>الوضع الليلي</span>
                </>
              ) : (
                <>
                  <i className="fa-solid fa-sun text-amber-500 animate-spin-slow"></i>
                  <span>الوضع النهاري</span>
                </>
              )}
            </button>
            <button 
              onClick={() => setIsTemplatesOpen(true)}
              className="btn bg-[#232326] border border-[#2A2A2D] hover:bg-[#2D2D31] hover:border-[#3b82f6] text-white rounded-xl text-xs px-3.5 py-1.5 font-semibold flex items-center gap-1.5 cursor-pointer transition-colors"
            >
              <i className="fa-solid fa-wand-magic-sparkles text-[#3b82f6]"></i>
              نماذج جاهزة
            </button>
            <button 
              onClick={() => setIsReportOpen(true)}
              className="btn bg-gradient-to-r from-blue-600 to-blue-500 hover:shadow-[0_4px_15px_rgba(59,130,246,0.35)] hover:scale-[1.02] text-white rounded-xl text-xs px-4 py-1.5 font-bold flex items-center gap-1.5 cursor-pointer transition-all border-none"
            >
              <i className="fa-solid fa-file-pdf"></i>
              عرض التقرير المعتمد (PDF)
            </button>
          </div>
        </div>
      </header>

      {/* Main Grid workspace */}
      <div className="workspace-grid grid grid-cols-1 lg:grid-cols-12 gap-3 flex-1 overflow-visible lg:h-[1050px] min-h-[calc(100vh-145px)] no-print">
        
        {/* Left column sidebar: Gauges & Advisory Stream (3 cols) */}
        <aside className="lg:col-span-3 flex flex-col gap-3 h-full overflow-hidden">
          
          {/* Readings Gauges wrapper */}
          <div className="panel-dashboard glass p-4 flex flex-col overflow-y-auto shrink-0 max-h-[72%]">
            <div className="panel-header border-b border-[#2A2A2D] pb-2 mb-3">
              <h3 className="text-xs font-bold text-blue-400 flex items-center gap-2">
                <i className="fa-solid fa-gauge-high"></i>
                لوحة القراءات المباشرة
              </h3>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-[100px_1fr] gap-3 items-center">
              {/* Animated SOC Circular dial */}
              <div className="flex flex-col items-center select-none">
                <div className="relative w-20 h-20">
                  <svg viewBox="0 0 36 36" className={`circular-chart w-full h-full block ${socPercentage < 25 ? 'red' : socPercentage < 65 ? 'yellow' : 'green'}`}>
                    <path className="circle-bg" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"/>
                    <path 
                      className="circle" 
                      strokeDasharray={`${socPercentage}, 100`}
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center font-bold font-mono text-base">{socPercentage}%</div>
                </div>
                <span className="text-[9px] text-slate-400 mt-1.5 text-center leading-tight">سعة البطارية (SOC)</span>
              </div>

              {/* Numerical Watt-meters rows */}
              <div className="flex flex-col gap-1.5 justify-center text-xs min-w-0">
                <div className="dashboard-meter-row rounded-xl px-2.5 py-1.5 flex justify-between items-center gap-3 transition-colors">
                  <span className="dashboard-meter-label text-[10.5px] flex items-center gap-1.5 min-w-0 leading-tight"><i className="fa-solid fa-sun text-amber-500 shrink-0"></i>إنتاج الألواح:</span>
                  <span className="font-bold text-amber-500 font-mono shrink-0 text-left">{calcs.totalPvPower.toFixed(0)} واط</span>
                </div>
                <div className="dashboard-meter-row rounded-xl px-2.5 py-1.5 flex justify-between items-center gap-3 transition-colors">
                  <span className="dashboard-meter-label text-[10.5px] flex items-center gap-1.5 min-w-0 leading-tight"><i className="fa-solid fa-bolt-lightning text-blue-400 shrink-0"></i>سحب الأحمال:</span>
                  <span className="font-bold text-blue-400 font-mono shrink-0 text-left">{calcs.instantPeakLoad.toFixed(0)} واط</span>
                </div>
                <div className="dashboard-meter-row rounded-xl px-2.5 py-1.5 flex justify-between items-center gap-3 transition-colors">
                  <span className="dashboard-meter-label text-[10.5px] flex items-center gap-1.5 min-w-0 leading-tight"><i className="fa-solid fa-arrows-left-right text-emerald-500 shrink-0"></i>تحميل العاكس:</span>
                  <span className={`font-bold font-mono shrink-0 text-left ${calcs.inverterRatio > 100 ? 'text-[#ff3d00]' : calcs.inverterRatio > 80 ? 'text-[#ff9100]' : 'text-emerald-500'}`}>
                    {calcs.selectedInverter ? `${calcs.inverterRatio.toFixed(0)}%` : 'لا يوجد'}
                  </span>
                </div>
                {isGenEnabled && calcs.selectedGen && calcs.generatorOutput > 0 && (
                  <div className="bg-purple-950/20 border border-purple-500/20 rounded-xl px-2.5 py-1 flex justify-between">
                    <span className="text-[#a0a0a0] text-[11px]"><i className="fa-solid fa-gears text-purple-400 ml-1"></i>طاقة المولد:</span>
                    <span className="font-bold text-amber-500 font-mono">{calcs.generatorOutput.toFixed(0)} واط</span>
                  </div>
                )}
              </div>
            </div>

            <div className={`battery-runtime-card mt-3 rounded-xl border p-3 ${
              theme === 'light'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-950'
                : 'bg-emerald-950/20 border-emerald-500/25 text-emerald-50'
            }`}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-9 h-9 rounded-lg bg-emerald-500/12 border border-emerald-500/25 flex items-center justify-center shrink-0">
                    <i className="fa-solid fa-battery-three-quarters text-emerald-500"></i>
                  </div>
                  <div className="min-w-0">
                    <span className="block text-[10.5px] font-bold leading-tight">الوقت المتبقي لتشغيل البطارية</span>
                    <small className="runtime-muted block text-[9px] text-slate-400 mt-0.5">محسوب على سحب الأحمال الحالي</small>
                  </div>
                </div>
                <strong dir={batteryRuntimeUnit ? 'ltr' : 'rtl'} className={`inline-flex items-baseline gap-1 font-mono text-lg leading-none shrink-0 ${batteryRuntimeTone}`}>
                  <span>{batteryRuntimeValue}</span>
                  {batteryRuntimeUnit && <span className="font-sans text-sm">{batteryRuntimeUnit}</span>}
                </strong>
              </div>
              <div className="mt-2 h-1.5 rounded-full bg-black/10 overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-l from-emerald-500 via-amber-400 to-rose-500 transition-all duration-500"
                  style={{ width: `${batteryRuntimeFill}%` }}
                />
              </div>
              <div className="runtime-meta mt-2 grid grid-cols-2 gap-2 text-[9.5px]">
                <span className="rounded-lg bg-white/5 border border-white/10 px-2 py-1 flex justify-between gap-2">
                  <span className="runtime-muted text-slate-400">الخزن الفعلي</span>
                  <b dir="ltr" className="font-mono inline-flex items-baseline gap-1">{calcs.actualUsableStorage.toFixed(1)} <span className="font-sans">ك.و.س</span></b>
                </span>
                <span className="rounded-lg bg-white/5 border border-white/10 px-2 py-1 flex justify-between gap-2">
                  <span className="runtime-muted text-slate-400">شحن نهاري</span>
                  <b dir={calcs.batteryChargeTime > 0 ? 'ltr' : 'rtl'} className="font-mono inline-flex items-baseline gap-1">
                    {calcs.batteryChargeTime > 0 ? (
                      <>
                        {calcs.batteryChargeTime.toFixed(1)} <span className="font-sans">س</span>
                      </>
                    ) : 'غير متاح'}
                  </b>
                </span>
              </div>
            </div>

            {/* Expanded Double Dashboard: 24h Curve + Live V/A Pathway */}
            <div className="mt-3.5 border-t border-[#2A2A2D] pt-3.5 flex flex-col gap-4 shrink-0 font-sans">
              
              {/* 24-Hour Solar Production vs Demand Graph Widget */}
              <div className="flex flex-col gap-2 font-sans">
                <span className="text-[10.5px] text-[#808080] flex items-center gap-1.5 font-bold font-sans">
                  <i className="fa-solid fa-chart-area text-amber-500 animate-pulse"></i>
                  منحنى الإنتاج الشمسي مقابل الاستهلاك اليومي (24 ساعة)
                </span>
                <div className="bg-[#0c0c0e] border border-[#2A2A2D] rounded-xl p-3 h-[115px] flex flex-col justify-between">
                  <svg className="w-full h-[85px]" viewBox="0 0 300 100" preserveAspectRatio="none">
                    <defs>
                      <linearGradient id="solar-grad-bento" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.25"/>
                        <stop offset="100%" stopColor="#f59e0b" stopOpacity="0"/>
                      </linearGradient>
                      <linearGradient id="load-grad-bento" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.18"/>
                        <stop offset="100%" stopColor="#3b82f6" stopOpacity="0"/>
                      </linearGradient>
                    </defs>
                    
                    {/* Grid Lines */}
                    <line x1="0" y1="100" x2="300" y2="100" stroke="#2A2A2D" strokeWidth="1"/>
                    <line x1="0" y1="50" x2="300" y2="50" stroke="#1c1c1f" strokeDasharray="2,2"/>
                    
                    {/* Chart shapes filled with paths */}
                    <path fill="url(#solar-grad-bento)" d={chartPaths.solarArea}/>
                    <path fill="none" stroke="#f59e0b" strokeWidth="2.5" d={chartPaths.solarLine}/>
                    <path fill="url(#load-grad-bento)" d={chartPaths.loadArea}/>
                    <path fill="none" stroke="#3b82f6" strokeWidth="2" strokeDasharray="3,1" d={chartPaths.loadLine}/>
                  </svg>
                  <div className="flex justify-between text-[8px] text-slate-450 font-mono font-bold mt-1">
                    <span>12 صباحاً</span>
                    <span>6 صباحاً</span>
                    <span>12 ظهراً (الذروة)</span>
                    <span>6 مساءً</span>
                    <span>12 ليلاً</span>
                  </div>
                </div>
              </div>

              {/* Real-time Voltage & Effective Current (V/A) Pathway */}
              <div className="flex flex-col gap-2 font-sans pt-1 border-t border-[#2A2A2D]/60">
                <span className="text-[10.5px] text-slate-350 flex items-center gap-1.5 font-bold">
                  <i className="fa-solid fa-bolt-lightning text-[#00f0ff] animate-bounce"></i>
                  مخطط تدفق الجريان والجهد والشدة الفعّالة للتيار (V / A):
                </span>
                
                <div className="bg-[#0c0c0e] border border-[#2A2A2D] rounded-xl p-3 divide-y divide-white/5 space-y-1.5 max-h-none overflow-visible pr-1">
                  
                  {/* PV Section V/A */}
                  <div className="py-1 flex justify-between items-center text-[10.5px]">
                    <div className="flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
                      <span className="text-amber-500 font-bold">مصفوفة الخلايا الشمسية (PV):</span>
                    </div>
                    <div className="font-mono flex items-center gap-2 text-[10px]">
                      {calcs.panelsCount > 0 ? (
                        <>
                          <span className="text-white font-bold">{calcs.stringVoc.toFixed(0)} <span className="text-amber-400 text-[8.5px] font-sans">فولت Voc</span></span>
                          <span className="text-slate-500">|</span>
                          <span className="text-amber-450 font-bold">{(calcs.totalPvPower / (calcs.stringVoc || 1)).toFixed(1)} <span className="text-amber-400 text-[8.5px] font-sans">أمبير Imp</span></span>
                        </>
                      ) : (
                        <span className="text-slate-500 text-[9px]">غير مضاف</span>
                      )}
                    </div>
                  </div>

                  {/* MPPT Section V/A */}
                  <div className="py-1 flex justify-between items-center text-[10.5px]">
                    <div className="flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-orange-500"></span>
                      <span className="text-orange-450 font-bold">منظم الشحن MPPT:</span>
                    </div>
                    <div className="font-mono flex items-center gap-2 text-[10px]">
                      {calcs.selectedMppt ? (
                        <>
                          <span className="text-white font-bold">{calcs.batteryNominalVoltage} <span className="text-orange-400 text-[8.5px] font-sans">فولت Out</span></span>
                          <span className="text-slate-500">|</span>
                          <span className="text-orange-450 font-bold">{Math.min(calcs.selectedMppt.maxCurrent, Number(((calcs.totalPvPower * 0.9) / calcs.batteryNominalVoltage).toFixed(1)))} <span className="text-orange-400 text-[8.5px] font-sans">أمبير شحن</span></span>
                        </>
                      ) : (
                        <span className="text-slate-500 text-[9px]">مدمج بالعاكس الهجين</span>
                      )}
                    </div>
                  </div>

                  {/* Battery V/A */}
                  <div className="py-1 flex justify-between items-center text-[10.5px]">
                    <div className="flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                      <span className="text-emerald-450 font-bold">مصرف البطاريات (Battery):</span>
                    </div>
                    <div className="font-mono flex items-center gap-2 text-[10px]">
                      {calcs.batteriesCount > 0 ? (
                        <>
                          <span className="text-white font-bold">{calcs.batteryNominalVoltage} <span className="text-emerald-400 text-[8.5px] font-sans">فولت Nom</span></span>
                          <span className="text-slate-500">|</span>
                          <span className="text-emerald-450 font-bold">{(calcs.instantPeakLoad / calcs.batteryNominalVoltage).toFixed(1)} <span className="text-emerald-400 text-[8.5px] font-sans">أمبير تفريغ</span></span>
                        </>
                      ) : (
                        <span className="text-slate-500 text-[9px]">غير مضاف</span>
                      )}
                    </div>
                  </div>

                  {/* Inverter V/A */}
                  <div className="py-1 flex justify-between items-center text-[10.5px]">
                    <div className="flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-cyan-500"></span>
                      <span className="text-cyan-400 font-bold">الانفرتر الهجين (Inverter):</span>
                    </div>
                    <div className="font-mono flex items-center gap-2 text-[10px]">
                      {calcs.selectedInverter ? (
                        <>
                          <span className="text-slate-400 text-[8.5px] font-sans">DC: {calcs.batteryNominalVoltage}V</span>
                          <span className="text-slate-500">|</span>
                          <span className="text-white font-bold">AC: 220V</span>
                          <span className="text-slate-500">|</span>
                          <span className="text-cyan-455 font-bold">{(calcs.instantPeakLoad / 220).toFixed(1)} <span className="text-cyan-400 text-[8.5px] font-sans">أمبير AC</span></span>
                        </>
                      ) : (
                        <span className="text-slate-500 text-[9px]">غير مضاف</span>
                      )}
                    </div>
                  </div>

                  {/* Generator V/A */}
                  {isGenEnabled && calcs.selectedGen && (
                    <div className="py-1 flex justify-between items-center text-[10.5px]">
                      <div className="flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-purple-500"></span>
                        <span className="text-purple-400 font-bold">المولد الاحتياطي:</span>
                      </div>
                      <div className="font-mono flex items-center gap-2 text-[10px]">
                        <span className="text-white font-bold">220V AC</span>
                        <span className="text-slate-500">|</span>
                        <span className="text-purple-400 font-bold">{(calcs.generatorOutput / 220).toFixed(1)} <span className="text-[#a855f7] text-[8.5px] font-sans">أمبير</span></span>
                      </div>
                    </div>
                  )}

                  {/* Load V/A */}
                  <div className="py-1 flex justify-between items-center text-[10.5px]">
                    <div className="flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
                      <span className="text-rose-450 font-bold">سحب الأحمال المجمعة:</span>
                    </div>
                    <div className="font-mono flex items-center gap-2 text-[10px]">
                      <span className="text-white font-bold">220V AC</span>
                      <span className="text-slate-500">|</span>
                      <span className="text-rose-400 font-bold">{(calcs.instantPeakLoad / 220).toFixed(1)} <span className="text-rose-450 text-[8.5px] font-sans">أمبير سحب</span></span>
                      <span className="text-slate-500">|</span>
                      <span className="text-purple-400 font-bold">{(calcs.surgePeakLoad / 220).toFixed(1)} <span className="text-purple-400 text-[8.5px] font-sans">بدء تشغيل</span></span>
                    </div>
                  </div>

                </div>
              </div>

            </div>
          </div>



          {/* AI Advisor chatbot log panel */}
          <div className="panel-advisor glass p-4 flex flex-col overflow-hidden flex-1">
            <div className="panel-header border-b border-white/10 pb-2 mb-3 flex justify-between items-center shrink-0">
              <h3 className="text-xs font-bold text-[#00f0ff] flex items-center gap-2">
                <i className="fa-solid fa-robot"></i>
                المساعد الهندسي الذكي AI
              </h3>
              <span className="text-[9px] font-bold bg-[#00f0ff]/10 text-[#00f0ff] border border-[#00f0ff]/20 rounded-full px-2 py-0.5">نشط</span>
            </div>

            {/* Chat list history */}
            <div className="flex-1 overflow-y-auto space-y-3.5 pr-1 flex flex-col pb-2">
              {chatHistory.map((item, index) => (
                <div 
                  key={index}
                  className={`flex gap-2.5 items-start ${item.sender === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
                >
                  <div className={`w-7 h-7 rounded-full flex justify-center items-center text-xs shrink-0 shadow ${
                    item.sender === 'user' 
                      ? 'bg-white/10 text-white' 
                      : item.sender === 'err' 
                      ? 'bg-rose-950/40 text-[#ff3d00] border border-[#ff3d00]/30 animate-pulse' 
                      : item.sender === 'warn' 
                      ? 'bg-orange-950/40 text-[#ff9100] border border-[#ff9100]/30' 
                      : 'bg-[#00f0ff]/15 text-[#00f0ff] border border-[#00f0ff]/20'
                  }`}>
                    <i className={`fa-solid ${item.icon}`}></i>
                  </div>
                  <div className={`rounded-xl px-3 py-2 text-xs leading-relaxed max-w-[85%] border shadow-sm ${
                    item.sender === 'user'
                      ? 'bg-[#00f0ff]/5 border-[#00f0ff]/10 rounded-tr-none'
                      : item.sender === 'err'
                      ? 'bg-rose-950/25 border-rose-500/20 text-rose-200 rounded-tl-none'
                      : item.sender === 'warn'
                      ? 'bg-orange-950/25 border-orange-500/20 text-orange-200 rounded-tl-none'
                      : 'bg-white/2 border-white/5 text-slate-200 rounded-tl-none'
                  }`}>
                    <span className="text-[9px] font-bold block mb-1 text-slate-400">{item.senderName}</span>
                    <p className="whitespace-pre-line text-[11px] font-normal">{item.text}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* suggestion prompts chips */}
            <div className="shrink-0 pt-2 border-t border-white/5 space-y-2">
              <div className="flex overflow-x-auto gap-1.5 pb-1 select-none scrollbar-none">
                <button 
                  onClick={() => handleQuickPromptClick('شرح كيفية الربط الصحيح')}
                  className="quick-prompt-chip shrink-0 text-[10px] bg-white/4 border border-white/5 hover:bg-[#00f0ff]/10 hover:border-[#00f0ff]/20 text-slate-300 hover:text-[#00f0ff] rounded-full px-2.5 py-1 cursor-pointer transition select-none"
                >
                  كيف أربط المنظومة؟
                </button>
                <button 
                  onClick={() => handleQuickPromptClick('ما هي الزاوية المثلى لبلد العراق')}
                  className="quick-prompt-chip shrink-0 text-[10px] bg-white/4 border border-white/5 hover:bg-[#00f0ff]/10 hover:border-[#00f0ff]/20 text-slate-300 hover:text-[#00f0ff] rounded-full px-2.5 py-1 cursor-pointer transition select-none"
                >
                  زاوية الميل المثلى؟
                </button>
                <button 
                  onClick={() => handleQuickPromptClick('اقتراح منظومة مناسبة للأحمال الحالية')}
                  className="quick-prompt-chip shrink-0 text-[10px] bg-white/4 border border-white/5 hover:bg-[#00f0ff]/10 hover:border-[#00f0ff]/20 text-slate-300 hover:text-[#00f0ff] rounded-full px-2.5 py-1 cursor-pointer transition select-none"
                >
                  اقتراح منظومة منزلية؟
                </button>
              </div>

              {/* Chat Input form */}
              <form onSubmit={handleChatSubmit} className="flex gap-2">
                <input 
                  type="text"
                  placeholder="اسأل مستشارك الهندسي عن الحسابات والمعدات..."
                  value={chatMessage}
                  onChange={(e) => setChatMessage(e.target.value)}
                  className="bg-[#050811]/70 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white placeholder-slate-550 flex-1 outline-none focus:border-[#00f0ff]"
                />
                <button 
                  type="submit" 
                  className="bg-[#00f0ff] text-[#050811] rounded-lg px-3 py-1.5 text-xs font-bold hover:bg-[#00d0df] cursor-pointer"
                >
                  <i className="fa-solid fa-paper-plane-inverse"></i>
                </button>
              </form>
            </div>
          </div>
        </aside>

        {/* Center column: Drag canvas drawer (6 cols) */}
        <section className="lg:col-span-6 flex flex-col h-full overflow-hidden glass rounded-xl border border-white/10 bg-[#070a14]/65 relative">
          
          {/* Canvas header buttons bar */}
          <div className="canvas-controls border-b border-white/10 py-2.5 px-4 bg-[#0a0e1a]/40 flex justify-between items-center shrink-0 z-10">
            <div className="canvas-zoom-group flex items-center gap-1.5">
              <button 
                onClick={() => setZoomLevel(prev => Math.min(1.5, prev + 0.1))}
                className="btn-icon w-8 h-8 rounded border border-white/10 bg-white/3 text-white flex justify-center items-center hover:bg-[#00f0ff] hover:text-[#050811] cursor-pointer"
                title="تكبير"
              >
                <i className="fa-solid fa-magnifying-glass-plus"></i>
              </button>
              <button 
                onClick={() => setZoomLevel(prev => Math.max(0.6, prev - 0.1))}
                className="btn-icon w-8 h-8 rounded border border-white/10 bg-white/3 text-white flex justify-center items-center hover:bg-[#00f0ff] hover:text-[#050811] cursor-pointer"
                title="تصغير"
              >
                <i className="fa-solid fa-magnifying-glass-minus"></i>
              </button>
              <button 
                onClick={() => setZoomLevel(1.0)}
                className="btn-icon w-8 h-8 rounded border border-white/10 bg-white/3 text-white flex justify-center items-center hover:bg-[#00f0ff] hover:text-[#050811] cursor-pointer"
                title="إعادة ضبط"
              >
                <i className="fa-solid fa-arrows-to-eye"></i>
              </button>
            </div>

            <div className="canvas-status-tag bg-emerald-950/25 border border-emerald-500/20 text-[#00e676] rounded-full px-4 py-1 flex items-center gap-2">
              <span className="w-2.5 h-2.5 bg-[#00e676] rounded-full animate-ping"></span>
              <span className="text-[10px] font-bold font-sans">نظام المحاكاة والربط التلقائي نشط</span>
            </div>

            <button 
              onClick={() => setNodes([])}
              className="btn bg-[#ff3d00]/10 border border-[#ff3d00]/30 hover:bg-[#ff3d00]/25 hover:border-[#ff3d00] text-[#ff3d00] text-[10px] font-bold rounded py-1 px-2.5 cursor-pointer flex items-center gap-1.5"
            >
              <i className="fa-solid fa-trash-can"></i>
              مسح اللوحة الفنية
            </button>
          </div>

          {/* Interactive SVG Canvas Area */}
          <div 
            ref={canvasRef}
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDropCanvas}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onClick={(e) => { if (e.target === e.currentTarget) setSelectedNodeId(null); }}
            className={`canvas-container relative flex-1 ${theme === 'light' ? 'bg-[#f1f5f9]' : 'bg-[#050811]'} overflow-hidden cursor-crosshair`}
            style={{
              backgroundColor: theme === 'light' ? '#fcfdfe' : '#050710',
              backgroundImage: theme === 'light' 
                ? 'radial-gradient(rgba(15, 23, 42, 0.065) 1px, transparent 1px), linear-gradient(rgba(15, 23, 42, 0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(15, 23, 42, 0.02) 1px, transparent 1px)'
                : 'radial-gradient(rgba(255, 255, 255, 0.045) 1px, transparent 1px), linear-gradient(rgba(255, 255, 255, 0.012) 1px, transparent 1px), linear-gradient(90deg, rgba(255, 255, 255, 0.012) 1px, transparent 1px)',
              backgroundSize: '20px 20px, 100px 100px, 100px 100px',
              backgroundPosition: 'center'
            }}
          >
            {/* SVG wires connections pathways layer */}
            <svg 
              className="canvas-svg absolute inset-0 w-full h-full pointer-events-none select-none z-1 overflow-visible"
              style={{ transform: `scale(${zoomLevel})`, transformOrigin: 'top left' }}
            >
              {wiresPaths.map((wire, idx) => (
                <g key={idx}>
                  <path d={wire.d} className={`wire-path ${wire.className}`} />
                  {wire.pulseClass && (
                    <path d={wire.d} className={`wire-path wire-flow-charge ${wire.pulseClass}`} />
                  )}
                </g>
              ))}
            </svg>

            {/* Draggable components layout absolute positions rendered inside zoom scale */}
            <div 
              className="nodes-container absolute inset-0 w-full h-full z-10 block pointer-events-auto"
              style={{ transform: `scale(${zoomLevel})`, transformOrigin: 'top left' }}
            >
              {nodes.map((node) => {
                const hasNodeError = diagnostics.errors.some(err => 
                  err.id.includes('overvoltage') && node.type === 'pv' ||
                  err.id.includes('overload') && node.type === 'inverter' ||
                  err.id.includes('missing-battery') && node.type === 'battery'
                );

                const isSelected = selectedNodeId === node.id;
                let activeRingClass = "";
                if (isSelected) {
                  if (node.type === 'pv') activeRingClass = "ring-2 ring-[#ffd600] border-[#ffd600]/80 shadow-[0_0_20px_rgba(255,214,0,0.35)] z-50";
                  else if (node.type === 'battery') activeRingClass = "ring-2 ring-[#00e676] border-[#00e676]/80 shadow-[0_0_20px_rgba(0,230,118,0.35)] z-50";
                  else if (node.type === 'mppt') activeRingClass = "ring-2 ring-orange-500 border-orange-500/80 shadow-[0_0_20px_rgba(249,115,22,0.35)] z-50";
                  else if (node.type === 'inverter') activeRingClass = "ring-2 ring-[#00f0ff] border-[#00f0ff]/80 shadow-[0_0_20px_rgba(0,240,255,0.35)] z-50";
                  else if (node.type === 'generator') activeRingClass = "ring-2 ring-purple-550 border-purple-500/80 shadow-[0_0_20px_rgba(168,85,247,0.35)] z-50";
                  else activeRingClass = "ring-2 ring-blue-500 border-blue-500/80 shadow-[0_0_20px_rgba(59,130,246,0.35)] z-50";
                }

                // Custom icon classes
                let icon = 'fa-circle-nodes';
                let colorTheme = 'pv-color';
                let name = node.model.brand || (node.model as any).name;

                if (node.type === 'pv') { icon = 'fa-solar-panel'; colorTheme = 'pv-color'; }
                else if (node.type === 'mppt') { icon = 'fa-microchip'; colorTheme = 'mppt-color'; }
                else if (node.type === 'battery') { icon = 'fa-battery-three-quarters'; colorTheme = 'battery-color'; }
                else if (node.type === 'inverter') { icon = 'fa-arrows-spin'; colorTheme = 'inverter-color'; }
                else if (node.type === 'generator') { icon = 'fa-gears'; colorTheme = 'gen-color'; }
                else if (node.type === 'load') {
                  icon = (node.model as LoadModel).iconClass;
                  colorTheme = 'load-color';
                }

                return (
                  <div 
                    key={node.id}
                    id={node.id}
                    onMouseDown={(e) => handleNodeMouseDown(e, node.id)}
                    className={`canvas-node ${hasNodeError ? 'active-error' : ''} ${activeRingClass} transition-all duration-200`}
                    style={{ left: `${node.x}px`, top: `${node.y}px` }}
                  >
                    {/* Node Header */}
                    <div className="node-header flex justify-between items-center border-b border-white/10 pb-1 mb-1.5">
                      <span className={`node-title text-[10px] font-bold flex items-center gap-1.5 ${colorTheme}`}>
                        <i className={`fa-solid ${icon}`}></i>
                        {name}
                      </span>
                      <button 
                        onClick={() => handleNodeDelete(node.id)}
                        className="node-delete-btn text-slate-500 hover:text-[#ff3d00] transition-colors cursor-pointer text-xs"
                      >
                        <i className="fa-solid fa-xmark"></i>
                      </button>
                    </div>

                    {/* Node Body specs */}
                    <div className="node-body text-[10px] flex flex-col gap-1">
                      {['pv', 'mppt', 'battery', 'inverter', 'generator'].includes(node.type) && (
                        <div className="node-input-group flex flex-col gap-0.5 mb-1 bg-black/30 p-1 rounded border border-white/5">
                          <label className="text-[8px] text-[#8a99ad] leading-none mb-0.5">تغيير الموديل/النوع:</label>
                          <select
                            value={node.model.id}
                            onChange={(e) => handleNodeModelChange(node.id, e.target.value)}
                            onMouseDown={(e) => e.stopPropagation()}
                            onClick={(e) => e.stopPropagation()}
                            className="bg-black/85 text-white border border-white/10 hover:border-blue-550 rounded px-1.5 py-0.5 font-sans font-semibold text-[9px] w-full focus:outline-none cursor-pointer"
                          >
                            {(productCatalog as any)[node.type]?.map((item: any) => (
                              <option key={item.id} value={item.id} className="bg-[#161618] text-white">
                                {item.brand} ({item.model})
                              </option>
                            ))}
                          </select>
                        </div>
                      )}

                      <span className="text-[9px] text-[#64748b] truncate block" title={(node.model as any).model || ''}>
                        {(node.model as any).model || 'حمل كهربائي منزلي'}
                      </span>
                      
                      {node.type === 'pv' && (
                        <>
                          <div className="node-spec-row flex justify-between"><span className="lbl text-slate-400">القدرة:</span><span className="val text-white font-sans">{(node.model as PVModel).power}W</span></div>
                          <div className="node-spec-row flex justify-between"><span className="lbl text-slate-400">فولتية Voc:</span><span className="val text-white font-sans">{(node.model as PVModel).voc}V</span></div>
                          <div className="node-input-group flex flex-col gap-0.5 mt-1.5">
                            <label className="text-[8px] text-slate-500">عدد الألواح المجموع:</label>
                            <input 
                              type="number" 
                              min="1" 
                              max="48"
                              value={node.specs.quantity}
                              onChange={(e) => handleNodeQtyChange(node.id, Number(e.target.value))}
                              className="node-number-input bg-black/60 border border-white/5 rounded px-2.5 py-0.5 text-[#ffd600] font-sans text-[10px] w-full"
                            />
                          </div>
                        </>
                      )}

                      {node.type === 'battery' && (
                        <>
                          <div className="node-spec-row flex justify-between"><span className="lbl text-slate-400">السعة:</span><span className="val text-white font-sans">{(node.model as BatteryModel).energy}Wh</span></div>
                          <div className="node-spec-row flex justify-between"><span className="lbl text-slate-400">الجهد:</span><span className="val text-white font-sans">{(node.model as BatteryModel).voltage}V</span></div>
                          <div className="node-input-group flex flex-col gap-0.5 mt-1.5">
                            <label className="text-[8px] text-slate-500">عدد البطاريات:</label>
                            <input 
                              type="number" 
                              min="1" 
                              max="24"
                              value={node.specs.quantity}
                              onChange={(e) => handleNodeQtyChange(node.id, Number(e.target.value))}
                              className="node-number-input bg-black/60 border border-white/5 rounded px-2.5 py-0.5 text-[#00e676] font-sans text-[10px] w-full"
                            />
                          </div>
                        </>
                      )}

                      {node.type === 'inverter' && (
                        <>
                          <div className="node-spec-row flex justify-between"><span className="lbl text-slate-400">القدرة:</span><span className="val text-white font-sans">{(node.model as InverterModel).power}W</span></div>
                          <div className="node-spec-row flex justify-between"><span className="lbl text-slate-400">الموديل:</span><span className="val text-[8px] text-[#00f0ff]">{(node.model as InverterModel).type}</span></div>
                        </>
                      )}

                      {node.type === 'mppt' && (
                        <>
                          <div className="node-spec-row flex justify-between"><span className="lbl text-slate-400">أقصى أمبير:</span><span className="val text-white font-sans">{(node.model as MPPTModel).maxCurrent}A</span></div>
                          <div className="node-spec-row flex justify-between"><span className="lbl text-slate-400">فولتية PV:</span><span className="val text-white font-sans">{(node.model as MPPTModel).maxPvVoc}V</span></div>
                        </>
                      )}

                      {node.type === 'generator' && (
                        <>
                          <div className="node-spec-row flex justify-between"><span className="lbl text-slate-400">القدرة:</span><span className="val text-white font-sans">{(node.model as GeneratorModel).power}W</span></div>
                          <div className="node-spec-row flex justify-between"><span className="lbl text-slate-400">الوقود:</span><span className="val text-white text-[9px]">{(node.model as GeneratorModel).fuelType}</span></div>
                        </>
                      )}

                      {node.type === 'load' && (
                        <>
                          <div className="node-spec-row flex justify-between"><span className="lbl text-slate-400">الاستهلاك:</span><span className="val text-white font-sans">{(node.model as LoadModel).power}W</span></div>
                          <div className="node-spec-row flex justify-between"><span className="lbl text-slate-400">تشغيل ليلي:</span><span className="val text-white">{(node.model as LoadModel).nightHours} س</span></div>
                          <div className="node-input-group flex flex-col gap-0.5 mt-1.5">
                            <label className="text-[8px] text-slate-500">الكمية المشغلة:</label>
                            <input 
                              type="number" 
                              min="1" 
                              max="20"
                              value={node.specs.quantity}
                              onChange={(e) => handleNodeQtyChange(node.id, Number(e.target.value))}
                              className="node-number-input bg-black/60 border border-white/5 rounded px-2.5 py-0.5 text-[#00f0ff] font-sans text-[10px] w-full"
                            />
                          </div>
                        </>
                      )}
                    </div>

                    {/* Port sockets */}
                    <div className="node-port input"></div>
                    <div className="node-port output"></div>
                  </div>
                );
              })}
            </div>

            {/* Empty Canvas visual guidelines */}
            {nodes.length === 0 && (
              <div className="canvas-empty-state absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center justify-center text-center max-w-[320px] pointer-events-none z-0 text-slate-450 space-y-3 p-4">
                <div className="empty-icon text-4xl text-[#00f0ff] animate-bounce">
                  <i className="fa-solid fa-circle-nodes"></i>
                </div>
                <h4 className="text-sm font-bold text-white">لوحة التصميم خالية</h4>
                <p className="text-[11px] text-slate-450 leading-relaxed">
                  قم بسحب الألواح والخلايا والانفرتر والبطاريات من مكتبة المكونات على اليمين وأفلتها هنا، أو ببساطة **انقر فوق الأيقونة مباشرة** لبناء مخطط التوصيلات المضيء!
                </p>
              </div>
            )}
          </div>
        </section>

        {/* Right column sidebar: Component list (3 cols) */}
        <aside className="lg:col-span-3 flex flex-col gap-4 h-full overflow-y-auto glass p-4 select-none shrink-0 no-print">
          {selectedNode ? (
            <div className="flex flex-col gap-4 h-full transition-all duration-300">
              <div className="active-inspector-header border-b border-[#00f0ff]/20 pb-2.5 flex justify-between items-center">
                <div className="flex flex-col">
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">تعديل المكون النشط</span>
                  <h3 className="text-xs font-bold text-[#00f0ff] flex items-center gap-1.5 mt-0.5">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#00f0ff] opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-[#00f0ff]"></span>
                    </span>
                    {selectedNode.type === 'pv' ? 'لوح خلايا شمسية' :
                     selectedNode.type === 'mppt' ? 'منظم شحن MPPT' :
                     selectedNode.type === 'battery' ? 'بطارية خزن تيار مستمر' :
                     selectedNode.type === 'inverter' ? 'عاكس انفرتر هجين' :
                     selectedNode.type === 'generator' ? 'مولد كهربائي ديزل' :
                     'حمل كهربائي منزلي'}
                  </h3>
                </div>
                <button 
                  onClick={() => setSelectedNodeId(null)}
                  className="text-slate-400 hover:text-white transition-colors cursor-pointer text-xs flex items-center gap-1 bg-white/5 hover:bg-white/10 px-2 py-1 rounded-lg border border-white/5 animate-fade-in"
                >
                  الرجوع للمكتبة <i className="fa-solid fa-arrow-left text-[10px]"></i>
                </button>
              </div>

              {/* Active Item Specs details */}
              <div className="active-item-card bg-[#121420]/80 border border-white/5 rounded-xl p-3.5 space-y-3.5 flex flex-col shadow-inner">
                <div className="flex items-center gap-2.5">
                  <div className={`p-2.5 rounded-xl bg-white/5 border border-white/10 text-base`}>
                    <i className={`fa-solid ${
                      selectedNode.type === 'pv' ? 'fa-solar-panel text-amber-500' :
                      selectedNode.type === 'mppt' ? 'fa-microchip text-orange-500' :
                      selectedNode.type === 'battery' ? 'fa-battery-three-quarters text-emerald-500' :
                      selectedNode.type === 'inverter' ? 'fa-arrows-spin text-cyan-400' :
                      selectedNode.type === 'generator' ? 'fa-gears text-purple-400' :
                      'fa-plug text-rose-450'
                    }`}></i>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-bold text-white text-xs truncate">{selectedNode.model.brand}</h4>
                    <p className="text-[10px] text-slate-400 truncate">{(selectedNode.model as any).model || 'حمل كهربائي منزلي'}</p>
                  </div>
                </div>

                {/* Grid list details option picker */}
                {['pv', 'mppt', 'battery', 'inverter', 'generator'].includes(selectedNode.type) && (
                  <div className="space-y-2">
                    <label className="text-[10px] text-slate-400 block font-bold">الأنواع والموديلات المتطابقة:</label>
                    <div className="grid grid-cols-1 gap-2 max-h-[190px] overflow-y-auto pr-1">
                      {(productCatalog as any)[selectedNode.type]?.map((item: any) => {
                        const isCurrent = item.id === selectedNode.model.id;
                        return (
                          <div
                            key={item.id}
                            onClick={() => handleNodeModelChange(selectedNode.id, item.id)}
                            className={`text-right w-full p-2.5 rounded-xl border text-xs transition-all flex flex-col gap-1 cursor-pointer select-none ${
                              isCurrent 
                                ? 'bg-blue-600/10 border-blue-500 text-white shadow-[0_0_12px_rgba(59,130,246,0.15)] font-semibold scale-[1.01]' 
                                : 'bg-black/25 border-white/5 hover:bg-white/5 text-slate-300'
                            }`}
                          >
                            <div className="flex justify-between w-full items-center">
                              <span className="font-semibold text-white truncate">{item.brand} - {item.model}</span>
                              <span className="text-[10px] font-mono text-emerald-400 font-bold">${item.price}</span>
                            </div>
                            {item.specsText && (
                              <span className="text-[9px] text-[#8a99ad] leading-snug line-clamp-1">{item.specsText}</span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Tech specifications summary */}
                <div className="bg-[#050811]/70 border border-white/5 rounded-xl p-3 text-[10.5px] space-y-2">
                  <span className="text-[9px] text-[#64748b] block font-bold uppercase tracking-wider mb-1">المواصفات الهندسية:</span>
                  
                  {selectedNode.type === 'pv' && (
                    <>
                      <div className="flex justify-between"><span className="text-slate-400">القدرة المقدرة:</span><span className="text-white font-mono">{(selectedNode.model as PVModel).power}W</span></div>
                      <div className="flex justify-between"><span className="text-slate-400">فولتية الدارة Voc:</span><span className="text-white font-mono">{(selectedNode.model as PVModel).voc}V</span></div>
                      <div className="flex justify-between"><span className="text-slate-400">تيار القصر Isc:</span><span className="text-white font-mono">{(selectedNode.model as PVModel).isc}A</span></div>
                      <div className="flex justify-between"><span className="text-slate-400">كفاءة اللوح الكلية:</span><span className="text-emerald-400 font-bold font-mono">{(selectedNode.model as PVModel).eff}%</span></div>
                    </>
                  )}

                  {selectedNode.type === 'mppt' && (
                    <>
                      <div className="flex justify-between"><span className="text-slate-400">أقصى تيار شحن:</span><span className="text-white font-mono">{(selectedNode.model as MPPTModel).maxCurrent}A</span></div>
                      <div className="flex justify-between"><span className="text-slate-400">أقصى جهد مدخل Voc:</span><span className="text-white font-mono">{(selectedNode.model as MPPTModel).maxPvVoc}V</span></div>
                      <div className="flex justify-between"><span className="text-slate-400 font-sans">فولتية بنك البطاريات:</span><span className="text-white text-[9.5px]">{(selectedNode.model as MPPTModel).batteryVoltage}</span></div>
                    </>
                  )}

                  {selectedNode.type === 'battery' && (
                    <>
                      <div className="flex justify-between"><span className="text-slate-400">النوع الكيميائي:</span><span className="text-white">{(selectedNode.model as BatteryModel).chemistry}</span></div>
                      <div className="flex justify-between"><span className="text-slate-400">السعة المقدرة:</span><span className="text-white font-mono">{(selectedNode.model as BatteryModel).energy}Wh</span></div>
                      <div className="flex justify-between"><span className="text-slate-400">الجهد الاسمي:</span><span className="text-white font-mono">{(selectedNode.model as BatteryModel).voltage}V</span></div>
                      <div className="flex justify-between"><span className="text-slate-400">سعة الأمبير المقدرة:</span><span className="text-white font-mono">{(selectedNode.model as BatteryModel).capacity}Ah</span></div>
                      <div className="flex justify-between"><span className="text-slate-400">كفاءة التفريغ المقدرة:</span><span className="text-emerald-400 font-bold font-mono">{(selectedNode.model as BatteryModel).dod}%</span></div>
                    </>
                  )}

                  {selectedNode.type === 'inverter' && (
                    <>
                      <div className="flex justify-between"><span className="text-slate-400">القدرة التوليدية للعاكس:</span><span className="text-white font-mono">{(selectedNode.model as InverterModel).power}W</span></div>
                      <div className="flex justify-between"><span className="text-slate-400">تصنيف التشكيلة:</span><span className="text-cyan-400 font-sans font-bold text-[9.5px]">{(selectedNode.model as InverterModel).type}</span></div>
                      <div className="flex justify-between"><span className="text-slate-400">جهد بنك البطاريات:</span><span className="text-white font-mono">{(selectedNode.model as InverterModel).batVoltage}V</span></div>
                      <div className="flex justify-between"><span className="text-slate-400">أقصى فولتية Voc للألواح:</span><span className="text-white font-mono">{(selectedNode.model as InverterModel).maxPvVoc}V</span></div>
                      <div className="flex justify-between"><span className="text-slate-400">كفاءة التحويل الأقصى:</span><span className="text-emerald-400 font-semibold font-mono">{(selectedNode.model as InverterModel).efficiency}%</span></div>
                    </>
                  )}

                  {selectedNode.type === 'generator' && (
                    <>
                      <div className="flex justify-between"><span className="text-slate-400">القدرة المقدرة:</span><span className="text-white font-mono">{(selectedNode.model as GeneratorModel).power}W</span></div>
                      <div className="flex justify-between"><span className="text-slate-400">نوع الوقود:</span><span className="text-white font-bold">{(selectedNode.model as GeneratorModel).fuelType}</span></div>
                    </>
                  )}

                  {selectedNode.type === 'load' && (
                    <>
                      <div className="flex justify-between"><span className="text-slate-400">القدرة المستهلكة:</span><span className="text-white font-mono">{(selectedNode.model as LoadModel).power}W</span></div>
                      <div className="flex justify-between"><span className="text-slate-400">فترة التشغيل النهاري:</span><span className="text-white font-mono">{(selectedNode.model as LoadModel).dayHours} ساعة</span></div>
                      <div className="flex justify-between"><span className="text-slate-400">فترة التشغيل الليلي:</span><span className="text-white font-mono">{(selectedNode.model as LoadModel).nightHours} ساعة</span></div>
                    </>
                  )}

                  <div className="border-t border-white/5 pt-2 flex justify-between items-center text-[10.5px] mt-2 bg-white/2 p-1.5 rounded-lg">
                    <span className="text-slate-400 bg-emerald-950/25 text-[#00e676] px-1.5 py-0.5 rounded border border-emerald-500/10 font-bold">الضمان: {selectedNode.model.warranty || 1} سنة</span>
                    <span className="text-emerald-400 font-bold font-sans text-xs">${selectedNode.model.price || 0}</span>
                  </div>
                </div>

                {/* Advisory details */}
                {selectedNode.model.specsText && (
                  <div className="bg-blue-950/20 border border-blue-500/15 rounded-xl p-3 text-[10.5px] text-slate-300 leading-relaxed">
                    <i className="fa-solid fa-circle-info text-blue-400 ml-1"></i>
                    {selectedNode.model.specsText}
                  </div>
                )}

                {/* Quantity adjustments slider */}
                {['pv', 'battery', 'load'].includes(selectedNode.type) && (
                  <div className="bg-[#161618] border border-white/5 rounded-xl p-3 flex flex-col gap-2">
                    <div className="flex justify-between items-center text-[11px]">
                      <span className="text-slate-300">الكمية للتضمين بالمشروع:</span>
                      <span className="font-bold font-mono text-emerald-400 text-xs bg-black/40 px-2.5 py-0.5 rounded border border-white/5">{selectedNode.specs.quantity || 1} وحدات</span>
                    </div>
                    <input 
                      type="range" 
                      min="1" 
                      max={selectedNode.type === 'pv' ? 48 : selectedNode.type === 'battery' ? 24 : 20}
                      value={selectedNode.specs.quantity || 1}
                      onChange={(e) => handleNodeQtyChange(selectedNode.id, Number(e.target.value))}
                      className="w-full h-1 bg-black/55 rounded-lg appearance-none cursor-pointer accent-[#00f0ff]"
                    />
                  </div>
                )}

                {/* Actions button */}
                <button 
                  onClick={() => {
                    handleNodeDelete(selectedNode.id);
                    setSelectedNodeId(null);
                  }}
                  className="w-full bg-[#ff3d00]/15 hover:bg-[#ff3d00]/30 border border-[#ff3d00]/40 text-[#ff3d00] font-bold py-2.5 rounded-xl text-xs transition cursor-pointer flex justify-center items-center gap-2 mt-1 animate-pulse"
                >
                  <i className="fa-solid fa-trash-can text-[10.5px]"></i>
                  حذف هذا المكون من النظام
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="sidebar-title border-b border-white/10 pb-2">
                <h3 className="text-xs font-bold text-[#00f0ff] flex items-center gap-2">
                  <i className="fa-solid fa-cubes"></i>
                  مكتبة المكونات
                </h3>
                <span className="title-hint text-[9px] text-[#64748b] block mt-1">انقر فوق العنصر لإضافته بمكانه أو اسحبه للمكان المطلوب</span>
              </div>

              {/* Primary hardware group */}
              <div className="component-category space-y-2">
                <h4 className="category-header text-[10px] text-slate-500 font-bold uppercase tracking-wider border-r-3 border-[#00f0ff] pr-1.5">توليد وتخزين الطاقة</h4>
                <div className="palette-list space-y-1.5 flex flex-col">
                  {/* PV Section */}
                  <div className="flex flex-col gap-1 w-full">
                    <div 
                      draggable={true}
                      onDragStart={() => handleDragStartSidebar('pv')}
                      onClick={() => handleSidebarItemClick('pv')}
                      className={`palette-item transition-all hover:translate-x-1 cursor-pointer flex justify-between items-center ${expandedCategory === 'pv' ? 'border-[#ffd600]/45 bg-[#ffd600]/5' : ''}`}
                    >
                      <div className="flex items-center gap-2">
                        <div className="item-icon pv-color"><i className="fa-solid fa-solar-panel"></i></div>
                        <div className="item-info text-xs">
                          <h5 className="font-bold text-white text-[11px]">لوح خلايا شمسية (PV)</h5>
                          <span className="text-[9px] text-slate-400 block mt-0.5">توليد طاقة مستمرة DC</span>
                        </div>
                      </div>
                      <i className={`fa-solid fa-chevron-left text-[9px] text-slate-400 transition-transform duration-200 ml-1 ${expandedCategory === 'pv' ? '-rotate-90' : ''}`}></i>
                    </div>
                    {expandedCategory === 'pv' && (
                      <div className="bg-black/45 border border-white/5 rounded-xl p-2.5 space-y-2 mt-1 mx-0.5 animate-fade-in text-right">
                        <span className="text-[9px] text-slate-400 block font-semibold mb-1 border-b border-white/5 pb-1">الأنواع والموديلات المتوفرة:</span>
                        <div className="flex flex-col gap-1.5 max-h-[160px] overflow-y-auto pr-1">
                          {productCatalog.pv.map((item) => (
                            <div 
                              key={item.id}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleSidebarItemClick('pv', undefined, item);
                              }}
                              className="bg-[#121420]/75 hover:bg-[#121420] border border-white/5 hover:border-[#ffd600]/50 rounded-lg p-2 flex justify-between items-center cursor-pointer transition text-[10px]"
                            >
                              <div className="flex flex-col text-right">
                                <span className="font-bold text-white text-[10.5px]">{item.brand}</span>
                                <span className="text-slate-400 text-[9.5px] truncate max-w-[130px]" title={item.model}>{item.model}</span>
                                <span className="text-[#8a99ad] text-[8.5px] mt-0.5">{item.power}W | Voc: {item.voc}V</span>
                              </div>
                              <div className="flex flex-col items-end gap-1 shrink-0">
                                <span className="text-emerald-400 font-bold font-mono text-[10.5px]">${item.price}</span>
                                <span className="bg-[#ffd600]/10 text-[#ffd600] text-[7.5px] px-1 py-0.5 rounded font-sans font-bold border border-[#ffd600]/15">إضافة +</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* MPPT Section */}
                  <div className="flex flex-col gap-1 w-full">
                    <div 
                      draggable={true}
                      onDragStart={() => handleDragStartSidebar('mppt')}
                      onClick={() => handleSidebarItemClick('mppt')}
                      className={`palette-item transition-all hover:translate-x-1 cursor-pointer flex justify-between items-center ${expandedCategory === 'mppt' ? 'border-orange-500/45 bg-orange-500/5' : ''}`}
                    >
                      <div className="flex items-center gap-2">
                        <div className="item-icon mppt-color"><i className="fa-solid fa-microchip"></i></div>
                        <div className="item-info text-xs">
                          <h5 className="font-bold text-white text-[11px]">منظم شحن MPPT</h5>
                          <span className="text-[9px] text-slate-400 block mt-0.5">تأمين كفاءة شحن البطارية</span>
                        </div>
                      </div>
                      <i className={`fa-solid fa-chevron-left text-[9px] text-slate-400 transition-transform duration-200 ml-1 ${expandedCategory === 'mppt' ? '-rotate-90' : ''}`}></i>
                    </div>
                    {expandedCategory === 'mppt' && (
                      <div className="bg-black/45 border border-white/5 rounded-xl p-2.5 space-y-2 mt-1 mx-0.5 animate-fade-in text-right">
                        <span className="text-[9px] text-slate-400 block font-semibold mb-1 border-b border-white/5 pb-1">الماركات والقدرات المتوفرة:</span>
                        <div className="flex flex-col gap-1.5 max-h-[160px] overflow-y-auto pr-1">
                          {productCatalog.mppt.map((item) => (
                            <div 
                              key={item.id}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleSidebarItemClick('mppt', undefined, item);
                              }}
                              className="bg-[#121420]/75 hover:bg-[#121420] border border-white/5 hover:border-orange-550/50 rounded-lg p-2 flex justify-between items-center cursor-pointer transition text-[10px]"
                            >
                              <div className="flex flex-col text-right">
                                <span className="font-bold text-white text-[10.5px]">{item.brand}</span>
                                <span className="text-slate-400 text-[9.5px] truncate max-w-[130px]" title={item.model}>{item.model}</span>
                                <span className="text-[#8a99ad] text-[8.5px] mt-0.5">{item.maxCurrent}A | Voc: {item.maxPvVoc}V</span>
                              </div>
                              <div className="flex flex-col items-end gap-1 shrink-0">
                                <span className="text-emerald-400 font-bold font-mono text-[10.5px]">${item.price}</span>
                                <span className="bg-orange-500/10 text-orange-450 text-[7.5px] px-1 py-0.5 rounded font-sans font-bold border border-orange-500/15">تضمين +</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Battery Section */}
                  <div className="flex flex-col gap-1 w-full">
                    <div 
                      draggable={true}
                      onDragStart={() => handleDragStartSidebar('battery')}
                      onClick={() => handleSidebarItemClick('battery')}
                      className={`palette-item transition-all hover:translate-x-1 cursor-pointer flex justify-between items-center ${expandedCategory === 'battery' ? 'border-[#00e676]/45 bg-[#00e676]/5' : ''}`}
                    >
                      <div className="flex items-center gap-2">
                        <div className="item-icon battery-color"><i className="fa-solid fa-battery-three-quarters"></i></div>
                        <div className="item-info text-xs">
                          <h5 className="font-bold text-white text-[11px]">بطارية خزن تيار مستمر</h5>
                          <span className="text-[9px] text-slate-400 block mt-0.5">تخزين حديدي LFP / Gel</span>
                        </div>
                      </div>
                      <i className={`fa-solid fa-chevron-left text-[9px] text-slate-400 transition-transform duration-200 ml-1 ${expandedCategory === 'battery' ? '-rotate-90' : ''}`}></i>
                    </div>
                    {expandedCategory === 'battery' && (
                      <div className="bg-black/45 border border-white/5 rounded-xl p-2.5 space-y-2 mt-1 mx-0.5 animate-fade-in text-right">
                        <span className="text-[9px] text-slate-400 block font-semibold mb-1 border-b border-white/5 pb-1">التقنيات والسعات المتاحة:</span>
                        <div className="flex flex-col gap-1.5 max-h-[160px] overflow-y-auto pr-1">
                          {productCatalog.battery.map((item) => (
                            <div 
                              key={item.id}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleSidebarItemClick('battery', undefined, item);
                              }}
                              className="bg-[#121420]/75 hover:bg-[#121420] border border-white/5 hover:border-emerald-500/50 rounded-lg p-2 flex justify-between items-center cursor-pointer transition text-[10px]"
                            >
                              <div className="flex flex-col text-right">
                                <span className="font-bold text-white text-[10.5px]">{item.brand}</span>
                                <span className="text-slate-400 text-[9.5px] truncate max-w-[130px]" title={item.model}>{item.model}</span>
                                <span className="text-[#8a99ad] text-[8.5px] mt-0.5">{item.chemistry} | {item.energy}Wh</span>
                              </div>
                              <div className="flex flex-col items-end gap-1 shrink-0">
                                <span className="text-emerald-400 font-bold font-mono text-[10.5px]">${item.price}</span>
                                <span className="bg-emerald-500/10 text-emerald-400 text-[7.5px] px-1 py-0.5 rounded font-sans font-bold border border-emerald-500/15">إضافة +</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Inverter Section */}
                  <div className="flex flex-col gap-1 w-full">
                    <div 
                      draggable={true}
                      onDragStart={() => handleDragStartSidebar('inverter')}
                      onClick={() => handleSidebarItemClick('inverter')}
                      className={`palette-item transition-all hover:translate-x-1 cursor-pointer flex justify-between items-center ${expandedCategory === 'inverter' ? 'border-[#00f0ff]/45 bg-[#00f0ff]/5' : ''}`}
                    >
                      <div className="flex items-center gap-2">
                        <div className="item-icon inverter-color"><i className="fa-solid fa-arrows-spin"></i></div>
                        <div className="item-info text-xs">
                          <h5 className="font-bold text-white text-[11px]">عاكس انفرتر هجين</h5>
                          <span className="text-[9px] text-slate-400 block mt-0.5">تحويل DC لتيار متردد AC</span>
                        </div>
                      </div>
                      <i className={`fa-solid fa-chevron-left text-[9px] text-slate-400 transition-transform duration-200 ml-1 ${expandedCategory === 'inverter' ? '-rotate-90' : ''}`}></i>
                    </div>
                    {expandedCategory === 'inverter' && (
                      <div className="bg-black/45 border border-white/5 rounded-xl p-2.5 space-y-2 mt-1 mx-0.5 animate-fade-in text-right">
                        <span className="text-[9px] text-slate-400 block font-semibold mb-1 border-b border-white/5 pb-1">انفرترات هجينية معتمدة:</span>
                        <div className="flex flex-col gap-1.5 max-h-[160px] overflow-y-auto pr-1">
                          {productCatalog.inverter.map((item) => (
                            <div 
                              key={item.id}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleSidebarItemClick('inverter', undefined, item);
                              }}
                              className="bg-[#121420]/75 hover:bg-[#121420] border border-white/5 hover:border-cyan-500/50 rounded-lg p-2 flex justify-between items-center cursor-pointer transition text-[10px]"
                            >
                              <div className="flex flex-col text-right">
                                <span className="font-bold text-white text-[10.5px]">{item.brand}</span>
                                <span className="text-slate-400 text-[9.5px] truncate max-w-[130px]" title={item.model}>{item.model}</span>
                                <span className="text-[#8a99ad] text-[8.5px] mt-0.5">{item.power}W | {item.batVoltage}V</span>
                              </div>
                              <div className="flex flex-col items-end gap-1 shrink-0">
                                <span className="text-emerald-400 font-bold font-mono text-[10.5px]">${item.price}</span>
                                <span className="bg-cyan-500/10 text-cyan-455 text-[7.5px] px-1 py-0.5 rounded font-sans font-bold border border-cyan-500/15">ربط +</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Generator Section */}
                  <div className="flex flex-col gap-1 w-full">
                    <div 
                      draggable={true}
                      onDragStart={() => handleDragStartSidebar('generator')}
                      onClick={() => handleSidebarItemClick('generator')}
                      className={`palette-item transition-all hover:translate-x-1 cursor-pointer flex justify-between items-center ${expandedCategory === 'generator' ? 'border-purple-500/45 bg-purple-500/5' : ''}`}
                    >
                      <div className="flex items-center gap-2">
                        <div className="item-icon gen-color"><i className="fa-solid fa-gears"></i></div>
                        <div className="item-info text-xs">
                          <h5 className="font-bold text-white text-[11px]">مولد كهربائي ديزل</h5>
                          <span className="text-[9px] text-slate-400 block mt-0.5">قوة شحن احتياطية AC</span>
                        </div>
                      </div>
                      <i className={`fa-solid fa-chevron-left text-[9px] text-slate-400 transition-transform duration-200 ml-1 ${expandedCategory === 'generator' ? '-rotate-90' : ''}`}></i>
                    </div>
                    {expandedCategory === 'generator' && (
                      <div className="bg-black/45 border border-white/5 rounded-xl p-2.5 space-y-2 mt-1 mx-0.5 animate-fade-in text-right">
                        <span className="text-[9px] text-slate-400 block font-semibold mb-1 border-b border-white/5 pb-1">مولدات للطوارئ:</span>
                        <div className="flex flex-col gap-1.5 max-h-[160px] overflow-y-auto pr-1">
                          {productCatalog.generator.map((item) => (
                            <div 
                              key={item.id}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleSidebarItemClick('generator', undefined, item);
                              }}
                              className="bg-[#121420]/75 hover:bg-[#121420] border border-white/5 hover:border-purple-500/50 rounded-lg p-2 flex justify-between items-center cursor-pointer transition text-[10px]"
                            >
                              <div className="flex flex-col text-right">
                                <span className="font-bold text-white text-[10.5px]">{item.brand}</span>
                                <span className="text-slate-400 text-[9.5px] truncate max-w-[130px]" title={item.model}>{item.model}</span>
                                <span className="text-[#8a99ad] text-[8.5px] mt-0.5">{item.power}W | {item.fuelType}</span>
                              </div>
                              <div className="flex flex-col items-end gap-1 shrink-0">
                                <span className="text-emerald-400 font-bold font-mono text-[10.5px]">${item.price}</span>
                                <span className="bg-purple-500/10 text-purple-400 text-[7.5px] px-1 py-0.5 rounded font-sans font-bold border border-purple-500/15">إضافة +</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Household appliances group */}
              <div className="component-category space-y-2 flex flex-col">
                <h4 className="category-header text-[10px] text-slate-500 font-bold uppercase tracking-wider border-r-3 border-[#00f0ff] pr-1.5">الأحمال الكهربائية المنزلية (AC)</h4>
                <div className="grid grid-cols-2 gap-2">
                  {loadCatalog.map((load) => (
                    <div 
                      key={load.id}
                      draggable={true}
                      onDragStart={() => handleDragStartSidebar('load', load)}
                      onClick={() => handleSidebarItemClick('load', load)}
                      className="palette-item flex flex-col items-center justify-center text-center p-2.5 bg-white/2 hover:bg-white/5 border border-white/5 rounded-lg cursor-pointer transition-all gap-1.5 hover:scale-[1.03]"
                    >
                      <div className="item-icon load-color w-8 h-8 rounded text-sm flex justify-center items-center">
                        <i className={load.iconClass}></i>
                      </div>
                      <div className="item-info">
                        <h5 className="font-semibold text-white text-[10px] truncate max-w-[75px]">{load.name}</h5>
                        <span className="text-[8px] font-mono font-bold text-slate-450 block mt-0.5">{load.power}W</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </aside>
      </div>

      {/* Footer summary metrics bar */}
      <footer className={`app-footer glass flex flex-col sm:flex-row justify-between items-center sm:gap-4 p-3 shrink-0 h-auto sm:h-[55px] gap-3 no-print fixed bottom-7 left-3 right-3 z-40 transition-all duration-350 ${theme === 'light' ? 'bg-white/95 border-slate-300 text-slate-900 shadow-[0_-8px_30px_rgba(0,0,0,0.06)]' : 'bg-[#070a14]/95 border-white/10 text-white shadow-[0_-12px_45px_rgba(0,0,0,0.55)]'}`}>
        
        {/* Left item: 2D roof mapping summary */}
        <div 
          onClick={() => setIsRoofOpen(true)}
          className="footer-utility shrink-0 w-full sm:w-[250px] bg-white/2 border border-white/10 hover:border-white/25 rounded-lg px-3.5 py-1.5 flex justify-between items-center cursor-pointer transition select-none"
        >
          <div className="flex items-center gap-3">
            <i className="fa-solid fa-house-chimney text-[#ffd600] text-base"></i>
            <div className="utility-info text-xs">
              <span className="font-bold text-white text-[10.5px] block">تخطيط مساحة السطح المتاحة</span>
              <small className="text-[9px] text-slate-400 block mt-0.5">
                {calcs.panelsCount > 0 
                  ? `تم تخطيط كفاءة ${calcs.panelsCount} لوح` 
                  : 'اضغط لتوزيع الألواح'
                }
              </small>
            </div>
          </div>
          <i className="fa-solid fa-chevron-up text-xs text-slate-500"></i>
        </div>

        {/* Center item: horizonal engineering warning/success report banner */}
        <div className={alertsBannerClass}>
          <div className="alert-content flex items-center gap-2 text-xs font-semibold px-2">
            {diagnostics.errors.length > 0 ? (
              <>
                <i className="fa-solid fa-triangle-exclamation text-rose-500 animate-pulse text-sm"></i>
                <span className="text-rose-200 text-[10.5px]">{diagnostics.errors[0].title}: {diagnostics.errors[0].text.slice(0, 100)}...</span>
              </>
            ) : diagnostics.warnings.length > 0 ? (
              <>
                <i className="fa-solid fa-circle-exclamation text-orange-400 text-sm"></i>
                <span className="text-orange-200 text-[10.5px]">{diagnostics.warnings[0].title}: {diagnostics.warnings[0].text.slice(0, 100)}...</span>
              </>
            ) : (
              <>
                <i className="fa-solid fa-circle-check text-[#00e676] text-sm"></i>
                <span className="text-emerald-200 text-[10.5px]">الربط الكهربي مستقر؛ التوصيلات الكفوئية تتوافق مع الألواح والبطاريات بشكل تام.</span>
              </>
            )}
          </div>
        </div>

        {/* Right item: Shopping Cart BOM drawer */}
        <div 
          onClick={() => setIsCartOpen(true)}
          className="footer-utility shrink-0 w-full sm:w-[260px] bg-white/2 border border-white/10 hover:border-white/25 rounded-lg px-3.5 py-1.5 flex justify-between items-center cursor-pointer transition select-none"
        >
          <div className="flex items-center gap-3">
            <div className="relative">
              <i className="fa-solid fa-cart-shopping text-[#00f0ff] text-base"></i>
              <span className="badge absolute -top-2.5 -right-2 bg-[#00f0ff] text-[#050811] text-[9px] w-4.5 h-4.5 rounded-full flex justify-center items-center font-bold">
                {nodes.length}
              </span>
            </div>
            <div className="utility-info text-xs">
              <span className="font-bold text-white text-[10.5px] block">فاتورة التكاليف والوزن المالي</span>
              <small className="text-[9px] text-[#ffd600] font-sans font-bold block mt-0.5">إجمالي المنظومة: {calcs.grandTotal.toFixed(0)} $</small>
            </div>
          </div>
          <i className="fa-solid fa-chevron-up text-xs text-slate-500"></i>
        </div>
      </footer>

      <div dir="ltr" className="app-copyright no-print fixed bottom-1 left-3 z-30 w-fit max-w-[calc(100vw-1.5rem)] pointer-events-none rounded-full px-2 py-0.5 text-left text-[9px] font-semibold tracking-wide select-none">
        Designed by Eng. Atheer Harith &copy; 2026
      </div>

      {/* Subcomponents Dialog Modals Rendering */}
      <AdminPanel
        isOpen={isAdminOpen}
        onClose={() => setIsAdminOpen(false)}
        adminState={adminState}
        onAdminStateChange={setAdminState}
        nodes={nodes}
        calcs={calcs}
        cityKey={cityKey}
        seasonKey={seasonKey}
        isGenEnabled={isGenEnabled}
        theme={theme}
        onLoadProject={handleLoadSavedProject}
        onOpenReport={() => setIsReportOpen(true)}
      />

      <RoofPlannerModal 
        isOpen={isRoofOpen}
        onClose={() => setIsRoofOpen(false)}
        onApply={handleApplyRoofPanels}
      />

      <CartModal 
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        calcs={calcs}
        cityKey={cityKey}
        seasonKey={seasonKey}
        onRemoveItem={(itemId) => {
          if (itemId.startsWith('load-')) {
            const loadId = itemId.replace('load-', '');
            setNodes(prev => prev.filter(n => !(n.type === 'load' && n.model.id === loadId)));
          } else {
            setNodes(prev => prev.filter(n => n.type !== itemId));
          }
        }}
      />

      <ReportModal 
        isOpen={isReportOpen}
        onClose={() => setIsReportOpen(false)}
        calcs={calcs}
        cityKey={cityKey}
        seasonKey={seasonKey}
        businessName={appDisplayName}
      />

      <TemplatesModal 
        isOpen={isTemplatesOpen}
        onClose={() => setIsTemplatesOpen(false)}
        onSelect={handleTemplateSelect}
      />

    </div>
  );
}
