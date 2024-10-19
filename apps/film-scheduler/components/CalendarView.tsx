import React, { useState } from 'react';
import { Button } from '@/components/ui/button'; // Assuming Button from shadcn ui
import { ChevronLeft, ChevronRight } from '@/components/Icons'; // Icons for navigation
import dayjs from 'dayjs'; // Utility for date manipulation
import 'dayjs/locale/en';
import isBetween from 'dayjs/plugin/isBetween';
import { Session } from './types';
import { useAppContext } from '@/contexts/AppContext';

dayjs.extend(isBetween);
dayjs.locale('en');

interface WeekViewProps {
  currentWeekStart: dayjs.Dayjs;
  selectedSessions: Session[];
  previewSessions: Session[];
}

function WeekView({ currentWeekStart, selectedSessions, previewSessions }: WeekViewProps) {
  const weekDays = Array.from({ length: 7 }, (_, i) => currentWeekStart.add(i, 'day'));
  const { filmsMap } = useAppContext()

  return (
    <div className="grid grid-cols-7 gap-4">
      {weekDays.map((day) => (
        <div key={day.format('YYYY-MM-DD')} className="w-full p-4 bg-white shadow rounded mb-4 relative">
          <h4 className="text-lg font-semibold mb-2">
            {day.format('dddd, MMMM D')}
          </h4>
          <div className="relative h-[1440px] border-t border-b border-gray-300">
            {Array.from({ length: 24 }, (_, hour) => (
              <div
                key={hour}
                className="absolute left-0 w-full border-t border-gray-200"
                style={{ top: `${hour * 60}px`, height: '1px' }}
              />
            ))}
            {selectedSessions.concat(previewSessions)
              .filter((session) => dayjs(session.time).isSame(day, 'day'))
              .map((session) => {
                const film = filmsMap.get(session.filmId)
                if (!film) return null
                const startTime = dayjs(`${session.time} ${session.time}`, 'MM.DD HH:mm');
                const endTime = startTime.add(film.duration, 'minute');
                const overlappingSessions = [...selectedSessions, ...previewSessions].filter(
                  (s) =>
                    dayjs(s.time).isSame(day, 'day') &&
                    dayjs(s.time).isBetween(startTime, endTime, null, '[]')
                );

                const top = startTime.hour() * 60 + startTime.minute();
                const height = film.duration;
                const width = 100 / overlappingSessions.length;
                const left = overlappingSessions.indexOf(session) * width;

                return (
                  <div
                    key={`${session.time}-${session.filmId}`}
                    className="absolute bg-blue-500 text-white p-2 rounded shadow"
                    style={{ top: `${top}px`, height: `${height}px`, width: `${width}%`, left: `${left}%` }}
                  >
                    <div className="text-sm font-medium">
                      {session.time} - {film.filmTitle}
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

export default function CalendarView() {
  const { today, previewSessions, selectedSessions } = useAppContext()
  const [currentWeekStart, setCurrentWeekStart] = useState(dayjs(today));

  console.log(previewSessions, selectedSessions, 'preview')

  const navigateWeek = (direction: 'previous' | 'next') => {
    setCurrentWeekStart((prev) =>
      direction === 'next' ? prev.add(1, 'week') : prev.subtract(1, 'week')
    );
  };

  return (
    <div className="w-3/4 p-4">
      <div className="mb-4 flex justify-between items-center">
        <div className="flex items-center">
          <Button
            variant="ghost"
            onClick={() => navigateWeek('previous')}
            className="mr-2"
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <h2 className="text-lg font-bold">
            Week of {currentWeekStart.format('MMMM D, YYYY')}
          </h2>
          <Button
            variant="ghost"
            onClick={() => navigateWeek('next')}
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
