import { useSyncExternalStore } from "react";

export type Theme = "light" | "dark";

export const THEME_STORAGE_KEY = "hovex-theme";
export const THEME_MEDIA_QUERY = "(prefers-color-scheme: dark)";
export const THEME_COLORS: Record<Theme, string> = {
  light: "#faf8f4",
  dark: "#11110f",
};

const listeners = new Set<() => void>();

function parseTheme(value: unknown): Theme | null {
  return value === "light" || value === "dark" ? value : null;
}

function browserWindow(): Window | null {
  return typeof window === "undefined" ? null : window;
}

function browserDocument(): Document | null {
  return typeof document === "undefined" ? null : document;
}

function localStorageOrNull(): Storage | null {
  try {
    return browserWindow()?.localStorage ?? null;
  } catch {
    return null;
  }
}

function mediaQueryOrNull(): MediaQueryList | null {
  const targetWindow = browserWindow();

  try {
    return typeof targetWindow?.matchMedia === "function"
      ? targetWindow.matchMedia(THEME_MEDIA_QUERY)
      : null;
  } catch {
    return null;
  }
}

function mediaQueryPrefersDark(mediaQuery: MediaQueryList | null): boolean {
  try {
    return mediaQuery?.matches === true;
  } catch {
    return false;
  }
}

function documentTheme(): Theme {
  try {
    return parseTheme(browserDocument()?.documentElement.dataset.theme) ?? "light";
  } catch {
    return "light";
  }
}

let currentTheme: Theme = documentTheme();
let explicitPreference: Theme | null = null;
let activeMediaQuery: MediaQueryList | null = null;
let stopThemeSync: (() => void) | null = null;

export function resolveTheme(
  storedTheme: unknown,
  prefersDark: boolean,
): Theme {
  return parseTheme(storedTheme) ?? (prefersDark ? "dark" : "light");
}

export function getStoredTheme(
  storage: Pick<Storage, "getItem"> | null = localStorageOrNull(),
): Theme | null {
  try {
    return parseTheme(storage?.getItem(THEME_STORAGE_KEY));
  } catch {
    return null;
  }
}

export function applyTheme(
  theme: Theme,
  targetDocument: Document | null = browserDocument(),
): void {
  if (!targetDocument) return;

  try {
    targetDocument.documentElement.dataset.theme = theme;
    targetDocument.documentElement.style.colorScheme = theme;
    targetDocument
      .querySelector<HTMLMetaElement>('meta[name="theme-color"]')
      ?.setAttribute("content", THEME_COLORS[theme]);
  } catch {
    // The theme must never prevent the application from mounting.
  }
}

function publishTheme(theme: Theme): void {
  const changed = theme !== currentTheme;
  currentTheme = theme;
  applyTheme(theme);

  if (changed) {
    listeners.forEach((listener) => listener());
  }
}

function addMediaQueryListener(
  mediaQuery: MediaQueryList,
  listener: (event: MediaQueryListEvent) => void,
): () => void {
  try {
    if (typeof mediaQuery.addEventListener === "function") {
      mediaQuery.addEventListener("change", listener);
      return () => {
        try {
          mediaQuery.removeEventListener("change", listener);
        } catch {
          // Ignore browser teardown failures.
        }
      };
    }

    if (typeof mediaQuery.addListener === "function") {
      mediaQuery.addListener(listener);
      return () => {
        try {
          mediaQuery.removeListener(listener);
        } catch {
          // Ignore browser teardown failures.
        }
      };
    }
  } catch {
    // Older or privacy-restricted browsers may reject media listeners.
  }

  return () => {};
}

export function initializeTheme(): () => void {
  if (stopThemeSync) {
    applyTheme(currentTheme);
    return stopThemeSync;
  }

  explicitPreference = getStoredTheme();
  activeMediaQuery = mediaQueryOrNull();
  publishTheme(resolveTheme(
    explicitPreference,
    mediaQueryPrefersDark(activeMediaQuery),
  ));

  const handleSystemThemeChange = (event: MediaQueryListEvent): void => {
    if (explicitPreference === null) {
      publishTheme(event.matches ? "dark" : "light");
    }
  };

  const removeMediaQueryListener = activeMediaQuery
    ? addMediaQueryListener(activeMediaQuery, handleSystemThemeChange)
    : () => {};

  const targetWindow = browserWindow();
  const handleStorage = (event: StorageEvent): void => {
    if (event.key !== THEME_STORAGE_KEY && event.key !== null) return;

    explicitPreference = event.key === THEME_STORAGE_KEY
      ? parseTheme(event.newValue)
      : getStoredTheme();
    publishTheme(resolveTheme(
      explicitPreference,
      mediaQueryPrefersDark(activeMediaQuery),
    ));
  };

  try {
    targetWindow?.addEventListener("storage", handleStorage);
  } catch {
    // Storage synchronization is an enhancement, not a mount requirement.
  }

  const stop = (): void => {
    removeMediaQueryListener();

    try {
      targetWindow?.removeEventListener("storage", handleStorage);
    } catch {
      // Ignore browser teardown failures.
    }

    activeMediaQuery = null;
    if (stopThemeSync === stop) stopThemeSync = null;
  };

  stopThemeSync = stop;
  return stop;
}

export function setThemePreference(theme: Theme | null): void {
  explicitPreference = theme;

  try {
    const storage = localStorageOrNull();
    if (theme === null) {
      storage?.removeItem(THEME_STORAGE_KEY);
    } else {
      storage?.setItem(THEME_STORAGE_KEY, theme);
    }
  } catch {
    // Keep the in-memory selection when storage is unavailable.
  }

  publishTheme(resolveTheme(
    theme,
    mediaQueryPrefersDark(activeMediaQuery ?? mediaQueryOrNull()),
  ));
}

export function setTheme(theme: Theme): void {
  setThemePreference(theme);
}

export function clearThemePreference(): void {
  setThemePreference(null);
}

export function toggleTheme(): void {
  setTheme(currentTheme === "dark" ? "light" : "dark");
}

export function getTheme(): Theme {
  return currentTheme;
}

export function subscribeTheme(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useTheme(): Theme {
  return useSyncExternalStore(subscribeTheme, getTheme, getTheme);
}
