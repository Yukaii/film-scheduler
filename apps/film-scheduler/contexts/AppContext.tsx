import { Film } from '@/components/types'
import React from 'react'

export type AppContextType = {
  films: Film[]
}

export const AppContext = React.createContext<AppContextType>({
  films: []
})

export const useAppContext = () => React.useContext(AppContext)
