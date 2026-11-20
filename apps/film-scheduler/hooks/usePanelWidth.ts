import { useCallback, useSyncExternalStore } from "react";

// Panel widths persist in localStorage. useSyncExternalStore keeps the server
// render (and hydration) on the default width, then switches to the stored one.
const listeners = new Set<() => void>();

function subscribe(onChange: () => void) {
  listeners.add(onChange);
  window.addEventListener("storage", onChange);
  return () => {
    listeners.delete(onChange);
    window.removeEventListener("storage", onChange);
  };
}

function readWidth(key: string): number | null {
  try {
    const value = Number(localStorage.getItem(key));
    return Number.isFinite(value) && value > 0 ? value : null;
  } catch {
    return null;
  }
}

/** Returns the stored width (or `defaultWidth`) and a setter; `null` resets to the default. */
export function usePanelWidth(key: string, defaultWidth: number) {
  const stored = useSyncExternalStore(
    subscribe,
    () => readWidth(key),
    () => null,
  );

  const setWidth = useCallback(
    (width: number | null) => {
      try {
        if (width === null) localStorage.removeItem(key);
        else localStorage.setItem(key, String(Math.round(width)));
      } catch (error) {
        console.error("Error saving panel width:", error);
      }
      listeners.forEach((listener) => listener());
    },
    [key],
  );

  return [stored ?? defaultWidth, setWidth] as const;
}
