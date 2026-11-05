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
          title: "Հարցումները դեռ ցուցադրական են",
          text: "Այս փուլում հաճախորդների հարցումները պահվում են միայն այս դիտարկիչում։ Հաջորդ փուլում դրանք ևս կտեղափոխենք Supabase։",
        }
      : {
          title: "Supabase-ը միացված է",
          text: "Մեքենաները համաժամացվում են ամպային բազայի հետ, իսկ հարցումները դեռ աշխատում են տեղային demo ռեժիմով։",
        };

  return (
    <div className="mb-[22px] flex items-center gap-[11px] rounded-xl border border-[#dfd6bd] bg-[#fffaf0] px-4 py-[13px] text-[#7e6200] max-[700px]:items-start">
      <Database size={20} weight="fill" aria-hidden="true" />
      <p className="m-0 flex flex-wrap gap-x-[9px] gap-y-[5px] text-[11px] max-[700px]:grid">
        <strong>{copy.title}</strong>
        <span className="text-[#777067]">{copy.text}</span>
      </p>
    </div>
  );
}
