import { useMemo, useState } from "react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
} from "@/components/ui/sidebar";
import { useAppContext } from "@/contexts/AppContext";
import { Input } from "@/components/ui/input";
import { Film } from "./types";
import FilmModal from "./FilmModal";
import { cn } from "@/lib/utils";
import dayjs from "dayjs";
import { ChevronDown } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

export function AppSidebar() {
  const { films, setPreviewFilmId, previewFilmId, onClickPreviewSession } =
    useAppContext();
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
      <SidebarHeader className="p-4">
        <Input
          placeholder="篩選影片"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </SidebarHeader>
      <SidebarContent>
        <Collapsible defaultOpen className="group/collapsible">
          <SidebarGroup>
            <SidebarGroupLabel asChild>
              <CollapsibleTrigger>
                影片列表
                <ChevronDown className="ml-auto transition-transform group-data-[state=open]/collapsible:rotate-180" />
              </CollapsibleTrigger>
            </SidebarGroupLabel>

            <CollapsibleContent>
            <SidebarGroupContent className="max-h-full">
                {filteredFilms.map((film) => {
                  const isPreviewing = previewFilmId === film.id;
                  return (
                    <div
                      key={film.id}
                      className={cn("py-2 px-1 rounded hover:bg-gray-200 mb-2", {
                        "bg-gray-200": isPreviewing,
                      })}
                    >
                      <button
                        onClick={() => {
                          handleFilmClick(film);
                          onClickPreviewSession(film.schedule[0]);
                        }}
                        className={cn(
                          "text-left w-full py-2 px-4 rounded flex gap-1 items-center justify-between",
                        )}
                      >
                        {film.filmTitle}
                        <span className="text-xs whitespace-nowrap">
                          [{film.duration} 分鐘]
                        </span>
                      </button>

                      {isPreviewing && (
                        <div className="ml-4 mt-2">
                          {film.schedule.map((session, index) => (
                            <div
                              key={index}
                              className="cursor-pointer text-sm hover:underline"
                              onClick={(e) => {
                                e.stopPropagation();
                                onClickPreviewSession(session);
                              }}
                            >
                              {dayjs(session.time).format("MM/DD HH:mm")} -{" "}
                              {session.location}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </SidebarGroupContent>
            </CollapsibleContent>
          </SidebarGroup>
        </Collapsible>
      </SidebarContent>
      <SidebarFooter />

      {selectedFilm && (
        <FilmModal
          film={selectedFilm}
          onClose={() => setSelectedFilm(null)}
        />
      )}
    </Sidebar>
  );
}
