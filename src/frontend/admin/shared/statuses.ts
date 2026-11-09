import type { LeadStatus } from "../../../domain/lead";
import type { VehicleInventoryStatus, VehicleStatus } from "../../../domain/vehicle";
import type { StatusConfig } from "./adminTypes";

export const vehicleStatus: Record<VehicleStatus, StatusConfig> = {
  published: { label: "Հրապարակված", tone: "green" },
  draft: { label: "Սևագիր", tone: "gray" },
  archived: { label: "Արխիվացված", tone: "orange" },
};

export const vehicleInventoryStatus: Record<VehicleInventoryStatus, StatusConfig> = {
  available: { label: "Առկա", tone: "green" },
  in_transit: { label: "Ճանապարհին", tone: "blue" },
  at_auction: { label: "Աճուրդում", tone: "yellow" },
};

export const leadStatus: Record<LeadStatus, StatusConfig> = {
  new: { label: "Նոր", tone: "blue" },
  contacted: { label: "Կապ հաստատված", tone: "yellow" },
  booked: { label: "Ամրագրված", tone: "green" },
  closed: { label: "Փակված", tone: "gray" },
};
