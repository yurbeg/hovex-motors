import assert from "node:assert/strict";
import { webcrypto } from "node:crypto";
import test from "node:test";
import {
  keyedAbuseFingerprint,
  submissionHash,
  validateLeadSubmission,
} from "../supabase/functions/_shared/lead-submission";
import { createSubmitLeadHandler } from "../supabase/functions/submit-lead/index";

const runtimeCrypto = webcrypto as unknown as Crypto;
const fixedNow = new Date("2026-11-10T08:30:00.000Z");
const clientRequestId = "018f47e1-7b8a-7c3e-8f95-123456789abc";
const storedLeadId = "31b18200-1ee5-4f14-a697-43e09303a599";

const validPayload = {
  clientRequestId,
  name: "  Անի Մկրտչյան  ",
  phone: " +374 99 123 456 ",
  contactMethod: "whatsapp",
  requestKind: "full_calculation",
  vehicleId: "vehicle-42",
  vehicleLabel: "2024 Toyota RAV4",
  lotId: " 70010001 ",
  vin: " 1HGCM82633A004352 ",
  preferredDate: "2026-11-11",
  preferredTime: "13:00–16:00",
  note: "  Խնդրում եմ զանգահարել աշխատանքային ժամերին։  ",
  source: "website",
  consent: true,
};

function environment(overrides: Record<string, string | undefined> = {}) {
  const values: Record<string, string | undefined> = {
    SUPABASE_URL: "https://project.supabase.co",
    SUPABASE_SECRET_KEY: "sb_secret_server_only",
    LEAD_RATE_LIMIT_SECRET: "rate-limit-secret-at-least-thirty-two-characters",
    ...overrides,
  };
  return { get: (name: string) => values[name] };
}

function json(value: unknown, status = 200): Response {
  return new Response(JSON.stringify(value), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

type FetchCall = { url: string; init?: RequestInit };

function sequenceFetch(responses: Response[]): { fetch: typeof fetch; calls: FetchCall[] } {
  const calls: FetchCall[] = [];
  const mock = async (input: URL | RequestInfo, init?: RequestInit): Promise<Response> => {
    calls.push({ url: String(input), init });
    const response = responses.shift();
    if (response === undefined) throw new Error("Unexpected fetch call");
    return response;
  };
  return { fetch: mock as typeof fetch, calls };
}

function request(payload: unknown = validPayload, headers: HeadersInit = {}): Request {
  return new Request("https://edge.example/functions/v1/submit-lead", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Forwarded-For": "203.0.113.77, 10.0.0.2",
      ...headers,
    },
    body: JSON.stringify(payload),
  });
}

function handlerWith(mockFetch: typeof fetch) {
  return createSubmitLeadHandler({
    env: environment(),
    fetch: mockFetch,
    now: () => fixedNow,
    crypto: runtimeCrypto,
  });
}

test("validation normalizes the public payload and rejects client-controlled fields", () => {
  const valid = validateLeadSubmission(validPayload, fixedNow);
  assert.equal(valid.ok, true);
  if (!valid.ok) return;
  assert.equal(valid.value.name, "Անի Մկրտչյան");
  assert.equal(valid.value.phone, "+374 99 123 456");
  assert.equal(valid.value.note, "Խնդրում եմ զանգահարել աշխատանքային ժամերին։");
  assert.equal(valid.value.requestKind, "full_calculation");
  assert.equal(valid.value.lotId, "70010001");
  assert.equal(valid.value.vin, "1HGCM82633A004352");

  const {
    requestKind: _requestKind,
    lotId: _lotId,
    vin: _vin,
    ...legacyPayload
  } = validPayload;
  const legacy = validateLeadSubmission(legacyPayload, fixedNow);
  assert.equal(legacy.ok, true);
  if (legacy.ok) {
    assert.equal(legacy.value.requestKind, "consultation");
    assert.equal(legacy.value.lotId, null);
    assert.equal(legacy.value.vin, null);
  }

  const invalidPayloads = [
    { ...validPayload, consent: false },
    { ...validPayload, contactMethod: "Telegram" },
    { ...validPayload, requestKind: "purchase" },
    { ...validPayload, source: "admin" },
    { ...validPayload, phone: "+374 1" },
    { ...validPayload, preferredDate: "2026-11-09" },
    { ...validPayload, preferredDate: "2026-02-30" },
    { ...validPayload, preferredTime: "midnight" },
    { ...validPayload, lotId: "x".repeat(161) },
    { ...validPayload, vin: "VIN\u0000VALUE" },
    { ...validPayload, status: "closed" },
  ];
  for (const payload of invalidPayloads) {
    assert.deepEqual(validateLeadSubmission(payload, fixedNow), { ok: false });
  }
});

test("anonymous preflight works while methods, media type and oversized bodies fail early", async () => {
  let networkCalls = 0;
  const handler = createSubmitLeadHandler({
    env: environment(),
    fetch: (async () => {
      networkCalls += 1;
      throw new Error("network must not be called");
    }) as typeof fetch,
    now: () => fixedNow,
    crypto: runtimeCrypto,
  });

  const preflight = await handler(new Request("https://edge.example/submit-lead", {
    method: "OPTIONS",
  }));
  const get = await handler(new Request("https://edge.example/submit-lead"));
  const wrongType = await handler(new Request("https://edge.example/submit-lead", {
    method: "POST",
    body: "{}",
  }));
  const oversized = await handler(new Request("https://edge.example/submit-lead", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ padding: "x".repeat(9_000) }),
  }));

  assert.equal(preflight.status, 204);
  assert.equal(preflight.headers.get("access-control-allow-origin"), "*");
  assert.equal(get.status, 405);
  assert.equal(wrongType.status, 415);
  assert.equal(oversized.status, 413);
  assert.equal(networkCalls, 0);
});

test("invalid submissions and missing abuse secret fail before storage", async () => {
  let networkCalls = 0;
  const mockFetch = (async () => {
    networkCalls += 1;
    throw new Error("network must not be called");
  }) as typeof fetch;
  const invalidHandler = createSubmitLeadHandler({
    env: environment(),
    fetch: mockFetch,
    now: () => fixedNow,
    crypto: runtimeCrypto,
  });
  const unconfiguredHandler = createSubmitLeadHandler({
    env: environment({ LEAD_RATE_LIMIT_SECRET: undefined }),
    fetch: mockFetch,
    now: () => fixedNow,
    crypto: runtimeCrypto,
  });

  const invalid = await invalidHandler(request({ ...validPayload, consent: false }));
  const unconfigured = await unconfiguredHandler(request());

  assert.equal(invalid.status, 400);
  assert.deepEqual(await invalid.json(), { error: "invalid_request" });
  assert.equal(unconfigured.status, 503);
  assert.deepEqual(await unconfigured.json(), { error: "server_not_configured" });
  assert.equal(networkCalls, 0);
});

test("a new lead is rate checked and inserted with a server-only whitelist", async () => {
  const storedRow = {
    id: storedLeadId,
    created_at: "2026-11-10T08:30:01.000Z",
    submission_hash: "placeholder",
    submission_hash_version: 2,
  };
  const calls: FetchCall[] = [];
  const dynamicFetch = (async (input: URL | RequestInfo, init?: RequestInit) => {
    calls.push({ url: String(input), init });
    if (calls.length === 1) return json(true);
    if (calls.length === 2) return json([]);
    const inserted = JSON.parse(String(init?.body)) as { submission_hash: string };
    return json([{ ...storedRow, submission_hash: inserted.submission_hash }], 201);
  }) as typeof fetch;
  const dynamicHandler = handlerWith(dynamicFetch);
  const response = await dynamicHandler(request());

  assert.equal(response.status, 201);
  assert.deepEqual(await response.json(), {
    id: storedLeadId,
    receivedAt: "2026-11-10T08:30:01.000Z",
    duplicate: false,
  });
  assert.equal(calls.length, 3);
  assert.match(calls[0].url, /\/rest\/v1\/rpc\/consume_lead_submission_limit$/);
  assert.match(calls[1].url, /\/rest\/v1\/leads\?/);
  assert.match(calls[2].url, /on_conflict=client_request_id/);

  const rateBody = JSON.parse(String(calls[0].init?.body)) as Record<string, unknown>;
  assert.match(String(rateBody.p_fingerprint), /^[a-f0-9]{64}$/);
  assert.equal(JSON.stringify(rateBody).includes("203.0.113.77"), false);
  const insertBody = JSON.parse(String(calls[2].init?.body)) as Record<string, unknown>;
  assert.deepEqual(Object.keys(insertBody).sort(), [
    "client_request_id",
    "consent_at",
    "consent_version",
    "contact_method",
    "lot_id",
    "name",
    "note",
    "phone",
    "preferred_date",
    "preferred_time",
    "request_kind",
    "source",
    "submission_hash",
    "submission_hash_version",
    "vehicle_id",
    "vehicle_label",
    "vin",
  ]);
  assert.equal(insertBody.consent_version, "contact-consent-v1");
  assert.equal(insertBody.consent_at, fixedNow.toISOString());
  assert.equal(insertBody.request_kind, "full_calculation");
  assert.equal(insertBody.lot_id, "70010001");
  assert.equal(insertBody.vin, "1HGCM82633A004352");
  assert.equal(insertBody.submission_hash_version, 2);
  assert.match(String(insertBody.submission_hash), /^[a-f0-9]{64}$/);
  assert.equal("status" in insertBody, false);
  assert.equal("id" in insertBody, false);
});

test("same-payload retries return the stored receipt after abuse control", async () => {
  const validated = validateLeadSubmission(validPayload, fixedNow);
  assert.equal(validated.ok, true);
  if (!validated.ok) return;
  const hash = await submissionHash(validated.value, runtimeCrypto);
  const { fetch: mockFetch, calls } = sequenceFetch([
    json(true),
    json([{
      id: storedLeadId,
      created_at: "2026-11-10T08:30:01.000Z",
      submission_hash: hash,
      submission_hash_version: 2,
    }]),
  ]);

  const response = await handlerWith(mockFetch)(request());

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), {
    id: storedLeadId,
    receivedAt: "2026-11-10T08:30:01.000Z",
    duplicate: true,
  });
  assert.equal(calls.length, 2);
  assert.match(calls[0].url, /consume_lead_submission_limit/);
});

test("legacy v1 rows keep their original idempotency hash contract", async () => {
  const validated = validateLeadSubmission(validPayload, fixedNow);
  assert.equal(validated.ok, true);
  if (!validated.ok) return;
  const legacyHash = await submissionHash(validated.value, runtimeCrypto, 1);
  assert.equal(
    legacyHash,
    "708e3e965d6f4d0e4380b68a809938a68cfe0cf90768c7e9a0500e2b4c57636e",
  );
  const { fetch: mockFetch } = sequenceFetch([
    json(true),
    json([{
      id: storedLeadId,
      created_at: "2026-11-10T08:30:01.000Z",
      submission_hash: legacyHash,
      submission_hash_version: 1,
    }]),
  ]);

  const response = await handlerWith(mockFetch)(request());

  assert.equal(response.status, 200);
  assert.equal((await response.json() as { duplicate: boolean }).duplicate, true);
});

test("v2 idempotency rejects changed request-kind or vehicle context", async () => {
  const validated = validateLeadSubmission(validPayload, fixedNow);
  assert.equal(validated.ok, true);
  if (!validated.ok) return;
  const hash = await submissionHash(validated.value, runtimeCrypto, 2);
  for (const changed of [
    { lotId: "different-lot" },
    { vin: "JH4KA9650MC012345" },
    { requestKind: "consultation" },
  ]) {
    const { fetch: mockFetch } = sequenceFetch([
      json(true),
      json([{
        id: storedLeadId,
        created_at: "2026-11-10T08:30:01.000Z",
        submission_hash: hash,
        submission_hash_version: 2,
      }]),
    ]);

    const response = await handlerWith(mockFetch)(request({
      ...validPayload,
      ...changed,
    }));

    assert.equal(response.status, 409);
    assert.deepEqual(await response.json(), { error: "idempotency_conflict" });
  }
});

test("a changed payload under an existing idempotency key is rejected", async () => {
  const { fetch: mockFetch, calls } = sequenceFetch([
    json(true),
    json([{
      id: storedLeadId,
      created_at: "2026-11-10T08:30:01.000Z",
      submission_hash: "f".repeat(64),
      submission_hash_version: 2,
    }]),
  ]);

  const response = await handlerWith(mockFetch)(request());

  assert.equal(response.status, 409);
  assert.deepEqual(await response.json(), { error: "idempotency_conflict" });
  assert.equal(calls.length, 2);
});

test("a concurrent duplicate resolves to the original receipt", async () => {
  const validated = validateLeadSubmission(validPayload, fixedNow);
  assert.equal(validated.ok, true);
  if (!validated.ok) return;
  const hash = await submissionHash(validated.value, runtimeCrypto);
  const { fetch: mockFetch, calls } = sequenceFetch([
    json(true),
    json([]),
    json([], 201),
    json([{
      id: storedLeadId,
      created_at: "2026-11-10T08:30:01.000Z",
      submission_hash: hash,
      submission_hash_version: 2,
    }]),
  ]);

  const response = await handlerWith(mockFetch)(request());

  assert.equal(response.status, 200);
  assert.equal((await response.json() as { duplicate: boolean }).duplicate, true);
  assert.equal(calls.length, 4);
});

test("rate limiting and storage failures expose no submitted PII or server secret", async () => {
  const rateLimitedFetch = sequenceFetch([json(false)]);
  const limited = await handlerWith(rateLimitedFetch.fetch)(request());
  assert.equal(limited.status, 429);
  assert.equal(limited.headers.get("retry-after"), "900");
  assert.deepEqual(await limited.json(), { error: "rate_limited" });

  const storageFetch = sequenceFetch([
    json(true),
    json({ internal: "db-secret" }, 500),
  ]);
  const failed = await handlerWith(storageFetch.fetch)(request());
  const failedBody = await failed.text();
  assert.equal(failed.status, 503);
  assert.equal(failedBody.includes("Անի"), false);
  assert.equal(failedBody.includes("sb_secret_server_only"), false);
  assert.equal(failedBody.includes("db-secret"), false);
});

test("abuse fingerprints are keyed, stable and never equal the raw address", async () => {
  const sourceRequest = request();
  const first = await keyedAbuseFingerprint(
    sourceRequest,
    "first-secret-that-is-at-least-thirty-two-characters",
    runtimeCrypto,
  );
  const repeated = await keyedAbuseFingerprint(
    sourceRequest,
    "first-secret-that-is-at-least-thirty-two-characters",
    runtimeCrypto,
  );
  const rotated = await keyedAbuseFingerprint(
    sourceRequest,
    "second-secret-that-is-at-least-thirty-two-characters",
    runtimeCrypto,
  );

  assert.match(first, /^[a-f0-9]{64}$/);
  assert.equal(first, repeated);
  assert.notEqual(first, rotated);
  assert.notEqual(first, "203.0.113.77");
});
