import type { Session, SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../../../infrastructure/supabase/database.types";
import type { GateState } from "./authTypes";

export function authErrorMessage(error: unknown): string {
  const message = error instanceof Error ? error.message.toLocaleLowerCase("en") : "";
  if (message.includes("invalid login credentials") || message.includes("email not confirmed")) {
    return "Էլ․ հասցեն կամ գաղտնաբառը սխալ է, կամ հաշիվը դեռ հաստատված չէ։";
  }
  return "Մուտքը չհաջողվեց։ Ստուգեք կապը և կրկին փորձեք։";
}

export async function verifyAdminMembership(
  client: SupabaseClient<Database>,
  session: Session,
): Promise<GateState> {
  const { data, error } = await client
    .from("admin_users")
    .select("user_id")
    .eq("user_id", session.user.id)
    .maybeSingle();

  if (error) {
    return {
      status: "error",
      message: "Admin իրավասությունների ստուգումը չհաջողվեց։ Համոզվեք, որ երկրորդ migration-ը կիրառված է։",
    };
  }

  const email = session.user.email?.trim() || "admin";
  if (!data) return { status: "forbidden", email };
  return { status: "authorized", admin: { id: session.user.id, email } };
}
