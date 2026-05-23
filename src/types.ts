export interface PVModel {
  id: string;
  brand: string;
  model: string;
  power: number;
  voc: number;
  isc: number;
  vmp: number;
  imp: number;
  eff: number;
  price: number;
  warranty: number;
  specsText: string;
}

export interface MPPTModel {
  id: string;
  brand: string;
  model: string;
  maxCurrent: number;
  maxPvVoc: number;
  batteryVoltage: string;
  price: number;
  warranty: number;
  specsText: string;
}

export interface BatteryModel {
  id: string;
  brand: string;
  model: string;
  chemistry: string;
  capacity: number;
  voltage: number;
  energy: number;
  dod: number;
  price: number;
  warranty: number;
  specsText: string;
}

export interface InverterModel {
  id: string;
  brand: string;
  model: string;
  power: number;
  type: string;
  batVoltage: number;
  maxPvVoc: number;
  minPvVoc: number;
  efficiency: number;
  price: number;
  warranty: number;
  specsText: string;
}

export interface GeneratorModel {
  id: string;
  brand: string;
  model: string;
  power: number;
  fuelType: string;
  price: number;
  warranty: number;
  specsText: string;
}

export interface LoadModel {
  id: string;
  name: string;
  power: number;
  defaultQty: number;
  dayHours: number;
  nightHours: number;
  iconClass: string;
  colorClass: string;
  price: number;
  desc: string;
}

export type AnyModel = PVModel | MPPTModel | BatteryModel | InverterModel | GeneratorModel | LoadModel;

export interface CanvasNode {
  id: string;
  type: 'pv' | 'mppt' | 'battery' | 'inverter' | 'generator' | 'load';
  x: number;
  y: number;
  specs: {
    quantity: number;
  };
  model: AnyModel;
}

export interface CityData {
  name: string;
  summer: number;
  winter: number;
  annual: number;
}
