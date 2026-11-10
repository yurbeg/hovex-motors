import type { HTMLAttributes, ReactNode } from "react";
import { useScrollReveal } from "./useScrollReveal";
import type { ScrollRevealOptions, ScrollRevealVariant } from "./scrollReveal";

export interface RevealProps extends Omit<HTMLAttributes<HTMLDivElement>, "children"> {
  children: ReactNode;
  delay?: number;
  duration?: number;
  reveal?: ScrollRevealVariant;
  threshold?: ScrollRevealOptions["threshold"];
}

export function Reveal({
  children,
  delay,
  duration,
  reveal = "up",
  threshold,
  ...props
}: RevealProps) {
  const revealRef = useScrollReveal<HTMLDivElement>({
    delay,
    duration,
    threshold,
    variant: reveal,
  });

  return (
    <div
      {...props}
      ref={revealRef}
      data-scroll-delay={delay}
      data-scroll-duration={duration}
      data-scroll-reveal={reveal}
    >
      {children}
    </div>
  );
}
