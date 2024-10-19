"use client";

import React, { useMemo, useState } from "react";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import CalendarView from "@/components/CalendarView";
import { Film, FilmsMap, Session } from "./types";
import { AppContext } from "@/contexts/AppContext";
import dayjs from "dayjs";
import isoWeek from "dayjs/plugin/isoWeek"; // Ensures the week starts on Monday
dayjs.extend(isoWeek);

export default function Main(props: { films: Film[]; filmsMap: FilmsMap }) {
  const [previewFilmId, setPreviewFilmId] = useState<string | undefined>(
    undefined,
  );
  const previewSessions = useMemo(() => {
    if (!previewFilmId) return [];

    const film = props.filmsMap.get(previewFilmId);
    if (!film) return [];

    return film.schedule.map((schedule) => ({
      filmId: film.id,
      time: schedule.time,
      location: schedule.location,
    }));
  }, [previewFilmId, props.filmsMap]);

  const [currentDate, setCurrentDate] = useState(new Date());
  const onClickPreviewSession = (session: Session) => {
    const sessionDate = dayjs(session.time);

    const currentWeekStart = dayjs(currentDate).startOf("isoWeek"); // Start of current week (Monday)
    const sessionWeekStart = sessionDate.startOf("isoWeek"); // Start of session's week (Monday)

    if (!sessionWeekStart.isSame(currentWeekStart, "day")) {
      console.log('noop')
      setCurrentDate(sessionWeekStart.toDate()); // Set currentDate to the session's week start (Monday)
    } else {
      console.log('???')
    }
  };

  return (
    <AppContext.Provider
      value={{
        films: props.films,
        filmsMap: props.filmsMap,
        previewSessions,
        selectedSessions: [],
        today: currentDate,
        previewFilmId,
        setPreviewFilmId,
        onClickPreviewSession,
        setCurrentDate,
      }}
    >
      <SidebarProvider>
        <AppSidebar />
        <CalendarView />
      </SidebarProvider>
    </AppContext.Provider>
  );
}
