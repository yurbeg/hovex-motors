export type LeadNotificationJob = {
  jobId: string;
  leaseToken: string;
  channel: "telegram";
  leadId: string;
  attemptCount: number;
  name: string;
  phone: string;
  contactMethod: string;
  requestKind: string;
  vehicleLabel: string;
  lotId: string | null;
  vin: string | null;
  preferredDate: string | null;
  preferredTime: string;
  source: string;
  createdAt: string;
  assignedManagerName: string | null;
};

export type LeadNotificationFailure = {
  retryable: boolean;
  retryAfterSeconds: number | null;
  errorCode: string;
  safeError: string;
};

export interface LeadNotificationQueue {
  claim(limit: number, leaseSeconds: number): Promise<LeadNotificationJob[]>;
  complete(jobId: string, leaseToken: string, providerMessageId: string): Promise<void>;
  fail(
    jobId: string,
    leaseToken: string,
    failure: LeadNotificationFailure,
  ): Promise<"retry" | "dead">;
}

export interface LeadNotificationSender {
  send(job: LeadNotificationJob): Promise<string>;
}

export type LeadNotificationRunResult = {
  claimed: number;
  delivered: number;
  retryScheduled: number;
  deadLettered: number;
  acknowledgementErrors: number;
};

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const TELEGRAM_TOKEN_PATTERN = /^[0-9]{6,20}:[A-Za-z0-9_-]{20,}$/;
const TELEGRAM_CHAT_PATTERN = /^(?:-?[0-9]{1,20}|@[A-Za-z0-9_]{5,32})$/;
const PHONE_PATTERN = /^\+?[0-9][0-9 ()-]{6,31}$/;
const DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
const MAX_PROVIDER_RESPONSE_BYTES = 16_384;
const CONTACT_METHODS = new Set(["phone", "whatsapp", "video_call", "showroom_visit"]);
const REQUEST_KINDS = new Set(["consultation", "full_calculation"]);
const PREFERRED_TIMES = new Set(["10:00–13:00", "13:00–16:00", "16:00–19:00"]);
const LEAD_SOURCES = new Set(["website", "ai-assistant", "auction-catalog"]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function requiredString(
  record: Record<string, unknown>,
  key: string,
  maximum: number,
): string | null {
  const value = record[key];
  if (typeof value !== "string") return null;
  const normalized = value.trim();
  if (!normalized || normalized.length > maximum || /[\u0000-\u001f\u007f]/u.test(normalized)) {
    return null;
  }
  return normalized;
}

function optionalString(
  record: Record<string, unknown>,
  key: string,
  maximum: number,
): string | null | undefined {
  const value = record[key];
  if (value === null || value === undefined || value === "") return null;
  return requiredString(record, key, maximum) ?? undefined;
}

function validCalendarDate(value: string): boolean {
  const match = DATE_PATTERN.exec(value);
  if (!match) return false;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year
    && date.getUTCMonth() === month - 1
    && date.getUTCDate() === day;
}

export function parseLeadNotificationJob(value: unknown): LeadNotificationJob | null {
  if (!isRecord(value)) return null;
  if (!["lot_id", "vin", "preferred_date", "assigned_manager_name"]
    .every((key) => Object.prototype.hasOwnProperty.call(value, key))) {
    return null;
  }
  const jobId = requiredString(value, "job_id", 36);
  const leaseToken = requiredString(value, "lease_token", 36);
  const channel = requiredString(value, "channel", 20);
  const leadId = requiredString(value, "lead_id", 36);
  const attemptCount = value.attempt_count;
  const name = requiredString(value, "name", 100);
  const phone = requiredString(value, "phone", 32);
  const contactMethod = requiredString(value, "contact_method", 40);
  const requestKind = requiredString(value, "request_kind", 40);
  const vehicleLabel = requiredString(value, "vehicle_label", 220);
  const lotId = optionalString(value, "lot_id", 160);
  const vin = optionalString(value, "vin", 64);
  const preferredDate = optionalString(value, "preferred_date", 10);
  const preferredTime = requiredString(value, "preferred_time", 40);
  const source = requiredString(value, "source", 40);
  const createdAt = requiredString(value, "lead_created_at", 40);
  const assignedManagerName = optionalString(value, "assigned_manager_name", 120);

  if (
    jobId === null
    || leaseToken === null
    || leadId === null
    || !UUID_PATTERN.test(jobId)
    || !UUID_PATTERN.test(leaseToken)
    || !UUID_PATTERN.test(leadId)
    || channel !== "telegram"
    || !Number.isInteger(attemptCount)
    || Number(attemptCount) < 1
    || Number(attemptCount) > 1_000
    || name === null
    || phone === null
    || !PHONE_PATTERN.test(phone)
    || phone.replace(/\D/g, "").length < 8
    || phone.replace(/\D/g, "").length > 15
    || contactMethod === null
    || !CONTACT_METHODS.has(contactMethod)
    || requestKind === null
    || !REQUEST_KINDS.has(requestKind)
    || vehicleLabel === null
    || lotId === undefined
    || vin === undefined
    || preferredDate === undefined
    || (preferredDate !== null && !validCalendarDate(preferredDate))
    || preferredTime === null
    || !PREFERRED_TIMES.has(preferredTime)
    || source === null
    || !LEAD_SOURCES.has(source)
    || createdAt === null
    || !Number.isFinite(Date.parse(createdAt))
    || assignedManagerName === undefined
  ) {
    return null;
  }

  return {
    jobId: jobId.toLowerCase(),
    leaseToken: leaseToken.toLowerCase(),
    channel,
    leadId: leadId.toLowerCase(),
    attemptCount: Number(attemptCount),
    name,
    phone,
    contactMethod,
    requestKind,
    vehicleLabel,
    lotId,
    vin,
    preferredDate,
    preferredTime,
    source,
    createdAt: new Date(createdAt).toISOString(),
    assignedManagerName,
  };
}

export class LeadNotificationRepositoryError extends Error {
  readonly operation: string;
  readonly status: number | null;

  constructor(operation: string, status: number | null, cause?: unknown) {
    super(
      `Lead notification storage operation failed: ${operation}.`,
      cause === undefined ? undefined : { cause },
    );
    this.name = "LeadNotificationRepositoryError";
    this.operation = operation;
    this.status = status;
  }
}

export type SupabaseLeadNotificationQueueOptions = {
  url: string;
  serverKey: string;
  fetch?: typeof fetch;
  timeoutMs?: number;
};

function normalizeSupabaseUrl(value: string): string {
  let parsed: URL;
  try {
    parsed = new URL(value.trim());
  } catch (error) {
    throw new LeadNotificationRepositoryError("configuration", null, error);
  }
  if (
    (parsed.protocol !== "https:"
      && !(parsed.protocol === "http:" && ["127.0.0.1", "localhost"].includes(parsed.hostname)))
    || parsed.username
    || parsed.password
  ) {
    throw new LeadNotificationRepositoryError("configuration", null);
  }
  return parsed.toString().replace(/\/$/, "");
}

function isLegacyJwtKey(value: string): boolean {
  return /^eyJ[A-Za-z0-9_-]*\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(value);
}

function rpcBoolean(value: unknown): boolean | null {
  const candidate = Array.isArray(value) && value.length === 1 ? value[0] : value;
  return typeof candidate === "boolean" ? candidate : null;
}

export class SupabaseLeadNotificationQueue implements LeadNotificationQueue {
  readonly #url: string;
  readonly #serverKey: string;
  readonly #fetch: typeof fetch;
  readonly #timeoutMs: number;

  constructor(options: SupabaseLeadNotificationQueueOptions) {
    this.#url = normalizeSupabaseUrl(options.url);
    this.#serverKey = options.serverKey;
    this.#fetch = options.fetch ?? fetch;
    this.#timeoutMs = options.timeoutMs ?? 8_000;
  }

  async claim(limit: number, leaseSeconds: number): Promise<LeadNotificationJob[]> {
    const payload = await this.#rpc("claim_lead_notification_jobs", "claim jobs", {
      p_limit: limit,
      p_lease_seconds: leaseSeconds,
    });
    if (!Array.isArray(payload)) {
      throw new LeadNotificationRepositoryError("parse claimed jobs", 200);
    }
    return payload.map((row) => {
      const job = parseLeadNotificationJob(row);
      if (job === null) {
        throw new LeadNotificationRepositoryError("parse claimed job", 200);
      }
      return job;
    });
  }

  async complete(
    jobId: string,
    leaseToken: string,
    providerMessageId: string,
  ): Promise<void> {
    const payload = await this.#rpc("complete_lead_notification_job", "complete job", {
      p_job_id: jobId,
      p_lease_token: leaseToken,
      p_provider_message_id: providerMessageId,
    });
    if (rpcBoolean(payload) !== true) {
      throw new LeadNotificationRepositoryError("complete stale job", 409);
    }
  }

  async fail(
    jobId: string,
    leaseToken: string,
    failure: LeadNotificationFailure,
  ): Promise<"retry" | "dead"> {
    const payload = await this.#rpc("fail_lead_notification_job", "fail job", {
      p_job_id: jobId,
      p_lease_token: leaseToken,
      p_retryable: failure.retryable,
      p_retry_after_seconds: failure.retryAfterSeconds,
      p_error_code: failure.errorCode.slice(0, 80),
      p_safe_error: failure.safeError.slice(0, 240),
    });
    const outcome = Array.isArray(payload) && payload.length === 1 ? payload[0] : payload;
    if (outcome !== "retry" && outcome !== "dead") {
      throw new LeadNotificationRepositoryError("fail stale job", 409);
    }
    return outcome;
  }

  async #rpc(name: string, operation: string, body: Record<string, unknown>): Promise<unknown> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.#timeoutMs);
    const headers = new Headers({
      Accept: "application/json",
      apikey: this.#serverKey,
      "Content-Type": "application/json",
    });
    if (isLegacyJwtKey(this.#serverKey)) {
      headers.set("Authorization", `Bearer ${this.#serverKey}`);
    }

    try {
      const response = await this.#fetch(`${this.#url}/rest/v1/rpc/${name}`, {
        method: "POST",
        headers,
        body: JSON.stringify(body),
        signal: controller.signal,
      });
      if (!response.ok) {
        throw new LeadNotificationRepositoryError(operation, response.status);
      }
      if (response.status === 204) return null;
      const text = await response.text();
      if (!text) return null;
      try {
        return JSON.parse(text) as unknown;
      } catch (error) {
        throw new LeadNotificationRepositoryError(operation, response.status, error);
      }
    } catch (error) {
      if (error instanceof LeadNotificationRepositoryError) throw error;
      throw new LeadNotificationRepositoryError(operation, null, error);
    } finally {
      clearTimeout(timeoutId);
    }
  }
}

const contactMethodLabels: Readonly<Record<string, string>> = {
  phone: "Հեռախոսազանգ",
  whatsapp: "WhatsApp",
  video_call: "Տեսազանգ",
  showroom_visit: "Այցելություն սրահ",
};

const requestKindLabels: Readonly<Record<string, string>> = {
  consultation: "Խորհրդատվություն",
  full_calculation: "Ամբողջական հաշվարկ",
};

const sourceLabels: Readonly<Record<string, string>> = {
  website: "Կայք",
  "ai-assistant": "AI օգնական",
  "auction-catalog": "Աճուրդային կատալոգ",
};

export function escapeTelegramHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function label(labels: Readonly<Record<string, string>>, value: string): string {
  return labels[value] ?? value;
}

function formatReceivedAt(value: string): string {
  return new Intl.DateTimeFormat("hy-AM", {
    timeZone: "Asia/Yerevan",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(new Date(value));
}

function phoneHref(value: string): string | null {
  const prefix = value.trim().startsWith("+") ? "+" : "";
  const digits = value.replace(/\D/g, "");
  return digits.length >= 8 && digits.length <= 15 ? `tel:${prefix}${digits}` : null;
}

export function normalizeAdminAppUrl(value: string | null | undefined): string | null {
  const normalized = value?.trim();
  if (!normalized) return null;
  let parsed: URL;
  try {
    parsed = new URL(normalized);
  } catch {
    return null;
  }
  if (
    (parsed.protocol !== "https:"
      && !(parsed.protocol === "http:" && ["127.0.0.1", "localhost"].includes(parsed.hostname)))
    || parsed.username
    || parsed.password
  ) {
    return null;
  }
  parsed.hash = "";
  return parsed.toString().replace(/\/$/, "");
}

export function formatTelegramLeadMessage(
  job: LeadNotificationJob,
  adminAppUrl: string | null = null,
): string {
  const safe = escapeTelegramHtml;
  const phone = safe(job.phone);
  const href = phoneHref(job.phone);
  const phoneValue = href === null
    ? phone
    : `<a href="${safe(href)}">${phone}</a>`;
  const preferred = job.preferredDate
    ? `${job.preferredDate} · ${job.preferredTime}`
    : job.preferredTime;
  const lines = [
    "🚨 <b>Նոր հարցում</b>",
    "",
    `<b>Տեսակ՝</b> ${safe(label(requestKindLabels, job.requestKind))}`,
    `<b>Հաճախորդ՝</b> ${safe(job.name)}`,
    `<b>Հեռախոս՝</b> ${phoneValue}`,
    `<b>Կապի եղանակ՝</b> ${safe(label(contactMethodLabels, job.contactMethod))}`,
    `<b>Մեքենա՝</b> ${safe(job.vehicleLabel)}`,
  ];
  if (job.lotId) lines.push(`<b>Lot ID՝</b> ${safe(job.lotId)}`);
  if (job.vin) lines.push(`<b>VIN՝</b> <code>${safe(job.vin)}</code>`);
  lines.push(
    `<b>Նախընտրելի ժամ՝</b> ${safe(preferred)}`,
    `<b>Պատասխանատու՝</b> ${safe(job.assignedManagerName ?? "Դեռ չի նշանակվել")}`,
    `<b>Աղբյուր՝</b> ${safe(label(sourceLabels, job.source))}`,
    `<b>Ստացվել է՝</b> ${safe(formatReceivedAt(job.createdAt))}`,
    `<b>Lead ID՝</b> <code>${safe(job.leadId)}</code>`,
  );
  if (adminAppUrl) {
    lines.push("", `<a href="${safe(adminAppUrl)}">Բացել Hovex Admin-ում</a>`);
  }
  return lines.join("\n");
}

export function validTelegramToken(value: string): boolean {
  return TELEGRAM_TOKEN_PATTERN.test(value);
}

export function validTelegramChatId(value: string): boolean {
  return TELEGRAM_CHAT_PATTERN.test(value);
}

export class TelegramDeliveryError extends Error implements LeadNotificationFailure {
  readonly retryable: boolean;
  readonly retryAfterSeconds: number | null;
  readonly errorCode: string;
  readonly safeError: string;

  constructor(failure: LeadNotificationFailure, cause?: unknown) {
    super(failure.safeError, cause === undefined ? undefined : { cause });
    this.name = "TelegramDeliveryError";
    this.retryable = failure.retryable;
    this.retryAfterSeconds = failure.retryAfterSeconds;
    this.errorCode = failure.errorCode;
    this.safeError = failure.safeError;
  }
}

type TelegramResponse = {
  ok?: unknown;
  error_code?: unknown;
  parameters?: unknown;
  result?: unknown;
};

function retryAfterSeconds(payload: TelegramResponse): number | null {
  if (!isRecord(payload.parameters)) return null;
  const value = payload.parameters.retry_after;
  return Number.isInteger(value) && Number(value) >= 1 && Number(value) <= 86_400
    ? Number(value)
    : null;
}

function deliveryFailure(status: number | null, payload: TelegramResponse = {}): TelegramDeliveryError {
  const providerCode = Number.isInteger(payload.error_code) ? Number(payload.error_code) : status;
  const retryable = providerCode === 429 || (providerCode !== null && providerCode >= 500);
  const code = providerCode === 429
    ? "telegram_rate_limited"
    : providerCode === null
      ? "telegram_network_error"
      : `telegram_http_${providerCode}`;
  const safeError = providerCode === 429
    ? "Telegram rate limit was reached."
    : providerCode === null
      ? "Telegram could not be reached."
      : `Telegram request failed with HTTP ${providerCode}.`;
  return new TelegramDeliveryError({
    retryable,
    retryAfterSeconds: providerCode === 429 ? retryAfterSeconds(payload) : null,
    errorCode: code,
    safeError,
  });
}

export type TelegramLeadNotificationSenderOptions = {
  botToken: string;
  chatId: string;
  messageThreadId?: number | null;
  adminAppUrl?: string | null;
  fetch?: typeof fetch;
  timeoutMs?: number;
};

export class TelegramLeadNotificationSender implements LeadNotificationSender {
  readonly #botToken: string;
  readonly #chatId: string;
  readonly #messageThreadId: number | null;
  readonly #adminAppUrl: string | null;
  readonly #fetch: typeof fetch;
  readonly #timeoutMs: number;

  constructor(options: TelegramLeadNotificationSenderOptions) {
    this.#botToken = options.botToken;
    this.#chatId = options.chatId;
    this.#messageThreadId = options.messageThreadId ?? null;
    this.#adminAppUrl = options.adminAppUrl ?? null;
    this.#fetch = options.fetch ?? fetch;
    this.#timeoutMs = options.timeoutMs ?? 8_000;
  }

  async send(job: LeadNotificationJob): Promise<string> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.#timeoutMs);
    let response: Response;
    try {
      response = await this.#fetch(
        `https://api.telegram.org/bot${this.#botToken}/sendMessage`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chat_id: this.#chatId,
            text: formatTelegramLeadMessage(job, this.#adminAppUrl),
            parse_mode: "HTML",
            link_preview_options: { is_disabled: true },
            ...(this.#messageThreadId === null
              ? {}
              : { message_thread_id: this.#messageThreadId }),
          }),
          signal: controller.signal,
        },
      );
    } catch (error) {
      throw new TelegramDeliveryError({
        retryable: true,
        retryAfterSeconds: null,
        errorCode: "telegram_network_error",
        safeError: "Telegram could not be reached.",
      }, error);
    } finally {
      clearTimeout(timeoutId);
    }

    let text: string;
    try {
      const contentLength = Number(response.headers.get("content-length"));
      if (Number.isFinite(contentLength) && contentLength > MAX_PROVIDER_RESPONSE_BYTES) {
        throw new Error("response too large");
      }
      text = await response.text();
      if (new TextEncoder().encode(text).byteLength > MAX_PROVIDER_RESPONSE_BYTES) {
        throw new Error("response too large");
      }
    } catch (error) {
      throw new TelegramDeliveryError({
        retryable: true,
        retryAfterSeconds: null,
        errorCode: "telegram_invalid_response",
        safeError: "Telegram returned an unreadable response.",
      }, error);
    }

    let payload: TelegramResponse = {};
    try {
      const decoded = JSON.parse(text) as unknown;
      if (isRecord(decoded)) payload = decoded;
    } catch {
      if (response.ok) {
        throw new TelegramDeliveryError({
          retryable: true,
          retryAfterSeconds: null,
          errorCode: "telegram_invalid_response",
          safeError: "Telegram returned an unreadable response.",
        });
      }
    }

    if (!response.ok || payload.ok !== true) {
      throw deliveryFailure(response.status, payload);
    }
    if (!isRecord(payload.result)) {
      throw new TelegramDeliveryError({
        retryable: true,
        retryAfterSeconds: null,
        errorCode: "telegram_invalid_response",
        safeError: "Telegram did not confirm the sent message.",
      });
    }
    const messageId = payload.result.message_id;
    if (!Number.isSafeInteger(messageId) || Number(messageId) < 1) {
      throw new TelegramDeliveryError({
        retryable: true,
        retryAfterSeconds: null,
        errorCode: "telegram_invalid_response",
        safeError: "Telegram did not confirm the sent message.",
      });
    }
    return String(messageId);
  }
}

function asDeliveryFailure(error: unknown): LeadNotificationFailure {
  if (error instanceof TelegramDeliveryError) return error;
  return {
    retryable: true,
    retryAfterSeconds: null,
    errorCode: "notification_worker_error",
    safeError: "Notification delivery failed before Telegram confirmed it.",
  };
}

function retryDelayForAttempt(attemptCount: number): number {
  const delays = [60, 120, 300, 900, 1_800, 3_600] as const;
  return delays[Math.min(Math.max(attemptCount - 1, 0), delays.length - 1)];
}

export async function processLeadNotificationJobs({
  queue,
  sender,
  limit,
  leaseSeconds,
}: {
  queue: LeadNotificationQueue;
  sender: LeadNotificationSender;
  limit: number;
  leaseSeconds: number;
}): Promise<LeadNotificationRunResult> {
  const jobs = await queue.claim(limit, leaseSeconds);
  const result: LeadNotificationRunResult = {
    claimed: jobs.length,
    delivered: 0,
    retryScheduled: 0,
    deadLettered: 0,
    acknowledgementErrors: 0,
  };

  for (const job of jobs) {
    let providerMessageId: string;
    try {
      providerMessageId = await sender.send(job);
    } catch (error) {
      const classified = asDeliveryFailure(error);
      const failure = classified.retryable && classified.retryAfterSeconds === null
        ? {
          ...classified,
          retryAfterSeconds: retryDelayForAttempt(job.attemptCount),
        }
        : classified;
      try {
        const outcome = await queue.fail(job.jobId, job.leaseToken, failure);
        if (outcome === "retry") result.retryScheduled += 1;
        else result.deadLettered += 1;
      } catch {
        // Do not mark a potentially delivered message as failed when the
        // durable acknowledgement itself is unavailable. The lease will
        // expire and make the job recoverable by a later worker invocation.
        result.acknowledgementErrors += 1;
      }
      continue;
    }

    try {
      await queue.complete(job.jobId, job.leaseToken, providerMessageId);
      result.delivered += 1;
    } catch {
      // Telegram has already confirmed the message. Leaving the lease to
      // expire is safer than overwriting state without the matching token.
      result.acknowledgementErrors += 1;
    }
  }

  return result;
}
