"use client";

import React, { useMemo, useState } from "react";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import CalendarView from "@/components/CalendarView";
import { FilmSidebar } from "@/components/FilmSidebar";
import { Film, FilmsMap, Session } from "./types";
import { AppContext } from "@/contexts/AppContext";
import dayjs from "dayjs";
import isoWeek from "dayjs/plugin/isoWeek"; // Ensures the week starts on Monday
import { cn, scrollSessionIntoView } from "@/lib/utils";
import { useToggle, useLocalStorageState } from "@/lib/hooks";
dayjs.extend(isoWeek);

export default function Main(props: { films: Film[]; filmsMap: FilmsMap }) {
  const [previewFilmId, setPreviewFilmId] = useState<string | undefined>(
    undefined,
  );

  // Use localStorageState hook for selected sessions and starred films
  const [selectedSessions, setSelectedSessions] = useLocalStorageState<
    Session[]
  >("selectedSessions", []);
  const [starredFilmIds, setStarredFilmIds] = useLocalStorageState<string[]>(
    "starredFilmIds",
    [],
  );

  // Preview sessions based on the selected film
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

  // Add session to selectedSessions
  const addSession = (session: Session) => {
    setSelectedSessions((prev) => {
      // Ensure session doesn't already exist
      const exists = prev.some(
        (s) =>
          s.filmId === session.filmId &&
          s.time === session.time &&
          s.location === session.location,
      );
      if (!exists) {
        return [...prev, session];
      }
      return prev;
    });
  };

  // Remove session from selectedSessions
  const removeSession = (session: Session) => {
    setSelectedSessions((prev) => {
      return prev.filter(
        (s) =>
          !(
            s.filmId === session.filmId &&
            dayjs(s.time).isSame(dayjs(session.time)) &&
            s.location === session.location
          ),
      );
    });
  };

  // Handle week view navigation
  const [currentDate, setCurrentDate] = useState(new Date());
  const onClickSession = (session: Session) => {
    const sessionDate = dayjs(session.time);

    const currentWeekStart = dayjs(currentDate).startOf("isoWeek"); // Start of current week (Monday)
    const sessionWeekStart = sessionDate.startOf("isoWeek"); // Start of session's week (Monday)

    if (!sessionWeekStart.isSame(currentWeekStart, "day")) {
      setCurrentDate(sessionWeekStart.toDate()); // Set currentDate to the session's week start (Monday)
    }

    window.setTimeout(() => scrollSessionIntoView(session), 50);
  };

  // Star/Unstar functionality
  const starFilm = (film: Film) => {
    setStarredFilmIds((prev) => [...prev, film.id]);
  };

  const unstarFilm = (film: Film) => {
    setStarredFilmIds((prev) => {
      return prev.filter((id) => id !== film.id);
    });
  };

  const {
    open: panelOpen,
    setOpen: setPanelOpen,
    toggle: togglePanelOpen,
  } = useToggle(false);
  const [viewingFilmId, setViewingFilmId] = useState<undefined | string>(
    undefined,
  );

  const revealFilmDetail = (film: Film | undefined) => {
    if (film) {
      setViewingFilmId(film.id);
      setPanelOpen(true);
    } else {
      setViewingFilmId(undefined);
      setPanelOpen(false);
    }
  };

  return (
    <AppContext.Provider
      value={{
        films: props.films,
        filmsMap: props.filmsMap,
        previewSessions,
        selectedSessions,
        today: currentDate,
        previewFilmId,
        setPreviewFilmId,
        onClickSession,
        setCurrentDate,
        starredFilmIds,
        starFilm,
        unstarFilm,
        addSession,
        removeSession,
        viewingFilmId,
        revealFilmDetail,
        setPanelOpen,
        togglePanelOpen,
      }}
    >
      <SidebarProvider>
        <AppSidebar />
        <CalendarView
          className={cn({
            "pr-[16rem]": panelOpen && !!viewingFilmId,
          })}
        />
      </SidebarProvider>

      <FilmSidebar
        open={panelOpen && !!viewingFilmId}
        setOpen={(open: boolean) => setPanelOpen(open)}
      />
    </AppContext.Provider>
  );
}
