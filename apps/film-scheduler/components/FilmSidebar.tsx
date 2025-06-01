import React, { useMemo } from "react";
import { useAppContext } from "@/contexts/AppContext";
import { cn } from "@/lib/utils";
import { X } from "lucide-react";
import dayjs from "dayjs";

export type FilmSidebarProps = {
  open: boolean;
  setOpen: (open: boolean) => void;
};

export function FilmSidebar({ open, setOpen }: FilmSidebarProps) {
  const { filmsMap, viewingFilmId, onClickSession, revealFilmDetail, currentFestivalId } = useAppContext();
  const viewingFilm = useMemo(() => {
    return viewingFilmId ? filmsMap.get(viewingFilmId) : null;
  }, [filmsMap, viewingFilmId]);

  const isOpen = open && viewingFilm;

  // Generate the appropriate URL based on festival type
  const getFilmUrl = useMemo(() => {
    if (!viewingFilmId || !currentFestivalId) return null;
    
    if (currentFestivalId.includes('TAIPEIFF')) {
      // For Taipei Film Festival, we don't have a specific URL pattern yet
      // This could be updated when the official website structure is known
      return null;
    } else {
      // Default to Golden Horse festival URL
      return `https://www.goldenhorse.org.tw/film/programme/films/detail/${viewingFilmId}`;
    }
  }, [viewingFilmId, currentFestivalId]);

  return (
    <div
      className={cn(
        "z-50 bg-sidebar border border-b border-sidebar-border",
        "w-[calc(100%-40px)] max-h-full h-[70%] left-5 bottom-4",
        "md:w-[calc(16rem-10px)] md:max-h-full md:h-[calc(100%-20px)] md:left-auto md:bottom-auto md:right-2.5 md:top-2.5",
        {
          fixed: isOpen,
          hidden: !isOpen,
        },
      )}
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

      <div className="py-10 px-4 flex flex-col gap-4 overflow-y-auto max-h-full">
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

        <p className="whitespace-pre-wrap">{viewingFilm?.synopsis}</p>

        {/* Schedule Section */}
        {viewingFilm?.schedule && viewingFilm.schedule.length > 0 && (
          <div className="mt-4">
            <h5 className="text-base font-semibold mb-2">場次時間表</h5>
            <div className="flex flex-col gap-2">
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
          </div>
        )}
      </div>
    </div>
  );
}
