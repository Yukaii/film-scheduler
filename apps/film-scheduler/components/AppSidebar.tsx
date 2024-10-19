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
import { Film, Session } from "./types";
import FilmModal from "./FilmModal";
import { cn } from "@/lib/utils";
import dayjs from "dayjs";
import { ChevronDown, Film, Star, StarOff } from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

// FilmListItem component kept in the same file
function FilmListItem({
  film,
  isPreviewing,
  handleFilmClick,
  onClickPreviewSession,
  isStarred,
  onStarToggle,
}: {
  film: Film;
  isPreviewing: boolean;
  handleFilmClick: (film: Film) => void;
  onClickPreviewSession: (session: Session) => void;
  isStarred: boolean;
  onStarToggle: (film: Film) => void;
}) {
  return (
    <div
      key={film.id}
      className={cn("py-2 px-1 rounded hover:bg-gray-200 mb-2", {
        "bg-gray-200": isPreviewing,
      })}
    >
      <div className="flex justify-between items-center">
        <button
          onClick={() => {
            handleFilmClick(film);
            if (film.schedule.length > 0) {
              onClickPreviewSession(film.schedule[0]);
            }
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

        <button
          onClick={(e) => {
            e.stopPropagation();
            onStarToggle(film);
          }}
          className="ml-2 p-2"
          title={isStarred ? "Unstar this film" : "Star this film"}
        >
          {isStarred ? (
            <Star className="text-yellow-500" />
          ) : (
            <StarOff className="text-gray-500" />
          )}
        </button>
      </div>

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
              {dayjs(session.time).format("MM/DD HH:mm")} - {session.location}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function AppSidebar() {
  const {
    films,
    setPreviewFilmId,
    previewFilmId,
    onClickPreviewSession,
    starredFilmIds,
    starFilm,
    unstarFilm,
  } = useAppContext();
  const [search, setSearch] = useState("");
  const [selectedFilm, setSelectedFilm] = useState<Film | null>(null);

  const handleFilmClick = (film: Film) => {
    setPreviewFilmId(film.id);
  };

  const handleStarToggle = (film: Film) => {
    if (starredFilmIds.has(film.id)) {
      unstarFilm(film);
    } else {
      starFilm(film);
    }
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

  const starredFilms = useMemo(() => {
    return films.filter((f) => starredFilmIds.has(f.id));
  }, [starredFilmIds, films]);

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
        <Collapsible className="group/collapsible">
          <SidebarGroup>
            <SidebarGroupLabel asChild>
              <CollapsibleTrigger>
                已追蹤影片
                <ChevronDown className="ml-auto transition-transform group-data-[state=open]/collapsible:rotate-180" />
              </CollapsibleTrigger>
            </SidebarGroupLabel>

            <CollapsibleContent>
              <SidebarGroupContent className="max-h-full">
                {starredFilms.map((film) => {
                  const isPreviewing = previewFilmId === film.id;
                  return (
                    <FilmListItem
                      key={film.id}
                      film={film}
                      isPreviewing={isPreviewing}
                      handleFilmClick={handleFilmClick}
                      onClickPreviewSession={onClickPreviewSession}
                      isStarred={starredFilmIds.has(film.id)}
                      onStarToggle={handleStarToggle}
                    />
                  );
                })}
              </SidebarGroupContent>
            </CollapsibleContent>
          </SidebarGroup>
        </Collapsible>

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
                    <FilmListItem
                      key={film.id}
                      film={film}
                      isPreviewing={isPreviewing}
                      handleFilmClick={handleFilmClick}
                      onClickPreviewSession={onClickPreviewSession}
                      isStarred={starredFilmIds.has(film.id)}
                      onStarToggle={handleStarToggle}
                    />
                  );
                })}
              </SidebarGroupContent>
            </CollapsibleContent>
          </SidebarGroup>
        </Collapsible>
      </SidebarContent>
      <SidebarFooter />

      {selectedFilm && (
        <FilmModal film={selectedFilm} onClose={() => setSelectedFilm(null)} />
      )}
    </Sidebar>
  );
}
