import React, { useMemo } from 'react';
import clsx from 'clsx';
import dayjs from 'dayjs';
import { generateSessionId } from "@/lib/utils";
import { Session } from "@/components/types";

interface MonthViewProps {
  sessions: Session[];
  selectedSessionIds: Set<string>;
}

type SessionWithId = Session & { id: string }
interface WeekWithSessions {
  days: {
    day: dayjs.Dayjs
    display: string
    sessions: SessionWithId[];
  }[]
}

export const SessionsMiniPreview: React.FC<MonthViewProps> = ({ sessions, selectedSessionIds }) => {
  const weeksWithSessions = useMemo(() => {
    const sortedSession = sessions.sort((a, b) => a.time - b.time)
    const firstSession = sortedSession.at(0)
    const lastSession = sortedSession.at(-1)
    const firstDisplayDay = dayjs(firstSession?.time).startOf('week')
    const lastDisplayDay = dayjs(lastSession?.time).endOf('week')

    const sessionsByDate = sessions.reduce<Record<string, SessionWithId[]>>((acc, session) => {
      const dateKey = dayjs(session.time).format('YYYY-MM-DD');
      if (!acc[dateKey]) {
        acc[dateKey] = [];
      }
      acc[dateKey].push({ ...session, id: generateSessionId(session) });
      return acc;
    }, {});

    return Array.from<unknown, WeekWithSessions>({ length: lastDisplayDay.diff(firstDisplayDay, 'week') + 1 }, (_, i) => {
      const firstWeekDay = firstDisplayDay.add(i, 'week')
      return {
        showMonth: firstWeekDay.isSame(firstWeekDay.startOf('month')) || i === 0,
        days: Array.from({ length: 7 }, (_, j) => {
          const day = firstWeekDay.add(j, 'day')
          return {
            day,
            display: day.format(day.isSame(day.startOf('month')) ? 'MMM/D' : 'D'),
            sessions: sessionsByDate[day.format('YYYY-MM-DD')] ?? []
          }
        })
      }
    });
  }, [sessions])

  return (
    <div className="max-w-4xl mx-auto p-4">
      <div className="grid grid-cols-7 gap-4 mb-4">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
          <div key={day} className="font-bold text-center">
            {day}
          </div>
        ))}
      </div>
      {weeksWithSessions.map((week, weekIdx) => (
        <div key={`week-${weekIdx}`} className="grid grid-cols-7 gap-4 mb-4">
          {week.days.map(({ day, display, sessions }) => (
            <div key={day.format('YYYY-MM-DD')} className="border border-gray-200 p-1">
              <div className="font-bold text-sm mb-1">{display}</div>
              {sessions.map((session) => (
                <div key={session.filmId} className={clsx("h-4 rounded mb-1", selectedSessionIds.has(session.id) ? 'bg-violet-900' : 'bg-slate-800')} />
              ))}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
};