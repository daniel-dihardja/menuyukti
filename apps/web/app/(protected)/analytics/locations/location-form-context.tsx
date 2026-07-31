'use client'

import { createContext, use, type FormEvent, type ReactNode, type RefObject } from 'react'

import type { BriefHintsState } from '@/lib/location-quick-profile'

import type { OpeningHourRow, Weekday } from './location-form-types'

export type LocationFormState = {
  mode: 'create' | 'edit'
  loading: boolean
  error: string | null
  activeTab: string
  name: string
  street: string
  city: string
  countryId: string
  currency: string
  showCurrencyAutoHint: boolean
  openingHours: OpeningHourRow[]
  hints: BriefHintsState
  profileFilledCount: number
  profileProgress: number
  submitLabel: string
}

export type LocationFormActions = {
  setActiveTab: (tab: string) => void
  markDirty: () => void
  setName: (value: string) => void
  setStreet: (value: string) => void
  setCity: (value: string) => void
  setCountryId: (countryId: string) => void
  setCurrency: (currency: string, hasManualOverride: boolean) => void
  setRowClosed: (dayOfWeek: Weekday, closed: boolean) => void
  updateOpeningHour: (dayOfWeek: Weekday, field: 'openTime' | 'closeTime', value: string) => void
  presetWeekdaysOnly: () => void
  presetCopyMondayToWeekdays: () => void
  presetAllClosed: () => void
  setHintField: <K extends keyof BriefHintsState>(key: K, value: BriefHintsState[K]) => void
  resetHints: () => void
  onSubmit: (e: FormEvent<HTMLFormElement>) => void
}

export type LocationFormMeta = {
  formId: string
  formRef: RefObject<HTMLFormElement | null>
}

const LocationFormStateContext = createContext<LocationFormState | null>(null)
const LocationFormActionsContext = createContext<LocationFormActions | null>(null)
const LocationFormMetaContext = createContext<LocationFormMeta | null>(null)

export function LocationFormContextProvider({
  children,
  state,
  actions,
  meta,
}: {
  children: ReactNode
  state: LocationFormState
  actions: LocationFormActions
  meta: LocationFormMeta
}) {
  return (
    <LocationFormStateContext value={state}>
      <LocationFormActionsContext value={actions}>
        <LocationFormMetaContext value={meta}>{children}</LocationFormMetaContext>
      </LocationFormActionsContext>
    </LocationFormStateContext>
  )
}

export function useLocationFormState(): LocationFormState {
  const ctx = use(LocationFormStateContext)
  if (!ctx) throw new Error('useLocationFormState must be used within LocationForm')
  return ctx
}

export function useLocationFormActions(): LocationFormActions {
  const ctx = use(LocationFormActionsContext)
  if (!ctx) throw new Error('useLocationFormActions must be used within LocationForm')
  return ctx
}

export function useLocationFormMeta(): LocationFormMeta {
  const ctx = use(LocationFormMetaContext)
  if (!ctx) throw new Error('useLocationFormMeta must be used within LocationForm')
  return ctx
}
