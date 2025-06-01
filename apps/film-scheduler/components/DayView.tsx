import React, { useMemo, useState, useEffect } from "react";
import dayjs from "@/lib/dayjs";
import { Session } from "./types";
import { useAppContext } from "@/contexts/AppContext";
import { joinSessions } from "@/lib/utils";

const startHour = 10;
const hoursInDay = 14;

export interface DayViewProps {
  currentDate: dayjs.Dayjs;
  selectedSessions: Session[];
  previewSessions: Session[];
}

function useNowIndicator() {
  const [now, setNow] = useState(dayjs());

  useEffect(() => {
    const interval = setInterval(() => {
      setNow(dayjs());
    }, 60000);

    return () => clearInterval(interval);
  }, []);

  const nowHourOffset = now.hour() - startHour;
  const nowMinute = now.minute();
  const nowPosition = nowHourOffset * 60 + nowMinute + 30;

  return {
    now,
    nowHourOffset,
    nowPosition,
  };
}

export function DayView({
  currentDate,
  selectedSessions,
  previewSessions,
}: DayViewProps) {
  const {
    filmsMap,
    addSession,
    removeSession,
  } = useAppContext();
  const { now, nowHourOffset } = useNowIndicator();

  // Join selected and preview sessions like WeekView does
  const sessions = joinSessions(selectedSessions, previewSessions);

  // Get sessions for the current day
  const daysSessions = useMemo(() => {
    return sessions.filter((session) => 
      dayjs(session.time).isSame(currentDate, "day")
    );
  }, [sessions, currentDate]);

  // Get unique locations for the day
  const locations = useMemo(() => {
    const locationSet = new Set(daysSessions.map(session => session.location));
    return Array.from(locationSet).sort();
  }, [daysSessions]);

  // Group sessions by location
  const sessionsByLocation = useMemo(() => {
    return locations.reduce((acc, location) => {
      acc[location] = daysSessions.filter(session => session.location === location);
      return acc;
    }, {} as Record<string, Session[]>);
  }, [locations, daysSessions]);

  const isSameDay = now.isSame(currentDate, "day");

  return (
    <div className="w-full overflow-hidden">
      {/* Time axis header */}
      <div className="sticky top-0 bg-background z-20 border-b">
        <div className="flex">
          {/* Location column header */}
          <div className="w-48 p-4 border-r font-semibold">
            Location
          </div>
          {/* Time columns */}
          <div className="flex-1 flex">
            {Array.from({ length: hoursInDay }, (_, hour) => (
              <div
                key={hour}
                className="flex-1 min-w-[60px] p-2 border-r text-center text-sm"
              >
                {dayjs()
                  .hour(startHour + hour)
                  .format("h A")}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Location rows */}
      <div className="relative">
        {/* Current time indicator */}
        {isSameDay && nowHourOffset >= 0 && nowHourOffset < hoursInDay && (
          <div
            className="absolute top-0 h-full w-[1px] bg-red-500 z-10"
            style={{
              left: `${192 + ((nowHourOffset + now.minute() / 60) / hoursInDay) * 100}%`,
            }}
          >
            <span className="absolute bg-red-500 text-white text-xs px-1 rounded-r -top-1">
              {now.format("HH:mm")}
            </span>
          </div>
        )}

        {locations.map((location) => (
          <div
            key={location}
            className="flex border-b min-h-[80px] hover:bg-muted/50"
          >
            {/* Location name */}
            <div className="w-48 p-4 border-r bg-muted/20 flex items-center">
              <span className="font-medium text-sm">{location}</span>
            </div>
            
            {/* Time slots for this location */}
            <div className="flex-1 relative">
              {/* Time grid background */}
              <div className="absolute inset-0 flex">
                {Array.from({ length: hoursInDay }, (_, hour) => (
                  <div
                    key={hour}
                    className="flex-1 border-r border-border/30"
                  />
                ))}
              </div>
              
              {/* Sessions for this location */}
              {sessionsByLocation[location]?.map((session) => {
                const startTime = dayjs(session.time);
                const film = filmsMap.get(session.filmId);
                if (!film) return null;

                const hourOffset = startTime.hour() - startHour;
                const minuteOffset = startTime.minute();
                const leftPercent = ((hourOffset + minuteOffset / 60) / hoursInDay) * 100;
                const widthPercent = Math.min((film.duration / 60 / hoursInDay) * 100, 100 - leftPercent);

                return (
                  <div
                    key={session.id}
                    className="absolute top-1 bottom-1 z-10"
                    style={{
                      left: `${leftPercent}%`,
                      width: `${Math.max(widthPercent, 1)}%`, // Ensure minimum width for visibility
                    }}
                  >
                    <div className="h-full bg-blue-100 border border-blue-300 rounded p-1 text-xs overflow-hidden hover:shadow-md cursor-pointer transition-shadow"
                         onClick={() => {
                           const isSelected = selectedSessions.some(s => s.id === session.id);
                           if (isSelected) {
                             removeSession(session);
                           } else {
                             addSession(session);
                           }
                         }}>
                      <div className="font-semibold truncate">{film.filmTitle}</div>
                      <div className="text-gray-600 truncate">
                        {startTime.format("HH:mm")} - {startTime.add(film.duration, "minute").format("HH:mm")}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Empty state */}
      {locations.length === 0 && (
        <div className="flex items-center justify-center h-40 text-muted-foreground">
          <p>No sessions scheduled for {currentDate.format("MMMM D, YYYY")}</p>
        </div>
      )}
    </div>
  );
}