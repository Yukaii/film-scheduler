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
import { FilmBottomPanel } from "./FilmBottomPanel";
import { Dayjs } from "dayjs";

type ViewMode = "week" | "day";

export function CalendarView(props: { className?: string }) {
  const { currentDate, previewSessions, selectedSessions, setCurrentDate, revealFilmDetail, filmsMap, isLoadingFilms } =
    useAppContext();

  // Add state to track the current view week from infinite scroll
  const [viewWeekStart, setViewWeekStart] = useState(() =>
    dayjs(currentDate).startOf("week")
  );
  const [highlightDate, setHighlightDate] = useState(currentDate);
  const [viewMode, setViewMode] = useState<ViewMode>("week");
  const [dayViewFilmPanelOpen, setDayViewFilmPanelOpen] = useState(false);

  // Handle film detail viewing in day view
  const handleDayViewFilmDetail = (filmId: string) => {
    const film = filmsMap.get(filmId);
    if (film) {
      revealFilmDetail(film);
      setDayViewFilmPanelOpen(true);
    }
  };

  // Update navigate to handle both week and day navigation
  const navigate = (direction: "previous" | "next") => {
    if (viewMode === "week") {
      const newWeekStart = direction === "next"
        ? viewWeekStart.add(1, "week")
        : viewWeekStart.subtract(1, "week");

      setViewWeekStart(newWeekStart);
      setCurrentDate(newWeekStart.toDate());
    } else {
      // Day navigation
      const newDate = direction === "next"
        ? dayjs(currentDate).add(1, "day")
        : dayjs(currentDate).subtract(1, "day");

      setCurrentDate(newDate.toDate());
      setViewWeekStart(newDate.startOf("week"));
    }
  };

  const { open, isMobile, openMobile, toggleSidebar } = useSidebar();

  const goToToday = () => {
    const today = new Date();
    const todayWeekStart = dayjs(today).startOf("week");

    setCurrentDate(today);
    setViewWeekStart(todayWeekStart);
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
                      const newWeekStart = dayjs(date).startOf("week");
                      setViewWeekStart(newWeekStart);
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
              ["week", "週"],
              ["day", "日"],
            ] as const).map(([mode, label]) => (
              <button
                key={mode}
                type="button"
                role="radio"
                aria-checked={viewMode === mode}
                onClick={() => setViewMode(mode)}
                className={cn(
                  "h-7 rounded-md px-3 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground",
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
            <div className="h-full w-1/3 animate-loading-bar bg-red-500" />
          </div>
        )}
      </header>

      {/* Conditional rendering based on view mode */}
      <div className={cn({ "pb-[280px]": viewMode === "day" && dayViewFilmPanelOpen })}>
        {viewMode === "week" ? (
          <WeekView
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

      {/* Film bottom panel for day view */}
      {viewMode === "day" && (
        <FilmBottomPanel
          open={dayViewFilmPanelOpen}
          setOpen={setDayViewFilmPanelOpen}
        />
      )}
    </div>
  );
}
