import React, { useMemo } from "react";
import dayjs from "dayjs";
import {
  TooltipTrigger,
  TooltipProvider,
  Tooltip,
  TooltipContent,
} from "@/components/ui/tooltip";
import { useAppContext } from "@/contexts/AppContext";
import { generateSessionId, cn } from "@/lib/utils";
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
    const sortedSession = sessions.sort((a, b) => a.time - b.time);
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
          id: generateSessionId(session),
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
    <div className="max-w-4xl mx-auto p-4">
      <div className="grid grid-cols-7 gap-4 mb-4">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
          <div key={day} className="font-bold text-center">
            {day}
          </div>
        ))}
      </div>
      {weeksWithSessions.map((week, weekIdx) => (
        <div key={`week-${weekIdx}`} className="grid grid-cols-7 gap-4 mb-4">
          {week.days.map(({ day, sessions, showMonth }) => (
            <div
              key={day.format("YYYY-MM-DD")}
              className="border border-gray-200 p-1"
            >
              {showMonth && <div className="text-xs">{day.format("MMM")}</div>}
              <div className="font-bold text-sm mb-1">{day.format("D")}</div>
              {sessions.map((session) => {
                const isSelected = selectedSessionIds.has(session.id);

                return (
                  <TooltipProvider key={session.id} delayDuration={0}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div
                          onClick={() => onSelectSession(session.id)}
                          className={cn("h-4 rounded mb-1 cursor-pointer", {
                            "dark:bg-violet-500 bg-violet-700": isSelected,
                            "dark:bg-slate-600 bg-slate-300": !isSelected,
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
