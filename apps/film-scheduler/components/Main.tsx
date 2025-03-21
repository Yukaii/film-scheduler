"use client";

import dynamic from "next/dynamic";
import React, { useMemo, useState, useEffect } from "react";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { CalendarView } from "@/components/CalendarView";
import { FilmSidebar } from "@/components/FilmSidebar";
import { AboutModal } from "@/components/AboutModal";
import { ImportModal } from "@/components/ImportModal";
import { OnboardTutorialModal } from "@/components/OnboardTutorialModal";
import { FillBlankModal } from "@/components/FillBlankModal";
import { Film, FilmsMap, Session } from "./types";
import { AppContext } from "@/contexts/AppContext";
import dayjs from "dayjs";
import {
  cn,
  scrollSessionIntoView,
  joinSessions,
  highlightSession,
  generateSessionId,
} from "@/lib/utils";
import {
  useToggle,
  useLocalStorageState,
  useSessionImport,
  useOnboardingStatus,
} from "@/lib/hooks";
import { Festival, fetchFilms } from "@/lib/filmData";
import useSWR from "swr";

const ShareModal = dynamic(() =>
  import("@/components/ShareModal").then((m) => m.ShareModal),
);

interface MainProps {
  festivals: Festival[];
  defaultFestivalId: string;
}

export default function Main({ festivals, defaultFestivalId }: MainProps) {
  const [films, setFilms] = useState<Film[]>([]);
  const [filmsMap, setFilmsMap] = useState<FilmsMap>(new Map());
  const [sections, setSections] = useState<Array<{ id: string; name: string }>>([]);

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

  // migrate session without id
  useEffect(() => {
    const sessionsWithoutIds = selectedSessions.some((s) => !s.id);

    if (sessionsWithoutIds) {
      const updatedSessions = selectedSessions.map((s) =>
        s.id ? s : { ...s, id: generateSessionId(s) }
      );

      setSelectedSessions(updatedSessions);
    }
  }, [selectedSessions, setSelectedSessions]);

  const availableSessions = useMemo(() => {
    return films.reduce((prev, film) => {
      return [...prev, ...film.schedule];
    }, [] as Session[]);
  }, [films]);

  // Preview sessions based on the selected film
  const previewSessions = useMemo(() => {
    if (!previewFilmId) return [];

    const film = filmsMap.get(previewFilmId);
    if (!film) return [];

    return [...film.schedule];
  }, [previewFilmId, filmsMap]);

  // Add session to selectedSessions
  const addSession = (session: Session) => {
    setSelectedSessions((prev) => {
      // Ensure session doesn't already exist
      const exists = prev.some(
        (s) => s.id === session.id
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

    window.setTimeout(() => {
      scrollSessionIntoView(session);
      highlightSession(session);
    }, 50);
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
  const openOnboardingModal = () => setTutorialModalOpen(true);

  const handleTutorialClose = () => {
    markOnboardingAsViewed();
    setTutorialModalOpen(false);
  };

  const { open: isAboutModalOpen, setOpen: setAboutModalOpen } =
    useToggle(false);
  const openAboutModal = () => setAboutModalOpen(true);
  const closeAboutModal = () => setAboutModalOpen(false);

  // Fill the Blank functionality
  const { open: isFillBlankModalOpen, setOpen: setFillBlankModalOpen } = useToggle(false);
  const openFillBlankModal = () => setFillBlankModalOpen(true);
  const closeFillBlankModal = () => setFillBlankModalOpen(false);
  const [timeSelectionStart, setTimeSelectionStart] = useState<Date | null>(null);
  const [timeSelectionEnd, setTimeSelectionEnd] = useState<Date | null>(null);

  const setTimeSelection = (start: Date | null, end: Date | null) => {
    // Always ensure start time is before end time
    if (start && end && start > end) {
      [start, end] = [end, start];
    }
    setTimeSelectionStart(start);
    setTimeSelectionEnd(end);
    if (start && end) {
      openFillBlankModal();
    }
  };

  const selectedFestival = useMemo(
    () => festivals.find((f) => f.id === defaultFestivalId) || festivals[0],
    [festivals, defaultFestivalId]
  );

  const { data, error } = useSWR(
    [selectedFestival?.id],
    ([festivalId]) => fetchFilms(festivalId),
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
    }
  );

  useEffect(() => {
    if (data?.films) {
      setFilms(data.films);
      setFilmsMap(data.filmsMap);
    }
  }, [data?.films, setFilms, setFilmsMap]);

  return (
    <div className="flex flex-col w-full">

      <AppContext.Provider
        value={{
          films,
          filmsMap,
          setFilms,
          setFilmsMap,
          festivals,
          defaultFestivalId,
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
          openOnboardingModal,
          
          // Fill the Blank feature
          isFillBlankModalOpen,
          openFillBlankModal,
          closeFillBlankModal,
          timeSelectionStart,
          timeSelectionEnd,
          setTimeSelection,
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
          filmsMap={filmsMap}
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
          filmsMap={filmsMap}
        />

        <FillBlankModal
          open={isFillBlankModalOpen}
          setOpen={setFillBlankModalOpen}
          startTime={timeSelectionStart}
          endTime={timeSelectionEnd}
          films={films}
          filmsMap={filmsMap}
          onAddSession={addSession}
          sections={data?.sections || []}
        />

        <OnboardTutorialModal
          open={isTutorialModalOpen}
          onClose={handleTutorialClose}
        />

        <AboutModal open={isAboutModalOpen} onClose={closeAboutModal} />
      </AppContext.Provider>
    </div>
  );
}
