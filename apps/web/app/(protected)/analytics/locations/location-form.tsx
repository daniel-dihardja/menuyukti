'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Button } from '@workspace/ui/components/button'
import { Card, CardContent, CardHeader, CardTitle } from '@workspace/ui/components/card'
import { Input } from '@workspace/ui/components/input'
import { Label } from '@workspace/ui/components/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@workspace/ui/components/select'
import { Switch } from '@workspace/ui/components/switch'
import { Textarea } from '@workspace/ui/components/textarea'

import {
  BRIEF_TEXT_MAX_LENGTHS,
  briefHintsFromQuickProfile,
  briefHintsHasAnySelection,
  buildQuickProfilePayload,
  defaultBriefHintsState,
  type BriefHintsState,
} from '@/lib/location-quick-profile'
import {
  COUNTRY_OPTIONS,
  SUPPORTED_CURRENCIES,
  countryIdToCountry,
  countryIdToCurrency,
  normalizeCountryId,
  resolveCountrySelection,
} from '@/lib/locations/country-config'

export type Weekday =
  | 'monday'
  | 'tuesday'
  | 'wednesday'
  | 'thursday'
  | 'friday'
  | 'saturday'
  | 'sunday'

type OpeningHourRow = {
  dayOfWeek: Weekday
  /** When true, the day is closed and times are not used. */
  closed: boolean
  openTime: string
  closeTime: string
}

type LocationFormValues = {
  name: string
  street: string
  city: string
  countryId?: string
  country: string
  currency: string
  openingHours: OpeningHourRow[]
}

type LocationFormProps = {
  mode: 'create' | 'edit'
  locationId?: string
  initialValues?: LocationFormValues
  /** Server `manualBriefInput.quickProfile` when editing. */
  initialManualQuickProfile?: Record<string, unknown> | null
}

const WEEKDAYS: Weekday[] = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
]

const DEFAULT_OPEN = '09:00'
const DEFAULT_CLOSE = '22:00'
const EMPTY_SELECT_VALUE = '__none__'

function defaultOpeningHours(): OpeningHourRow[] {
  return WEEKDAYS.map((day) => ({
    dayOfWeek: day,
    closed: true,
    openTime: '',
    closeTime: '',
  }))
}

export function LocationForm({
  mode,
  locationId,
  initialValues,
  initialManualQuickProfile,
}: LocationFormProps) {
  const t = useTranslations('analytics.branches.form')
  const tm = useTranslations('analytics.branches.form.manualBrief')
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
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
    initialValues?.openingHours ?? defaultOpeningHours(),
  )
  const [hints, setHints] = useState<BriefHintsState>(() =>
    briefHintsFromQuickProfile(initialManualQuickProfile ?? null),
  )
  const endpoint = useMemo(() => {
    if (mode === 'create') return '/api/locations'
    return `/api/locations/${locationId}`
  }, [locationId, mode])

  const method = mode === 'create' ? 'POST' : 'PATCH'

  function setRowClosed(dayOfWeek: Weekday, closed: boolean) {
    setOpeningHours((prev) =>
      prev.map((row) => {
        if (row.dayOfWeek !== dayOfWeek) return row
        if (closed) {
          return { ...row, closed: true, openTime: '', closeTime: '' }
        }
        return {
          ...row,
          closed: false,
          openTime: row.openTime || DEFAULT_OPEN,
          closeTime: row.closeTime || DEFAULT_CLOSE,
        }
      }),
    )
  }

  function updateOpeningHour(dayOfWeek: Weekday, field: 'openTime' | 'closeTime', value: string) {
    setOpeningHours((prev) =>
      prev.map((row) => (row.dayOfWeek === dayOfWeek ? { ...row, [field]: value } : row)),
    )
  }

  function presetWeekdaysOnly() {
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
            openTime: DEFAULT_OPEN,
            closeTime: DEFAULT_CLOSE,
          }
        }
        return { ...row, closed: true, openTime: '', closeTime: '' }
      }),
    )
  }

  function presetAllClosed() {
    setOpeningHours(defaultOpeningHours())
  }

  function setHintField<K extends keyof BriefHintsState>(key: K, value: BriefHintsState[K]) {
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

      router.refresh()
      if (mode === 'create') {
        router.push('/analytics/locations')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t('errors.saveFailed'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <form className="space-y-4 sm:space-y-6" onSubmit={onSubmit}>
      <Card className="-mx-4 w-[calc(100%+2rem)] gap-4 rounded-none border-x-0 py-4 sm:mx-0 sm:w-full sm:gap-6 sm:rounded-xl sm:border-x sm:py-6">
        <CardHeader className="px-4 sm:px-6">
          <CardTitle>{mode === 'create' ? t('createTitle') : t('editTitle')}</CardTitle>
        </CardHeader>

        <CardContent className="space-y-4 px-4 sm:space-y-6 sm:px-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="name">{t('nameLabel')}</Label>
              <Input
                id="name"
                name="name"
                placeholder={t('namePlaceholder')}
                required
                disabled={loading}
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="street">{t('streetLabel')}</Label>
              <Input
                id="street"
                name="street"
                placeholder={t('streetPlaceholder')}
                disabled={loading}
                value={street}
                onChange={(e) => setStreet(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="city">{t('cityLabel')}</Label>
              <Input
                id="city"
                name="city"
                placeholder={t('cityPlaceholder')}
                disabled={loading}
                value={city}
                onChange={(e) => setCity(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="country">{t('countryLabel')}</Label>
              <Select
                value={countryId || EMPTY_SELECT_VALUE}
                onValueChange={(value) => {
                  const nextCountryId = value === EMPTY_SELECT_VALUE ? '' : value
                  setCountryId(nextCountryId)
                  if (!hasManualCurrencyOverride && nextCountryId) {
                    setCurrency(countryIdToCurrency[nextCountryId] ?? '')
                  }
                }}
                disabled={loading}
              >
                <SelectTrigger id="country" name="country" className="w-full">
                  <SelectValue placeholder={t('countrySelectPlaceholder')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={EMPTY_SELECT_VALUE}>{t('noneOption')}</SelectItem>
                  {COUNTRY_OPTIONS.map((option) => (
                    <SelectItem key={option.countryId} value={option.countryId}>
                      {t(`countryOptions.${option.countryId}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="currency">{t('currencyLabel')}</Label>
              <Select
                value={currency || EMPTY_SELECT_VALUE}
                onValueChange={(value) => {
                  const nextCurrency = value === EMPTY_SELECT_VALUE ? '' : value
                  setCurrency(nextCurrency)
                  const defaultCurrency = countryId ? (countryIdToCurrency[countryId] ?? '') : ''
                  setHasManualCurrencyOverride(
                    Boolean(nextCurrency) && nextCurrency !== defaultCurrency,
                  )
                }}
                disabled={loading}
              >
                <SelectTrigger id="currency" name="currency" className="w-full">
                  <SelectValue placeholder={t('currencySelectPlaceholder')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={EMPTY_SELECT_VALUE}>{t('noneOption')}</SelectItem>
                  {SUPPORTED_CURRENCIES.map((currencyCode) => (
                    <SelectItem key={currencyCode} value={currencyCode}>
                      {t(`currencyOptions.${currencyCode}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {mode === 'edit' ? (
            <div className="space-y-6 rounded-lg border border-border/80 bg-muted/10 px-4 py-4">
              <p className="text-sm text-muted-foreground">{tm('intro')}</p>

              <div className="space-y-2">
                <Label htmlFor="brief-notes" className="text-sm font-medium">
                  {tm('notesLabel')}
                </Label>
                <Textarea
                  id="brief-notes"
                  rows={4}
                  disabled={loading}
                  placeholder={tm('notesPlaceholder')}
                  value={hints.notes}
                  onChange={(e) => setHintField('notes', e.target.value)}
                />
              </div>

              <fieldset className="space-y-4 rounded-md border border-border/60 bg-background/70 p-3">
                <legend className="px-1 text-sm font-semibold">
                  {tm('sections.profile.title')}
                </legend>
                <p className="text-xs text-muted-foreground">
                  {tm('sections.profile.description')}
                </p>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="instagram-handle" className="text-sm font-medium">
                      {tm('instagramHandleLabel')}
                    </Label>
                    <Input
                      id="instagram-handle"
                      inputMode="text"
                      maxLength={BRIEF_TEXT_MAX_LENGTHS.instagramHandle + 1}
                      disabled={loading}
                      placeholder={tm('instagramHandlePlaceholder')}
                      value={hints.instagramHandle}
                      onChange={(e) => setHintField('instagramHandle', e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="neighborhood" className="text-sm font-medium">
                      {tm('neighborhoodLabel')}
                    </Label>
                    <Input
                      id="neighborhood"
                      maxLength={BRIEF_TEXT_MAX_LENGTHS.neighborhood}
                      disabled={loading}
                      placeholder={tm('neighborhoodPlaceholder')}
                      value={hints.neighborhood}
                      onChange={(e) => setHintField('neighborhood', e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="phone" className="text-sm font-medium">
                      {tm('phoneLabel')}
                    </Label>
                    <Input
                      id="phone"
                      type="tel"
                      inputMode="tel"
                      maxLength={BRIEF_TEXT_MAX_LENGTHS.phone}
                      disabled={loading}
                      placeholder={tm('phonePlaceholder')}
                      value={hints.phone}
                      onChange={(e) => setHintField('phone', e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="contact-email" className="text-sm font-medium">
                      {tm('contactEmailLabel')}
                    </Label>
                    <Input
                      id="contact-email"
                      type="email"
                      inputMode="email"
                      maxLength={BRIEF_TEXT_MAX_LENGTHS.contactEmail}
                      disabled={loading}
                      placeholder={tm('contactEmailPlaceholder')}
                      value={hints.contactEmail}
                      onChange={(e) => setHintField('contactEmail', e.target.value)}
                    />
                  </div>

                  <div className="space-y-2 sm:col-span-2">
                    <Label htmlFor="website-url" className="text-sm font-medium">
                      {tm('websiteUrlLabel')}
                    </Label>
                    <Input
                      id="website-url"
                      type="url"
                      inputMode="url"
                      maxLength={BRIEF_TEXT_MAX_LENGTHS.websiteUrl}
                      disabled={loading}
                      placeholder={tm('websiteUrlPlaceholder')}
                      value={hints.websiteUrl}
                      onChange={(e) => setHintField('websiteUrl', e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="reservation-url" className="text-sm font-medium">
                      {tm('reservationUrlLabel')}
                    </Label>
                    <Input
                      id="reservation-url"
                      type="url"
                      inputMode="url"
                      maxLength={BRIEF_TEXT_MAX_LENGTHS.reservationUrl}
                      disabled={loading}
                      placeholder={tm('reservationUrlPlaceholder')}
                      value={hints.reservationUrl}
                      onChange={(e) => setHintField('reservationUrl', e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="online-order-url" className="text-sm font-medium">
                      {tm('onlineOrderUrlLabel')}
                    </Label>
                    <Input
                      id="online-order-url"
                      type="url"
                      inputMode="url"
                      maxLength={BRIEF_TEXT_MAX_LENGTHS.onlineOrderUrl}
                      disabled={loading}
                      placeholder={tm('onlineOrderUrlPlaceholder')}
                      value={hints.onlineOrderUrl}
                      onChange={(e) => setHintField('onlineOrderUrl', e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="menu-url" className="text-sm font-medium">
                      {tm('menuUrlLabel')}
                    </Label>
                    <Input
                      id="menu-url"
                      type="url"
                      inputMode="url"
                      maxLength={BRIEF_TEXT_MAX_LENGTHS.menuUrl}
                      disabled={loading}
                      placeholder={tm('menuUrlPlaceholder')}
                      value={hints.menuUrl}
                      onChange={(e) => setHintField('menuUrl', e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="google-maps-url" className="text-sm font-medium">
                      {tm('googleMapsUrlLabel')}
                    </Label>
                    <Input
                      id="google-maps-url"
                      type="url"
                      inputMode="url"
                      maxLength={BRIEF_TEXT_MAX_LENGTHS.googleMapsUrl}
                      disabled={loading}
                      placeholder={tm('googleMapsUrlPlaceholder')}
                      value={hints.googleMapsUrl}
                      onChange={(e) => setHintField('googleMapsUrl', e.target.value)}
                    />
                  </div>
                </div>
              </fieldset>

              {briefHintsHasAnySelection(hints) ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={loading}
                  onClick={() => {
                    setHints(defaultBriefHintsState())
                  }}
                >
                  {tm('resetHints')}
                </Button>
              ) : null}
            </div>
          ) : null}

          <fieldset className="space-y-3 rounded-lg border p-4">
            <legend className="px-1 text-sm font-medium">{t('openingHoursTitle')}</legend>
            <p className="text-sm text-muted-foreground">{t('openingHoursDescription')}</p>
            <div
              className="flex flex-wrap gap-2"
              role="group"
              aria-label={t('openingHoursPresetsAria')}
            >
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={loading}
                onClick={presetWeekdaysOnly}
              >
                {t('presetWeekdays')}
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={loading}
                onClick={presetAllClosed}
              >
                {t('presetAllClosed')}
              </Button>
            </div>

            <div className="space-y-3 pt-1">
              {openingHours.map((row) => {
                const switchId = `closed-${row.dayOfWeek}`
                const openId = `open-${row.dayOfWeek}`
                const closeId = `close-${row.dayOfWeek}`
                return (
                  <div
                    key={row.dayOfWeek}
                    role="group"
                    aria-labelledby={`${switchId}-label`}
                    className="flex flex-col gap-3 rounded-md border border-border/60 bg-muted/20 p-3 sm:flex-row sm:items-center sm:gap-4"
                  >
                    <p
                      id={`${switchId}-label`}
                      className="min-w-[6.5rem] font-medium capitalize sm:shrink-0"
                    >
                      {t(`weekdays.${row.dayOfWeek}`)}
                    </p>
                    <div className="flex items-center gap-2 sm:w-48 sm:shrink-0">
                      <Switch
                        id={switchId}
                        checked={!row.closed}
                        disabled={loading}
                        onCheckedChange={(checked) => setRowClosed(row.dayOfWeek, checked !== true)}
                        aria-label={t('openDaySwitchAria', { day: t(`weekdays.${row.dayOfWeek}`) })}
                      />
                      <Label
                        htmlFor={switchId}
                        className="cursor-pointer text-sm font-normal leading-none"
                      >
                        {row.closed ? t('dayClosed') : t('dayOpen')}
                      </Label>
                    </div>
                    <div className="grid flex-1 grid-cols-2 gap-3 sm:max-w-md">
                      <div className="space-y-1.5">
                        <Label htmlFor={openId} className="text-xs text-muted-foreground">
                          {t('opensAt')}
                        </Label>
                        <Input
                          id={openId}
                          type="time"
                          value={row.openTime}
                          disabled={loading || row.closed}
                          aria-disabled={row.closed}
                          onChange={(e) =>
                            updateOpeningHour(row.dayOfWeek, 'openTime', e.target.value)
                          }
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor={closeId} className="text-xs text-muted-foreground">
                          {t('closesAt')}
                        </Label>
                        <Input
                          id={closeId}
                          type="time"
                          value={row.closeTime}
                          disabled={loading || row.closed}
                          aria-disabled={row.closed}
                          onChange={(e) =>
                            updateOpeningHour(row.dayOfWeek, 'closeTime', e.target.value)
                          }
                        />
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </fieldset>

          {error ? (
            <p className="text-sm text-destructive" role="alert" aria-live="assertive">
              {error}
            </p>
          ) : null}
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button type="submit" disabled={loading} className="w-full sm:w-auto">
          {loading
            ? mode === 'create'
              ? t('creating')
              : t('saving')
            : mode === 'create'
              ? t('createAction')
              : t('saveAction')}
        </Button>
      </div>
    </form>
  )
}
