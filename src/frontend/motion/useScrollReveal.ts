import { useCallback, useEffect, useRef } from "react";
import {
  observeScrollRevealElement,
  type ScrollRevealOptions,
} from "./scrollReveal";

export function useScrollReveal<T extends HTMLElement = HTMLDivElement>(
  options: ScrollRevealOptions = {},
): (element: T | null) => void {
  const cleanupRef = useRef<(() => void) | null>(null);
  const optionsRef = useRef(options);
  optionsRef.current = options;

  const revealRef = useCallback((element: T | null) => {
    cleanupRef.current?.();
    cleanupRef.current = element
      ? observeScrollRevealElement(element, optionsRef.current)
      : null;
  }, []);

  useEffect(() => () => {
    cleanupRef.current?.();
    cleanupRef.current = null;
  }, []);

  return revealRef;
}
