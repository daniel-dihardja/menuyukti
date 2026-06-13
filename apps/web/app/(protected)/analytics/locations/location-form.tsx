'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'
import { ChevronDown } from 'lucide-react'

import {
  BRIEF_PROFILE_FIELD_COUNT,
  BRIEF_TEXT_MAX_LENGTHS,
  briefHintsFromQuickProfile,
  briefHintsHasAnySelection,
  buildQuickProfilePayload,
  countFilledBriefProfileFields,
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
import { routes } from '@/lib/routes'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@workspace/ui/components/accordion'
import { Alert, AlertDescription } from '@workspace/ui/components/alert'
import { Button } from '@workspace/ui/components/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@workspace/ui/components/card'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@workspace/ui/components/collapsible'
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from '@workspace/ui/components/field'
import { Input } from '@workspace/ui/components/input'
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  InputGroupText,
} from '@workspace/ui/components/input-group'
import { Progress } from '@workspace/ui/components/progress'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@workspace/ui/components/select'
import { Spinner } from '@workspace/ui/components/spinner'
import { Switch } from '@workspace/ui/components/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@workspace/ui/components/tabs'
import { Textarea } from '@workspace/ui/components/textarea'

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
const FORM_ID = 'location-form'

function defaultOpeningHours(): OpeningHourRow[] {
  return WEEKDAYS.map((day) => ({
    dayOfWeek: day,
    closed: true,
    openTime: '',
    closeTime: '',
  }))
}

function formatHoursSummary(row: OpeningHourRow, dayLabel: string, closedLabel: string): string {
  if (row.closed || !row.openTime || !row.closeTime) {
    return `${dayLabel} · ${closedLabel}`
  }
  return `${dayLabel} · ${row.openTime}–${row.closeTime}`
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
          openTime: row.openTime || DEFAULT_OPEN,
          closeTime: row.closeTime || DEFAULT_CLOSE,
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
            openTime: DEFAULT_OPEN,
            closeTime: DEFAULT_CLOSE,
          }
        }
        return { ...row, closed: true, openTime: '', closeTime: '' }
      }),
    )
  }

  function presetAllClosed() {
    markDirty()
    setOpeningHours(defaultOpeningHours())
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

  function renderOpeningHourRow(row: OpeningHourRow, compact = false) {
    const switchId = `closed-${row.dayOfWeek}`
    const openId = `open-${row.dayOfWeek}`
    const closeId = `close-${row.dayOfWeek}`
    const dayLabel = t(`weekdays.${row.dayOfWeek}`)

    const controls = (
      <>
        <div className="flex items-center gap-2 sm:w-48 sm:shrink-0">
          <Switch
            id={switchId}
            checked={!row.closed}
            disabled={loading}
            onCheckedChange={(checked) => setRowClosed(row.dayOfWeek, checked !== true)}
            aria-label={t('openDaySwitchAria', { day: dayLabel })}
          />
          <FieldLabel
            htmlFor={switchId}
            className="cursor-pointer text-sm font-normal leading-none"
          >
            {row.closed ? t('dayClosed') : t('dayOpen')}
          </FieldLabel>
        </div>
        <div className="grid flex-1 grid-cols-2 gap-3 sm:max-w-md">
          <Field>
            <FieldLabel htmlFor={openId} className="text-xs text-muted-foreground">
              {t('opensAt')}
            </FieldLabel>
            <Input
              id={openId}
              type="time"
              value={row.openTime}
              disabled={loading || row.closed}
              aria-disabled={row.closed}
              onChange={(e) => updateOpeningHour(row.dayOfWeek, 'openTime', e.target.value)}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor={closeId} className="text-xs text-muted-foreground">
              {t('closesAt')}
            </FieldLabel>
            <Input
              id={closeId}
              type="time"
              value={row.closeTime}
              disabled={loading || row.closed}
              aria-disabled={row.closed}
              onChange={(e) => updateOpeningHour(row.dayOfWeek, 'closeTime', e.target.value)}
            />
          </Field>
        </div>
      </>
    )

    if (compact) {
      return (
        <AccordionItem key={row.dayOfWeek} value={row.dayOfWeek}>
          <AccordionTrigger className="py-3 text-sm hover:no-underline">
            {formatHoursSummary(row, dayLabel, t('dayClosed'))}
          </AccordionTrigger>
          <AccordionContent className="flex flex-col gap-3 pb-3">{controls}</AccordionContent>
        </AccordionItem>
      )
    }

    return (
      <div
        key={row.dayOfWeek}
        role="group"
        aria-labelledby={`${switchId}-label`}
        className="flex flex-col gap-3 rounded-md border border-border/60 bg-muted/20 p-3 sm:flex-row sm:items-center sm:gap-4"
      >
        <p id={`${switchId}-label`} className="min-w-[6.5rem] font-medium capitalize sm:shrink-0">
          {dayLabel}
        </p>
        {controls}
      </div>
    )
  }

  const submitLabel =
    loading && mode === 'create'
      ? t('creating')
      : loading && mode === 'edit'
        ? t('saving')
        : mode === 'create'
          ? t('createAction')
          : t('saveAction')

  return (
    <>
      <form
        id={FORM_ID}
        ref={formRef}
        className="flex flex-col gap-4 pb-24 sm:gap-6 sm:pb-0"
        onSubmit={onSubmit}
      >
        <Card className="gap-4 py-4 sm:gap-6 sm:rounded-xl sm:py-6">
          <CardHeader className="px-4 sm:px-6">
            <CardTitle>{mode === 'create' ? t('createTitle') : t('editTitle')}</CardTitle>
            <CardDescription>
              {mode === 'create' ? t('openingHoursDescription') : tm('intro')}
            </CardDescription>
          </CardHeader>

          <CardContent className="px-4 sm:px-6">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="mb-4 w-full justify-start overflow-x-auto">
                <TabsTrigger value="basics">{t('tabs.basics')}</TabsTrigger>
                <TabsTrigger value="hours">{t('tabs.hours')}</TabsTrigger>
                {mode === 'edit' ? (
                  <TabsTrigger value="marketing">{t('tabs.marketing')}</TabsTrigger>
                ) : null}
              </TabsList>

              <TabsContent value="basics" className="flex flex-col gap-4">
                <FieldGroup className="gap-4 sm:grid sm:grid-cols-2">
                  <Field className="sm:col-span-2">
                    <FieldLabel htmlFor="name">{t('nameLabel')}</FieldLabel>
                    <Input
                      id="name"
                      name="name"
                      autoComplete="organization"
                      placeholder={t('namePlaceholder')}
                      required
                      disabled={loading}
                      value={name}
                      onChange={(e) => {
                        markDirty()
                        setName(e.target.value)
                      }}
                    />
                  </Field>

                  <Field className="sm:col-span-2">
                    <FieldLabel htmlFor="street">{t('streetLabel')}</FieldLabel>
                    <Input
                      id="street"
                      name="street"
                      autoComplete="street-address"
                      placeholder={t('streetPlaceholder')}
                      disabled={loading}
                      value={street}
                      onChange={(e) => {
                        markDirty()
                        setStreet(e.target.value)
                      }}
                    />
                  </Field>

                  <Field>
                    <FieldLabel htmlFor="city">{t('cityLabel')}</FieldLabel>
                    <Input
                      id="city"
                      name="city"
                      autoComplete="address-level2"
                      placeholder={t('cityPlaceholder')}
                      disabled={loading}
                      value={city}
                      onChange={(e) => {
                        markDirty()
                        setCity(e.target.value)
                      }}
                    />
                  </Field>

                  <Field>
                    <FieldLabel htmlFor="country">{t('countryLabel')}</FieldLabel>
                    <Select
                      value={countryId || EMPTY_SELECT_VALUE}
                      onValueChange={(value) => {
                        markDirty()
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
                  </Field>

                  <Field className="sm:col-span-2 sm:col-start-1">
                    <FieldLabel htmlFor="currency">{t('currencyLabel')}</FieldLabel>
                    <Select
                      value={currency || EMPTY_SELECT_VALUE}
                      onValueChange={(value) => {
                        markDirty()
                        const nextCurrency = value === EMPTY_SELECT_VALUE ? '' : value
                        setCurrency(nextCurrency)
                        const defaultCurrency = countryId
                          ? (countryIdToCurrency[countryId] ?? '')
                          : ''
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
                    {showCurrencyAutoHint ? (
                      <FieldDescription>{t('currencyAutoHint')}</FieldDescription>
                    ) : null}
                  </Field>
                </FieldGroup>
              </TabsContent>

              <TabsContent value="hours" className="flex flex-col gap-4">
                <FieldSet>
                  <FieldLegend variant="label">{t('openingHoursTitle')}</FieldLegend>
                  <FieldDescription>{t('openingHoursDescription')}</FieldDescription>
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
                      onClick={presetCopyMondayToWeekdays}
                    >
                      {t('presetCopyMonday')}
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

                  <Accordion type="single" collapsible className="md:hidden">
                    {openingHours.map((row) => renderOpeningHourRow(row, true))}
                  </Accordion>

                  <div className="hidden flex-col gap-3 md:flex">
                    {openingHours.map((row) => renderOpeningHourRow(row))}
                  </div>
                </FieldSet>
              </TabsContent>

              {mode === 'edit' ? (
                <TabsContent value="marketing" className="flex flex-col gap-4">
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm text-muted-foreground">
                        {t('profileCompleteness', {
                          filled: profileFilledCount,
                          total: BRIEF_PROFILE_FIELD_COUNT,
                        })}
                      </p>
                      <span className="text-sm font-medium tabular-nums">{profileProgress}%</span>
                    </div>
                    <Progress value={profileProgress} aria-label={t('tabs.marketing')} />
                  </div>

                  <Field>
                    <FieldLabel htmlFor="brief-notes">{tm('notesLabel')}</FieldLabel>
                    <FieldDescription>{tm('sections.profile.description')}</FieldDescription>
                    <Textarea
                      id="brief-notes"
                      rows={4}
                      disabled={loading}
                      placeholder={tm('notesPlaceholder')}
                      value={hints.notes}
                      onChange={(e) => setHintField('notes', e.target.value)}
                    />
                  </Field>

                  <FieldSet className="rounded-lg border border-border/80 bg-muted/10 p-4">
                    <FieldLegend>{tm('sections.profile.title')}</FieldLegend>
                    <FieldGroup className="gap-4 sm:grid sm:grid-cols-2">
                      <Field>
                        <FieldLabel htmlFor="instagram-handle">
                          {tm('instagramHandleLabel')}
                        </FieldLabel>
                        <InputGroup>
                          <InputGroupAddon align="inline-start">
                            <InputGroupText>@</InputGroupText>
                          </InputGroupAddon>
                          <InputGroupInput
                            id="instagram-handle"
                            inputMode="text"
                            autoComplete="off"
                            spellCheck={false}
                            maxLength={BRIEF_TEXT_MAX_LENGTHS.instagramHandle + 1}
                            disabled={loading}
                            placeholder={tm('instagramHandlePlaceholder')}
                            value={hints.instagramHandle}
                            onChange={(e) => setHintField('instagramHandle', e.target.value)}
                          />
                        </InputGroup>
                      </Field>

                      <Field>
                        <FieldLabel htmlFor="neighborhood">{tm('neighborhoodLabel')}</FieldLabel>
                        <Input
                          id="neighborhood"
                          autoComplete="off"
                          maxLength={BRIEF_TEXT_MAX_LENGTHS.neighborhood}
                          disabled={loading}
                          placeholder={tm('neighborhoodPlaceholder')}
                          value={hints.neighborhood}
                          onChange={(e) => setHintField('neighborhood', e.target.value)}
                        />
                      </Field>

                      <Field>
                        <FieldLabel htmlFor="phone">{tm('phoneLabel')}</FieldLabel>
                        <Input
                          id="phone"
                          type="tel"
                          inputMode="tel"
                          autoComplete="tel"
                          maxLength={BRIEF_TEXT_MAX_LENGTHS.phone}
                          disabled={loading}
                          placeholder={tm('phonePlaceholder')}
                          value={hints.phone}
                          onChange={(e) => setHintField('phone', e.target.value)}
                        />
                      </Field>

                      <Field>
                        <FieldLabel htmlFor="contact-email">{tm('contactEmailLabel')}</FieldLabel>
                        <Input
                          id="contact-email"
                          type="email"
                          inputMode="email"
                          autoComplete="email"
                          spellCheck={false}
                          maxLength={BRIEF_TEXT_MAX_LENGTHS.contactEmail}
                          disabled={loading}
                          placeholder={tm('contactEmailPlaceholder')}
                          value={hints.contactEmail}
                          onChange={(e) => setHintField('contactEmail', e.target.value)}
                        />
                      </Field>

                      <Field className="sm:col-span-2">
                        <FieldLabel htmlFor="website-url">{tm('websiteUrlLabel')}</FieldLabel>
                        <Input
                          id="website-url"
                          type="url"
                          inputMode="url"
                          autoComplete="url"
                          maxLength={BRIEF_TEXT_MAX_LENGTHS.websiteUrl}
                          disabled={loading}
                          placeholder={tm('websiteUrlPlaceholder')}
                          value={hints.websiteUrl}
                          onChange={(e) => setHintField('websiteUrl', e.target.value)}
                        />
                      </Field>
                    </FieldGroup>

                    <Collapsible defaultOpen className="mt-4 flex flex-col gap-3">
                      <CollapsibleTrigger asChild>
                        <Button
                          type="button"
                          variant="ghost"
                          className="flex w-full touch-manipulation justify-between px-0"
                        >
                          <span>{t('collapsible.bookAndOrder')}</span>
                          <ChevronDown className="size-4 shrink-0 transition-transform [[data-state=open]_&]:rotate-180" />
                        </Button>
                      </CollapsibleTrigger>
                      <CollapsibleContent className="flex flex-col gap-4">
                        <FieldGroup className="gap-4 sm:grid sm:grid-cols-2">
                          <Field>
                            <FieldLabel htmlFor="reservation-url">
                              {tm('reservationUrlLabel')}
                            </FieldLabel>
                            <Input
                              id="reservation-url"
                              type="url"
                              inputMode="url"
                              autoComplete="off"
                              maxLength={BRIEF_TEXT_MAX_LENGTHS.reservationUrl}
                              disabled={loading}
                              placeholder={tm('reservationUrlPlaceholder')}
                              value={hints.reservationUrl}
                              onChange={(e) => setHintField('reservationUrl', e.target.value)}
                            />
                          </Field>
                          <Field>
                            <FieldLabel htmlFor="online-order-url">
                              {tm('onlineOrderUrlLabel')}
                            </FieldLabel>
                            <Input
                              id="online-order-url"
                              type="url"
                              inputMode="url"
                              autoComplete="off"
                              maxLength={BRIEF_TEXT_MAX_LENGTHS.onlineOrderUrl}
                              disabled={loading}
                              placeholder={tm('onlineOrderUrlPlaceholder')}
                              value={hints.onlineOrderUrl}
                              onChange={(e) => setHintField('onlineOrderUrl', e.target.value)}
                            />
                          </Field>
                          <Field className="sm:col-span-2">
                            <FieldLabel htmlFor="menu-url">{tm('menuUrlLabel')}</FieldLabel>
                            <Input
                              id="menu-url"
                              type="url"
                              inputMode="url"
                              autoComplete="off"
                              maxLength={BRIEF_TEXT_MAX_LENGTHS.menuUrl}
                              disabled={loading}
                              placeholder={tm('menuUrlPlaceholder')}
                              value={hints.menuUrl}
                              onChange={(e) => setHintField('menuUrl', e.target.value)}
                            />
                          </Field>
                        </FieldGroup>
                      </CollapsibleContent>
                    </Collapsible>

                    <Collapsible className="flex flex-col gap-3">
                      <CollapsibleTrigger asChild>
                        <Button
                          type="button"
                          variant="ghost"
                          className="flex w-full touch-manipulation justify-between px-0"
                        >
                          <span>{t('collapsible.maps')}</span>
                          <ChevronDown className="size-4 shrink-0 transition-transform [[data-state=open]_&]:rotate-180" />
                        </Button>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <Field>
                          <FieldLabel htmlFor="google-maps-url">
                            {tm('googleMapsUrlLabel')}
                          </FieldLabel>
                          <Input
                            id="google-maps-url"
                            type="url"
                            inputMode="url"
                            autoComplete="off"
                            maxLength={BRIEF_TEXT_MAX_LENGTHS.googleMapsUrl}
                            disabled={loading}
                            placeholder={tm('googleMapsUrlPlaceholder')}
                            value={hints.googleMapsUrl}
                            onChange={(e) => setHintField('googleMapsUrl', e.target.value)}
                          />
                        </Field>
                      </CollapsibleContent>
                    </Collapsible>
                  </FieldSet>

                  {briefHintsHasAnySelection(hints) ? (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={loading}
                      onClick={() => {
                        markDirty()
                        setHints(defaultBriefHintsState())
                      }}
                    >
                      {tm('resetHints')}
                    </Button>
                  ) : null}
                </TabsContent>
              ) : null}
            </Tabs>

            {error ? (
              <Alert variant="destructive" className="mt-4" role="alert" aria-live="assertive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            ) : null}
          </CardContent>
        </Card>

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
          form={FORM_ID}
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
