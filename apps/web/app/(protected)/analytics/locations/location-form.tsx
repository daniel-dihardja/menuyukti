'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'

import {
  briefHintsFromQuickProfile,
  buildQuickProfilePayload,
  countFilledBriefProfileFields,
  defaultBriefHintsState,
  BRIEF_PROFILE_FIELD_COUNT,
  type BriefHintsState,
} from '@/lib/location-quick-profile'
import {
  countryIdToCountry,
  countryIdToCurrency,
  normalizeCountryId,
  resolveCountrySelection,
} from '@/lib/locations/country-config'
import { routes } from '@/lib/routes'
import { Alert, AlertDescription } from '@workspace/ui/components/alert'
import { Button } from '@workspace/ui/components/button'
import { Spinner } from '@workspace/ui/components/spinner'
import { Tabs, TabsList, TabsTrigger } from '@workspace/ui/components/tabs'

import {
  LocationFormContextProvider,
  useLocationFormActions,
  useLocationFormMeta,
  useLocationFormState,
  type LocationFormActions,
  type LocationFormState,
} from './location-form-context'
import { LocationBasicsSection } from './location-form-basics-section'
import { LocationBriefSection } from './location-form-brief-section'
import { LocationHoursSection } from './location-form-hours-section'
import {
  defaultLocationOpeningHours,
  LOCATION_DEFAULT_CLOSE,
  LOCATION_DEFAULT_OPEN,
  type LocationFormValues,
  type OpeningHourRow,
  type Weekday,
} from './location-form-types'

export type { LocationFormValues, OpeningHourRow, Weekday } from './location-form-types'

type LocationFormProps = {
  mode: 'create' | 'edit'
  locationId?: string
  initialValues?: LocationFormValues
  initialManualQuickProfile?: Record<string, unknown> | null
}

const FORM_ID = 'location-form'

export function LocationForm({
  mode,
  locationId,
  initialValues,
  initialManualQuickProfile,
}: LocationFormProps) {
  const t = useTranslations('analytics.branches.form')
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isDirty, setIsDirty] = useState(false)
  const [activeTab, setActiveTab] = useState('basics')
  const formRef = useRef<HTMLFormElement>(null)

  const [name, setName] = useState(initialValues?.name ?? '')
  const [street, setStreet] = useState(initialValues?.street ?? '')
  const [city, setCity] = useState(initialValues?.city ?? '')
  const [countryId, setCountryId] = useState(() => {
    const initialCountryId = normalizeCountryId(initialValues?.countryId)
    if (initialCountryId) return initialCountryId
    return resolveCountrySelection(initialValues?.country, initialValues?.currency)?.countryId ?? ''
  })
  const initialResolvedSelection = resolveCountrySelection(
    initialValues?.country,
    initialValues?.currency,
  )
  const initialDefaultCurrency = initialResolvedSelection?.countryId
    ? (countryIdToCurrency[initialResolvedSelection.countryId] ?? '')
    : ''
  const [currency, setCurrency] = useState(() => {
    return initialResolvedSelection?.currency ?? initialValues?.currency ?? ''
  })
  const [hasManualCurrencyOverride, setHasManualCurrencyOverride] = useState(() => {
    const current = (initialResolvedSelection?.currency ?? initialValues?.currency ?? '')
      .trim()
      .toUpperCase()
    if (!current) return false
    return current !== initialDefaultCurrency
  })
  const country = countryId ? (countryIdToCountry[countryId] ?? '') : ''
  const [openingHours, setOpeningHours] = useState<OpeningHourRow[]>(
    initialValues?.openingHours ?? defaultLocationOpeningHours(),
  )
  const [hints, setHints] = useState<BriefHintsState>(() =>
    briefHintsFromQuickProfile(initialManualQuickProfile ?? null),
  )

  const endpoint = useMemo(() => {
    if (mode === 'create') return '/api/locations'
    return `/api/locations/${locationId}`
  }, [locationId, mode])

  const method = mode === 'create' ? 'POST' : 'PATCH'
  const profileFilledCount = countFilledBriefProfileFields(hints)
  const profileProgress = Math.round((profileFilledCount / BRIEF_PROFILE_FIELD_COUNT) * 100)
  const defaultCurrencyForCountry = countryId ? (countryIdToCurrency[countryId] ?? '') : ''
  const showCurrencyAutoHint =
    Boolean(countryId) && !hasManualCurrencyOverride && currency === defaultCurrencyForCountry

  useEffect(() => {
    if (!isDirty) return
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault()
      event.returnValue = ''
    }
    window.addEventListener('beforeunload', onBeforeUnload)
    return () => window.removeEventListener('beforeunload', onBeforeUnload)
  }, [isDirty])

  function markDirty() {
    setIsDirty(true)
  }

  function setRowClosed(dayOfWeek: Weekday, closed: boolean) {
    markDirty()
    setOpeningHours((prev) =>
      prev.map((row) => {
        if (row.dayOfWeek !== dayOfWeek) return row
        if (closed) {
          return { ...row, closed: true, openTime: '', closeTime: '' }
        }
        return {
          ...row,
          closed: false,
          openTime: row.openTime || LOCATION_DEFAULT_OPEN,
          closeTime: row.closeTime || LOCATION_DEFAULT_CLOSE,
        }
      }),
    )
  }

  function updateOpeningHour(dayOfWeek: Weekday, field: 'openTime' | 'closeTime', value: string) {
    markDirty()
    setOpeningHours((prev) =>
      prev.map((row) => (row.dayOfWeek === dayOfWeek ? { ...row, [field]: value } : row)),
    )
  }

  function presetWeekdaysOnly() {
    markDirty()
    setOpeningHours((prev) =>
      prev.map((row) => {
        const isWeekday =
          row.dayOfWeek === 'monday' ||
          row.dayOfWeek === 'tuesday' ||
          row.dayOfWeek === 'wednesday' ||
          row.dayOfWeek === 'thursday' ||
          row.dayOfWeek === 'friday'
        if (isWeekday) {
          return {
            ...row,
            closed: false,
            openTime: LOCATION_DEFAULT_OPEN,
            closeTime: LOCATION_DEFAULT_CLOSE,
          }
        }
        return { ...row, closed: true, openTime: '', closeTime: '' }
      }),
    )
  }

  function presetAllClosed() {
    markDirty()
    setOpeningHours(defaultLocationOpeningHours())
  }

  function presetCopyMondayToWeekdays() {
    markDirty()
    setOpeningHours((prev) => {
      const monday = prev.find((row) => row.dayOfWeek === 'monday')
      if (!monday) return prev
      return prev.map((row) => {
        const isWeekday =
          row.dayOfWeek === 'tuesday' ||
          row.dayOfWeek === 'wednesday' ||
          row.dayOfWeek === 'thursday' ||
          row.dayOfWeek === 'friday'
        if (!isWeekday) return row
        return {
          ...row,
          closed: monday.closed,
          openTime: monday.openTime,
          closeTime: monday.closeTime,
        }
      })
    })
  }

  function setHintField<K extends keyof BriefHintsState>(key: K, value: BriefHintsState[K]) {
    markDirty()
    setHints((h) => ({ ...h, [key]: value }))
  }

  function validateOpeningHoursClient(): string | null {
    for (const row of openingHours) {
      if (row.closed) continue
      if (!row.openTime.trim() || !row.closeTime.trim()) {
        return t('errors.openingHoursIncomplete', { day: t(`weekdays.${row.dayOfWeek}`) })
      }
      if (row.openTime >= row.closeTime) {
        return t('errors.openingHoursOrder', { day: t(`weekdays.${row.dayOfWeek}`) })
      }
    }
    return null
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    const clientErr = validateOpeningHoursClient()
    if (clientErr) {
      setError(clientErr)
      setActiveTab('hours')
      return
    }
    setLoading(true)

    try {
      const payloadBase = {
        name,
        street,
        city,
        countryId,
        country,
        currency,
        openingHours,
      }
      const body =
        mode === 'edit'
          ? { ...payloadBase, quickProfile: buildQuickProfilePayload(hints) }
          : payloadBase

      const res = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (!res.ok) {
        const data = (await res.json()) as { message?: string; issues?: { message?: string }[] }
        const fromIssues = data.issues?.map((i) => i.message).filter(Boolean)[0]
        throw new Error(data.message ?? fromIssues ?? t('errors.saveFailed'))
      }

      const saved = (await res.json()) as { id?: string }
      setIsDirty(false)
      router.refresh()

      if (mode === 'create') {
        toast.success(t('toast.createdTitle'), {
          description: t('toast.createdDescription'),
          action: {
            label: t('toast.uploadSalesAction'),
            onClick: () =>
              router.push(routes.analytics.salesWithLocation(saved.id ?? locationId ?? '')),
          },
        })
        const newId = saved.id ?? locationId
        if (newId) {
          router.push(routes.analytics.branchesDetail(newId))
        } else {
          router.push(routes.analytics.branches)
        }
        return
      }

      toast.success(t('toast.savedTitle'), {
        description: t('toast.savedDescription'),
        action: {
          label: t('toast.uploadSalesAction'),
          onClick: () => router.push(routes.analytics.salesWithLocation(locationId ?? '')),
        },
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : t('errors.saveFailed'))
    } finally {
      setLoading(false)
    }
  }

  const submitLabel =
    loading && mode === 'create'
      ? t('creating')
      : loading && mode === 'edit'
        ? t('saving')
        : mode === 'create'
          ? t('createAction')
          : t('saveAction')

  const state: LocationFormState = {
    mode,
    loading,
    error,
    activeTab,
    name,
    street,
    city,
    countryId,
    currency,
    showCurrencyAutoHint,
    openingHours,
    hints,
    profileFilledCount,
    profileProgress,
    submitLabel,
  }

  const actions: LocationFormActions = {
    setActiveTab,
    markDirty,
    setName: (value) => {
      markDirty()
      setName(value)
    },
    setStreet: (value) => {
      markDirty()
      setStreet(value)
    },
    setCity: (value) => {
      markDirty()
      setCity(value)
    },
    setCountryId: (nextCountryId) => {
      markDirty()
      setCountryId(nextCountryId)
      if (!hasManualCurrencyOverride && nextCountryId) {
        setCurrency(countryIdToCurrency[nextCountryId] ?? '')
      }
    },
    setCurrency: (nextCurrency, hasManualOverride) => {
      markDirty()
      setCurrency(nextCurrency)
      setHasManualCurrencyOverride(hasManualOverride)
    },
    setRowClosed,
    updateOpeningHour,
    presetWeekdaysOnly,
    presetCopyMondayToWeekdays,
    presetAllClosed,
    setHintField,
    resetHints: () => {
      markDirty()
      setHints(defaultBriefHintsState())
    },
    onSubmit,
  }

  return (
    <LocationFormContextProvider
      state={state}
      actions={actions}
      meta={{ formId: FORM_ID, formRef }}
    >
      <LocationFormShell />
    </LocationFormContextProvider>
  )
}

function LocationFormShell() {
  const t = useTranslations('analytics.branches.form')
  const { mode, loading, error, activeTab, submitLabel } = useLocationFormState()
  const { setActiveTab, onSubmit } = useLocationFormActions()
  const { formId, formRef } = useLocationFormMeta()

  return (
    <>
      <form
        id={formId}
        ref={formRef}
        className="flex flex-col gap-4 pb-24 sm:gap-6 sm:pb-0"
        onSubmit={onSubmit}
      >
        <div className="flex flex-col gap-4 sm:gap-6">
          {mode === 'create' ? (
            <div className="space-y-1">
              <h2 className="text-base font-semibold tracking-tight">{t('createTitle')}</h2>
              <p className="text-sm text-muted-foreground">{t('openingHoursDescription')}</p>
            </div>
          ) : null}

          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="mb-4 w-full justify-start">
              <TabsTrigger value="basics">{t('tabs.basics')}</TabsTrigger>
              <TabsTrigger value="hours">{t('tabs.hours')}</TabsTrigger>
              {mode === 'edit' ? (
                <TabsTrigger value="marketing">{t('tabs.marketing')}</TabsTrigger>
              ) : null}
            </TabsList>

            <LocationBasicsSection />
            <LocationHoursSection />
            {mode === 'edit' ? <LocationBriefSection /> : null}
          </Tabs>

          {error ? (
            <Alert variant="destructive" role="alert" aria-live="assertive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : null}
        </div>

        <div className="hidden justify-end sm:flex">
          <Button type="submit" disabled={loading} className="min-w-[140px]">
            {loading ? (
              <>
                <Spinner data-icon="inline-start" />
                {submitLabel}
              </>
            ) : (
              submitLabel
            )}
          </Button>
        </div>
      </form>

      <div
        aria-label={t('stickySaveAria')}
        className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] backdrop-blur-md sm:hidden"
      >
        <Button
          type="submit"
          disabled={loading}
          className="w-full touch-manipulation"
          form={formId}
        >
          {loading ? (
            <>
              <Spinner data-icon="inline-start" />
              {submitLabel}
            </>
          ) : (
            submitLabel
          )}
        </Button>
      </div>
    </>
  )
}
