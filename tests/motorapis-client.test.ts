import assert from "node:assert/strict";
import test from "node:test";
import {
  MotorApisClient,
  MotorApisClientError,
  parseRetryAfter,
} from "../supabase/functions/_shared/motorapis-client";

test("cars requests are Copart-scoped while archive requests carry no domain filter", async () => {
  const calls: Array<{ url: URL; init?: RequestInit }> = [];
  const apiKey = "server-only-secret";
  const client = new MotorApisClient({
    apiKey,
    maxRetries: 0,
    fetch: async (input, init) => {
      calls.push({ url: new URL(String(input)), init });
      return Response.json({ data: [] });
    },
  });

  await client.getCarsPage({ page: 2, perPage: 250, minutes: 65 });
  await client.getArchivedLotsPage({ page: 3, perPage: 100, minutes: 65 });

  assert.equal(calls.length, 2);
  assert.equal(calls[0]?.url.origin, "https://auctionsapi.com");
  assert.equal(calls[0]?.url.pathname, "/api/cars");
  assert.equal(calls[0]?.url.searchParams.get("domain_id"), "3");
  assert.equal(calls[0]?.url.searchParams.get("page"), "2");
  assert.equal(calls[0]?.url.searchParams.get("per_page"), "250");
  assert.equal(calls[0]?.url.searchParams.get("simple_paginate"), "1");
  assert.equal(calls[0]?.url.searchParams.get("minutes"), "65");
  assert.equal(calls[1]?.url.pathname, "/api/archived-lots");
  assert.equal(calls[1]?.url.searchParams.has("domain_id"), false);
  assert.equal(new Headers(calls[0]?.init?.headers).get("x-api-key"), apiKey);
  assert.equal(calls.some((call) => call.url.toString().includes(apiKey)), false);
});

test("collection pagination exposes links.next without following provider URLs", async () => {
  const responses = [
    Response.json({
      data: [{ id: 1 }],
      links: { next: "https://auctionsapi.com/api/cars?page=2" },
    }),
    Response.json({ data: [{ id: 2 }], links: { next: null } }),
    // A missing links envelope remains compatible with older callers and test doubles.
    Response.json({ data: [] }),
  ];
  const client = new MotorApisClient({
    apiKey: "secret",
    maxRetries: 0,
    fetch: async () => responses.shift() ?? Response.json({ data: [] }),
  });

  const first = await client.getCarsPage({ page: 1, perPage: 50 });
  const last = await client.getCarsPage({ page: 2, perPage: 50 });
  const legacy = await client.getCarsPage({ page: 3, perPage: 50 });

  assert.equal(first.hasNextPage, true);
  assert.equal(last.hasNextPage, false);
  assert.equal(legacy.hasNextPage, undefined);
});

test("429 retries honor Retry-After seconds and HTTP-date forms", async () => {
  const now = Date.parse("2026-11-06T10:00:00.000Z");
  const delays: number[] = [];
  const responses = [
    new Response(null, { status: 429, headers: { "Retry-After": "2" } }),
    new Response(null, {
      status: 429,
      headers: { "Retry-After": "Fri, 06 Nov 2026 10:00:05 GMT" },
    }),
    Response.json({ data: [{ id: 1 }] }),
  ];
  const client = new MotorApisClient({
    apiKey: "secret",
    maxRetries: 2,
    now: () => now,
    maxRetryDelayMs: 10_000,
    sleep: async (delay) => { delays.push(delay); },
    fetch: async () => responses.shift() ?? Response.json({ data: [] }),
  });

  const page = await client.getCarsPage({ page: 1, perPage: 1 });

  assert.equal(page.data.length, 1);
  assert.deepEqual(delays, [2_000, 5_000]);
  assert.equal(parseRetryAfter("0.5", now), 500);
  assert.equal(parseRetryAfter("invalid", now), null);
});

test("408 request timeouts are retried with the bounded backoff policy", async () => {
  let calls = 0;
  const delays: number[] = [];
  const client = new MotorApisClient({
    apiKey: "secret",
    maxRetries: 1,
    baseRetryDelayMs: 25,
    random: () => 0,
    sleep: async (delay) => { delays.push(delay); },
    fetch: async () => {
      calls += 1;
      return calls === 1
        ? new Response(null, { status: 408 })
        : Response.json({ data: [], links: { next: null } });
    },
  });

  const page = await client.getCarsPage({ page: 1, perPage: 50 });

  assert.equal(page.hasNextPage, false);
  assert.equal(calls, 2);
  assert.deepEqual(delays, [25]);
});

test("5xx retries are bounded and expose only a safe status error", async () => {
  let calls = 0;
  const delays: number[] = [];
  const client = new MotorApisClient({
    apiKey: "must-never-appear",
    maxRetries: 2,
    baseRetryDelayMs: 10,
    random: () => 0,
    sleep: async (delay) => { delays.push(delay); },
    fetch: async () => {
      calls += 1;
      return new Response("provider diagnostics", { status: 503 });
    },
  });

  await assert.rejects(
    () => client.getCarsPage({ page: 1, perPage: 10 }),
    (error: unknown) => {
      assert.ok(error instanceof MotorApisClientError);
      assert.equal(error.status, 503);
      assert.equal(error.retryable, true);
      assert.equal(error.message.includes("must-never-appear"), false);
      assert.equal(error.message.includes("provider diagnostics"), false);
      return true;
    },
  );
  assert.equal(calls, 3);
  assert.deepEqual(delays, [10, 20]);
});

test("invalid page envelopes and oversized pages fail before unsafe processing", async () => {
  const client = new MotorApisClient({
    apiKey: "secret",
    maxRetries: 0,
    fetch: async () => Response.json({ results: [] }),
  });
  await assert.rejects(
    () => client.getCarsPage({ page: 1, perPage: 50 }),
    (error: unknown) => error instanceof MotorApisClientError && error.code === "payload",
  );
  await assert.rejects(
    () => client.getCarsPage({ page: 1, perPage: 1_001 }),
    (error: unknown) => error instanceof MotorApisClientError && error.code === "configuration",
  );
});

test("invalid links.next values fail as unsafe provider payloads", async () => {
  const client = new MotorApisClient({
    apiKey: "secret",
    maxRetries: 0,
    fetch: async () => Response.json({ data: [], links: { next: 2 } }),
  });

  await assert.rejects(
    () => client.getCarsPage({ page: 1, perPage: 50 }),
    (error: unknown) => error instanceof MotorApisClientError && error.code === "payload",
  );
});
