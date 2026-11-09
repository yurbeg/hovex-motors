import { readFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import { resolve } from "node:path";
import { resolveSupabaseSecretKeys } from "../supabase/functions/_shared/motorapis-auth.ts";
import { MotorApisClient, MotorApisClientError } from "../supabase/functions/_shared/motorapis-client.ts";
import {
  MotorApisRepositoryError,
  SupabaseMotorApisRepository,
  type MotorApisRequestedMode,
} from "../supabase/functions/_shared/motorapis-repository.ts";
import { runMotorApisSync } from "../supabase/functions/_shared/motorapis-sync.ts";

function unquoteEnvValue(value: string): string {
  if (value.length < 2) return value;
  const quote = value[0];
  if ((quote !== "\"" && quote !== "'") || value.at(-1) !== quote) return value;
  const content = value.slice(1, -1);
  if (quote === "'") return content;
  return content.replace(/\\n/g, "\n").replace(/\\r/g, "\r").replace(/\\t/g, "\t");
}

export function parseDotEnv(contents: string): Record<string, string> {
  const parsed: Record<string, string> = {};
  for (const line of contents.split(/\r?\n/)) {
    const match = line.match(/^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/);
    if (!match) continue;
    const [, name, rawValue] = match;
    if (!name || rawValue === undefined) continue;
    let value = rawValue;
    if (!value.startsWith("\"") && !value.startsWith("'")) {
      value = value.replace(/\s+#.*$/, "").trim();
    }
    parsed[name] = unquoteEnvValue(value);
  }
  return parsed;
}

export async function loadLocalEnvironment(directory = process.cwd()): Promise<void> {
  const loaded: Record<string, string> = {};
  for (const filename of [".env", ".env.local", ".env.auctionsapi"]) {
    try {
      Object.assign(loaded, parseDotEnv(await readFile(resolve(directory, filename), "utf8")));
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    }
  }
  for (const [name, value] of Object.entries(loaded)) {
    if (process.env[name] === undefined) process.env[name] = value;
  }
}

export function parseMode(arguments_: string[]): MotorApisRequestedMode {
  let candidate: string | undefined;
  for (let index = 0; index < arguments_.length; index += 1) {
    const argument = arguments_[index];
    if (argument === "--trial") candidate = "trial";
    else if (argument === "--full") candidate = "full";
    else if (argument === "--incremental") candidate = "incremental";
    else if (argument === "--mode") candidate = arguments_[index + 1];
    else if (argument.startsWith("--mode=")) candidate = argument.slice("--mode=".length);
  }
  if (candidate === undefined) return "incremental";
  if (candidate === "trial" || candidate === "full" || candidate === "incremental") return candidate;
  throw new Error("Mode must be trial, full, or incremental.");
}

function requiredEnvironment(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is required.`);
  return value;
}

export function resolveLocalSupabaseUrl(
  environment: NodeJS.ProcessEnv = process.env,
): string {
  const value = environment.SUPABASE_URL?.trim()
    || environment.VITE_SUPABASE_URL?.trim();
  if (!value) {
    throw new Error("SUPABASE_URL or VITE_SUPABASE_URL is required.");
  }
  return value;
}

function positiveIntegerEnvironment(name: string, fallback: number, maximum: number): number {
  const raw = process.env[name]?.trim();
  if (!raw) return fallback;
  const value = Number(raw);
  return Number.isInteger(value) && value >= 1 && value <= maximum ? value : fallback;
}

async function main(): Promise<void> {
  await loadLocalEnvironment();
  const mode = parseMode(process.argv.slice(2));
  const env = { get: (name: string) => process.env[name] };
  const serverKey = resolveSupabaseSecretKeys(env)[0];
  if (!serverKey) throw new Error("A Supabase server secret key is required.");

  const client = new MotorApisClient({
    apiKey: requiredEnvironment("AUCTIONSAPI_API_KEY"),
    baseUrl: process.env.AUCTIONSAPI_BASE_URL?.trim() || undefined,
    timeoutMs: positiveIntegerEnvironment("AUCTIONSAPI_TIMEOUT_MS", 15_000, 300_000),
    maxRetries: positiveIntegerEnvironment("AUCTIONSAPI_MAX_RETRIES", 3, 10),
  });
  const repository = new SupabaseMotorApisRepository({
    url: resolveLocalSupabaseUrl(),
    serverKey,
  });
  const result = await runMotorApisSync({
    mode,
    client,
    repository,
    pageSize: positiveIntegerEnvironment("AUCTIONSAPI_PAGE_SIZE", 50, 1_000),
    trialPageSize: positiveIntegerEnvironment("AUCTIONSAPI_TRIAL_PAGE_SIZE", 5, 50),
    overlapMinutes: positiveIntegerEnvironment(
      "AUCTIONSAPI_SYNC_OVERLAP_MINUTES",
      5,
      4_320,
    ),
    // A manually initiated full import is also the long-running recovery path,
    // so retain every archive event still available in the documented window.
    fullArchiveSafetyMinutes: positiveIntegerEnvironment(
      "AUCTIONSAPI_ARCHIVE_SAFETY_MINUTES",
      mode === "full" ? 4_320 : 120,
      4_320,
    ),
    leaseSeconds: positiveIntegerEnvironment("AUCTIONSAPI_SYNC_LEASE_SECONDS", 900, 3_600),
  });
  process.stdout.write(`${JSON.stringify({
    status: result.status,
    runId: result.runId,
    mode: result.effectiveMode,
    checkpointAdvanced: result.checkpointAdvanced,
    stats: result.stats,
  }, null, 2)}\n`);
}

const entrypoint = process.argv[1] ? pathToFileURL(resolve(process.argv[1])).href : "";
if (entrypoint === import.meta.url) {
  main().catch((error: unknown) => {
    const code = error instanceof MotorApisClientError
      ? `motorapis_${error.code}`
      : error instanceof MotorApisRepositoryError
        ? "supabase_repository"
        : "configuration_or_sync";
    process.stderr.write(`AuctionsAPI sync failed (${code}).\n`);
    process.exitCode = 1;
  });
}
