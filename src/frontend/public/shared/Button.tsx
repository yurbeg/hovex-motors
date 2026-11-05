import type { ButtonHTMLAttributes, ReactNode } from "react";
import type { Icon } from "@phosphor-icons/react";
import { classNames } from "./utils";

type ButtonVariant = "primary" | "secondary" | "ghost" | "light";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: ButtonVariant;
  icon?: Icon;
}

const buttonVariantClasses: Record<ButtonVariant, string> = {
  primary: "bg-[var(--yellow)] text-[var(--ink)] hover:bg-[var(--yellow-hover)]",
  secondary: "bg-[var(--ink)] text-white hover:bg-[#2a2926]",
  ghost: "border-[var(--border)] bg-transparent text-[var(--ink)] hover:border-[var(--ink)] hover:bg-[var(--surface)]",
  light: "bg-white text-[var(--ink)] hover:bg-[var(--yellow-pale)]",
};

export function Button({ children, variant = "primary", className = "", icon: Icon, ...props }: ButtonProps) {
  return (
    <button className={classNames("inline-flex min-h-12 cursor-pointer items-center justify-center gap-[9px] rounded-xl border border-transparent px-[21px] leading-[1.15] font-bold transition-[background,border-color,color,transform] duration-150 hover:-translate-y-px active:translate-y-0 disabled:cursor-wait disabled:opacity-72 disabled:[&_svg]:animate-spin motion-reduce:transition-none disabled:motion-reduce:[&_svg]:animate-none", buttonVariantClasses[variant], className)} {...props}>
      {Icon ? <Icon size={20} weight="bold" aria-hidden="true" /> : null}
      <span>{children}</span>
    </button>
  );
}
