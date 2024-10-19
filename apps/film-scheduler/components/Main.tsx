'use client'

import React from 'react';
// import FilmSidebar from '../components/FilmSidebar';
import { SidebarProvider } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/AppSidebar"
import CalendarView from '@/components/CalendarView';
import { Film, FilmsMap } from './types';
import { AppContext } from '@/contexts/AppContext';

export default function Main (props: { films: Film[], filmsMap: FilmsMap }) {
  return (
    <AppContext.Provider value={{ films: props.films, filmsMap: props.filmsMap, previewSessions: [], selectedSessions: [], today: new Date() }}>
      <SidebarProvider>
        { /* <FilmSidebar films={films} onSelectFilm={handleSelectFilm} /> */ }
        <AppSidebar />
        <main>
          <CalendarView />
        </main>
      </SidebarProvider>
    </AppContext.Provider>
  );
}
