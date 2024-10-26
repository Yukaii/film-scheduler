import React, { useMemo } from "react";
import { useAppContext } from "@/contexts/AppContext";
import { cn } from "@/lib/utils";
import { X, CalendarIcon } from "lucide-react";
import dayjs from "dayjs";
import { generateGoogleCalendarUrl } from "@/lib/utils";
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

  const isOpen = open && viewingFilm;

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
          href={`https://www.goldenhorse.org.tw/film/programme/films/detail/${viewingFilmId}`}
          className="text-slate-500 dark:text-slate-300 underline cursor-pointer hover:opacity-70"
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
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      const url = generateGoogleCalendarUrl(viewingFilm, session);
                      window.open(url, "_blank");
                    }}
                    className="ml-2 hover:no-underline"
                  >
                    <CalendarIcon className="h-4 w-4 mr-1" />
                    加入日曆
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
