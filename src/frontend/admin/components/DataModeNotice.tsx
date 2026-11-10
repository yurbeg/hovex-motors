import { Database } from "@phosphor-icons/react";

type DataNoticeScope = "dashboard" | "requests" | "vehicles";

export function DataModeNotice({ scope }: { scope: DataNoticeScope }) {
  const copy = scope === "vehicles"
    ? {
        title: "Supabase մեքենաների բազա",
        text: "Փոփոխությունները պահվում են ամպային բազայում և հրապարակված մեքենաներն անմիջապես հասանելի են հանրային կայքին։",
      }
    : scope === "requests"
      ? {
          title: "Supabase հարցումների բազա",
          text: "Հարցումները պահվում են ամպային բազայում և հասանելի են միայն լիազորված ադմիններին։ Կարգավիճակի փոփոխություններն անմիջապես համաժամացվում են։",
        }
      : {
          title: "Supabase-ը միացված է",
          text: "Մեքենաներն ու հաճախորդների հարցումները բեռնվում են ամպային բազայից և համաժամացվում են ադմին վահանակի հետ։",
        };

  return (
    <div className="mb-[22px] flex items-center gap-[11px] rounded-xl border border-[var(--yellow-border)] bg-[var(--yellow-pale)] px-4 py-[13px] text-[var(--yellow-ink)] max-[700px]:items-start">
      <Database size={20} weight="fill" aria-hidden="true" />
      <p className="m-0 flex flex-wrap gap-x-[9px] gap-y-[5px] text-[11px] max-[700px]:grid">
        <strong>{copy.title}</strong>
        <span className="text-[var(--ink-soft)]">{copy.text}</span>
      </p>
    </div>
  );
}
