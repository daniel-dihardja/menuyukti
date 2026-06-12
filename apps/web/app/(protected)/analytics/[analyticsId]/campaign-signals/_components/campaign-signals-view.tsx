import {
  CircleDollarSign,
  Clock,
  Package,
  ShoppingBag,
  Target,
  TrendingUp,
  UtensilsCrossed,
} from 'lucide-react'
import Link from 'next/link'
import { getTranslations } from 'next-intl/server'

import {
  confidenceTierVariant,
  formatChangePercent,
  formatPeakHour,
  formatSharePercent,
  objectiveMessageKey,
  primaryCtaMessageKey,
} from '@/lib/analytics/campaign-signals-page-adapter'
import { formatCurrencyWithCode } from '@/lib/currency'
import type { InstagramSignalsData } from '@/lib/graphql/queries/analytics'
import { routes } from '@/lib/routes'
import { Alert, AlertDescription, AlertTitle } from '@workspace/ui/components/alert'
import { Badge } from '@workspace/ui/components/badge'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@workspace/ui/components/card'
import { Button } from '@workspace/ui/components/button'

import { MatrixItemsSection } from './matrix-items-section'
import { TrendingItemsSection } from './trending-items-section'

type SignalsPayload = NonNullable<InstagramSignalsData['instagramSignals']>

type CampaignSignalsViewProps = {
  signals: SignalsPayload
  analyticsId: number
  locale: string
  currency: string
}

function ShareBar({ label, value, locale }: { label: string; value: number; locale: string }) {
  const pct = Math.min(100, Math.max(0, value * 100))
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between gap-2 text-sm">
        <span className="text-muted-foreground">{label}</span>
        <span className="tabular-nums font-medium">{formatSharePercent(value, locale)}</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-muted" role="presentation">
        <div className="h-full rounded-full bg-primary/50" style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

export async function CampaignSignalsView({
  signals,
  analyticsId,
  locale,
  currency,
}: CampaignSignalsViewProps) {
  const t = await getTranslations('analytics.campaignSignals')
  const { capabilities, fundamentalSignals, additionalSignals } = signals
  const { sales, categoryFocus, trendingItems } = fundamentalSignals
  const {
    orderSignals,
    datetimeSignals,
    matrixSignals,
    campaignPlanningSignals,
    signalConfidence,
  } = additionalSignals

  const countFmt = new Intl.NumberFormat(locale)
  const peakHourLabel = datetimeSignals
    ? formatPeakHour(datetimeSignals.bestPostingWindow.peakHour, locale)
    : null

  const heroes = matrixSignals.contentHeroes
  const avoidItems = matrixSignals.avoidItems
  const matrixEmpty = heroes.length === 0 && avoidItems.length === 0

  return (
    <div className="flex min-w-0 flex-col gap-8">
      <section className="flex flex-col gap-3">
        <h2 className="text-base font-semibold">{t('sections.coverage')}</h2>
        <div className="flex flex-wrap gap-2">
          <Badge variant={capabilities.hasOrderId ? 'default' : 'outline'}>
            {capabilities.hasOrderId ? t('capabilities.orderId') : t('capabilities.noOrderId')}
          </Badge>
          <Badge variant={capabilities.hasDatetime ? 'default' : 'outline'}>
            {capabilities.hasDatetime ? t('capabilities.datetime') : t('capabilities.noDatetime')}
          </Badge>
          <Badge variant={confidenceTierVariant(signalConfidence.tier)}>
            {t(`confidence.${signalConfidence.tier}` as 'confidence.high')}
          </Badge>
        </div>
        {capabilities.enabledBlocks.length > 0 ? (
          <p className="text-sm text-muted-foreground">
            {t('capabilities.enabledBlocks', {
              blocks: capabilities.enabledBlocks.join(', '),
            })}
          </p>
        ) : null}
        {signalConfidence.coverageNotes.length > 0 ? (
          <Alert>
            <AlertTitle>{t('coverageNotesTitle')}</AlertTitle>
            <AlertDescription>
              <ul className="list-disc space-y-1 pl-4">
                {signalConfidence.coverageNotes.map((note) => (
                  <li key={note}>{note}</li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
        ) : null}
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-base font-semibold">{t('sections.fundamental')}</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card className="gap-4 py-5 shadow-none sm:py-6">
            <CardHeader className="gap-3">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-md bg-muted">
                <CircleDollarSign className="text-muted-foreground" aria-hidden />
              </div>
              <CardDescription>{t('sales.totalRevenue')}</CardDescription>
              <CardTitle className="text-2xl tracking-tight tabular-nums">
                {formatCurrencyWithCode(sales.totalRevenue, currency, locale)}
              </CardTitle>
            </CardHeader>
          </Card>
          <Card className="gap-4 py-5 shadow-none sm:py-6">
            <CardHeader className="gap-3">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-md bg-muted">
                <ShoppingBag className="text-muted-foreground" aria-hidden />
              </div>
              <CardDescription>{t('sales.totalItemsSold')}</CardDescription>
              <CardTitle className="text-2xl tracking-tight tabular-nums">
                {countFmt.format(sales.totalItemsSold)}
              </CardTitle>
            </CardHeader>
          </Card>
          <Card className="gap-4 py-5 shadow-none sm:py-6">
            <CardHeader className="gap-3">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-md bg-muted">
                <UtensilsCrossed className="text-muted-foreground" aria-hidden />
              </div>
              <CardDescription>{t('sales.uniqueMenuItems')}</CardDescription>
              <CardTitle className="text-2xl tracking-tight tabular-nums">
                {countFmt.format(sales.uniqueMenuItems)}
              </CardTitle>
            </CardHeader>
          </Card>
          <Card className="gap-4 py-5 shadow-none sm:py-6">
            <CardHeader className="gap-3">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-md bg-muted">
                <Package className="text-muted-foreground" aria-hidden />
              </div>
              <CardDescription>{t('sales.avgItemPrice')}</CardDescription>
              <CardTitle className="text-2xl tracking-tight tabular-nums">
                {formatCurrencyWithCode(sales.avgItemPrice, currency, locale)}
              </CardTitle>
            </CardHeader>
          </Card>
        </div>

        {categoryFocus?.category ? (
          <Card className="shadow-none">
            <CardHeader>
              <CardTitle className="text-base">{t('categoryFocus.title')}</CardTitle>
              <CardDescription>{categoryFocus.category}</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <ShareBar
                label={t('categoryFocus.revenueShare')}
                value={categoryFocus.revenueShare}
                locale={locale}
              />
              <ShareBar
                label={t('categoryFocus.quantityShare')}
                value={categoryFocus.quantityShare}
                locale={locale}
              />
            </CardContent>
          </Card>
        ) : null}

        {trendingItems.length > 0 ? (
          <Card className="min-w-0 gap-0 overflow-hidden py-0 shadow-none">
            <CardHeader className="border-b border-card-border px-4 py-5 sm:px-6 sm:py-6">
              <div className="flex items-center gap-2">
                <TrendingUp className="size-4 text-muted-foreground" aria-hidden />
                <CardTitle className="text-base">{t('trending.title')}</CardTitle>
              </div>
              <CardDescription>{t('trending.description')}</CardDescription>
            </CardHeader>
            <CardContent className="min-w-0 px-0 pt-0">
              <TrendingItemsSection
                items={trendingItems}
                locale={locale}
                currency={currency}
                menuColumn={t('trending.menuColumn')}
                currentRevenueColumn={t('trending.currentRevenue')}
                changePctColumn={t('trending.changePct')}
                rankColumn={t('trending.rank')}
                wasRankLabel={(rank) => t('trending.wasRank', { rank })}
              />
            </CardContent>
          </Card>
        ) : null}
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-base font-semibold">{t('sections.order')}</h2>
        {orderSignals ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card className="shadow-none">
              <CardHeader className="pb-2">
                <CardDescription>{t('order.totalOrders')}</CardDescription>
                <CardTitle className="text-xl tabular-nums">
                  {countFmt.format(orderSignals.totalOrders)}
                </CardTitle>
              </CardHeader>
            </Card>
            <Card className="shadow-none">
              <CardHeader className="pb-2">
                <CardDescription>{t('order.avgOrderRevenue')}</CardDescription>
                <CardTitle className="text-xl tabular-nums">
                  {formatCurrencyWithCode(orderSignals.avgOrderRevenue, currency, locale)}
                </CardTitle>
              </CardHeader>
            </Card>
            <Card className="shadow-none">
              <CardHeader className="pb-2">
                <CardDescription>{t('order.avgOrderItems')}</CardDescription>
                <CardTitle className="text-xl tabular-nums">
                  {orderSignals.avgOrderItems.toFixed(1)}
                </CardTitle>
              </CardHeader>
            </Card>
            <Card className="shadow-none">
              <CardHeader className="pb-2">
                <CardDescription>{t('order.revenueRange')}</CardDescription>
                <CardTitle className="text-base tabular-nums">
                  {formatCurrencyWithCode(orderSignals.minOrderRevenue, currency, locale)}
                  {' – '}
                  {formatCurrencyWithCode(orderSignals.maxOrderRevenue, currency, locale)}
                </CardTitle>
              </CardHeader>
            </Card>
          </div>
        ) : (
          <Alert variant="default">
            <AlertDescription>{t('unavailable.orderSignals')}</AlertDescription>
          </Alert>
        )}
      </section>

      <section className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-base font-semibold">{t('sections.timing')}</h2>
          {datetimeSignals ? (
            <Button asChild variant="outline" size="sm">
              <Link href={routes.analytics.heatmap(analyticsId)}>{t('links.heatmap')}</Link>
            </Button>
          ) : null}
        </div>
        {datetimeSignals ? (
          <>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <Card className="shadow-none">
                <CardHeader className="pb-2">
                  <CardDescription>{t('timing.peakDay')}</CardDescription>
                  <CardTitle className="text-lg">
                    {datetimeSignals.bestPostingWindow.peakDay ?? '—'}
                  </CardTitle>
                </CardHeader>
              </Card>
              <Card className="shadow-none">
                <CardHeader className="pb-2">
                  <CardDescription>{t('timing.peakRevenueDay')}</CardDescription>
                  <CardTitle className="text-lg">
                    {datetimeSignals.bestPostingWindow.peakRevenueDay ?? '—'}
                  </CardTitle>
                </CardHeader>
              </Card>
              <Card className="shadow-none">
                <CardHeader className="pb-2">
                  <CardDescription>{t('timing.primaryMealPeriod')}</CardDescription>
                  <CardTitle className="text-lg">
                    {datetimeSignals.bestPostingWindow.primaryMealPeriod ?? '—'}
                  </CardTitle>
                </CardHeader>
              </Card>
              <Card className="shadow-none">
                <CardHeader className="pb-2">
                  <CardDescription>{t('timing.peakRevenueMealPeriod')}</CardDescription>
                  <CardTitle className="text-lg">
                    {datetimeSignals.bestPostingWindow.peakRevenueMealPeriod ?? '—'}
                  </CardTitle>
                </CardHeader>
              </Card>
              <Card className="shadow-none">
                <CardHeader className="pb-2">
                  <div className="flex items-center gap-2">
                    <Clock className="size-4 text-muted-foreground" aria-hidden />
                    <CardDescription>{t('timing.peakHour')}</CardDescription>
                  </div>
                  <CardTitle className="text-lg">{peakHourLabel ?? '—'}</CardTitle>
                </CardHeader>
              </Card>
            </div>
            <Card className="shadow-none">
              <CardHeader>
                <CardTitle className="text-base">{t('timing.periodHeadline')}</CardTitle>
                <CardDescription>
                  {datetimeSignals.periodHeadline.periodStart} –{' '}
                  {datetimeSignals.periodHeadline.periodEnd}
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-6">
                <div>
                  <p className="text-sm text-muted-foreground">{t('timing.periodRevenue')}</p>
                  <p className="text-lg font-semibold tabular-nums">
                    {formatCurrencyWithCode(
                      datetimeSignals.periodHeadline.totalRevenue,
                      currency,
                      locale,
                    )}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{t('timing.previousRevenue')}</p>
                  <p className="text-lg font-semibold tabular-nums">
                    {formatCurrencyWithCode(
                      datetimeSignals.periodHeadline.previousPeriodTotalRevenue,
                      currency,
                      locale,
                    )}
                  </p>
                </div>
                {datetimeSignals.periodHeadline.revenueVsPreviousPct != null ? (
                  <div>
                    <p className="text-sm text-muted-foreground">{t('timing.vsPrevious')}</p>
                    <p className="text-lg font-semibold tabular-nums">
                      {formatChangePercent(
                        datetimeSignals.periodHeadline.revenueVsPreviousPct,
                        locale,
                      )}
                    </p>
                  </div>
                ) : null}
              </CardContent>
            </Card>
          </>
        ) : (
          <Alert>
            <AlertDescription>{t('unavailable.datetimeSignals')}</AlertDescription>
          </Alert>
        )}
      </section>

      <section className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-base font-semibold">{t('sections.matrix')}</h2>
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline" size="sm">
              <Link href={routes.analytics.cogs(analyticsId)}>{t('links.cogs')}</Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link href={routes.analytics.matrix(analyticsId)}>{t('links.matrix')}</Link>
            </Button>
          </div>
        </div>
        {matrixEmpty ? (
          <Alert>
            <AlertDescription>{t('matrix.empty')}</AlertDescription>
          </Alert>
        ) : (
          <div className="grid min-w-0 gap-6 lg:grid-cols-2">
            <Card className="min-w-0 gap-0 overflow-hidden py-0 shadow-none">
              <CardHeader className="border-b border-card-border px-4 py-5 sm:px-6">
                <CardTitle className="text-base">{t('matrix.heroesTitle')}</CardTitle>
                <CardDescription>{t('matrix.heroesDescription')}</CardDescription>
              </CardHeader>
              <CardContent className="min-w-0 px-0 pt-0">
                <MatrixItemsSection
                  items={heroes}
                  emptyLabel={t('matrix.heroesEmpty')}
                  locale={locale}
                  currency={currency}
                  menuColumn={t('matrix.menuColumn')}
                  categoryColumn={t('matrix.categoryColumn')}
                  revenueColumn={t('matrix.revenueColumn')}
                />
              </CardContent>
            </Card>
            <Card className="min-w-0 gap-0 overflow-hidden py-0 shadow-none">
              <CardHeader className="border-b border-card-border px-4 py-5 sm:px-6">
                <CardTitle className="text-base">{t('matrix.avoidTitle')}</CardTitle>
                <CardDescription>{t('matrix.avoidDescription')}</CardDescription>
              </CardHeader>
              <CardContent className="min-w-0 px-0 pt-0">
                <MatrixItemsSection
                  items={avoidItems}
                  emptyLabel={t('matrix.avoidEmpty')}
                  locale={locale}
                  currency={currency}
                  menuColumn={t('matrix.menuColumn')}
                  categoryColumn={t('matrix.categoryColumn')}
                  revenueColumn={t('matrix.revenueColumn')}
                />
              </CardContent>
            </Card>
          </div>
        )}
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-base font-semibold">{t('sections.planning')}</h2>
        <Card className="shadow-none">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Target className="size-4 text-muted-foreground" aria-hidden />
              <CardTitle className="text-base">{t('planning.title')}</CardTitle>
            </div>
            <CardDescription>{t('planning.description')}</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <p className="text-sm font-medium">{t('planning.objective')}</p>
              <Badge variant="secondary" className="w-fit">
                {t(objectiveMessageKey(campaignPlanningSignals.objectiveRecommendation))}
              </Badge>
            </div>
            <div className="flex flex-col gap-2">
              <p className="text-sm font-medium">{t('planning.primaryCta')}</p>
              <Badge variant="outline" className="w-fit">
                {t(primaryCtaMessageKey(campaignPlanningSignals.primaryCtaChannel))}
              </Badge>
            </div>
            {campaignPlanningSignals.recommendedPostingDays.length > 0 ? (
              <div className="flex flex-col gap-2">
                <p className="text-sm font-medium">{t('planning.postingDays')}</p>
                <div className="flex flex-wrap gap-2">
                  {campaignPlanningSignals.recommendedPostingDays.map((day) => (
                    <Badge key={day} variant="outline">
                      {day}
                    </Badge>
                  ))}
                </div>
              </div>
            ) : null}
            {campaignPlanningSignals.recommendedDayparts.length > 0 ? (
              <div className="flex flex-col gap-2">
                <p className="text-sm font-medium">{t('planning.dayparts')}</p>
                <div className="flex flex-wrap gap-2">
                  {campaignPlanningSignals.recommendedDayparts.map((period) => (
                    <Badge key={period} variant="outline">
                      {period}
                    </Badge>
                  ))}
                </div>
              </div>
            ) : null}
          </CardContent>
        </Card>
      </section>
    </div>
  )
}
