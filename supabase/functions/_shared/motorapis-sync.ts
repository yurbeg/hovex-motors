import {
  MOTORAPIS_MAX_MINUTES,
  type MotorApisClient,
  MotorApisClientError,
} from "./motorapis-client.ts";
import {
  MotorApisPayloadError,
  normalizeArchivePayload,
  normalizeVehiclePayload,
} from "./motorapis-mapper.ts";
import type {
  MotorApisEffectiveMode,
  MotorApisRepository,
  MotorApisRequestedMode,
  MotorApisSyncStats,
} from "./motorapis-repository.ts";

export type MotorApisSyncClient = Pick<
  MotorApisClient,
  "getCarsPage" | "getArchivedLotsPage"
>;

export type RunMotorApisSyncOptions = {
  mode: MotorApisRequestedMode;
  client: MotorApisSyncClient;
  repository: MotorApisRepository;
  signal?: AbortSignal;
  pageSize?: number;
  trialPageSize?: number;
  overlapMinutes?: number;
  fullArchiveSafetyMinutes?: number;
  leaseSeconds?: number;
  now?: () => Date;
  randomUUID?: () => string;
};

export type MotorApisSyncResult = {
  status: "completed" | "skipped_locked";
  runId: string;
  requestedMode: MotorApisRequestedMode;
  effectiveMode: MotorApisEffectiveMode;
  checkpointAdvanced: boolean;
  stats: MotorApisSyncStats;
};

export class MotorApisSyncError extends Error {
  readonly code: "lease_lost" | "completion_rejected" | "configuration";

  constructor(code: MotorApisSyncError["code"], message: string) {
    super(message);
    this.name = "MotorApisSyncError";
    this.code = code;
  }
}

function requirePositiveInteger(name: string, value: number, maximum: number): void {
  if (!Number.isInteger(value) || value < 1 || value > maximum) {
    throw new MotorApisSyncError(
      "configuration",
      `${name} must be an integer from 1 to ${maximum}.`,
    );
  }
}

export function calculateIncrementalMinutes(
  checkpoint: string,
  runStartedAt: Date,
  overlapMinutes: number,
): number {
  const checkpointMs = Date.parse(checkpoint);
  if (!Number.isFinite(checkpointMs)) return MOTORAPIS_MAX_MINUTES + 1;
  const elapsedMs = Math.max(0, runStartedAt.getTime() - checkpointMs);
  return Math.max(1, Math.ceil(elapsedMs / 60_000) + overlapMinutes);
}

function initialStats(
  requestedMode: MotorApisRequestedMode,
  effectiveMode: MotorApisEffectiveMode,
): MotorApisSyncStats {
  return {
    requestedMode,
    effectiveMode,
    livePages: 0,
    archivePages: 0,
    vehicles: 0,
    lots: 0,
    archiveEvents: 0,
    deactivated: 0,
  };
}

function safeFailureMessage(error: unknown): string {
  if (error instanceof MotorApisClientError) {
    return error.status === null
      ? `AuctionsAPI ${error.code} failure.`
      : `AuctionsAPI HTTP ${error.status} failure.`;
  }
  if (error instanceof MotorApisPayloadError) return "AuctionsAPI payload validation failed.";
  if (error instanceof MotorApisSyncError) return `AuctionsAPI sync ${error.code}.`;
  return "AuctionsAPI sync failed.";
}

function assertNotAborted(signal?: AbortSignal): void {
  if (signal?.aborted) {
    throw new MotorApisClientError("aborted", "AuctionsAPI sync was cancelled.");
  }
}

export async function runMotorApisSync(
  options: RunMotorApisSyncOptions,
): Promise<MotorApisSyncResult> {
  const pageSize = options.pageSize ?? 50;
  const trialPageSize = options.trialPageSize ?? 5;
  const overlapMinutes = options.overlapMinutes ?? 5;
  const fullArchiveSafetyMinutes = options.fullArchiveSafetyMinutes ?? 120;
  const leaseSeconds = options.leaseSeconds ?? 900;
  const now = options.now ?? (() => new Date());
  const randomUUID = options.randomUUID ?? (() => crypto.randomUUID());

  requirePositiveInteger("pageSize", pageSize, 1_000);
  requirePositiveInteger("trialPageSize", trialPageSize, 1_000);
  requirePositiveInteger("overlapMinutes", overlapMinutes, MOTORAPIS_MAX_MINUTES);
  requirePositiveInteger(
    "fullArchiveSafetyMinutes",
    fullArchiveSafetyMinutes,
    MOTORAPIS_MAX_MINUTES,
  );
  requirePositiveInteger("leaseSeconds", leaseSeconds, 3_600);
  if (leaseSeconds < 30) {
    throw new MotorApisSyncError("configuration", "leaseSeconds must be at least 30.");
  }

  const runStartedAt = now();
  if (!Number.isFinite(runStartedAt.getTime())) {
    throw new MotorApisSyncError("configuration", "Sync clock returned an invalid date.");
  }
  const checkpoint = runStartedAt.toISOString();
  const requestedRunId = randomUUID();

  const claim = await options.repository.claimSync({
    runId: requestedRunId,
    mode: options.mode,
    leaseSeconds,
  });
  const runId = claim.runId;

  if (!claim.claimed) {
    const stats = initialStats(options.mode, options.mode);
    return {
      status: "skipped_locked",
      runId,
      requestedMode: options.mode,
      effectiveMode: options.mode,
      checkpointAdvanced: false,
      stats,
    };
  }

  let effectiveMode: MotorApisEffectiveMode = options.mode;
  let deltaMinutes: number | undefined;
  if (options.mode === "incremental") {
    if (claim.lastSuccessfulAt === null) {
      effectiveMode = "full";
    } else {
      const requestedMinutes = calculateIncrementalMinutes(
        claim.lastSuccessfulAt,
        runStartedAt,
        overlapMinutes,
      );
      if (requestedMinutes > MOTORAPIS_MAX_MINUTES) {
        effectiveMode = "recovery";
      } else {
        deltaMinutes = requestedMinutes;
      }
    }
  }

  const stats = initialStats(options.mode, effectiveMode);
  const renew = async () => {
    assertNotAborted(options.signal);
    const renewed = await options.repository.renewSync({ runId, leaseSeconds });
    if (!renewed) {
      throw new MotorApisSyncError("lease_lost", "AuctionsAPI sync lease was lost.");
    }
  };

  try {
    if (effectiveMode === "trial") {
      await renew();
      const page = await options.client.getCarsPage({
        page: 1,
        perPage: trialPageSize,
        signal: options.signal,
      });
      const fetchedAt = now().toISOString();
      const mapped = page.data.map((vehicle) => normalizeVehiclePayload(vehicle, fetchedAt));
      await options.repository.upsertVehicles(mapped.map((entry) => entry.vehicle));
      await options.repository.upsertLots(mapped.flatMap((entry) => entry.lots));
      stats.livePages = page.data.length > 0 ? 1 : 0;
      stats.vehicles = mapped.length;
      stats.lots = mapped.reduce((total, entry) => total + entry.lots.length, 0);

      const completed = await options.repository.completeSync({ runId, checkpoint: null, stats });
      if (!completed) {
        throw new MotorApisSyncError("completion_rejected", "Trial completion was rejected.");
      }
      return {
        status: "completed",
        runId,
        requestedMode: options.mode,
        effectiveMode,
        checkpointAdvanced: false,
        stats,
      };
    }

    const liveMinutes = effectiveMode === "incremental" ? deltaMinutes : undefined;
    for (let pageNumber = 1; ; pageNumber += 1) {
      await renew();
      const page = await options.client.getCarsPage({
        page: pageNumber,
        perPage: pageSize,
        minutes: liveMinutes,
        signal: options.signal,
      });
      if (page.data.length === 0) break;

      const fetchedAt = now().toISOString();
      const mapped = page.data.map((vehicle) => normalizeVehiclePayload(vehicle, fetchedAt));
      const vehicles = mapped.map((entry) => entry.vehicle);
      const lots = mapped.flatMap((entry) => entry.lots);
      await options.repository.upsertVehicles(vehicles);
      await options.repository.upsertLots(lots);
      stats.livePages += 1;
      stats.vehicles += vehicles.length;
      stats.lots += lots.length;
      if (page.hasNextPage === false) break;
    }

    let archiveMinutes: number | undefined;
    if (effectiveMode === "incremental") {
      archiveMinutes = deltaMinutes;
    } else if (effectiveMode === "recovery") {
      // AuctionsAPI caps change windows at 72 hours. Re-read every current
      // /cars page and the largest documented archive window after a gap, but
      // retire lots only from explicit archive events: pagination is mutable
      // and absence from a traversal is not authoritative.
      archiveMinutes = MOTORAPIS_MAX_MINUTES;
    } else if (effectiveMode === "full") {
      const runElapsedMinutes = Math.ceil(
        Math.max(0, now().getTime() - runStartedAt.getTime()) / 60_000,
      );
      const safetyWindow = fullArchiveSafetyMinutes + runElapsedMinutes;
      archiveMinutes = Math.min(MOTORAPIS_MAX_MINUTES, Math.max(1, safetyWindow));
    }
    for (let pageNumber = 1; ; pageNumber += 1) {
      await renew();
      const page = await options.client.getArchivedLotsPage({
        page: pageNumber,
        perPage: pageSize,
        minutes: archiveMinutes,
        signal: options.signal,
      });
      if (page.data.length === 0) break;

      const fetchedAt = now().toISOString();
      const events = page.data
        .map((event) => normalizeArchivePayload(event, fetchedAt))
        .filter((event): event is NonNullable<typeof event> => event !== null);
      const archiveResult = await options.repository.applyArchiveEvents(events, fetchedAt);
      stats.archivePages += 1;
      stats.archiveEvents += archiveResult.processed;
      stats.deactivated += archiveResult.deactivated;
      if (page.hasNextPage === false) break;
    }

    // The checkpoint is the run start, not completion, so updates that happen
    // during a long run remain inside the next overlapped window.
    const completed = await options.repository.completeSync({ runId, checkpoint, stats });
    if (!completed) {
      throw new MotorApisSyncError("completion_rejected", "Sync completion was rejected.");
    }

    return {
      status: "completed",
      runId,
      requestedMode: options.mode,
      effectiveMode,
      checkpointAdvanced: true,
      stats,
    };
  } catch (error) {
    try {
      await options.repository.failSync({ runId, error: safeFailureMessage(error) });
    } catch {
      // Preserve the original provider, validation, or lease failure.
    }
    throw error;
  }
}
