import { CheckCircle } from "@phosphor-icons/react";

export function AdminToast({ message }: { message: string }) {
  if (!message) return null;

  return (
    <div
      className="fixed bottom-6 right-6 z-[140] flex min-h-12 items-center gap-[9px] rounded-[11px] bg-[#171714] px-[17px] text-[10px] font-extrabold text-white shadow-[0_14px_36px_rgba(17,17,15,0.24)] [animation:admin-toast-in_180ms_ease_both] max-[430px]:bottom-3 max-[430px]:left-3 max-[430px]:right-3 [&>svg]:text-[#ffc400]"
      role="status"
    >
      <CheckCircle size={20} weight="fill" />
      {message}
    </div>
  );
}
