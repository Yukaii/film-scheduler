import { Film, FilmsMap, Session } from "@/components/types";
import React, { Dispatch, SetStateAction } from "react";

export type AppContextType = {
  films: Film[];
  filmsMap: FilmsMap;
  selectedSessions: Session[];
  previewSessions: Session[];
  previewFilmId: string | undefined;
  today: Date;
  setPreviewFilmId: Dispatch<SetStateAction<string | undefined>>;
  onClickPreviewSession: (session: Session) => void;
  setCurrentDate: Dispatch<SetStateAction<Date>>;
  starredFilmIds: Set<string>;
  starFilm: (film: Film) => void;
  unstarFilm: (film: Film) => void;
  addSession: (session: Session) => void;
  removeSession: (session: Session) => void;
};

const noop = () => {}

export const AppContext = React.createContext<AppContextType>({
  films: [],
  filmsMap: new Map(),
  selectedSessions: [],
  previewSessions: [],
  previewFilmId: undefined,
  today: new Date(),
  setPreviewFilmId: noop,
  onClickPreviewSession: noop,
  setCurrentDate: noop,
  starredFilmIds: new Set(),
  starFilm: noop,
  unstarFilm: noop,
  addSession: noop,
  removeSession: noop
});

export const useAppContext = () => React.useContext(AppContext);
