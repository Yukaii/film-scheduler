import { cn } from "@/lib/utils";

/** Frame rows along the strip; the strip is longer than the tile so it bleeds off both ends. */
const ROWS = [-25, -14, -3, 8, 19, 30, 41, 52, 63, 74];

/**
 * The logo: a tilted film strip whose frames are screenings, with the picked
 * ones lit amber. Colors are CSS variables so one SVG serves both themes:
 * light is a teal strip on cream with one pick, dark is a cream strip on teal
 * with two. `app/icon.svg` is the same drawing for the favicon.
 */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 64 64"
      aria-hidden
      className={cn(
        "[--logo-tile:#F4EBD9] [--logo-strip:#0F3D3E] [--logo-pick-a:var(--logo-tile)] [--logo-pick-b:#F5A524]",
        "dark:[--logo-tile:#0F3D3E] dark:[--logo-strip:#F4EBD9] dark:[--logo-pick-a:#F5A524] dark:[--logo-pick-b:var(--logo-tile)]",
        className,
      )}
    >
      <rect width="64" height="64" fill="var(--logo-tile)" />
      <g transform="rotate(-18 32 32)">
        <rect x="17" y="-30" width="30" height="124" fill="var(--logo-strip)" />
        <g fill="var(--logo-tile)">
          {ROWS.map((y) => (
            <g key={y}>
              <rect x="20" y={y + 2.5} width="3.5" height="4" rx="1" />
              <rect x="40.5" y={y + 2.5} width="3.5" height="4" rx="1" />
            </g>
          ))}
        </g>
        {ROWS.map((y, i) => (
          <rect
            key={y}
            x="26"
            y={y}
            width="12"
            height="9"
            rx="1.5"
            fill={
              i === 4 || i === 6
                ? "var(--logo-pick-a)"
                : i === 5
                  ? "var(--logo-pick-b)"
                  : "var(--logo-tile)"
            }
          />
        ))}
      </g>
    </svg>
  );
}

/** App identity: the logo tile plus the wordmark. `compact` renders the tile only. */
export function BrandMark({
  compact = false,
  className,
}: {
  compact?: boolean;
  className?: string;
}) {
  return (
    <div className={cn("flex min-w-0 items-center gap-2.5", className)}>
      <span className="size-8 shrink-0 overflow-hidden rounded-lg shadow-xs ring-1 ring-black/5 dark:ring-white/10">
        <LogoMark className="size-full" />
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
