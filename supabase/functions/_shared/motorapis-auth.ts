export type SecretEnvironment = {
  get(name: string): string | undefined;
};

function clean(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim();
  return normalized || null;
}

function collectJsonSecrets(value: unknown): string[] {
  if (typeof value === "string") return clean(value) ? [value.trim()] : [];
  if (Array.isArray(value)) return value.flatMap(collectJsonSecrets);
  if (typeof value === "object" && value !== null) {
    const record = value as Record<string, unknown>;
    const preferred = collectJsonSecrets(record.default);
    return preferred.length > 0
      ? [...preferred, ...Object.entries(record)
        .filter(([name]) => name !== "default")
        .flatMap(([, entry]) => collectJsonSecrets(entry))]
      : Object.values(record).flatMap(collectJsonSecrets);
  }
  return [];
}

export function parseSecretList(value: string | undefined): string[] {
  const normalized = clean(value);
  if (!normalized) return [];
  try {
    return collectJsonSecrets(JSON.parse(normalized));
  } catch {
    return normalized
      .split(/[\n,]/)
      .map((entry) => entry.trim())
      .filter(Boolean);
  }
}

export function resolveSupabaseSecretKeys(env: SecretEnvironment): string[] {
  const values = [
    ...parseSecretList(env.get("SUPABASE_SECRET_KEYS")),
    clean(env.get("SUPABASE_SECRET_KEY")),
    clean(env.get("SUPABASE_SERVICE_ROLE_KEY")),
  ].filter((value): value is string => value !== null);
  return [...new Set(values)];
}

export function constantTimeStringEqual(left: string, right: string): boolean {
  const maximum = Math.max(left.length, right.length);
  let difference = left.length ^ right.length;
  for (let index = 0; index < maximum; index += 1) {
    difference |= (left.charCodeAt(index) || 0) ^ (right.charCodeAt(index) || 0);
  }
  return difference === 0;
}

export function authenticateSupabaseSecret(
  request: Request,
  env: SecretEnvironment,
): string | null {
  const supplied = clean(request.headers.get("apikey"));
  if (!supplied) return null;
  for (const allowed of resolveSupabaseSecretKeys(env)) {
    if (constantTimeStringEqual(supplied, allowed)) return supplied;
  }
  return null;
}
