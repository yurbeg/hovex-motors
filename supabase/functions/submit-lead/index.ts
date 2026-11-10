import {
  LeadSubmissionRepositoryError,
  SupabaseLeadSubmissionRepository,
  keyedAbuseFingerprint,
  submissionHash,
  validateLeadSubmission,
  type NewLeadRow,
  type StoredLeadIdentity,
} from "../_shared/lead-submission.ts";
import {
  resolveSupabaseSecretKeys,
  type SecretEnvironment,
} from "../_shared/motorapis-auth.ts";

const MAX_BODY_BYTES = 8_192;

export type SubmitLeadHandlerOptions = {
  env: SecretEnvironment;
  fetch?: typeof fetch;
  now?: () => Date;
  crypto?: Pick<Crypto, "subtle">;
};

class BodyTooLargeError extends Error {}

function clean(value: string | undefined): string | null {
  const normalized = value?.trim();
  return normalized || null;
}

function integerEnv(
  env: SecretEnvironment,
  name: string,
  fallback: number,
  minimum: number,
  maximum: number,
): number {
  const raw = clean(env.get(name));
  if (raw === null) return fallback;
  const value = Number(raw);
  return Number.isInteger(value) && value >= minimum && value <= maximum ? value : fallback;
}

function responseHeaders(extra?: HeadersInit): Headers {
  const headers = new Headers(extra);
  headers.set("Access-Control-Allow-Origin", "*");
  headers.set("Access-Control-Allow-Headers", "authorization, x-client-info, apikey, content-type");
  headers.set("Access-Control-Allow-Methods", "POST, OPTIONS");
  headers.set("Access-Control-Max-Age", "86400");
  headers.set("Cache-Control", "no-store");
  return headers;
}

function jsonResponse(body: unknown, status: number, extraHeaders?: HeadersInit): Response {
  const headers = responseHeaders(extraHeaders);
  headers.set("Content-Type", "application/json; charset=utf-8");
  return new Response(JSON.stringify(body), { status, headers });
}

async function readBodyWithLimit(request: Request, maximumBytes: number): Promise<string> {
  const contentLength = request.headers.get("content-length");
  if (contentLength !== null) {
    const parsed = Number(contentLength);
    if (Number.isFinite(parsed) && parsed > maximumBytes) throw new BodyTooLargeError();
  }
  if (request.body === null) return "";

  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > maximumBytes) {
        await reader.cancel();
        throw new BodyTooLargeError();
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }

  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
}

function sameSubmission(
  existing: StoredLeadIdentity,
  expectedHash: string,
): Response {
  if (existing.submissionHash !== expectedHash) {
    return jsonResponse({ error: "idempotency_conflict" }, 409);
  }
  return jsonResponse({
    id: existing.id,
    receivedAt: existing.receivedAt,
    duplicate: true,
  }, 200);
}

export function createSubmitLeadHandler(options: SubmitLeadHandlerOptions) {
  const runtimeFetch = options.fetch ?? fetch;
  const webCrypto = options.crypto ?? globalThis.crypto;

  return async (request: Request): Promise<Response> => {
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: responseHeaders() });
    }
    if (request.method !== "POST") {
      return jsonResponse({ error: "method_not_allowed" }, 405, { Allow: "POST, OPTIONS" });
    }
    const contentType = request.headers.get("content-type")?.split(";", 1)[0]?.trim().toLowerCase();
    if (contentType !== "application/json") {
      return jsonResponse({ error: "unsupported_media_type" }, 415);
    }

    let bodyText: string;
    try {
      bodyText = await readBodyWithLimit(request, MAX_BODY_BYTES);
    } catch (error) {
      if (error instanceof BodyTooLargeError) {
        return jsonResponse({ error: "request_too_large" }, 413);
      }
      return jsonResponse({ error: "invalid_request" }, 400);
    }

    let body: unknown;
    try {
      body = JSON.parse(bodyText) as unknown;
    } catch {
      return jsonResponse({ error: "invalid_request" }, 400);
    }

    const now = options.now?.() ?? new Date();
    const validated = validateLeadSubmission(body, now);
    if (!validated.ok) {
      return jsonResponse({ error: "invalid_request" }, 400);
    }

    const supabaseUrl = clean(options.env.get("SUPABASE_URL"));
    const serverKey = resolveSupabaseSecretKeys(options.env)[0] ?? null;
    const rateLimitSecret = clean(options.env.get("LEAD_RATE_LIMIT_SECRET"));
    const consentVersion = clean(options.env.get("LEAD_CONSENT_VERSION")) ?? "contact-consent-v1";
    if (
      supabaseUrl === null
      || serverKey === null
      || rateLimitSecret === null
      || rateLimitSecret.length < 32
      || consentVersion.length > 80
      || webCrypto?.subtle === undefined
    ) {
      return jsonResponse({ error: "server_not_configured" }, 503);
    }

    const maximumRequests = integerEnv(
      options.env,
      "LEAD_RATE_LIMIT_MAX_REQUESTS",
      5,
      1,
      100,
    );
    const windowSeconds = integerEnv(
      options.env,
      "LEAD_RATE_LIMIT_WINDOW_SECONDS",
      900,
      60,
      86_400,
    );
    const timeoutMs = integerEnv(
      options.env,
      "LEAD_STORAGE_TIMEOUT_MS",
      8_000,
      1_000,
      30_000,
    );

    try {
      const repository = new SupabaseLeadSubmissionRepository({
        url: supabaseUrl,
        serverKey,
        fetch: runtimeFetch,
        timeoutMs,
      });
      const hash = await submissionHash(validated.value, webCrypto);
      const fingerprint = await keyedAbuseFingerprint(request, rateLimitSecret, webCrypto);
      const allowed = await repository.consumeRateLimit(
        fingerprint,
        maximumRequests,
        windowSeconds,
      );
      if (!allowed) {
        return jsonResponse(
          { error: "rate_limited" },
          429,
          { "Retry-After": String(windowSeconds) },
        );
      }

      // Rate-limit before any lead-table lookup so blocked callers cannot use
      // idempotency checks to create unbounded database read traffic.
      const existing = await repository.findByClientRequestId(validated.value.clientRequestId);
      if (existing !== null) return sameSubmission(existing, hash);

      const row: NewLeadRow = {
        client_request_id: validated.value.clientRequestId,
        submission_hash: hash,
        name: validated.value.name,
        phone: validated.value.phone,
        contact_method: validated.value.contactMethod,
        vehicle_id: validated.value.vehicleId,
        vehicle_label: validated.value.vehicleLabel,
        preferred_date: validated.value.preferredDate,
        preferred_time: validated.value.preferredTime,
        note: validated.value.note,
        source: validated.value.source,
        consent_version: consentVersion,
        consent_at: now.toISOString(),
      };
      const inserted = await repository.insert(row);
      if (inserted !== null) {
        if (inserted.submissionHash !== hash) {
          throw new LeadSubmissionRepositoryError("verify inserted lead", 200);
        }
        return jsonResponse({
          id: inserted.id,
          receivedAt: inserted.receivedAt,
          duplicate: false,
        }, 201);
      }

      // A concurrent request may have inserted the same idempotency key after
      // the initial read. Resolve it to the same deterministic response.
      const concurrent = await repository.findByClientRequestId(validated.value.clientRequestId);
      if (concurrent === null) {
        throw new LeadSubmissionRepositoryError("resolve concurrent lead", 200);
      }
      return sameSubmission(concurrent, hash);
    } catch (error) {
      if (error instanceof LeadSubmissionRepositoryError) {
        return jsonResponse({ error: "lead_storage_unavailable" }, 503);
      }
      return jsonResponse({ error: "submission_failed" }, 500);
    }
  };
}

type DenoRuntime = {
  env: SecretEnvironment;
  serve(handler: (request: Request) => Response | Promise<Response>): void;
};

const denoRuntime = (globalThis as typeof globalThis & { Deno?: DenoRuntime }).Deno;
if (denoRuntime) {
  denoRuntime.serve(createSubmitLeadHandler({ env: denoRuntime.env }));
}
