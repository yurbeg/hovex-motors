import type { ReactNode } from "react";

export interface AuthorizedAdmin {
  id: string;
  email: string;
}

export interface AdminAuthContext {
  admin: AuthorizedAdmin;
  signOut: () => Promise<void>;
}

export interface AdminAuthGateProps {
  children: (context: AdminAuthContext) => ReactNode;
}

export type GateState =
  | { status: "initializing" }
  | { status: "signed-out" }
  | { status: "checking" }
  | { status: "authorized"; admin: AuthorizedAdmin }
  | { status: "forbidden"; email: string }
  | { status: "error"; message: string }
  | { status: "unconfigured" };
