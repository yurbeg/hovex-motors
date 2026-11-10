import assert from "node:assert/strict";
import test from "node:test";
import {
  SupabaseLeadNotificationQueue,
  TelegramDeliveryError,
  TelegramLeadNotificationSender,
  escapeTelegramHtml,
  formatTelegramLeadMessage,
  normalizeAdminAppUrl,
  parseLeadNotificationJob,
  processLeadNotificationJobs,
  type LeadNotificationJob,
  type LeadNotificationQueue,
} from "../supabase/functions/_shared/lead-notifications";
import { createProcessLeadNotificationsHandler } from "../supabase/functions/process-lead-notifications/index";

const botToken = "123456789:ABCDEFGHIJKLMNOPQRSTUVWXYZ_abcdefghij";
const serverKey = "sb_secret_server_only";
const jobRow = {
  job_id: "31b18200-1ee5-4f14-a697-43e09303a599",
  lease_token: "21b18200-1ee5-4f14-a697-43e09303a598",
  channel: "telegram",
  attempt_count: 1,
  lead_id: "11b18200-1ee5-4f14-a697-43e09303a597",
  name: "Անի Մկրտչյան",
  phone: "+374 99 123 456",
  contact_method: "whatsapp",
  request_kind: "full_calculation",
  vehicle_label: "2024 Toyota RAV4",
  lot_id: "70010001",
  vin: "1HGCM82633A004352",
  preferred_date: "2026-11-11",
  preferred_time: "13:00–16:00",
  source: "auction-catalog",
  lead_created_at: "2026-11-10T08:30:01.000Z",
  assigned_manager_name: "Արամ",
};

function json(value: unknown, status = 200, headers: HeadersInit = {}): Response {
  return new Response(JSON.stringify(value), {
    status,
    headers: { "Content-Type": "application/json", ...headers },
  });
}

function environment(overrides: Record<string, string | undefined> = {}) {
  const values: Record<string, string | undefined> = {
    SUPABASE_URL: "https://project.supabase.co",
    SUPABASE_SECRET_KEY: serverKey,
    TELEGRAM_BOT_TOKEN: botToken,
    TELEGRAM_CHAT_ID: "-1001234567890",
    ADMIN_APP_URL: "https://hovex.example/admin/requests",
    ...overrides,
  };
  return { get: (name: string) => values[name] };
}

function workerRequest(headers: HeadersInit = { apikey: serverKey }): Request {
  return new Request("https://edge.example/process-lead-notifications", {
    method: "POST",
    headers,
    body: "{}",
  });
}

test("claimed job parser accepts the RPC contract and rejects unsafe rows", () => {
  assert.deepEqual(parseLeadNotificationJob(jobRow), {
    jobId: jobRow.job_id,
    leaseToken: jobRow.lease_token,
    channel: "telegram",
    attemptCount: 1,
    leadId: jobRow.lead_id,
    name: jobRow.name,
    phone: jobRow.phone,
    contactMethod: jobRow.contact_method,
    requestKind: jobRow.request_kind,
    vehicleLabel: jobRow.vehicle_label,
    lotId: jobRow.lot_id,
    vin: jobRow.vin,
    preferredDate: jobRow.preferred_date,
    preferredTime: jobRow.preferred_time,
    source: jobRow.source,
    createdAt: jobRow.lead_created_at,
    assignedManagerName: jobRow.assigned_manager_name,
  });
  assert.equal(parseLeadNotificationJob({ ...jobRow, channel: "email" }), null);
  assert.equal(parseLeadNotificationJob({ ...jobRow, lease_token: "not-a-uuid" }), null);
  assert.equal(parseLeadNotificationJob({ ...jobRow, name: "<script>\u0000" }), null);
  assert.equal(parseLeadNotificationJob({ ...jobRow, lead_created_at: "yesterday" }), null);
});

test("Telegram formatter escapes customer data, includes operational context, and omits notes", () => {
  const parsed = parseLeadNotificationJob({
    ...jobRow,
    name: "Անի <admin> & ընկերներ",
    vehicle_label: "Toyota \"RAV4\" > Hybrid",
  });
  assert.ok(parsed);
  const message = formatTelegramLeadMessage(
    parsed,
    "https://hovex.example/admin/requests?filter=new&view=all",
  );

  assert.match(message, /Անի &lt;admin&gt; &amp; ընկերներ/);
  assert.match(message, /Toyota &quot;RAV4&quot; &gt; Hybrid/);
  assert.match(message, /Ամբողջական հաշվարկ/);
  assert.match(message, /70010001/);
  assert.match(message, /1HGCM82633A004352/);
  assert.match(message, /Արամ/);
  assert.match(message, /tel:\+37499123456/);
  assert.match(message, /filter=new&amp;view=all/);
  assert.equal(message.includes("<admin>"), false);
  assert.equal(message.toLowerCase().includes("note"), false);
  assert.equal(message.includes("մեկնաբան"), false);
  assert.equal(escapeTelegramHtml("<&>\"'"), "&lt;&amp;&gt;&quot;&#39;");
});

test("admin URL accepts HTTPS and local HTTP but rejects credentials and unsafe schemes", () => {
  assert.equal(
    normalizeAdminAppUrl(" https://hovex.example/admin/requests/ "),
    "https://hovex.example/admin/requests",
  );
  assert.equal(normalizeAdminAppUrl("http://localhost:5173/admin"), "http://localhost:5173/admin");
  assert.equal(normalizeAdminAppUrl("javascript:alert(1)"), null);
  assert.equal(normalizeAdminAppUrl("https://user:pass@hovex.example/admin"), null);
});

test("Telegram sender posts escaped HTML and returns the provider message id", async () => {
  const parsed = parseLeadNotificationJob(jobRow);
  assert.ok(parsed);
  const requestBodies: Record<string, unknown>[] = [];
  const sender = new TelegramLeadNotificationSender({
    botToken,
    chatId: "-1001234567890",
    messageThreadId: 42,
    adminAppUrl: "https://hovex.example/admin/requests",
    fetch: (async (_input, init) => {
      requestBodies.push(JSON.parse(String(init?.body)) as Record<string, unknown>);
      return json({ ok: true, result: { message_id: 987 } });
    }) as typeof fetch,
  });

  assert.equal(await sender.send(parsed), "987");
  const requestBody = requestBodies[0];
  assert.ok(requestBody);
  assert.equal(requestBody?.chat_id, "-1001234567890");
  assert.equal(requestBody?.message_thread_id, 42);
  assert.equal(requestBody?.parse_mode, "HTML");
  assert.equal((requestBody?.link_preview_options as { is_disabled?: boolean }).is_disabled, true);
  assert.equal(String(requestBody?.text).includes(jobRow.name), true);
});

test("Telegram sender exposes safe retry metadata for rate limits and permanent 4xx errors", async () => {
  const parsed = parseLeadNotificationJob(jobRow);
  assert.ok(parsed);
  const rateLimited = new TelegramLeadNotificationSender({
    botToken,
    chatId: "-1001234567890",
    fetch: (async () => json({
      ok: false,
      error_code: 429,
      description: `secret ${botToken}`,
      parameters: { retry_after: 17 },
    }, 429)) as typeof fetch,
  });
  const forbidden = new TelegramLeadNotificationSender({
    botToken,
    chatId: "-1001234567890",
    fetch: (async () => json({ ok: false, error_code: 403, description: "bot was blocked" }, 403)) as typeof fetch,
  });

  await assert.rejects(rateLimited.send(parsed), (error: unknown) => {
    assert.ok(error instanceof TelegramDeliveryError);
    assert.equal(error.retryable, true);
    assert.equal(error.retryAfterSeconds, 17);
    assert.equal(error.errorCode, "telegram_rate_limited");
    assert.equal(error.safeError.includes(botToken), false);
    return true;
  });
  await assert.rejects(forbidden.send(parsed), (error: unknown) => {
    assert.ok(error instanceof TelegramDeliveryError);
    assert.equal(error.retryable, false);
    assert.equal(error.errorCode, "telegram_http_403");
    return true;
  });
});

test("Telegram sender classifies network exceptions and 5xx responses as retryable", async () => {
  const parsed = parseLeadNotificationJob(jobRow);
  assert.ok(parsed);
  const networkFailure = new TelegramLeadNotificationSender({
    botToken,
    chatId: "-1001234567890",
    fetch: (async () => {
      throw new Error(`socket failed near ${botToken}`);
    }) as typeof fetch,
  });
  const providerFailure = new TelegramLeadNotificationSender({
    botToken,
    chatId: "-1001234567890",
    fetch: (async () => json({
      ok: false,
      error_code: 502,
      description: `upstream included ${botToken}`,
    }, 502)) as typeof fetch,
  });

  await assert.rejects(networkFailure.send(parsed), (error: unknown) => {
    assert.ok(error instanceof TelegramDeliveryError);
    assert.equal(error.retryable, true);
    assert.equal(error.errorCode, "telegram_network_error");
    assert.equal(error.safeError.includes(botToken), false);
    return true;
  });
  await assert.rejects(providerFailure.send(parsed), (error: unknown) => {
    assert.ok(error instanceof TelegramDeliveryError);
    assert.equal(error.retryable, true);
    assert.equal(error.errorCode, "telegram_http_502");
    assert.equal(error.safeError.includes(botToken), false);
    return true;
  });
});

test("queue adapter uses service RPCs and exact lease-safe parameter names", async () => {
  const calls: Array<{ url: string; headers: Headers; body: Record<string, unknown> }> = [];
  const responses = [json([jobRow]), json(true), json("retry")];
  const queue = new SupabaseLeadNotificationQueue({
    url: "https://project.supabase.co",
    serverKey,
    fetch: (async (input, init) => {
      calls.push({
        url: String(input),
        headers: new Headers(init?.headers),
        body: JSON.parse(String(init?.body)) as Record<string, unknown>,
      });
      const response = responses.shift();
      if (!response) throw new Error("unexpected fetch");
      return response;
    }) as typeof fetch,
  });

  const jobs = await queue.claim(5, 120);
  await queue.complete(jobs[0].jobId, jobs[0].leaseToken, "987");
  const failureOutcome = await queue.fail(jobs[0].jobId, jobs[0].leaseToken, {
    retryable: true,
    retryAfterSeconds: 17,
    errorCode: "telegram_rate_limited",
    safeError: "Telegram rate limit was reached.",
  });

  assert.equal(failureOutcome, "retry");
  assert.match(calls[0].url, /rpc\/claim_lead_notification_jobs$/);
  assert.deepEqual(calls[0].body, { p_limit: 5, p_lease_seconds: 120 });
  assert.deepEqual(calls[1].body, {
    p_job_id: jobRow.job_id,
    p_lease_token: jobRow.lease_token,
    p_provider_message_id: "987",
  });
  assert.deepEqual(calls[2].body, {
    p_job_id: jobRow.job_id,
    p_lease_token: jobRow.lease_token,
    p_retryable: true,
    p_retry_after_seconds: 17,
    p_error_code: "telegram_rate_limited",
    p_safe_error: "Telegram rate limit was reached.",
  });
  assert.equal(calls[0].headers.get("apikey"), serverKey);
  assert.equal(calls[0].headers.has("authorization"), false);
});

test("processor never marks a Telegram-confirmed job failed when completion acknowledgement fails", async () => {
  const parsed = parseLeadNotificationJob(jobRow);
  assert.ok(parsed);
  let failCalls = 0;
  const queue: LeadNotificationQueue = {
    claim: async () => [parsed],
    complete: async () => {
      throw new Error("database unavailable");
    },
    fail: async () => {
      failCalls += 1;
      return "retry";
    },
  };
  const result = await processLeadNotificationJobs({
    queue,
    sender: { send: async () => "987" },
    limit: 5,
    leaseSeconds: 120,
  });

  assert.deepEqual(result, {
    claimed: 1,
    delivered: 0,
    retryScheduled: 0,
    deadLettered: 0,
    acknowledgementErrors: 1,
  });
  assert.equal(failCalls, 0);
});

test("processor supplies exponential retry delay when a network failure has no provider delay", async () => {
  const parsed = parseLeadNotificationJob(jobRow);
  assert.ok(parsed);
  const savedFailures: Parameters<LeadNotificationQueue["fail"]>[2][] = [];
  const queue: LeadNotificationQueue = {
    claim: async () => [parsed],
    complete: async () => undefined,
    fail: async (_jobId, _leaseToken, failure) => {
      savedFailures.push(failure);
      return "retry";
    },
  };
  const result = await processLeadNotificationJobs({
    queue,
    sender: {
      send: async () => {
        throw new TelegramDeliveryError({
          retryable: true,
          retryAfterSeconds: null,
          errorCode: "telegram_network_error",
          safeError: "Telegram could not be reached.",
        });
      },
    },
    limit: 5,
    leaseSeconds: 120,
  });

  assert.equal(result.retryScheduled, 1);
  const savedFailure = savedFailures[0];
  assert.ok(savedFailure);
  assert.equal(savedFailure?.retryable, true);
  assert.equal(savedFailure?.retryAfterSeconds, 60);
  assert.equal(savedFailure?.errorCode, "telegram_network_error");
});

test("worker rejects public or bearer-only calls and invalid config before any network request", async () => {
  let calls = 0;
  const noNetwork = (async () => {
    calls += 1;
    throw new Error("network must not be called");
  }) as typeof fetch;
  const handler = createProcessLeadNotificationsHandler({ env: environment(), fetch: noNetwork });
  const invalidConfigHandler = createProcessLeadNotificationsHandler({
    env: environment({ TELEGRAM_BOT_TOKEN: "invalid token" }),
    fetch: noNetwork,
  });

  const publicResponse = await handler(workerRequest({ apikey: "public-key" }));
  const bearerResponse = await handler(workerRequest({ Authorization: `Bearer ${serverKey}` }));
  const invalidConfigResponse = await invalidConfigHandler(workerRequest());

  assert.equal(publicResponse.status, 401);
  assert.equal(bearerResponse.status, 401);
  assert.equal(invalidConfigResponse.status, 503);
  assert.equal(calls, 0);
});

test("worker rejects a batch timeout envelope that can outlive its lease before claiming jobs", async () => {
  let calls = 0;
  const handler = createProcessLeadNotificationsHandler({
    env: environment({
      LEAD_NOTIFICATION_BATCH_SIZE: "20",
      TELEGRAM_TIMEOUT_MS: "30000",
      LEAD_NOTIFICATION_STORAGE_TIMEOUT_MS: "30000",
      LEAD_NOTIFICATION_LEASE_SECONDS: "30",
    }),
    fetch: (async () => {
      calls += 1;
      throw new Error("unsafe configuration must fail before network access");
    }) as typeof fetch,
  });

  const response = await handler(workerRequest());

  assert.equal(response.status, 503);
  assert.deepEqual(await response.json(), { error: "server_not_configured" });
  assert.equal(calls, 0);
});

test("worker claims, sends, and durably completes a Telegram notification", async () => {
  const calls: Array<{ url: string; body: Record<string, unknown> }> = [];
  const runtimeFetch = (async (input, init) => {
    const url = String(input);
    const body = JSON.parse(String(init?.body)) as Record<string, unknown>;
    calls.push({ url, body });
    if (url.endsWith("/rpc/claim_lead_notification_jobs")) return json([jobRow]);
    if (url.includes("api.telegram.org")) return json({ ok: true, result: { message_id: 987 } });
    if (url.endsWith("/rpc/complete_lead_notification_job")) return json(true);
    throw new Error("unexpected fetch");
  }) as typeof fetch;
  const handler = createProcessLeadNotificationsHandler({ env: environment(), fetch: runtimeFetch });

  const response = await handler(workerRequest());

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), {
    claimed: 1,
    delivered: 1,
    retryScheduled: 0,
    deadLettered: 0,
    acknowledgementErrors: 0,
  });
  assert.equal(calls.length, 3);
  assert.equal(calls[2].body.p_provider_message_id, "987");
  assert.equal(String(calls[1].body.text).includes("մեկնաբան"), false);
});

test("worker persists Telegram 429 retry instructions and dead-letters permanent errors", async () => {
  for (const scenario of [
    {
      telegram: json({ ok: false, error_code: 429, parameters: { retry_after: 23 } }, 429),
      failureResult: "retry",
      expected: { retryScheduled: 1, deadLettered: 0, retryable: true, retryAfter: 23 },
    },
    {
      telegram: json({ ok: false, error_code: 502, description: "upstream unavailable" }, 502),
      failureResult: "retry",
      expected: { retryScheduled: 1, deadLettered: 0, retryable: true, retryAfter: 60 },
    },
    {
      telegram: json({ ok: false, error_code: 400, description: "bad request" }, 400),
      failureResult: "dead",
      expected: { retryScheduled: 0, deadLettered: 1, retryable: false, retryAfter: null },
    },
  ] as const) {
    const failureBodies: Record<string, unknown>[] = [];
    const runtimeFetch = (async (input, init) => {
      const url = String(input);
      if (url.endsWith("/rpc/claim_lead_notification_jobs")) return json([jobRow]);
      if (url.includes("api.telegram.org")) return scenario.telegram;
      if (url.endsWith("/rpc/fail_lead_notification_job")) {
        failureBodies.push(JSON.parse(String(init?.body)) as Record<string, unknown>);
        return json(scenario.failureResult);
      }
      throw new Error("unexpected fetch");
    }) as typeof fetch;
    const response = await createProcessLeadNotificationsHandler({
      env: environment(),
      fetch: runtimeFetch,
    })(workerRequest());
    const result = await response.json() as Record<string, unknown>;

    assert.equal(response.status, 200);
    assert.equal(result.retryScheduled, scenario.expected.retryScheduled);
    assert.equal(result.deadLettered, scenario.expected.deadLettered);
    const failureBody = failureBodies[0];
    assert.ok(failureBody);
    assert.equal(failureBody?.p_retryable, scenario.expected.retryable);
    assert.equal(failureBody?.p_retry_after_seconds, scenario.expected.retryAfter);
  }
});

test("worker reports storage acknowledgement failure without exposing credentials", async () => {
  const runtimeFetch = (async (input) => {
    const url = String(input);
    if (url.endsWith("/rpc/claim_lead_notification_jobs")) return json([jobRow]);
    if (url.includes("api.telegram.org")) return json({ ok: true, result: { message_id: 987 } });
    if (url.endsWith("/rpc/complete_lead_notification_job")) {
      return json({ message: `do not expose ${botToken} or ${serverKey}` }, 503);
    }
    throw new Error("unexpected fetch");
  }) as typeof fetch;
  const response = await createProcessLeadNotificationsHandler({
    env: environment(),
    fetch: runtimeFetch,
  })(workerRequest());
  const text = await response.text();

  assert.equal(response.status, 503);
  assert.equal(text.includes(botToken), false);
  assert.equal(text.includes(serverKey), false);
  assert.deepEqual(JSON.parse(text), {
    claimed: 1,
    delivered: 0,
    retryScheduled: 0,
    deadLettered: 0,
    acknowledgementErrors: 1,
  });
});
