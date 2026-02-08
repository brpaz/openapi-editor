import { useCallback, useEffect, useSyncExternalStore } from "react";

export type Theme = "light" | "dark" | "system";

const STORAGE_KEY = "openapi-editor-theme";

function getSystemPreference(): "light" | "dark" {
  if (typeof window === "undefined") return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

function getStoredTheme(): Theme {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === "light" || stored === "dark" || stored === "system") {
      return stored;
    }
  } catch {
    /* noop */
  }
  return "system";
}

function resolveTheme(theme: Theme): "light" | "dark" {
  return theme === "system" ? getSystemPreference() : theme;
}

function applyTheme(resolved: "light" | "dark"): void {
  const root = document.documentElement;
  if (resolved === "dark") {
    root.classList.add("dark");
  } else {
    root.classList.remove("dark");
  }
}

let currentTheme: Theme = getStoredTheme();
const listeners = new Set<() => void>();

function subscribe(callback: () => void): () => void {
  listeners.add(callback);
  return () => listeners.delete(callback);
}

function getSnapshot(): Theme {
  return currentTheme;
}

function setTheme(theme: Theme): void {
  currentTheme = theme;
  try {
    localStorage.setItem(STORAGE_KEY, theme);
  } catch {
    /* noop */
  }
  applyTheme(resolveTheme(theme));
  for (const listener of listeners) {
    listener();
  }
}

if (typeof window !== "undefined") {
  applyTheme(resolveTheme(currentTheme));
}

export function useTheme() {
  const theme = useSyncExternalStore(subscribe, getSnapshot, () => "system" as Theme);

  useEffect(() => {
    const mql = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = () => {
      if (currentTheme === "system") {
        applyTheme(getSystemPreference());
      }
    };
    mql.addEventListener("change", handler);
    return () => mql.removeEventListener("change", handler);
  }, []);

  const toggleTheme = useCallback(() => {
    const resolved = resolveTheme(currentTheme);
    setTheme(resolved === "dark" ? "light" : "dark");
  }, []);

  const setThemeMode = useCallback((mode: Theme) => {
    setTheme(mode);
  }, []);

  return {
    theme,
    resolvedTheme: resolveTheme(theme),
    isDark: resolveTheme(theme) === "dark",
    toggleTheme,
    setTheme: setThemeMode,
  } as const;
}
