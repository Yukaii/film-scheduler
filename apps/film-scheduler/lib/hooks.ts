import { useState, useCallback, useSyncExternalStore, type SetStateAction } from "react";
import { loadSessionIdsFromUrl } from "@/lib/utils";
import { Session } from "@/components/types";

export function useToggle(defaultValue = false) {
  const [open, setOpen] = useState(defaultValue);
  const toggle = () => setOpen((o) => !o);

  return {
    open,
    setOpen,
    toggle,
  };
}

// Function to dehydrate the state before storing it in localStorage
function dehydrate<T>(value: T): string {
  return JSON.stringify(value, (_, val) => {
    if (val instanceof Set) {
      return { dataType: "Set", value: Array.from(val) }; // Convert Set to an array
    }
    if (val instanceof Date) {
      return { dataType: "Date", value: val.toISOString() }; // Convert Date to ISO string
    }
    return val;
  });
}

// Function to rehydrate the state when loading it from localStorage
function rehydrate<T>(value: string): T {
  return JSON.parse(value, (_, val) => {
    if (val && val.dataType === "Set") {
      return new Set(val.value); // Convert back to Set
    }
    if (val && val.dataType === "Date") {
      return new Date(val.value); // Convert back to Date
    }
    return val;
  });
}

// localStorage-backed state, read through useSyncExternalStore so the server
// render and the first client render agree (both use the default value) and
// the stored value takes over right after hydration. Parsed values are cached
// by their raw string so every read of an unchanged key returns the same
// object, which useSyncExternalStore requires.
const storageListeners = new Map<string, Set<() => void>>();
const storageCache = new Map<string, { raw: string | null; value: unknown }>();

function readStored<T>(key: string, fallback: T): T {
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(key);
  } catch (error) {
    console.error("Error loading from localStorage:", error);
  }
  const cached = storageCache.get(key);
  if (cached && cached.raw === raw) return cached.value as T;

  let value = fallback;
  if (raw) {
    try {
      value = rehydrate<T>(raw);
    } catch (error) {
      console.error(`Error parsing localStorage key "${key}":`, error);
    }
  }
  storageCache.set(key, { raw, value });
  return value;
}

export function useLocalStorageState<T>(key: string, defaultValue: T) {
  // Pin the first default so callers can pass a fresh literal (e.g. []) each render
  const [fallback] = useState(defaultValue);

  const subscribe = useCallback(
    (listener: () => void) => {
      const listeners = storageListeners.get(key) ?? new Set<() => void>();
      listeners.add(listener);
      storageListeners.set(key, listeners);
      // Also pick up changes made in other tabs
      const onStorage = (e: StorageEvent) => {
        if (e.key === key) listener();
      };
      window.addEventListener("storage", onStorage);
      return () => {
        listeners.delete(listener);
        window.removeEventListener("storage", onStorage);
      };
    },
    [key],
  );

  const state = useSyncExternalStore(
    subscribe,
    () => readStored(key, fallback),
    () => fallback,
  );

  const setState = useCallback(
    (action: SetStateAction<T>) => {
      const prev = readStored(key, fallback);
      const next =
        typeof action === "function" ? (action as (prev: T) => T)(prev) : action;
      try {
        const raw = dehydrate(next);
        localStorage.setItem(key, raw);
        storageCache.set(key, { raw, value: next });
      } catch (error) {
        console.error("Error saving to localStorage:", error);
        // Keep the change in memory for this visit even though it couldn't persist
        storageCache.set(key, { raw: storageCache.get(key)?.raw ?? null, value: next });
      }
      storageListeners.get(key)?.forEach((listener) => listener());
    },
    [key, fallback],
  );

  return [state, setState] as const;
}

// Hook to check if URL has session info, extract it, and manage the import modal state
export function useSessionImport(availableSessions: Session[]) {
  const [importSessions, setImportSessions] = useState<Session[]>([]);
  const { open: importModalOpen, setOpen: setImportModalOpen } =
    useToggle(false);

  // Whenever the available sessions change (e.g. films finished loading), check
  // the URL for shared session ids. Adjusting state during render instead of in
  // an effect avoids an extra render pass:
  // https://react.dev/learn/you-might-not-need-an-effect#adjusting-some-state-when-a-prop-changes
  const [checkedSessions, setCheckedSessions] = useState<Session[] | null>(null);
  if (checkedSessions !== availableSessions) {
    setCheckedSessions(availableSessions);
    const sessionsFromUrl =
      typeof window === "undefined" ? [] : loadSessionIdsFromUrl(availableSessions);
    if (sessionsFromUrl.length > 0) {
      setImportSessions(sessionsFromUrl);
      setImportModalOpen(true); // Open modal if there are valid sessions to import
    }
  }

  // Close the modal and reset the import sessions
  const closeImportModal = () => {
    setImportModalOpen(false);
    setImportSessions([]);

    // Clean the URL query params after extracting sessions
    const url = new URL(window.location.href);
    url.searchParams.delete("sessions");
    window.history.replaceState({}, document.title, url.toString());
  };

  const openImportModal = () => setImportModalOpen(true);

  return {
    importSessions,
    setImportSessions,
    importModalOpen,
    closeImportModal,
    openImportModal,
  };
}

const ONBOARDING_KEY = "hasViewedOnboarding";
const onboardingListeners = new Set<() => void>();

function subscribeOnboarding(listener: () => void) {
  onboardingListeners.add(listener);
  // Also pick up changes made in other tabs
  window.addEventListener("storage", listener);
  return () => {
    onboardingListeners.delete(listener);
    window.removeEventListener("storage", listener);
  };
}

const getOnboardingStatus = () => localStorage.getItem(ONBOARDING_KEY) === "true";

export function useOnboardingStatus() {
  const hasViewedOnboarding = useSyncExternalStore(
    subscribeOnboarding,
    getOnboardingStatus,
    // Assume "viewed" while server rendering and hydrating, so returning visitors
    // don't get the tutorial; first-time visitors see it right after hydration.
    () => true,
  );

  const markOnboardingAsViewed = () => {
    localStorage.setItem(ONBOARDING_KEY, "true");
    onboardingListeners.forEach((listener) => listener());
  };

  return { hasViewedOnboarding, markOnboardingAsViewed };
}
