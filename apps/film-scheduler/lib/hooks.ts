import { useState, useEffect } from "react";

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
  return JSON.stringify(value, (key, val) => {
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
  return JSON.parse(value, (key, val) => {
    if (val && val.dataType === "Set") {
      return new Set(val.value); // Convert back to Set
    }
    if (val && val.dataType === "Date") {
      return new Date(val.value); // Convert back to Date
    }
    return val;
  });
}

// A custom hook to manage state with localStorage persistence
export function useLocalStorageState<T>(key: string, defaultValue: T) {
  const [state, setState] = useState<T>(() => {
    try {
      const storedValue = localStorage.getItem(key);
      return storedValue ? rehydrate<T>(storedValue) : defaultValue;
    } catch (error) {
      console.error("Error loading from localStorage:", error);
      return defaultValue;
    }
  });

  useEffect(() => {
    try {
      const serializedState = dehydrate(state);
      localStorage.setItem(key, serializedState);
    } catch (error) {
      console.error("Error saving to localStorage:", error);
    }
  }, [key, state]);

  return [state, setState] as const;
}
