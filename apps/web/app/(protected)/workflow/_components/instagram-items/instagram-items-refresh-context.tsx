'use client'

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'

type InstagramItemsRefreshContextValue = {
  /** Increments when chat asks the Instagram panel to refetch. */
  version: number
  refresh: () => void
}

const InstagramItemsRefreshContext = createContext<InstagramItemsRefreshContextValue | null>(null)

export function InstagramItemsRefreshProvider({ children }: { children: ReactNode }) {
  const [version, setVersion] = useState(0)
  const refresh = useCallback(() => {
    setVersion((v) => v + 1)
  }, [])
  const value = useMemo(() => ({ version, refresh }), [version, refresh])
  return (
    <InstagramItemsRefreshContext.Provider value={value}>
      {children}
    </InstagramItemsRefreshContext.Provider>
  )
}

export function useInstagramItemsRefresh(): InstagramItemsRefreshContextValue {
  const ctx = useContext(InstagramItemsRefreshContext)
  if (!ctx) {
    return {
      version: 0,
      refresh: () => {
        /* no-op outside provider */
      },
    }
  }
  return ctx
}
