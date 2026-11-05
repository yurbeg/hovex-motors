import { useEffect, useMemo, useRef, useState } from "react";
import type { FormEvent, KeyboardEvent as ReactKeyboardEvent } from "react";
import { ArrowCounterClockwise, ArrowRight, ChatCircleDots, MagicWand, PaperPlaneTilt, Phone, Robot, Sparkle, SpinnerGap, X } from "@phosphor-icons/react";
import { askAssistant, MAX_MESSAGE_LENGTH } from "../../../application/assistantService";
import { faqs } from "../../../content/catalog";
import type { Vehicle } from "../../../domain/vehicle";
import type { AiAssistantProps, AssistantMessage, AssistantStatus } from "./types";
import { initialMessages, loadMessages, makeMessageId, saveMessages } from "./assistantStorage";
import { MessageBubble } from "./MessageBubble";

export function AiAssistant({ open, onOpenChange, vehicles, criteria, compared, onVehicleDetails, onCompare, onConsultation, onOpenFinder }: AiAssistantProps) {
  const [messages, setMessages] = useState<AssistantMessage[]>(loadMessages);
  const [input, setInput] = useState("");
  const [status, setStatus] = useState<AssistantStatus>("idle");
  const [panelVisible, setPanelVisible] = useState(false);
  const [isMobileModal, setIsMobileModal] = useState(() => (
    typeof window !== "undefined" && window.matchMedia("(max-width: 800px)").matches
  ));
  const rootRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const mountedRef = useRef(true);
  const requestGenerationRef = useRef(0);
  const vehiclesById = useMemo(() => new Map<string, Vehicle>(vehicles.map((vehicle) => [vehicle.id, vehicle])), [vehicles]);
  const lastAssistantMode = [...messages].reverse().find((message) => message.role === "assistant")?.mode;
  const isRemote = lastAssistantMode === "remote-ai";

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      requestGenerationRef.current += 1;
    };
  }, []);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(max-width: 800px)");
    const updateMode = () => setIsMobileModal(mediaQuery.matches);
    updateMode();
    mediaQuery.addEventListener("change", updateMode);
    return () => mediaQuery.removeEventListener("change", updateMode);
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

  useEffect(() => saveMessages(messages), [messages]);

  useEffect(() => {
    if (!open) return undefined;
    previousFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    document.body.classList.add("ai-assistant-open");
    const root = rootRef.current;
    const panel = panelRef.current;
    const backgroundElements = isMobileModal && root?.parentElement
      ? Array.from(root.parentElement.children).filter((element) => element !== root)
      : [];
    const backgroundState = backgroundElements.map((element) => ({
      element: element as HTMLElement,
      ariaHidden: element.getAttribute("aria-hidden"),
      inert: (element as HTMLElement).inert,
    }));
    backgroundState.forEach(({ element }) => {
      element.inert = true;
      element.setAttribute("aria-hidden", "true");
    });
    const focusableSelector = "button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex='-1'])";
    const focusableElements = () => (
      panel
        ? Array.from(panel.querySelectorAll<HTMLElement>(focusableSelector))
          .filter((element) => element.offsetParent !== null)
        : []
    );
    const frame = window.requestAnimationFrame(() => {
      (inputRef.current && !inputRef.current.disabled ? inputRef.current : focusableElements()[0] || panel)?.focus();
    });
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onOpenChange(false);
        return;
      }
      if (event.key !== "Tab" || !isMobileModal || !panel) return;
      const focusable = focusableElements();
      if (!focusable.length) {
        event.preventDefault();
        panel.focus();
        return;
      }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const activeElement = document.activeElement;
      if (event.shiftKey && (activeElement === first || !panel.contains(activeElement))) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.cancelAnimationFrame(frame);
      document.body.classList.remove("ai-assistant-open");
      window.removeEventListener("keydown", onKeyDown);
      backgroundState.forEach(({ element, ariaHidden, inert }) => {
        element.inert = inert;
        if (ariaHidden === null) element.removeAttribute("aria-hidden");
        else element.setAttribute("aria-hidden", ariaHidden);
      });
      previousFocusRef.current?.focus();
    };
  }, [isMobileModal, open, onOpenChange]);

  useEffect(() => {
    if (open) messagesEndRef.current?.scrollIntoView({ block: "end" });
  }, [messages, open, status]);

  const resetConversation = (): void => {
    requestGenerationRef.current += 1;
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
    const generation = ++requestGenerationRef.current;
    const userMessage: AssistantMessage = { id: makeMessageId("user"), role: "user", content: text };
    setMessages((current) => [...current, userMessage]);
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
      if (!mountedRef.current || generation !== requestGenerationRef.current) return;
      setMessages((current) => [...current, {
        id: makeMessageId("assistant"),
        role: "assistant",
        content: reply.text,
        vehicleIds: reply.vehicleIds || [],
        suggestions: reply.suggestions || [],
        notice: reply.notice,
        mode: reply.mode,
      }]);
    } catch {
      if (!mountedRef.current || generation !== requestGenerationRef.current) return;
      setMessages((current) => [...current, {
        id: makeMessageId("assistant"),
        role: "assistant",
        content: "Հիմա չկարողացա պատասխանել։ Փորձեք կրկին կամ կապվեք Hovex-ի մասնագետի հետ։",
        vehicleIds: [],
        suggestions: ["Փորձել կրկին", "Խոսել մասնագետի հետ"],
        mode: "error",
      }]);
    } finally {
      if (mountedRef.current && generation === requestGenerationRef.current) setStatus("idle");
    }
  };

  const submit = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault();
    void sendMessage(input);
  };

  const openVehicle = (vehicle: Vehicle): void => {
    onOpenChange(false);
    onVehicleDetails(vehicle);
  };

  const consultVehicle = (vehicleId: string): void => {
    onOpenChange(false);
    onConsultation(vehicleId);
  };

  return (
    <div ref={rootRef} className="relative z-[70]">
      <button type="button" className="fixed right-6 bottom-6 z-[70] flex min-h-[58px] min-w-[190px] cursor-pointer items-center gap-2.5 rounded-[17px] border border-[#2a2925] bg-[#11110f] py-[7px] pr-2.5 pl-2 text-white shadow-[0_18px_42px_rgba(17,17,15,0.24)] transition-[transform,box-shadow] duration-[160ms] ease-[ease] hover:-translate-y-0.5 hover:shadow-[0_21px_46px_rgba(17,17,15,0.29)] motion-reduce:transition-none [body.has-compare_&]:bottom-[98px] max-[800px]:hidden" aria-expanded={open} aria-controls="hovex-ai-panel" onClick={() => onOpenChange(!open)}>
        <span className="grid size-[43px] shrink-0 place-items-center rounded-xl bg-[#ffc400] text-[#11110f]">{open ? <X size={22} weight="bold" /> : <Sparkle size={22} weight="fill" />}</span>
        <span className="grid text-left"><strong className="text-[11px] leading-[1.2]">Hovex AI</strong><small className="mt-0.5 text-[8px] text-[#aaa69e]">Օգնեմ ընտրել մեքենա</small></span>
        {!open ? <i className="ml-0.5 grid h-[23px] min-w-[26px] place-items-center rounded-[7px] border border-[#514a2c] bg-[#27241a] text-[8px] font-black not-italic tracking-[0.06em] text-[#ffc400]">AI</i> : null}
      </button>
      {open ? (
        <section ref={panelRef} id="hovex-ai-panel" tabIndex={-1} className={`fixed right-6 bottom-[94px] z-[70] flex h-[min(700px,calc(100dvh-118px))] min-h-[520px] w-[min(416px,calc(100vw-32px))] flex-col overflow-hidden rounded-[21px] border border-[#d8d3ca] bg-white shadow-[0_24px_70px_rgba(17,17,15,0.24)] transition-[opacity,transform] duration-[190ms] ease-out motion-reduce:transition-none max-[800px]:inset-x-0 max-[800px]:top-16 max-[800px]:bottom-[calc(67px+env(safe-area-inset-bottom))] max-[800px]:h-auto max-[800px]:max-h-none max-[800px]:min-h-0 max-[800px]:w-full max-[800px]:rounded-none max-[800px]:border-0 max-[800px]:shadow-none ${panelVisible ? "translate-y-0 scale-100 opacity-100" : "translate-y-3 scale-[0.98] opacity-0 max-[800px]:translate-y-[18px] max-[800px]:scale-100"}`} role="dialog" aria-modal={isMobileModal} aria-label="Hovex AI օգնական">
          <header className="flex min-h-[76px] items-center justify-between gap-3 bg-[#11110f] px-3.5 py-[13px] text-white max-[800px]:min-h-[68px] max-[800px]:px-3.5">
            <div className="flex min-w-0 items-center gap-[11px]"><span className="grid size-[45px] shrink-0 place-items-center rounded-[13px] bg-[#ffc400] text-[#11110f]"><Robot size={24} weight="fill" /></span><p className="m-0 grid min-w-0"><strong className="text-[13px] leading-[1.2]">Hovex AI օգնական</strong><small className="mt-1 flex items-center gap-1.5 text-[8px] text-[#aaa69e]"><i className="size-[7px] rounded-full bg-[#4bc76a] shadow-[0_0_0_3px_rgba(75,199,106,0.14)]" />{isRemote ? "AI խորհրդատու · առցանց" : "Խելացի demo խորհրդատու"}</small></p></div>
            <div className="flex gap-[5px]"><button type="button" className="grid size-[37px] cursor-pointer place-items-center rounded-[10px] border border-[#383632] bg-[#1d1c19] text-[#d7d3cb] hover:border-[#74662f] hover:text-[#ffc400] max-[420px]:hidden" onClick={resetConversation} aria-label="Սկսել նոր զրույց"><ArrowCounterClockwise size={19} weight="bold" /></button><button type="button" className="grid size-[37px] cursor-pointer place-items-center rounded-[10px] border border-[#383632] bg-[#1d1c19] text-[#d7d3cb] hover:border-[#74662f] hover:text-[#ffc400]" onClick={() => onOpenChange(false)} aria-label="Փակել AI օգնականը"><X size={20} weight="bold" /></button></div>
          </header>
          <div className="flex min-h-[51px] items-center gap-[9px] border-b border-[#eeeae3] bg-[#fff9e8] px-[15px] py-[9px] text-[#896900] max-[800px]:min-h-12 max-[420px]:hidden"><MagicWand size={17} weight="fill" /><span className="grid"><strong className="text-[9px] text-[#5f4a00]">Հարցրեք բնական լեզվով</strong><small className="text-[8px] text-[#8d877d]">Գրեք բյուջեն, ցանկալի տարին կամ մեքենայի տեսակը։</small></span></div>
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain bg-[radial-gradient(circle_at_92%_8%,rgba(255,196,0,0.06),transparent_28%),#f7f5f0] px-3.5 pt-[17px] pb-3 [scrollbar-color:#d5d0c7_transparent] [scrollbar-width:thin] max-[800px]:px-3 max-[800px]:pt-[15px] max-[800px]:pb-2.5" aria-live="polite">
            {messages.map((message, index) => <MessageBubble key={message.id} message={message} vehiclesById={vehiclesById} compared={compared} onDetails={openVehicle} onCompare={onCompare} onConsultation={consultVehicle} onSuggestion={(suggestion) => void sendMessage(suggestion)} isLast={index === messages.length - 1} />)}
            {status === "thinking" ? <div className="mt-1 mb-[15px] flex items-center gap-2" role="status"><span className="grid size-[27px] place-items-center rounded-lg bg-[#ffc400]"><Sparkle size={14} weight="fill" /></span><p className="m-0 flex items-center gap-1 rounded-[4px_13px_13px_13px] border border-[#e0dcd4] bg-white px-3 py-2.5 text-[8px] text-[#706b64]">Փնտրում եմ Hovex-ի տարբերակներում<i className="size-1 animate-bounce rounded-full bg-[#9a958d] motion-reduce:animate-none" /><i className="size-1 animate-bounce rounded-full bg-[#9a958d] [animation-delay:110ms] motion-reduce:animate-none" /><i className="size-1 animate-bounce rounded-full bg-[#9a958d] [animation-delay:220ms] motion-reduce:animate-none" /></p></div> : null}
            <div ref={messagesEndRef} />
          </div>
          <div className="border-t border-[#ece8e1] bg-white px-3 pt-2 max-[800px]:px-2.5"><button type="button" className="flex min-h-[47px] w-full cursor-pointer items-center gap-[9px] rounded-[10px] border border-[#e1ddd5] bg-[#f8f6f1] px-2.5 py-[7px] text-left text-[#3a3732] [&>svg:first-child]:text-[#8a6a00] [&>svg:last-child]:ml-auto" onClick={() => { onOpenChange(false); onConsultation(null); }}><Phone size={17} weight="fill" /><span className="grid"><strong className="text-[9px]">Մասնագետի օգնություն</strong><small className="text-[7px] text-[#89837a]">033 344 366</small></span><ArrowRight size={16} weight="bold" /></button></div>
          <form className="grid grid-cols-[minmax(0,1fr)_44px] gap-[7px] bg-white px-3 py-[9px] max-[800px]:px-2.5 max-[800px]:py-2" onSubmit={submit}><label className="min-w-0"><span className="sr-only">Գրել հարց Hovex AI օգնականին</span><textarea ref={inputRef} className="h-11 max-h-[84px] min-h-11 w-full resize-none rounded-[11px] border border-[#d9d4cc] bg-white px-[13px] py-3 text-[9px] leading-normal text-[#11110f] outline-none focus:border-[#846700] focus:shadow-[0_0_0_3px_rgba(255,196,0,0.16)] disabled:bg-[#f4f1eb] max-[800px]:h-[46px] max-[800px]:min-h-[46px]" rows={1} maxLength={MAX_MESSAGE_LENGTH} value={input} onChange={(event) => setInput(event.target.value)} onKeyDown={(event: ReactKeyboardEvent<HTMLTextAreaElement>) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); void sendMessage(input); } }} placeholder="Օր․ մեքենա մինչև $20,000" disabled={status === "thinking"} /></label><button type="submit" className="grid h-11 cursor-pointer place-items-center rounded-[11px] border-0 bg-[#ffc400] text-[#11110f] disabled:cursor-default disabled:opacity-[0.42] max-[800px]:h-[46px] max-[800px]:min-h-[46px]" disabled={!input.trim() || status === "thinking"} aria-label="Ուղարկել հարցը">{status === "thinking" ? <SpinnerGap className="animate-spin motion-reduce:animate-none" size={20} weight="bold" /> : <PaperPlaneTilt size={20} weight="fill" />}</button></form>
          <p className="m-0 flex items-start justify-center gap-[5px] bg-white px-[13px] pt-0 pb-2.5 text-center text-[6.5px] leading-[1.45] text-[#918b83] [&_svg]:-mt-px [&_svg]:shrink-0"><ChatCircleDots size={14} /> Մի գրեք անձնական տվյալներ։ Առաջարկները նախնական են և պահանջում են մասնագետի հաստատում։</p>
        </section>
      ) : null}
    </div>
  );
}
