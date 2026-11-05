import type {
  AdminButtonVariant,
  StatTone,
  StatusTone,
} from "./adminTypes";

export const buttonBaseClasses = "inline-flex min-h-[46px] cursor-pointer items-center justify-center gap-2 rounded-[11px] border border-transparent px-[18px] font-extrabold leading-[1.15] transition duration-150 hover:-translate-y-px disabled:cursor-wait disabled:opacity-55 disabled:hover:translate-y-0";

export const buttonVariantClasses: Record<AdminButtonVariant, string> = {
  primary: "bg-[#ffc400] text-[#11110f] shadow-[0_8px_20px_rgba(255,196,0,0.18)] hover:bg-[#eaae00]",
  secondary: "bg-[#11110f] text-white",
  ghost: "border-[#d9d4cb] bg-white text-[#11110f]",
  danger: "border-[#f0cbc2] bg-[#fff5f2] text-[#a53624]",
};

export const statusToneClasses: Record<StatusTone, string> = {
  green: "bg-[#e8f6eb] text-[#24733a]",
  blue: "bg-[#e7f2fb] text-[#216d9f]",
  yellow: "bg-[#fff3c7] text-[#846500]",
  orange: "bg-[#fff0df] text-[#ad5c14]",
  gray: "bg-[#efede9] text-[#6d6963]",
};

export const statToneClasses: Record<StatTone, string> = {
  yellow: "bg-[#fff1bb] text-[#8b6900]",
  blue: "bg-[#e7f2fb] text-[#226d9e]",
  orange: "bg-[#fff0df] text-[#b96112]",
  ink: "bg-[#eceae5] text-[#11110f]",
};

export const pageHeadingClasses = "mb-[25px] flex items-end justify-between gap-6 max-[700px]:items-start max-[430px]:gap-2.5";
export const pageHeadingButtonClasses = "max-[700px]:min-w-[46px] max-[700px]:px-[13px] max-[700px]:[&>span]:hidden";
export const eyebrowClasses = "m-0 text-[10px] font-black uppercase tracking-[0.12em] text-[#8a6b00]";
export const panelClasses = "min-w-0 overflow-hidden rounded-[17px] border border-[#e0dcd4] bg-white shadow-[0_10px_32px_rgba(26,24,19,0.045)]";
export const panelHeaderClasses = "flex min-h-[76px] items-center justify-between gap-[15px] border-b border-[#eeeae3] px-5 py-[17px] max-[430px]:px-[15px]";
export const toolbarClasses = "flex min-h-[72px] items-center gap-3 border-b border-[#eeeae3] bg-[#fdfcf9] px-4 py-[13px] max-[700px]:flex-wrap max-[700px]:items-stretch";
export const searchClasses = "flex min-h-[43px] w-[min(400px,44%)] items-center gap-[9px] rounded-[10px] border border-[#dad6ce] bg-white px-[13px] text-[#7b766f] focus-within:border-[#856b0c] focus-within:shadow-[0_0_0_3px_rgba(255,196,0,0.14)] max-[700px]:w-full [&>input]:w-full [&>input]:border-0 [&>input]:bg-transparent [&>input]:text-[11px] [&>input]:outline-none";
export const filterClasses = "flex min-h-[43px] items-center gap-2 rounded-[10px] border border-[#dad6ce] bg-white py-0 pl-[13px] pr-2.5 focus-within:border-[#856b0c] focus-within:shadow-[0_0_0_3px_rgba(255,196,0,0.14)] max-[700px]:flex-1 [&>span]:text-[9px] [&>span]:font-bold [&>span]:text-[#8b867e] [&>select]:border-0 [&>select]:bg-transparent [&>select]:text-[10px] [&>select]:font-extrabold [&>select]:text-[#26241f] [&>select]:outline-none";
export const tableClasses = "w-full border-collapse text-left max-[700px]:block max-[700px]:[&_tbody]:block max-[700px]:[&_thead]:hidden max-[700px]:[&_tr]:block max-[700px]:[&_tr]:w-full max-[700px]:[&_tbody_tr]:border-b max-[700px]:[&_tbody_tr]:border-[#e7e2da] max-[700px]:[&_tbody_tr]:px-3.5 max-[700px]:[&_tbody_tr]:py-3";
export const tableHeadClasses = "h-[43px] whitespace-nowrap border-b border-[#eeeae3] bg-[#fbfaf8] px-4 py-0 text-[9px] font-black uppercase tracking-[0.045em] text-[#8b867e]";
export const tableCellClasses = "h-[72px] min-w-28 border-b border-[#f0ede8] px-4 py-[11px] align-middle text-[11px] [&>strong]:mb-1 [&>strong]:block [&>strong]:text-[11px] [&>strong]:leading-[1.3] [&>span]:block [&>span]:max-w-[220px] [&>span]:overflow-hidden [&>span]:text-ellipsis [&>span]:whitespace-nowrap [&>span]:text-[9px] [&>span]:leading-[1.35] [&>span]:text-[#817c74] max-[700px]:grid max-[700px]:h-auto max-[700px]:min-h-[35px] max-[700px]:w-full max-[700px]:min-w-0 max-[700px]:grid-cols-[110px_1fr] max-[700px]:items-center max-[700px]:border-0 max-[700px]:px-0 max-[700px]:py-[7px] max-[700px]:text-right max-[700px]:before:text-left max-[700px]:before:text-[8px] max-[700px]:before:font-extrabold max-[700px]:before:text-[#8c877f] max-[700px]:before:content-[attr(data-label)] max-[700px]:[&>*]:col-start-2 max-[700px]:[&>*]:justify-self-end max-[700px]:[&>span]:max-w-[210px]";
export const rowActionClasses = "grid size-9 cursor-pointer place-items-center rounded-[9px] border border-[#ddd8d0] bg-white text-[#3d3a35] hover:border-[#b99b33] hover:bg-[#fffbec] max-[700px]:mt-[-37px]";
export const formControlClasses = "h-[43px] w-full rounded-[9px] border border-[#d8d4cc] bg-white px-[11px] text-[10px] text-[#26241f] outline-none focus:border-[#806600] focus:shadow-[0_0_0_3px_rgba(255,196,0,0.16)]";
export const formLabelClasses = "grid gap-1.5 [&>span]:text-[9px] [&>span]:font-extrabold [&>span]:text-[#5f5b55] [&>small]:text-[8px] [&>small]:text-[#aa3825]";
export const formFieldsetClasses = "m-0 border-0 border-t border-[#e7e2d9] bg-white p-5 [&>legend]:mb-[15px] [&>legend]:w-full [&>legend]:p-0 [&>legend]:text-[13px] [&>legend]:font-black";
export const detailSectionClasses = "rounded-[13px] border border-[#e0dcd4] bg-white p-4";
export const detailListClasses = "m-0 grid [&>div]:grid [&>div]:min-h-[38px] [&>div]:grid-cols-[125px_1fr] [&>div]:items-center [&>div]:border-b [&>div]:border-[#eeeae3] [&>div:last-child]:border-b-0 [&_dt]:text-[9px] [&_dt]:text-[#817c74] [&_dd]:m-0 [&_dd]:text-right [&_dd]:text-[10px] [&_dd]:font-bold max-[430px]:[&>div]:grid-cols-1 max-[430px]:[&>div]:gap-0.5 max-[430px]:[&>div]:py-[7px] max-[430px]:[&_dd]:text-left";
