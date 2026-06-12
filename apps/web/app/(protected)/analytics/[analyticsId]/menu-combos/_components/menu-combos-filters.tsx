'use client'

import { useTranslations } from 'next-intl'

import { CATEGORY_ORDER, type MatrixCategory } from '@/lib/analytics/matrix-page-adapter'
import { MATRIX_CATEGORY_BADGE_CLASS } from '@/lib/analytics/matrix-category-styles'
import type { MinLiftFilter } from '@/lib/analytics/menu-combos-page-adapter'
import { Badge } from '@workspace/ui/components/badge'
import { Checkbox } from '@workspace/ui/components/checkbox'
import {
  Field,
  FieldDescription,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from '@workspace/ui/components/field'
import { Label } from '@workspace/ui/components/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@workspace/ui/components/select'
import { cn } from '@workspace/ui/lib/utils'

type MenuCombosFiltersProps = {
  categoryOptions: string[]
  selectedCategory: string
  onCategoryChange: (value: string) => void
  selectedQuadrants: Set<MatrixCategory>
  onQuadrantToggle: (category: MatrixCategory, checked: boolean) => void
  minLift: MinLiftFilter
  onMinLiftChange: (value: MinLiftFilter) => void
  visibleCount: number
}

export function MenuCombosFilters({
  categoryOptions,
  selectedCategory,
  onCategoryChange,
  selectedQuadrants,
  onQuadrantToggle,
  minLift,
  onMinLiftChange,
  visibleCount,
}: MenuCombosFiltersProps) {
  const t = useTranslations('analytics.menuCombos')
  const tCategories = useTranslations('analytics.matrix.categories')
  const tMatrix = useTranslations('analytics.matrix.filters')

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end gap-4">
        <Field className="max-w-xs flex-1 gap-2">
          <FieldLabel htmlFor="menu-combos-category-filter">
            {t('filters.categoryLabel')}
          </FieldLabel>
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
          <Select
            value={minLift}
            onValueChange={(value) => onMinLiftChange(value as MinLiftFilter)}
          >
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

      <FieldSet className="gap-3">
        <FieldLegend variant="label">{t('filters.quadrantLabel')}</FieldLegend>
        <FieldDescription>{t('filters.quadrantHelp')}</FieldDescription>
        <div className="flex flex-wrap gap-3">
          {CATEGORY_ORDER.map((category) => {
            const id = `menu-combos-quadrant-${category}`
            const checked = selectedQuadrants.has(category)
            const badgeClass = MATRIX_CATEGORY_BADGE_CLASS[category]
            return (
              <div key={category} className="flex items-center gap-2">
                <Checkbox
                  id={id}
                  checked={checked}
                  onCheckedChange={(next) => onQuadrantToggle(category, next === true)}
                  aria-label={tMatrix('matrixAriaLabel')}
                />
                <Label htmlFor={id} className="cursor-pointer font-normal">
                  <Badge variant="outline" className={cn('font-normal', badgeClass)}>
                    {tCategories(category)}
                  </Badge>
                </Label>
              </div>
            )
          })}
        </div>
      </FieldSet>
    </div>
  )
}
