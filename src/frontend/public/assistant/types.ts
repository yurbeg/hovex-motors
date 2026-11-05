import type { AssistantCriteria, AssistantReplyMode } from "../../../application/assistantService";
import type { Vehicle } from "../../../domain/vehicle";

export type AssistantMode = AssistantReplyMode | "error";
export type AssistantStatus = "idle" | "thinking";

export interface AssistantMessage {
  id: string;
  role: "assistant" | "user";
  content: string;
  vehicleIds?: string[];
  suggestions?: string[];
  notice?: string;
  mode?: AssistantMode;
}

export interface AiAssistantProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vehicles: Vehicle[];
  criteria: AssistantCriteria;
  compared: string[];
  onVehicleDetails: (vehicle: Vehicle) => void;
  onCompare: (vehicleId: string) => void;
  onConsultation: (vehicleId: string | null) => void;
  onOpenFinder: () => void;
}
