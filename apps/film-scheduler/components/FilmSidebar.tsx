import React, { useMemo, useRef, useState } from "react";
import { useAppContext } from "@/contexts/AppContext";
import { cn } from "@/lib/utils";
import { ArrowUpRight, X } from "lucide-react";
import dayjs from "dayjs";
import { Button } from "@/components/ui/button";
import { ResizeHandle } from "./ResizeHandle";
import { usePanelWidth } from "@/hooks/usePanelWidth";
import { useIsMobile } from "@/hooks/use-mobile";
import { FILM_PANEL_SIZE } from "@/lib/panelSizes";

export type FilmSidebarProps = {
  open: boolean;
  setOpen: (open: boolean) => void;
};

// Mobile bottom sheet height, as a share of the viewport height
const SHEET_DEFAULT = 0.5;
const SHEET_MIN = 0.3;
const SHEET_MAX = 0.9;
// Released below this, the sheet closes
const SHEET_DISMISS = 0.2;
// Height the sheet drops to after jumping to a session, so the calendar shows
const SHEET_PEEK = SHEET_MIN;

export function FilmSidebar({ open, setOpen }: FilmSidebarProps) {
  const { filmsMap, viewingFilmId, onClickSession, revealFilmDetail } = useAppContext();
  const viewingFilm = useMemo(() => {
    return viewingFilmId ? filmsMap.get(viewingFilmId) : null;
  }, [filmsMap, viewingFilmId]);

  const isMobile = useIsMobile();
  const [panelWidth, setPanelWidth] = usePanelWidth(
    FILM_PANEL_SIZE.storageKey,
    FILM_PANEL_SIZE.defaultWidth,
  );

  // Mobile sheet: height follows the finger while dragging, then settles
  const [sheetHeight, setSheetHeight] = useState(SHEET_DEFAULT);
  const [dragHeight, setDragHeight] = useState<number | null>(null);
  const dragRef = useRef<{ startY: number; startHeight: number } | null>(null);

  if (!open || !viewingFilm) return null;

  const close = () => {
    revealFilmDetail(undefined);
    setOpen(false);
  };

  const endSheetDrag = () => {
    if (!dragRef.current) return;
    dragRef.current = null;
    const released = dragHeight ?? sheetHeight;
    setDragHeight(null);
    if (released < SHEET_DISMISS) {
      setSheetHeight(SHEET_DEFAULT); // next open starts at the default height
      close();
    } else {
      setSheetHeight(Math.min(Math.max(released, SHEET_MIN), SHEET_MAX));
    }
  };

  const currentSheetHeight = dragHeight ?? sheetHeight;

  return (
    <aside
      aria-label="影片資訊"
      style={{ "--sheet-height": `${currentSheetHeight * 100}dvh` } as React.CSSProperties}
      className={cn(
        "fixed z-50 flex flex-col bg-sidebar text-sidebar-foreground",
        // mobile: full-width bottom sheet, height set by dragging the header
        "inset-x-0 bottom-0 h-(--sheet-height) rounded-t-2xl border-t shadow-[0_-8px_24px_-12px_rgb(0_0_0/0.25)]",
        "pb-[env(safe-area-inset-bottom)] animate-in slide-in-from-bottom duration-200",
        dragHeight === null && "transition-[height] ease-out",
        // desktop: full-height resizable panel flush right; CalendarView reserves --film-panel-width for it
        "md:inset-x-auto md:inset-y-0 md:right-0 md:h-auto md:w-(--film-panel-width) md:rounded-none md:border-t-0 md:border-l md:pb-0 md:shadow-none md:animate-none",
      )}
    >
      {!isMobile && (
        <ResizeHandle
          edge="left"
          label="調整影片資訊寬度"
          width={panelWidth}
          minWidth={FILM_PANEL_SIZE.minWidth}
          maxWidth={FILM_PANEL_SIZE.maxWidth}
          onResize={setPanelWidth}
          onReset={() => setPanelWidth(null)}
        />
      )}

      {/* h-16 matches the calendar header so the top border runs straight across.
          On mobile this row is also the sheet's drag handle. */}
      <div
        className="relative flex h-12 shrink-0 touch-none items-center justify-between border-b pl-4 pr-2 select-none md:h-16 md:touch-auto"
        onPointerDown={(e) => {
          if (!isMobile || (e.target as Element).closest("button")) return;
          e.currentTarget.setPointerCapture(e.pointerId);
          dragRef.current = { startY: e.clientY, startHeight: sheetHeight };
        }}
        onPointerMove={(e) => {
          const drag = dragRef.current;
          if (!drag) return;
          const delta = (drag.startY - e.clientY) / window.innerHeight;
          setDragHeight(Math.min(Math.max(drag.startHeight + delta, 0), SHEET_MAX));
        }}
        onPointerUp={endSheetDrag}
        onPointerCancel={endSheetDrag}
      >
        {/* Grabber: shows the sheet can be dragged */}
        <span
          aria-hidden
          className="absolute top-1.5 left-1/2 h-1 w-9 -translate-x-1/2 rounded-full bg-muted-foreground/30 md:hidden"
        />
        <span className="text-xs font-medium text-muted-foreground">影片資訊</span>
        <Button variant="ghost" size="icon" onClick={close} aria-label="關閉影片資訊">
          <X />
        </Button>
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto overscroll-contain p-4">
        <div className="space-y-1">
          <h3 className="text-lg font-semibold leading-snug">{viewingFilm.filmTitle}</h3>
          {viewingFilm.filmOriginalTitle && (
            <p className="text-sm text-muted-foreground">{viewingFilm.filmOriginalTitle}</p>
          )}
        </div>

        {(viewingFilm.directorName || viewingFilm.directorOriginalName) && (
          <p className="text-sm">
            <span className="text-muted-foreground">導演　</span>
            {viewingFilm.directorName}
            {viewingFilm.directorOriginalName && (
              <span className="ml-1.5 text-xs text-muted-foreground">
                {viewingFilm.directorOriginalName}
              </span>
            )}
          </p>
        )}

        {viewingFilm.detailUrl && (
          <a
            href={viewingFilm.detailUrl}
            target="_blank"
            rel="noreferrer noopener"
            className="inline-flex w-fit items-center gap-1 text-sm font-medium underline-offset-4 hover:underline"
          >
            影展官方頁面
            <ArrowUpRight className="size-3.5" />
          </a>
        )}

        {viewingFilm.schedule.length > 0 && (
          <section className="space-y-1.5">
            <h4 className="text-xs font-medium text-muted-foreground">
              場次 · {viewingFilm.schedule.length}
            </h4>
            <ul className="space-y-0.5">
              {viewingFilm.schedule.map((session) => (
                <li key={session.id}>
                  <button
                    type="button"
                    onClick={() => {
                      onClickSession(session);
                      // Lower the sheet so the session it scrolls to is visible
                      if (isMobile) setSheetHeight((h) => Math.min(h, SHEET_PEEK));
                    }}
                    className="flex w-full items-baseline gap-2 rounded-md px-2 py-2 text-left text-sm hover:bg-sidebar-accent md:py-1.5"
                  >
                    <span className="shrink-0 font-medium tabular-nums">
                      {dayjs(session.time).format("MM/DD HH:mm")}
                    </span>
                    <span className="truncate text-muted-foreground">{session.location}</span>
                  </button>
                </li>
              ))}
            </ul>
          </section>
        )}

        {viewingFilm.synopsis && (
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-sidebar-foreground/90">
            {viewingFilm.synopsis}
          </p>
        )}
      </div>
    </aside>
  );
}
