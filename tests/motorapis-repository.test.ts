import assert from "node:assert/strict";
import test from "node:test";
import {
  normalizeArchivePayload,
  normalizeVehiclePayload,
} from "../supabase/functions/_shared/motorapis-mapper";
import { SupabaseMotorApisRepository } from "../supabase/functions/_shared/motorapis-repository";

test("Supabase repository uses migration column names and keeps secrets out of URLs", async () => {
  const calls: Array<{ url: URL; body: unknown; headers: Headers }> = [];
  const serverKey = "sb_secret_server-only";
  const fakeFetch: typeof fetch = async (input, init) => {
    const url = new URL(String(input));
    const text = typeof init?.body === "string" ? init.body : "";
    calls.push({
      url,
      body: text ? JSON.parse(text) as unknown : null,
      headers: new Headers(init?.headers),
    });
    if (url.pathname.endsWith("/claim_motorapis_sync")) {
      return Response.json([{
        claimed: true,
        run_id: "00000000-0000-4000-8000-000000000001",
        last_successful_at: null,
        lease_expires_at: "2026-11-06T11:00:00Z",
      }]);
    }
    if (url.pathname.endsWith("/apply_motorapis_archive_events")) {
      return Response.json([{ processed: 1, deactivated: 1, unmatched: 0 }]);
    }
    return new Response(null, { status: 204 });
  };
  const repository = new SupabaseMotorApisRepository({
    url: "https://project.supabase.co",
    serverKey,
    fetch: fakeFetch,
  });
  const fetchedAt = "2026-11-06T10:00:00.000Z";
  const mapped = normalizeVehiclePayload({
    id: 10,
    manufacturer: { id: 1, name: "Toyota" },
    model: { id: 2, name: "Camry" },
    cylinders: 4,
    lots: [{
      id: 100,
      lot: "LOT-100",
      domain: { id: 3, name: "copart_com" },
      status: { id: 1, name: "Active" },
      bid: "500",
      buy_now: "1500",
      sale_date: "2026-11-07T10:00:00Z",
      images: ["https://cdn.example/photo.jpg"],
    }],
  }, fetchedAt);

  await repository.claimSync({
    runId: "00000000-0000-4000-8000-000000000001",
    mode: "trial",
    leaseSeconds: 900,
  });
  await repository.upsertVehicles([mapped.vehicle]);
  await repository.upsertLots(mapped.lots);

  const claimBody = calls[0]?.body as Record<string, unknown>;
  assert.equal(claimBody.p_mode, "trial");
  const vehicleRows = calls[1]?.body as Array<Record<string, unknown>>;
  assert.equal(vehicleRows[0]?.make, "Toyota");
  assert.equal(vehicleRows[0]?.model, "Camry");
  assert.equal(vehicleRows[0]?.cylinders, 4);
  assert.equal("raw_payload" in (vehicleRows[0] ?? {}), false);
  const lotRows = calls[2]?.body as Array<Record<string, unknown>>;
  assert.equal(lotRows[0]?.source_slug, "copart_com");
  assert.equal(lotRows[0]?.lot_number, "LOT-100");
  assert.equal(lotRows[0]?.buy_now_price, 1500);
  assert.equal(lotRows[0]?.sale_at, "2026-11-07T10:00:00.000Z");
  assert.deepEqual(lotRows[0]?.photo_urls, ["https://cdn.example/photo.jpg"]);
  assert.equal(lotRows[0]?.currency, null);
  assert.ok(calls.every((call) => call.headers.get("apikey") === serverKey));
  assert.ok(calls.every((call) => call.headers.get("authorization") === null));
  assert.ok(calls.every((call) => !call.url.toString().includes(serverKey)));
});

test("legacy service-role JWT is also sent as Bearer while modern secret keys are not", async () => {
  const headerSets: Headers[] = [];
  const legacyJwt = "eyJhbGciOiJIUzI1NiJ9.c2VydmljZV9yb2xl.signature";
  const repository = new SupabaseMotorApisRepository({
    url: "https://project.supabase.co",
    serverKey: legacyJwt,
    fetch: async (_input, init) => {
      headerSets.push(new Headers(init?.headers));
      return Response.json([{ renewed: true, lease_expires_at: "2026-11-06T11:00:00Z" }]);
    },
  });

  await repository.renewSync({
    runId: "00000000-0000-4000-8000-000000000001",
    leaseSeconds: 900,
  });

  assert.equal(headerSets[0]?.get("apikey"), legacyJwt);
  assert.equal(headerSets[0]?.get("authorization"), `Bearer ${legacyJwt}`);
});

test("legacy archive normalization never sends a final_bid key to the archive RPC", async () => {
  const rpcBodies: Array<Record<string, unknown>> = [];
  const repository = new SupabaseMotorApisRepository({
    url: "https://project.supabase.co",
    serverKey: "secret",
    fetch: async (_input, init) => {
      rpcBodies.push(JSON.parse(String(init?.body)) as Record<string, unknown>);
      return Response.json([{ processed: 1, deactivated: 1, unmatched: 0 }]);
    },
  });
  const event = normalizeArchivePayload({
    lot_id: 100,
    domain: { id: 3, name: "copart_com" },
    bid: "900",
    final_bid_updated_at: "2026-11-06T09:00:00Z",
  }, "2026-11-06T10:00:00.000Z");
  assert.ok(event);

  await repository.applyArchiveEvents([event], "2026-11-06T10:00:00.000Z");

  const events = rpcBodies[0]?.p_events as Array<Record<string, unknown>>;
  assert.equal(events[0]?.current_bid, 900);
  assert.equal("final_bid" in (events[0] ?? {}), false);
  assert.equal("final_bid_updated_at" in (events[0] ?? {}), false);
});
