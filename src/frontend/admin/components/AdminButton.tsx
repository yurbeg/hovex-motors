import type { ButtonHTMLAttributes, ReactNode } from "react";
import type { Icon } from "@phosphor-icons/react";
import type { AdminButtonVariant } from "../shared/adminTypes";
import { classNames } from "../shared/classNames";
import {
  buttonBaseClasses,
  buttonVariantClasses,
} from "../shared/styles";

interface AdminButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  icon?: Icon;
  variant?: AdminButtonVariant;
}

export function AdminButton({
  children,
  icon: IconComponent,
  variant = "primary",
  className = "",
  ...props
}: AdminButtonProps) {
  return (
    <button
      className={classNames(buttonBaseClasses, buttonVariantClasses[variant], className)}
      {...props}
    >
      {IconComponent ? <IconComponent size={19} weight="bold" aria-hidden="true" /> : null}
      <span>{children}</span>
    </button>
  );
}
