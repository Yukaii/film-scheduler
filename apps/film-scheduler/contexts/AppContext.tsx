import { Film, FilmsMap, Session } from "@/components/types";
import React, { Dispatch, SetStateAction } from "react";

export type AppContextType = {
  films: Film[];
  filmsMap: FilmsMap;
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
};

const noop = () => {};

export const AppContext = React.createContext<AppContextType>({
  films: [],
  filmsMap: new Map(),
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
});

export const useAppContext = () => React.useContext(AppContext);
