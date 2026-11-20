import React, { useMemo } from "react";
import dayjs from "dayjs";
import {
  TooltipTrigger,
  TooltipProvider,
  Tooltip,
  TooltipContent,
} from "@/components/ui/tooltip";
import { useAppContext } from "@/contexts/AppContext";
import { cn } from "@/lib/utils";
import { Session, Film } from "@/components/types";

interface MonthViewProps {
  sessions: Session[];
  selectedSessionIds: Set<string>;
  onSelectSession: (sessionId: string) => void;
}

type SessionWithId = Session & { id: string; film: Film };
interface WeekWithSessions {
  days: {
    day: dayjs.Dayjs;
    sessions: SessionWithId[];
    showMonth: boolean;
  }[];
}

export const SessionsMiniPreview: React.FC<MonthViewProps> = ({
  sessions,
  selectedSessionIds,
  onSelectSession,
}) => {
  const { filmsMap } = useAppContext();

  const weeksWithSessions = useMemo(() => {
    const sortedSession = [...sessions].sort((a, b) => a.time - b.time);
    const firstSession = sortedSession.at(0);
    const lastSession = sortedSession.at(-1);
    const firstDisplayDay = dayjs(firstSession?.time).startOf("week");
    const lastDisplayDay = dayjs(lastSession?.time).endOf("week");

    const sessionsByDate = sessions.reduce<Record<string, SessionWithId[]>>(
      (acc, session) => {
        const dateKey = dayjs(session.time).format("YYYY-MM-DD");
        if (!acc[dateKey]) {
          acc[dateKey] = [];
        }
        acc[dateKey].push({
          ...session,
          film: filmsMap.get(session.filmId)!,
          id: session.id,
        });
        return acc;
      },
      {},
    );

    return Array.from<unknown, WeekWithSessions>(
      { length: lastDisplayDay.diff(firstDisplayDay, "week") + 1 },
      (_, i) => {
        const firstWeekDay = firstDisplayDay.add(i, "week");
        return {
          days: Array.from({ length: 7 }, (_, j) => {
            const day = firstWeekDay.add(j, "day");
            return {
              day,
              showMonth:
                (i === 0 && j === 0) || day.isSame(day.startOf("month")),
              sessions: sessionsByDate[day.format("YYYY-MM-DD")] ?? [],
            };
          }),
        };
      },
    );
  }, [sessions, filmsMap]);

  return (
    <div className="rounded-lg border p-3">
      <div className="mb-1 grid grid-cols-7 gap-1">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
          <div key={day} className="text-center text-[0.7rem] font-medium text-muted-foreground">
            {day}
          </div>
        ))}
      </div>
      {weeksWithSessions.map((week, weekIdx) => (
        <div key={`week-${weekIdx}`} className="mb-1 grid grid-cols-7 gap-1">
          {week.days.map(({ day, sessions, showMonth }) => (
            <div
              key={day.format("YYYY-MM-DD")}
              className="min-h-10 rounded-md bg-muted/40 p-1"
            >
              {/* Month shares the date's line so every date sits on the same baseline */}
              <div className="mb-1 flex items-baseline gap-1 text-xs leading-none">
                <span className="font-medium tabular-nums">{day.format("D")}</span>
                {showMonth && (
                  <span className="truncate text-[0.65rem] text-muted-foreground">{day.format("MMM")}</span>
                )}
              </div>
              {sessions.map((session) => {
                const isSelected = selectedSessionIds.has(session.id);

                return (
                  <TooltipProvider key={session.id} delayDuration={0}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div
                          onClick={() => onSelectSession(session.id)}
                          className={cn("mb-0.5 h-2 cursor-pointer rounded-full", {
                            "dark:bg-violet-500 bg-violet-700": isSelected,
                            "dark:bg-stone-600 bg-stone-300": !isSelected,
                          })}
                        />
                      </TooltipTrigger>
                      <TooltipContent side="bottom">
                        {session.film.filmTitle} {session.location} -{" "}
                        {new Date(session.time).toLocaleString()}
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                );
              })}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
};
