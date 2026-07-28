import { createContext, useContext, useMemo, useState, type ReactNode } from 'react'

export type Session = {
  customerId: string
  deviceId: string
}

export type CustomerProfile = {
  givenName: string
  familyName: string
  phoneE164: string
}

const emptyProfile: CustomerProfile = {
  givenName: '',
  familyName: '',
  phoneE164: '',
}

type SessionContextValue = {
  session: Session | null
  setSession: (session: Session | null) => void
  profile: CustomerProfile
  saveProfile: (profile: CustomerProfile) => void
  resetSession: () => void
}

const SessionContext = createContext<SessionContextValue | null>(null)

export function SessionProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<CustomerProfile>(emptyProfile)

  const value = useMemo(
    () => ({
      session,
      setSession,
      profile,
      saveProfile: setProfile,
      resetSession: () => {
        setSession(null)
        setProfile(emptyProfile)
      },
    }),
    [session, profile],
  )

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
}

export function useSession(): SessionContextValue {
  const ctx = useContext(SessionContext)
  if (!ctx) {
    throw new Error('useSession must be used within SessionProvider')
  }
  return ctx
}
