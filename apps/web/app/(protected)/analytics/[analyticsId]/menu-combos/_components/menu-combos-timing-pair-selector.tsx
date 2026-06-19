'use client'

import { useTranslations } from 'next-intl'

import { Field, FieldLabel } from '@workspace/ui/components/field'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@workspace/ui/components/select'

export type TimingPairSelectOption = {
  value: string
  label: string
}

type MenuCombosTimingPairSelectorProps = {
  options: TimingPairSelectOption[]
  selectedValue: string
  onSelectedValueChange: (value: string) => void
}

export function MenuCombosTimingPairSelector({
  options,
  selectedValue,
  onSelectedValueChange,
}: MenuCombosTimingPairSelectorProps) {
  const t = useTranslations('analytics.menuCombos')
  const selectedOption = options.find((option) => option.value === selectedValue)

  return (
    <Field>
      <FieldLabel
        htmlFor="menu-combos-timing-pair"
        className="text-xs font-medium tracking-wide text-muted-foreground uppercase"
      >
        {t('timing.pairSelectorLabel')}
      </FieldLabel>

      <Select value={selectedValue} onValueChange={onSelectedValueChange}>
        <SelectTrigger
          id="menu-combos-timing-pair"
          aria-label={t('timing.pairSelectorAriaLabel')}
          className="mt-2 h-auto min-h-10 w-full py-2.5"
        >
          <SelectValue placeholder={t('timing.pairSelectorPlaceholder')}>
            {selectedOption?.label ?? null}
          </SelectValue>
        </SelectTrigger>
        <SelectContent className="max-w-[min(100vw-2rem,24rem)]">
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </Field>
  )
}
