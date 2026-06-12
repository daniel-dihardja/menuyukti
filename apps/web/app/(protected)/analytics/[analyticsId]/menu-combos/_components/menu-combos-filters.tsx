'use client'

import { useTranslations } from 'next-intl'

import type { MinLiftFilter } from '@/lib/analytics/menu-combos-page-adapter'
import { Badge } from '@workspace/ui/components/badge'
import { Field, FieldLabel } from '@workspace/ui/components/field'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@workspace/ui/components/select'

type MenuCombosFiltersProps = {
  categoryOptions: string[]
  selectedCategory: string
  onCategoryChange: (value: string) => void
  minLift: MinLiftFilter
  onMinLiftChange: (value: MinLiftFilter) => void
  visibleCount: number
}

export function MenuCombosFilters({
  categoryOptions,
  selectedCategory,
  onCategoryChange,
  minLift,
  onMinLiftChange,
  visibleCount,
}: MenuCombosFiltersProps) {
  const t = useTranslations('analytics.menuCombos')

  return (
    <div className="flex flex-wrap items-end gap-4">
      <Field className="max-w-xs flex-1 gap-2">
        <FieldLabel htmlFor="menu-combos-category-filter">{t('filters.categoryLabel')}</FieldLabel>
        <Select value={selectedCategory} onValueChange={onCategoryChange}>
          <SelectTrigger
            id="menu-combos-category-filter"
            aria-label={t('filters.categoryAriaLabel')}
            className="w-full"
          >
            <SelectValue placeholder={t('filters.categoryPlaceholder')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('filters.allCategories')}</SelectItem>
            {categoryOptions.map((category) => (
              <SelectItem key={category} value={category}>
                {category}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>

      <Field className="max-w-xs flex-1 gap-2">
        <FieldLabel htmlFor="menu-combos-min-lift-filter">{t('filters.minLiftLabel')}</FieldLabel>
        <Select value={minLift} onValueChange={(value) => onMinLiftChange(value as MinLiftFilter)}>
          <SelectTrigger
            id="menu-combos-min-lift-filter"
            aria-label={t('filters.minLiftAriaLabel')}
            className="w-full"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('filters.minLiftAll')}</SelectItem>
            <SelectItem value="above1">{t('filters.minLiftAbove1')}</SelectItem>
            <SelectItem value="above1_5">{t('filters.minLiftAbove1_5')}</SelectItem>
          </SelectContent>
        </Select>
      </Field>

      <Badge variant="secondary" className="mb-0.5 font-normal">
        {t('filters.showingCount', { count: visibleCount })}
      </Badge>
    </div>
  )
}
