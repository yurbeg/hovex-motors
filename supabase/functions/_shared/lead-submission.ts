export const LEAD_CONTACT_METHODS = [
  "phone",
  "whatsapp",
  "video_call",
  "showroom_visit",
] as const;

export const LEAD_SOURCES = ["website", "ai-assistant", "auction-catalog"] as const;

export const LEAD_PREFERRED_TIMES = [
  "10:00–13:00",
  "13:00–16:00",
  "16:00–19:00",
] as const;

export type LeadContactMethod = typeof LEAD_CONTACT_METHODS[number];
export type LeadSource = typeof LEAD_SOURCES[number];

export type ValidatedLeadSubmission = {
  clientRequestId: string;
  name: string;
  phone: string;
  contactMethod: LeadContactMethod;
  vehicleId: string | null;
  vehicleLabel: string;
  preferredDate: string | null;
  preferredTime: string;
  note: string;
  source: LeadSource;
  consent: true;
};

export type LeadValidationResult =
  | { ok: true; value: ValidatedLeadSubmission }
  | { ok: false };

export type StoredLeadIdentity = {
  id: string;
  receivedAt: string;
  submissionHash: string;
};

export type NewLeadRow = {
  client_request_id: string;
  submission_hash: string;
  name: string;
  phone: string;
  contact_method: LeadContactMethod;
  vehicle_id: string | null;
  vehicle_label: string;
  preferred_date: string | null;
  preferred_time: string;
  note: string;
  source: LeadSource;
  consent_version: string;
  consent_at: string;
};

const ALLOWED_REQUEST_KEYS = new Set([
  "clientRequestId",
  "name",
  "phone",
  "contactMethod",
  "vehicleId",
  "vehicleLabel",
  "preferredDate",
  "preferredTime",
  "note",
  "source",
  "consent",
]);
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const HASH_PATTERN = /^[a-f0-9]{64}$/;
const PHONE_PATTERN = /^\+?[0-9][0-9 ()-]{6,31}$/;
const DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isAllowedValue<T extends string>(values: readonly T[], value: unknown): value is T {
  return typeof value === "string" && values.includes(value as T);
}

function cleanRequiredString(
  value: unknown,
  minimum: number,
  maximum: number,
): string | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim();
  if (normalized.length < minimum || normalized.length > maximum) return null;
  if (/[\u0000-\u001f\u007f]/u.test(normalized)) return null;
  return normalized;
}

function cleanOptionalString(value: unknown, maximum: number): string | null {
  if (value === undefined || value === null || value === "") return "";
  return cleanRequiredString(value, 1, maximum);
}

function cleanNote(value: unknown): string | null {
  if (value === undefined || value === null || value === "") return "";
  if (typeof value !== "string") return null;
  const normalized = value.trim();
  if (normalized.length > 2_000) return null;
  if (/[\u0000\u000b\u000c\u000e-\u001f\u007f]/u.test(normalized)) return null;
  return normalized;
}

function yerevanDate(now: Date): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Yerevan",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const part = (name: Intl.DateTimeFormatPartTypes): string =>
    parts.find((entry) => entry.type === name)?.value ?? "";
  return `${part("year")}-${part("month")}-${part("day")}`;
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

function cleanPreferredDate(value: unknown, now: Date): string | null | undefined {
  if (value === undefined || value === null || value === "") return null;
  if (typeof value !== "string" || !validCalendarDate(value)) return undefined;
  return value >= yerevanDate(now) ? value : undefined;
}

export function validateLeadSubmission(
  input: unknown,
  now: Date = new Date(),
): LeadValidationResult {
  if (!isRecord(input) || !Number.isFinite(now.getTime())) return { ok: false };
  if (Object.keys(input).some((key) => !ALLOWED_REQUEST_KEYS.has(key))) return { ok: false };

  const clientRequestId = typeof input.clientRequestId === "string"
    && UUID_PATTERN.test(input.clientRequestId)
    ? input.clientRequestId.toLowerCase()
    : null;
  const name = cleanRequiredString(input.name, 2, 100);
  const phone = cleanRequiredString(input.phone, 8, 32);
  const phoneDigits = phone?.replace(/\D/g, "") ?? "";
  const contactMethod = isAllowedValue(LEAD_CONTACT_METHODS, input.contactMethod)
    ? input.contactMethod
    : null;
  const vehicleId = input.vehicleId === undefined || input.vehicleId === null || input.vehicleId === ""
    ? null
    : cleanRequiredString(input.vehicleId, 1, 160);
  const vehicleLabel = cleanRequiredString(input.vehicleLabel, 1, 220);
  const preferredDate = cleanPreferredDate(input.preferredDate, now);
  const preferredTime = cleanOptionalString(input.preferredTime, 40);
  const note = cleanNote(input.note);
  const source = isAllowedValue(LEAD_SOURCES, input.source) ? input.source : null;

  if (
    clientRequestId === null
    || name === null
    || phone === null
    || !PHONE_PATTERN.test(phone)
    || phoneDigits.length < 8
    || phoneDigits.length > 15
    || contactMethod === null
    || (input.vehicleId !== undefined && input.vehicleId !== null && input.vehicleId !== "" && vehicleId === null)
    || vehicleLabel === null
    || preferredDate === undefined
    || preferredTime === null
    || !isAllowedValue(LEAD_PREFERRED_TIMES, preferredTime)
    || note === null
    || source === null
    || input.consent !== true
  ) {
    return { ok: false };
  }

  return {
    ok: true,
    value: {
      clientRequestId,
      name,
      phone,
      contactMethod,
      vehicleId,
      vehicleLabel,
      preferredDate,
      preferredTime,
      note,
      source,
      consent: true,
    },
  };
}

type WebCrypto = Pick<Crypto, "subtle">;

function bytesToHex(bytes: ArrayBuffer): string {
  return [...new Uint8Array(bytes)]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

export async function sha256Hex(value: string, webCrypto: WebCrypto): Promise<string> {
  const digest = await webCrypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return bytesToHex(digest);
}

export async function submissionHash(
  submission: ValidatedLeadSubmission,
  webCrypto: WebCrypto,
): Promise<string> {
  const canonical = JSON.stringify([
    "lead-submission-v1",
    submission.name,
    submission.phone,
    submission.contactMethod,
    submission.vehicleId,
    submission.vehicleLabel,
    submission.preferredDate,
    submission.preferredTime,
    submission.note,
    submission.source,
    submission.consent,
  ]);
  return sha256Hex(canonical, webCrypto);
}

export async function keyedAbuseFingerprint(
  request: Request,
  secret: string,
  webCrypto: WebCrypto,
): Promise<string> {
  const forwardedFor = request.headers.get("x-forwarded-for")?.split(",", 1)[0]?.trim();
  const address = (
    request.headers.get("cf-connecting-ip")?.trim()
    || request.headers.get("x-real-ip")?.trim()
    || forwardedFor
  )?.slice(0, 128).toLowerCase();
  const fallback = [
    request.headers.get("user-agent")?.slice(0, 256) ?? "",
    request.headers.get("accept-language")?.slice(0, 128) ?? "",
  ].join("|");
  const message = `lead-rate-v1|${address || `unknown|${fallback}`}`;
  const key = await webCrypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await webCrypto.subtle.sign("HMAC", key, new TextEncoder().encode(message));
  return bytesToHex(signature);
}

export class LeadSubmissionRepositoryError extends Error {
  readonly operation: string;
  readonly status: number | null;

  constructor(operation: string, status: number | null, cause?: unknown) {
    super(`Lead storage operation failed: ${operation}.`, cause === undefined ? undefined : { cause });
    this.name = "LeadSubmissionRepositoryError";
    this.operation = operation;
    this.status = status;
  }
}

export type SupabaseLeadSubmissionRepositoryOptions = {
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
    throw new LeadSubmissionRepositoryError("configuration", null, error);
  }
  if (
    (parsed.protocol !== "https:"
      && !(parsed.protocol === "http:" && ["127.0.0.1", "localhost"].includes(parsed.hostname)))
    || parsed.username
    || parsed.password
  ) {
    throw new LeadSubmissionRepositoryError("configuration", null);
  }
  return parsed.toString().replace(/\/$/, "");
}

function isLegacyJwtKey(value: string): boolean {
  return /^eyJ[A-Za-z0-9_-]*\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(value);
}

function asStoredLead(value: unknown): StoredLeadIdentity | null {
  const candidate = Array.isArray(value) ? value[0] : value;
  if (!isRecord(candidate)) return null;
  if (
    typeof candidate.id !== "string"
    || !UUID_PATTERN.test(candidate.id)
    || typeof candidate.created_at !== "string"
    || !Number.isFinite(Date.parse(candidate.created_at))
    || typeof candidate.submission_hash !== "string"
    || !HASH_PATTERN.test(candidate.submission_hash)
  ) {
    return null;
  }
  return {
    id: candidate.id.toLowerCase(),
    receivedAt: new Date(candidate.created_at).toISOString(),
    submissionHash: candidate.submission_hash,
  };
}

export class SupabaseLeadSubmissionRepository {
  readonly #url: string;
  readonly #serverKey: string;
  readonly #fetch: typeof fetch;
  readonly #timeoutMs: number;

  constructor(options: SupabaseLeadSubmissionRepositoryOptions) {
    this.#url = normalizeSupabaseUrl(options.url);
    this.#serverKey = options.serverKey;
    this.#fetch = options.fetch ?? fetch;
    this.#timeoutMs = options.timeoutMs ?? 8_000;
  }

  async findByClientRequestId(clientRequestId: string): Promise<StoredLeadIdentity | null> {
    const query = new URLSearchParams({
      select: "id,created_at,submission_hash",
      client_request_id: `eq.${clientRequestId}`,
      limit: "1",
    });
    const payload = await this.#request(
      `rest/v1/leads?${query}`,
      "find lead",
      { method: "GET" },
    );
    if (Array.isArray(payload) && payload.length === 0) return null;
    const lead = asStoredLead(payload);
    if (lead === null) throw new LeadSubmissionRepositoryError("parse lead", 200);
    return lead;
  }

  async consumeRateLimit(
    fingerprint: string,
    maximumRequests: number,
    windowSeconds: number,
  ): Promise<boolean> {
    const payload = await this.#request(
      "rest/v1/rpc/consume_lead_submission_limit",
      "consume rate limit",
      {
        method: "POST",
        body: JSON.stringify({
          p_fingerprint: fingerprint,
          p_limit: maximumRequests,
          p_window_seconds: windowSeconds,
        }),
      },
    );
    const result = Array.isArray(payload) ? payload[0] : payload;
    if (typeof result !== "boolean") {
      throw new LeadSubmissionRepositoryError("parse rate limit", 200);
    }
    return result;
  }

  async insert(row: NewLeadRow): Promise<StoredLeadIdentity | null> {
    const query = new URLSearchParams({
      on_conflict: "client_request_id",
      select: "id,created_at,submission_hash",
    });
    const payload = await this.#request(
      `rest/v1/leads?${query}`,
      "insert lead",
      {
        method: "POST",
        headers: { Prefer: "resolution=ignore-duplicates,return=representation" },
        body: JSON.stringify(row),
      },
    );
    if (Array.isArray(payload) && payload.length === 0) return null;
    const lead = asStoredLead(payload);
    if (lead === null) throw new LeadSubmissionRepositoryError("parse inserted lead", 200);
    return lead;
  }

  async #request(path: string, operation: string, init: RequestInit): Promise<unknown> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.#timeoutMs);
    const headers = new Headers(init.headers);
    headers.set("apikey", this.#serverKey);
    headers.set("Accept", "application/json");
    headers.set("Content-Type", "application/json");
    if (isLegacyJwtKey(this.#serverKey)) {
      headers.set("Authorization", `Bearer ${this.#serverKey}`);
    }

    try {
      const response = await this.#fetch(`${this.#url}/${path}`, {
        ...init,
        headers,
        signal: controller.signal,
      });
      if (!response.ok) {
        throw new LeadSubmissionRepositoryError(operation, response.status);
      }
      if (response.status === 204) return null;
      const text = await response.text();
      if (!text) return null;
      try {
        return JSON.parse(text) as unknown;
      } catch (error) {
        throw new LeadSubmissionRepositoryError(operation, response.status, error);
      }
    } catch (error) {
      if (error instanceof LeadSubmissionRepositoryError) throw error;
      throw new LeadSubmissionRepositoryError(operation, null, error);
    } finally {
      clearTimeout(timeoutId);
    }
  }
}
