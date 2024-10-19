import { Film, FilmsMap, Session } from '@/components/types'
import React from 'react'

export type AppContextType = {
  films: Film[]
  filmsMap: FilmsMap;
  selectedSessions: Session[];
  previewSessions: Session[];
  today: Date; // Parent component can supply the start of the view week
}

export const AppContext = React.createContext<AppContextType>({
  films: [],
  filmsMap: new Map(),
  selectedSessions: [],
  previewSessions: [],
  today: new Date()
})

export const useAppContext = () => React.useContext(AppContext)
