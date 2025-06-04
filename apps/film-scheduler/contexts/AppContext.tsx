import { Film, FilmsMap, Session } from "@/components/types";
import { Festival, Section } from "@/lib/filmData";
import React, { Dispatch, SetStateAction } from "react";

export type AppContextType = {
  festivals: Festival[];
  defaultFestivalId: string;
  currentFestivalId: string;
  setCurrentFestivalId: Dispatch<SetStateAction<string>>;
  films: Film[];
  filmsMap: FilmsMap;
  sections: Section[];
  setFilms: Dispatch<SetStateAction<Film[]>>;
  setFilmsMap: Dispatch<SetStateAction<FilmsMap>>;
  setSections: Dispatch<SetStateAction<Section[]>>;
  selectedSessions: Session[];
  previewSessions: Session[];
  previewFilmId: string | undefined;
  viewingFilmId: string | undefined;
  revealFilmDetail: (film?: Film) => void;
  currentDate: Date;
  setPreviewFilmId: Dispatch<SetStateAction<string | undefined>>;
  onClickSession: (session: Session) => void;
  setCurrentDate: Dispatch<SetStateAction<Date>>;
  starredFilmIds: string[];
  starFilm: (film: Film) => void;
  unstarFilm: (film: Film) => void;
  addSession: (session: Session) => void;
  removeSession: (session: Session) => void;
  setPanelOpen: Dispatch<SetStateAction<boolean>>;
  togglePanelOpen: () => void;
  isShareModalOpen: boolean;
  openShareModal: () => void;
  closeShareModal: () => void;
  importSessions: Session[];
  importModalOpen: boolean;
  closeImportModal: () => void;
  openImportModal: () => void;
  openAboutModal: () => void;
  openOnboardingModal: () => void;
  
  // Fill the Blank feature
  isFillBlankModalOpen: boolean;
  openFillBlankModal: () => void;
  closeFillBlankModal: () => void;
  timeSelectionStart: Date | null;
  timeSelectionEnd: Date | null;
  setTimeSelection: (start: Date | null, end: Date | null) => void;
};

const noop = () => {};

export const AppContext = React.createContext<AppContextType>({
  festivals: [],
  defaultFestivalId: "",
  currentFestivalId: "",
  setCurrentFestivalId: noop,
  films: [],
  filmsMap: new Map(),
  sections: [],
  setFilms: noop,
  setFilmsMap: noop,
  setSections: noop,
  selectedSessions: [],
  previewSessions: [],
  previewFilmId: undefined,
  viewingFilmId: undefined,
  currentDate: new Date(),
  setPreviewFilmId: noop,
  onClickSession: noop,
  setCurrentDate: noop,
  starredFilmIds: [],
  starFilm: noop,
  unstarFilm: noop,
  addSession: noop,
  removeSession: noop,
  revealFilmDetail: noop,
  setPanelOpen: noop,
  togglePanelOpen: noop,
  isShareModalOpen: false,
  openShareModal: noop,
  closeShareModal: noop,
  importSessions: [],
  importModalOpen: false,
  closeImportModal: noop,
  openImportModal: noop,
  openAboutModal: noop,
  openOnboardingModal: noop,
  
  // Fill the Blank feature defaults
  isFillBlankModalOpen: false,
  openFillBlankModal: noop,
  closeFillBlankModal: noop,
  timeSelectionStart: null,
  timeSelectionEnd: null,
  setTimeSelection: noop,
});

export const useAppContext = () => React.useContext(AppContext);
