import assert from "node:assert/strict";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  createScrollRevealController,
  getScrollStaggerOffset,
  observeScrollRevealElement,
  Reveal,
  resolveScrollRevealVariant,
  type RevealIntersectionEntry,
  type ScrollRevealRuntime,
} from "../src/frontend/motion";

const emptyStyle = () => ({
  opacity: "",
  transform: "",
  transitionDelay: "",
  transitionDuration: "",
  transitionProperty: "",
  transitionTimingFunction: "",
  willChange: "",
});

class FakeElement {
  readonly nodeType = 1;
  readonly style = emptyStyle();
  readonly children: FakeElement[] = [];
  parentElement: FakeElement | null = null;
  private readonly attributes = new Map<string, string>();

  constructor(attributes: Record<string, string> = {}) {
    Object.entries(attributes).forEach(([name, value]) => this.attributes.set(name, value));
  }

  append(child: FakeElement): void {
    child.parentElement = this;
    this.children.push(child);
  }

  closest(selector: string): FakeElement | null {
    let current: FakeElement | null = this;
    while (current) {
      if (current.matches(selector)) return current;
      current = current.parentElement;
    }
    return null;
  }

  getAttribute(name: string): string | null {
    return this.attributes.get(name) ?? null;
  }

  matches(selector: string): boolean {
    const attributeName = /^\[([^\]]+)\]$/.exec(selector)?.[1];
    return attributeName ? this.attributes.has(attributeName) : false;
  }

  querySelectorAll(selector: string): FakeElement[] {
    return this.children.flatMap((child) => [
      ...(child.matches(selector) ? [child] : []),
      ...child.querySelectorAll(selector),
    ]);
  }

  removeAttribute(name: string): void {
    this.attributes.delete(name);
  }

  setAttribute(name: string, value: string): void {
    this.attributes.set(name, value);
  }
}

function asHtmlElement(element: FakeElement): HTMLElement {
  return element as unknown as HTMLElement;
}

function observerRuntime(reducedMotion = false) {
  const observers: Array<{
    callback: (entries: readonly RevealIntersectionEntry[]) => void;
    disconnected: boolean;
    targets: Set<Element>;
    unobserved: Set<Element>;
  }> = [];
  const scheduled: Array<{
    callback: () => void;
    cancelled: boolean;
    delay: number;
  }> = [];
  const reducedMotionListeners = new Set<(reduced: boolean) => void>();
  let prefersReducedMotion = reducedMotion;

  const runtime: ScrollRevealRuntime = {
    createIntersectionObserver(callback) {
      const observer = {
        callback,
        disconnected: false,
        targets: new Set<Element>(),
        unobserved: new Set<Element>(),
      };
      observers.push(observer);
      return {
        disconnect() {
          observer.disconnected = true;
        },
        observe(target) {
          observer.targets.add(target);
        },
        unobserve(target) {
          observer.targets.delete(target);
          observer.unobserved.add(target);
        },
      };
    },
    prefersReducedMotion: () => prefersReducedMotion,
    schedule(callback, delay) {
      const task = { callback, cancelled: false, delay };
      scheduled.push(task);
      return () => {
        task.cancelled = true;
      };
    },
    subscribeReducedMotion(callback) {
      reducedMotionListeners.add(callback);
      return () => reducedMotionListeners.delete(callback);
    },
  };

  return {
    observers,
    runtime,
    scheduled,
    setReducedMotion(reduced: boolean) {
      prefersReducedMotion = reduced;
      reducedMotionListeners.forEach((listener) => listener(reduced));
    },
  };
}

test("Reveal renders visible SSR markup so hydration and no-JS content remain safe", () => {
  const html = renderToStaticMarkup(
    <Reveal reveal="left" delay={90} duration={700} className="section">
      Բովանդակություն
    </Reveal>,
  );

  assert.match(html, /data-scroll-reveal="left"/);
  assert.match(html, /data-scroll-delay="90"/);
  assert.match(html, /data-scroll-duration="700"/);
  assert.doesNotMatch(html, /data-scroll-reveal-state/);
  assert.doesNotMatch(html, /opacity:\s*0/);
  assert.doesNotMatch(html, /translate3d|scale\(/);
});

test("variant and stagger helpers use safe defaults, numeric steps, and a capped delay", () => {
  assert.equal(resolveScrollRevealVariant("up"), "up");
  assert.equal(resolveScrollRevealVariant("left"), "left");
  assert.equal(resolveScrollRevealVariant("right"), "right");
  assert.equal(resolveScrollRevealVariant("scale"), "scale");
  assert.equal(resolveScrollRevealVariant("unexpected"), "up");

  assert.equal(getScrollStaggerOffset(2, ""), 140);
  assert.equal(getScrollStaggerOffset(3, "95"), 285);
  assert.equal(getScrollStaggerOffset(20, "70"), 420);
  assert.equal(getScrollStaggerOffset(2, "invalid"), 140);
  assert.equal(getScrollStaggerOffset(2, "true"), 140);
  assert.equal(getScrollStaggerOffset(3, "0"), 0);
});

test("all reveal variants prepare hidden styles and preserve existing inline styles on cleanup", () => {
  const variants = {
    left: "translate3d(-1.5rem, 0, 0)",
    right: "translate3d(1.5rem, 0, 0)",
    scale: "scale(0.965)",
    up: "translate3d(0, 1.5rem, 0)",
  } as const;

  Object.entries(variants).forEach(([variant, transform]) => {
    const element = new FakeElement({
      "data-scroll-delay": "85",
      "data-scroll-reveal": variant,
    });
    element.style.opacity = "0.9";
    const { runtime } = observerRuntime();
    const cleanup = observeScrollRevealElement(asHtmlElement(element), {}, runtime);

    assert.equal(element.getAttribute("data-scroll-reveal-state"), "hidden");
    assert.equal(element.style.opacity, "0");
    assert.equal(element.style.transform, transform);
    assert.equal(element.style.transitionDelay, "");
    assert.equal(element.style.transitionProperty, "");
    assert.equal(element.style.willChange, "");

    cleanup();
    assert.equal(element.style.opacity, "0.9");
    assert.equal(element.style.transform, "");
    assert.equal(element.getAttribute("data-scroll-reveal-state"), null);
  });
});

test("an intersecting element reveals exactly once and disconnects its observer", () => {
  const element = new FakeElement({ "data-scroll-reveal": "up" });
  const { observers, runtime } = observerRuntime();
  const cleanup = observeScrollRevealElement(asHtmlElement(element), {}, runtime);
  const observer = observers[0];
  const target = Array.from(observer?.targets ?? [])[0];

  assert.ok(target);
  observer.callback([{
    intersectionRatio: 1,
    isIntersecting: true,
    target,
  }]);

  assert.equal(element.getAttribute("data-scroll-reveal-state"), "visible");
  assert.equal(element.style.opacity, "");
  assert.equal(element.style.transform, "");
  assert.equal(observer.unobserved.has(target), true);
  assert.equal(observer.disconnected, true);

  observer.callback([{
    intersectionRatio: 1,
    isIntersecting: true,
    target,
  }]);
  assert.equal(element.getAttribute("data-scroll-reveal-state"), "visible");
  cleanup();
});

test("transition hints exist only while revealing and scheduled cleanup restores their snapshot", () => {
  const element = new FakeElement({
    "data-scroll-delay": "40",
    "data-scroll-reveal": "up",
  });
  element.style.transitionDelay = "12ms";
  element.style.transitionDuration = "150ms";
  element.style.transitionProperty = "color";
  element.style.transitionTimingFunction = "linear";
  element.style.willChange = "contents";
  const observed = observerRuntime();
  const cleanup = observeScrollRevealElement(asHtmlElement(element), {}, observed.runtime);
  const observer = observed.observers[0];
  const target = Array.from(observer?.targets ?? [])[0];

  assert.ok(target);
  assert.equal(element.style.willChange, "contents", "below-fold elements keep their original hint");
  assert.equal(element.style.transitionProperty, "color");
  observer.callback([{
    intersectionRatio: 1,
    isIntersecting: true,
    target,
  }]);

  assert.equal(element.style.transitionDelay, "40ms");
  assert.equal(element.style.transitionDuration, "620ms");
  assert.equal(element.style.transitionProperty, "opacity, transform");
  assert.equal(element.style.willChange, "opacity, transform");
  assert.equal(observed.scheduled.length, 1);
  assert.equal(observed.scheduled[0]?.delay, 700);

  observed.scheduled[0]?.callback();
  assert.equal(element.style.transitionDelay, "12ms");
  assert.equal(element.style.transitionDuration, "150ms");
  assert.equal(element.style.transitionProperty, "color");
  assert.equal(element.style.transitionTimingFunction, "linear");
  assert.equal(element.style.willChange, "contents");
  cleanup();
});

test("missing IntersectionObserver and reduced motion both keep content visible", () => {
  const noObserverElement = new FakeElement({ "data-scroll-reveal": "left" });
  const noObserverRuntime: ScrollRevealRuntime = {
    prefersReducedMotion: () => false,
    schedule: () => () => undefined,
  };
  observeScrollRevealElement(asHtmlElement(noObserverElement), {}, noObserverRuntime)();
  assert.equal(noObserverElement.getAttribute("data-scroll-reveal-state"), "visible");
  assert.equal(noObserverElement.style.opacity, "");
  assert.equal(noObserverElement.style.transform, "");

  const reducedElement = new FakeElement({ "data-scroll-reveal": "right" });
  const reduced = observerRuntime(true);
  observeScrollRevealElement(asHtmlElement(reducedElement), {}, reduced.runtime)();
  assert.equal(reducedElement.getAttribute("data-scroll-reveal-state"), "visible");
  assert.equal(reduced.observers.length, 0);
});

test("controller shares one observer, staggers groups, and observes async reveal elements", () => {
  const root = new FakeElement();
  const group = new FakeElement({ "data-scroll-stagger": "" });
  const first = new FakeElement({ "data-scroll-reveal": "up" });
  const second = new FakeElement({ "data-scroll-reveal": "up" });
  root.append(group);
  group.append(first);
  group.append(second);

  let mutationCallback: ((records: readonly MutationRecord[]) => void) | undefined;
  let mutationDisconnected = false;
  const observed = observerRuntime();
  const runtime: ScrollRevealRuntime = {
    ...observed.runtime,
    createMutationObserver(callback) {
      mutationCallback = callback;
      return {
        disconnect() {
          mutationDisconnected = true;
        },
        observe() {},
      };
    },
  };

  const controller = createScrollRevealController(
    root as unknown as ParentNode,
    {},
    runtime,
  ).start();

  assert.equal(observed.observers.length, 1);
  assert.equal(observed.observers[0]?.targets.size, 2);
  assert.equal(first.style.transitionDelay, "");
  assert.equal(second.style.transitionDelay, "");
  assert.equal(first.style.willChange, "");
  assert.equal(second.style.willChange, "");
  assert.ok(mutationCallback);

  const sharedObserver = observed.observers[0];
  sharedObserver?.callback([{
    intersectionRatio: 1,
    isIntersecting: true,
    target: asHtmlElement(second),
  }]);
  assert.equal(second.style.transitionDelay, "70ms");
  assert.equal(second.style.willChange, "opacity, transform");

  const third = new FakeElement({ "data-scroll-reveal": "scale" });
  group.append(third);
  mutationCallback?.([{
    addedNodes: [third] as unknown as NodeList,
    removedNodes: [] as unknown as NodeList,
  } as MutationRecord]);
  assert.equal(observed.observers.length, 1, "dynamic nodes reuse the controller observer");
  assert.equal(third.style.transitionDelay, "");
  assert.equal(third.getAttribute("data-scroll-reveal-state"), "hidden");
  sharedObserver?.callback([{
    intersectionRatio: 1,
    isIntersecting: true,
    target: asHtmlElement(third),
  }]);
  assert.equal(third.style.transitionDelay, "140ms");

  const attributeAddedLater = new FakeElement();
  group.append(attributeAddedLater);
  attributeAddedLater.setAttribute("data-scroll-reveal", "right");
  mutationCallback?.([{
    addedNodes: [] as unknown as NodeList,
    removedNodes: [] as unknown as NodeList,
    target: attributeAddedLater,
    type: "attributes",
  } as MutationRecord]);
  assert.equal(attributeAddedLater.style.transitionDelay, "");
  assert.equal(attributeAddedLater.getAttribute("data-scroll-reveal-state"), "hidden");
  assert.equal(observed.observers.length, 1);
  sharedObserver?.callback([{
    intersectionRatio: 1,
    isIntersecting: true,
    target: asHtmlElement(attributeAddedLater),
  }]);
  assert.equal(attributeAddedLater.style.transitionDelay, "210ms");

  controller.stop();
  assert.equal(mutationDisconnected, true);
  assert.equal(sharedObserver?.disconnected, true);
  assert.equal(third.style.opacity, "");
});

test("controller responds to reduced-motion changes and uses a fresh shared observer for new nodes", () => {
  const root = new FakeElement();
  const first = new FakeElement({ "data-scroll-reveal": "left" });
  const second = new FakeElement({ "data-scroll-reveal": "right" });
  root.append(first);
  root.append(second);
  const observed = observerRuntime();
  const controller = createScrollRevealController(
    root as unknown as ParentNode,
    { observeMutations: false },
    observed.runtime,
  ).start();

  assert.equal(observed.observers.length, 1);
  assert.equal(first.getAttribute("data-scroll-reveal-state"), "hidden");
  observed.observers[0]?.callback([{
    intersectionRatio: 1,
    isIntersecting: true,
    target: asHtmlElement(first),
  }]);
  assert.equal(first.style.willChange, "opacity, transform");
  observed.setReducedMotion(true);
  assert.equal(observed.observers[0]?.disconnected, true);
  assert.equal(first.getAttribute("data-scroll-reveal-state"), "visible");
  assert.equal(second.getAttribute("data-scroll-reveal-state"), "visible");
  assert.equal(first.style.opacity, "");
  assert.equal(first.style.willChange, "");

  observed.setReducedMotion(false);
  assert.equal(observed.observers.length, 2);
  const addedAfterPreferenceChange = new FakeElement({ "data-scroll-reveal": "scale" });
  root.append(addedAfterPreferenceChange);
  controller.refresh();
  assert.equal(observed.observers.length, 2);
  assert.equal(observed.observers[1]?.targets.has(asHtmlElement(addedAfterPreferenceChange)), true);
  assert.equal(addedAfterPreferenceChange.getAttribute("data-scroll-reveal-state"), "hidden");

  controller.stop();
});
