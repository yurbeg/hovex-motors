import {
  SupabaseLeadNotificationQueue,
  TelegramLeadNotificationSender,
  normalizeAdminAppUrl,
  processLeadNotificationJobs,
  validTelegramChatId,
  validTelegramToken,
} from "../_shared/lead-notifications.ts";
import {
  authenticateSupabaseSecret,
  type SecretEnvironment,
} from "../_shared/motorapis-auth.ts";

export type ProcessLeadNotificationsHandlerOptions = {
  env: SecretEnvironment;
  fetch?: typeof fetch;
};

const LEASE_SAFETY_MARGIN_MS = 10_000;

function clean(value: string | undefined): string | null {
  const normalized = value?.trim();
  return normalized || null;
}

function integerEnv(
  env: SecretEnvironment,
  name: string,
  fallback: number,
  minimum: number,
  maximum: number,
): number {
  const raw = clean(env.get(name));
  if (raw === null) return fallback;
  const value = Number(raw);
  return Number.isInteger(value) && value >= minimum && value <= maximum ? value : fallback;
}

function optionalPositiveInteger(env: SecretEnvironment, name: string): number | null | undefined {
  const raw = clean(env.get(name));
  if (raw === null) return null;
  const value = Number(raw);
  return Number.isSafeInteger(value) && value >= 1 ? value : undefined;
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}

export function createProcessLeadNotificationsHandler(
  options: ProcessLeadNotificationsHandlerOptions,
) {
  const runtimeFetch = options.fetch ?? fetch;

  return async (request: Request): Promise<Response> => {
    if (request.method !== "POST") {
      return jsonResponse({ error: "method_not_allowed" }, 405);
    }

    const serverKey = authenticateSupabaseSecret(request, options.env);
    if (serverKey === null) {
      return jsonResponse({ error: "unauthorized" }, 401);
    }

    const supabaseUrl = clean(options.env.get("SUPABASE_URL"));
    const botToken = clean(options.env.get("TELEGRAM_BOT_TOKEN"));
    const chatId = clean(options.env.get("TELEGRAM_CHAT_ID"));
    const threadId = optionalPositiveInteger(options.env, "TELEGRAM_MESSAGE_THREAD_ID");
    const rawAdminAppUrl = clean(options.env.get("ADMIN_APP_URL"));
    const adminAppUrl = normalizeAdminAppUrl(rawAdminAppUrl);
    if (
      supabaseUrl === null
      || botToken === null
      || !validTelegramToken(botToken)
      || chatId === null
      || !validTelegramChatId(chatId)
      || threadId === undefined
      || (rawAdminAppUrl !== null && adminAppUrl === null)
    ) {
      return jsonResponse({ error: "server_not_configured" }, 503);
    }

    const storageTimeoutMs = integerEnv(
      options.env,
      "LEAD_NOTIFICATION_STORAGE_TIMEOUT_MS",
      8_000,
      1_000,
      30_000,
    );
    const telegramTimeoutMs = integerEnv(
      options.env,
      "TELEGRAM_TIMEOUT_MS",
      8_000,
      1_000,
      30_000,
    );
    const limit = integerEnv(
      options.env,
      "LEAD_NOTIFICATION_BATCH_SIZE",
      5,
      1,
      20,
    );
    const leaseSeconds = integerEnv(
      options.env,
      "LEAD_NOTIFICATION_LEASE_SECONDS",
      120,
      30,
      900,
    );
    // Claiming consumes one storage request before sequential delivery starts.
    // Every claimed job can then consume one provider timeout and one durable
    // acknowledgement timeout. Refuse configurations whose lease could expire
    // inside that worst-case envelope, otherwise another worker could reclaim
    // and duplicate a message that this invocation is still processing.
    const maximumBatchRuntimeMs = storageTimeoutMs
      + limit * (telegramTimeoutMs + storageTimeoutMs)
      + LEASE_SAFETY_MARGIN_MS;
    if (leaseSeconds * 1_000 <= maximumBatchRuntimeMs) {
      return jsonResponse({ error: "server_not_configured" }, 503);
    }

    try {
      const result = await processLeadNotificationJobs({
        queue: new SupabaseLeadNotificationQueue({
          url: supabaseUrl,
          serverKey,
          fetch: runtimeFetch,
          timeoutMs: storageTimeoutMs,
        }),
        sender: new TelegramLeadNotificationSender({
          botToken,
          chatId,
          messageThreadId: threadId,
          adminAppUrl,
          fetch: runtimeFetch,
          timeoutMs: telegramTimeoutMs,
        }),
        limit,
        leaseSeconds,
      });
      return jsonResponse(
        result,
        result.acknowledgementErrors > 0 ? 503 : 200,
      );
    } catch {
      return jsonResponse({ error: "notification_storage_unavailable" }, 503);
    }
  };
}

type DenoRuntime = {
  env: SecretEnvironment;
  serve(handler: (request: Request) => Response | Promise<Response>): void;
};

const denoRuntime = (globalThis as typeof globalThis & { Deno?: DenoRuntime }).Deno;
if (denoRuntime) {
  denoRuntime.serve(createProcessLeadNotificationsHandler({ env: denoRuntime.env }));
}
