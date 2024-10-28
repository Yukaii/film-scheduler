import { useMemo, useState } from "react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  useSidebar,
} from "@/components/ui/sidebar";
import { useAppContext } from "@/contexts/AppContext";
import {
  TooltipTrigger,
  TooltipProvider,
  Tooltip,
  TooltipContent,
} from "@/components/ui/tooltip";
import { Input } from "@/components/ui/input";
import { ModeToggle } from "./ModeToggle";
import { Film, Session } from "./types";
import {
  cn,
  generateGoogleCalendarUrl,
} from "@/lib/utils";
import dayjs from "dayjs";
import {
  ChevronDown,
  Eye,
  Star,
  X,
  ExternalLink,
  Info,
  Compass,
  CalendarIcon,
} from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Button } from "./ui/button";
import { saveAs } from "file-saver";

// FilmListItem component kept in the same file
function FilmListItem({
  film,
  isPreviewing,
  handleFilmClick,
  onClickSession,
  isStarred,
  onStarToggle,
  onClickViewDetail,
}: {
  film: Film;
  isPreviewing: boolean;
  handleFilmClick: (film: Film) => void;
  onClickSession: (session: Session) => void;
  isStarred: boolean;
  onStarToggle: (film: Film) => void;
  onClickViewDetail: (film: Film) => void;
}) {
  return (
    <div
      key={film.id}
      className={cn(
        "py-2 px-1 rounded hover:bg-gray-200 dark:hover:bg-gray-800 mb-2",
        {
          "bg-gray-200 dark:bg-gray-800": isPreviewing,
        },
      )}
    >
      <div className="flex justify-between items-center">
        <button
          onClick={() => {
            handleFilmClick(film);
            if (film.schedule.length > 0) {
              onClickSession(film.schedule[0]);
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
            onClickViewDetail(film);
          }}
          className="ml-2 p-2"
        >
          <Eye size={16} />
        </button>

        <button
          onClick={(e) => {
            e.stopPropagation();
            onStarToggle(film);
          }}
          className="ml-2 p-2"
          title={isStarred ? "Unstar this film" : "Star this film"}
        >
          <Star
            className={cn({
              "text-yellow-500": isStarred,
              "text-gray-500": !isStarred,
            })}
            size={16}
          />
        </button>
      </div>

      {isPreviewing && (
        <div className="pl-8 mt-2">
          {film.schedule.map((session, index) => (
            <div
              key={index}
              className="cursor-pointer text-sm hover:underline"
              onClick={(e) => {
                e.stopPropagation();
                onClickSession(session);
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

// SessionListItem component for rendering selected sessions
function SessionListItem({
  session,
  removeSession,
}: {
  session: Session;
  removeSession: (session: Session) => void;
}) {
  const { filmsMap, onClickSession } = useAppContext();
  const handleRemoveClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    removeSession(session);
  };
  const film = filmsMap.get(session.filmId);

  return (
    <div className="flex justify-between items-center py-2 px-4 border-b border-border">
      <a
        onClick={(e) => {
          e.preventDefault();
          onClickSession(session);
        }}
        className="hover:underline hover:cursor-pointer"
      >
        {film?.filmTitle} {dayjs(session.time).format("MM/DD HH:mm")} -{" "}
        {session.location}
      </a>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            const url = generateGoogleCalendarUrl(film!, session);
            window.open(url, "_blank");
          }}
          className="hover:no-underline"
        >
          <TooltipProvider delayDuration={0}>
            <Tooltip>
              <TooltipTrigger>
                <CalendarIcon size={16} className="mr-1" />
              </TooltipTrigger>
              <TooltipContent side="right">
                <p> 加入日曆</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </Button>
        <button
          onClick={handleRemoveClick}
          className="ml-2 p-1"
          title="Remove session"
        >
          <X className="text-gray-500" size={16} />
        </button>
      </div>
    </div>
  );
}

export function AppSidebar() {
  const { isMobile } = useSidebar();
  const {
    films,
    setPreviewFilmId,
    previewFilmId,
    onClickSession,
    starredFilmIds,
    starFilm,
    unstarFilm,
    filmsMap,
    selectedSessions,
    removeSession,
    revealFilmDetail,
    openShareModal,
    openAboutModal,
    openOnboardingModal,
  } = useAppContext();
  const [search, setSearch] = useState("");
  const sortedSeletectSession = selectedSessions.sort(
    (a, b) => a.time - b.time,
  );

  const handleFilmClick = (film: Film) => {
    if (previewFilmId === film.id) {
      setPreviewFilmId(undefined);
      revealFilmDetail(undefined);
    } else {
      setPreviewFilmId(film.id);

      if (!isMobile) {
        revealFilmDetail(film);
      }
    }
  };

  const handleStarToggle = (film: Film) => {
    if (starredFilmIds.includes(film.id)) {
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
    return films.filter((f) => starredFilmIds.includes(f.id));
  }, [starredFilmIds, films]);

  return (
    <Sidebar>
      <SidebarHeader className="p-4">
        <div className="relative">
          <Input
            placeholder="篩選影片"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {search.length > 0 && (
            <div
              onClick={() => setSearch("")}
              className="cursor-pointer absolute right-2 top-3"
            >
              <X size={14} />
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent>
        {/* Selected Sessions Section */}
        <Collapsible
          defaultOpen
          className="group/collapsible overflow-y-auto max-h-[240px] "
        >
          <SidebarGroup>
            <SidebarGroupLabel asChild>
              <CollapsibleTrigger className="sticky bg-sidebar top-0">
                已選擇場次
                <ChevronDown className="ml-auto transition-transform group-data-[state=open]/collapsible:rotate-180" />
              </CollapsibleTrigger>
            </SidebarGroupLabel>

            <CollapsibleContent>
              <SidebarGroupContent className="max-h-full">
                {selectedSessions.length > 0 ? (
                  sortedSeletectSession.map((session, index) => (
                    <SessionListItem
                      key={index}
                      session={session}
                      removeSession={removeSession}
                    />
                  ))
                ) : (
                  <p className="text-sm p-4 text-gray-500">沒有選擇的場次</p>
                )}
              </SidebarGroupContent>
            </CollapsibleContent>
          </SidebarGroup>
        </Collapsible>

        {/* Starred Films Section */}
        <Collapsible className="group/collapsible max-h-[240px] overflow-y-auto">
          <SidebarGroup>
            <SidebarGroupLabel asChild>
              <CollapsibleTrigger className="sticky bg-sidebar top-0">
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
                      onClickSession={onClickSession}
                      isStarred={starredFilmIds.includes(film.id)}
                      onStarToggle={handleStarToggle}
                      onClickViewDetail={revealFilmDetail}
                    />
                  );
                })}

                {starredFilms.length === 0 && (
                  <p className="text-sm p-4 text-gray-500">沒有追蹤的影片</p>
                )}
              </SidebarGroupContent>
            </CollapsibleContent>
          </SidebarGroup>
        </Collapsible>

        {/* All Films Section */}
        <Collapsible
          defaultOpen
          className="group/collapsible max-h-full overflow-y-auto flex-1"
        >
          <SidebarGroup>
            <SidebarGroupLabel asChild>
              <CollapsibleTrigger className="sticky top-0 bg-sidebar">
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
                      onClickSession={onClickSession}
                      isStarred={starredFilmIds.includes(film.id)}
                      onStarToggle={handleStarToggle}
                      onClickViewDetail={revealFilmDetail}
                    />
                  );
                })}
              </SidebarGroupContent>
            </CollapsibleContent>
          </SidebarGroup>
        </Collapsible>
      </SidebarContent>

      <SidebarFooter>
        <div className="flex gap-2 justify-end">
          <ModeToggle />
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  onClick={openOnboardingModal}
                  variant="outline"
                  size="icon"
                >
                  <Compass />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>使用教學</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button onClick={openAboutModal} variant="outline" size="icon">
                  <Info />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>關於</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button onClick={openShareModal} variant="outline" size="icon">
                  <ExternalLink />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>分享片單</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
