import { Film, FilmsMap, Session } from '@/components/types'
import React, { Dispatch, SetStateAction } from 'react'

export type AppContextType = {
  films: Film[]
  filmsMap: FilmsMap;
  selectedSessions: Session[];
  previewSessions: Session[];
  previewFilmId: string | undefined;
  today: Date; // Parent component can supply the start of the view week
  setPreviewFilmId: Dispatch<SetStateAction<string | undefined>>
}

export const AppContext = React.createContext<AppContextType>({
  films: [],
  filmsMap: new Map(),
  selectedSessions: [],
  previewSessions: [],
  previewFilmId: undefined,
  today: new Date(),
  setPreviewFilmId: () => {}
})

export const useAppContext = () => React.useContext(AppContext)
