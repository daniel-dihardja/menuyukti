'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Button } from '@workspace/ui/components/button'
import { Card, CardContent, CardHeader, CardTitle } from '@workspace/ui/components/card'
import { Input } from '@workspace/ui/components/input'
import { Label } from '@workspace/ui/components/label'
import { Switch } from '@workspace/ui/components/switch'

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
  country: string
  currency: string
  openingHours: OpeningHourRow[]
}

type LocationFormProps = {
  mode: 'create' | 'edit'
  locationId?: string
  initialValues?: LocationFormValues
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

function defaultOpeningHours(): OpeningHourRow[] {
  return WEEKDAYS.map((day) => ({
    dayOfWeek: day,
    closed: true,
    openTime: '',
    closeTime: '',
  }))
}

export function LocationForm({ mode, locationId, initialValues }: LocationFormProps) {
  const t = useTranslations('analytics.branches.form')
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [name, setName] = useState(initialValues?.name ?? '')
  const [street, setStreet] = useState(initialValues?.street ?? '')
  const [city, setCity] = useState(initialValues?.city ?? '')
  const [country, setCountry] = useState(initialValues?.country ?? '')
  const [currency, setCurrency] = useState(initialValues?.currency ?? '')
  const [openingHours, setOpeningHours] = useState<OpeningHourRow[]>(
    initialValues?.openingHours ?? defaultOpeningHours(),
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
      const payload = {
        name,
        street,
        city,
        country,
        currency,
        openingHours,
      }
      const res = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
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
    <form className="space-y-4" onSubmit={onSubmit}>
      <Card className="w-full">
        <CardHeader>
          <CardTitle>{mode === 'create' ? t('createTitle') : t('editTitle')}</CardTitle>
        </CardHeader>

        <CardContent className="space-y-6">
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
              <Input
                id="country"
                name="country"
                placeholder={t('countryPlaceholder')}
                disabled={loading}
                value={country}
                onChange={(e) => setCountry(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="currency">{t('currencyLabel')}</Label>
              <Input
                id="currency"
                name="currency"
                placeholder={t('currencyPlaceholder')}
                disabled={loading}
                value={currency}
                onChange={(e) => setCurrency(e.target.value.toUpperCase())}
              />
            </div>
          </div>

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
