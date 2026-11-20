import React, { useMemo } from "react";
import { useAppContext } from "@/contexts/AppContext";
import { cn } from "@/lib/utils";
import { ArrowUpRight, X } from "lucide-react";
import dayjs from "dayjs";
import { Button } from "@/components/ui/button";

export type FilmSidebarProps = {
  open: boolean;
  setOpen: (open: boolean) => void;
};

export function FilmSidebar({ open, setOpen }: FilmSidebarProps) {
  const { filmsMap, viewingFilmId, onClickSession, revealFilmDetail } = useAppContext();
  const viewingFilm = useMemo(() => {
    return viewingFilmId ? filmsMap.get(viewingFilmId) : null;
  }, [filmsMap, viewingFilmId]);

  if (!open || !viewingFilm) return null;

  const close = () => {
    revealFilmDetail(undefined);
    setOpen(false);
  };

  return (
    <aside
      aria-label="影片資訊"
      className={cn(
        "fixed z-50 flex flex-col bg-sidebar text-sidebar-foreground",
        // mobile: bottom sheet
        "inset-x-3 bottom-3 h-[70%] rounded-xl border shadow-lg",
        // desktop: full-height panel flush right; CalendarView reserves md:pr-64 for it
        "md:inset-x-auto md:inset-y-0 md:right-0 md:h-auto md:w-64 md:rounded-none md:border-y-0 md:border-r-0 md:shadow-none",
      )}
    >
      {/* h-16 matches the calendar header so the top border runs straight across */}
      <div className="flex h-12 shrink-0 items-center justify-between border-b pl-4 pr-2 md:h-16">
        <span className="text-xs font-medium text-muted-foreground">影片資訊</span>
        <Button variant="ghost" size="icon" onClick={close} aria-label="關閉影片資訊">
          <X />
        </Button>
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-4">
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
                    onClick={() => onClickSession(session)}
                    className="flex w-full items-baseline gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-sidebar-accent"
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
