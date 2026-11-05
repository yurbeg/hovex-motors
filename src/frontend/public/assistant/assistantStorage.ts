import { DEFAULT_SUGGESTIONS, isRemoteAssistantConfigured } from "../../../application/assistantService";
import type { AssistantMessage, AssistantMode } from "./types";

const CHAT_STORAGE_KEY = "hovex.assistant.chat.v1";
const assistantModes = new Set<AssistantMode>(["remote-ai", "local-demo", "local-fallback", "error"]);

export function makeMessageId(prefix = "message"): string {
  return globalThis.crypto?.randomUUID?.() || `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function initialMessages(): AssistantMessage[] {
  return [{
    id: "assistant-welcome",
    role: "assistant",
    content: "Բարև, ես Hovex-ի խելացի օգնականն եմ։ Օգնեմ գտնել մեքենա ըստ բյուջեի, հասկանալ ներմուծման ծախսերը կամ կապվել մասնագետի հետ։",
    vehicleIds: [],
    suggestions: DEFAULT_SUGGESTIONS,
    mode: isRemoteAssistantConfigured() ? "remote-ai" : "local-demo",
  }];
}

function stringList(value: unknown): string[] | undefined {
  if (value === undefined) return undefined;
  if (!Array.isArray(value) || value.some((item) => typeof item !== "string")) return undefined;
  return value.slice(0, 12);
}

function parseMessage(value: unknown): AssistantMessage | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const record = value as Record<string, unknown>;
  if (typeof record.id !== "string" || !record.id || (record.role !== "assistant" && record.role !== "user") || typeof record.content !== "string") return null;
  const mode = typeof record.mode === "string" && assistantModes.has(record.mode as AssistantMode) ? record.mode as AssistantMode : undefined;
  return {
    id: record.id,
    role: record.role,
    content: record.content.slice(0, 4_000),
    vehicleIds: stringList(record.vehicleIds),
    suggestions: stringList(record.suggestions),
    notice: typeof record.notice === "string" ? record.notice.slice(0, 1_000) : undefined,
    mode,
  };
}

export function loadMessages(): AssistantMessage[] {
  if (typeof window === "undefined") return initialMessages();
  try {
    const parsed: unknown = JSON.parse(window.sessionStorage.getItem(CHAT_STORAGE_KEY) ?? "null");
    if (!Array.isArray(parsed) || !parsed.length) return initialMessages();
    const messages = parsed.slice(-20).map(parseMessage).filter((message): message is AssistantMessage => message !== null);
    return messages.length ? messages : initialMessages();
  } catch {
    return initialMessages();
  }
}

export function saveMessages(messages: readonly AssistantMessage[]): void {
  try {
    window.sessionStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(messages.slice(-20)));
  } catch {
    // The assistant remains usable when browser storage is disabled.
  }
}
