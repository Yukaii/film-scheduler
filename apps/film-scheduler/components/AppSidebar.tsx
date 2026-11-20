import { useMemo, useState, useEffect, type ReactNode, type KeyboardEvent } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
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
import dayjs from "@/lib/dayjs";
import { Star, X, Share2, Info, BookOpen, TriangleAlert } from "lucide-react";
import { Button } from "./ui/button";
import { ResizeHandle } from "./ResizeHandle";
import { usePanelWidth } from "@/hooks/usePanelWidth";
import { SIDEBAR_SIZE } from "@/lib/panelSizes";

type Tab = "films" | "schedule";
const WEEKDAYS = ["日", "一", "二", "三", "四", "五", "六"];

function FilmListItem({
  film,
  isPreviewing,
  pickedCount,
  handleFilmClick,
  onClickSession,
  isStarred,
  onStarToggle,
}: {
  film: Film;
  isPreviewing: boolean;
  pickedCount: number;
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
          {pickedCount > 0 && (
            <span
              className="shrink-0 rounded bg-brand px-1 text-[0.7rem] font-medium leading-4 text-brand-foreground"
              title={`已選 ${pickedCount} 場`}
            >
              已選
            </span>
          )}
          <span className="ml-auto shrink-0 text-xs tabular-nums text-muted-foreground">
            {film.duration} 分
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
          <Star size={15} className={cn(isStarred && "fill-yellow-400 text-yellow-500")} />
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
  film,
  conflict,
  onClick,
  onRemove,
}: {
  session: Session;
  film: Film | undefined;
  conflict: boolean;
  onClick: () => void;
  onRemove: () => void;
}) {
  const start = dayjs(session.time);
  const end = film ? start.add(film.duration, "minute") : undefined;

  return (
    <li
      className={cn(
        "flex items-center rounded-md border-l-2 hover:bg-sidebar-accent",
        conflict ? "border-destructive" : "border-brand",
      )}
    >
      <button type="button" onClick={onClick} className="min-w-0 flex-1 px-2.5 py-1.5 text-left">
        <p className="flex items-center gap-1.5 text-xs tabular-nums text-muted-foreground">
          <span className="font-medium text-foreground">
            {start.format("HH:mm")}
            {end && `–${end.format("HH:mm")}`}
          </span>
          {conflict && (
            <span className="inline-flex items-center gap-0.5 text-red-600 dark:text-red-400">
              <TriangleAlert className="size-3" />
              時間重疊
            </span>
          )}
        </p>
        <p className="truncate text-sm font-medium">{film?.filmTitle ?? "未知影片"}</p>
        <p className="truncate text-xs text-muted-foreground">{session.location}</p>
      </button>
      <button
        type="button"
        onClick={onRemove}
        className="mr-1 shrink-0 rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-background hover:text-red-500"
        aria-label={`移除 ${film?.filmTitle ?? ""} 場次`}
      >
        <X size={14} />
      </button>
    </li>
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
  return (
    <div className="px-4 py-8 text-center text-xs leading-relaxed text-muted-foreground">
      {children}
    </div>
  );
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

/** Segmented control used for the two sidebar tabs and the film filter. */
function Segmented<T extends string>({
  value,
  onChange,
  options,
  label,
  role,
  size = "md",
}: {
  value: T;
  onChange: (value: T) => void;
  options: { value: T; label: ReactNode; controls?: string }[];
  label: string;
  role: "tablist" | "radiogroup";
  size?: "sm" | "md";
}) {
  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
    e.preventDefault();
    const i = options.findIndex((o) => o.value === value);
    const next = options[(i + (e.key === "ArrowRight" ? 1 : options.length - 1)) % options.length];
    onChange(next.value);
    (e.currentTarget.querySelector(`[data-value="${next.value}"]`) as HTMLElement | null)?.focus();
  };

  return (
    <div
      role={role}
      aria-label={label}
      onKeyDown={onKeyDown}
      className={cn(
        "grid auto-cols-fr grid-flow-col rounded-lg bg-sidebar-accent/70 p-0.5",
        size === "sm" && "inline-grid",
      )}
    >
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            data-value={option.value}
            role={role === "tablist" ? "tab" : "radio"}
            aria-selected={role === "tablist" ? active : undefined}
            aria-checked={role === "radiogroup" ? active : undefined}
            aria-controls={option.controls}
            tabIndex={active ? 0 : -1}
            onClick={() => onChange(option.value)}
            className={cn(
              "inline-flex items-center justify-center gap-1.5 rounded-md font-medium transition-colors",
              size === "md" ? "h-8 text-sm" : "h-6 px-2.5 text-xs",
              active
                ? "bg-background text-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

function Count({ children }: { children: ReactNode }) {
  return <span className="text-xs font-normal tabular-nums text-muted-foreground">{children}</span>;
}

export function AppSidebar() {
  const { isMobile, setOpenMobile } = useSidebar();
  const [sidebarWidth, setSidebarWidth] = usePanelWidth(
    SIDEBAR_SIZE.storageKey,
    SIDEBAR_SIZE.defaultWidth,
  );
  const {
    films,
    filmsMap,
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
  const [tab, setTab] = useState<Tab>("films");
  const [filmFilter, setFilmFilter] = useState<"all" | "starred">("all");
  const [search, setSearch] = useState("");

  const handleFilmClick = (film: Film) => {
    if (previewFilmId === film.id) {
      setPreviewFilmId(undefined);
      revealFilmDetail(undefined);
    } else {
      setPreviewFilmId(film.id);
      revealFilmDetail(film);

      // On mobile the sidebar is a sheet covering the calendar. Close it so the
      // previewed sessions and the film's bottom sheet are visible.
      if (isMobile) {
        setOpenMobile(false);
      }
    }
  };

  const handleSessionClick = (session: Session) => {
    onClickSession(session);
    if (isMobile) setOpenMobile(false);
  };

  const handleStarToggle = (film: Film) => {
    if (starredFilmIds.includes(film.id)) {
      unstarFilm(film);
    } else {
      starFilm(film);
    }
  };

  // Starred ids can include other festivals' films; count only this festival's
  const starredFilms = useMemo(
    () => films.filter((f) => starredFilmIds.includes(f.id)),
    [films, starredFilmIds],
  );

  const visibleFilms = useMemo(() => {
    const pool = filmFilter === "starred" ? starredFilms : films;
    return search.trim() ? filterFilmsAdvanced(pool, search, sections) : pool;
  }, [search, films, starredFilms, sections, filmFilter]);

  const pickedCountByFilm = useMemo(() => {
    const counts = new Map<string, number>();
    for (const s of selectedSessions) counts.set(s.filmId, (counts.get(s.filmId) ?? 0) + 1);
    return counts;
  }, [selectedSessions]);

  // Picked sessions grouped by day, with overlapping ones flagged
  const { days, conflicts } = useMemo(() => {
    const sorted = [...selectedSessions].sort((a, b) => a.time - b.time);
    const conflicts = new Set<string>();
    let latestEnd = -Infinity;
    let latestId: string | undefined;
    for (const s of sorted) {
      const end = s.time + (filmsMap.get(s.filmId)?.duration ?? 0) * 60_000;
      if (s.time < latestEnd && latestId) {
        conflicts.add(s.id);
        conflicts.add(latestId);
      }
      if (end > latestEnd) {
        latestEnd = end;
        latestId = s.id;
      }
    }
    const days: { key: string; label: string; sessions: Session[] }[] = [];
    for (const s of sorted) {
      const d = dayjs(s.time);
      const key = d.format("YYYY-MM-DD");
      if (days.at(-1)?.key !== key) {
        days.push({ key, label: `${d.format("MM/DD")}（${WEEKDAYS[d.day()]}）`, sessions: [] });
      }
      days.at(-1)!.sessions.push(s);
    }
    return { days, conflicts };
  }, [selectedSessions, filmsMap]);

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

  const isFiltering = search.trim().length > 0 || filmFilter === "starred";
  // Only on first load; when switching festivals the previous list stays visible
  const showSkeleton = isLoadingFilms && films.length === 0;

  return (
    <Sidebar>
      {!isMobile && (
        <ResizeHandle
          edge="right"
          label="調整側欄寬度"
          width={sidebarWidth}
          minWidth={SIDEBAR_SIZE.minWidth}
          maxWidth={SIDEBAR_SIZE.maxWidth}
          onResize={setSidebarWidth}
          onReset={() => setSidebarWidth(null)}
        />
      )}
      <SidebarHeader className="gap-0 p-0">
        {/* Brand row: same height as the calendar header so the borders line up */}
        <div className="flex h-16 shrink-0 items-center border-b px-4">
          <BrandMark />
        </div>

        <div className="space-y-3 p-3 pb-2">
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

          <Segmented
            role="tablist"
            label="側欄分頁"
            value={tab}
            onChange={setTab}
            options={[
              {
                value: "films",
                controls: "sidebar-films",
                label: (
                  <>
                    影片 <Count>{showSkeleton ? "…" : films.length}</Count>
                  </>
                ),
              },
              {
                value: "schedule",
                controls: "sidebar-schedule",
                label: (
                  <>
                    我的片單 <Count>{selectedSessions.length}</Count>
                  </>
                ),
              },
            ]}
          />
        </div>

        {tab === "films" && (
          <div className="space-y-2 border-b px-3 pb-3">
            <SearchInput
              value={search}
              onChange={setSearch}
              placeholder="搜尋片名、導演或 date: time: 語法"
              className="bg-background"
              films={films}
              sections={sections}
            />
            <div className="flex items-center justify-between gap-2">
              <Segmented
                role="radiogroup"
                label="篩選影片"
                size="sm"
                value={filmFilter}
                onChange={setFilmFilter}
                options={[
                  { value: "all", label: "全部" },
                  {
                    value: "starred",
                    label: (
                      <>
                        <Star className="size-3" /> 追蹤 <Count>{starredFilms.length}</Count>
                      </>
                    ),
                  },
                ]}
              />
              {isFiltering && !showSkeleton && (
                <span className="text-xs tabular-nums text-muted-foreground">
                  {visibleFilms.length} 部
                </span>
              )}
            </div>
          </div>
        )}
      </SidebarHeader>

      <SidebarContent className="gap-0 border-t-0 px-2 py-2">
        {tab === "films" ? (
          <div id="sidebar-films" role="tabpanel" aria-label="影片">
            {showSkeleton ? (
              <FilmListSkeleton />
            ) : visibleFilms.length > 0 ? (
              <ul className="space-y-0.5">
                {visibleFilms.map((film) => (
                  <FilmListItem
                    key={film.id}
                    film={film}
                    isPreviewing={previewFilmId === film.id}
                    pickedCount={pickedCountByFilm.get(film.id) ?? 0}
                    handleFilmClick={handleFilmClick}
                    onClickSession={onClickSession}
                    isStarred={starredFilmIds.includes(film.id)}
                    onStarToggle={handleStarToggle}
                  />
                ))}
              </ul>
            ) : filmFilter === "starred" && starredFilms.length === 0 ? (
              <EmptyHint>
                按影片旁的 <Star className="inline size-3 align-[-1px]" /> 追蹤想看的片，
                <br />
                之後可以在這裡快速找到
              </EmptyHint>
            ) : (
              <EmptyHint>沒有符合條件的影片</EmptyHint>
            )}
          </div>
        ) : (
          <div id="sidebar-schedule" role="tabpanel" aria-label="我的片單">
            {days.length > 0 ? (
              <div className="space-y-3">
                {conflicts.size > 0 && (
                  <p className="mx-1 flex items-center gap-1.5 rounded-md bg-red-500/10 px-2.5 py-2 text-xs text-red-700 dark:text-red-300">
                    <TriangleAlert className="size-3.5 shrink-0" />
                    有 {conflicts.size} 個場次時間重疊
                  </p>
                )}
                {days.map((day) => (
                  <section key={day.key} aria-label={day.label}>
                    <h3 className="sticky top-0 z-10 flex items-baseline justify-between bg-sidebar px-2.5 py-1 text-xs font-medium">
                      {day.label}
                      <Count>{day.sessions.length} 場</Count>
                    </h3>
                    <ul className="space-y-1">
                      {day.sessions.map((session) => (
                        <SessionListItem
                          key={session.id}
                          session={session}
                          film={filmsMap.get(session.filmId)}
                          conflict={conflicts.has(session.id)}
                          onClick={() => handleSessionClick(session)}
                          onRemove={() => removeSession(session)}
                        />
                      ))}
                    </ul>
                  </section>
                ))}
              </div>
            ) : (
              <EmptyHint>
                還沒有選任何場次。
                <br />
                在行事曆上點灰色的場次就會加進片單。
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-4"
                  onClick={() => setTab("films")}
                >
                  瀏覽影片
                </Button>
              </EmptyHint>
            )}
          </div>
        )}
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
