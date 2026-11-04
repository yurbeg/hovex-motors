import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowCounterClockwise,
  ArrowRight,
  ArrowsLeftRight,
  Car,
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
} from "./assistantService.js";
import { faqs } from "./data.js";
import "./assistant.css";

const CHAT_STORAGE_KEY = "hovex.assistant.chat.v1";

function makeId(prefix = "message") {
  return globalThis.crypto?.randomUUID?.() || `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function initialMessages() {
  return [{
    id: "assistant-welcome",
    role: "assistant",
    content: "Բարև, ես Hovex-ի խելացի օգնականն եմ։ Օգնեմ գտնել մեքենա ըստ բյուջեի, հասկանալ ներմուծման ծախսերը կամ կապվել մասնագետի հետ։",
    vehicleIds: [],
    suggestions: DEFAULT_SUGGESTIONS,
    mode: isRemoteAssistantConfigured() ? "remote-ai" : "local-demo",
  }];
}

function loadMessages() {
  if (typeof window === "undefined") return initialMessages();
  try {
    const parsed = JSON.parse(window.sessionStorage.getItem(CHAT_STORAGE_KEY));
    return Array.isArray(parsed) && parsed.length ? parsed.slice(-20) : initialMessages();
  } catch {
    return initialMessages();
  }
}

function formatUsd(value) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(Number(value) || 0);
}

function AssistantVehicleCard({ vehicle, compared, onDetails, onCompare, onConsultation }) {
  return (
    <article className="ai-vehicle-card">
      <img src={vehicle.image} alt="" style={{ objectPosition: vehicle.imagePosition }} />
      <div className="ai-vehicle-card__body">
        <p>{vehicle.year} · {vehicle.body} · {vehicle.fuel}</p>
        <h4>{vehicle.make} {vehicle.model}</h4>
        <strong>{formatUsd(vehicle.estimateMin)}–{formatUsd(vehicle.estimateMax).replace("$", "")}</strong>
        <span>Նախնական արժեք Հայաստանում</span>
      </div>
      <div className="ai-vehicle-card__actions">
        <button type="button" onClick={() => onDetails(vehicle)}>Մանրամասներ <ArrowRight size={14} weight="bold" /></button>
        <button type="button" className={compared ? "ai-card-compare--active" : ""} onClick={() => onCompare(vehicle.id)} aria-pressed={compared} aria-label={`${vehicle.make} ${vehicle.model}-ը համեմատել`}>
          {compared ? <Check size={15} weight="bold" /> : <ArrowsLeftRight size={15} weight="bold" />}
        </button>
        <button type="button" onClick={() => onConsultation(vehicle.id)} aria-label={`${vehicle.make} ${vehicle.model}-ի շուրջ խորհրդակցել`}><Phone size={15} weight="fill" /></button>
      </div>
    </article>
  );
}

function MessageBubble({ message, vehiclesById, compared, onDetails, onCompare, onConsultation, onSuggestion, isLast }) {
  const recommendations = (message.vehicleIds || []).map((id) => vehiclesById.get(id)).filter(Boolean);
  return (
    <div className={`ai-message ai-message--${message.role}`}>
      {message.role === "assistant" ? <span className="ai-message__avatar"><Sparkle size={15} weight="fill" /></span> : null}
      <div className="ai-message__content">
        <p>{message.content}</p>
        {message.notice ? <small className="ai-message__notice">{message.notice}</small> : null}
        {recommendations.length ? (
          <div className="ai-recommendations">
            {recommendations.map((vehicle) => <AssistantVehicleCard key={vehicle.id} vehicle={vehicle} compared={compared.includes(vehicle.id)} onDetails={onDetails} onCompare={onCompare} onConsultation={onConsultation} />)}
          </div>
        ) : null}
        {isLast && message.role === "assistant" && message.suggestions?.length ? (
          <div className="ai-quick-replies" aria-label="Արագ հարցեր">
            {message.suggestions.map((suggestion) => <button type="button" key={suggestion} onClick={() => onSuggestion(suggestion)}>{suggestion}</button>)}
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
}) {
  const [messages, setMessages] = useState(loadMessages);
  const [input, setInput] = useState("");
  const [status, setStatus] = useState("idle");
  const inputRef = useRef(null);
  const launcherRef = useRef(null);
  const messagesEndRef = useRef(null);
  const previousFocusRef = useRef(null);
  const mountedRef = useRef(true);
  const vehiclesById = useMemo(() => new Map(vehicles.map((vehicle) => [vehicle.id, vehicle])), [vehicles]);
  const lastAssistantMode = [...messages].reverse().find((message) => message.role === "assistant")?.mode;
  const isRemote = lastAssistantMode === "remote-ai";

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    try {
      window.sessionStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(messages.slice(-20)));
    } catch {
      // The assistant remains usable when browser storage is disabled.
    }
  }, [messages]);

  useEffect(() => {
    if (!open) return undefined;
    previousFocusRef.current = document.activeElement;
    document.body.classList.add("ai-assistant-open");
    window.requestAnimationFrame(() => inputRef.current?.focus());
    const onKeyDown = (event) => {
      if (event.key === "Escape") onOpenChange(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.classList.remove("ai-assistant-open");
      window.removeEventListener("keydown", onKeyDown);
      previousFocusRef.current?.focus?.();
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

  const handleSpecialSuggestion = (text) => {
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

  const sendMessage = async (rawText) => {
    const text = String(rawText || "").trim().slice(0, MAX_MESSAGE_LENGTH);
    if (!text || status === "thinking") return;
    if (handleSpecialSuggestion(text)) return;
    const userMessage = { id: makeId("user"), role: "user", content: text };
    const nextHistory = [...messages, userMessage];
    setMessages(nextHistory);
    setInput("");
    setStatus("thinking");
    const startedAt = Date.now();
    try {
      const reply = await askAssistant({
        message: text,
        history: messages,
        vehicles,
        criteria,
        comparedVehicleIds: compared,
        faqs,
      });
      const remainingDelay = Math.max(0, 420 - (Date.now() - startedAt));
      if (remainingDelay) await new Promise((resolve) => window.setTimeout(resolve, remainingDelay));
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

  const submit = (event) => {
    event.preventDefault();
    sendMessage(input);
  };

  const openVehicle = (vehicle) => {
    onOpenChange(false);
    onVehicleDetails(vehicle);
  };

  const consultVehicle = (vehicleId) => {
    onOpenChange(false);
    onConsultation(vehicleId);
  };

  return (
    <div className="ai-assistant">
      <button ref={launcherRef} type="button" className="ai-launcher" aria-expanded={open} aria-controls="hovex-ai-panel" onClick={() => onOpenChange(!open)}>
        <span className="ai-launcher__icon">{open ? <X size={22} weight="bold" /> : <Sparkle size={22} weight="fill" />}</span>
        <span className="ai-launcher__copy"><strong>Hovex AI</strong><small>Օգնեմ ընտրել մեքենա</small></span>
        {!open ? <i>AI</i> : null}
      </button>
      {open ? (
        <section id="hovex-ai-panel" className="ai-panel" role="dialog" aria-modal="false" aria-label="Hovex AI օգնական">
          <header className="ai-panel__header">
            <div className="ai-panel__identity"><span><Robot size={24} weight="fill" /></span><p><strong>Hovex AI օգնական</strong><small><i />{isRemote ? "AI խորհրդատու · առցանց" : "Խելացի demo խորհրդատու"}</small></p></div>
            <div className="ai-panel__header-actions"><button type="button" onClick={resetConversation} aria-label="Սկսել նոր զրույց"><ArrowCounterClockwise size={19} weight="bold" /></button><button type="button" onClick={() => onOpenChange(false)} aria-label="Փակել AI օգնականը"><X size={20} weight="bold" /></button></div>
          </header>
          <div className="ai-panel__intro"><MagicWand size={17} weight="fill" /><span><strong>Հարցրեք բնական լեզվով</strong><small>Գրեք բյուջեն, ցանկալի տարին կամ մեքենայի տեսակը։</small></span></div>
          <div className="ai-messages" aria-live="polite">
            {messages.map((message, index) => <MessageBubble key={message.id} message={message} vehiclesById={vehiclesById} compared={compared} onDetails={openVehicle} onCompare={onCompare} onConsultation={consultVehicle} onSuggestion={sendMessage} isLast={index === messages.length - 1} />)}
            {status === "thinking" ? <div className="ai-thinking" role="status"><span><Sparkle size={14} weight="fill" /></span><p>Փնտրում եմ Hovex-ի տարբերակներում<i /><i /><i /></p></div> : null}
            <div ref={messagesEndRef} />
          </div>
          <div className="ai-panel__handoff"><button type="button" onClick={() => { onOpenChange(false); onConsultation(null); }}><Phone size={17} weight="fill" /><span><strong>Մասնագետի օգնություն</strong><small>{"033 344 366"}</small></span><ArrowRight size={16} weight="bold" /></button></div>
          <form className="ai-composer" onSubmit={submit}>
            <label><span className="sr-only">Գրել հարց Hovex AI օգնականին</span><textarea ref={inputRef} rows="1" maxLength={MAX_MESSAGE_LENGTH} value={input} onChange={(event) => setInput(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); sendMessage(input); } }} placeholder="Օր․ մեքենա մինչև $20,000" disabled={status === "thinking"} /></label>
            <button type="submit" disabled={!input.trim() || status === "thinking"} aria-label="Ուղարկել հարցը">{status === "thinking" ? <SpinnerGap size={20} weight="bold" /> : <PaperPlaneTilt size={20} weight="fill" />}</button>
          </form>
          <p className="ai-disclaimer"><ChatCircleDots size={14} /> Մի գրեք անձնական տվյալներ։ Առաջարկները նախնական են և պահանջում են մասնագետի հաստատում։</p>
        </section>
      ) : null}
    </div>
  );
}
