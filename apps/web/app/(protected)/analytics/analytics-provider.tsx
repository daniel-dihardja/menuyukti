'use client'

import {
  createContext,
  type ReactNode,
  use,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react'

import { readLastLocationId, writeLastLocationId } from '@/lib/last-location'

type AnalyticsState = {
  locationId: number | null
  analyticsId: number | null
}

type AnalyticsActions = {
  setLocationId: (locationId: number | null) => void
  setAnalyticsId: (analyticsId: number | null) => void
}

const AnalyticsStateContext = createContext<AnalyticsState | null>(null)
const AnalyticsActionsContext = createContext<AnalyticsActions | null>(null)

type AnalyticsProviderProps = {
  children: ReactNode
  initialLocationId?: number | null
  initialAnalyticsId?: number | null
}

export function AnalyticsProvider({
  children,
  initialLocationId = null,
  initialAnalyticsId = null,
}: AnalyticsProviderProps) {
  const [locationId, setLocationIdState] = useState<number | null>(initialLocationId)
  const [analyticsId, setAnalyticsId] = useState<number | null>(initialAnalyticsId)
  const [hydratedFromStorage, setHydratedFromStorage] = useState(false)

  useEffect(() => {
    if (hydratedFromStorage) return
    setHydratedFromStorage(true)
    if (initialLocationId !== null) {
      writeLastLocationId(initialLocationId)
      return
    }
    setLocationIdState((current) => {
      if (current !== null) return current
      return readLastLocationId()
    })
  }, [hydratedFromStorage, initialLocationId])

  const setLocationId = useCallback((next: number | null) => {
    setLocationIdState(next)
    writeLastLocationId(next)
  }, [])

  useEffect(() => {
    setAnalyticsId(null)
  }, [locationId])

  const state = useMemo(() => ({ locationId, analyticsId }), [analyticsId, locationId])
  const actions = useMemo(() => ({ setLocationId, setAnalyticsId }), [setLocationId])

  return (
    <AnalyticsActionsContext value={actions}>
      <AnalyticsStateContext value={state}>{children}</AnalyticsStateContext>
    </AnalyticsActionsContext>
  )
}

export function useAnalyticsState(): AnalyticsState {
  const state = use(AnalyticsStateContext)
  if (!state) {
    throw new Error('useAnalyticsState must be used within an AnalyticsProvider')
  }
  return state
}

export function useAnalyticsActions(): AnalyticsActions {
  const actions = use(AnalyticsActionsContext)
  if (!actions) {
    throw new Error('useAnalyticsActions must be used within an AnalyticsProvider')
  }
  return actions
}
