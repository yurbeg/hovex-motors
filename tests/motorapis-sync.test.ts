import assert from "node:assert/strict";
import test from "node:test";
import type { MotorApisPageOptions } from "../supabase/functions/_shared/motorapis-client";
import type {
  NormalizedArchiveEvent,
  NormalizedLot,
  NormalizedVehicle,
} from "../supabase/functions/_shared/motorapis-mapper";
import type {
  MotorApisRepository,
  MotorApisRequestedMode,
  MotorApisSyncClaim,
  MotorApisSyncStats,
} from "../supabase/functions/_shared/motorapis-repository";
import { runMotorApisSync } from "../supabase/functions/_shared/motorapis-sync";

function vehiclePayload(vehicleId = 10, lotId = 100, bid: number | string | null = 500) {
  return {
    id: vehicleId,
    vin: null,
    title: "Test vehicle",
    year: 2020,
    manufacturer: { id: 1, name: "Test" },
    model: { id: 2, name: "Model" },
    lots: [{
      id: lotId,
      lot: `LOT-${lotId}`,
      domain: { id: 3, name: "copart_com" },
      status: { id: 1, name: "Active" },
      bid,
      buy_now: null,
      images: null,
      updated_at: "2026-11-06T09:00:00Z",
    }],
  };
}

function archivePayload(lotId = 100) {
  return {
    lot_id: lotId,
    car_id: 10,
    domain: { id: 3, name: "copart_com" },
    status: { id: 9, name: "Sold" },
    archived_at: "2026-11-06T09:55:00Z",
    final_bid: { value: "750", updated_at: "2026-11-06T09:50:00Z" },
    bid: { value: "700", updated_at: "2026-11-06T09:45:00Z" },
    sale_date: { value: "2026-11-06T09:40:00Z", updated_at: null },
  };
}

class FakeRepository implements MotorApisRepository {
  claim: MotorApisSyncClaim = {
    claimed: true,
    runId: "run-default",
    lastSuccessfulAt: null,
    leaseExpiresAt: "2026-11-06T11:00:00.000Z",
  };
  checkpoint: string | null = null;
  claimModes: MotorApisRequestedMode[] = [];
  calls: string[] = [];
  completions: Array<{ checkpoint: string | null; stats: MotorApisSyncStats }> = [];
  failures: string[] = [];
  vehicles = new Map<string, NormalizedVehicle>();
  lots = new Map<string, NormalizedLot>();
  activeCatalog = new Set<string>();
  renewResult = true;

  async claimSync(input: {
    runId: string;
    mode: MotorApisRequestedMode;
    leaseSeconds: number;
  }): Promise<MotorApisSyncClaim> {
    this.claimModes.push(input.mode);
    this.calls.push("claim");
    return { ...this.claim, runId: this.claim.claimed ? input.runId : this.claim.runId };
  }

  async renewSync(): Promise<boolean> {
    this.calls.push("renew");
    return this.renewResult;
  }

  async upsertVehicles(vehicles: NormalizedVehicle[]): Promise<void> {
    this.calls.push(`vehicles:${vehicles.length}`);
    for (const vehicle of vehicles) this.vehicles.set(vehicle.providerVehicleId, vehicle);
  }

  async upsertLots(lots: NormalizedLot[]): Promise<void> {
    this.calls.push(`lots:${lots.length}`);
    for (const lot of lots) {
      const key = `${lot.sourceDomainId}:${lot.providerLotId}`;
      this.lots.set(key, lot);
      this.activeCatalog.add(key);
    }
  }

  async applyArchiveEvents(
    events: NormalizedArchiveEvent[],
  ): Promise<{ processed: number; deactivated: number; unmatched: number }> {
    this.calls.push(`archive:${events.length}`);
    let deactivated = 0;
    for (const event of events) {
      const key = `${event.sourceDomainId}:${event.providerLotId}`;
      if (this.activeCatalog.delete(key)) deactivated += 1;
    }
    return {
      processed: events.length,
      deactivated,
      unmatched: events.length - deactivated,
    };
  }

  async completeSync(input: {
    runId: string;
    checkpoint: string | null;
    stats: MotorApisSyncStats;
  }): Promise<boolean> {
    this.calls.push("complete");
    this.completions.push({ checkpoint: input.checkpoint, stats: input.stats });
    if (input.checkpoint !== null) this.checkpoint = input.checkpoint;
    return true;
  }

  async failSync(input: { runId: string; error: string }): Promise<void> {
    this.calls.push("fail");
    this.failures.push(input.error);
  }
}

test("full sync reads through empty terminators and deactivates only explicit archive events", async () => {
  const repository = new FakeRepository();
  const carPages: number[] = [];
  const archivePages: number[] = [];
  const client = {
    getCarsPage: async ({ page }: MotorApisPageOptions) => {
      carPages.push(page);
      if (page === 1) return { page, data: [vehiclePayload(10, 100, 500)] };
      if (page === 2) return { page, data: [vehiclePayload(10, 100, "600")] };
      return { page, data: [] };
    },
    getArchivedLotsPage: async ({ page }: MotorApisPageOptions) => {
      archivePages.push(page);
      return { page, data: page === 1 ? [archivePayload(100)] : [] };
    },
  };
  const ids = ["run-1", "run-2"];
  const fixedNow = () => new Date("2026-11-06T10:00:00.000Z");

  const first = await runMotorApisSync({
    mode: "full",
    client,
    repository,
    now: fixedNow,
    randomUUID: () => ids.shift()!,
  });
  const second = await runMotorApisSync({
    mode: "full",
    client,
    repository,
    now: fixedNow,
    randomUUID: () => ids.shift()!,
  });

  assert.equal(first.status, "completed");
  assert.equal(second.status, "completed");
  assert.deepEqual(carPages, [1, 2, 3, 1, 2, 3]);
  assert.deepEqual(archivePages, [1, 2, 1, 2]);
  assert.equal(repository.vehicles.size, 1);
  assert.equal(repository.lots.size, 1);
  assert.equal(repository.lots.get("3:100")?.currentBid, 600);
  assert.equal(repository.activeCatalog.has("3:100"), false);
  assert.equal(repository.completions.length, 2);
  assert.equal(first.stats.deactivated, 1);
  assert.equal(second.stats.deactivated, 1);
});

test("full sync does not deactivate a lot merely because mutable pages did not include it", async () => {
  const repository = new FakeRepository();
  repository.activeCatalog.add("3:old");
  const client = {
    getCarsPage: async ({ page }: MotorApisPageOptions) => ({
      page,
      data: [],
      hasNextPage: false,
    }),
    getArchivedLotsPage: async ({ page }: MotorApisPageOptions) => ({
      page,
      data: [],
      hasNextPage: false,
    }),
  };

  const result = await runMotorApisSync({
    mode: "full",
    client,
    repository,
    randomUUID: () => "run-full-absence",
  });

  assert.equal(repository.activeCatalog.has("3:old"), true);
  assert.equal(result.stats.deactivated, 0);
});

test("links.next stops both streams without an extra empty request and defaults to 50 records", async () => {
  const repository = new FakeRepository();
  const carRequests: MotorApisPageOptions[] = [];
  const archiveRequests: MotorApisPageOptions[] = [];
  const client = {
    getCarsPage: async (options: MotorApisPageOptions) => {
      carRequests.push(options);
      return {
        page: options.page,
        data: [vehiclePayload(10, 100)],
        hasNextPage: false,
      };
    },
    getArchivedLotsPage: async (options: MotorApisPageOptions) => {
      archiveRequests.push(options);
      return {
        page: options.page,
        data: [archivePayload(100)],
        hasNextPage: false,
      };
    },
  };

  const result = await runMotorApisSync({
    mode: "full",
    client,
    repository,
    now: () => new Date("2026-11-06T10:00:00.000Z"),
    randomUUID: () => "run-linked-pagination",
  });

  assert.equal(result.status, "completed");
  assert.deepEqual(carRequests.map(({ page, perPage }) => ({ page, perPage })), [
    { page: 1, perPage: 50 },
  ]);
  assert.deepEqual(archiveRequests.map(({ page, perPage }) => ({ page, perPage })), [
    { page: 1, perPage: 50 },
  ]);
});

test("incremental sync uses checkpoint plus overlap and advances only after both streams", async () => {
  const repository = new FakeRepository();
  repository.claim.lastSuccessfulAt = "2026-11-06T09:30:00.000Z";
  const requests: Array<{ stream: string; minutes?: number }> = [];
  const client = {
    getCarsPage: async (options: MotorApisPageOptions) => {
      requests.push({ stream: "cars", minutes: options.minutes });
      return { page: options.page, data: [] };
    },
    getArchivedLotsPage: async (options: MotorApisPageOptions) => {
      requests.push({ stream: "archive", minutes: options.minutes });
      return { page: options.page, data: [] };
    },
  };

  const result = await runMotorApisSync({
    mode: "incremental",
    client,
    repository,
    overlapMinutes: 5,
    now: () => new Date("2026-11-06T10:00:00.000Z"),
    randomUUID: () => "run-incremental",
  });

  assert.equal(result.effectiveMode, "incremental");
  assert.deepEqual(requests, [
    { stream: "cars", minutes: 35 },
    { stream: "archive", minutes: 35 },
  ]);
  assert.equal(repository.calls.at(-1), "complete");
  assert.equal(repository.checkpoint, "2026-11-06T10:00:00.000Z");
  assert.deepEqual(repository.claimModes, ["incremental"]);
});

test("recovery reads the largest archive window without deactivating lots absent from mutable pages", async () => {
  const repository = new FakeRepository();
  repository.claim.lastSuccessfulAt = "2026-11-03T08:00:00.000Z";
  repository.activeCatalog.add("3:old");
  const requests: Array<{ stream: string; minutes?: number }> = [];
  const client = {
    getCarsPage: async (options: MotorApisPageOptions) => {
      requests.push({ stream: "cars", minutes: options.minutes });
      return { page: options.page, data: [] };
    },
    getArchivedLotsPage: async (options: MotorApisPageOptions) => {
      requests.push({ stream: "archive", minutes: options.minutes });
      return { page: options.page, data: [] };
    },
  };

  const result = await runMotorApisSync({
    mode: "incremental",
    client,
    repository,
    now: () => new Date("2026-11-06T10:00:00.000Z"),
    randomUUID: () => "run-recovery",
  });

  assert.equal(result.effectiveMode, "recovery");
  assert.deepEqual(requests, [
    { stream: "cars", minutes: undefined },
    { stream: "archive", minutes: 4_320 },
  ]);
  assert.equal(repository.activeCatalog.has("3:old"), true);
  assert.equal(result.stats.deactivated, 0);
});

test("provider failure preserves the prior catalog and checkpoint", async () => {
  const repository = new FakeRepository();
  repository.checkpoint = "2026-11-05T10:00:00.000Z";
  repository.activeCatalog.add("3:old");
  const client = {
    getCarsPage: async ({ page }: MotorApisPageOptions) => {
      if (page === 1) return { page, data: [vehiclePayload(10, 100)] };
      throw new Error("provider unavailable");
    },
    getArchivedLotsPage: async () => {
      throw new Error("archive must not start");
    },
  };

  await assert.rejects(() => runMotorApisSync({
    mode: "full",
    client,
    repository,
    now: () => new Date("2026-11-06T10:00:00.000Z"),
    randomUUID: () => "run-failed",
  }));

  assert.equal(repository.activeCatalog.has("3:old"), true);
  assert.equal(repository.checkpoint, "2026-11-05T10:00:00.000Z");
  assert.equal(repository.calls.includes("complete"), false);
  assert.equal(repository.failures.length, 1);
  assert.equal(repository.failures[0]?.includes("provider unavailable"), false);
});

test("archive failure after live traversal preserves the prior catalog", async () => {
  const repository = new FakeRepository();
  repository.activeCatalog.add("3:old");
  const client = {
    getCarsPage: async ({ page }: MotorApisPageOptions) => ({ page, data: [] }),
    getArchivedLotsPage: async () => { throw new Error("archive unavailable"); },
  };

  await assert.rejects(() => runMotorApisSync({
    mode: "full",
    client,
    repository,
    randomUUID: () => "run-archive-failed",
  }));

  assert.equal(repository.activeCatalog.has("3:old"), true);
  assert.equal(repository.calls.includes("complete"), false);
  assert.equal(repository.failures.length, 1);
});

test("a held lock performs no provider or storage work", async () => {
  const repository = new FakeRepository();
  repository.claim = {
    claimed: false,
    runId: "other-run",
    lastSuccessfulAt: null,
    leaseExpiresAt: "2026-11-06T11:00:00.000Z",
  };
  let providerCalls = 0;
  const client = {
    getCarsPage: async () => { providerCalls += 1; return { page: 1, data: [] }; },
    getArchivedLotsPage: async () => { providerCalls += 1; return { page: 1, data: [] }; },
  };

  const result = await runMotorApisSync({
    mode: "incremental",
    client,
    repository,
    randomUUID: () => "new-run",
  });

  assert.equal(result.status, "skipped_locked");
  assert.equal(providerCalls, 0);
  assert.deepEqual(repository.calls, ["claim"]);
});

test("trial imports only one small cars page and never advances the checkpoint", async () => {
  const repository = new FakeRepository();
  repository.checkpoint = "2026-11-05T10:00:00.000Z";
  let trialPerPage = 0;
  let archiveCalls = 0;
  const client = {
    getCarsPage: async (options: MotorApisPageOptions) => {
      trialPerPage = options.perPage;
      return { page: 1, data: [vehiclePayload()] };
    },
    getArchivedLotsPage: async () => {
      archiveCalls += 1;
      return { page: 1, data: [] };
    },
  };

  const result = await runMotorApisSync({
    mode: "trial",
    client,
    repository,
    trialPageSize: 3,
    randomUUID: () => "run-trial",
  });

  assert.equal(trialPerPage, 3);
  assert.equal(archiveCalls, 0);
  assert.equal(result.checkpointAdvanced, false);
  assert.equal(repository.completions[0]?.checkpoint, null);
  assert.equal(repository.checkpoint, "2026-11-05T10:00:00.000Z");
  assert.deepEqual(repository.claimModes, ["trial"]);
});
