'use client'

import { Lightbulb } from 'lucide-react'
import { useTranslations } from 'next-intl'

import { formatLift } from '@/lib/analytics/menu-combos-page-adapter'
import type { MenuComboPair } from '@/lib/graphql/queries/analytics'
import { Badge } from '@workspace/ui/components/badge'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@workspace/ui/components/card'

type MenuCombosInsightHeroProps = {
  topPair: MenuComboPair
  locale: string
  matrixUnavailable?: boolean
}

export function MenuCombosInsightHero({
  topPair,
  locale,
  matrixUnavailable = false,
}: MenuCombosInsightHeroProps) {
  const t = useTranslations('analytics.menuCombos')

  return (
    <Card className="gap-4 border-primary/30 bg-primary/5 py-5 shadow-none sm:py-6">
      <CardHeader className="gap-3">
        <div className="flex items-start gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-md bg-primary/10">
            <Lightbulb className="text-primary" aria-hidden />
          </div>
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <CardDescription className="text-foreground/80">{t('insightTitle')}</CardDescription>
            <CardTitle className="text-lg leading-snug font-semibold break-words">
              {topPair.menuA}
              <span className="font-normal text-muted-foreground"> + </span>
              {topPair.menuB}
            </CardTitle>
          </div>
          <Badge variant="secondary" className="shrink-0 font-normal tabular-nums">
            {t('hero.liftLabel', { lift: formatLift(topPair.lift, locale) })}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <p className="text-sm text-muted-foreground">
          {t('insightTopPair', {
            menuA: topPair.menuA,
            menuB: topPair.menuB,
            lift: formatLift(topPair.lift, locale),
          })}
        </p>
        {matrixUnavailable ? (
          <p className="mt-2 text-xs text-muted-foreground">{t('matrixUnavailable')}</p>
        ) : null}
      </CardContent>
    </Card>
  )
}
