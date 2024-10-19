import React, { useMemo } from "react";
import { useAppContext } from "@/contexts/AppContext";
import { cn } from "@/lib/utils";
import { X } from "lucide-react";

export type FilmSidebarProps = {
  open: boolean;
  setOpen: (open: boolean) => void;
};

export function FilmSidebar(props: FilmSidebarProps) {
  const { filmsMap, viewingFilmId } = useAppContext();
  const viewingFilm = useMemo(() => {
    return viewingFilmId ? filmsMap.get(viewingFilmId) : null;
  }, [filmsMap, viewingFilmId]);

  const isOpen = props.open && viewingFilm;

  return (
    <div
      className={cn(
        "w-[calc(16rem-10px)] max-h-full h-[calc(100%-20px)] right-2.5 top-2.5 bg-sidebar border border-b border-sidebar-border",
        {
          fixed: isOpen,
          hidden: !isOpen,
        },
      )}
    >
      <div className="absolute w-full top-0 h-10">
        <button
          className="absolute right-4 top-4"
          onClick={() => props.setOpen(false)}
        >
          <X size={16} />
        </button>
      </div>

      <div className="py-10 px-4 flex flex-col gap-4 overflow-y-auto max-h-full">
        <h3 className="text-lg font-semibold">
          {viewingFilm?.filmTitle}

          <span className="text-base ml-3">
            {viewingFilm?.filmOriginalTitle}
          </span>
        </h3>

        <h4 className="text-base font-semibold">
          {viewingFilm?.directorName}

          <span className="text-xs ml-3">
            {viewingFilm?.directorOriginalName}
          </span>
        </h4>

        <a
          href={`https://www.goldenhorse.org.tw/film/programme/films/detail/${viewingFilmId}`}
          className="text-slate-500 underline cursor-pointer"
          target="_blank"
          rel="noreferrer noopener"
        >
          完整頁面
        </a>

        <p className="whitespace-pre-wrap">{viewingFilm?.synopsis}</p>
      </div>
    </div>
  );
}
