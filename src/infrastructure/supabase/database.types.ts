import type { VehicleInventoryStatus, VehicleStatus } from "../../domain/vehicle";
import type {
  LeadActivityType,
  LeadContactMethod,
  LeadRequestKind,
  LeadSource,
  LeadStatus,
} from "../../domain/lead";

export type { VehicleInventoryStatus, VehicleStatus } from "../../domain/vehicle";
export type {
  LeadActivityType,
  LeadContactMethod,
  LeadRequestKind,
  LeadSource,
  LeadStatus,
} from "../../domain/lead";

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

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
  images: string[];
  image_position: string;
  badge: string;
  accent: string;
  status: VehicleStatus;
  inventory_status: VehicleInventoryStatus;
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
  images?: string[];
  image_position?: string;
  badge?: string;
  accent?: string;
  status?: VehicleStatus;
  inventory_status?: VehicleInventoryStatus;
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

export type LeadRow = {
  id: string;
  client_request_id: string;
  submission_hash: string;
  submission_hash_version: 1 | 2;
  name: string;
  phone: string;
  contact_method: LeadContactMethod;
  request_kind: LeadRequestKind;
  vehicle_id: string | null;
  vehicle_label: string;
  lot_id: string | null;
  vin: string | null;
  preferred_date: string | null;
  preferred_time: string;
  note: string;
  source: LeadSource;
  status: LeadStatus;
  assigned_manager_id: string | null;
  first_response_due_at: string;
  first_contacted_at: string | null;
  next_action_at: string | null;
  consent_version: string;
  consent_at: string;
  created_at: string;
  updated_at: string;
};

export type LeadInsert = {
  id?: string;
  client_request_id: string;
  submission_hash: string;
  submission_hash_version?: 1 | 2;
  name: string;
  phone: string;
  contact_method: LeadContactMethod;
  request_kind?: LeadRequestKind;
  vehicle_id?: string | null;
  vehicle_label?: string;
  lot_id?: string | null;
  vin?: string | null;
  preferred_date?: string | null;
  preferred_time?: string;
  note?: string;
  source?: LeadSource;
  status?: LeadStatus;
  assigned_manager_id?: string | null;
  first_response_due_at?: string;
  first_contacted_at?: string | null;
  next_action_at?: string | null;
  consent_version: string;
  consent_at?: string;
  created_at?: string;
  updated_at?: string;
};

export type LeadUpdate = Partial<LeadInsert>;

export type LeadManagerRow = {
  id: string;
  auth_user_id: string | null;
  display_name: string;
  email: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type LeadManagerInsert = {
  id?: string;
  auth_user_id?: string | null;
  display_name: string;
  email?: string | null;
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
};

export type LeadManagerUpdate = Partial<LeadManagerInsert>;

export type LeadActivityRow = {
  id: string;
  lead_id: string;
  activity_type: LeadActivityType;
  actor_user_id: string | null;
  actor_label: string;
  from_status: LeadStatus | null;
  to_status: LeadStatus | null;
  from_manager_id: string | null;
  to_manager_id: string | null;
  from_manager_name: string | null;
  to_manager_name: string | null;
  from_next_action_at: string | null;
  to_next_action_at: string | null;
  note_body: string | null;
  created_at: string;
};

export type LeadActivityInsert = {
  id?: string;
  lead_id: string;
  activity_type: LeadActivityType;
  actor_user_id?: string | null;
  actor_label?: string;
  from_status?: LeadStatus | null;
  to_status?: LeadStatus | null;
  from_manager_id?: string | null;
  to_manager_id?: string | null;
  from_manager_name?: string | null;
  to_manager_name?: string | null;
  from_next_action_at?: string | null;
  to_next_action_at?: string | null;
  note_body?: string | null;
  created_at?: string;
};

export type LeadActivityUpdate = Partial<LeadActivityInsert>;

export type MotorapiCatalogRow = {
  id: string;
  provider_vehicle_id: number;
  provider_lot_id: number;
  source_domain_id: number;
  source_slug: string;
  lot_number: string | null;
  title: string | null;
  vin: string | null;
  year: number | null;
  make: string | null;
  model: string | null;
  generation: string | null;
  body_type: string | null;
  color: string | null;
  engine: string | null;
  transmission: string | null;
  drive_wheel: string | null;
  vehicle_type: string | null;
  fuel_type: string | null;
  cylinders: number | null;
  odometer_value: number | null;
  odometer_unit: string | null;
  odometer_status: string | null;
  primary_damage: string | null;
  secondary_damage: string | null;
  location: string | null;
  sale_date: string | null;
  status: string | null;
  current_bid: number | null;
  current_bid_updated_at: string | null;
  buy_now_price: number | null;
  buy_now_updated_at: string | null;
  currency: string | null;
  photo_urls: string[];
  provider_updated_at: string | null;
  fetched_at: string;
  characteristics: Json;
  search_text: string;
};

export type MotorapiCatalogFacetsRow = {
  makes: Json;
  models: Json;
  years: Json;
  vehicle_types: Json;
  body_types: Json;
  fuel_types: Json;
  transmissions: Json;
  drive_wheels: Json;
  colors: Json;
  conditions: Json;
  primary_damages: Json;
  locations: Json;
  lot_statuses: Json;
};

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
      leads: {
        Row: LeadRow;
        Insert: LeadInsert;
        Update: LeadUpdate;
        Relationships: [];
      };
      lead_managers: {
        Row: LeadManagerRow;
        Insert: LeadManagerInsert;
        Update: LeadManagerUpdate;
        Relationships: [];
      };
      lead_activities: {
        Row: LeadActivityRow;
        Insert: LeadActivityInsert;
        Update: LeadActivityUpdate;
        Relationships: [];
      };
    };
    Views: {
      motorapi_catalog: {
        Row: MotorapiCatalogRow;
        Relationships: [];
      };
    };
    Functions: {
      consume_lead_submission_limit: {
        Args: {
          p_fingerprint: string;
          p_limit?: number;
          p_window_seconds?: number;
        };
        Returns: boolean;
      };
      update_lead_workflow: {
        Args: {
          p_lead_id: string;
          p_expected_updated_at: string;
          p_new_status: LeadStatus;
          p_new_manager_id: string | null;
          p_new_next_action_at: string | null;
        };
        Returns: LeadRow;
      };
      add_lead_note: {
        Args: {
          p_lead_id: string;
          p_body: string;
        };
        Returns: LeadActivityRow;
      };
      get_motorapi_catalog_facets: {
        Args: { p_make?: string | null };
        Returns: MotorapiCatalogFacetsRow[];
      };
    };
    Enums: Record<never, never>;
    CompositeTypes: Record<never, never>;
  };
}
