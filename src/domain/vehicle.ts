export type VehicleStatus = "published" | "draft" | "archived";
export type VehicleInventoryStatus = "available" | "in_transit" | "at_auction";

export interface Vehicle {
  id: string;
  make: string;
  model: string;
  year: number;
  body: string;
  mileage: string;
  fuel: string;
  damage: string;
  auction: string;
  estimateMin: number;
  estimateMax: number;
  maxBid: number;
  image: string;
  imagePosition: string;
  badge: string;
  accent: string;
  status: VehicleStatus;
  inventoryStatus: VehicleInventoryStatus;
  featured: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
  [key: string]: unknown;
}

export type VehicleInput = Partial<Vehicle> & {
  published?: boolean;
  [key: string]: unknown;
};

export interface VehicleForm {
  make: string;
  model: string;
  year: number;
  body: string;
  mileage: string;
  fuel: string;
  damage: string;
  auction: string;
  estimateMin: string;
  estimateMax: string;
  maxBid: string;
  image: string;
  imagePosition: string;
  badge: string;
  accent: string;
  status: VehicleStatus;
  inventoryStatus: VehicleInventoryStatus;
  featured: boolean;
}

export const DEFAULT_VEHICLE_FORM: VehicleForm = {
  make: "",
  model: "",
  year: new Date().getFullYear(),
  body: "",
  mileage: "",
  fuel: "Բենզին",
  damage: "",
  auction: "",
  estimateMin: "",
  estimateMax: "",
  maxBid: "",
  image: "",
  imagePosition: "50% 50%",
  badge: "",
  accent: "yellow",
  status: "draft",
  inventoryStatus: "at_auction",
  featured: false,
};
