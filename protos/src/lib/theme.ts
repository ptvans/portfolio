import { useLayoutEffect, useSyncExternalStore } from "react";

// Light / dark theme for the web apps. The choice persists in localStorage and
// is shared by every toggle on the page. Dark mode itself is CSS: `html.dark`
// re-points the palette (see scripts/gen-dark-theme.mjs). Only the web-app
// shells opt in, through useThemeScope, so the landing page and the mobile
// prototype always render light.

export type Theme = "light" | "dark";

const STORAGE_KEY = "brick-proto-theme";
const listeners = new Set<() => void>();

function read(): Theme {
  try {
    return localStorage.getItem(STORAGE_KEY) === "dark" ? "dark" : "light";
  } catch {
    return "light";
  }
}

let current: Theme = read();

export function setTheme(theme: Theme) {
  current = theme;
  try {
    localStorage.setItem(STORAGE_KEY, theme);
  } catch {
    // Storage blocked: the choice lasts for this page load only.
  }
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  // Keep tabs in step.
  const onStorage = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY) {
      current = read();
      listener();
    }
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

export function useTheme(): [Theme, (theme: Theme) => void] {
  const theme = useSyncExternalStore(subscribe, () => current);
  return [theme, setTheme];
}

// Applies the theme to <html> while the calling shell is mounted, and removes
// it on the way out (back to the landing page or into the mobile app).
export function useThemeScope() {
  const [theme] = useTheme();
  useLayoutEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    return () => document.documentElement.classList.remove("dark");
  }, [theme]);
}
