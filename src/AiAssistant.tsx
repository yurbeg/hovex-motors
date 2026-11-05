import { useEffect, useMemo, useRef, useState } from "react";
import type { FormEvent, KeyboardEvent as ReactKeyboardEvent } from "react";
import {
  ArrowCounterClockwise,
  ArrowRight,
  ArrowsLeftRight,
  ChatCircleDots,
  Check,
  MagicWand,
  PaperPlaneTilt,
  Phone,
  Robot,
  Sparkle,
  SpinnerGap,
  X,
} from "@phosphor-icons/react";
import {
  askAssistant,
  DEFAULT_SUGGESTIONS,
  isRemoteAssistantConfigured,
  MAX_MESSAGE_LENGTH,
} from "./assistantService";
import type { AssistantCriteria, AssistantReplyMode } from "./assistantService";
import type { Vehicle } from "./adminStore";
import { faqs } from "./data";

const CHAT_STORAGE_KEY = "hovex.assistant.chat.v1";

type AssistantMode = AssistantReplyMode | "error";
type AssistantStatus = "idle" | "thinking";

interface AssistantMessage {
  id: string;
  role: "assistant" | "user";
  content: string;
  vehicleIds?: string[];
  suggestions?: string[];
  notice?: string;
  mode?: AssistantMode;
}

interface AiAssistantProps {
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

interface AssistantVehicleCardProps {
  vehicle: Vehicle;
  compared: boolean;
  onDetails: (vehicle: Vehicle) => void;
  onCompare: (vehicleId: string) => void;
  onConsultation: (vehicleId: string) => void;
}

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

function makeId(prefix = "message"): string {
  return globalThis.crypto?.randomUUID?.() || `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function initialMessages(): AssistantMessage[] {
  return [{
    id: "assistant-welcome",
    role: "assistant",
    content: "Բարև, ես Hovex-ի խելացի օգնականն եմ։ Օգնեմ գտնել մեքենա ըստ բյուջեի, հասկանալ ներմուծման ծախսերը կամ կապվել մասնագետի հետ։",
    vehicleIds: [],
    suggestions: DEFAULT_SUGGESTIONS,
    mode: isRemoteAssistantConfigured() ? "remote-ai" : "local-demo",
  }];
}

function loadMessages(): AssistantMessage[] {
  if (typeof window === "undefined") return initialMessages();
  try {
    const parsed: unknown = JSON.parse(window.sessionStorage.getItem(CHAT_STORAGE_KEY) ?? "null");
    return Array.isArray(parsed) && parsed.length ? parsed.slice(-20) : initialMessages();
  } catch {
    return initialMessages();
  }
}

function formatUsd(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(Number(value) || 0);
}

function AssistantVehicleCard({ vehicle, compared, onDetails, onCompare, onConsultation }: AssistantVehicleCardProps) {
  return (
    <article className="grid grid-cols-[91px_minmax(0,1fr)] overflow-hidden rounded-xl border border-[#ded9d0] bg-white shadow-[0_7px_20px_rgba(17,17,15,0.055)] max-[420px]:grid-cols-[82px_minmax(0,1fr)]">
      <img
        className="row-span-2 h-[102px] w-[91px] bg-[#e8e4dd] object-cover max-[420px]:w-[82px]"
        src={vehicle.image}
        alt=""
        style={{ objectPosition: vehicle.imagePosition }}
      />
      <div className="grid min-w-0 px-2.5 pt-[9px] pb-1.5">
        <p className="m-0 text-[7px] text-[#89837a]">{vehicle.year} · {vehicle.body} · {vehicle.fuel}</p>
        <h4 className="mt-0.5 mb-[5px] overflow-hidden text-[10px] leading-tight text-ellipsis whitespace-nowrap">{vehicle.make} {vehicle.model}</h4>
        <strong className="text-[11px]">{formatUsd(vehicle.estimateMin)}–{formatUsd(vehicle.estimateMax).replace("$", "")}</strong>
        <span className="text-[7px] text-[#8d877e]">Նախնական արժեք Հայաստանում</span>
      </div>
      <div className="flex items-center justify-end gap-[5px] pt-[5px] pr-2 pb-2 pl-2.5">
        <button
          type="button"
          className="mr-auto inline-flex h-[29px] min-w-[29px] cursor-pointer items-center justify-center gap-[5px] rounded-lg border border-transparent bg-white py-0 pr-[7px] pl-0 text-[7px] font-extrabold text-[#3e3b36]"
          onClick={() => onDetails(vehicle)}
        >
          Մանրամասներ <ArrowRight size={14} weight="bold" />
        </button>
        <button
          type="button"
          className={`inline-flex h-[29px] min-w-[29px] cursor-pointer items-center justify-center gap-[5px] rounded-lg border px-[7px] py-0 text-[7px] font-extrabold ${compared ? "border-[#ffc400] bg-[#ffc400] text-[#11110f]" : "border-[#ded9d0] bg-white text-[#3e3b36]"}`}
          onClick={() => onCompare(vehicle.id)}
          aria-pressed={compared}
          aria-label={`${vehicle.make} ${vehicle.model}-ը համեմատել`}
        >
          {compared ? <Check size={15} weight="bold" /> : <ArrowsLeftRight size={15} weight="bold" />}
        </button>
        <button
          type="button"
          className="inline-flex h-[29px] min-w-[29px] cursor-pointer items-center justify-center gap-[5px] rounded-lg border border-[#1c1b18] bg-[#1c1b18] px-[7px] py-0 text-[7px] font-extrabold text-white"
          onClick={() => onConsultation(vehicle.id)}
          aria-label={`${vehicle.make} ${vehicle.model}-ի շուրջ խորհրդակցել`}
        >
          <Phone size={15} weight="fill" />
        </button>
      </div>
    </article>
  );
}

function MessageBubble({ message, vehiclesById, compared, onDetails, onCompare, onConsultation, onSuggestion, isLast }: MessageBubbleProps) {
  const recommendations = (message.vehicleIds || [])
    .map((id) => vehiclesById.get(id))
    .filter((vehicle): vehicle is Vehicle => Boolean(vehicle));
  const fromUser = message.role === "user";
  return (
    <div className={`mb-[15px] flex items-start gap-2 ${fromUser ? "justify-end" : ""}`}>
      {!fromUser ? (
        <span className="grid size-[27px] shrink-0 place-items-center rounded-lg bg-[#ffc400] text-[#11110f] shadow-[0_4px_12px_rgba(160,123,0,0.13)]">
          <Sparkle size={15} weight="fill" />
        </span>
      ) : null}
      <div className="max-w-[calc(100%-35px)] max-[420px]:max-w-[calc(100%-32px)]">
        <p className={`m-0 w-fit whitespace-pre-wrap border px-3 py-[11px] text-[10px] leading-[1.65] max-[800px]:text-[10px] ${fromUser ? "ml-auto rounded-[14px_4px_14px_14px] border-[#1a1916] bg-[#1a1916] text-white" : "rounded-[4px_14px_14px_14px] border-[#e0dcd4] bg-white text-[#403d38]"}`}>
          {message.content}
        </p>
        {message.notice ? <small className="mx-1 mt-1.5 block text-[7px] leading-[1.45] text-[#8a6a00]">{message.notice}</small> : null}
        {recommendations.length ? (
          <div className="mt-2 grid gap-2">
            {recommendations.map((vehicle) => <AssistantVehicleCard key={vehicle.id} vehicle={vehicle} compared={compared.includes(vehicle.id)} onDetails={onDetails} onCompare={onCompare} onConsultation={onConsultation} />)}
          </div>
        ) : null}
        {isLast && message.role === "assistant" && message.suggestions?.length ? (
          <div className="mt-2 flex flex-wrap gap-1.5" aria-label="Արագ հարցեր">
            {message.suggestions.map((suggestion) => (
              <button
                type="button"
                className="min-h-[33px] cursor-pointer rounded-full border border-[#d5bd66] bg-[#fffdf5] px-2.5 py-0 text-[8px] leading-tight font-extrabold text-[#705600] hover:border-[#eaae00] hover:bg-[#fff3ce] max-[800px]:min-h-9"
                key={suggestion}
                onClick={() => onSuggestion(suggestion)}
              >
                {suggestion}
              </button>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}

export function AiAssistant({
  open,
  onOpenChange,
  vehicles,
  criteria,
  compared,
  onVehicleDetails,
  onCompare,
  onConsultation,
  onOpenFinder,
}: AiAssistantProps) {
  const [messages, setMessages] = useState<AssistantMessage[]>(loadMessages);
  const [input, setInput] = useState("");
  const [status, setStatus] = useState<AssistantStatus>("idle");
  const [panelVisible, setPanelVisible] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const launcherRef = useRef<HTMLButtonElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const mountedRef = useRef(true);
  const vehiclesById = useMemo(() => new Map<string, Vehicle>(vehicles.map((vehicle) => [vehicle.id, vehicle])), [vehicles]);
  const lastAssistantMode = [...messages].reverse().find((message) => message.role === "assistant")?.mode;
  const isRemote = lastAssistantMode === "remote-ai";

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (!open) {
      setPanelVisible(false);
      return undefined;
    }
    setPanelVisible(false);
    const frame = window.requestAnimationFrame(() => setPanelVisible(true));
    return () => window.cancelAnimationFrame(frame);
  }, [open]);

  useEffect(() => {
    try {
      window.sessionStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(messages.slice(-20)));
    } catch {
      // The assistant remains usable when browser storage is disabled.
    }
  }, [messages]);

  useEffect(() => {
    if (!open) return undefined;
    previousFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    document.body.classList.add("ai-assistant-open");
    window.requestAnimationFrame(() => inputRef.current?.focus());
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onOpenChange(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.classList.remove("ai-assistant-open");
      window.removeEventListener("keydown", onKeyDown);
      previousFocusRef.current?.focus();
    };
  }, [open, onOpenChange]);

  useEffect(() => {
    if (open) messagesEndRef.current?.scrollIntoView({ block: "end" });
  }, [messages, open, status]);

  const resetConversation = () => {
    setMessages(initialMessages());
    setInput("");
    setStatus("idle");
  };

  const handleSpecialSuggestion = (text: string): boolean => {
    if (text === "Խոսել մասնագետի հետ") {
      onOpenChange(false);
      onConsultation(null);
      return true;
    }
    if (text === "Դիտել բոլոր մեքենաները") {
      onOpenChange(false);
      onOpenFinder();
      return true;
    }
    if (text === "Մեծացնել բյուջեն") {
      setInput("Գտիր մեքենա մինչև $25,000");
      return true;
    }
    return false;
  };

  const sendMessage = async (rawText: string): Promise<void> => {
    const text = String(rawText || "").trim().slice(0, MAX_MESSAGE_LENGTH);
    if (!text || status === "thinking") return;
    if (handleSpecialSuggestion(text)) return;
    const userMessage: AssistantMessage = { id: makeId("user"), role: "user", content: text };
    const nextHistory = [...messages, userMessage];
    setMessages(nextHistory);
    setInput("");
    setStatus("thinking");
    const startedAt = Date.now();
    try {
      const reply = await askAssistant({
        message: text,
        history: messages.map(({ role, content }) => ({ role, content })),
        vehicles,
        criteria,
        comparedVehicleIds: compared,
        faqs,
      });
      const remainingDelay = Math.max(0, 420 - (Date.now() - startedAt));
      if (remainingDelay) await new Promise<void>((resolve) => window.setTimeout(resolve, remainingDelay));
      if (!mountedRef.current) return;
      setMessages((current) => [...current, {
        id: makeId("assistant"),
        role: "assistant",
        content: reply.text,
        vehicleIds: reply.vehicleIds || [],
        suggestions: reply.suggestions || [],
        notice: reply.notice,
        mode: reply.mode,
      }]);
    } catch {
      if (!mountedRef.current) return;
      setMessages((current) => [...current, {
        id: makeId("assistant"),
        role: "assistant",
        content: "Հիմա չկարողացա պատասխանել։ Փորձեք կրկին կամ կապվեք Hovex-ի մասնագետի հետ։",
        vehicleIds: [],
        suggestions: ["Փորձել կրկին", "Խոսել մասնագետի հետ"],
        mode: "error",
      }]);
    } finally {
      if (mountedRef.current) setStatus("idle");
    }
  };

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    sendMessage(input);
  };

  const openVehicle = (vehicle: Vehicle) => {
    onOpenChange(false);
    onVehicleDetails(vehicle);
  };

  const consultVehicle = (vehicleId: string) => {
    onOpenChange(false);
    onConsultation(vehicleId);
  };

  return (
    <div className="relative z-[70]">
      <button
        ref={launcherRef}
        type="button"
        className="fixed right-6 bottom-6 z-[70] flex min-h-[58px] min-w-[190px] cursor-pointer items-center gap-2.5 rounded-[17px] border border-[#2a2925] bg-[#11110f] py-[7px] pr-2.5 pl-2 text-white shadow-[0_18px_42px_rgba(17,17,15,0.24)] transition-[transform,box-shadow] duration-[160ms] ease-[ease] hover:-translate-y-0.5 hover:shadow-[0_21px_46px_rgba(17,17,15,0.29)] motion-reduce:transition-none [body.has-compare_&]:bottom-[98px] max-[800px]:hidden"
        aria-expanded={open}
        aria-controls="hovex-ai-panel"
        onClick={() => onOpenChange(!open)}
      >
        <span className="grid size-[43px] shrink-0 place-items-center rounded-xl bg-[#ffc400] text-[#11110f]">
          {open ? <X size={22} weight="bold" /> : <Sparkle size={22} weight="fill" />}
        </span>
        <span className="grid text-left">
          <strong className="text-[11px] leading-[1.2]">Hovex AI</strong>
          <small className="mt-0.5 text-[8px] text-[#aaa69e]">Օգնեմ ընտրել մեքենա</small>
        </span>
        {!open ? <i className="ml-0.5 grid h-[23px] min-w-[26px] place-items-center rounded-[7px] border border-[#514a2c] bg-[#27241a] text-[8px] font-black not-italic tracking-[0.06em] text-[#ffc400]">AI</i> : null}
      </button>
      {open ? (
        <section
          id="hovex-ai-panel"
          className={`fixed right-6 bottom-[94px] z-[70] flex h-[min(700px,calc(100dvh-118px))] min-h-[520px] w-[min(416px,calc(100vw-32px))] flex-col overflow-hidden rounded-[21px] border border-[#d8d3ca] bg-white shadow-[0_24px_70px_rgba(17,17,15,0.24)] transition-[opacity,transform] duration-[190ms] ease-out motion-reduce:transition-none max-[800px]:inset-x-0 max-[800px]:top-16 max-[800px]:bottom-[calc(67px+env(safe-area-inset-bottom))] max-[800px]:h-auto max-[800px]:max-h-none max-[800px]:min-h-0 max-[800px]:w-full max-[800px]:rounded-none max-[800px]:border-0 max-[800px]:shadow-none ${panelVisible ? "translate-y-0 scale-100 opacity-100" : "translate-y-3 scale-[0.98] opacity-0 max-[800px]:translate-y-[18px] max-[800px]:scale-100"}`}
          role="dialog"
          aria-modal="false"
          aria-label="Hovex AI օգնական"
        >
          <header className="flex min-h-[76px] items-center justify-between gap-3 bg-[#11110f] px-3.5 py-[13px] text-white max-[800px]:min-h-[68px] max-[800px]:px-3.5">
            <div className="flex min-w-0 items-center gap-[11px]">
              <span className="grid size-[45px] shrink-0 place-items-center rounded-[13px] bg-[#ffc400] text-[#11110f]"><Robot size={24} weight="fill" /></span>
              <p className="m-0 grid min-w-0">
                <strong className="text-[13px] leading-[1.2]">Hovex AI օգնական</strong>
                <small className="mt-1 flex items-center gap-1.5 text-[8px] text-[#aaa69e]"><i className="size-[7px] rounded-full bg-[#4bc76a] shadow-[0_0_0_3px_rgba(75,199,106,0.14)]" />{isRemote ? "AI խորհրդատու · առցանց" : "Խելացի demo խորհրդատու"}</small>
              </p>
            </div>
            <div className="flex gap-[5px]">
              <button type="button" className="grid size-[37px] cursor-pointer place-items-center rounded-[10px] border border-[#383632] bg-[#1d1c19] text-[#d7d3cb] hover:border-[#74662f] hover:text-[#ffc400] max-[420px]:hidden" onClick={resetConversation} aria-label="Սկսել նոր զրույց"><ArrowCounterClockwise size={19} weight="bold" /></button>
              <button type="button" className="grid size-[37px] cursor-pointer place-items-center rounded-[10px] border border-[#383632] bg-[#1d1c19] text-[#d7d3cb] hover:border-[#74662f] hover:text-[#ffc400]" onClick={() => onOpenChange(false)} aria-label="Փակել AI օգնականը"><X size={20} weight="bold" /></button>
            </div>
          </header>
          <div className="flex min-h-[51px] items-center gap-[9px] border-b border-[#eeeae3] bg-[#fff9e8] px-[15px] py-[9px] text-[#896900] max-[800px]:min-h-12 max-[420px]:hidden">
            <MagicWand size={17} weight="fill" />
            <span className="grid"><strong className="text-[9px] text-[#5f4a00]">Հարցրեք բնական լեզվով</strong><small className="text-[8px] text-[#8d877d]">Գրեք բյուջեն, ցանկալի տարին կամ մեքենայի տեսակը։</small></span>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain bg-[radial-gradient(circle_at_92%_8%,rgba(255,196,0,0.06),transparent_28%),#f7f5f0] px-3.5 pt-[17px] pb-3 [scrollbar-color:#d5d0c7_transparent] [scrollbar-width:thin] max-[800px]:px-3 max-[800px]:pt-[15px] max-[800px]:pb-2.5" aria-live="polite">
            {messages.map((message, index) => <MessageBubble key={message.id} message={message} vehiclesById={vehiclesById} compared={compared} onDetails={openVehicle} onCompare={onCompare} onConsultation={consultVehicle} onSuggestion={sendMessage} isLast={index === messages.length - 1} />)}
            {status === "thinking" ? (
              <div className="mt-1 mb-[15px] flex items-center gap-2" role="status">
                <span className="grid size-[27px] place-items-center rounded-lg bg-[#ffc400]"><Sparkle size={14} weight="fill" /></span>
                <p className="m-0 flex items-center gap-1 rounded-[4px_13px_13px_13px] border border-[#e0dcd4] bg-white px-3 py-2.5 text-[8px] text-[#706b64]">
                  Փնտրում եմ Hovex-ի տարբերակներում
                  <i className="size-1 animate-bounce rounded-full bg-[#9a958d] motion-reduce:animate-none" />
                  <i className="size-1 animate-bounce rounded-full bg-[#9a958d] [animation-delay:110ms] motion-reduce:animate-none" />
                  <i className="size-1 animate-bounce rounded-full bg-[#9a958d] [animation-delay:220ms] motion-reduce:animate-none" />
                </p>
              </div>
            ) : null}
            <div ref={messagesEndRef} />
          </div>
          <div className="border-t border-[#ece8e1] bg-white px-3 pt-2 max-[800px]:px-2.5">
            <button type="button" className="flex min-h-[47px] w-full cursor-pointer items-center gap-[9px] rounded-[10px] border border-[#e1ddd5] bg-[#f8f6f1] px-2.5 py-[7px] text-left text-[#3a3732] [&>svg:first-child]:text-[#8a6a00] [&>svg:last-child]:ml-auto" onClick={() => { onOpenChange(false); onConsultation(null); }}>
              <Phone size={17} weight="fill" />
              <span className="grid"><strong className="text-[9px]">Մասնագետի օգնություն</strong><small className="text-[7px] text-[#89837a]">{"033 344 366"}</small></span>
              <ArrowRight size={16} weight="bold" />
            </button>
          </div>
          <form className="grid grid-cols-[minmax(0,1fr)_44px] gap-[7px] bg-white px-3 py-[9px] max-[800px]:px-2.5 max-[800px]:py-2" onSubmit={submit}>
            <label className="min-w-0">
              <span className="sr-only">Գրել հարց Hovex AI օգնականին</span>
              <textarea
                ref={inputRef}
                className="h-11 max-h-[84px] min-h-11 w-full resize-none rounded-[11px] border border-[#d9d4cc] bg-white px-[13px] py-3 text-[9px] leading-normal text-[#11110f] outline-none focus:border-[#846700] focus:shadow-[0_0_0_3px_rgba(255,196,0,0.16)] disabled:bg-[#f4f1eb] max-[800px]:h-[46px] max-[800px]:min-h-[46px]"
                rows={1}
                maxLength={MAX_MESSAGE_LENGTH}
                value={input}
                onChange={(event) => setInput(event.target.value)}
                onKeyDown={(event: ReactKeyboardEvent<HTMLTextAreaElement>) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); sendMessage(input); } }}
                placeholder="Օր․ մեքենա մինչև $20,000"
                disabled={status === "thinking"}
              />
            </label>
            <button type="submit" className="grid h-11 cursor-pointer place-items-center rounded-[11px] border-0 bg-[#ffc400] text-[#11110f] disabled:cursor-default disabled:opacity-[0.42] max-[800px]:h-[46px] max-[800px]:min-h-[46px]" disabled={!input.trim() || status === "thinking"} aria-label="Ուղարկել հարցը">
              {status === "thinking" ? <SpinnerGap className="animate-spin motion-reduce:animate-none" size={20} weight="bold" /> : <PaperPlaneTilt size={20} weight="fill" />}
            </button>
          </form>
          <p className="m-0 flex items-start justify-center gap-[5px] bg-white px-[13px] pt-0 pb-2.5 text-center text-[6.5px] leading-[1.45] text-[#918b83] [&_svg]:-mt-px [&_svg]:shrink-0"><ChatCircleDots size={14} /> Մի գրեք անձնական տվյալներ։ Առաջարկները նախնական են և պահանջում են մասնագետի հաստատում։</p>
        </section>
      ) : null}
    </div>
  );
}
