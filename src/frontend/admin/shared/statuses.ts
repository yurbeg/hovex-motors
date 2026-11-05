import type { LeadStatus } from "../../../domain/lead";
import type { VehicleStatus } from "../../../domain/vehicle";
import type { StatusConfig } from "./adminTypes";

export const vehicleStatus: Record<VehicleStatus, StatusConfig> = {
  published: { label: "Հրապարակված", tone: "green" },
  draft: { label: "Սևագիր", tone: "gray" },
  archived: { label: "Արխիվացված", tone: "orange" },
};

export const leadStatus: Record<LeadStatus, StatusConfig> = {
  new: { label: "Նոր", tone: "blue" },
  contacted: { label: "Կապ հաստատված", tone: "yellow" },
  booked: { label: "Ամրագրված", tone: "green" },
  closed: { label: "Փակված", tone: "gray" },
};
