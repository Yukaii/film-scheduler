import { useState } from 'react'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarHeader,
} from "@/components/ui/sidebar"
import { useAppContext } from "@/contexts/AppContext"
import { Film } from "./types";
import FilmModal from "./FilmModal";

export function AppSidebar() {
  const { films, setPreviewFilmId } = useAppContext()
  const [selectedFilm, setSelectedFilm] = useState<Film | null>(null);

  const handleFilmClick = (film: Film) => {
    setPreviewFilmId(film.id);
  };

  return (
    <Sidebar>
      <SidebarHeader />
      <SidebarContent>
        <SidebarGroup>
          {films.map((film) => (
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
            <FilmModal film={selectedFilm} onClose={() => setSelectedFilm(null)} />
          )}
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter />
    </Sidebar>
  )
}
