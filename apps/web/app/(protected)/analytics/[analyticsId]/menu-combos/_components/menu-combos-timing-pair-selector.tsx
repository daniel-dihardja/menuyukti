'use client'

import { useTranslations } from 'next-intl'

import { pairLabel } from '@/lib/analytics/menu-combos-page-adapter'
import type { MenuComboPairTiming } from '@/lib/graphql/queries/analytics'
import { Field, FieldLabel } from '@workspace/ui/components/field'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@workspace/ui/components/select'
import { TabsList, TabsTrigger } from '@workspace/ui/components/tabs'

type MenuCombosTimingPairSelectorProps = {
  topPairTiming: MenuComboPairTiming[]
  selectedIndex: number
  onSelectedIndexChange: (index: number) => void
}

export function MenuCombosTimingPairSelector({
  topPairTiming,
  selectedIndex,
  onSelectedIndexChange,
}: MenuCombosTimingPairSelectorProps) {
  const t = useTranslations('analytics.menuCombos')
  const selectedTiming = topPairTiming[selectedIndex]

  return (
    <Field>
      <FieldLabel
        htmlFor="menu-combos-timing-pair"
        className="text-xs font-medium tracking-wide text-muted-foreground uppercase"
      >
        {t('timing.pairSelectorLabel')}
      </FieldLabel>

      <Select
        value={String(selectedIndex)}
        onValueChange={(value) => {
          onSelectedIndexChange(Number(value))
        }}
      >
        <SelectTrigger
          id="menu-combos-timing-pair"
          aria-label={t('timing.pairSelectorAriaLabel')}
          className="mt-2 h-auto min-h-10 w-full py-2.5 sm:hidden"
        >
          <SelectValue placeholder={t('timing.pairSelectorPlaceholder')}>
            {selectedTiming ? pairLabel(selectedTiming) : null}
          </SelectValue>
        </SelectTrigger>
        <SelectContent className="max-w-[min(100vw-2rem,24rem)]">
          {topPairTiming.map((timing, index) => (
            <SelectItem key={`${timing.menuA}-${timing.menuB}`} value={String(index)}>
              {pairLabel(timing)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <TabsList
        variant="line"
        className="mt-2 hidden h-auto w-full min-w-0 max-w-full justify-start overflow-x-auto overflow-y-hidden overscroll-x-contain [-webkit-overflow-scrolling:touch] sm:inline-flex"
      >
        {topPairTiming.map((timing, index) => (
          <TabsTrigger
            key={`${timing.menuA}-${timing.menuB}`}
            value={String(index)}
            className="h-auto max-w-[16rem] shrink-0 whitespace-normal px-3 py-2"
          >
            <span className="line-clamp-2 text-left font-medium leading-snug">
              {pairLabel(timing)}
            </span>
          </TabsTrigger>
        ))}
      </TabsList>

      <p className="mt-2 hidden text-xs text-muted-foreground sm:block">
        {t('timing.pairSelectorScrollHint')}
      </p>
    </Field>
  )
}
