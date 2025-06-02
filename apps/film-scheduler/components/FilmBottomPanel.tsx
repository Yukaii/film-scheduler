import React, { useMemo } from "react";
import { useAppContext } from "@/contexts/AppContext";
import { cn } from "@/lib/utils";
import { X } from "lucide-react";
import dayjs from "dayjs";

export type FilmBottomPanelProps = {
  open: boolean;
  setOpen: (open: boolean) => void;
};

export function FilmBottomPanel({ open, setOpen }: FilmBottomPanelProps) {
  const { filmsMap, viewingFilmId, onClickSession, revealFilmDetail } = useAppContext();
  const viewingFilm = useMemo(() => {
    return viewingFilmId ? filmsMap.get(viewingFilmId) : null;
  }, [filmsMap, viewingFilmId]);

  const isOpen = open && viewingFilm;

  // Get the detail URL from the film data (unified across festivals)
  const getFilmUrl = useMemo(() => {
    return viewingFilm?.detailUrl || null;
  }, [viewingFilm]);

  return (
    <div
      className={cn(
        "z-50 bg-sidebar border-t border-sidebar-border transition-all duration-300",
        "fixed bottom-0 left-0 right-0",
        {
          "translate-y-0": isOpen,
          "translate-y-full": !isOpen,
        },
      )}
      style={{ height: isOpen ? "280px" : "0px" }}
    >
      <div className="absolute w-full top-0 h-10">
        <button
          className="absolute right-4 top-4"
          onClick={() => {
            revealFilmDetail(undefined);
            setOpen(false);
          }}
        >
          <X size={16} />
        </button>
      </div>

      <div className="py-10 px-4 h-full overflow-y-auto">
        <div className="max-w-4xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Film Details */}
            <div className="flex flex-col gap-3">
              <h3 className="text-lg font-semibold">
                {viewingFilm?.filmTitle}
                <span className="text-base ml-3">{viewingFilm?.filmOriginalTitle}</span>
              </h3>

              <h4 className="text-base font-semibold">
                {viewingFilm?.directorName}
                <span className="text-xs ml-3">{viewingFilm?.directorOriginalName}</span>
              </h4>

              <a
                href={getFilmUrl || '#'}
                className={cn(
                  "text-slate-500 dark:text-slate-300 underline cursor-pointer hover:opacity-70",
                  !getFilmUrl && "opacity-50 pointer-events-none"
                )}
                target="_blank"
                rel="noreferrer noopener"
              >
                完整頁面
              </a>

              <p className="whitespace-pre-wrap text-sm leading-relaxed">
                {viewingFilm?.synopsis}
              </p>
            </div>

            {/* Schedule Section */}
            <div>
              {viewingFilm?.schedule && viewingFilm.schedule.length > 0 && (
                <>
                  <h5 className="text-base font-semibold mb-3">場次時間表</h5>
                  <div className="flex flex-col gap-2 max-h-40 overflow-y-auto">
                    {viewingFilm.schedule.map((session, index) => (
                      <div key={index} className="flex items-center justify-between">
                        <div
                          className="cursor-pointer text-sm hover:underline"
                          onClick={(e) => {
                            e.stopPropagation();
                            onClickSession(session);
                          }}
                        >
                          {dayjs(session.time).format("MM/DD HH:mm")} - {session.location}
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}