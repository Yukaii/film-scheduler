import React, { useMemo, useState, useEffect } from "react";
import dayjs from "@/lib/dayjs";
import { Session } from "./types";
import { useAppContext } from "@/contexts/AppContext";

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
    films,
    filmsMap,
    addSession,
    removeSession,
  } = useAppContext();
  const { now, nowHourOffset } = useNowIndicator();

  // Get ALL sessions for the current day from all films
  const daysSessions = useMemo(() => {
    const allSessions: Session[] = [];
    films.forEach(film => {
      if (film.schedule) {
        film.schedule.forEach(session => {
          if (dayjs(session.time).isSame(currentDate, "day")) {
            allSessions.push(session);
          }
        });
      }
    });
    return allSessions;
  }, [films, currentDate]);

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
    <div className="w-full overflow-x-auto">
      {/* Time axis header */}
      <div className="sticky top-0 bg-background z-20 border-b min-w-[800px]">
        <div className="flex">
          {/* Location column header */}
          <div className="w-48 p-4 border-r font-semibold bg-muted/20 flex-shrink-0">
            Location
          </div>
          {/* Time columns */}
          <div className="flex flex-1">
            {Array.from({ length: hoursInDay }, (_, hour) => (
              <div
                key={hour}
                className="flex-1 min-w-[60px] p-2 border-r text-center text-sm bg-background"
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
      <div className="relative min-w-[800px]">
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
            className="flex border-b hover:bg-muted/30 transition-colors"
            style={{ minHeight: '100px', maxHeight: '120px' }}
          >
            {/* Location name */}
            <div className="w-48 p-4 border-r bg-muted/20 flex items-center flex-shrink-0 sticky left-0">
              <span className="font-medium text-sm">{location}</span>
            </div>
            
            {/* Time slots for this location */}
            <div className="flex-1 relative">
              {/* Time grid background */}
              <div className="absolute inset-0 flex">
                {Array.from({ length: hoursInDay }, (_, hour) => (
                  <div
                    key={hour}
                    className="flex-1 border-r border-border/30 min-w-[60px]"
                  />
                ))}
              </div>
              
              {/* Sessions for this location */}
              {sessionsByLocation[location]?.map((session, sessionIndex) => {
                const startTime = dayjs(session.time);
                const film = filmsMap.get(session.filmId);
                if (!film) return null;

                const hourOffset = startTime.hour() - startHour;
                const minuteOffset = startTime.minute();
                const leftPercent = ((hourOffset + minuteOffset / 60) / hoursInDay) * 100;
                const widthPercent = Math.min((film.duration / 60 / hoursInDay) * 100, 100 - leftPercent);

                const isSelected = selectedSessions.some(s => s.id === session.id);
                const isPreview = previewSessions.some(s => s.id === session.id);

                // Calculate overlap offset for sessions at the same time
                const overlappingCount = sessionsByLocation[location]?.filter(s => {
                  const otherStartTime = dayjs(s.time);
                  return otherStartTime.isSame(startTime, 'hour') && otherStartTime.isSame(startTime, 'minute');
                }).length || 1;
                
                const overlapIndex = sessionsByLocation[location]?.filter((s, idx) => {
                  const otherStartTime = dayjs(s.time);
                  return idx <= sessionIndex && otherStartTime.isSame(startTime, 'hour') && otherStartTime.isSame(startTime, 'minute');
                }).length - 1;

                const topOffset = overlappingCount > 1 ? overlapIndex * 20 : 0;
                const height = overlappingCount > 1 ? 60 : 80;

                return (
                  <div
                    key={session.id}
                    className={`absolute z-10 rounded border cursor-pointer transition-all duration-200 hover:shadow-md ${
                      isSelected 
                        ? 'bg-violet-500 border-violet-600 text-white hover:bg-violet-600' 
                        : isPreview
                        ? 'bg-blue-100 border-blue-300 text-blue-900 hover:bg-blue-50'
                        : 'bg-gray-100 border-gray-300 text-gray-900 hover:bg-gray-50'
                    }`}
                    style={{
                      left: `${leftPercent}%`,
                      width: `${Math.max(widthPercent, 8)}%`,
                      top: `${8 + topOffset}px`,
                      height: `${height}px`,
                    }}
                    onClick={() => {
                      if (isSelected) {
                        removeSession(session);
                      } else {
                        addSession(session);
                      }
                    }}
                    title={`${film.filmTitle} • ${startTime.format("HH:mm")} - ${startTime.add(film.duration, "minute").format("HH:mm")}`}
                  >
                    <div className="p-1 h-full overflow-hidden">
                      <div className="font-semibold text-xs truncate">{film.filmTitle}</div>
                      <div className="text-xs opacity-75 truncate">
                        {startTime.format("HH:mm")}
                      </div>
                      {film.duration && (
                        <div className="text-xs opacity-60 truncate">
                          {film.duration}min
                        </div>
                      )}
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