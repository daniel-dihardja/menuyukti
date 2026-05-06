'use client'

import { useMemo, useState, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronDown } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { Button } from '@workspace/ui/components/button'
import { Card, CardContent, CardHeader, CardTitle } from '@workspace/ui/components/card'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@workspace/ui/components/collapsible'
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
import { cn } from '@workspace/ui/lib/utils'

import {
  AMBIENCE_TAG_IDS,
  BRIEF_TEXT_MAX_LENGTHS,
  CUISINE_TYPE_IDS,
  DIETARY_OPTION_IDS,
  GUEST_TAG_IDS,
  LOCATION_FOCUS_IDS,
  POST_LANGUAGE_IDS,
  PRICE_TIER_IDS,
  SERVICE_MODE_IDS,
  SOCIAL_GOAL_IDS,
  TONE_PRESET_IDS,
  VENUE_CONCEPT_IDS,
  briefHintsFromQuickProfile,
  briefHintsHasAnySelection,
  buildQuickProfilePayload,
  defaultBriefHintsState,
  toggleIdInList,
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

/** Section divider used inside the Brief Hints collapsible to keep the long form scannable. */
function BriefSection({
  title,
  description,
  children,
}: {
  title: string
  description?: string
  children: ReactNode
}) {
  return (
    <section className="space-y-3 border-t border-border/40 pt-4 first:border-t-0 first:pt-0">
      <div className="space-y-0.5">
        <h4 className="text-sm font-semibold leading-none">{title}</h4>
        {description ? <p className="text-xs text-muted-foreground">{description}</p> : null}
      </div>
      <div className="space-y-4">{children}</div>
    </section>
  )
}

/** Multi-select chip group bound to a `string[]` field on `BriefHintsState`. */
function ChipGroup({
  label,
  description,
  ids,
  selected,
  disabled,
  onToggle,
  translateOption,
}: {
  label: string
  description?: string
  ids: readonly string[]
  selected: string[]
  disabled?: boolean
  onToggle: (id: string) => void
  translateOption: (id: string) => string
}) {
  return (
    <div className="space-y-2">
      <div className="space-y-0.5">
        <p className="text-sm font-medium">{label}</p>
        {description ? <p className="text-xs text-muted-foreground">{description}</p> : null}
      </div>
      <div className="flex flex-wrap gap-2">
        {ids.map((id) => (
          <Button
            key={id}
            type="button"
            size="sm"
            variant={selected.includes(id) ? 'default' : 'outline'}
            disabled={disabled}
            onClick={() => onToggle(id)}
          >
            {translateOption(id)}
          </Button>
        ))}
      </div>
    </div>
  )
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
  const [briefOpen, setBriefOpen] = useState(() =>
    briefHintsHasAnySelection(briefHintsFromQuickProfile(initialManualQuickProfile ?? null)),
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

  function toggleHintList(
    key: keyof Pick<
      BriefHintsState,
      | 'venueConcepts'
      | 'socialGoals'
      | 'guestTags'
      | 'locationFocus'
      | 'tonePresets'
      | 'cuisineTypes'
      | 'serviceModes'
      | 'ambienceTags'
      | 'postLanguages'
      | 'dietaryOptions'
    >,
    id: string,
  ) {
    setHints((h) => ({ ...h, [key]: toggleIdInList(h[key], id) }))
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
                <SelectTrigger id="country" name="country">
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
                <SelectTrigger id="currency" name="currency">
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
            <Collapsible open={briefOpen} onOpenChange={setBriefOpen}>
              <div className="rounded-lg border border-border/80 bg-muted/10">
                <CollapsibleTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    className="flex h-auto w-full items-center justify-between gap-2 rounded-none px-4 py-3 text-left font-medium hover:bg-muted/40"
                    disabled={loading}
                  >
                    <span>{tm('trigger')}</span>
                    <ChevronDown
                      className={cn(
                        'size-4 shrink-0 text-muted-foreground transition-transform',
                        briefOpen ? 'rotate-180' : '',
                      )}
                      aria-hidden
                    />
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="space-y-6 border-t border-border/60 px-4 pb-4 pt-3">
                    <p className="text-sm text-muted-foreground">{tm('intro')}</p>

                    <BriefSection
                      title={tm('sections.positioning.title')}
                      description={tm('sections.positioning.description')}
                    >
                      <ChipGroup
                        label={tm('cuisineLabel')}
                        ids={CUISINE_TYPE_IDS}
                        selected={hints.cuisineTypes}
                        disabled={loading}
                        onToggle={(id) => toggleHintList('cuisineTypes', id)}
                        translateOption={(id) => tm(`cuisines.${id}`)}
                      />

                      <div className="space-y-2">
                        <Label htmlFor="price-tier" className="text-sm font-medium">
                          {tm('priceTierLabel')}
                        </Label>
                        <Select
                          value={hints.priceTier || EMPTY_SELECT_VALUE}
                          onValueChange={(value) =>
                            setHintField('priceTier', value === EMPTY_SELECT_VALUE ? '' : value)
                          }
                          disabled={loading}
                        >
                          <SelectTrigger id="price-tier" className="sm:w-72">
                            <SelectValue placeholder={tm('priceTierPlaceholder')} />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value={EMPTY_SELECT_VALUE}>{t('noneOption')}</SelectItem>
                            {PRICE_TIER_IDS.map((id) => (
                              <SelectItem key={id} value={id}>
                                {tm(`priceTiers.${id}`)}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <ChipGroup
                        label={tm('serviceModesLabel')}
                        ids={SERVICE_MODE_IDS}
                        selected={hints.serviceModes}
                        disabled={loading}
                        onToggle={(id) => toggleHintList('serviceModes', id)}
                        translateOption={(id) => tm(`serviceModes.${id}`)}
                      />

                      <ChipGroup
                        label={tm('ambienceLabel')}
                        ids={AMBIENCE_TAG_IDS}
                        selected={hints.ambienceTags}
                        disabled={loading}
                        onToggle={(id) => toggleHintList('ambienceTags', id)}
                        translateOption={(id) => tm(`ambience.${id}`)}
                      />

                      <div className="flex items-center justify-between gap-3 rounded-md border border-border/60 bg-background/80 px-3 py-2">
                        <Label
                          htmlFor="serves-alcohol"
                          className="cursor-pointer text-sm font-normal"
                        >
                          {tm('servesAlcoholLabel')}
                        </Label>
                        <Switch
                          id="serves-alcohol"
                          checked={hints.servesAlcohol}
                          disabled={loading}
                          onCheckedChange={(checked) =>
                            setHintField('servesAlcohol', Boolean(checked))
                          }
                        />
                      </div>

                      <ChipGroup
                        label={tm('dietaryLabel')}
                        description={tm('dietaryDescription')}
                        ids={DIETARY_OPTION_IDS}
                        selected={hints.dietaryOptions}
                        disabled={loading}
                        onToggle={(id) => toggleHintList('dietaryOptions', id)}
                        translateOption={(id) => tm(`dietary.${id}`)}
                      />
                    </BriefSection>

                    <BriefSection
                      title={tm('sections.audience.title')}
                      description={tm('sections.audience.description')}
                    >
                      <ChipGroup
                        label={tm('venueLabel')}
                        ids={VENUE_CONCEPT_IDS}
                        selected={hints.venueConcepts}
                        disabled={loading}
                        onToggle={(id) => toggleHintList('venueConcepts', id)}
                        translateOption={(id) => tm(`venues.${id}`)}
                      />

                      <ChipGroup
                        label={tm('guestLabel')}
                        ids={GUEST_TAG_IDS}
                        selected={hints.guestTags}
                        disabled={loading}
                        onToggle={(id) => toggleHintList('guestTags', id)}
                        translateOption={(id) => tm(`guests.${id}`)}
                      />

                      <ChipGroup
                        label={tm('focusLabel')}
                        ids={LOCATION_FOCUS_IDS}
                        selected={hints.locationFocus}
                        disabled={loading}
                        onToggle={(id) => toggleHintList('locationFocus', id)}
                        translateOption={(id) => tm(`focus.${id}`)}
                      />

                      <ChipGroup
                        label={tm('postLanguagesLabel')}
                        description={tm('postLanguagesDescription')}
                        ids={POST_LANGUAGE_IDS}
                        selected={hints.postLanguages}
                        disabled={loading}
                        onToggle={(id) => toggleHintList('postLanguages', id)}
                        translateOption={(id) => tm(`postLanguages.${id}`)}
                      />
                    </BriefSection>

                    <BriefSection
                      title={tm('sections.voice.title')}
                      description={tm('sections.voice.description')}
                    >
                      <ChipGroup
                        label={tm('toneLabel')}
                        ids={TONE_PRESET_IDS}
                        selected={hints.tonePresets}
                        disabled={loading}
                        onToggle={(id) => toggleHintList('tonePresets', id)}
                        translateOption={(id) => tm(`tones.${id}`)}
                      />

                      <ChipGroup
                        label={tm('goalLabel')}
                        description={tm('goalDescription')}
                        ids={SOCIAL_GOAL_IDS}
                        selected={hints.socialGoals}
                        disabled={loading}
                        onToggle={(id) => toggleHintList('socialGoals', id)}
                        translateOption={(id) => tm(`goals.${id}`)}
                      />

                      <div className="flex items-center justify-between gap-3 rounded-md border border-border/60 bg-background/80 px-3 py-2">
                        <Label
                          htmlFor="video-comfort"
                          className="cursor-pointer text-sm font-normal"
                        >
                          {tm('videoLabel')}
                        </Label>
                        <Switch
                          id="video-comfort"
                          checked={hints.videoComfort}
                          disabled={loading}
                          onCheckedChange={(checked) =>
                            setHintField('videoComfort', Boolean(checked))
                          }
                        />
                      </div>
                    </BriefSection>

                    <BriefSection
                      title={tm('sections.brand.title')}
                      description={tm('sections.brand.description')}
                    >
                      <div className="space-y-2">
                        <Label htmlFor="value-proposition" className="text-sm font-medium">
                          {tm('valuePropositionLabel')}
                        </Label>
                        <Input
                          id="value-proposition"
                          maxLength={BRIEF_TEXT_MAX_LENGTHS.valueProposition}
                          disabled={loading}
                          placeholder={tm('valuePropositionPlaceholder')}
                          value={hints.valueProposition}
                          onChange={(e) => setHintField('valueProposition', e.target.value)}
                        />
                        <p className="text-xs text-muted-foreground">
                          {tm('valuePropositionDescription')}
                        </p>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="about-story" className="text-sm font-medium">
                          {tm('aboutStoryLabel')}
                        </Label>
                        <Textarea
                          id="about-story"
                          rows={3}
                          maxLength={BRIEF_TEXT_MAX_LENGTHS.aboutStory}
                          disabled={loading}
                          placeholder={tm('aboutStoryPlaceholder')}
                          value={hints.aboutStory}
                          onChange={(e) => setHintField('aboutStory', e.target.value)}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="topics-to-avoid" className="text-sm font-medium">
                          {tm('topicsToAvoidLabel')}
                        </Label>
                        <Textarea
                          id="topics-to-avoid"
                          rows={2}
                          maxLength={BRIEF_TEXT_MAX_LENGTHS.topicsToAvoid}
                          disabled={loading}
                          placeholder={tm('topicsToAvoidPlaceholder')}
                          value={hints.topicsToAvoid}
                          onChange={(e) => setHintField('topicsToAvoid', e.target.value)}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="brief-notes" className="text-sm font-medium">
                          {tm('notesLabel')}
                        </Label>
                        <Textarea
                          id="brief-notes"
                          rows={2}
                          maxLength={BRIEF_TEXT_MAX_LENGTHS.notes}
                          disabled={loading}
                          placeholder={tm('notesPlaceholder')}
                          value={hints.notes}
                          onChange={(e) => setHintField('notes', e.target.value)}
                        />
                      </div>
                    </BriefSection>

                    <BriefSection
                      title={tm('sections.profile.title')}
                      description={tm('sections.profile.description')}
                    >
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
                    </BriefSection>

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
                  </div>
                </CollapsibleContent>
              </div>
            </Collapsible>
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
