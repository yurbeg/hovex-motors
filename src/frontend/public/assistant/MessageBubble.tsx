import { Sparkle } from "@phosphor-icons/react";
import type { Vehicle } from "../../../domain/vehicle";
import type { AssistantMessage } from "./types";
import { AssistantVehicleCard } from "./AssistantVehicleCard";

interface MessageBubbleProps {
  message: AssistantMessage;
  vehiclesById: Map<string, Vehicle>;
  compared: string[];
  onDetails: (vehicle: Vehicle) => void;
  onCompare: (vehicleId: string) => void;
  onConsultation: (vehicleId: string) => void;
  onSuggestion: (suggestion: string) => void;
  isLast: boolean;
}

export function MessageBubble({ message, vehiclesById, compared, onDetails, onCompare, onConsultation, onSuggestion, isLast }: MessageBubbleProps) {
  const recommendations = (message.vehicleIds || []).map((id) => vehiclesById.get(id)).filter((vehicle): vehicle is Vehicle => Boolean(vehicle));
  const fromUser = message.role === "user";
  return <div className={`mb-[15px] flex items-start gap-2 ${fromUser ? "justify-end" : ""}`}>{!fromUser ? <span className="grid size-[27px] shrink-0 place-items-center rounded-lg bg-[#ffc400] text-[#11110f] shadow-[0_4px_12px_rgba(160,123,0,0.13)]"><Sparkle size={15} weight="fill" /></span> : null}<div className="max-w-[calc(100%-35px)] max-[420px]:max-w-[calc(100%-32px)]"><p className={`m-0 w-fit whitespace-pre-wrap border px-3 py-[11px] text-[10px] leading-[1.65] max-[800px]:text-[10px] ${fromUser ? "ml-auto rounded-[14px_4px_14px_14px] border-[#1a1916] bg-[#1a1916] text-white" : "rounded-[4px_14px_14px_14px] border-[#e0dcd4] bg-white text-[#403d38]"}`}>{message.content}</p>{message.notice ? <small className="mx-1 mt-1.5 block text-[7px] leading-[1.45] text-[#8a6a00]">{message.notice}</small> : null}{recommendations.length ? <div className="mt-2 grid gap-2">{recommendations.map((vehicle) => <AssistantVehicleCard key={vehicle.id} vehicle={vehicle} compared={compared.includes(vehicle.id)} onDetails={onDetails} onCompare={onCompare} onConsultation={onConsultation} />)}</div> : null}{isLast && message.role === "assistant" && message.suggestions?.length ? <div className="mt-2 flex flex-wrap gap-1.5" aria-label="Արագ հարցեր">{message.suggestions.map((suggestion) => <button type="button" className="min-h-[33px] cursor-pointer rounded-full border border-[#d5bd66] bg-[#fffdf5] px-2.5 py-0 text-[8px] leading-tight font-extrabold text-[#705600] hover:border-[#eaae00] hover:bg-[#fff3ce] max-[800px]:min-h-9" key={suggestion} onClick={() => onSuggestion(suggestion)}>{suggestion}</button>)}</div> : null}</div></div>;
}
