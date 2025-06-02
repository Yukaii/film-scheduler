import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "@/components/Icons";
import dayjs from "@/lib/dayjs";
import { useAppContext } from "@/contexts/AppContext";
import { cn, scrollNowIndicatorIntoView } from "@/lib/utils";
import { useSidebar } from "./ui/sidebar";
import { CalendarIcon, PanelLeftClose, PanelLeftOpen, Calendar as CalendarDaysIcon } from "lucide-react";
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
  const { currentDate, previewSessions, selectedSessions, setCurrentDate, revealFilmDetail, filmsMap } =
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
      return viewWeekStart.format("YYYY/MM");
    } else {
      return dayjs(currentDate).format("YYYY/MM/DD");
    }
  };

  return (
    <div className={cn("w-full", props.className)}>
      <div className="py-2 md:py-4 flex justify-between items-center sticky top-0 bg-background z-20 md:px-4 px-2">
        <div className="flex items-center">
          <Button variant="ghost" onClick={toggleSidebar}>
            {(isMobile ? openMobile : open) ? (
              <PanelLeftClose size={16} />
            ) : (
              <PanelLeftOpen size={16} />
            )}
          </Button>

          <Button
            variant="ghost"
            onClick={() => navigate("previous")}
            className="mr-2"
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>

          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="mx-2">
                {formatHeaderDate()}{" "}
                <CalendarIcon className="ml-2 h-4 w-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
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
                initialFocus
              />
            </PopoverContent>
          </Popover>

          <Button
            variant="ghost"
            onClick={() => navigate("next")}
            className="ml-2"
          >
            <ChevronRight className="h-5 w-5" />
          </Button>
        </div>

        <div className="flex items-center gap-2">
          {/* View Mode Toggle */}
          <div className="flex border rounded-md">
            <Button
              variant={viewMode === "week" ? "default" : "ghost"}
              size="sm"
              onClick={() => setViewMode("week")}
              className="rounded-r-none"
            >
              Week
            </Button>
            <Button
              variant={viewMode === "day" ? "default" : "ghost"}
              size="sm"
              onClick={() => setViewMode("day")}
              className="rounded-l-none"
            >
              <CalendarDaysIcon className="h-4 w-4 mr-1" />
              Day
            </Button>
          </div>

          <Button variant="ghost" onClick={goToToday}>
            今天
          </Button>
        </div>
      </div>

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
