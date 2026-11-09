import { authenticateSupabaseSecret, type SecretEnvironment } from "../_shared/motorapis-auth.ts";
import { MotorApisClient, MotorApisClientError } from "../_shared/motorapis-client.ts";
import {
  MotorApisRepositoryError,
  SupabaseMotorApisRepository,
  type MotorApisRequestedMode,
} from "../_shared/motorapis-repository.ts";
import { MotorApisSyncError, runMotorApisSync } from "../_shared/motorapis-sync.ts";

type EdgeEnvironment = SecretEnvironment;

export type MotorApisSyncHandlerOptions = {
  env: EdgeEnvironment;
  fetch?: typeof fetch;
  randomUUID?: () => string;
  now?: () => Date;
};

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}

function clean(value: string | undefined): string | null {
  const normalized = value?.trim();
  return normalized || null;
}

function positiveIntegerEnv(
  env: EdgeEnvironment,
  name: string,
  fallback: number,
  maximum: number,
): number {
  const raw = clean(env.get(name));
  if (raw === null) return fallback;
  const value = Number(raw);
  return Number.isInteger(value) && value >= 1 && value <= maximum ? value : fallback;
}

async function readMode(request: Request): Promise<MotorApisRequestedMode | null> {
  const text = await request.text();
  if (!text.trim()) return "incremental";
  let body: unknown;
  try {
    body = JSON.parse(text) as unknown;
  } catch {
    return null;
  }
  if (typeof body !== "object" || body === null || Array.isArray(body)) return null;
  const mode = (body as { mode?: unknown }).mode ?? "incremental";
  return mode === "trial" || mode === "full" || mode === "incremental" ? mode : null;
}

export function createMotorApisSyncHandler(options: MotorApisSyncHandlerOptions) {
  const runtimeFetch = options.fetch ?? fetch;

  return async (request: Request): Promise<Response> => {
    if (request.method !== "POST") {
      return jsonResponse({ error: "method_not_allowed" }, 405);
    }

    const serverKey = authenticateSupabaseSecret(request, options.env);
    if (serverKey === null) {
      return jsonResponse({ error: "unauthorized" }, 401);
    }

    const mode = await readMode(request);
    if (mode === null) {
      return jsonResponse({ error: "invalid_request" }, 400);
    }

    const auctionsApiKey = clean(options.env.get("AUCTIONSAPI_API_KEY"));
    const supabaseUrl = clean(options.env.get("SUPABASE_URL"));
    if (auctionsApiKey === null || supabaseUrl === null) {
      return jsonResponse({ error: "server_not_configured" }, 503);
    }

    try {
      const client = new MotorApisClient({
        apiKey: auctionsApiKey,
        baseUrl: clean(options.env.get("AUCTIONSAPI_BASE_URL")) ?? undefined,
        fetch: runtimeFetch,
        timeoutMs: positiveIntegerEnv(options.env, "AUCTIONSAPI_TIMEOUT_MS", 15_000, 300_000),
        maxRetries: positiveIntegerEnv(options.env, "AUCTIONSAPI_MAX_RETRIES", 3, 10),
      });
      const repository = new SupabaseMotorApisRepository({
        url: supabaseUrl,
        serverKey,
        fetch: runtimeFetch,
      });
      const result = await runMotorApisSync({
        mode,
        client,
        repository,
        randomUUID: options.randomUUID,
        now: options.now,
        pageSize: positiveIntegerEnv(options.env, "AUCTIONSAPI_PAGE_SIZE", 50, 1_000),
        trialPageSize: positiveIntegerEnv(options.env, "AUCTIONSAPI_TRIAL_PAGE_SIZE", 5, 50),
        overlapMinutes: positiveIntegerEnv(
          options.env,
          "AUCTIONSAPI_SYNC_OVERLAP_MINUTES",
          5,
          4_320,
        ),
        fullArchiveSafetyMinutes: positiveIntegerEnv(
          options.env,
          "AUCTIONSAPI_ARCHIVE_SAFETY_MINUTES",
          120,
          4_320,
        ),
        leaseSeconds: positiveIntegerEnv(
          options.env,
          "AUCTIONSAPI_SYNC_LEASE_SECONDS",
          900,
          3_600,
        ),
      });

      return jsonResponse({
        status: result.status,
        runId: result.runId,
        mode: result.effectiveMode,
        checkpointAdvanced: result.checkpointAdvanced,
        stats: result.stats,
      });
    } catch (error) {
      if (error instanceof MotorApisClientError) {
        return jsonResponse({
          error: "motorapis_unavailable",
          code: error.code,
          status: error.status,
        }, error.status === 401 || error.status === 403 ? 424 : 502);
      }
      if (error instanceof MotorApisRepositoryError) {
        return jsonResponse({ error: "catalog_storage_unavailable" }, 503);
      }
      if (error instanceof MotorApisSyncError && error.code === "lease_lost") {
        return jsonResponse({ error: "sync_lease_lost" }, 409);
      }
      return jsonResponse({ error: "sync_failed" }, 500);
    }
  };
}

type DenoRuntime = {
  env: EdgeEnvironment;
  serve(handler: (request: Request) => Response | Promise<Response>): void;
};

const denoRuntime = (globalThis as typeof globalThis & { Deno?: DenoRuntime }).Deno;
if (denoRuntime) {
  denoRuntime.serve(createMotorApisSyncHandler({ env: denoRuntime.env }));
}
