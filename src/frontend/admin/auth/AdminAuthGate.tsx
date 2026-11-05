import { SignOut } from "@phosphor-icons/react";
import { AdminGateMessage } from "./AdminGateMessage";
import { AdminLoginScreen } from "./AdminLoginScreen";
import type { AdminAuthGateProps } from "./authTypes";
import { useAdminAuth } from "./useAdminAuth";

export function AdminAuthGate({ children }: AdminAuthGateProps) {
  const { client, gate, setSession, signOut } = useAdminAuth();
  const requestSignOut = () => {
    void signOut().catch(() => undefined);
  };

  if (!client || gate.status === "unconfigured") {
    return <AdminGateMessage title="Supabase-ը կարգավորված չէ" text="Ավելացրեք public project URL-ը և publishable key-ը .env.local ֆայլում։" />;
  }
  if (gate.status === "initializing" || gate.status === "checking") {
    return <AdminGateMessage title="Ստուգում ենք մուտքը" text="Մի պահ սպասեք, հաստատում ենք session-ը և admin իրավասությունը։" />;
  }
  if (gate.status === "signed-out") {
    return <AdminLoginScreen client={client} onSession={setSession} />;
  }
  if (gate.status === "forbidden") {
    return (
      <AdminGateMessage
        title="Մուտքը թույլատրված չէ"
        text={`${gate.email} հաշիվը վավեր է, բայց ներառված չէ Hovex admin allowlist-ում։`}
        action={(
          <button className="inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-[10px] border-0 bg-[#11110f] px-5 font-extrabold text-white" type="button" onClick={requestSignOut}>
            <SignOut size={19} /> Դուրս գալ
          </button>
        )}
      />
    );
  }
  if (gate.status === "error") {
    return (
      <AdminGateMessage
        title="Կարգավորման խնդիր կա"
        text={gate.message}
        action={<button className="min-h-11 cursor-pointer rounded-[10px] border-0 bg-[#11110f] px-5 font-extrabold text-white" type="button" onClick={requestSignOut}>Վերադառնալ մուտքի էջ</button>}
      />
    );
  }
  return <>{children({ admin: gate.admin, signOut })}</>;
}

export type { AuthorizedAdmin } from "./authTypes";
