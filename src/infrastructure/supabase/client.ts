import { createClient } from "@supabase/supabase-js";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";

export interface SupabasePublicConfig {
  url: string;
  publishableKey: string;
}

export type SupabaseEnvironment = Partial<Record<
  | "VITE_SUPABASE_URL"
  | "VITE_SUPABASE_PUBLISHABLE_KEY"
  | "VITE_SUPABASE_ANON_KEY",
  string | undefined
>>;

function clean(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function isAllowedUrl(value: string): boolean {
  try {
    const url = new URL(value);
    if (url.protocol === "https:") return true;
    return url.protocol === "http:" && ["localhost", "127.0.0.1", "::1"].includes(url.hostname);
  } catch {
    return false;
  }
}

export function resolveSupabaseConfig(env: SupabaseEnvironment): SupabasePublicConfig | null {
  const url = clean(env.VITE_SUPABASE_URL);
  const publishableKey = clean(env.VITE_SUPABASE_PUBLISHABLE_KEY) || clean(env.VITE_SUPABASE_ANON_KEY);
  if (!url || !publishableKey || !isAllowedUrl(url)) return null;
  return { url: url.replace(/\/$/, ""), publishableKey };
}

const runtimeEnvironment = ((import.meta as ImportMeta & { env?: ImportMetaEnv }).env || {}) as SupabaseEnvironment;
const runtimeConfig = resolveSupabaseConfig(runtimeEnvironment);
let publicClient: SupabaseClient<Database> | null | undefined;

export function isSupabaseConfigured(): boolean {
  return runtimeConfig !== null;
}

export function getSupabaseClient(): SupabaseClient<Database> | null {
  if (!runtimeConfig) return null;
  if (publicClient !== undefined) return publicClient;

  publicClient = createClient<Database>(runtimeConfig.url, runtimeConfig.publishableKey, {
    auth: {
      autoRefreshToken: true,
      detectSessionInUrl: false,
      persistSession: true,
    },
  });
  return publicClient;
}
