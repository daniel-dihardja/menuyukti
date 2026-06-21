'use client'

import { useTranslations } from 'next-intl'

import {
  COUNTRY_OPTIONS,
  SUPPORTED_CURRENCIES,
  countryIdToCurrency,
} from '@/lib/locations/country-config'
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

const EMPTY_SELECT_VALUE = '__none__'

export type LocationBasicsSectionProps = {
  loading: boolean
  name: string
  street: string
  city: string
  countryId: string
  currency: string
  hasManualCurrencyOverride: boolean
  showCurrencyAutoHint: boolean
  onNameChange: (value: string) => void
  onStreetChange: (value: string) => void
  onCityChange: (value: string) => void
  onCountryChange: (countryId: string) => void
  onCurrencyChange: (currency: string, hasManualOverride: boolean) => void
  onDirty: () => void
}

export function LocationBasicsSection({
  loading,
  name,
  street,
  city,
  countryId,
  currency,
  showCurrencyAutoHint,
  onNameChange,
  onStreetChange,
  onCityChange,
  onCountryChange,
  onCurrencyChange,
  onDirty,
}: LocationBasicsSectionProps) {
  const t = useTranslations('analytics.branches.form')

  return (
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
              onDirty()
              onNameChange(e.target.value)
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
              onDirty()
              onStreetChange(e.target.value)
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
              onDirty()
              onCityChange(e.target.value)
            }}
          />
        </Field>

        <Field>
          <FieldLabel htmlFor="country">{t('countryLabel')}</FieldLabel>
          <Select
            value={countryId || EMPTY_SELECT_VALUE}
            onValueChange={(value) => {
              onDirty()
              onCountryChange(value === EMPTY_SELECT_VALUE ? '' : value)
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
              onDirty()
              const nextCurrency = value === EMPTY_SELECT_VALUE ? '' : value
              const defaultCurrency = countryId ? (countryIdToCurrency[countryId] ?? '') : ''
              onCurrencyChange(
                nextCurrency,
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
  )
}
