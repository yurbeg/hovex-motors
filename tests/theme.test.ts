import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ThemeToggle } from "../src/frontend/theme/ThemeToggle";
import {
  applyTheme,
  getStoredTheme,
  initializeTheme,
  resolveTheme,
  setTheme,
  THEME_COLORS,
  THEME_STORAGE_KEY,
} from "../src/frontend/theme/theme";

function replaceGlobal(name: "window" | "document", value: unknown): () => void {
  const previous = Object.getOwnPropertyDescriptor(globalThis, name);
  Object.defineProperty(globalThis, name, {
    configurable: true,
    writable: true,
    value,
  });

  return () => {
    if (previous) {
      Object.defineProperty(globalThis, name, previous);
    } else {
      Reflect.deleteProperty(globalThis, name);
    }
  };
}

function fakeDocument() {
  const root = {
    dataset: {} as Record<string, string>,
    style: { colorScheme: "" },
  };
  const meta = {
    content: "",
    setAttribute(name: string, value: string) {
      if (name === "content") this.content = value;
    },
  };
  const document = {
    documentElement: root,
    querySelector(selector: string) {
      return selector === 'meta[name="theme-color"]' ? meta : null;
    },
  } as unknown as Document;

  return { document, meta, root };
}

test("stored light or dark preference wins over the system preference", () => {
  assert.equal(resolveTheme("light", true), "light");
  assert.equal(resolveTheme("dark", false), "dark");
  assert.equal(resolveTheme(null, true), "dark");
  assert.equal(resolveTheme("unsupported", false), "light");
});

test("storage reads fail safely and applying a theme updates every browser surface", () => {
  const unavailableStorage = {
    getItem() {
      throw new Error("storage disabled");
    },
  };
  assert.equal(getStoredTheme(unavailableStorage), null);

  const { document, meta, root } = fakeDocument();
  applyTheme("dark", document);
  assert.equal(root.dataset.theme, "dark");
  assert.equal(root.style.colorScheme, "dark");
  assert.equal(meta.content, THEME_COLORS.dark);
});

test("theme synchronization follows other tabs and follows the system only without an explicit preference", () => {
  const values = new Map<string, string>([[THEME_STORAGE_KEY, "dark"]]);
  const storage = {
    getItem(key: string) {
      return values.get(key) ?? null;
    },
    setItem(key: string, value: string) {
      values.set(key, value);
    },
    removeItem(key: string) {
      values.delete(key);
    },
  } as unknown as Storage;

  const mediaListeners = new Set<(event: MediaQueryListEvent) => void>();
  const mediaQuery = {
    matches: false,
    addEventListener(_type: string, listener: (event: MediaQueryListEvent) => void) {
      mediaListeners.add(listener);
    },
    removeEventListener(_type: string, listener: (event: MediaQueryListEvent) => void) {
      mediaListeners.delete(listener);
    },
  } as unknown as MediaQueryList;
  const dispatchSystemTheme = (matches: boolean): void => {
    Object.defineProperty(mediaQuery, "matches", { configurable: true, value: matches });
    mediaListeners.forEach((listener) => listener({ matches } as MediaQueryListEvent));
  };

  const storageListeners = new Set<(event: StorageEvent) => void>();
  const fakeWindow = {
    localStorage: storage,
    matchMedia() {
      return mediaQuery;
    },
    addEventListener(type: string, listener: EventListenerOrEventListenerObject) {
      if (type === "storage" && typeof listener === "function") {
        storageListeners.add(listener as (event: StorageEvent) => void);
      }
    },
    removeEventListener(type: string, listener: EventListenerOrEventListenerObject) {
      if (type === "storage" && typeof listener === "function") {
        storageListeners.delete(listener as (event: StorageEvent) => void);
      }
    },
  } as unknown as Window;
  const dispatchStorage = (newValue: string | null): void => {
    storageListeners.forEach((listener) => listener({
      key: THEME_STORAGE_KEY,
      newValue,
    } as StorageEvent));
  };

  const { document, root } = fakeDocument();
  const restoreWindow = replaceGlobal("window", fakeWindow);
  const restoreDocument = replaceGlobal("document", document);
  const stop = initializeTheme();

  try {
    assert.equal(root.dataset.theme, "dark");

    dispatchSystemTheme(false);
    assert.equal(root.dataset.theme, "dark", "system changes must not override storage");

    values.delete(THEME_STORAGE_KEY);
    dispatchStorage(null);
    assert.equal(root.dataset.theme, "light");

    dispatchSystemTheme(true);
    assert.equal(root.dataset.theme, "dark", "system changes apply after preference removal");

    values.set(THEME_STORAGE_KEY, "light");
    dispatchStorage("light");
    dispatchSystemTheme(true);
    assert.equal(root.dataset.theme, "light", "another tab can set an explicit preference");
  } finally {
    stop();
    restoreDocument();
    restoreWindow();
  }
});

test("theme toggle exposes Armenian accessible state with moon and sun icons", () => {
  setTheme("light");
  const lightHtml = renderToStaticMarkup(React.createElement(ThemeToggle, {
    className: "header-theme-toggle",
  }));

  assert.match(lightHtml, /<button[^>]*type="button"/);
  assert.match(lightHtml, /aria-label="Միացնել մուգ թեման"/);
  assert.match(lightHtml, /aria-pressed="false"/);
  assert.match(lightHtml, /title="Միացնել մուգ թեման"/);
  assert.match(lightHtml, /data-theme-icon="moon"/);
  assert.match(lightHtml, /header-theme-toggle/);

  setTheme("dark");
  const darkHtml = renderToStaticMarkup(React.createElement(ThemeToggle));
  assert.match(darkHtml, /aria-label="Միացնել բաց թեման"/);
  assert.match(darkHtml, /aria-pressed="true"/);
  assert.match(darkHtml, /title="Միացնել բաց թեման"/);
  assert.match(darkHtml, /data-theme-icon="sun"/);
  setTheme("light");
});

test("index bootstrap resolves and applies the theme before the application module", () => {
  const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");
  const bootstrapPosition = html.indexOf("const storageKey = \"hovex-theme\"");
  const applicationPosition = html.indexOf('src="/src/main.tsx"');

  assert.ok(bootstrapPosition >= 0);
  assert.ok(applicationPosition > bootstrapPosition);
  assert.match(html, /root\.dataset\.theme = theme/);
  assert.match(html, /root\.style\.colorScheme = theme/);
  assert.match(html, /meta\[name="theme-color"\]/);
});
