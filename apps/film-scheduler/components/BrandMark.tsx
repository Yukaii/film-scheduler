import { Clapperboard } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * App identity: a red clapperboard tile (same red as the calendar's "now" line
 * and today badge) plus the wordmark. `compact` renders the tile only.
 */
export function BrandMark({
  compact = false,
  className,
}: {
  compact?: boolean;
  className?: string;
}) {
  return (
    <div className={cn("flex min-w-0 items-center gap-2.5", className)}>
      <span
        aria-hidden
        className="grid size-8 shrink-0 place-items-center rounded-lg bg-red-500 text-white shadow-xs"
      >
        <Clapperboard className="size-4" strokeWidth={2.25} />
      </span>
      {compact ? (
        <span className="sr-only">Film Scheduler</span>
      ) : (
        <div className="min-w-0 leading-tight">
          <p className="truncate text-sm font-semibold tracking-tight">Film Scheduler</p>
          <p className="truncate text-xs text-muted-foreground">看電影排程小工具</p>
        </div>
      )}
    </div>
  );
}
