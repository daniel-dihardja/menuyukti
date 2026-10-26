'use client'

import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { useTranslations } from 'next-intl'

import {
  COUNTRY_OPTIONS,
  SUPPORTED_CURRENCIES,
  countryIdToCurrency,
} from '@/lib/locations/country-config'
import { routes } from '@/lib/routes'
import { Button } from '@workspace/ui/components/button'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@workspace/ui/components/collapsible'
import { Field, FieldDescription, FieldGroup, FieldLabel } from '@workspace/ui/components/field'
import { Input } from '@workspace/ui/components/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@workspace/ui/components/select'
import { TabsContent } from '@workspace/ui/components/tabs'

import { useLocationFormActions, useLocationFormState } from './location-form-context'

const EMPTY_SELECT_VALUE = '__none__'

function MenuLinkPreview({ publicSlug }: { publicSlug: string }) {
  const t = useTranslations('analytics.branches.form')
  const slug = publicSlug.trim()
  if (!slug) {
    return (
      <p className="text-sm text-muted-foreground" aria-live="polite">
        {t('menuLinkPreviewEmpty')}
      </p>
    )
  }
  const path = routes.public.locationMenu(slug)
  return (
    <p
      className="break-all rounded-md border border-border/60 bg-muted/30 px-3 py-2.5 text-sm"
      aria-label={t('menuLinkPreviewAria')}
      aria-live="polite"
    >
      <span className="text-muted-foreground">…</span>
      <span className="font-medium text-foreground">{path}</span>
    </p>
  )
}

function LocationBasicsFields() {
  const t = useTranslations('analytics.branches.form')
  const {
    mode,
    loading,
    name,
    street,
    city,
    countryId,
    currency,
    publicSlug,
    showCurrencyAutoHint,
  } = useLocationFormState()
  const { setName, setStreet, setCity, setCountryId, setCurrency, setPublicSlug } =
    useLocationFormActions()
  const showAddressFields = mode === 'edit'
  const [slugEditorOpen, setSlugEditorOpen] = useState(false)
  const hasAddressDetails = Boolean(
    street.trim() || city.trim() || countryId.trim() || currency.trim(),
  )
  const [detailsOpen, setDetailsOpen] = useState(hasAddressDetails)

  return (
    <FieldGroup className="gap-4 sm:grid sm:grid-cols-2">
      <Field className="sm:col-span-2">
        <FieldLabel htmlFor="name">{t('nameLabel')}</FieldLabel>
        <Input
          id="name"
          name="name"
          autoComplete="organization"
          autoFocus={mode === 'create'}
          placeholder={t('namePlaceholder')}
          required
          disabled={loading}
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="h-11 text-base md:h-9"
        />
      </Field>

      <Field className="sm:col-span-2 gap-2">
        <div className="flex items-center justify-between gap-2">
          <FieldLabel htmlFor="public-slug">{t('publicSlugLabel')}</FieldLabel>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-9 touch-manipulation shrink-0 px-2"
            disabled={loading}
            onClick={() => setSlugEditorOpen((open) => !open)}
            aria-expanded={slugEditorOpen}
          >
            {slugEditorOpen ? t('hideEditLink') : t('editLink')}
          </Button>
        </div>
        <MenuLinkPreview publicSlug={publicSlug} />
        {slugEditorOpen ? (
          <>
            <Input
              id="public-slug"
              name="publicSlug"
              value={publicSlug}
              onChange={(e) => setPublicSlug(e.target.value)}
              placeholder={t('publicSlugPlaceholder')}
              maxLength={128}
              disabled={loading}
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              className="h-11 text-base md:h-9"
            />
            <FieldDescription>{t('publicSlugHint')}</FieldDescription>
          </>
        ) : (
          <input type="hidden" name="publicSlug" value={publicSlug} />
        )}
      </Field>

      {showAddressFields ? (
        <Collapsible
          open={detailsOpen}
          onOpenChange={setDetailsOpen}
          className="sm:col-span-2 flex flex-col gap-3"
        >
          <CollapsibleTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              className="flex h-11 w-full touch-manipulation justify-between px-0"
            >
              <span className="text-sm font-medium">{t('locationDetails')}</span>
              <ChevronDown className="size-4 shrink-0 transition-transform [[data-state=open]_&]:rotate-180" />
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="flex flex-col gap-4">
            <FieldDescription>{t('locationDetailsDescription')}</FieldDescription>
            <FieldGroup className="gap-4 sm:grid sm:grid-cols-2">
              <Field className="sm:col-span-2">
                <FieldLabel htmlFor="street">{t('streetLabel')}</FieldLabel>
                <Input
                  id="street"
                  name="street"
                  autoComplete="street-address"
                  placeholder={t('streetPlaceholder')}
                  disabled={loading}
                  value={street}
                  onChange={(e) => setStreet(e.target.value)}
                  className="h-11 text-base md:h-9"
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
                  onChange={(e) => setCity(e.target.value)}
                  className="h-11 text-base md:h-9"
                />
              </Field>

              <Field>
                <FieldLabel htmlFor="country">{t('countryLabel')}</FieldLabel>
                <Select
                  value={countryId || EMPTY_SELECT_VALUE}
                  onValueChange={(value) => {
                    setCountryId(value === EMPTY_SELECT_VALUE ? '' : value)
                  }}
                  disabled={loading}
                >
                  <SelectTrigger
                    id="country"
                    name="country"
                    className="h-11 w-full text-base md:h-9 md:text-sm"
                  >
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
                    const nextCurrency = value === EMPTY_SELECT_VALUE ? '' : value
                    const defaultCurrency = countryId ? (countryIdToCurrency[countryId] ?? '') : ''
                    setCurrency(
                      nextCurrency,
                      Boolean(nextCurrency) && nextCurrency !== defaultCurrency,
                    )
                  }}
                  disabled={loading}
                >
                  <SelectTrigger
                    id="currency"
                    name="currency"
                    className="h-11 w-full text-base md:h-9 md:text-sm"
                  >
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
          </CollapsibleContent>
        </Collapsible>
      ) : null}
    </FieldGroup>
  )
}

export function LocationBasicsSection() {
  const { mode } = useLocationFormState()

  if (mode === 'create') {
    return <LocationBasicsFields />
  }

  return (
    <TabsContent value="basics" className="flex flex-col gap-4">
      <LocationBasicsFields />
    </TabsContent>
  )
}
