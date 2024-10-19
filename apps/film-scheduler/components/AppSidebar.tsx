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

export function AppSidebar() {
  const { films, setPreviewFilmId } = useAppContext();
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
          {filteredFilms.map((film) => (
            <div key={film.id} className="mb-3">
              <button
                onClick={() => handleFilmClick(film)}
                className="text-left w-full py-2 px-4 rounded hover:bg-gray-200"
              >
                {film.filmTitle} ({film.schedule.length} sessions)
              </button>

              {selectedFilm?.id === film.id && (
                <div className="ml-4 mt-2">
                  {film.schedule.map((session, index) => (
                    <div
                      key={index}
                      className="cursor-pointer text-sm hover:underline"
                      onClick={() => {}}
                    >
                      {session.time.toISOString()} - {session.location}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
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
