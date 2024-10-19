'use client'

import React from 'react';
// import FilmSidebar from '../components/FilmSidebar';
import { SidebarProvider } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/AppSidebar"
// import CalendarView from '@/components/CalendarView';
import { Film } from './types';
import { AppContext } from '@/contexts/AppContext';

export default function Main (props: { films: Film[] }) {
  return (
    <AppContext.Provider value={{ films: props.films }}>
      <SidebarProvider>
        { /* <FilmSidebar films={films} onSelectFilm={handleSelectFilm} /> */ }
        <AppSidebar />
        <main>
          { /* <CalendarView selectedSessions={selectedSessions} /> */ }
        </main>
      </SidebarProvider>
    </AppContext.Provider>
  );
}
