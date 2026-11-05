export function operationErrorMessage(error: unknown): string {
  return error instanceof Error && error.message
    ? error.message
    : "Supabase գործողությունը չհաջողվեց։ Կրկին փորձեք։";
}
