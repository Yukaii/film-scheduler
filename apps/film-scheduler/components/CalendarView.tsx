import React, { useMemo } from "react";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "@/components/Icons";
import dayjs from "dayjs";
import "dayjs/locale/en";
import isBetween from "dayjs/plugin/isBetween";
import { Session } from "./types";
import { useAppContext } from "@/contexts/AppContext";
import { cn, generateSessionId } from "@/lib/utils";
import { X } from "lucide-react";

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
  const { filmsMap, addSession, removeSession, revealFilmDetail } =
    useAppContext();

  const startHour = 10; // New start hour at 10:00 AM
  const hoursInDay = 14; // Display 14 hours (from 10:00 AM to 12:00 AM)

  const sessions = Array.from(
    new Map(
      [...selectedSessions, ...previewSessions].map(
        (session) => [
          session.filmId + session.time + session.location,
          session,
        ], // Create a unique key
      ),
    ).values(), // Get the values from the Map
  );

  return (
    <div className="grid grid-cols-[60px_repeat(7,_minmax(0,1fr))] p-4">
      {/* Time Labels Column */}
      <div className="w-full py-4 bg-background mb-4 mt-7">
        <div className="relative h-[840px]">
          {Array.from({ length: hoursInDay + 1 }, (_, hour) => (
            <div
              key={hour}
              className="absolute left-0 w-full"
              style={{ top: `${hour * 60}px`, height: "60px" }}
            >
              <span className="text-xs absolute p-1 -top-3 bg-background">
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
          className="w-full py-4 bg-background mb-4 relative"
        >
          <div className="font-semibold mb-2 text-sm text-center h-5">
            {day.format("ddd D")}
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

                // Parse session time and calculate positioning relative to 10:00 AM
                const startTime = dayjs(session.time);
                const startHourOffset = startTime.hour() - startHour;
                const startMinute = startTime.minute();
                const top = startHourOffset * 60 + startMinute; // Adjust start time relative to 10:00 AM
                const height = film.duration; // Duration in minutes

                // Check for overlapping sessions and calculate width and left position
                const overlappingSessions = sessions.filter(
                  (s) =>
                    dayjs(s.time).isSame(day, "day") &&
                    dayjs(s.time).isBetween(
                      startTime,
                      startTime.add(film.duration, "minute"),
                      null,
                      "[]",
                    ),
                );

                const width = 100 / overlappingSessions.length;
                const left = overlappingSessions.indexOf(session) * width;

                const isPreviewSession = !selectedSessions.includes(session);

                return (
                  <div
                    id={sessionId}
                    key={sessionId}
                    className={cn(
                      "absolute p-1 text-white rounded shadow transition-opacity duration-200 hover:opacity-100",
                      "border-4 border-solid border-transparent",
                      {
                        "opacity-70 hover:cursor-zoom-in bg-slate-600 dark:bg-slate-800 border-slate-600 dark:border-slate-800":
                          isPreviewSession,
                        "opacity-100 dark:bg-violet-900 bg-violet-600 dark:hover:border-white cursor-pointer hover:border-slate-700":
                          !isPreviewSession,
                      },
                    )}
                    onClick={() => {
                      if (isPreviewSession) {
                        addSession(session);
                      } else {
                        revealFilmDetail(film);
                      }
                    }}
                    style={{
                      top: `${top}px`,
                      height: `${height}px`,
                      width: `${width}%`,
                      left: `${left}%`,
                    }}
                    title={session.time.toLocaleString()}
                  >
                    <div className="flex justify-between items-center">
                      <div className="text-sm font-medium">
                        {film.filmTitle}
                      </div>
                      {!isPreviewSession && (
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
                    </div>
                    <p className="text-xs text-white/80">{session.location}</p>
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

  const navigateWeek = (direction: "previous" | "next") => {
    setCurrentDate((prev) => {
      const currentDayjs = dayjs(prev);
      return direction === "next"
        ? currentDayjs.add(1, "week").toDate()
        : currentDayjs.subtract(1, "week").toDate();
    });
  };

  return (
    <div className={cn("w-full p-4", props.className)}>
      <div className="mb-4 flex justify-between items-center">
        <div className="flex items-center">
          <Button
            variant="ghost"
            onClick={() => navigateWeek("previous")}
            className="mr-2"
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <h2 className="text-lg font-bold">
            Week of {currentWeekStart.format("MMMM D, YYYY")}
          </h2>
          <Button
            variant="ghost"
            onClick={() => navigateWeek("next")}
            className="ml-2"
          >
            <ChevronRight className="h-5 w-5" />
          </Button>
        </div>
      </div>

      <WeekView
        currentWeekStart={currentWeekStart}
        selectedSessions={selectedSessions}
        previewSessions={previewSessions}
      />
    </div>
  );
}
