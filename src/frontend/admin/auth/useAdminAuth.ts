import { useCallback, useEffect, useRef, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { getSupabaseClient } from "../../../infrastructure/supabase/client";
import { verifyAdminMembership } from "./adminAuthService";
import type { GateState } from "./authTypes";

const savedSessionError: GateState = {
  status: "error",
  message: "Պահված մուտքի ստուգումը չհաջողվեց։ Կրկին փորձեք։",
};

const membershipError: GateState = {
  status: "error",
  message: "Admin իրավասությունների ստուգումը չհաջողվեց։ Ստուգեք կապը և կրկին փորձեք։",
};

export function useAdminAuth() {
  const client = getSupabaseClient();
  const [session, setSession] = useState<Session | null | undefined>(undefined);
  const [gate, setGate] = useState<GateState>(() => (
    client ? { status: "initializing" } : { status: "unconfigured" }
  ));
  const verificationId = useRef(0);
  const sessionUserId = useRef<string | null>(null);

  useEffect(() => {
    if (!client) return;
    let active = true;
    let authRevision = 0;

    const { data: subscriptionData } = client.auth.onAuthStateChange((_event, nextSession) => {
      authRevision += 1;
      verificationId.current += 1;
      if (active) {
        const nextUserId = nextSession?.user.id ?? null;
        const userChanged = sessionUserId.current !== nextUserId;
        sessionUserId.current = nextUserId;
        if (userChanged) {
          setGate(nextSession ? { status: "checking" } : { status: "signed-out" });
        }
        setSession(nextSession);
      }
    });

    const startingRevision = authRevision;
    void client.auth.getSession().then(({ data, error }) => {
      if (!active || authRevision !== startingRevision) return;
      if (error) {
        setGate(savedSessionError);
        return;
      }
      sessionUserId.current = data.session?.user.id ?? null;
      setSession(data.session);
    }).catch(() => {
      if (active && authRevision === startingRevision) setGate(savedSessionError);
    });

    return () => {
      active = false;
      subscriptionData.subscription.unsubscribe();
    };
  }, [client]);

  useEffect(() => {
    if (!client || session === undefined) return;
    const requestId = ++verificationId.current;
    if (!session) {
      setGate({ status: "signed-out" });
      return;
    }

    setGate((current) => (
      current.status === "authorized" && current.admin.id === session.user.id
        ? current
        : { status: "checking" }
    ));
    void verifyAdminMembership(client, session).then((nextGate) => {
      if (verificationId.current === requestId) setGate(nextGate);
    }).catch(() => {
      if (verificationId.current === requestId) setGate(membershipError);
    });
  }, [client, session]);

  const acceptSession = useCallback((nextSession: Session) => {
    verificationId.current += 1;
    sessionUserId.current = nextSession.user.id;
    setGate({ status: "checking" });
    setSession(nextSession);
  }, []);

  const signOut = useCallback(async () => {
    if (!client) return;
    verificationId.current += 1;
    const { error } = await client.auth.signOut({ scope: "local" });
    if (error) throw error;
    sessionUserId.current = null;
    setGate({ status: "signed-out" });
    setSession(null);
  }, [client]);

  return {
    client,
    gate,
    setSession: acceptSession,
    signOut,
  };
}
