'use client'

import { useTranslations } from 'next-intl'

import { INVENTORY_STORAGE_ZONES, type InventoryStorageZone } from '@/lib/inventar/storage-zones'
import { Field, FieldGroup, FieldLabel } from '@workspace/ui/components/field'
import { Input } from '@workspace/ui/components/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@workspace/ui/components/select'

import type { CatalogForm } from './catalog-form'

type Props = {
  value: CatalogForm
  onChange: (patch: Partial<CatalogForm>) => void
  idPrefix: string
  disabled?: boolean
}

export function CatalogFormFields({ value, onChange, idPrefix, disabled }: Props) {
  const t = useTranslations('inventar')

  return (
    <FieldGroup>
      <Field>
        <FieldLabel htmlFor={`${idPrefix}-name`}>{t('name')}</FieldLabel>
        <Input
          id={`${idPrefix}-name`}
          value={value.name}
          disabled={disabled}
          onChange={(e) => onChange({ name: e.target.value })}
        />
      </Field>
      <Field>
        <FieldLabel htmlFor={`${idPrefix}-zone`}>{t('storageZone')}</FieldLabel>
        <Select
          value={value.storageZone}
          disabled={disabled}
          onValueChange={(zone) => onChange({ storageZone: zone as InventoryStorageZone })}
        >
          <SelectTrigger id={`${idPrefix}-zone`}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {INVENTORY_STORAGE_ZONES.map((zone) => (
              <SelectItem key={zone} value={zone}>
                {t(`storageZones.${zone}`)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field>
          <FieldLabel htmlFor={`${idPrefix}-size`}>{t('packageSize')}</FieldLabel>
          <Input
            id={`${idPrefix}-size`}
            inputMode="decimal"
            value={value.packageSize}
            disabled={disabled}
            onChange={(e) => onChange({ packageSize: e.target.value })}
          />
        </Field>
        <Field>
          <FieldLabel htmlFor={`${idPrefix}-unit`}>{t('packageUnit')}</FieldLabel>
          <Input
            id={`${idPrefix}-unit`}
            value={value.packageUnit}
            disabled={disabled}
            onChange={(e) => onChange({ packageUnit: e.target.value })}
          />
        </Field>
      </div>
      <Field>
        <FieldLabel htmlFor={`${idPrefix}-price`}>{t('price')}</FieldLabel>
        <Input
          id={`${idPrefix}-price`}
          inputMode="decimal"
          value={value.price}
          disabled={disabled}
          onChange={(e) => onChange({ price: e.target.value })}
        />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field>
          <FieldLabel htmlFor={`${idPrefix}-min`}>{t('minOnHand')}</FieldLabel>
          <Input
            id={`${idPrefix}-min`}
            inputMode="decimal"
            value={value.minOnHand}
            disabled={disabled}
            placeholder={t('onHandLimitOptional')}
            onChange={(e) => onChange({ minOnHand: e.target.value })}
          />
        </Field>
        <Field>
          <FieldLabel htmlFor={`${idPrefix}-max`}>{t('maxOnHand')}</FieldLabel>
          <Input
            id={`${idPrefix}-max`}
            inputMode="decimal"
            value={value.maxOnHand}
            disabled={disabled}
            placeholder={t('onHandLimitOptional')}
            onChange={(e) => onChange({ maxOnHand: e.target.value })}
          />
        </Field>
      </div>
    </FieldGroup>
  )
}
