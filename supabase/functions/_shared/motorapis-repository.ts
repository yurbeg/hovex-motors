import { MOTORAPIS_COPART_DOMAIN_ID } from "./motorapis-client.ts";
import type {
  NormalizedArchiveEvent,
  NormalizedLot,
  NormalizedVehicle,
} from "./motorapis-mapper.ts";

export type MotorApisRequestedMode = "trial" | "full" | "incremental";
export type MotorApisEffectiveMode = MotorApisRequestedMode | "recovery";

export type MotorApisSyncClaim = {
  claimed: boolean;
  runId: string;
  lastSuccessfulAt: string | null;
  leaseExpiresAt: string | null;
};

export type MotorApisSyncStats = {
  requestedMode: MotorApisRequestedMode;
  effectiveMode: MotorApisEffectiveMode;
  livePages: number;
  archivePages: number;
  vehicles: number;
  lots: number;
  archiveEvents: number;
  deactivated: number;
};

export interface MotorApisRepository {
  claimSync(input: {
    runId: string;
    mode: MotorApisRequestedMode;
    leaseSeconds: number;
  }): Promise<MotorApisSyncClaim>;
  renewSync(input: { runId: string; leaseSeconds: number }): Promise<boolean>;
  upsertVehicles(vehicles: NormalizedVehicle[]): Promise<void>;
  upsertLots(lots: NormalizedLot[]): Promise<void>;
  applyArchiveEvents(events: NormalizedArchiveEvent[], fetchedAt: string): Promise<{
    processed: number;
    deactivated: number;
    unmatched: number;
  }>;
  completeSync(input: {
    runId: string;
    checkpoint: string | null;
    stats: MotorApisSyncStats;
  }): Promise<boolean>;
  failSync(input: { runId: string; error: string }): Promise<void>;
}

export class MotorApisRepositoryError extends Error {
  readonly operation: string;
  readonly status: number | null;

  constructor(operation: string, status: number | null, cause?: unknown) {
    super(
      status === null
        ? `Supabase ${operation} failed.`
        : `Supabase ${operation} failed with HTTP ${status}.`,
      cause === undefined ? undefined : { cause },
    );
    this.name = "MotorApisRepositoryError";
    this.operation = operation;
    this.status = status;
  }
}

export type SupabaseMotorApisRepositoryOptions = {
  url: string;
  serverKey: string;
  fetch?: typeof fetch;
  timeoutMs?: number;
};

function normalizeSupabaseUrl(value: string): string {
  let parsed: URL;
  try {
    parsed = new URL(value.trim());
  } catch {
    throw new MotorApisRepositoryError("configuration", null);
  }
  if (
    parsed.protocol !== "https:"
    && parsed.hostname !== "127.0.0.1"
    && parsed.hostname !== "localhost"
  ) {
    throw new MotorApisRepositoryError("configuration", null);
  }
  return parsed.toString().replace(/\/$/, "");
}

function firstRow(value: unknown): Record<string, unknown> | null {
  const candidate = Array.isArray(value) ? value[0] : value;
  return typeof candidate === "object" && candidate !== null && !Array.isArray(candidate)
    ? candidate as Record<string, unknown>
    : null;
}

function nullableTimestamp(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? new Date(parsed).toISOString() : null;
}

function isLegacyJwtKey(value: string): boolean {
  return /^eyJ[A-Za-z0-9_-]*\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(value);
}

function vehicleRow(vehicle: NormalizedVehicle): Record<string, unknown> {
  return {
    provider_vehicle_id: vehicle.providerVehicleId,
    vin: vehicle.vin,
    title: vehicle.title,
    year: vehicle.year,
    manufacturer_id: vehicle.manufacturerId,
    make: vehicle.manufacturerName,
    model_id: vehicle.modelId,
    model: vehicle.modelName,
    generation_id: vehicle.generationId,
    generation: vehicle.generationName,
    vehicle_type: vehicle.vehicleType,
    body_type: vehicle.bodyType,
    engine_name: vehicle.engineName,
    cylinders: vehicle.cylinders,
    fuel_type: vehicle.fuelType,
    transmission: vehicle.transmission,
    drive_wheel: vehicle.driveWheel,
    color: vehicle.color,
    condition: vehicle.condition,
    document_title: vehicle.documentTitle,
    characteristics: vehicle.characteristics,
    provider_created_at: vehicle.providerCreatedAt,
    provider_updated_at: vehicle.providerUpdatedAt,
    fetched_at: vehicle.fetchedAt,
  };
}

function lotRow(lot: NormalizedLot): Record<string, unknown> {
  return {
    source_domain_id: lot.sourceDomainId,
    source_slug: lot.sourceDomainName,
    provider_lot_id: lot.providerLotId,
    provider_vehicle_id: lot.providerVehicleId,
    lot_number: lot.externalLotNumber,
    provider_status_id: lot.providerStatusId,
    provider_status: lot.providerStatusName,
    current_bid: lot.currentBid,
    current_bid_updated_at: lot.currentBidUpdatedAt,
    buy_now_price: lot.buyNow,
    buy_now_updated_at: lot.buyNowUpdatedAt,
    final_bid: lot.finalBid,
    final_bid_updated_at: lot.finalBidUpdatedAt,
    seller_reserve: lot.sellerReserve,
    seller_reserve_updated_at: lot.sellerReserveUpdatedAt,
    currency: lot.currency,
    sale_at: lot.saleDate,
    sale_updated_at: lot.saleDateUpdatedAt,
    odometer_km: lot.odometerKm,
    odometer_mi: lot.odometerMi,
    odometer_status: lot.odometerStatus,
    primary_damage: lot.primaryDamage,
    secondary_damage: lot.secondaryDamage,
    location_name: lot.locationName,
    location_city: lot.locationCity,
    location_state_code: lot.locationStateCode,
    location_country: lot.locationCountry,
    photo_urls: lot.imageUrls,
    buyer_country: lot.buyerCountry,
    provider_created_at: lot.providerCreatedAt,
    provider_updated_at: lot.providerUpdatedAt,
    archived_at: lot.archivedAt,
    archive_seen_at: null,
    deactivated_at: null,
    inactive_reason: null,
    fetched_at: lot.fetchedAt,
    active: lot.archivedAt === null,
    characteristics: lot.characteristics,
  };
}

function archiveEventRow(event: NormalizedArchiveEvent): Record<string, unknown> {
  const row: Record<string, unknown> = {
    source_domain_id: event.sourceDomainId,
    provider_lot_id: event.providerLotId,
  };
  const optionalValues: Array<[string, unknown]> = [
    ["provider_vehicle_id", event.providerVehicleId],
    ["lot_number", event.externalLotNumber],
    ["provider_status_id", event.providerStatusId],
    ["provider_status", event.providerStatusName],
    ["archived_at", event.archivedAt],
    ["sale_at", event.saleDate],
    ["sale_updated_at", event.saleDateUpdatedAt],
    ["current_bid", event.currentBid],
    ["current_bid_updated_at", event.currentBidUpdatedAt],
    ["buy_now_price", event.buyNow],
    ["buy_now_updated_at", event.buyNowUpdatedAt],
    ["final_bid", event.finalBid],
    ["final_bid_updated_at", event.finalBidUpdatedAt],
    ["seller_reserve", event.sellerReserve],
    ["seller_reserve_updated_at", event.sellerReserveUpdatedAt],
    ["currency", event.currency],
    ["buyer_country", event.buyerCountry],
  ];
  for (const [name, value] of optionalValues) {
    if (value !== null && value !== undefined) row[name] = value;
  }
  return row;
}

export class SupabaseMotorApisRepository implements MotorApisRepository {
  readonly #url: string;
  readonly #serverKey: string;
  readonly #fetch: typeof fetch;
  readonly #timeoutMs: number;

  constructor(options: SupabaseMotorApisRepositoryOptions) {
    const serverKey = options.serverKey.trim();
    if (!serverKey) throw new MotorApisRepositoryError("configuration", null);
    this.#url = normalizeSupabaseUrl(options.url);
    this.#serverKey = serverKey;
    this.#fetch = options.fetch ?? fetch;
    this.#timeoutMs = options.timeoutMs ?? 15_000;
  }

  async claimSync(input: {
    runId: string;
    mode: MotorApisRequestedMode;
    leaseSeconds: number;
  }): Promise<MotorApisSyncClaim> {
    const payload = await this.#rpc("claim_motorapis_sync", {
      p_source_domain_id: MOTORAPIS_COPART_DOMAIN_ID,
      p_run_id: input.runId,
      p_lease_seconds: input.leaseSeconds,
      p_mode: input.mode,
    });
    const row = firstRow(payload);
    return {
      claimed: row?.claimed === true,
      runId: typeof row?.run_id === "string" ? row.run_id : input.runId,
      lastSuccessfulAt: nullableTimestamp(row?.last_successful_at),
      leaseExpiresAt: nullableTimestamp(row?.lease_expires_at),
    };
  }

  async renewSync(input: { runId: string; leaseSeconds: number }): Promise<boolean> {
    const payload = await this.#rpc("renew_motorapis_sync", {
      p_source_domain_id: MOTORAPIS_COPART_DOMAIN_ID,
      p_run_id: input.runId,
      p_lease_seconds: input.leaseSeconds,
    });
    return firstRow(payload)?.renewed === true;
  }

  async upsertVehicles(vehicles: NormalizedVehicle[]): Promise<void> {
    if (vehicles.length === 0) return;
    await this.#tableUpsert(
      "motorapi_vehicles",
      "provider_vehicle_id",
      vehicles.map(vehicleRow),
    );
  }

  async upsertLots(lots: NormalizedLot[]): Promise<void> {
    if (lots.length === 0) return;
    await this.#tableUpsert(
      "motorapi_lots",
      "source_domain_id,provider_lot_id",
      lots.map(lotRow),
    );
  }

  async applyArchiveEvents(
    events: NormalizedArchiveEvent[],
    fetchedAt: string,
  ): Promise<{ processed: number; deactivated: number; unmatched: number }> {
    if (events.length === 0) return { processed: 0, deactivated: 0, unmatched: 0 };
    const payload = await this.#rpc("apply_motorapis_archive_events", {
      p_events: events.map(archiveEventRow),
      p_fetched_at: fetchedAt,
    });
    const row = firstRow(payload);
    return {
      processed: typeof row?.processed === "number" ? row.processed : events.length,
      deactivated: typeof row?.deactivated === "number" ? row.deactivated : 0,
      unmatched: typeof row?.unmatched === "number" ? row.unmatched : 0,
    };
  }

  async completeSync(input: {
    runId: string;
    checkpoint: string | null;
    stats: MotorApisSyncStats;
  }): Promise<boolean> {
    const payload = await this.#rpc("complete_motorapis_sync", {
      p_source_domain_id: MOTORAPIS_COPART_DOMAIN_ID,
      p_run_id: input.runId,
      p_checkpoint: input.checkpoint,
      p_stats: input.stats,
    });
    return firstRow(payload)?.completed === true;
  }

  async failSync(input: { runId: string; error: string }): Promise<void> {
    await this.#rpc("fail_motorapis_sync", {
      p_source_domain_id: MOTORAPIS_COPART_DOMAIN_ID,
      p_run_id: input.runId,
      p_error: input.error,
    });
  }

  async #rpc(name: string, body: Record<string, unknown>): Promise<unknown> {
    return this.#request(`rest/v1/rpc/${name}`, name, {
      method: "POST",
      body: JSON.stringify(body),
    });
  }

  async #tableUpsert(
    table: string,
    conflictColumns: string,
    rows: Record<string, unknown>[],
  ): Promise<void> {
    const query = new URLSearchParams({ on_conflict: conflictColumns });
    await this.#request(`rest/v1/${table}?${query}`, `upsert ${table}`, {
      method: "POST",
      headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
      body: JSON.stringify(rows),
    });
  }

  async #request(path: string, operation: string, init: RequestInit): Promise<unknown> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.#timeoutMs);
    const headers = new Headers(init.headers);
    headers.set("apikey", this.#serverKey);
    headers.set("Content-Type", "application/json");
    headers.set("Accept", "application/json");
    if (isLegacyJwtKey(this.#serverKey)) {
      headers.set("Authorization", `Bearer ${this.#serverKey}`);
    }
    try {
      const response = await this.#fetch(`${this.#url}/${path}`, {
        ...init,
        headers,
        signal: controller.signal,
      });
      if (!response.ok) throw new MotorApisRepositoryError(operation, response.status);
      if (response.status === 204 || response.headers.get("Content-Length") === "0") return null;
      const text = await response.text();
      if (!text) return null;
      try {
        return JSON.parse(text) as unknown;
      } catch (error) {
        throw new MotorApisRepositoryError(operation, response.status, error);
      }
    } catch (error) {
      if (error instanceof MotorApisRepositoryError) throw error;
      throw new MotorApisRepositoryError(operation, null, error);
    } finally {
      clearTimeout(timeoutId);
    }
  }
}
