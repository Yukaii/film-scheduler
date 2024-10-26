"use client";

import dynamic from "next/dynamic";
import React, { useMemo, useState, useEffect } from "react";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import CalendarView from "@/components/CalendarView";
import { FilmSidebar } from "@/components/FilmSidebar";
import { AboutModal } from "@/components/AboutModal";
import { ImportModal } from "@/components/ImportModal";
import { OnboardTutorialModal } from "@/components/OnboardTutorialModal";
import { Film, FilmsMap, Session } from "./types";
import { AppContext } from "@/contexts/AppContext";
import dayjs from "dayjs";
import { cn, scrollSessionIntoView, joinSessions } from "@/lib/utils";
import {
  useToggle,
  useLocalStorageState,
  useSessionImport,
  useOnboardingStatus,
} from "@/lib/hooks";

const ShareModal = dynamic(() =>
  import("@/components/ShareModal").then((m) => m.ShareModal),
);

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

  const availableSessions = useMemo(() => {
    return props.films.reduce((prev, film) => {
      return [...prev, ...film.schedule];
    }, [] as Session[]);
  }, [props.films]);

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

    const currentWeekStart = dayjs(currentDate).startOf("week"); // Start of current week (Monday)
    const sessionWeekStart = sessionDate.startOf("week"); // Start of session's week (Monday)

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

  const { open: isShareModalOpen, setOpen: setShareModalOpen } =
    useToggle(false);
  const openShareModal = () => setShareModalOpen(true);
  const closeShareModal = () => setShareModalOpen(false);

  const { importSessions, importModalOpen, closeImportModal, openImportModal } =
    useSessionImport(availableSessions);

  const handleImport = (sessionsToImport: Session[]) => {
    setSelectedSessions(joinSessions(sessionsToImport, selectedSessions));
  };

  const { hasViewedOnboarding, markOnboardingAsViewed } = useOnboardingStatus();
  const { open: isTutorialModalOpen, setOpen: setTutorialModalOpen } =
    useToggle(!hasViewedOnboarding);
  useEffect(() => {
    if (!hasViewedOnboarding) {
      setTutorialModalOpen(true);
    }
  }, [hasViewedOnboarding, setTutorialModalOpen]);

  const handleTutorialClose = () => {
    markOnboardingAsViewed();
    setTutorialModalOpen(false);
  };

  const { open: isAboutModalOpen, setOpen: setAboutModalOpen } = useToggle(false)
  const openAboutModal = () => setAboutModalOpen(true)
  const closeAboutModal = () => setAboutModalOpen(false)

  return (
    <AppContext.Provider
      value={{
        films: props.films,
        filmsMap: props.filmsMap,
        previewSessions,
        selectedSessions,
        currentDate,
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

        // share related
        isShareModalOpen,
        closeShareModal,
        openShareModal,

        // Import related
        importSessions,
        importModalOpen,
        closeImportModal,
        openImportModal,

        openAboutModal,
      }}
    >
      <SidebarProvider>
        <AppSidebar />
        <CalendarView
          className={cn({
            "md:pr-[16rem]": panelOpen && !!viewingFilmId,
          })}
        />
      </SidebarProvider>

      <FilmSidebar
        open={panelOpen && !!viewingFilmId}
        setOpen={(open: boolean) => setPanelOpen(open)}
      />

      <ShareModal
        open={isShareModalOpen}
        sessions={selectedSessions}
        setOpen={setShareModalOpen}
      />

      <ImportModal
        sessions={importSessions}
        open={importModalOpen}
        setOpen={(open: boolean) => {
          if (open) {
            openImportModal();
          } else {
            closeImportModal();
          }
        }}
        onImport={handleImport}
        filmsMap={props.filmsMap}
      />

      <OnboardTutorialModal
        open={isTutorialModalOpen}
        onClose={handleTutorialClose}
      />

      <AboutModal
        open={isAboutModalOpen}
        onClose={closeAboutModal}
      />
    </AppContext.Provider>
  );
}
