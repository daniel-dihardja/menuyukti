'use client'

import { Search } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import * as React from 'react'

import { routes } from '@/lib/routes'
import { Button } from '@workspace/ui/components/button'
import { Input } from '@workspace/ui/components/input'
import { ToggleGroup, ToggleGroupItem } from '@workspace/ui/components/toggle-group'

export type ExploreListingKindFilter = 'commercial' | 'community'

type ExploreFiltersProps = {
  cities: string[]
  city: string | null
  query: string | null
  kind: ExploreListingKindFilter | null
}

const CITY_ALL = '__all__'
const KIND_ALL = '__all__'
const KIND_COMMUNITY = 'community'
const KIND_COMMERCIAL = 'commercial'

function buildExploreHref(
  city: string | null,
  query: string | null,
  kind: ExploreListingKindFilter | null,
): string {
  const params = new URLSearchParams()
  if (city) params.set('city', city)
  if (query) params.set('q', query)
  if (kind === 'community' || kind === 'commercial') params.set('kind', kind)
  const qs = params.toString()
  return qs ? `${routes.explore}?${qs}` : routes.explore
}

export function ExploreFilters({ cities, city, query, kind }: ExploreFiltersProps) {
  const t = useTranslations('explore')
  const router = useRouter()
  const [draftQuery, setDraftQuery] = React.useState(query ?? '')

  React.useEffect(() => {
    setDraftQuery(query ?? '')
  }, [query])

  const cityValue = city ?? CITY_ALL
  const kindValue =
    kind === 'community' ? KIND_COMMUNITY : kind === 'commercial' ? KIND_COMMERCIAL : KIND_ALL

  function navigate(
    nextCity: string | null,
    nextQuery: string | null,
    nextKind: ExploreListingKindFilter | null = kind,
  ) {
    router.push(buildExploreHref(nextCity, nextQuery, nextKind))
  }

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const cleaned = draftQuery.trim()
    navigate(city, cleaned || null, kind)
  }

  const chipClass = 'h-9 min-h-9 shrink-0 touch-manipulation rounded-full px-3 text-xs font-medium'

  return (
    <div className="flex w-full flex-col gap-4">
      <form onSubmit={onSubmit} className="flex w-full flex-col gap-2 sm:flex-row sm:items-center">
        <label htmlFor="explore-search" className="sr-only">
          {t('searchLabel')}
        </label>
        <div className="relative min-w-0 flex-1">
          <Search
            className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <Input
            id="explore-search"
            name="q"
            value={draftQuery}
            onChange={(e) => setDraftQuery(e.target.value)}
            placeholder={t('searchPlaceholder')}
            className="h-11 ps-9"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
          />
        </div>
        <Button type="submit" className="h-11 shrink-0 touch-manipulation sm:min-w-28">
          {t('searchSubmit')}
        </Button>
      </form>

      <div className="flex w-full flex-nowrap items-center gap-2 overflow-x-auto pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <ToggleGroup
          type="single"
          value={kindValue}
          onValueChange={(value) => {
            if (!value || value === KIND_ALL) {
              navigate(city, query, null)
              return
            }
            if (value === KIND_COMMUNITY) {
              navigate(city, query, 'community')
              return
            }
            if (value === KIND_COMMERCIAL) {
              navigate(city, query, 'commercial')
            }
          }}
          className="flex shrink-0 flex-nowrap justify-start gap-2"
          aria-label={t('kindLabel')}
        >
          <ToggleGroupItem value={KIND_ALL} className={chipClass}>
            {t('kindAll')}
          </ToggleGroupItem>
          <ToggleGroupItem value={KIND_COMMERCIAL} className={chipClass}>
            {t('kindCommercial')}
          </ToggleGroupItem>
          <ToggleGroupItem value={KIND_COMMUNITY} className={chipClass}>
            {t('kindCommunity')}
          </ToggleGroupItem>
        </ToggleGroup>

        {cities.length > 0 ? (
          <>
            <span className="mx-1 h-5 w-px shrink-0 bg-border" aria-hidden />
            <ToggleGroup
              type="single"
              value={cityValue}
              onValueChange={(value) => {
                if (!value || value === CITY_ALL) {
                  navigate(null, query, kind)
                  return
                }
                navigate(value, query, kind)
              }}
              className="flex min-w-0 flex-nowrap justify-start gap-2"
              aria-label={t('citiesLabel')}
            >
              <ToggleGroupItem value={CITY_ALL} className={chipClass}>
                {t('cityAll')}
              </ToggleGroupItem>
              {cities.map((name) => (
                <ToggleGroupItem key={name} value={name} className={chipClass}>
                  {name}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
          </>
        ) : null}
      </div>
    </div>
  )
}
