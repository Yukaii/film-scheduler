import { useMemo, useState } from "react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarHeader,
} from "@/components/ui/sidebar";
import { useAppContext } from "@/contexts/AppContext";
import { Input } from "@/components/ui/input";
import { Film } from "./types";
import FilmModal from "./FilmModal";
import { cn } from "@/lib/utils";
import dayjs from "dayjs";

export function AppSidebar() {
  const { films, setPreviewFilmId, previewFilmId } = useAppContext();
  const [search, setSearch] = useState("");
  const [selectedFilm, setSelectedFilm] = useState<Film | null>(null);

  const handleFilmClick = (film: Film) => {
    setPreviewFilmId(film.id);
  };

  const filteredFilms = useMemo(() => {
    return films.filter((f) => {
      return (
        f.filmTitle.includes(search) ||
        f.filmOriginalTitle.includes(search) ||
        f.directorName.includes(search) ||
        f.directorOriginalName.includes(search)
      );
    });
  }, [search, films]);

  return (
    <Sidebar>
      <SidebarHeader>
        <Input
          placeholder="篩選影片"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <div className="flex flex-col gap-2" >
            {filteredFilms.map((film) => {
              const isPreviewing = previewFilmId === film.id;
              return (
                <div
                  key={film.id}
                  className={cn("py-2 px-1 rounded", {
                    "bg-gray-200": isPreviewing,
                  })}
                >
                  <button
                    onClick={() => handleFilmClick(film)}
                    className={cn(
                      "text-left w-full py-2 px-4 rounded hover:bg-gray-200",
                    )}
                  >
                    {film.filmTitle}
                  </button>

                  {isPreviewing && (
                    <div className="ml-4 mt-2">
                      {film.schedule.map((session, index) => (
                        <div
                          key={index}
                          className="cursor-pointer text-sm hover:underline"
                          onClick={() => {}}
                        >
                          {dayjs(session.time).format('MM/DD HH:mm')} - {session.location}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          {selectedFilm && (
            <FilmModal
              film={selectedFilm}
              onClose={() => setSelectedFilm(null)}
            />
          )}
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter />
    </Sidebar>
  );
}
