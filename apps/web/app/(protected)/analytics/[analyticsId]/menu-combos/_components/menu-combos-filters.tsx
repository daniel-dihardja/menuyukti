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
import { ToggleGroup, ToggleGroupItem } from '@workspace/ui/components/toggle-group'
import { cn } from '@workspace/ui/lib/utils'

type MenuCombosFiltersProps = {
  categoryOptions: string[]
  selectedCategory: string
  onCategoryChange: (value: string) => void
  minLift: MinLiftFilter
  onMinLiftChange: (value: MinLiftFilter) => void
  visibleCount: number
  stickyOnMobile?: boolean
}

export function MenuCombosFilters({
  categoryOptions,
  selectedCategory,
  onCategoryChange,
  minLift,
  onMinLiftChange,
  visibleCount,
  stickyOnMobile = false,
}: MenuCombosFiltersProps) {
  const t = useTranslations('analytics.menuCombos')

  return (
    <div
      className={cn(
        'flex flex-col gap-4 md:flex-row md:flex-wrap md:items-end',
        stickyOnMobile &&
          'sticky top-0 z-10 -mx-4 border-b border-card-border bg-card/95 px-4 py-3 backdrop-blur md:static md:mx-0 md:border-0 md:bg-transparent md:px-0 md:py-0 md:backdrop-blur-none',
      )}
    >
      <Field className="w-full gap-2 md:max-w-xs md:flex-1">
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

      <Field className="w-full gap-2 md:max-w-md md:flex-1">
        <FieldLabel>{t('filters.minLiftLabel')}</FieldLabel>
        <ToggleGroup
          type="single"
          className="w-full"
          value={minLift}
          onValueChange={(value) => {
            if (value === 'all' || value === 'above1' || value === 'above1_5') {
              onMinLiftChange(value)
            }
          }}
          aria-label={t('filters.minLiftAriaLabel')}
        >
          <ToggleGroupItem value="all" className="flex-1">
            {t('filters.minLiftAll')}
          </ToggleGroupItem>
          <ToggleGroupItem value="above1" className="flex-1">
            {t('filters.minLiftAbove1')}
          </ToggleGroupItem>
          <ToggleGroupItem value="above1_5" className="flex-1">
            {t('filters.minLiftAbove1_5')}
          </ToggleGroupItem>
        </ToggleGroup>
      </Field>

      <Badge variant="secondary" className="w-fit font-normal md:mb-0.5">
        {t('filters.showingCount', { count: visibleCount })}
      </Badge>
    </div>
  )
}
