'use client'

import { useTranslations } from 'next-intl'

import {
  formatLift,
  pairLabel,
  type BundleIdeaGroup,
} from '@/lib/analytics/menu-combos-page-adapter'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@workspace/ui/components/accordion'
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

function PairListItem({
  pair,
  locale,
}: {
  pair: BundleIdeaGroup['pairs'][number]
  locale: string
}) {
  return (
    <li className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-card-border px-3 py-2">
      <span className="min-w-0 font-medium break-words">{pairLabel(pair)}</span>
      <Badge variant="secondary" className="shrink-0 font-normal tabular-nums">
        {formatLift(pair.lift, locale)}× lift
      </Badge>
    </li>
  )
}

function BundleGroupContent({
  group,
  locale,
  showHeading = true,
}: {
  group: BundleIdeaGroup
  locale: string
  showHeading?: boolean
}) {
  const t = useTranslations('analytics.menuCombos.bundleIdeas')

  return (
    <div className="flex flex-col gap-2">
      {showHeading ? (
        <div className="flex flex-col gap-0.5">
          <h3 className="text-sm font-medium">
            {group.kind === 'premium' ? t('premiumTitle') : t('upsellTitle')}
          </h3>
          <p className="text-sm text-muted-foreground">
            {group.kind === 'premium' ? t('premiumDescription') : t('upsellDescription')}
          </p>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">
          {group.kind === 'premium' ? t('premiumDescription') : t('upsellDescription')}
        </p>
      )}
      <ul className="flex flex-col gap-2">
        {group.pairs.map((pair) => (
          <PairListItem key={`${pair.menuA}::${pair.menuB}`} pair={pair} locale={locale} />
        ))}
      </ul>
    </div>
  )
}

export function MenuCombosBundleIdeas({ groups, locale }: MenuCombosBundleIdeasProps) {
  const t = useTranslations('analytics.menuCombos.bundleIdeas')

  if (groups.length === 0) return null

  const defaultOpen = groups[0]?.kind === 'premium' ? ['premium'] : [groups[0]?.kind ?? 'premium']

  return (
    <Card className="shadow-none">
      <CardHeader>
        <CardTitle className="text-base">{t('title')}</CardTitle>
        <CardDescription>{t('description')}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-6">
        <div className="hidden flex-col gap-6 lg:flex">
          {groups.map((group) => (
            <BundleGroupContent key={group.kind} group={group} locale={locale} />
          ))}
        </div>

        <Accordion type="multiple" defaultValue={defaultOpen} className="lg:hidden">
          {groups.map((group) => (
            <AccordionItem key={group.kind} value={group.kind}>
              <AccordionTrigger className="text-sm font-medium">
                {group.kind === 'premium' ? t('premiumTitle') : t('upsellTitle')}
              </AccordionTrigger>
              <AccordionContent>
                <BundleGroupContent group={group} locale={locale} showHeading={false} />
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </CardContent>
    </Card>
  )
}
