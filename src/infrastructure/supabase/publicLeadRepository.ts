import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  LeadSubmissionReceipt,
  PublicLeadSubmission,
} from "../../domain/lead";
import { getSupabaseClient } from "./client";
import type { Database } from "./database.types";

const PUBLIC_LEAD_TIMEOUT_MS = 15_000;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export type PublicLeadRepositoryErrorCode =
  | "PUBLIC_LEAD_INVALID_REQUEST"
  | "PUBLIC_LEAD_RATE_LIMITED"
  | "PUBLIC_LEAD_IDEMPOTENCY_CONFLICT"
  | "PUBLIC_LEAD_SERVICE_UNAVAILABLE"
  | "PUBLIC_LEAD_INVALID_RESPONSE"
  | "PUBLIC_LEAD_SUBMISSION_FAILED";

export const PUBLIC_LEAD_ERROR_MESSAGES: Readonly<
  Record<PublicLeadRepositoryErrorCode, string>
> = {
  PUBLIC_LEAD_INVALID_REQUEST: "Խնդրում ենք ստուգել լրացված տվյալները և կրկին փորձել։",
  PUBLIC_LEAD_RATE_LIMITED: "Կարճ ժամանակում չափազանց շատ հարցումներ են ուղարկվել։ Խնդրում ենք մի փոքր ուշ կրկին փորձել։",
  PUBLIC_LEAD_IDEMPOTENCY_CONFLICT: "Այս հարցման նույնացուցիչն արդեն օգտագործվել է այլ տվյալներով։ Փակեք պատուհանը և նոր հարցում բացեք։",
  PUBLIC_LEAD_SERVICE_UNAVAILABLE: "Հարցումների ծառայությունը ժամանակավորապես հասանելի չէ։ Խնդրում ենք մի փոքր ուշ կրկին փորձել։",
  PUBLIC_LEAD_INVALID_RESPONSE: "Սերվերից հարցման հաստատումը չստացվեց։ Խնդրում ենք կրկին փորձել։",
  PUBLIC_LEAD_SUBMISSION_FAILED: "Հարցումն ուղարկել չհաջողվեց։ Ձեր տվյալները պահպանվել են ձևում․ խնդրում ենք կրկին փորձել։",
};

export class PublicLeadRepositoryError extends Error {
  readonly code: PublicLeadRepositoryErrorCode;

  constructor(code: PublicLeadRepositoryErrorCode, cause?: unknown) {
    super(PUBLIC_LEAD_ERROR_MESSAGES[code], { cause });
    this.name = "PublicLeadRepositoryError";
    this.code = code;
  }
}

export function getPublicLeadErrorMessage(error: unknown): string {
  return error instanceof PublicLeadRepositoryError
    ? error.message
    : PUBLIC_LEAD_ERROR_MESSAGES.PUBLIC_LEAD_SUBMISSION_FAILED;
}

export interface PublicLeadDataSourceResult {
  data: unknown;
  error?: unknown;
  status?: number;
}

export interface PublicLeadDataSource {
  submit(
    payload: PublicLeadSubmission,
    signal?: AbortSignal,
  ): Promise<PublicLeadDataSourceResult>;
}

function fail(code: PublicLeadRepositoryErrorCode, cause: unknown): never {
  if (cause instanceof PublicLeadRepositoryError) throw cause;
  throw new PublicLeadRepositoryError(code, cause);
}

function requireDataSource(dataSource?: PublicLeadDataSource): PublicLeadDataSource {
  if (dataSource) return dataSource;
  const client = getSupabaseClient();
  if (!client) {
    throw new PublicLeadRepositoryError("PUBLIC_LEAD_SERVICE_UNAVAILABLE");
  }
  return createSupabasePublicLeadDataSource(client);
}

function errorCodeForStatus(status: number | undefined): PublicLeadRepositoryErrorCode {
  if (status === 400 || status === 422) return "PUBLIC_LEAD_INVALID_REQUEST";
  if (status === 409) return "PUBLIC_LEAD_IDEMPOTENCY_CONFLICT";
  if (status === 429) return "PUBLIC_LEAD_RATE_LIMITED";
  if (status === 502 || status === 503 || status === 504) {
    return "PUBLIC_LEAD_SERVICE_UNAVAILABLE";
  }
  return "PUBLIC_LEAD_SUBMISSION_FAILED";
}

function mapReceipt(value: unknown): LeadSubmissionReceipt {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("Lead receipt is not an object");
  }
  const record = value as Record<string, unknown>;
  const id = record.id;
  const receivedAt = record.receivedAt;
  const duplicate = record.duplicate;
  if (typeof id !== "string" || !UUID_PATTERN.test(id)) {
    throw new Error("Lead receipt has an invalid id");
  }
  if (
    typeof receivedAt !== "string"
    || !receivedAt.trim()
    || Number.isNaN(Date.parse(receivedAt))
  ) {
    throw new Error("Lead receipt has an invalid receivedAt");
  }
  if (typeof duplicate !== "boolean") {
    throw new Error("Lead receipt has an invalid duplicate flag");
  }
  return { id, receivedAt, duplicate };
}

export function createSupabasePublicLeadDataSource(
  client: SupabaseClient<Database>,
): PublicLeadDataSource {
  return {
    async submit(payload, signal) {
      const { data, error, response } = await client.functions.invoke<unknown>(
        "submit-lead",
        { body: payload, signal, timeout: PUBLIC_LEAD_TIMEOUT_MS },
      );
      return {
        data,
        ...(error ? { error } : {}),
        ...(response ? { status: response.status } : {}),
      };
    },
  };
}

export async function submitPublicLead(
  payload: PublicLeadSubmission,
  {
    dataSource,
    signal,
  }: {
    dataSource?: PublicLeadDataSource;
    signal?: AbortSignal;
  } = {},
): Promise<LeadSubmissionReceipt> {
  try {
    const result = await requireDataSource(dataSource).submit(payload, signal);
    if (result.error) {
      throw new PublicLeadRepositoryError(
        errorCodeForStatus(result.status),
        result.error,
      );
    }
    try {
      return mapReceipt(result.data);
    } catch (error) {
      throw new PublicLeadRepositoryError("PUBLIC_LEAD_INVALID_RESPONSE", error);
    }
  } catch (error) {
    if (error instanceof PublicLeadRepositoryError) throw error;
    return fail("PUBLIC_LEAD_SUBMISSION_FAILED", error);
  }
}
