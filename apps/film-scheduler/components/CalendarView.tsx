import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "@/components/Icons";
import dayjs from "@/lib/dayjs";
import { useAppContext } from "@/contexts/AppContext";
import { cn, scrollNowIndicatorIntoView } from "@/lib/utils";
import { useSidebar } from "./ui/sidebar";
import { CalendarIcon, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { WeekView } from "./WeekView";
import { Dayjs } from "dayjs";

export function CalendarView(props: { className?: string }) {
  const { currentDate, previewSessions, selectedSessions, setCurrentDate } =
    useAppContext();

  // Add state to track the current view week from infinite scroll
  const [viewWeekStart, setViewWeekStart] = useState(() =>
    dayjs(currentDate).startOf("week")
  );
  const [highlightDate, setHighlightDate] = useState(currentDate);

  // Update navigate week to use viewWeekStart instead of currentDate
  const navigateWeek = (direction: "previous" | "next") => {
    const newWeekStart = direction === "next"
      ? viewWeekStart.add(1, "week")
      : viewWeekStart.subtract(1, "week");

    setViewWeekStart(newWeekStart);
    setCurrentDate(newWeekStart.toDate());
  };

  const { open, isMobile, openMobile, toggleSidebar } = useSidebar();

  // Modified to update both current date and view week
  const goToToday = () => {
    const today = new Date();
    const todayWeekStart = dayjs(today).startOf("week");

    setCurrentDate(today);
    setViewWeekStart(todayWeekStart);
    scrollNowIndicatorIntoView();
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
            onClick={() => navigateWeek("previous")}
            className="mr-2"
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>

          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="mx-2">
                {viewWeekStart.format("YYYY/MM")}{" "}
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
            onClick={() => navigateWeek("next")}
            className="ml-2"
          >
            <ChevronRight className="h-5 w-5" />
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="ghost" onClick={goToToday}>
            今天
          </Button>
        </div>
      </div>

      <WeekView
        viewWeekStart={viewWeekStart}
        highlightDate={highlightDate}
        onWeekStartChange={(d: Dayjs) => {
          setViewWeekStart(d);
        }}
        selectedSessions={selectedSessions}
        previewSessions={previewSessions}
      />
    </div>
  );
}
