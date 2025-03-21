import { useState, useEffect, useCallback } from "react";
import { Session } from "@/components/types";

export function useToggle(initialState = false) {
  const [open, setOpen] = useState(initialState);
  const toggle = useCallback(() => setOpen((state) => !state), []);
  return { open, setOpen, toggle };
}

export function useOnboardingStatus() {
  const [hasViewedOnboarding, setHasViewedOnboarding] = useState(false);

  useEffect(() => {
    // Only access localStorage on the client side
    if (typeof window !== 'undefined') {
      const storedValue = localStorage.getItem("hasViewedOnboarding");
      setHasViewedOnboarding(storedValue === "true");
    }
  }, []);

  const markOnboardingAsViewed = useCallback(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem("hasViewedOnboarding", "true");
      setHasViewedOnboarding(true);
    }
  }, []);

  return { hasViewedOnboarding, markOnboardingAsViewed };
}

export function useSessionImport(_availableSessions: Session[]) {
  const [importSessions, setImportSessions] = useState<Session[]>([]);
  const [importModalOpen, setImportModalOpen] = useState(false);

  const openImportModal = useCallback(() => {
    setImportModalOpen(true);
  }, []);

  const closeImportModal = useCallback(() => {
    setImportModalOpen(false);
    setImportSessions([]);
  }, []);

  return {
    importSessions,
    setImportSessions,
    importModalOpen,
    openImportModal,
    closeImportModal,
  };
}

export function useLocalStorageState<T>(key: string, initialValue: T) {
  // Initialize state with initialValue
  const [storedValue, setStoredValue] = useState<T>(initialValue);

  // Load the stored value from localStorage on component mount
  useEffect(() => {
    try {
      if (typeof window !== 'undefined') {
        const item = localStorage.getItem(key);
        if (item) {
          setStoredValue(JSON.parse(item));
        }
      }
    } catch (error) {
      console.error("Error loading from localStorage:", error);
    }
  }, [key]);

  // Return a wrapped version of useState's setter function that
  // persists the new value to localStorage
  const setValue = useCallback(
    (value: T | ((val: T) => T)) => {
      try {
        // Allow value to be a function so we have the same API as useState
        const valueToStore =
          value instanceof Function ? value(storedValue) : value;
        
        // Save state
        setStoredValue(valueToStore);
        
        // Save to localStorage
        if (typeof window !== 'undefined') {
          localStorage.setItem(key, JSON.stringify(valueToStore));
        }
      } catch (error) {
        console.error("Error saving to localStorage:", error);
      }
    },
    [key, storedValue]
  );

  return [storedValue, setValue] as const;
}
