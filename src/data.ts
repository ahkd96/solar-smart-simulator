import { PVModel, MPPTModel, BatteryModel, InverterModel, GeneratorModel, LoadModel, CityData } from './types';

export const citiesData: Record<string, CityData> = {
  baghdad: { name: "بغداد", summer: 6.4, winter: 4.2, annual: 5.3 },
  diyala: { name: "ديالى", summer: 6.2, winter: 4.0, annual: 5.1 },
  basra: { name: "البصرة", summer: 6.6, winter: 4.5, annual: 5.5 },
  erbil: { name: "أربيل", summer: 5.9, winter: 3.6, annual: 4.7 },
  mosul: { name: "الموصل", summer: 5.8, winter: 3.5, annual: 4.6 },
  najaf: { name: "النجف", summer: 6.4, winter: 4.3, annual: 5.3 },
  karbala: { name: "كربلاء", summer: 6.4, winter: 4.3, annual: 5.3 }
};

export const productsData = {
  pv: [
    {
      id: "pv-jinko-550",
      brand: "Jinko Solar",
      model: "Tiger Neo N-type 550W",
      power: 550,
      voc: 50.1,
      isc: 14.01,
      vmp: 42.1,
      imp: 13.07,
      eff: 21.29,
      price: 110,
      warranty: 12,
      specsText: "لوح خلية N-type ذو كفاءة استثنائية في درجات الحرارة المرتفعة"
    },
    {
      id: "pv-longi-540",
      brand: "LONGi Solar",
      model: "Hi-MO 5m 540W",
      power: 540,
      voc: 49.5,
      isc: 13.85,
      vmp: 41.5,
      imp: 13.02,
      eff: 20.9,
      price: 105,
      warranty: 12,
      specsText: "لوح أحادي البلورة ذو موثوقية عالية وأداء ثابت طويل الأجل"
    },
    {
      id: "pv-ja-545",
      brand: "JA Solar",
      model: "DeepBlue 3.0 545W",
      power: 545,
      voc: 49.75,
      isc: 13.93,
      vmp: 41.8,
      imp: 13.04,
      eff: 21.1,
      price: 108,
      warranty: 12,
      specsText: "تكنولوجيا خلايا نصف مقطوعة لزيادة الإنتاجية وتقليل الفواقد"
    },
    {
      id: "pv-canadian-650",
      brand: "Canadian Solar",
      model: "BiHiKu7 Bifacial 650W",
      power: 650,
      voc: 44.9,
      isc: 18.35,
      vmp: 37.5,
      imp: 17.34,
      eff: 20.9,
      price: 145,
      warranty: 12,
      specsText: "لوح ذو وجهين (Bifacial) يوفر إنتاجية إضافية من الإشعاع المنعكس للأرض"
    }
  ] as PVModel[],
  
  mppt: [
    {
      id: "mppt-srne-60",
      brand: "SRNE",
      model: "MC4860N15 60A",
      maxCurrent: 60,
      maxPvVoc: 150,
      batteryVoltage: "12V/24V/36V/48V Auto",
      price: 135,
      warranty: 3,
      specsText: "منظم شحن MPPT ذكي بنسبة كفاءة تتبع 99.9%"
    },
    {
      id: "mppt-victron-100",
      brand: "Victron Energy",
      model: "SmartSolar 250V/100A",
      maxCurrent: 100,
      maxPvVoc: 250,
      batteryVoltage: "12V/24V/36V/48V Auto",
      price: 680,
      warranty: 5,
      specsText: "منظم احترافي يدعم التحكم والقرائات عبر البلوتوث وتطبيق الهاتف"
    }
  ] as MPPTModel[],

  battery: [
    {
      id: "bat-felicity-5",
      brand: "Felicity Solar",
      model: "LiFePO4 LPBA48100 (5.12kWh)",
      chemistry: "Lithium (LFP)",
      capacity: 100,
      voltage: 51.2,
      energy: 5120,
      dod: 80,
      price: 850,
      warranty: 5,
      specsText: "بطارية ليثيوم حديد فوسفات متطورة تدعم الربط المتوازي وعمر 6000 دورة"
    },
    {
      id: "bat-dyness-4.8",
      brand: "Dyness",
      model: "Powerbox F-10 (4.8kWh)",
      chemistry: "Lithium (LFP)",
      capacity: 96,
      voltage: 48,
      energy: 4800,
      dod: 85,
      price: 900,
      warranty: 5,
      specsText: "تصميم حائطي أنيق وصغير الحجم متوافق مع غالبية انفرترات السوق"
    },
    {
      id: "bat-pylon-3.5",
      brand: "Pylontech",
      model: "US3000C (3.5kWh)",
      chemistry: "Lithium (LFP)",
      capacity: 74,
      voltage: 48,
      energy: 3552,
      dod: 90,
      price: 690,
      warranty: 7,
      specsText: "البطارية الأكثر مبيعاً بموثوقيتها وتوافقيتها الفائقة مع أنظمة الكنترول"
    },
    {
      id: "bat-narada-200",
      brand: "Narada Gel",
      model: "12V 200Ah Gel Deep Cycle",
      chemistry: "Lead-Acid Gel",
      capacity: 200,
      voltage: 12,
      energy: 2400,
      dod: 50,
      price: 195,
      warranty: 1,
      specsText: "بطارية جل تفريغ عميق اقتصادية للاستخدامات المتوسطة"
    }
  ] as BatteryModel[],

  inverter: [
    {
      id: "inv-deye-8",
      brand: "Deye",
      model: "SUN-8K-SG01LP1-EU (8kW)",
      power: 8000,
      type: "Hybrid (هجين)",
      batVoltage: 48,
      maxPvVoc: 500,
      minPvVoc: 150,
      efficiency: 97.6,
      price: 1150,
      warranty: 5,
      specsText: "عاكس هجين أحادي الطور ذكي يدعم دمج الألواح والبطاريات والشبكة والمولد"
    },
    {
      id: "inv-deye-12",
      brand: "Deye",
      model: "SUN-12K-SG04LP3-EU (12kW)",
      power: 12000,
      type: "Hybrid (هجين 3-Phase)",
      batVoltage: 48,
      maxPvVoc: 800,
      minPvVoc: 160,
      efficiency: 97.6,
      price: 1950,
      warranty: 5,
      specsText: "انفرتر هجين عالي القدرة ثلاثي الطوار مناسب للأحمال الثقيلة والمصانع والفلل"
    },
    {
      id: "inv-growatt-5",
      brand: "Growatt",
      model: "SPF 5000 ES (5kW)",
      power: 5000,
      type: "Off-Grid (منفصل)",
      batVoltage: 48,
      maxPvVoc: 450,
      minPvVoc: 120,
      efficiency: 93,
      price: 490,
      warranty: 2,
      specsText: "انفرتر منفصل عن الشبكة ذو شعبية جارفة واعتمادية ممتازة وتكلفة اقتصادية"
    },
    {
      id: "inv-must-3",
      brand: "MUST PV1800",
      model: "PV18-3048 VHM (3kW)",
      power: 3000,
      type: "Off-Grid (منفصل)",
      batVoltage: 48,
      maxPvVoc: 145,
      minPvVoc: 60,
      efficiency: 93,
      price: 280,
      warranty: 1,
      specsText: "منظومة مصغرة اقتصادية جداً للمنازل الصغيرة والإنارة والأحمال الأساسية"
    },
    {
      id: "inv-sma-5",
      brand: "SMA",
      model: "Sunny Boy 5.0 (5kW)",
      power: 5000,
      type: "On-Grid (متصل)",
      batVoltage: 0,
      maxPvVoc: 600,
      minPvVoc: 100,
      efficiency: 97,
      price: 980,
      warranty: 10,
      specsText: "عاكس ألماني متصل بالشبكة (On-Grid) ذو كفاءة بالغة وعمر تشغيلي أطول"
    }
  ] as InverterModel[],

  generator: [
    {
      id: "gen-generic-5",
      brand: "مولد محلي",
      model: "مولد منزل كلاسيك 5kVA",
      power: 4000,
      fuelType: "ديزل / بنزين",
      price: 350,
      warranty: 1,
      specsText: "مولد كهربائي تقليدي لتأمين الطاقة للأحمال المباشرة وشحن البطاريات عند غياب الشمس"
    },
    {
      id: "gen-generic-10",
      brand: "مولد كاتم",
      model: "مولد كاتم ديزل 12kVA",
      power: 8800,
      fuelType: "ديزل",
      price: 1100,
      warranty: 1,
      specsText: "مولد ديزل كاتم للصوت ذو قدرة جيدة يدعم التشغيل التلقائي (ATS) عبر الانفرتر الهجين"
    }
  ] as GeneratorModel[]
};

export const loadsData: LoadModel[] = [
  {
    id: "load-fridge",
    name: "ثلاجة موفرة للطاقة",
    power: 250,
    defaultQty: 1,
    dayHours: 8,
    nightHours: 10,
    iconClass: "fa-solid fa-snowflake",
    colorClass: "blue-text",
    price: 320,
    desc: "تعمل بشكل متواصل، ويفضل اختيار موديل انفرتر لتوفير استهلاك بدء التشغيل."
  },
  {
    id: "load-ac-1ton",
    name: "سبلت 1 طن (Inverter)",
    power: 1200,
    defaultQty: 1,
    dayHours: 6,
    nightHours: 4,
    iconClass: "fa-solid fa-wind",
    colorClass: "blue-text",
    price: 450,
    desc: "حمل ثقيل يفضل تشغيله نهاراً للاستفادة المباشرة من إنتاج الخلايا الشمسي."
  },
  {
    id: "load-ac-2ton",
    name: "سبلت 2 طن (Inverter)",
    power: 2400,
    defaultQty: 0,
    dayHours: 5,
    nightHours: 2,
    iconClass: "fa-solid fa-icicles",
    colorClass: "error-text",
    price: 650,
    desc: "حمل ثقيل جداً، يتطلب انفرتر بقدرة لا تقل عن 8 كيلوواط وبنك بطاريات ضخم للتشغيل الليلي."
  },
  {
    id: "load-lights",
    name: "إنارة ليد للمنزل (LED)",
    power: 150,
    defaultQty: 1,
    dayHours: 1,
    nightHours: 6,
    iconClass: "fa-regular fa-lightbulb",
    colorClass: "yellow-text",
    price: 45,
    desc: "أحمال خفيفة أساسية، يفضل دائماً استبدال المصابيح القديمة بمصابيح LED موفرة."
  },
  {
    id: "load-fan",
    name: "مروحة سقفية / عامودية",
    power: 75,
    defaultQty: 3,
    dayHours: 6,
    nightHours: 8,
    iconClass: "fa-solid fa-fan",
    colorClass: "green-text",
    price: 25,
    desc: "استهلاك خفيف ومناسب جداً للتشغيل المستمر عبر منظومة شمسية بسيطة."
  },
  {
    id: "load-tv",
    name: "شاشة تلفزيون ذكية",
    power: 120,
    defaultQty: 1,
    dayHours: 4,
    nightHours: 5,
    iconClass: "fa-solid fa-tv",
    colorClass: "yellow-text",
    price: 180,
    desc: "استهلاك متوسط آمن للعمل نهاراً وليلاً دون الضغط على النظام."
  },
  {
    id: "load-pump",
    name: "مضخة ماء (1 حصان)",
    power: 750,
    defaultQty: 0,
    dayHours: 1.5,
    nightHours: 0,
    iconClass: "fa-solid fa-faucet-drip",
    colorClass: "blue-text",
    price: 80,
    desc: "حمل حركي ينصح بتشغيله نهاراً فقط عند ذروة الإنتاج الشمسي لتفادي استهلاك البطاريات."
  },
  {
    id: "load-cctv",
    name: "منظومة كاميرات مراقبة",
    power: 60,
    defaultQty: 1,
    dayHours: 12,
    nightHours: 12,
    iconClass: "fa-solid fa-video",
    colorClass: "green-text",
    price: 150,
    desc: "تعمل على مدار 24 ساعة لضمان أمان المنزل، وتمثل حملاً مستمراً صغيرا."
  },
  {
    id: "load-router",
    name: "راوتر إنترنت ونانو",
    power: 15,
    defaultQty: 1,
    dayHours: 12,
    nightHours: 12,
    iconClass: "fa-solid fa-wifi",
    colorClass: "green-text",
    price: 30,
    desc: "حمل ضئيل جداً يعمل 24 ساعة، أساسي للبقاء على اتصال بالشبكة."
  },
  {
    id: "load-computer",
    name: "حاسوب مكتبي للألعاب/العمل",
    power: 200,
    defaultQty: 0,
    dayHours: 3,
    nightHours: 3,
    iconClass: "fa-solid fa-desktop",
    colorClass: "yellow-text",
    price: 500,
    desc: "حمل متوسط متباين بحسب شدة تشغيل المعالج وكرت الشاشة."
  },
  {
    id: "load-geyser",
    name: "سخان ماء كهربائي (كيزر)",
    power: 2000,
    defaultQty: 0,
    dayHours: 2,
    nightHours: 0,
    iconClass: "fa-solid fa-fire-burner",
    colorClass: "error-text",
    price: 120,
    desc: "حمل حراري ثقيل جداً، يفضل برمجته للعمل نهاراً فقط عند توفر فائض طاقة خلايا شمسية."
  },
  {
    id: "load-washer-standard",
    name: "غسالة ملابس كلاسيكية",
    power: 450,
    defaultQty: 0,
    dayHours: 2,
    nightHours: 0,
    iconClass: "fa-solid fa-soap",
    colorClass: "blue-text",
    price: 260,
    desc: "استهلاك متوسط ينصح بتشغيلها في فترات الصباح أو الظهر."
  },
  {
    id: "load-washer-heated",
    name: "غسالة ملابس مع سخان",
    power: 2200,
    defaultQty: 0,
    dayHours: 1.5,
    nightHours: 0,
    iconClass: "fa-solid fa-tshirt",
    colorClass: "error-text",
    price: 490,
    desc: "حمل عالي وصدمي بسبب تشغيل سخان المياه الداخلي للغسالة."
  },
  {
    id: "load-dishwasher",
    name: "غسالة صحون ملائمة",
    power: 1600,
    defaultQty: 0,
    dayHours: 1.5,
    nightHours: 0,
    iconClass: "fa-solid fa-sink",
    colorClass: "yellow-text",
    price: 380,
    desc: "تسحب تيار تشغيل ثقيل للتسخين المائي، يفضل تشغيلها في ذروة الظهيرة."
  },
  {
    id: "load-microwave",
    name: "فرن ميكروويف حديث",
    power: 1200,
    defaultQty: 0,
    dayHours: 0.5,
    nightHours: 0.5,
    iconClass: "fa-solid fa-mortar-pestle",
    colorClass: "yellow-text",
    price: 110,
    desc: "يسحب طاقة نبضية لحظية عالية لكن لفترات قصيرة بضع دقائق فقط."
  },
  {
    id: "load-oven",
    name: "فرن طبخ كهربائي متكامل",
    power: 2500,
    defaultQty: 0,
    dayHours: 1,
    nightHours: 0,
    iconClass: "fa-solid fa-box",
    colorClass: "error-text",
    price: 350,
    desc: "حمل ثقيل ومستمر لا يقبل التشغيل على بطاريات إلا إذا كان بنك الطاقة كبيراً للغاية."
  },
  {
    id: "load-kettle",
    name: "غلاية ماء كهربائية (Kettle)",
    power: 1800,
    defaultQty: 0,
    dayHours: 0.5,
    nightHours: 0.2,
    iconClass: "fa-solid fa-mug-hot",
    colorClass: "error-text",
    price: 35,
    desc: "حمل حراري لحظي شديد لتسخين سريع، يعمل لدقائق قليلة."
  },
  {
    id: "load-iron",
    name: "مكواة ملابس بخارية",
    power: 1600,
    defaultQty: 0,
    dayHours: 1,
    nightHours: 0,
    iconClass: "fa-solid fa-shirt",
    colorClass: "error-text",
    price: 40,
    desc: "تسحب تياراً عالياً بنظام نبضي للتحكم في درجة الحرارة."
  },
  {
    id: "load-vacuum",
    name: "مكنسة كهربائية عمودية",
    power: 1400,
    defaultQty: 0,
    dayHours: 1,
    nightHours: 0,
    iconClass: "fa-solid fa-vacuum-cleaner",
    colorClass: "blue-text",
    price: 90,
    desc: "تعتمد على محرك شفاط قوي يسحب طاقة مرتفعة لحظياً أثناء الاستخدام."
  },
  {
    id: "load-aircooler",
    name: "مبرد هواء مائي (كارتون)",
    power: 350,
    defaultQty: 0,
    dayHours: 6,
    nightHours: 6,
    iconClass: "fa-solid fa-box-tissue",
    colorClass: "green-text",
    price: 120,
    desc: "استهلاك ممتاز وبديل اقتصادي ومريح جداً للأيام الحارة الجافة مقارنة بالسبلت."
  },
  {
    id: "load-hairdryer",
    name: "مجفف شعر (سشوار)",
    power: 1500,
    defaultQty: 0,
    dayHours: 0.3,
    nightHours: 0.2,
    iconClass: "fa-solid fa-scissors",
    colorClass: "yellow-text",
    price: 45,
    desc: "حمل حراري وحركي ذو سحب عالي ومفاجئ لفترة قصيرة جداً."
  }
];
