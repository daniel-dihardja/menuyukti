'use client'

import * as React from 'react'

type PublicGuestPointsContextValue = {
  /** Venue points balance when Point System is on and guest is signed in; otherwise null. */
  balance: number | null
  setBalance: (balance: number | null) => void
}

const PublicGuestPointsContext = React.createContext<PublicGuestPointsContextValue | null>(null)

export function PublicGuestPointsProvider({ children }: { children: React.ReactNode }) {
  const [balance, setBalance] = React.useState<number | null>(null)
  const value = React.useMemo(() => ({ balance, setBalance }), [balance])
  return (
    <PublicGuestPointsContext.Provider value={value}>{children}</PublicGuestPointsContext.Provider>
  )
}

export function usePublicGuestPoints(): PublicGuestPointsContextValue {
  const ctx = React.useContext(PublicGuestPointsContext)
  if (!ctx) {
    return {
      balance: null,
      setBalance: () => {},
    }
  }
  return ctx
}

/** Syncs server-resolved venue balance into the header chrome; clears on unmount. */
export function PublicGuestPointsSync({ balance }: { balance: number | null }) {
  const { setBalance } = usePublicGuestPoints()

  React.useEffect(() => {
    setBalance(balance)
    return () => setBalance(null)
  }, [balance, setBalance])

  return null
}
