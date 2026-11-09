import assert from "node:assert/strict";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import {
  loadLocalEnvironment,
  resolveLocalSupabaseUrl,
} from "../scripts/motorapis-sync";
import {
  authenticateSupabaseSecret,
  constantTimeStringEqual,
  parseSecretList,
  resolveSupabaseSecretKeys,
} from "../supabase/functions/_shared/motorapis-auth";
import { createMotorApisSyncHandler } from "../supabase/functions/motorapis-sync/index";

function environment(values: Record<string, string | undefined>) {
  return { get: (name: string) => values[name] };
}

test("secret-key configuration supports injected default sets and legacy service role", () => {
  const env = environment({
    SUPABASE_SECRET_KEYS: JSON.stringify({ default: "sb_secret_default", rotating: "sb_secret_next" }),
    SUPABASE_SECRET_KEY: "sb_secret_single",
    SUPABASE_SERVICE_ROLE_KEY: "legacy-service-role",
  });

  assert.deepEqual(resolveSupabaseSecretKeys(env), [
    "sb_secret_default",
    "sb_secret_next",
    "sb_secret_single",
    "legacy-service-role",
  ]);
  assert.deepEqual(parseSecretList("first, second\nthird"), ["first", "second", "third"]);
});

test("edge authentication accepts only the apikey header with a configured secret", () => {
  const env = environment({ SUPABASE_SERVICE_ROLE_KEY: "server-secret" });

  assert.equal(authenticateSupabaseSecret(new Request("https://example.test", {
    headers: { apikey: "server-secret" },
  }), env), "server-secret");
  assert.equal(authenticateSupabaseSecret(new Request("https://example.test", {
    headers: { Authorization: "Bearer server-secret" },
  }), env), null);
  assert.equal(authenticateSupabaseSecret(new Request("https://example.test", {
    headers: { apikey: "public-anon-key" },
  }), env), null);
  assert.equal(constantTimeStringEqual("same", "same"), true);
  assert.equal(constantTimeStringEqual("same", "different"), false);
});

test("edge handler rejects public keys and bearer-only requests before any network call", async () => {
  const env = environment({
    SUPABASE_URL: "https://project.supabase.co",
    SUPABASE_SERVICE_ROLE_KEY: "service-secret",
    AUCTIONSAPI_API_KEY: "auctionsapi-secret",
  });
  let networkCalls = 0;
  const handler = createMotorApisSyncHandler({
    env,
    fetch: async () => {
      networkCalls += 1;
      throw new Error("network must not be called");
    },
  });

  const publicResponse = await handler(new Request("https://edge.example/motorapis-sync", {
    method: "POST",
    headers: { apikey: "anon-public-key" },
    body: JSON.stringify({ mode: "incremental" }),
  }));
  const bearerResponse = await handler(new Request("https://edge.example/motorapis-sync", {
    method: "POST",
    headers: { Authorization: "Bearer service-secret" },
    body: JSON.stringify({ mode: "incremental" }),
  }));

  assert.equal(publicResponse.status, 401);
  assert.equal(bearerResponse.status, 401);
  assert.equal(networkCalls, 0);
  assert.equal((await publicResponse.text()).includes("auctionsapi-secret"), false);
  assert.equal((await bearerResponse.text()).includes("service-secret"), false);
});

test("edge handler requires the AuctionsAPI server key name", async () => {
  const env = environment({
    SUPABASE_URL: "https://project.supabase.co",
    SUPABASE_SERVICE_ROLE_KEY: "service-secret",
    MOTORAPIS_API_KEY: "obsolete-provider-secret",
  });
  let networkCalls = 0;
  const handler = createMotorApisSyncHandler({
    env,
    fetch: async () => {
      networkCalls += 1;
      throw new Error("network must not be called");
    },
  });

  const response = await handler(new Request("https://edge.example/motorapis-sync", {
    method: "POST",
    headers: { apikey: "service-secret" },
    body: JSON.stringify({ mode: "trial" }),
  }));

  assert.equal(response.status, 503);
  assert.deepEqual(await response.json(), { error: "server_not_configured" });
  assert.equal(networkCalls, 0);
});

test("local environment loads .env.auctionsapi last without replacing process values", async () => {
  const directory = await mkdtemp(join(tmpdir(), "hovex-auctionsapi-env-"));
  const loadedName = "HOVEX_AUCTIONSAPI_LOADED_TEST";
  const existingName = "HOVEX_AUCTIONSAPI_EXISTING_TEST";
  const previousLoaded = process.env[loadedName];
  const previousExisting = process.env[existingName];

  try {
    delete process.env[loadedName];
    process.env[existingName] = "process";
    await writeFile(join(directory, ".env"), `${loadedName}=env\n${existingName}=env\n`);
    await writeFile(join(directory, ".env.local"), `${loadedName}=local\n${existingName}=local\n`);
    await writeFile(
      join(directory, ".env.auctionsapi"),
      `${loadedName}=auctionsapi\n${existingName}=auctionsapi\n`,
    );

    await loadLocalEnvironment(directory);

    assert.equal(process.env[loadedName], "auctionsapi");
    assert.equal(process.env[existingName], "process");
  } finally {
    if (previousLoaded === undefined) delete process.env[loadedName];
    else process.env[loadedName] = previousLoaded;
    if (previousExisting === undefined) delete process.env[existingName];
    else process.env[existingName] = previousExisting;
    await rm(directory, { recursive: true, force: true });
  }
});

test("local importer reuses the public project URL without reusing a public key", () => {
  assert.equal(resolveLocalSupabaseUrl({
    SUPABASE_URL: " https://server-project.supabase.co ",
    VITE_SUPABASE_URL: "https://browser-project.supabase.co",
  }), "https://server-project.supabase.co");
  assert.equal(resolveLocalSupabaseUrl({
    VITE_SUPABASE_URL: " https://browser-project.supabase.co ",
  }), "https://browser-project.supabase.co");
  assert.throws(
    () => resolveLocalSupabaseUrl({}),
    /SUPABASE_URL or VITE_SUPABASE_URL is required/,
  );
});
