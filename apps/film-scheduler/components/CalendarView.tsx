import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "@/components/Icons";
import dayjs from "@/lib/dayjs";
import { useAppContext } from "@/contexts/AppContext";
import { cn, scrollNowIndicatorIntoView } from "@/lib/utils";
import { useSidebar } from "./ui/sidebar";
import { CalendarIcon, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { BrandMark } from "./BrandMark";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { WeekView } from "./WeekView";
import { DayView } from "./DayView";
import { Dayjs } from "dayjs";
import { useVisibleDays, WIDE_VISIBLE_DAYS } from "@/hooks/useVisibleDays";

type ViewMode = "week" | "day";

export function CalendarView(props: { className?: string }) {
  const { currentDate, previewSessions, selectedSessions, setCurrentDate, revealFilmDetail, filmsMap, isLoadingFilms } =
    useAppContext();

  // 7 columns on wide screens, 3 on phones. With 7 the view starts on the week's
  // first day; with 3 it starts on the chosen day itself so that day is in view.
  const visibleDays = useVisibleDays();
  const anchorDay = (date: Date | Dayjs) =>
    visibleDays === WIDE_VISIBLE_DAYS ? dayjs(date).startOf("week") : dayjs(date).startOf("day");

  // First visible day of the multi-day view (named for the 7-day case)
  const [viewWeekStart, setViewWeekStart] = useState(() =>
    dayjs(currentDate).startOf("week")
  );
  const [highlightDate, setHighlightDate] = useState(currentDate);
  const [viewMode, setViewMode] = useState<ViewMode>("week");

  // The column count is only known after hydration (and changes on rotate/resize).
  // Re-anchor then: the current date if it is in the shown range, else the first shown day.
  const [prevVisibleDays, setPrevVisibleDays] = useState(visibleDays);
  if (visibleDays !== prevVisibleDays) {
    setPrevVisibleDays(visibleDays);
    const current = dayjs(currentDate);
    const inView =
      !current.isBefore(viewWeekStart, "day") &&
      current.isBefore(viewWeekStart.add(prevVisibleDays, "day"), "day");
    setViewWeekStart(anchorDay(inView ? current : viewWeekStart));
  }

  // Day view opens the same film panel as the week view
  const handleDayViewFilmDetail = (filmId: string) => {
    const film = filmsMap.get(filmId);
    if (film) {
      revealFilmDetail(film);
    }
  };

  // Week mode pages by the number of visible columns; day mode by one day
  const navigate = (direction: "previous" | "next") => {
    if (viewMode === "week") {
      const newWeekStart = direction === "next"
        ? viewWeekStart.add(visibleDays, "day")
        : viewWeekStart.subtract(visibleDays, "day");

      setViewWeekStart(newWeekStart);
      setCurrentDate(newWeekStart.toDate());
    } else {
      // Day navigation
      const newDate = direction === "next"
        ? dayjs(currentDate).add(1, "day")
        : dayjs(currentDate).subtract(1, "day");

      setCurrentDate(newDate.toDate());
      setViewWeekStart(anchorDay(newDate));
    }
  };

  const { open, isMobile, openMobile, toggleSidebar } = useSidebar();

  const goToToday = () => {
    const today = new Date();

    setCurrentDate(today);
    setViewWeekStart(anchorDay(today));
    scrollNowIndicatorIntoView();
  };

  const formatHeaderDate = () => {
    if (viewMode === "week") {
      return viewWeekStart.format("YYYY 年 M 月");
    } else {
      return dayjs(currentDate).format("YYYY 年 M 月 D 日");
    }
  };

  const sidebarVisible = isMobile ? openMobile : open;

  return (
    <div className={cn("w-full", props.className)}>
      {/* Height must match the sidebar brand row (h-16) and the WeekView height calc */}
      <header className="sticky top-0 z-20 flex h-16 items-center justify-between gap-2 border-b bg-background px-2 md:px-4">
        <div className="flex min-w-0 items-center gap-0.5 sm:gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleSidebar}
            aria-label={sidebarVisible ? "收合側欄" : "展開側欄"}
          >
            {sidebarVisible ? <PanelLeftClose /> : <PanelLeftOpen />}
          </Button>

          {/* Mobile shows the brand inside the sidebar sheet; desktop shows it here when the sidebar is collapsed */}
          {!isMobile && !open && <BrandMark compact className="mr-1" />}

          <div className="flex items-center">
            <Button variant="ghost" size="icon" onClick={() => navigate("previous")} aria-label="上一頁">
              <ChevronLeft className="h-5 w-5" />
            </Button>

            <Popover>
              <PopoverTrigger asChild>
                <Button variant="ghost" className="gap-2 px-2 text-base font-semibold tabular-nums">
                  {formatHeaderDate()}
                  <CalendarIcon className="hidden text-muted-foreground sm:block" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={currentDate}
                  onSelect={(date) => {
                    if (date) {
                      setViewWeekStart(anchorDay(date));
                      setCurrentDate(date);
                      setHighlightDate(date);
                    }
                  }}
                  autoFocus
                />
              </PopoverContent>
            </Popover>

            <Button variant="ghost" size="icon" onClick={() => navigate("next")} aria-label="下一頁">
              <ChevronRight className="h-5 w-5" />
            </Button>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <Button variant="outline" size="sm" onClick={goToToday}>
            今天
          </Button>

          <div role="radiogroup" aria-label="檢視模式" className="inline-flex rounded-lg bg-muted p-0.5">
            {([
              ["week", visibleDays === WIDE_VISIBLE_DAYS ? "週" : `${visibleDays} 日`],
              ["day", "日"],
            ] as const).map(([mode, label]) => (
              <button
                key={mode}
                type="button"
                role="radio"
                aria-checked={viewMode === mode}
                onClick={() => setViewMode(mode)}
                className={cn(
                  "h-7 rounded-md px-2.5 text-sm whitespace-nowrap sm:px-3 font-medium text-muted-foreground transition-colors hover:text-foreground",
                  viewMode === mode && "bg-background text-foreground shadow-xs",
                )}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {isLoadingFilms && (
          <div role="progressbar" aria-label="載入影片中" className="absolute inset-x-0 -bottom-px h-0.5 overflow-hidden">
            <div className="h-full w-1/3 animate-loading-bar bg-brand" />
          </div>
        )}
      </header>

      {/* Conditional rendering based on view mode */}
      <div>
        {viewMode === "week" ? (
          <WeekView
            visibleDays={visibleDays}
            viewWeekStart={viewWeekStart}
            highlightDate={highlightDate}
            onWeekStartChange={(d: Dayjs) => {
              setViewWeekStart(d);
            }}
            selectedSessions={selectedSessions}
            previewSessions={previewSessions}
          />
        ) : (
          <DayView
            currentDate={dayjs(currentDate)}
            selectedSessions={selectedSessions}
            previewSessions={previewSessions}
            onFilmDetailView={handleDayViewFilmDetail}
          />
        )}
      </div>
    </div>
  );
}
