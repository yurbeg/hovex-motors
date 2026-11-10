export type ScrollRevealVariant = "up" | "left" | "right" | "scale";

export const SCROLL_REVEAL_SELECTOR = "[data-scroll-reveal]";
export const SCROLL_STAGGER_SELECTOR = "[data-scroll-stagger]";
export const DEFAULT_SCROLL_REVEAL_VARIANT: ScrollRevealVariant = "up";
export const DEFAULT_SCROLL_REVEAL_DURATION = 620;
export const DEFAULT_SCROLL_STAGGER_STEP = 70;
export const DEFAULT_SCROLL_STAGGER_CAP = 420;

const DEFAULT_THRESHOLD = 0.14;
const DEFAULT_ROOT_MARGIN = "0px 0px -8% 0px";
const DEFAULT_EASING = "cubic-bezier(0.22, 1, 0.36, 1)";
const MAX_DELAY = 2_000;
const MAX_DURATION = 2_000;
const STATE_ATTRIBUTE = "data-scroll-reveal-state";

const hiddenTransforms: Record<ScrollRevealVariant, string> = {
  up: "translate3d(0, 1.5rem, 0)",
  left: "translate3d(-1.5rem, 0, 0)",
  right: "translate3d(1.5rem, 0, 0)",
  scale: "scale(0.965)",
};

export interface ScrollRevealOptions {
  variant?: ScrollRevealVariant;
  delay?: number;
  duration?: number;
  easing?: string;
  threshold?: number;
  rootMargin?: string;
}

export interface ScrollRevealControllerOptions extends ScrollRevealOptions {
  observeMutations?: boolean;
  selector?: string;
  staggerCap?: number;
  staggerStep?: number;
}

interface ResolvedScrollRevealOptions {
  delay: number;
  duration: number;
  easing: string;
  rootMargin: string;
  threshold: number;
  variant: ScrollRevealVariant;
}

export interface RevealIntersectionEntry {
  intersectionRatio: number;
  isIntersecting: boolean;
  target: Element;
}

export interface RevealIntersectionObserver {
  disconnect(): void;
  observe(target: Element): void;
  unobserve(target: Element): void;
}

export interface RevealMutationObserver {
  disconnect(): void;
  observe(target: Node, options: MutationObserverInit): void;
}

export interface ScrollRevealRuntime {
  createIntersectionObserver?: (
    callback: (entries: readonly RevealIntersectionEntry[]) => void,
    options: IntersectionObserverInit,
  ) => RevealIntersectionObserver;
  createMutationObserver?: (
    callback: (records: readonly MutationRecord[]) => void,
  ) => RevealMutationObserver;
  prefersReducedMotion(): boolean;
  schedule(callback: () => void, delay: number): () => void;
  subscribeReducedMotion?: (callback: (reduced: boolean) => void) => () => void;
}

interface InlineStyleSnapshot {
  opacity: string;
  transform: string;
  transitionDelay: string;
  transitionDuration: string;
  transitionProperty: string;
  transitionTimingFunction: string;
  willChange: string;
}

interface ActiveRegistration {
  animated: boolean;
  cleanup(): void;
  controllerManaged: boolean;
  references: number;
  reveal?: (immediate?: boolean) => void;
}

interface AcquiredRegistration {
  created: boolean;
  registration: ActiveRegistration;
  release(): void;
}

interface PreparedRevealElement {
  animated: boolean;
  cleanup(): void;
  reveal(immediate?: boolean): void;
}

const activeRegistrations = new WeakMap<HTMLElement, ActiveRegistration>();

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(Math.max(value, minimum), maximum);
}

function finiteNumber(value: string | null | undefined): number | null {
  if (value === null || value === undefined || value.trim() === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function resolveScrollRevealVariant(value: string | null | undefined): ScrollRevealVariant {
  return value === "left" || value === "right" || value === "scale" || value === "up"
    ? value
    : DEFAULT_SCROLL_REVEAL_VARIANT;
}

export function getScrollStaggerOffset(
  index: number,
  rawStep: string | null,
  defaultStep = DEFAULT_SCROLL_STAGGER_STEP,
  cap = DEFAULT_SCROLL_STAGGER_CAP,
): number {
  if (index <= 0) return 0;
  const parsedStep = finiteNumber(rawStep);
  const step = rawStep === "" || parsedStep === null
    ? defaultStep
    : clamp(parsedStep, 0, cap);
  return Math.min(index * step, Math.max(0, cap));
}

function readElementStaggerOffset(
  element: HTMLElement,
  selector: string,
  defaultStep: number,
  cap: number,
): number {
  const staggerContainer = element.closest<HTMLElement>(SCROLL_STAGGER_SELECTOR);
  if (!staggerContainer || staggerContainer === element) return 0;

  const revealElements = Array.from(staggerContainer.querySelectorAll<HTMLElement>(selector))
    .filter((candidate) => candidate.closest(SCROLL_STAGGER_SELECTOR) === staggerContainer);
  const index = revealElements.indexOf(element);
  if (index < 1) return 0;

  return getScrollStaggerOffset(
    index,
    staggerContainer.getAttribute("data-scroll-stagger"),
    defaultStep,
    cap,
  );
}

function resolveOptions(
  element: HTMLElement,
  options: ScrollRevealOptions,
  staggerOffset: number,
): ResolvedScrollRevealOptions {
  const attributeDelay = finiteNumber(element.getAttribute("data-scroll-delay")) ?? 0;
  const attributeDuration = finiteNumber(element.getAttribute("data-scroll-duration"));
  const requestedDelay = options.delay ?? attributeDelay;
  const requestedDuration = options.duration ?? attributeDuration ?? DEFAULT_SCROLL_REVEAL_DURATION;

  return {
    delay: clamp(requestedDelay + staggerOffset, 0, MAX_DELAY),
    duration: clamp(requestedDuration, 0, MAX_DURATION),
    easing: options.easing?.trim() || DEFAULT_EASING,
    rootMargin: options.rootMargin ?? DEFAULT_ROOT_MARGIN,
    threshold: clamp(options.threshold ?? DEFAULT_THRESHOLD, 0, 1),
    variant: options.variant ?? resolveScrollRevealVariant(element.getAttribute("data-scroll-reveal")),
  };
}

function snapshotInlineStyles(element: HTMLElement): InlineStyleSnapshot {
  return {
    opacity: element.style.opacity,
    transform: element.style.transform,
    transitionDelay: element.style.transitionDelay,
    transitionDuration: element.style.transitionDuration,
    transitionProperty: element.style.transitionProperty,
    transitionTimingFunction: element.style.transitionTimingFunction,
    willChange: element.style.willChange,
  };
}

function restoreMotionStyles(element: HTMLElement, snapshot: InlineStyleSnapshot): void {
  element.style.opacity = snapshot.opacity;
  element.style.transform = snapshot.transform;
}

function restoreTransitionStyles(element: HTMLElement, snapshot: InlineStyleSnapshot): void {
  element.style.transitionDelay = snapshot.transitionDelay;
  element.style.transitionDuration = snapshot.transitionDuration;
  element.style.transitionProperty = snapshot.transitionProperty;
  element.style.transitionTimingFunction = snapshot.transitionTimingFunction;
  element.style.willChange = snapshot.willChange;
}

function applyHiddenStyles(
  element: HTMLElement,
  snapshot: InlineStyleSnapshot,
  options: ResolvedScrollRevealOptions,
): void {
  const originalTransform = snapshot.transform && snapshot.transform !== "none"
    ? `${snapshot.transform} `
    : "";

  element.style.opacity = "0";
  element.style.transform = `${originalTransform}${hiddenTransforms[options.variant]}`;
  element.setAttribute(STATE_ATTRIBUTE, "hidden");
}

function markVisibleWithoutMotion(element: HTMLElement): void {
  element.setAttribute(STATE_ATTRIBUTE, "visible");
}

function createBrowserRuntime(): ScrollRevealRuntime {
  const browserWindow = typeof window === "undefined" ? undefined : window;
  const IntersectionObserverConstructor = browserWindow?.IntersectionObserver;
  const MutationObserverConstructor = browserWindow?.MutationObserver;
  let reducedMotionQuery: MediaQueryList | undefined;

  try {
    reducedMotionQuery = browserWindow?.matchMedia?.("(prefers-reduced-motion: reduce)");
  } catch {
    reducedMotionQuery = undefined;
  }

  return {
    createIntersectionObserver: IntersectionObserverConstructor
      ? (callback, options) => new IntersectionObserverConstructor(
        (entries) => callback(entries),
        options,
      )
      : undefined,
    createMutationObserver: MutationObserverConstructor
      ? (callback) => new MutationObserverConstructor((records) => callback(records))
      : undefined,
    prefersReducedMotion() {
      return reducedMotionQuery?.matches ?? false;
    },
    schedule(callback, delay) {
      if (!browserWindow) return () => undefined;
      const timer = browserWindow.setTimeout(callback, delay);
      return () => browserWindow.clearTimeout(timer);
    },
    subscribeReducedMotion: reducedMotionQuery
      ? (callback) => {
        const listener = (event: MediaQueryListEvent): void => callback(event.matches);
        reducedMotionQuery.addEventListener("change", listener);
        return () => reducedMotionQuery?.removeEventListener("change", listener);
      }
      : undefined,
  };
}

function prepareRevealElement(
  element: HTMLElement,
  options: ResolvedScrollRevealOptions,
  runtime: ScrollRevealRuntime,
  motionEnabled: boolean,
): PreparedRevealElement {
  if (element.getAttribute(STATE_ATTRIBUTE) === "visible") {
    return {
      animated: false,
      cleanup: () => undefined,
      reveal: () => undefined,
    };
  }

  if (!motionEnabled) {
    markVisibleWithoutMotion(element);
    return {
      animated: false,
      cleanup: () => undefined,
      reveal: () => undefined,
    };
  }

  const snapshot = snapshotInlineStyles(element);
  const originalState = element.getAttribute(STATE_ATTRIBUTE);
  let cancelTransitionCleanup: () => void = () => undefined;
  let disposed = false;
  let revealed = false;

  const reveal = (immediate = false): void => {
    if (disposed) return;
    if (revealed) {
      if (immediate) {
        cancelTransitionCleanup();
        restoreMotionStyles(element, snapshot);
        restoreTransitionStyles(element, snapshot);
      }
      return;
    }
    revealed = true;
    element.setAttribute(STATE_ATTRIBUTE, "visible");

    if (immediate) {
      restoreMotionStyles(element, snapshot);
      restoreTransitionStyles(element, snapshot);
      return;
    }

    element.style.transitionDelay = `${options.delay}ms`;
    element.style.transitionDuration = `${options.duration}ms`;
    element.style.transitionProperty = "opacity, transform";
    element.style.transitionTimingFunction = options.easing;
    element.style.willChange = "opacity, transform";
    restoreMotionStyles(element, snapshot);
    cancelTransitionCleanup = runtime.schedule(
      () => restoreTransitionStyles(element, snapshot),
      options.delay + options.duration + 40,
    );
  };

  applyHiddenStyles(element, snapshot, options);

  return {
    animated: true,
    cleanup() {
      if (disposed) return;
      disposed = true;
      cancelTransitionCleanup();
      restoreMotionStyles(element, snapshot);
      restoreTransitionStyles(element, snapshot);
      if (!revealed) {
        if (originalState === null) element.removeAttribute(STATE_ATTRIBUTE);
        else element.setAttribute(STATE_ATTRIBUTE, originalState);
      }
    },
    reveal,
  };
}

function acquireRegistration(
  element: HTMLElement,
  create: () => ActiveRegistration,
): AcquiredRegistration {
  const existing = activeRegistrations.get(element);
  const registration = existing ?? create();
  const created = !existing;
  if (created) activeRegistrations.set(element, registration);
  registration.references += 1;
  let released = false;

  return {
    created,
    registration,
    release() {
      if (released) return;
      released = true;
      registration.references -= 1;
      if (registration.references <= 0) {
        activeRegistrations.delete(element);
        registration.cleanup();
      }
    },
  };
}

function createStandaloneRegistration(
  element: HTMLElement,
  options: ResolvedScrollRevealOptions,
  runtime: ScrollRevealRuntime,
): ActiveRegistration {
  const canAnimate = !runtime.prefersReducedMotion() && Boolean(runtime.createIntersectionObserver);
  const prepared = prepareRevealElement(element, options, runtime, canAnimate);
  let observer: RevealIntersectionObserver | undefined;

  if (prepared.animated && runtime.createIntersectionObserver) {
    try {
      observer = runtime.createIntersectionObserver((entries) => {
        const entry = entries.find((candidate) => candidate.target === element);
        if (!entry || (!entry.isIntersecting && entry.intersectionRatio <= 0)) return;
        prepared.reveal();
        observer?.unobserve(element);
        observer?.disconnect();
      }, {
        rootMargin: options.rootMargin,
        threshold: options.threshold,
      });
      observer.observe(element);
    } catch {
      prepared.reveal(true);
    }
  }

  return {
    animated: prepared.animated,
    cleanup() {
      observer?.disconnect();
      prepared.cleanup();
    },
    controllerManaged: false,
    references: 0,
  };
}

export function observeScrollRevealElement(
  element: HTMLElement,
  options: ScrollRevealOptions = {},
  runtime: ScrollRevealRuntime = createBrowserRuntime(),
  staggerOffset?: number,
): () => void {
  const acquired = acquireRegistration(element, () => createStandaloneRegistration(
    element,
    resolveOptions(
      element,
      options,
      staggerOffset ?? readElementStaggerOffset(
        element,
        SCROLL_REVEAL_SELECTOR,
        DEFAULT_SCROLL_STAGGER_STEP,
        DEFAULT_SCROLL_STAGGER_CAP,
      ),
    ),
    runtime,
  ));
  return acquired.release;
}

function isHtmlElement(value: unknown): value is HTMLElement {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<HTMLElement>;
  return candidate.nodeType === 1
    && typeof candidate.getAttribute === "function"
    && typeof candidate.querySelectorAll === "function"
    && typeof candidate.matches === "function"
    && typeof candidate.style === "object";
}

function visitElementTree(
  value: unknown,
  selector: string,
  visitor: (element: HTMLElement) => void,
): void {
  if (!isHtmlElement(value)) return;
  if (value.matches(selector)) visitor(value);
  value.querySelectorAll<HTMLElement>(selector).forEach(visitor);
}

export class ScrollRevealController {
  private readonly registrations = new Map<HTMLElement, AcquiredRegistration>();
  private cancelReducedMotionSubscription: () => void = () => undefined;
  private intersectionObserver?: RevealIntersectionObserver;
  private mutationObserver?: RevealMutationObserver;
  private reducedMotion = false;
  private started = false;

  constructor(
    private readonly root: ParentNode,
    private readonly options: ScrollRevealControllerOptions = {},
    private readonly runtime: ScrollRevealRuntime = createBrowserRuntime(),
  ) {}

  start(): this {
    if (this.started) return this;
    this.started = true;
    this.reducedMotion = this.runtime.prefersReducedMotion();
    this.ensureIntersectionObserver();
    this.refresh();

    if (this.runtime.subscribeReducedMotion) {
      this.cancelReducedMotionSubscription = this.runtime.subscribeReducedMotion((reduced) => {
        this.handleReducedMotionChange(reduced);
      });
    }

    if (this.options.observeMutations !== false && this.runtime.createMutationObserver) {
      this.mutationObserver = this.runtime.createMutationObserver((records) => {
        records.forEach((record) => {
          if (record.type === "attributes" && isHtmlElement(record.target)) {
            if (record.target.matches(this.options.selector ?? SCROLL_REVEAL_SELECTOR)) {
              this.register(record.target);
            } else {
              this.unregister(record.target);
            }
            return;
          }
          record.removedNodes.forEach((node) => this.unregisterTree(node));
          record.addedNodes.forEach((node) => this.registerTree(node));
        });
      });
      this.mutationObserver.observe(this.root as Node, {
        attributeFilter: ["data-scroll-reveal"],
        attributes: true,
        childList: true,
        subtree: true,
      });
    }

    return this;
  }

  refresh(): void {
    const selector = this.options.selector ?? SCROLL_REVEAL_SELECTOR;
    visitElementTree(this.root, selector, (element) => this.register(element));
    this.root.querySelectorAll<HTMLElement>(selector).forEach((element) => this.register(element));
  }

  stop(): void {
    this.started = false;
    this.cancelReducedMotionSubscription();
    this.cancelReducedMotionSubscription = () => undefined;
    this.mutationObserver?.disconnect();
    this.mutationObserver = undefined;
    Array.from(this.registrations.keys()).forEach((element) => this.unregister(element));
    this.intersectionObserver?.disconnect();
    this.intersectionObserver = undefined;
  }

  private register(element: HTMLElement): void {
    if (this.registrations.has(element)) return;
    const selector = this.options.selector ?? SCROLL_REVEAL_SELECTOR;
    const staggerOffset = readElementStaggerOffset(
      element,
      selector,
      this.options.staggerStep ?? DEFAULT_SCROLL_STAGGER_STEP,
      this.options.staggerCap ?? DEFAULT_SCROLL_STAGGER_CAP,
    );
    const resolvedOptions = resolveOptions(element, this.options, staggerOffset);
    const acquired = acquireRegistration(element, () => {
      const prepared = prepareRevealElement(
        element,
        resolvedOptions,
        this.runtime,
        Boolean(this.intersectionObserver) && !this.reducedMotion,
      );
      return {
        animated: prepared.animated,
        cleanup: prepared.cleanup,
        controllerManaged: true,
        references: 0,
        reveal: prepared.reveal,
      };
    });
    this.registrations.set(element, acquired);

    if (
      acquired.created
      && acquired.registration.animated
      && acquired.registration.controllerManaged
      && this.intersectionObserver
    ) {
      try {
        this.intersectionObserver.observe(element);
      } catch {
        acquired.registration.reveal?.(true);
      }
    }
  }

  private registerTree(value: unknown): void {
    const selector = this.options.selector ?? SCROLL_REVEAL_SELECTOR;
    visitElementTree(value, selector, (element) => this.register(element));
  }

  private unregisterTree(value: unknown): void {
    visitElementTree(value, this.options.selector ?? SCROLL_REVEAL_SELECTOR, (element) => {
      this.unregister(element);
    });
  }

  private unregister(element: HTMLElement): void {
    const acquired = this.registrations.get(element);
    if (!acquired) return;
    if (acquired.created && acquired.registration.controllerManaged) {
      this.intersectionObserver?.unobserve(element);
      acquired.registration.reveal?.(true);
    }
    acquired.release();
    this.registrations.delete(element);
  }

  private ensureIntersectionObserver(): void {
    if (
      this.intersectionObserver
      || this.reducedMotion
      || !this.runtime.createIntersectionObserver
    ) return;

    try {
      this.intersectionObserver = this.runtime.createIntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting && entry.intersectionRatio <= 0) return;
          if (!isHtmlElement(entry.target)) return;
          const acquired = this.registrations.get(entry.target);
          if (
            !acquired?.created
            || !acquired.registration.animated
            || !acquired.registration.controllerManaged
          ) return;
          acquired.registration.reveal?.();
          this.intersectionObserver?.unobserve(entry.target);
        });
      }, {
        rootMargin: this.options.rootMargin ?? DEFAULT_ROOT_MARGIN,
        threshold: clamp(this.options.threshold ?? DEFAULT_THRESHOLD, 0, 1),
      });
    } catch {
      this.intersectionObserver = undefined;
    }
  }

  private handleReducedMotionChange(reduced: boolean): void {
    if (this.reducedMotion === reduced) return;
    this.reducedMotion = reduced;

    if (reduced) {
      this.intersectionObserver?.disconnect();
      this.intersectionObserver = undefined;
      this.registrations.forEach((acquired) => {
        if (
          acquired.created
          && acquired.registration.animated
          && acquired.registration.controllerManaged
        ) {
          acquired.registration.reveal?.(true);
        }
      });
      return;
    }

    this.ensureIntersectionObserver();
  }
}

export function createScrollRevealController(
  root: ParentNode,
  options: ScrollRevealControllerOptions = {},
  runtime: ScrollRevealRuntime = createBrowserRuntime(),
): ScrollRevealController {
  return new ScrollRevealController(root, options, runtime);
}

export function initializeScrollReveal(
  options: ScrollRevealControllerOptions = {},
): () => void {
  if (typeof document === "undefined") return () => undefined;
  const controller = createScrollRevealController(document, options).start();
  return () => controller.stop();
}
