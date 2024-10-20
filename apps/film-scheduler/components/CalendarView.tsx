import React, { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "@/components/Icons";
import dayjs from "dayjs";
import "dayjs/locale/en";
import isBetween from "dayjs/plugin/isBetween";
import { Session } from "./types";
import { useAppContext } from "@/contexts/AppContext";
import {
  cn,
  findSessionIndex,
  generateSessionId,
  includesSession,
} from "@/lib/utils";
import { useSidebar } from "./ui/sidebar";
import { X, CalendarIcon, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

dayjs.extend(isBetween);
dayjs.locale("en");

interface WeekViewProps {
  currentWeekStart: dayjs.Dayjs;
  selectedSessions: Session[];
  previewSessions: Session[];
}

function WeekView({
  currentWeekStart,
  selectedSessions,
  previewSessions,
}: WeekViewProps) {
  const weekDays = Array.from({ length: 7 }, (_, i) =>
    currentWeekStart.add(i, "day"),
  );
  const {
    filmsMap,
    addSession,
    removeSession,
    revealFilmDetail,
    viewingFilmId,
  } = useAppContext();

  const startHour = 10;
  const hoursInDay = 14;

  const sessions = Array.from(
    new Map(
      [...selectedSessions, ...previewSessions].map((session) => [
        session.filmId + session.time + session.location,
        session,
      ]),
    ).values(),
  );

  return (
    <div className="grid grid-cols-[30px_repeat(7,_minmax(0,1fr))] md:grid-cols-[60px_repeat(7,_minmax(0,1fr))] md:px-4 px-1">
      {/* Time Labels Column */}
      <div className="w-full pb-4 py-7 bg-background mb-4">
        <div className="relative h-[840px]">
          {Array.from({ length: hoursInDay + 1 }, (_, hour) => (
            <div
              key={hour}
              className="absolute left-0 w-full"
              style={{ top: `${hour * 60}px`, height: "60px" }}
            >
              <span className="md:text-xs text-[10px] absolute p-1 -top-3 bg-background">
                {dayjs()
                  .hour(startHour + hour)
                  .format("h A")}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Week Days Columns */}
      {weekDays.map((day) => (
        <div
          key={day.format("YYYY-MM-DD")}
          className="w-full pb-4 bg-background mb-4 relative"
        >
          <div className="font-semibold md:text-sm pb-2 text-xs text-center h-7 sticky md:top-16 top-[50px] bg-background z-10 border-solid border-b-2 border-border">
            {day.format("ddd")} {day.format("D")}
          </div>

          <div className="relative h-[840px] border-t border-b border-border">
            {Array.from({ length: hoursInDay }, (_, hour) => (
              <div
                key={hour}
                className="absolute left-0 w-full border-t border-border"
                style={{ top: `${hour * 60}px`, height: "60px" }}
              />
            ))}
            {sessions
              .filter((session) => dayjs(session.time).isSame(day, "day"))
              .map((session) => {
                const film = filmsMap.get(session.filmId);
                if (!film) return null;

                const sessionId = generateSessionId(session);

                const startTime = dayjs(session.time);
                const endTime = startTime.add(film.duration, "minute");
                const startHourOffset = startTime.hour() - startHour;
                const startMinute = startTime.minute();
                const top = startHourOffset * 60 + startMinute;
                const height = film.duration;

                const overlappingSessions = sessions
                  .filter((s) => {
                    const targetSessionFilm = filmsMap.get(s.filmId);
                    if (!targetSessionFilm) return false;

                    const targetStartTime = dayjs(s.time);
                    const targetEndTime = dayjs(s.time).add(
                      targetSessionFilm.duration,
                      "minute",
                    );

                    return (
                      targetStartTime.isSame(day, "day") &&
                      (targetStartTime.isBetween(
                        startTime,
                        endTime,
                        null,
                        "[]",
                      ) ||
                        targetEndTime.isBetween(startTime, endTime, null, "[]"))
                    );
                  })
                  .sort((a, b) =>
                    generateSessionId(a).localeCompare(generateSessionId(b)),
                  );

                const overlappedIndex = findSessionIndex(
                  overlappingSessions,
                  session,
                );
                const offset = overlappedIndex * 10;
                const width = `calc(100% - ${offset + 10}px)`;
                const left = `${10 + offset}px`;

                const isSelectedSession = includesSession(
                  selectedSessions,
                  session,
                );
                const isPreviewSession = includesSession(
                  previewSessions,
                  session,
                );

                return (
                  <div
                    id={sessionId}
                    key={sessionId}
                    className={cn(
                      "absolute max-w-[calc(100%-10px)] p-1 text-white rounded shadow transition-opacity duration-200 hover:opacity-100",
                      "border-4 border-solid border-transparent overflow-hidden",
                      {
                        "opacity-70 hover:cursor-zoom-in bg-slate-600 dark:bg-slate-800 border-slate-600 dark:border-slate-800":
                          !isSelectedSession,
                        "opacity-100 dark:bg-violet-900 bg-violet-500 dark:hover:border-white cursor-pointer hover:border-violet-700":
                          isSelectedSession,
                      },
                    )}
                    onClick={() => {
                      if (isPreviewSession) {
                        addSession(session);
                      }

                      if (isSelectedSession) {
                        revealFilmDetail(film);
                      }
                    }}
                    style={{
                      top: `${top}px`,
                      height: `${height}px`,
                      width,
                      left,
                      zIndex:
                        viewingFilmId === session.filmId
                          ? 5
                          : 5 - overlappedIndex,
                    }}
                    title={film.filmTitle}
                  >
                    {isSelectedSession && (
                      <button
                        className="absolute top-1 right-1"
                        onClick={(e) => {
                          e.stopPropagation();
                          removeSession(session);
                        }}
                      >
                        <X className="h-4 w-4 text-white" />
                      </button>
                    )}

                    <div className="text-xs font-medium w-full pr-4">
                      {film.filmTitle}
                    </div>
                    <p className="text-[10px] text-white/60 mb-1">
                      {startTime.format(
                        startTime.minute() === 0 ? "HH" : "HH:mm",
                      )}
                      {' '}‒{' '}
                      {endTime.format(
                        endTime.minute() === 0 ? "HH A" : "HH:mm A",
                      )}
                    </p>
                    <p className="text-[10px] text-white/80">{session.location}</p>
                  </div>
                );
              })}
          </div>
        </div>
      ))}
    </div>
  );
}

export default function CalendarView(props: { className?: string }) {
  const { today, previewSessions, selectedSessions, setCurrentDate } =
    useAppContext();
  const currentWeekStart = useMemo(
    () => dayjs(today).startOf("week").add(1, "day"),
    [today],
  );
  const [selectedDate, setSelectedDate] = useState(currentWeekStart.toDate());

  const navigateWeek = (direction: "previous" | "next") => {
    setCurrentDate((prev) => {
      const currentDayjs = dayjs(prev);
      return direction === "next"
        ? currentDayjs.add(1, "week").toDate()
        : currentDayjs.subtract(1, "week").toDate();
    });
  };

  const { isMobile, openMobile, toggleSidebar } = useSidebar();
  const goToToday = () => {
    setCurrentDate(new Date());
    setSelectedDate(new Date());
  };

  return (
    <div className={cn("w-full md:px-4", props.className)}>
      <div className="md:mb-4 py-2 md:py-4 flex justify-between items-center sticky top-0 bg-background z-10">
        <div className="flex items-center">
          {isMobile && (
            <Button variant="ghost" onClick={toggleSidebar}>
              {openMobile ? (
                <PanelLeftClose size={16} />
              ) : (
                <PanelLeftOpen size={16} />
              )}
            </Button>
          )}
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
                {dayjs(selectedDate).format("YYYY/MM")}{" "}
                <CalendarIcon className="ml-2 h-4 w-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={(date) => {
                  if (date) {
                    setSelectedDate(date);
                    setCurrentDate(
                      dayjs(date).startOf("week").add(1, "day").toDate(),
                    );
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

        <Button variant="ghost" onClick={goToToday}>
          Today
        </Button>
      </div>

      <WeekView
        currentWeekStart={currentWeekStart}
        selectedSessions={selectedSessions}
        previewSessions={previewSessions}
      />
    </div>
  );
}
