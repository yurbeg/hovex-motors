import { PaperPlaneTilt } from "@phosphor-icons/react";
import { useState } from "react";
import type { LeadActivity } from "../../../domain/lead";
import { AdminButton } from "../components/AdminButton";

export function LeadNoteComposer({
  pending,
  onAdd,
}: {
  pending: boolean;
  onAdd: (body: string) => Promise<LeadActivity | null>;
}) {
  const [body, setBody] = useState("");
  const normalized = body.trim();

  const submit = async () => {
    if (!normalized || pending) return;
    if (await onAdd(normalized)) setBody("");
  };

  return (
    <section className="rounded-[13px] border border-[#e0dcd4] bg-white p-4" aria-labelledby="internal-note-title">
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="m-0 text-xs" id="internal-note-title">Ներքին նշում</h3>
        <span className="text-[8px] font-bold text-[#8b6200]">Հաճախորդը սա չի տեսնում</span>
      </div>
      <label className="sr-only" htmlFor="lead-internal-note">Ներքին նշման տեքստ</label>
      <textarea
        className="min-h-[92px] w-full resize-y rounded-[10px] border border-[#d8d4cc] bg-white p-3 text-[10px] leading-[1.55] outline-none focus:border-[#806600] focus:shadow-[0_0_0_3px_rgba(255,196,0,0.16)]"
        id="lead-internal-note"
        maxLength={2000}
        value={body}
        onChange={(event) => setBody(event.target.value)}
        placeholder="Գրանցեք խոսակցության արդյունքը կամ հաջորդ քայլի մանրամասները…"
        disabled={pending}
        aria-describedby="lead-internal-note-help"
      />
      <div className="mt-2 flex items-center justify-between gap-3">
        <small className="text-[8px] text-[#68635c]" id="lead-internal-note-help">{body.length}/2000 · պահպանվում է պատմության մեջ</small>
        <AdminButton icon={PaperPlaneTilt} onClick={() => void submit()} disabled={pending || !normalized}>
          {pending ? "Պահվում է…" : "Ավելացնել"}
        </AdminButton>
      </div>
    </section>
  );
}
