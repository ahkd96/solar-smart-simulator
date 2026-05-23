import { citiesData } from './data';
import { CanvasNode, PVModel, BatteryModel, InverterModel, MPPTModel, GeneratorModel, LoadModel } from './types';

const COPPER_RESISTIVITY = 0.0178; // ohm * mm² / meter

export interface CostSettings {
  accessoriesRate?: number;
  installationRate?: number;
}

export function calculateSystem(
  canvasState: CanvasNode[], 
  cityKey: string = "baghdad", 
  seasonKey: string = "summer", 
  isGenEnabled: boolean = false,
  costSettings: CostSettings = {}
) {
  const cityInfo = citiesData[cityKey] || citiesData.baghdad;
  const peakSunHours = seasonKey === 'summer' ? cityInfo.summer : seasonKey === 'winter' ? cityInfo.winter : cityInfo.annual;

  let panelsCount = 0;
  let selectedPanel: PVModel | null = null;

  let batteriesCount = 0;
  let selectedBattery: BatteryModel | null = null;

  let selectedInverter: InverterModel | null = null;
  let selectedMppt: MPPTModel | null = null;

  let generatorsCount = 0;
  let selectedGen: GeneratorModel | null = null;

  const activeLoads: Array<LoadModel & { qty: number }> = [];

  canvasState.forEach(node => {
    if (node.type === "pv") {
      panelsCount += Number(node.specs.quantity || 1);
      selectedPanel = node.model as PVModel;
    } else if (node.type === "battery") {
      batteriesCount += Number(node.specs.quantity || 1);
      selectedBattery = node.model as BatteryModel;
    } else if (node.type === "inverter") {
      selectedInverter = node.model as InverterModel;
    } else if (node.type === "mppt") {
      selectedMppt = node.model as MPPTModel;
    } else if (node.type === "generator") {
      generatorsCount += 1;
      selectedGen = node.model as GeneratorModel;
    } else if (node.type === "load") {
      activeLoads.push({
        ...(node.model as LoadModel),
        qty: Number(node.specs.quantity || 1)
      });
    }
  });

  // --- Electrical Calculations ---

  let totalPvPower = 0; // W
  let dailyPvYield = 0; // Wh
  let stringVoc = 0;
  let stringIsc = 0;
  let seriesPanels = 1;
  let parallelStrings = 1;

  if (selectedPanel && panelsCount > 0) {
    totalPvPower = panelsCount * selectedPanel.power;
    const maxVocLimit = selectedInverter ? selectedInverter.maxPvVoc : 150;
    const safetyVoc = selectedPanel.voc * 1.15;
    seriesPanels = Math.max(1, Math.floor(maxVocLimit / safetyVoc));
    
    if (seriesPanels > panelsCount) {
      seriesPanels = panelsCount;
    }
    
    parallelStrings = Math.max(1, Math.ceil(panelsCount / seriesPanels));
    stringVoc = seriesPanels * selectedPanel.voc;
    stringIsc = parallelStrings * selectedPanel.isc;
    dailyPvYield = totalPvPower * peakSunHours * 0.75;
  }

  // Load demands
  let dayLoadDemand = 0; // Wh
  let nightLoadDemand = 0; // Wh
  let totalLoadDemand = 0; // Wh
  let instantPeakLoad = 0; // W
  let surgePeakLoad = 0; // W (Inrush motor starting currents)

  activeLoads.forEach(load => {
    const itemPower = load.power * load.qty;
    dayLoadDemand += itemPower * load.dayHours;
    nightLoadDemand += itemPower * load.nightHours;
    instantPeakLoad += itemPower;
    
    let surgeMultiplier = 1.0;
    if (load.id.includes("ac")) surgeMultiplier = 2.2;
    if (load.id.includes("pump")) surgeMultiplier = 3.0;
    if (load.id.includes("fridge")) surgeMultiplier = 1.6;
    
    surgePeakLoad += itemPower * surgeMultiplier;
  });

  totalLoadDemand = dayLoadDemand + nightLoadDemand;

  // Battery Storage Sizing
  let totalBatteryStorage = 0; // Wh
  let actualUsableStorage = 0; // Wh
  let batteryNominalVoltage = 48;
  let batteryAmpsTotal = 0;

  if (selectedBattery && batteriesCount > 0) {
    totalBatteryStorage = selectedBattery.energy * batteriesCount;
    const dodFactor = selectedBattery.dod / 100;
    actualUsableStorage = totalBatteryStorage * dodFactor;
    batteryNominalVoltage = selectedBattery.voltage;
    
    if (selectedBattery.voltage === 12) {
      if (batteriesCount >= 4) {
        batteryNominalVoltage = 48;
        batteryAmpsTotal = (batteriesCount / 4) * selectedBattery.capacity;
      } else {
        batteryNominalVoltage = batteriesCount * 12;
        batteryAmpsTotal = selectedBattery.capacity;
      }
    } else {
      batteryAmpsTotal = batteriesCount * selectedBattery.capacity;
    }
  }

  // Charge times & Night durations
  let batteryChargeTime = 0; // hours
  let nightOperatingHours = 0; // hours
  let batteryRuntimeHours = 0; // hours
  
  if (nightLoadDemand > 0 && actualUsableStorage > 0) {
    const hourlyNightDraw = nightLoadDemand / 12;
    nightOperatingHours = Math.min(12, actualUsableStorage / hourlyNightDraw);
  }

  if (instantPeakLoad > 0 && actualUsableStorage > 0) {
    batteryRuntimeHours = actualUsableStorage / instantPeakLoad;
  }

  let dayPvyieldAvailable = dailyPvYield - dayLoadDemand;
  if (dayPvyieldAvailable < 0) dayPvyieldAvailable = 0;

  if (dayPvyieldAvailable > 0 && actualUsableStorage > 0) {
    const avgChargePower = dayPvyieldAvailable / peakSunHours;
    batteryChargeTime = actualUsableStorage / avgChargePower;
  }

  let inverterRatio = 0;
  if (selectedInverter && selectedInverter.power > 0) {
    inverterRatio = (instantPeakLoad / selectedInverter.power) * 100;
  }

  // Cables sizing distance estimations
  const pvDistance = 20; 
  const batDistance = 2.5;

  let pvCableSize = 4; // mm²
  let batCableSize = 16; // mm²
  let pvVoltageDropPercent = 1.0;
  let batVoltageDropPercent = 0.5;

  if (selectedPanel && panelsCount > 0) {
    const stringVmp = seriesPanels * selectedPanel.vmp;
    const stringImp = parallelStrings * selectedPanel.imp;

    if (stringVmp > 0 && stringImp > 0) {
      const minPvS = (2 * pvDistance * stringImp * COPPER_RESISTIVITY) / (0.03 * stringVmp);
      const stdSections = [2.5, 4, 6, 10, 16, 25, 35, 50];
      pvCableSize = stdSections.find(s => s >= minPvS) || 50;
      pvVoltageDropPercent = ((2 * pvDistance * stringImp * COPPER_RESISTIVITY) / (pvCableSize * stringVmp)) * 100;
    }
  }

  if (selectedBattery && selectedInverter && batteriesCount > 0) {
    const maxBatCurrent = selectedInverter.power / batteryNominalVoltage;
    if (maxBatCurrent > 0) {
      const minBatS = (2 * batDistance * maxBatCurrent * COPPER_RESISTIVITY) / (0.03 * batteryNominalVoltage);
      const stdBatSections = [16, 25, 35, 50, 70, 95];
      batCableSize = stdBatSections.find(s => s >= minBatS) || 95;
      batVoltageDropPercent = ((2 * batDistance * maxBatCurrent * COPPER_RESISTIVITY) / (batCableSize * batteryNominalVoltage)) * 100;
    }
  }

  // Protective Breakers sizing
  let pvDcBreaker = 16; // Amps DC
  let batDcFuse = 63; // Amps DC
  let invAcBreaker = 16; // Amps AC

  if (selectedPanel && parallelStrings > 0) {
    const calculatedPvBreaker = parallelStrings * selectedPanel.isc * 1.56;
    const stdDcBreakers = [16, 20, 25, 32, 40, 50, 63];
    pvDcBreaker = stdDcBreakers.find(b => b >= calculatedPvBreaker) || 63;
  }

  if (selectedInverter && batteryNominalVoltage > 0) {
    const calculatedBatBreaker = (selectedInverter.power / batteryNominalVoltage) * 1.25;
    const stdBatBreakers = [63, 80, 100, 125, 160, 200, 250];
    batDcFuse = stdBatBreakers.find(b => b >= calculatedBatBreaker) || 250;

    const calculatedAcBreaker = (selectedInverter.power / 220) * 1.25;
    const stdAcBreakers = [10, 16, 20, 25, 32, 40, 50, 63];
    invAcBreaker = stdAcBreakers.find(b => b >= calculatedAcBreaker) || 63;
  }

  // Backup Generator Mode
  let generatorOutput = 0; // W
  let generatorRuntimeHours = 0; // Hours
  let generatorFuelConsumption = 0; // Liters
  let integrationStatusMessage = "الشمس كافية لتغطية الأحمال الحالية.";

  if (isGenEnabled && selectedGen) {
    generatorOutput = selectedGen.power;
    const dayDeficit = totalLoadDemand - (dailyPvYield / 1000);
    const totalDeficit = dayDeficit > 0 ? dayDeficit : 0;

    if (totalDeficit > 0 && selectedGen.power > 0) {
      generatorRuntimeHours = Math.min(24, (totalDeficit * 1000) / selectedGen.power);
      generatorFuelConsumption = (generatorRuntimeHours * selectedGen.power / 1000) * 0.35;
      integrationStatusMessage = `تم تفعيل شحن البطاريات بالمولد الاحتياطي لموازنة عجز الإنتاج الشمسي (${totalDeficit.toFixed(1)} ك.و.س).`;
    } else {
      integrationStatusMessage = "مولد الديزل متصل في وضع الاستعداد التلقائي (ATS) ومثالي للطوارئ.";
    }
  }

  // Finances & Costs
  let hardwareCost = 0;
  if (selectedPanel && panelsCount > 0) hardwareCost += selectedPanel.price * panelsCount;
  if (selectedBattery && batteriesCount > 0) hardwareCost += selectedBattery.price * batteriesCount;
  if (selectedInverter) hardwareCost += selectedInverter.price;
  if (selectedMppt) hardwareCost += selectedMppt.price;
  if (selectedGen && isGenEnabled) hardwareCost += selectedGen.price;
  
  activeLoads.forEach(load => {
    hardwareCost += load.price * load.qty;
  });

  const accessoriesRate = Math.max(0, Number(costSettings.accessoriesRate ?? 15)) / 100;
  const installationRate = Math.max(0, Number(costSettings.installationRate ?? 8)) / 100;
  const accessoriesCost = hardwareCost * accessoriesRate;
  const installationCost = hardwareCost * installationRate;
  const grandTotal = hardwareCost + accessoriesCost + installationCost;

  // Environmental offset
  const co2Offset = (dailyPvYield / 1000) * 365 * 0.7;

  return {
    panelsCount,
    selectedPanel,
    seriesPanels,
    parallelStrings,
    stringVoc,
    stringIsc,
    batteriesCount,
    selectedBattery,
    batteryNominalVoltage,
    batteryAmpsTotal,
    selectedInverter,
    selectedMppt,
    selectedGen,
    activeLoads,

    totalPvPower,
    dailyPvYield: dailyPvYield / 1000,
    dayLoadDemand: dayLoadDemand / 1000,
    nightLoadDemand: nightLoadDemand / 1000,
    totalLoadDemand: totalLoadDemand / 1000,
    instantPeakLoad,
    surgePeakLoad,
    totalBatteryStorage: totalBatteryStorage / 1000,
    actualUsableStorage: actualUsableStorage / 1000,
    batteryChargeTime,
    nightOperatingHours,
    batteryRuntimeHours,
    inverterRatio,

    pvCableSize,
    batCableSize,
    pvVoltageDropPercent,
    batVoltageDropPercent,

    pvDcBreaker,
    batDcFuse,
    invAcBreaker,

    generatorOutput,
    generatorRuntimeHours,
    generatorFuelConsumption,
    integrationStatusMessage,

    hardwareCost,
    accessoriesCost,
    installationCost,
    grandTotal,
    co2Offset,

    peakSunHours
  };
}
