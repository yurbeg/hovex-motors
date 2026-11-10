import type { ChangeEvent } from "react";
import { isSafeVehicleImageUrl, MAX_VEHICLE_IMAGES } from "../../../domain/vehicle";
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
  images: string[];
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

export const ADMIN_VEHICLE_MAX_IMAGES = MAX_VEHICLE_IMAGES;

function uniqueImageUrls(values: readonly unknown[]): string[] {
  const seen = new Set<string>();
  const urls: string[] = [];
  for (const value of values) {
    if (typeof value !== "string") continue;
    const url = value.trim();
    if (!url || seen.has(url)) continue;
    seen.add(url);
    urls.push(url);
  }
  return urls;
}

/**
 * Reconciles the legacy cover field with the ordered gallery. A differing
 * legacy cover replaces the old cover while preserving secondary images.
 */
export function vehicleEditorImages(
  form: Pick<VehicleEditorForm, "image" | "images">,
): string[] {
  const gallery = uniqueImageUrls(Array.isArray(form.images) ? form.images : []);
  const cover = form.image.trim();
  if (!cover) return gallery;
  if (!gallery.length) return [cover];
  if (gallery[0] === cover) return gallery;
  return uniqueImageUrls([cover, ...gallery.slice(1)]);
}

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
  auction: "Hovex Motors • Երևան",
  estimateMin: "",
  estimateMax: "",
  maxBid: "",
  image: "",
  images: [],
  imagePosition: "50% 50%",
  badge: "Առկա է",
  accent: "yellow",
  status: "draft",
  inventoryStatus: "available",
  featured: false,
};

export function createVehicleEditorForm(vehicle: Vehicle | null): VehicleEditorForm {
  const image = vehicle?.image?.trim() ?? "";
  const images = uniqueImageUrls(
    vehicle?.images?.length ? vehicle.images : image ? [image] : [],
  );
  return {
    ...emptyVehicle,
    ...(vehicle ?? {}),
    image: images[0] ?? image,
    images,
  };
}

export function validateVehicleEditorForm(
  form: VehicleEditorForm,
  selectedImageCount = 0,
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
  const images = vehicleEditorImages(form);
  if (!images.length && selectedImageCount <= 0) {
    errors.image = "Ընտրեք առնվազն մեկ նկար";
  } else if (images.some((image) => !isSafeVehicleImageUrl(image))) {
    errors.image = "Նկարի հասցեն պետք է սկսվի / կամ http:// կամ https://-ով";
  } else if (images.length + selectedImageCount > ADMIN_VEHICLE_MAX_IMAGES) {
    errors.image = `Կարելի է ավելացնել առավելագույնը ${ADMIN_VEHICLE_MAX_IMAGES} նկար`;
  }
  return errors;
}

export function toVehicleSavePayload(
  form: VehicleEditorForm,
  imageUrls: readonly string[],
): VehicleSavePayload {
  const images = uniqueImageUrls(imageUrls);
  return {
    ...form,
    // The admin creates only vehicles that are already in Hovex inventory.
    // Keep legacy statuses editable on existing records, but do not let a
    // stale/hidden form control classify a newly created vehicle as auction.
    inventoryStatus: form.id ? form.inventoryStatus : "available",
    image: images[0] ?? "",
    images,
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
