import assert from "node:assert/strict";
import test from "node:test";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { PublicLeadSubmission } from "../src/domain/lead";
import {
  PUBLIC_LEAD_ERROR_MESSAGES,
  PublicLeadRepositoryError,
  createSupabasePublicLeadDataSource,
  getPublicLeadErrorMessage,
  submitPublicLead,
} from "../src/infrastructure/supabase/publicLeadRepository";
import type { PublicLeadDataSource } from "../src/infrastructure/supabase/publicLeadRepository";
import type { Database } from "../src/infrastructure/supabase/database.types";

const payload: PublicLeadSubmission = {
  clientRequestId: "7d92f4aa-48d0-4af0-a296-29115f89d5aa",
  name: "Անի Մկրտչյան",
  phone: "+374 95 123 456",
  contactMethod: "whatsapp",
  requestKind: "consultation",
  vehicleId: "deepal-sl03-2025",
  vehicleLabel: "2025 Deepal SL03 Sport",
  lotId: null,
  vin: null,
  preferredDate: "2026-11-12",
  preferredTime: "13:00–16:00",
  note: "Խնդրում եմ կապվել WhatsApp-ով։",
  source: "website",
  consent: true,
};

test("Supabase invocation has a finite network deadline", async () => {
  let functionName = "";
  let invokeOptions: Record<string, unknown> | undefined;
  const client = {
    functions: {
      invoke: async (name: string, options: Record<string, unknown>) => {
        functionName = name;
        invokeOptions = options;
        return {
          data: {
            id: "9e9d3ea8-6793-40e8-8319-62308c77d00d",
            receivedAt: "2026-11-10T10:15:30.000Z",
            duplicate: false,
          },
          error: null,
        };
      },
    },
  };

  const result = await createSupabasePublicLeadDataSource(
    client as unknown as SupabaseClient<Database>,
  ).submit(payload);

  assert.equal(functionName, "submit-lead");
  assert.equal(invokeOptions?.body, payload);
  assert.equal(invokeOptions?.timeout, 15_000);
  assert.equal(result.error, undefined);
});

test("submits the exact public contract and maps the server receipt", async () => {
  const controller = new AbortController();
  let submitted: PublicLeadSubmission | undefined;
  let receivedSignal: AbortSignal | undefined;
  const dataSource: PublicLeadDataSource = {
    submit: async (candidate, signal) => {
      submitted = candidate;
      receivedSignal = signal;
      return {
        data: {
          id: "9e9d3ea8-6793-40e8-8319-62308c77d00d",
          receivedAt: "2026-11-10T10:15:30.000Z",
          duplicate: false,
          ignoredServerField: "not exposed",
        },
        status: 201,
      };
    },
  };

  const receipt = await submitPublicLead(payload, {
    dataSource,
    signal: controller.signal,
  });

  assert.deepEqual(submitted, payload);
  assert.equal(receivedSignal, controller.signal);
  assert.deepEqual(receipt, {
    id: "9e9d3ea8-6793-40e8-8319-62308c77d00d",
    receivedAt: "2026-11-10T10:15:30.000Z",
    duplicate: false,
  });
});

test("accepts a server-confirmed idempotent retry", async () => {
  const dataSource: PublicLeadDataSource = {
    submit: async () => ({
      data: {
        id: "9e9d3ea8-6793-40e8-8319-62308c77d00d",
        receivedAt: "2026-11-10T10:15:30.000Z",
        duplicate: true,
      },
      status: 200,
    }),
  };

  const receipt = await submitPublicLead(payload, { dataSource });

  assert.equal(receipt.duplicate, true);
});

test("maps function statuses to stable, safe public errors", async () => {
  const rawFailure = new Error("database password and internal table detail");
  const cases = [
    [400, "PUBLIC_LEAD_INVALID_REQUEST"],
    [409, "PUBLIC_LEAD_IDEMPOTENCY_CONFLICT"],
    [429, "PUBLIC_LEAD_RATE_LIMITED"],
    [503, "PUBLIC_LEAD_SERVICE_UNAVAILABLE"],
    [500, "PUBLIC_LEAD_SUBMISSION_FAILED"],
  ] as const;

  for (const [status, code] of cases) {
    const dataSource: PublicLeadDataSource = {
      submit: async () => ({ data: null, error: rawFailure, status }),
    };
    await assert.rejects(
      () => submitPublicLead(payload, { dataSource }),
      (error: unknown) => {
        assert.ok(error instanceof PublicLeadRepositoryError);
        assert.equal(error.code, code);
        assert.equal(error.message, PUBLIC_LEAD_ERROR_MESSAGES[code]);
        assert.equal(error.cause, rawFailure);
        assert.ok(!error.message.includes("password"));
        assert.equal(getPublicLeadErrorMessage(error), error.message);
        return true;
      },
    );
  }
});

test("rejects malformed success payloads instead of reporting false success", async () => {
  const invalidResponses: unknown[] = [
    null,
    {},
    { id: "not-a-uuid", receivedAt: "2026-11-10T10:15:30.000Z", duplicate: false },
    { id: "lead-id", receivedAt: "not-a-date", duplicate: false },
    { id: "lead-id", receivedAt: "2026-11-10T10:15:30.000Z", duplicate: "false" },
  ];

  for (const data of invalidResponses) {
    const dataSource: PublicLeadDataSource = {
      submit: async () => ({ data, status: 201 }),
    };
    await assert.rejects(
      () => submitPublicLead(payload, { dataSource }),
      (error: unknown) => error instanceof PublicLeadRepositoryError
        && error.code === "PUBLIC_LEAD_INVALID_RESPONSE",
    );
  }
});

test("transport exceptions fail closed and never create a local receipt", async () => {
  const rawFailure = new Error("offline");
  const dataSource: PublicLeadDataSource = {
    submit: async () => { throw rawFailure; },
  };

  await assert.rejects(
    () => submitPublicLead(payload, { dataSource }),
    (error: unknown) => {
      assert.ok(error instanceof PublicLeadRepositoryError);
      assert.equal(error.code, "PUBLIC_LEAD_SUBMISSION_FAILED");
      assert.equal(error.cause, rawFailure);
      return true;
    },
  );
  assert.equal(
    getPublicLeadErrorMessage(rawFailure),
    PUBLIC_LEAD_ERROR_MESSAGES.PUBLIC_LEAD_SUBMISSION_FAILED,
  );
});
