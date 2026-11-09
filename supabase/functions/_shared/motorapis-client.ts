export const MOTORAPIS_BASE_URL = "https://auctionsapi.com/api";
export const MOTORAPIS_COPART_DOMAIN_ID = 3;
export const MOTORAPIS_MAX_MINUTES = 4_320;
export const MOTORAPIS_MAX_PAGE_SIZE = 1_000;

export type MotorApisFetch = (
  input: RequestInfo | URL,
  init?: RequestInit,
) => Promise<Response>;

export type MotorApisClientErrorCode =
  | "configuration"
  | "aborted"
  | "timeout"
  | "network"
  | "http"
  | "payload";

export class MotorApisClientError extends Error {
  readonly code: MotorApisClientErrorCode;
  readonly status: number | null;
  readonly retryable: boolean;

  constructor(
    code: MotorApisClientErrorCode,
    message: string,
    options: { status?: number; retryable?: boolean; cause?: unknown } = {},
  ) {
    super(message, options.cause === undefined ? undefined : { cause: options.cause });
    this.name = "MotorApisClientError";
    this.code = code;
    this.status = options.status ?? null;
    this.retryable = options.retryable ?? false;
  }
}

export type MotorApisPage = {
  data: unknown[];
  page: number;
  /**
   * Mirrors the provider's `links.next` cursor. It is optional so callers and
   * test doubles written for the previous empty-page terminator stay valid.
   */
  hasNextPage?: boolean;
};

export type MotorApisClientOptions = {
  apiKey: string;
  baseUrl?: string;
  fetch?: MotorApisFetch;
  timeoutMs?: number;
  maxRetries?: number;
  baseRetryDelayMs?: number;
  maxRetryDelayMs?: number;
  sleep?: (delayMs: number) => Promise<void>;
  now?: () => number;
  random?: () => number;
};

export type MotorApisPageOptions = {
  page: number;
  perPage: number;
  minutes?: number;
  signal?: AbortSignal;
};

const defaultSleep = (delayMs: number) => new Promise<void>((resolve) => {
  setTimeout(resolve, delayMs);
});

function requireIntegerInRange(name: string, value: number, minimum: number, maximum: number): void {
  if (!Number.isInteger(value) || value < minimum || value > maximum) {
    throw new MotorApisClientError(
      "configuration",
      `${name} must be an integer from ${minimum} to ${maximum}.`,
    );
  }
}

function normalizeBaseUrl(value: string): string {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new MotorApisClientError("configuration", "AuctionsAPI base URL is invalid.");
  }

  if (url.protocol !== "https:" && url.hostname !== "127.0.0.1" && url.hostname !== "localhost") {
    throw new MotorApisClientError("configuration", "AuctionsAPI base URL must use HTTPS.");
  }

  return url.toString().replace(/\/$/, "");
}

export function parseRetryAfter(value: string | null, nowMs = Date.now()): number | null {
  const normalized = value?.trim();
  if (!normalized) return null;

  if (/^\d+(?:\.\d+)?$/.test(normalized)) {
    const seconds = Number(normalized);
    return Number.isFinite(seconds) ? Math.max(0, Math.ceil(seconds * 1_000)) : null;
  }

  const dateMs = Date.parse(normalized);
  if (!Number.isFinite(dateMs)) return null;
  return Math.max(0, dateMs - nowMs);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readPagePayload(value: unknown, page: number): MotorApisPage {
  if (!isRecord(value) || !Array.isArray(value.data)) {
    throw new MotorApisClientError(
      "payload",
      "AuctionsAPI returned an invalid paginated response.",
    );
  }

  if (!isRecord(value.links) || !("next" in value.links)) {
    return { data: value.data, page };
  }

  const next = value.links.next;
  if (next !== null && (typeof next !== "string" || next.trim() === "")) {
    throw new MotorApisClientError(
      "payload",
      "AuctionsAPI returned an invalid pagination link.",
    );
  }

  return { data: value.data, page, hasNextPage: next !== null };
}

type AttemptSignal = {
  signal: AbortSignal;
  timedOut: () => boolean;
  cleanup: () => void;
};

function createAttemptSignal(parent: AbortSignal | undefined, timeoutMs: number): AttemptSignal {
  const controller = new AbortController();
  let didTimeOut = false;
  const onParentAbort = () => controller.abort(parent?.reason);

  if (parent?.aborted) {
    controller.abort(parent.reason);
  } else {
    parent?.addEventListener("abort", onParentAbort, { once: true });
  }

  const timeoutId = setTimeout(() => {
    didTimeOut = true;
    controller.abort(new DOMException("Request timeout", "TimeoutError"));
  }, timeoutMs);

  return {
    signal: controller.signal,
    timedOut: () => didTimeOut,
    cleanup: () => {
      clearTimeout(timeoutId);
      parent?.removeEventListener("abort", onParentAbort);
    },
  };
}

export class MotorApisClient {
  readonly #apiKey: string;
  readonly #baseUrl: string;
  readonly #fetch: MotorApisFetch;
  readonly #timeoutMs: number;
  readonly #maxRetries: number;
  readonly #baseRetryDelayMs: number;
  readonly #maxRetryDelayMs: number;
  readonly #sleep: (delayMs: number) => Promise<void>;
  readonly #now: () => number;
  readonly #random: () => number;

  constructor(options: MotorApisClientOptions) {
    const apiKey = options.apiKey.trim();
    if (!apiKey) {
      throw new MotorApisClientError("configuration", "AUCTIONSAPI_API_KEY is required.");
    }

    this.#apiKey = apiKey;
    this.#baseUrl = normalizeBaseUrl(options.baseUrl ?? MOTORAPIS_BASE_URL);
    this.#fetch = options.fetch ?? fetch;
    this.#timeoutMs = options.timeoutMs ?? 15_000;
    this.#maxRetries = options.maxRetries ?? 3;
    this.#baseRetryDelayMs = options.baseRetryDelayMs ?? 500;
    this.#maxRetryDelayMs = options.maxRetryDelayMs ?? 120_000;
    this.#sleep = options.sleep ?? defaultSleep;
    this.#now = options.now ?? Date.now;
    this.#random = options.random ?? Math.random;

    requireIntegerInRange("timeoutMs", this.#timeoutMs, 1, 300_000);
    requireIntegerInRange("maxRetries", this.#maxRetries, 0, 10);
    requireIntegerInRange("baseRetryDelayMs", this.#baseRetryDelayMs, 0, 300_000);
    requireIntegerInRange("maxRetryDelayMs", this.#maxRetryDelayMs, 0, 3_600_000);
  }

  getCarsPage(options: MotorApisPageOptions): Promise<MotorApisPage> {
    return this.#getPage("cars", options, { domain_id: String(MOTORAPIS_COPART_DOMAIN_ID) });
  }

  getArchivedLotsPage(options: MotorApisPageOptions): Promise<MotorApisPage> {
    // /archived-lots intentionally has no domain_id filter. The source must be
    // read from every archive event's domain object.
    return this.#getPage("archived-lots", options);
  }

  async #getPage(
    path: "cars" | "archived-lots",
    options: MotorApisPageOptions,
    additionalParams: Record<string, string> = {},
  ): Promise<MotorApisPage> {
    requireIntegerInRange("page", options.page, 1, Number.MAX_SAFE_INTEGER);
    requireIntegerInRange("perPage", options.perPage, 1, MOTORAPIS_MAX_PAGE_SIZE);
    if (options.minutes !== undefined) {
      requireIntegerInRange("minutes", options.minutes, 1, MOTORAPIS_MAX_MINUTES);
    }

    const url = new URL(`${this.#baseUrl}/${path}`);
    url.searchParams.set("page", String(options.page));
    url.searchParams.set("per_page", String(options.perPage));
    url.searchParams.set("simple_paginate", "1");
    if (options.minutes !== undefined) {
      url.searchParams.set("minutes", String(options.minutes));
    }
    for (const [name, value] of Object.entries(additionalParams)) {
      url.searchParams.set(name, value);
    }

    const payload = await this.#requestJson(url, options.signal);
    return readPagePayload(payload, options.page);
  }

  async #requestJson(url: URL, signal?: AbortSignal): Promise<unknown> {
    for (let attempt = 0; attempt <= this.#maxRetries; attempt += 1) {
      if (signal?.aborted) {
        throw new MotorApisClientError("aborted", "AuctionsAPI request was cancelled.");
      }

      const attemptSignal = createAttemptSignal(signal, this.#timeoutMs);
      try {
        const response = await this.#fetch(url, {
          method: "GET",
          headers: {
            Accept: "application/json",
            "x-api-key": this.#apiKey,
          },
          signal: attemptSignal.signal,
        });

        if (response.ok) {
          let payload: unknown;
          try {
            payload = await response.json();
          } catch (error) {
            throw new MotorApisClientError(
              "payload",
              "AuctionsAPI returned invalid JSON.",
              { cause: error },
            );
          }
          return payload;
        }

        const retryable = response.status === 408 || response.status === 429 || response.status >= 500;
        if (!retryable || attempt === this.#maxRetries) {
          throw new MotorApisClientError(
            "http",
            `AuctionsAPI request failed with HTTP ${response.status}.`,
            { status: response.status, retryable },
          );
        }

        await this.#sleep(this.#retryDelayMs(attempt, response.headers.get("Retry-After")));
      } catch (error) {
        if (error instanceof MotorApisClientError) throw error;
        if (signal?.aborted) {
          throw new MotorApisClientError("aborted", "AuctionsAPI request was cancelled.");
        }

        const timedOut = attemptSignal.timedOut();
        if (attempt === this.#maxRetries) {
          throw new MotorApisClientError(
            timedOut ? "timeout" : "network",
            timedOut ? "AuctionsAPI request timed out." : "AuctionsAPI network request failed.",
            { retryable: true, cause: error },
          );
        }
        await this.#sleep(this.#retryDelayMs(attempt, null));
      } finally {
        attemptSignal.cleanup();
      }
    }

    throw new MotorApisClientError("network", "AuctionsAPI request failed.", { retryable: true });
  }

  #retryDelayMs(attempt: number, retryAfter: string | null): number {
    const retryAfterMs = parseRetryAfter(retryAfter, this.#now());
    if (retryAfterMs !== null) return Math.min(retryAfterMs, this.#maxRetryDelayMs);

    const exponential = this.#baseRetryDelayMs * (2 ** attempt);
    const jitter = this.#baseRetryDelayMs * this.#random();
    return Math.min(Math.ceil(exponential + jitter), this.#maxRetryDelayMs);
  }
}
