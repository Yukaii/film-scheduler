"use client";

import React, { useMemo, useState } from "react";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import CalendarView from "@/components/CalendarView";
import { Film, FilmsMap } from "./types";
import { AppContext } from "@/contexts/AppContext";

export default function Main(props: { films: Film[]; filmsMap: FilmsMap }) {
  const [previewFilmId, setPreviewFilmId] = useState<string | undefined>(undefined);
  const previewSessions = useMemo(() => {
    if (!previewFilmId) return [];

    const film = props.filmsMap.get(previewFilmId);
    if (!film) return [];

    return film.schedule.map((schedule) => ({
      filmId: film.id,
      time: schedule.time.toISOString(),
      location: schedule.location,
    }));
  }, [previewFilmId, props.filmsMap]);

  return (
    <AppContext.Provider
      value={{
        films: props.films,
        filmsMap: props.filmsMap,
        previewSessions,
        selectedSessions: [],
        today: new Date(),
        previewFilmId,
        setPreviewFilmId,
      }}
    >
      <SidebarProvider>
        <AppSidebar />
        <main>
          <CalendarView />
        </main>
      </SidebarProvider>
    </AppContext.Provider>
  );
}
