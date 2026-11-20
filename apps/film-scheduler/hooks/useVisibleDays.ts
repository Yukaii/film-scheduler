import { useSyncExternalStore } from "react";

// Below Tailwind's `sm` breakpoint the week view shows 3 days instead of 7,
// so each column is wide enough to read a session title.
const NARROW_QUERY = "(max-width: 639px)";
export const NARROW_VISIBLE_DAYS = 3;
export const WIDE_VISIBLE_DAYS = 7;

function subscribe(onChange: () => void) {
  const mql = window.matchMedia(NARROW_QUERY);
  mql.addEventListener("change", onChange);
  return () => mql.removeEventListener("change", onChange);
}

/** Number of day columns the week view shows at the current viewport width. */
export function useVisibleDays() {
  const narrow = useSyncExternalStore(
    subscribe,
    () => window.matchMedia(NARROW_QUERY).matches,
    () => false,
  );
  return narrow ? NARROW_VISIBLE_DAYS : WIDE_VISIBLE_DAYS;
}
