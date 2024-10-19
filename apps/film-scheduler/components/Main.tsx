'use client'

import React, { useState } from 'react';
import FilmSidebar from '../components/FilmSidebar';
import CalendarView from '../components/CalendarView';
import { Film } from './types';

export default function Main ({ films }: { films: Film[] }) {
  const [selectedSessions, setSelectedSessions] = useState<{
    date: string;
    time: string;
    location: string;
    filmTitle: string;
  }[]>([]);

  const handleSelectFilm = (film: Film, session: { date: string; time: string; location: string }) => {
    setSelectedSessions((prev) => [...prev, { ...session, filmTitle: film.filmTitle }]);
  };

  return (
    <div className="flex min-h-screen">
      <FilmSidebar films={films} onSelectFilm={handleSelectFilm} />
      <CalendarView selectedSessions={selectedSessions} />
    </div>
  );
}
