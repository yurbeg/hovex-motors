import type { ChangeEvent } from "react";
import type {
  Vehicle,
  VehicleInventoryStatus,
  VehicleStatus,
} from "../../../domain/vehicle";

export interface VehicleEditorForm {
  id?: string;
  make: string;
  model: string;
  year: number | string;
  body: string;
  mileage: string;
  fuel: string;
  damage: string;
  auction: string;
  estimateMin: number | string;
  estimateMax: number | string;
  maxBid: number | string;
  image: string;
  imagePosition: string;
  badge: string;
  accent: string;
  status: VehicleStatus;
  inventoryStatus: VehicleInventoryStatus;
  featured: boolean;
  sortOrder?: number;
  createdAt?: string;
  updatedAt?: string;
}

export type VehicleSavePayload = Omit<
  VehicleEditorForm,
  "year" | "estimateMin" | "estimateMax" | "maxBid"
> & {
  year: number;
  estimateMin: number;
  estimateMax: number;
  maxBid: number;
};

export type VehicleEditorErrors = Partial<Record<keyof VehicleEditorForm, string>>;
export type VehicleFieldUpdater = (
  key: keyof VehicleEditorForm,
) => (event: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void;

const vehicleEditorValidationOrder = [
  "make",
  "model",
  "year",
  "estimateMin",
  "estimateMax",
  "maxBid",
  "image",
] as const satisfies readonly (keyof VehicleEditorForm)[];

export function firstVehicleEditorErrorField(
  errors: VehicleEditorErrors,
): keyof VehicleEditorForm | null {
  return vehicleEditorValidationOrder.find((field) => Boolean(errors[field])) ?? null;
}

export const emptyVehicle: VehicleEditorForm = {
  make: "",
  model: "",
  year: new Date().getFullYear(),
  body: "Սեդան",
  mileage: "",
  fuel: "Բենզին",
  damage: "",
  auction: "ԱՄՆ աճուրդ • ցուցադրական",
  estimateMin: "",
  estimateMax: "",
  maxBid: "",
  image: "/assets/hovex/kia-forte-lxs.jpg",
  imagePosition: "50% 50%",
  badge: "Նոր առաջարկ",
  accent: "yellow",
  status: "draft",
  inventoryStatus: "at_auction",
  featured: false,
};

export function createVehicleEditorForm(vehicle: Vehicle | null): VehicleEditorForm {
  return { ...emptyVehicle, ...(vehicle ?? {}) };
}

export function validateVehicleEditorForm(
  form: VehicleEditorForm,
  hasSelectedImage: boolean,
): VehicleEditorErrors {
  const errors: VehicleEditorErrors = {};
  if (!form.make.trim()) errors.make = "Նշեք մակնիշը";
  if (!form.model.trim()) errors.model = "Նշեք մոդելը";
  if (Number(form.year) < 1990 || Number(form.year) > new Date().getFullYear() + 2) {
    errors.year = "Ստուգեք տարեթիվը";
  }
  if (!(Number(form.estimateMin) > 0)) {
    errors.estimateMin = "Նշեք նվազագույն արժեքը";
  }
  if (!(Number(form.estimateMax) >= Number(form.estimateMin))) {
    errors.estimateMax = "Առավելագույնը պետք է մեծ կամ հավասար լինի";
  }
  if (!(Number(form.maxBid) > 0)) {
    errors.maxBid = "Նշեք առավելագույն խաղադրույքը";
  }
  if (!hasSelectedImage && !/^(https?:\/\/|\/)/i.test(form.image.trim())) {
    errors.image = "Ընտրեք նկար կամ օգտագործեք /assets/... կամ https:// հասցե";
  }
  return errors;
}

export function toVehicleSavePayload(
  form: VehicleEditorForm,
  image: string,
): VehicleSavePayload {
  return {
    ...form,
    image,
    year: Number(form.year),
    estimateMin: Number(form.estimateMin),
    estimateMax: Number(form.estimateMax),
    maxBid: Number(form.maxBid),
  };
}

export function createVehicleId(
  vehicle: Pick<VehicleSavePayload, "make" | "model" | "year">,
  vehicles: Vehicle[],
): string {
  const base = `${vehicle.make}-${vehicle.model}-${vehicle.year}`
    .toLocaleLowerCase("en")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "") || `vehicle-${Date.now()}`;
  let id = base;
  let suffix = 2;
  while (vehicles.some((item) => item.id === id)) id = `${base}-${suffix++}`;
  return id;
}
