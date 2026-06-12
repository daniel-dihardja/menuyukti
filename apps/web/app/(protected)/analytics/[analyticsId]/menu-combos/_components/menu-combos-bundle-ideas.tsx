'use client'

import { useTranslations } from 'next-intl'

import {
  formatLift,
  pairLabel,
  type BundleIdeaGroup,
} from '@/lib/analytics/menu-combos-page-adapter'
import { Badge } from '@workspace/ui/components/badge'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@workspace/ui/components/card'

type MenuCombosBundleIdeasProps = {
  groups: BundleIdeaGroup[]
  locale: string
}

export function MenuCombosBundleIdeas({ groups, locale }: MenuCombosBundleIdeasProps) {
  const t = useTranslations('analytics.menuCombos.bundleIdeas')

  if (groups.length === 0) return null

  return (
    <Card className="shadow-none">
      <CardHeader>
        <CardTitle className="text-base">{t('title')}</CardTitle>
        <CardDescription>{t('description')}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-6">
        {groups.map((group) => (
          <div key={group.kind} className="flex flex-col gap-2">
            <div className="flex flex-col gap-0.5">
              <h3 className="text-sm font-medium">
                {group.kind === 'premium' ? t('premiumTitle') : t('upsellTitle')}
              </h3>
              <p className="text-sm text-muted-foreground">
                {group.kind === 'premium' ? t('premiumDescription') : t('upsellDescription')}
              </p>
            </div>
            <ul className="flex flex-col gap-2">
              {group.pairs.map((pair) => (
                <li
                  key={`${pair.menuA}::${pair.menuB}`}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-card-border px-3 py-2"
                >
                  <span className="min-w-0 truncate font-medium">{pairLabel(pair)}</span>
                  <Badge variant="secondary" className="shrink-0 font-normal tabular-nums">
                    {formatLift(pair.lift, locale)}× lift
                  </Badge>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
