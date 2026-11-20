import { useMemo, useState, useEffect, type ReactNode } from "react";
import { useSearchParams, useRouter } from "next/navigation";
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
import { ModeToggle } from "./ModeToggle";
import { SearchInput } from "./SearchInput";
import { BrandMark } from "./BrandMark";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Film, Session } from "./types";
import { cn } from "@/lib/utils";
import { filterFilmsAdvanced } from "@/lib/searchParser";
import dayjs from "dayjs";
import { ChevronDown, Star, X, Share2, Info, BookOpen } from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Button } from "./ui/button";

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
}) {
  return (
    <li
      className={cn(
        "rounded-md transition-colors",
        isPreviewing && "bg-sidebar-accent ring-1 ring-sidebar-border",
      )}
    >
      <div className="flex items-center">
        <button
          type="button"
          aria-expanded={isPreviewing}
          onClick={() => {
            handleFilmClick(film);
            if (film.schedule.length > 0) {
              onClickSession(film.schedule[0]);
            }
          }}
          className="flex min-w-0 flex-1 items-center gap-2 rounded-md py-1.5 pl-2.5 pr-1 text-left text-sm hover:bg-sidebar-accent"
        >
          <span className="truncate font-medium">{film.filmTitle}</span>
          <span className="ml-auto shrink-0 text-xs tabular-nums text-muted-foreground">
            {film.duration} 分鐘
          </span>
        </button>

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onStarToggle(film);
          }}
          className="shrink-0 rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-foreground"
          aria-label={isStarred ? `取消追蹤 ${film.filmTitle}` : `追蹤 ${film.filmTitle}`}
          aria-pressed={isStarred}
        >
          <Star
            size={15}
            className={cn(isStarred && "fill-yellow-400 text-yellow-500")}
          />
        </button>
      </div>

      {isPreviewing && film.schedule.length > 0 && (
        <ul className="space-y-0.5 px-1.5 pb-1.5">
          {film.schedule.map((session) => (
            <li key={session.id}>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onClickSession(session);
                }}
                className="flex w-full items-baseline gap-2 rounded px-1.5 py-1 text-left text-xs hover:bg-background/70"
              >
                <span className="shrink-0 font-medium tabular-nums">
                  {dayjs(session.time).format("MM/DD HH:mm")}
                </span>
                <span className="truncate text-muted-foreground">{session.location}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </li>
  );
}

function SessionListItem({
  session,
  removeSession,
}: {
  session: Session;
  removeSession: (session: Session) => void;
}) {
  const { filmsMap, onClickSession } = useAppContext();
  const film = filmsMap.get(session.filmId);

  return (
    <li className="group/session flex items-center rounded-md hover:bg-sidebar-accent">
      <button
        type="button"
        onClick={() => onClickSession(session)}
        className="min-w-0 flex-1 px-2.5 py-1.5 text-left"
      >
        <p className="truncate text-sm font-medium">{film?.filmTitle ?? "未知影片"}</p>
        <p className="truncate text-xs text-muted-foreground">
          <span className="tabular-nums">{dayjs(session.time).format("MM/DD HH:mm")}</span>
          {" · "}
          {session.location}
        </p>
      </button>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          removeSession(session);
        }}
        className="mr-1 shrink-0 rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-background hover:text-red-500"
        aria-label={`移除 ${film?.filmTitle ?? ""} 場次`}
      >
        <X size={14} />
      </button>
    </li>
  );
}

/** Collapsible sidebar section with a sticky, quiet header and an item count. */
function SidebarSection({
  title,
  count,
  defaultOpen,
  className,
  children,
}: {
  title: string;
  count: ReactNode;
  defaultOpen?: boolean;
  className?: string;
  children: ReactNode;
}) {
  return (
    <Collapsible
      defaultOpen={defaultOpen}
      className={cn("group/collapsible overflow-y-auto", className)}
    >
      <SidebarGroup className="py-1">
        <SidebarGroupLabel asChild>
          <CollapsibleTrigger className="sticky top-0 z-10 h-8 gap-2 bg-sidebar text-xs font-medium text-muted-foreground hover:text-foreground">
            {title}
            <span className="rounded-full bg-sidebar-accent px-1.5 py-px text-[0.7rem] tabular-nums text-muted-foreground">
              {count}
            </span>
            <ChevronDown className="ml-auto transition-transform group-data-[state=open]/collapsible:rotate-180" />
          </CollapsibleTrigger>
        </SidebarGroupLabel>
        <CollapsibleContent>
          <SidebarGroupContent>{children}</SidebarGroupContent>
        </CollapsibleContent>
      </SidebarGroup>
    </Collapsible>
  );
}

// Fixed widths (not random) so server and client render the same markup
const SKELETON_WIDTHS = ["72%", "55%", "80%", "48%", "66%", "58%", "75%", "52%", "69%", "61%"];

function FilmListSkeleton() {
  return (
    <ul aria-busy="true" aria-label="載入影片中" className="space-y-0.5">
      {SKELETON_WIDTHS.map((width, i) => (
        <li key={i} className="flex h-9 items-center gap-2 px-2.5">
          <span className="h-3.5 animate-pulse rounded bg-sidebar-accent" style={{ width }} />
          <span className="ml-auto h-3 w-10 animate-pulse rounded bg-sidebar-accent" />
        </li>
      ))}
    </ul>
  );
}

function EmptyHint({ children }: { children: ReactNode }) {
  return <p className="px-2.5 py-3 text-center text-xs text-muted-foreground">{children}</p>;
}

function IconAction({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button onClick={onClick} variant="ghost" size="icon" aria-label={label}>
          {children}
        </Button>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}

export function AppSidebar() {
  const { isMobile } = useSidebar();
  const {
    films,
    festivals,
    defaultFestivalId,
    sections,
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
    isLoadingFilms,
  } = useAppContext();
  const [search, setSearch] = useState("");
  const sortedSelectedSessions = useMemo(
    () => [...selectedSessions].sort((a, b) => a.time - b.time),
    [selectedSessions],
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
    if (!search.trim()) {
      return films;
    }

    return filterFilmsAdvanced(films, search, sections);
  }, [search, films, sections]);

  const starredFilms = useMemo(() => {
    return films.filter((f) => starredFilmIds.includes(f.id));
  }, [starredFilmIds, films]);

  const searchParams = useSearchParams();
  const router = useRouter();
  const { currentFestivalId, setCurrentFestivalId } = useAppContext();

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
  }, [festivals, defaultFestivalId, searchParams, router, setCurrentFestivalId]);

  const handleFestivalChange = (festivalId: string) => {
    setCurrentFestivalId(festivalId);
    router.push(`?festival=${festivalId}`);
  };

  const renderFilm = (film: Film) => (
    <FilmListItem
      key={film.id}
      film={film}
      isPreviewing={previewFilmId === film.id}
      handleFilmClick={handleFilmClick}
      onClickSession={onClickSession}
      isStarred={starredFilmIds.includes(film.id)}
      onStarToggle={handleStarToggle}
    />
  );

  const isFiltering = search.trim().length > 0;
  // Only on first load; when switching festivals the previous list stays visible
  const showSkeleton = isLoadingFilms && films.length === 0;

  return (
    <Sidebar>
      <SidebarHeader className="gap-0 p-0">
        {/* Brand row: same height as the calendar header so the borders line up */}
        <div className="flex h-16 shrink-0 items-center border-b px-4">
          <BrandMark />
        </div>

        <div className="space-y-2 border-b p-3">
          <Select value={currentFestivalId} onValueChange={handleFestivalChange}>
            <SelectTrigger aria-label="選擇影展" className="w-full bg-background font-medium">
              <SelectValue placeholder="選擇影展" />
            </SelectTrigger>
            <SelectContent>
              {festivals.map((festival) => (
                <SelectItem key={festival.id} value={festival.id}>
                  {festival.year} {festival.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="搜尋影片、導演或 date: time: 語法"
            className="bg-background"
            films={films}
            sections={sections}
          />
        </div>
      </SidebarHeader>

      <SidebarContent className="gap-0 py-1">
        <SidebarSection
          title="已選擇場次"
          count={selectedSessions.length}
          defaultOpen
          className="max-h-[240px] shrink-0"
        >
          {sortedSelectedSessions.length > 0 ? (
            <ul className="space-y-0.5">
              {sortedSelectedSessions.map((session) => (
                <SessionListItem key={session.id} session={session} removeSession={removeSession} />
              ))}
            </ul>
          ) : (
            <EmptyHint>點選行事曆上的灰色場次即可加入</EmptyHint>
          )}
        </SidebarSection>

        <SidebarSection
          title="已追蹤影片"
          count={starredFilms.length}
          className="max-h-[240px] shrink-0"
        >
          {starredFilms.length > 0 ? (
            <ul className="space-y-0.5">{starredFilms.map(renderFilm)}</ul>
          ) : (
            <EmptyHint>按下影片旁的星號來追蹤</EmptyHint>
          )}
        </SidebarSection>

        <SidebarSection
          title="影片列表"
          count={showSkeleton ? "…" : isFiltering ? `${filteredFilms.length}/${films.length}` : films.length}
          defaultOpen
          className="min-h-0 flex-1"
        >
          {showSkeleton ? (
            <FilmListSkeleton />
          ) : filteredFilms.length > 0 ? (
            <ul className="space-y-0.5">{filteredFilms.map(renderFilm)}</ul>
          ) : (
            <EmptyHint>沒有符合條件的影片</EmptyHint>
          )}
        </SidebarSection>
      </SidebarContent>

      <SidebarFooter className="border-t p-3">
        <TooltipProvider delayDuration={200}>
          <div className="flex items-center gap-1">
            <Button onClick={openShareModal} size="sm" className="mr-auto gap-2">
              <Share2 />
              分享片單
              {selectedSessions.length > 0 && (
                <span className="rounded-full bg-primary-foreground/20 px-1.5 text-xs tabular-nums">
                  {selectedSessions.length}
                </span>
              )}
            </Button>
            <ModeToggle />
            <IconAction label="使用教學" onClick={openOnboardingModal}>
              <BookOpen />
            </IconAction>
            <IconAction label="關於" onClick={openAboutModal}>
              <Info />
            </IconAction>
          </div>
        </TooltipProvider>
      </SidebarFooter>
    </Sidebar>
  );
}
