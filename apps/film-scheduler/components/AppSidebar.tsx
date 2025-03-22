import { useMemo, useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import useSWR from "swr";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { fetchFilms } from "@/lib/filmData";
import { Film, Session } from "./types";
import {
  cn,
} from "@/lib/utils";
import dayjs from "dayjs";
import {
  ChevronDown,
  Star,
  X,
  ExternalLink,
  Info,
  Compass,
} from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Button } from "./ui/button";

// FilmListItem component kept in the same file
function FilmListItem({
  film,
  isPreviewing,
  handleFilmClick,
  onClickSession,
  isStarred,
  onStarToggle,
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
        "py-2 px-2 pr-10 rounded-md transition-colors duration-150 hover:bg-gray-100 dark:hover:bg-gray-800 mb-2 border border-transparent relative",
        {
          "bg-gray-100 dark:bg-gray-800 border-border": isPreviewing,
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
            "text-left w-full py-2 px-3 rounded-md flex gap-2 items-center justify-between font-medium",
          )}
        >
          <span className="truncate">{film.filmTitle}</span>
          <span className="text-xs whitespace-nowrap text-muted-foreground">
            [{film.duration} 分鐘]
          </span>
        </button>

        <button
          onClick={(e) => {
            e.stopPropagation();
            onStarToggle(film);
          }}
          className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors absolute right-2 top-1/2 -translate-y-1/2"
          title={isStarred ? "Unstar this film" : "Star this film"}
        >
          <Star
            className={cn("transition-colors", {
              "text-yellow-500 fill-yellow-500": isStarred,
              "text-gray-400": !isStarred,
            })}
            size={18}
          />
        </button>
      </div>

      {isPreviewing && (
        <div className="pl-8 mt-2 space-y-1.5">
          {film.schedule.map((session, index) => (
            <div
              key={index}
              className="cursor-pointer text-sm hover:bg-gray-200 dark:hover:bg-gray-700 py-1 px-2 rounded-md transition-colors"
              onClick={(e) => {
                e.stopPropagation();
                onClickSession(session);
              }}
            >
              <span className="font-medium">{dayjs(session.time).format("MM/DD HH:mm")}</span> - {session.location}
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
    <div className="flex justify-between items-center py-2.5 px-4 border-b border-border hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors rounded-sm">
      <a
        onClick={(e) => {
          e.preventDefault();
          onClickSession(session);
        }}
        className="hover:underline hover:cursor-pointer truncate"
      >
        <span className="font-medium">{film?.filmTitle}</span>{" "}
        <span className="text-muted-foreground">
          {dayjs(session.time).format("MM/DD HH:mm")} - {session.location}
        </span>
      </a>
      <div className="flex items-center gap-2 ml-2 shrink-0">
        <button
          onClick={handleRemoveClick}
          className="p-1.5 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
          title="Remove session"
        >
          <X className="text-gray-500 hover:text-red-500 transition-colors" size={16} />
        </button>
      </div>
    </div>
  );
}

export function AppSidebar() {
  const { isMobile } = useSidebar();
  const {
    films,
    festivals,
    defaultFestivalId,
    setFilms,
    setFilmsMap,
    setPreviewFilmId,
    previewFilmId,
    onClickSession,
    starredFilmIds,
    starFilm,
    unstarFilm,
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

  const searchParams = useSearchParams();
  const router = useRouter();
  const [currentFestivalId, setCurrentFestivalId] = useState<string>("");

  useEffect(() => {
    // Get festival from URL or auto-select if only one available
    const festivalFromUrl = searchParams.get("festival");
    if (festivalFromUrl && festivals.some(f => f.id === festivalFromUrl)) {
      setCurrentFestivalId(festivalFromUrl);
    } else if (festivals.length === 1) {
      // Auto-select if only one festival
      setCurrentFestivalId(festivals[0].id);
      router.push(`?festival=${festivals[0].id}`);
    } else if (defaultFestivalId) {
      setCurrentFestivalId(defaultFestivalId);
      router.push(`?festival=${defaultFestivalId}`);
    }
  }, [festivals, defaultFestivalId, searchParams, router]);

  const handleFestivalChange = (festivalId: string) => {
    setCurrentFestivalId(festivalId);
    router.push(`?festival=${festivalId}`);
  };
  
  useSWR(
    currentFestivalId ? ['films', currentFestivalId] : null,
    () => fetchFilms(currentFestivalId),
    {
      revalidateOnFocus: false,
      onSuccess: (data) => {
        if (data) {
          const { films: newFilms, filmsMap: newFilmsMap } = data;
          setFilms(newFilms);
          setFilmsMap(newFilmsMap);
        }
      },
    }
  );

  return (
    <Sidebar>
      {/* Festival Selector */}
      <div className="p-4 border-b bg-muted/30">
          <div className="flex items-center gap-2">
            <Select
              value={currentFestivalId}
              onValueChange={handleFestivalChange}
            >
              <SelectTrigger className="w-full bg-background shadow-sm border-muted-foreground/20">
                <SelectValue placeholder="Select a festival" />
              </SelectTrigger>
              <SelectContent>
                {festivals.map((festival) => (
                  <SelectItem key={festival.id} value={festival.id}>
                    {festival.year} - {festival.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

      <SidebarHeader className="p-4 border-b">
        <div className="relative">
          <Input
            placeholder="篩選影片"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pr-8 shadow-sm border-muted-foreground/20 focus-visible:ring-offset-1"
          />
          {search.length > 0 && (
            <div
              onClick={() => setSearch("")}
              className="cursor-pointer absolute right-2.5 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
            >
              <X size={14} className="text-muted-foreground" />
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent>
        {/* Selected Sessions Section */}
        <Collapsible
          defaultOpen
          className="group/collapsible overflow-y-auto max-h-[240px]"
        >
          <SidebarGroup>
            <SidebarGroupLabel asChild>
              <CollapsibleTrigger className="sticky bg-background top-0 font-medium text-sm py-2.5 border-b border-t border-border/50 z-10">
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
                  <p className="text-sm p-4 text-muted-foreground italic text-center">沒有選擇的場次</p>
                )}
              </SidebarGroupContent>
            </CollapsibleContent>
          </SidebarGroup>
        </Collapsible>

        {/* Starred Films Section */}
        <Collapsible className="group/collapsible max-h-[240px] overflow-y-auto">
          <SidebarGroup>
            <SidebarGroupLabel asChild>
              <CollapsibleTrigger className="sticky bg-background top-0 font-medium text-sm py-2.5 border-b border-border/50 z-10">
                已追蹤影片
                <ChevronDown className="ml-auto transition-transform group-data-[state=open]/collapsible:rotate-180" />
              </CollapsibleTrigger>
            </SidebarGroupLabel>

            <CollapsibleContent>
              <SidebarGroupContent className="max-h-full p-2">
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
                  <p className="text-sm p-4 text-muted-foreground italic text-center">沒有追蹤的影片</p>
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
              <CollapsibleTrigger className="sticky top-0 bg-background font-medium text-sm py-2.5 border-b border-border/50 z-10">
                影片列表
                <ChevronDown className="ml-auto transition-transform group-data-[state=open]/collapsible:rotate-180" />
              </CollapsibleTrigger>
            </SidebarGroupLabel>

            <CollapsibleContent>
              <SidebarGroupContent className="max-h-full p-2">
                {filteredFilms.length > 0 ? (
                  filteredFilms.map((film) => {
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
                  })
                ) : (
                  <p className="text-sm p-4 text-muted-foreground italic text-center">沒有符合條件的影片</p>
                )}
              </SidebarGroupContent>
            </CollapsibleContent>
          </SidebarGroup>
        </Collapsible>
      </SidebarContent>

      <SidebarFooter className="p-3 border-t bg-muted/30">
        <div className="flex gap-2 justify-end">
          <ModeToggle />
          <TooltipProvider delayDuration={0}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  onClick={openOnboardingModal}
                  variant="outline"
                  size="icon"
                  className="shadow-sm border-muted-foreground/20 hover:bg-muted/50"
                >
                  <Compass className="h-[1.2rem] w-[1.2rem]" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>使用教學</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <TooltipProvider delayDuration={0}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  onClick={openAboutModal} 
                  variant="outline" 
                  size="icon"
                  className="shadow-sm border-muted-foreground/20 hover:bg-muted/50"
                >
                  <Info className="h-[1.2rem] w-[1.2rem]" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>關於</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <TooltipProvider delayDuration={0}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  onClick={openShareModal} 
                  variant="outline" 
                  size="icon"
                  className="shadow-sm border-muted-foreground/20 hover:bg-muted/50"
                >
                  <ExternalLink className="h-[1.2rem] w-[1.2rem]" />
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
