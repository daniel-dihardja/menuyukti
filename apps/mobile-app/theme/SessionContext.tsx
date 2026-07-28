import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'

import { clearDeviceKeypair } from '../lib/keys'
import {
  clearProfile as clearStoredProfile,
  clearSession as clearStoredSession,
  loadProfile,
  loadSession,
  saveProfile as persistProfile,
  saveSession as persistSession,
  type StoredProfile,
  type StoredSession,
} from '../lib/sessionStorage'

export type Session = StoredSession

export type CustomerProfile = StoredProfile

const emptyProfile: CustomerProfile = {
  givenName: '',
  familyName: '',
  phoneE164: '',
}

type SessionContextValue = {
  /** False until SecureStore hydrate finishes. */
  isHydrated: boolean
  session: Session | null
  setSession: (session: Session | null) => Promise<void>
  profile: CustomerProfile
  saveProfile: (profile: CustomerProfile) => Promise<void>
  /** Clears session, profile, and device key so the next enroll is fresh. */
  resetSession: () => Promise<void>
}

const SessionContext = createContext<SessionContextValue | null>(null)

export function SessionProvider({ children }: { children: ReactNode }) {
  const [isHydrated, setIsHydrated] = useState(false)
  const [session, setSessionState] = useState<Session | null>(null)
  const [profile, setProfileState] = useState<CustomerProfile>(emptyProfile)

  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const [storedSession, storedProfile] = await Promise.all([loadSession(), loadProfile()])
        if (cancelled) return
        if (storedSession) setSessionState(storedSession)
        if (storedProfile) setProfileState(storedProfile)
      } finally {
        if (!cancelled) setIsHydrated(true)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const setSession = useCallback(async (next: Session | null) => {
    setSessionState(next)
    if (next) {
      await persistSession(next)
    } else {
      await clearStoredSession()
    }
  }, [])

  const saveProfile = useCallback(async (next: CustomerProfile) => {
    setProfileState(next)
    await persistProfile(next)
  }, [])

  const resetSession = useCallback(async () => {
    setSessionState(null)
    setProfileState(emptyProfile)
    await Promise.all([clearStoredSession(), clearStoredProfile(), clearDeviceKeypair()])
  }, [])

  const value = useMemo(
    () => ({
      isHydrated,
      session,
      setSession,
      profile,
      saveProfile,
      resetSession,
    }),
    [isHydrated, session, setSession, profile, saveProfile, resetSession],
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
