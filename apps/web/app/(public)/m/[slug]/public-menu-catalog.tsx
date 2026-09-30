'use client'

import { useMemo, useState } from 'react'
import { useTranslations } from 'next-intl'

import { formatCurrency, getCurrencyLocale } from '@/lib/currency'
import {
  collectPresentMenuAttributes,
  itemMatchesMenuAttributeFilters,
  type MenuAllergen,
  type MenuDietaryTag,
} from '@/lib/menu/menu-attributes'
import type { PublicMenuCategoryView } from '@/lib/public-menu/load-public-menu'
import { Badge } from '@workspace/ui/components/badge'
import { Button } from '@workspace/ui/components/button'
import { cn } from '@workspace/ui/lib/utils'

type Props = {
  categories: PublicMenuCategoryView[]
  currencyCode: string
}

function toggleSetValue(prev: Set<string>, value: string): Set<string> {
  const next = new Set(prev)
  if (next.has(value)) next.delete(value)
  else next.add(value)
  return next
}

function FilterChipRow({
  label,
  options,
  selected,
  onToggle,
  labelFor,
}: {
  label: string
  options: readonly string[]
  selected: ReadonlySet<string>
  onToggle: (value: string) => void
  labelFor: (value: string) => string
}) {
  if (options.length === 0) return null
  return (
    <div className="flex flex-col gap-2">
      <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">{label}</p>
      <div className="flex flex-wrap gap-2" role="group" aria-label={label}>
        {options.map((option) => {
          const active = selected.has(option)
          return (
            <Button
              key={option}
              type="button"
              size="sm"
              variant={active ? 'default' : 'outline'}
              aria-pressed={active}
              onClick={() => onToggle(option)}
              className="h-8 rounded-full px-3 text-xs font-medium"
            >
              {labelFor(option)}
            </Button>
          )
        })}
      </div>
    </div>
  )
}

export function PublicMenuCatalog({ categories, currencyCode }: Props) {
  const t = useTranslations('public.menu')
  const locale = getCurrencyLocale(currencyCode)
  const [dietaryInclude, setDietaryInclude] = useState<Set<string>>(() => new Set())
  const [allergenExclude, setAllergenExclude] = useState<Set<string>>(() => new Set())

  const allItems = useMemo(() => categories.flatMap((category) => category.items), [categories])
  const present = useMemo(() => collectPresentMenuAttributes(allItems), [allItems])

  const filteredCategories = useMemo(() => {
    return categories
      .map((category) => ({
        ...category,
        items: category.items.filter((item) =>
          itemMatchesMenuAttributeFilters(item, dietaryInclude, allergenExclude),
        ),
      }))
      .filter((category) => category.items.length > 0)
  }, [allergenExclude, categories, dietaryInclude])

  const matchCount = filteredCategories.reduce((sum, category) => sum + category.items.length, 0)
  const filtersActive = dietaryInclude.size > 0 || allergenExclude.size > 0
  const showFilters = present.dietaryTags.length > 0 || present.allergens.length > 0

  return (
    <div className="flex flex-col gap-8">
      {showFilters ? (
        <div className="bg-card/90 sticky top-0 z-20 -mx-6 space-y-4 border-b px-6 py-4 backdrop-blur-sm sm:-mx-10 sm:px-10">
          <FilterChipRow
            label={t('filters.dietary')}
            options={present.dietaryTags}
            selected={dietaryInclude}
            onToggle={(value) => setDietaryInclude((prev) => toggleSetValue(prev, value))}
            labelFor={(value) => t(`dietary.${value as MenuDietaryTag}`)}
          />
          <FilterChipRow
            label={t('filters.allergens')}
            options={present.allergens}
            selected={allergenExclude}
            onToggle={(value) => setAllergenExclude((prev) => toggleSetValue(prev, value))}
            labelFor={(value) => t(`allergens.${value as MenuAllergen}`)}
          />
          {filtersActive ? (
            <div className="flex flex-wrap items-center gap-3">
              <p className="text-muted-foreground text-sm">
                {matchCount === 0
                  ? t('filters.noMatches')
                  : t('filters.matchCount', { count: matchCount })}
              </p>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => {
                  setDietaryInclude(new Set())
                  setAllergenExclude(new Set())
                }}
              >
                {t('filters.clear')}
              </Button>
            </div>
          ) : null}
        </div>
      ) : null}

      {filtersActive && matchCount === 0 ? (
        <p className="text-muted-foreground py-8 text-center text-sm">{t('filters.noMatches')}</p>
      ) : (
        <div className="flex flex-col gap-12">
          {filteredCategories.map((category) => (
            <section
              key={category.name}
              aria-labelledby={`cat-${category.sortOrder}-${category.name}`}
            >
              <h2
                id={`cat-${category.sortOrder}-${category.name}`}
                className="mb-4 text-sm font-semibold tracking-wide uppercase"
              >
                {category.name}
              </h2>
              <ul className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {category.items.map((item) => {
                  const description = item.description.trim()
                  return (
                    <li
                      key={`${category.name}-${item.sortOrder}-${item.name}`}
                      className="bg-card text-card-foreground overflow-hidden rounded-xl border"
                    >
                      {item.imageUrl ? (
                        <div className="bg-muted aspect-[4/3] overflow-hidden">
                          {/* eslint-disable-next-line @next/next/no-img-element -- presigned S3 URLs */}
                          <img
                            src={item.imageUrl}
                            alt={item.name}
                            className="size-full object-cover"
                            loading="lazy"
                            decoding="async"
                          />
                        </div>
                      ) : null}
                      <div className="flex flex-col gap-1.5 p-4">
                        <div className="flex items-baseline justify-between gap-3">
                          <h3 className="text-base font-medium tracking-tight">{item.name}</h3>
                          <span className="text-muted-foreground shrink-0 text-sm tabular-nums">
                            {formatCurrency(item.price, currencyCode, locale)}
                          </span>
                        </div>
                        {description ? (
                          <p className="text-muted-foreground line-clamp-3 text-sm text-pretty">
                            {description}
                          </p>
                        ) : null}
                        {item.dietaryTags.length > 0 || item.allergens.length > 0 ? (
                          <div className="mt-1 flex flex-wrap gap-1.5">
                            {item.dietaryTags.map((tag) => (
                              <Badge
                                key={`diet-${tag}`}
                                variant="secondary"
                                className={cn('rounded-full px-2 py-0 text-[11px] font-medium')}
                              >
                                {t(`dietary.${tag as MenuDietaryTag}`)}
                              </Badge>
                            ))}
                            {item.allergens.map((allergen) => (
                              <Badge
                                key={`all-${allergen}`}
                                variant="outline"
                                className="rounded-full px-2 py-0 text-[11px] font-medium"
                              >
                                {t(`allergens.${allergen as MenuAllergen}`)}
                              </Badge>
                            ))}
                          </div>
                        ) : null}
                      </div>
                    </li>
                  )
                })}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  )
}
