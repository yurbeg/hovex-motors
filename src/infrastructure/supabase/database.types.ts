import type { VehicleStatus } from "../../domain/vehicle";

export type { VehicleStatus } from "../../domain/vehicle";

export type VehicleRow = {
  id: string;
  make: string;
  model: string;
  year: number;
  body: string;
  mileage: string;
  fuel: string;
  damage: string;
  auction: string;
  estimate_min: number;
  estimate_max: number;
  max_bid: number;
  image: string;
  image_position: string;
  badge: string;
  accent: string;
  status: VehicleStatus;
  featured: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

export type VehicleInsert = {
  id: string;
  make: string;
  model: string;
  year: number;
  body?: string;
  mileage?: string;
  fuel?: string;
  damage?: string;
  auction?: string;
  estimate_min: number;
  estimate_max: number;
  max_bid: number;
  image: string;
  image_position?: string;
  badge?: string;
  accent?: string;
  status?: VehicleStatus;
  featured?: boolean;
  sort_order?: number;
  created_at?: string;
  updated_at?: string;
};

export type VehicleUpdate = Partial<VehicleInsert>;

export type AdminUserRow = {
  user_id: string;
  singleton: boolean;
  granted_at: string;
};

export type AdminUserInsert = {
  user_id: string;
  singleton?: boolean;
  granted_at?: string;
};

export type AdminUserUpdate = Partial<AdminUserInsert>;

export interface Database {
  public: {
    Tables: {
      admin_users: {
        Row: AdminUserRow;
        Insert: AdminUserInsert;
        Update: AdminUserUpdate;
        Relationships: [];
      };
      vehicles: {
        Row: VehicleRow;
        Insert: VehicleInsert;
        Update: VehicleUpdate;
        Relationships: [];
      };
    };
    Views: Record<never, never>;
    Functions: Record<never, never>;
    Enums: Record<never, never>;
    CompositeTypes: Record<never, never>;
  };
}
