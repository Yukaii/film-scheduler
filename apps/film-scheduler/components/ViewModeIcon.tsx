import { cn } from "@/lib/utils";

/**
 * View-mode glyphs drawn on a 16px grid to match the timetable: a calendar
 * frame with a header rule, split into day columns for the week view, or
 * holding a single session block for the day view. Columns are capped at 4:
 * at 16px, seven lines blur into a solid block.
 */
export function ViewModeIcon({
  mode,
  days = 7,
  className,
}: {
  mode: "week" | "day";
  days?: number;
  className?: string;
}) {
  const columns = Math.min(Math.max(days, 2), 4);
  const left = 1.625;
  const width = 12.75;
  return (
    <svg
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.25}
      aria-hidden
      className={cn("size-4 shrink-0", className)}
    >
      <rect x="1.625" y="2.125" width="12.75" height="11.75" rx="2.25" />
      <path d="M1.625 5.375h12.75" />
      {mode === "week" ? (
        <path
          strokeWidth={1}
          d={Array.from({ length: columns - 1 }, (_, i) => {
            const x = left + (width * (i + 1)) / columns;
            return `M${x.toFixed(2)} 5.375V13.875`;
          }).join("")}
        />
      ) : (
        <rect x="4.5" y="7.5" width="7" height="3.75" rx="1" fill="currentColor" stroke="none" />
      )}
    </svg>
  );
}
