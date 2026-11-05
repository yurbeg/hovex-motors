import { useState } from "react";
import type { FormEvent } from "react";
import type { Session, SupabaseClient } from "@supabase/supabase-js";
import { Eye, EyeSlash, LockKey } from "@phosphor-icons/react";
import type { Database } from "../../../infrastructure/supabase/database.types";
import { authErrorMessage } from "./adminAuthService";

interface AdminLoginScreenProps {
  client: SupabaseClient<Database>;
  onSession: (session: Session) => void;
}

export function AdminLoginScreen({ client, onSession }: AdminLoginScreenProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (pending) return;
    setPending(true);
    setError("");

    try {
      const { data, error: signInError } = await client.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (signInError) throw signInError;
      if (!data.session) throw new Error("Supabase did not return a session");
      onSession(data.session);
    } catch (signInError) {
      setError(authErrorMessage(signInError));
    } finally {
      setPending(false);
    }
  };

  return (
    <main className="grid min-h-screen place-items-center bg-[radial-gradient(circle_at_82%_12%,rgba(255,196,0,0.16),transparent_32%),#f5f2ec] px-4 py-10 text-[#11110f]">
      <section className="w-full max-w-[430px] overflow-hidden rounded-[22px] border border-[#ded8cf] bg-white shadow-[0_28px_80px_rgba(31,28,20,0.12)]">
        <header className="border-b border-[#ece7de] bg-[#11110f] px-7 py-7 text-white">
          <div className="mb-5 flex items-center gap-3">
            <img className="size-14 rounded-xl border border-[#39362f] object-contain" src="/assets/hovex/hovex-logo-instagram.jpg" alt="" />
            <span className="grid">
              <strong className="text-lg tracking-[0.13em]">HOVEX</strong>
              <small className="text-[9px] font-bold tracking-[0.18em] text-[#aaa69e]">ADMIN PANEL</small>
            </span>
          </div>
          <h1 className="m-0 text-[26px] leading-tight">Մուտք կառավարման վահանակ</h1>
          <p className="mb-0 mt-2 text-[11px] leading-relaxed text-[#bbb7af]">Մուտք գործեք Supabase-ում ստեղծված admin հաշվով։</p>
        </header>
        <form className="grid gap-4 p-7" onSubmit={submit} noValidate>
          <label className="grid gap-1.5 text-[10px] font-extrabold text-[#5f5b55]">
            <span>Էլ․ հասցե</span>
            <input className="h-12 rounded-[10px] border border-[#d8d4cc] px-3.5 text-sm outline-none focus:border-[#806600] focus:shadow-[0_0_0_3px_rgba(255,196,0,0.16)]" type="email" autoComplete="username" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="admin@example.com" />
          </label>
          <label className="grid gap-1.5 text-[10px] font-extrabold text-[#5f5b55]">
            <span>Գաղտնաբառ</span>
            <span className="flex h-12 items-center rounded-[10px] border border-[#d8d4cc] focus-within:border-[#806600] focus-within:shadow-[0_0_0_3px_rgba(255,196,0,0.16)]">
              <input className="h-full min-w-0 flex-1 border-0 bg-transparent px-3.5 text-sm outline-none" type={showPassword ? "text" : "password"} autoComplete="current-password" required value={password} onChange={(event) => setPassword(event.target.value)} />
              <button className="grid size-11 cursor-pointer place-items-center border-0 bg-transparent text-[#77726b]" type="button" onClick={() => setShowPassword((current) => !current)} aria-label={showPassword ? "Թաքցնել գաղտնաբառը" : "Ցուցադրել գաղտնաբառը"}>
                {showPassword ? <EyeSlash size={20} /> : <Eye size={20} />}
              </button>
            </span>
          </label>
          {error ? <p className="m-0 rounded-[10px] border border-[#efc9c1] bg-[#fff4f1] px-3 py-2.5 text-[10px] font-bold leading-relaxed text-[#9c3424]" role="alert">{error}</p> : null}
          <button className="mt-1 inline-flex min-h-12 cursor-pointer items-center justify-center gap-2 rounded-[11px] border-0 bg-[#ffc400] px-5 text-sm font-black text-[#11110f] shadow-[0_9px_22px_rgba(255,196,0,0.2)] hover:bg-[#eaae00] disabled:cursor-wait disabled:opacity-60" type="submit" disabled={pending || !email.trim() || !password}>
            <LockKey size={20} weight="bold" />
            {pending ? "Ստուգվում է…" : "Մուտք գործել"}
          </button>
          <a className="mt-1 text-center text-[10px] font-bold text-[#716b62] hover:text-[#11110f]" href="/">← Վերադառնալ կայք</a>
        </form>
      </section>
    </main>
  );
}
