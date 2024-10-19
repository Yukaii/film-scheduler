import React, { useMemo } from "react";
import { useAppContext } from "@/contexts/AppContext";
import { cn } from "@/lib/utils";
import dayjs from "dayjs";
import { X } from "lucide-react";

export type FilmSidebarProps = {
  open: boolean;
  setOpen: (open: boolean) => void;
};

export function FilmSidebar(props: FilmSidebarProps) {
  const { filmsMap, viewingFilmId } = useAppContext();
  const viewingFilm = useMemo(() => {
    return viewingFilmId ? filmsMap.get(viewingFilmId) : null
  }, [filmsMap, viewingFilmId])

  return (
    <div
      className={cn("w-[16rem] h-full right-0 top-0 bg-sidebar border border-b border-sidebar-border", {
        fixed: props.open,
        hidden: !props.open,
      })}
    >
      <div className="absolute w-full top-0 h-10">
        <button
          className="absolute right-4 top-4"
          onClick={() => props.setOpen(false)}
        >
          <X size={16} />
        </button>
      </div>

      <div className="pt-10">
        {viewingFilm?.filmTitle}
      </div>
    </div>
  );
}
