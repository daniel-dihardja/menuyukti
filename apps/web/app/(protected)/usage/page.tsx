import { AlertCircle } from 'lucide-react'
import { getTranslations } from 'next-intl/server'

import { AnalyticsPageShell } from '@/components/analytics-page-shell'
import { PageHeading } from '@/components/page-heading'
import { loadAiGatewayUsage } from '@/lib/ai-gateway/usage'
import { requireMenuyuktiAdmin } from '@/lib/menuyukti-role-server'
import { Alert, AlertDescription, AlertTitle } from '@workspace/ui/components/alert'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@workspace/ui/components/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@workspace/ui/components/table'

const intFmt = new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 })
const usdFmt = new Intl.NumberFormat(undefined, {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 2,
  maximumFractionDigits: 4,
})

export default async function UsagePage() {
  await requireMenuyuktiAdmin()

  const t = await getTranslations('usage')
  const data = await loadAiGatewayUsage()

  return (
    <AnalyticsPageShell title={t('title')} breadcrumbs={[{ label: t('breadcrumb') }]}>
      <div className="flex flex-col gap-6">
        <PageHeading title={t('heading')} description={t('description')} />

        <p className="text-muted-foreground text-sm">
          {t('dateRange', {
            start: data.dateRange.startDate,
            end: data.dateRange.endDate,
          })}
        </p>

        {data.credits.ok === false && data.credits.code === 'missing_key' ? (
          <Alert variant="destructive">
            <AlertCircle />
            <AlertTitle>{t('credits.missingKeyTitle')}</AlertTitle>
            <AlertDescription>{t('credits.missingKeyDescription')}</AlertDescription>
          </Alert>
        ) : null}

        <section className="flex flex-col gap-3">
          <h2 className="text-lg font-medium tracking-tight">{t('credits.sectionTitle')}</h2>
          {data.credits.ok ? (
            <div className="grid gap-3 sm:grid-cols-2">
              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>{t('credits.balanceLabel')}</CardDescription>
                  <CardTitle className="text-2xl tabular-nums">{data.credits.balance}</CardTitle>
                </CardHeader>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>{t('credits.totalUsedLabel')}</CardDescription>
                  <CardTitle className="text-2xl tabular-nums">{data.credits.totalUsed}</CardTitle>
                </CardHeader>
              </Card>
            </div>
          ) : data.credits.code !== 'missing_key' ? (
            <Alert variant="destructive">
              <AlertCircle />
              <AlertTitle>{t('credits.errorTitle')}</AlertTitle>
              <AlertDescription>
                {data.credits.code === 'parse_error'
                  ? t('credits.parseError')
                  : t('credits.httpError', { status: data.credits.status ?? '—' })}
              </AlertDescription>
            </Alert>
          ) : null}
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="text-lg font-medium tracking-tight">{t('report.sectionTitle')}</h2>
          <p className="text-muted-foreground text-sm">{t('report.sectionHint')}</p>

          {data.report.ok === false && data.report.code === 'missing_key' ? null : data.report
              .ok === false && data.report.code === 'forbidden' ? (
            <Alert>
              <AlertCircle />
              <AlertTitle>{t('report.forbiddenTitle')}</AlertTitle>
              <AlertDescription>{t('report.forbiddenDescription')}</AlertDescription>
            </Alert>
          ) : data.report.ok === false ? (
            <Alert variant="destructive">
              <AlertCircle />
              <AlertTitle>{t('report.errorTitle')}</AlertTitle>
              <AlertDescription>
                {data.report.code === 'parse_error'
                  ? t('report.parseError')
                  : t('report.httpError', { status: data.report.status ?? '—' })}
              </AlertDescription>
            </Alert>
          ) : data.report.rows.length === 0 ? (
            <p className="text-muted-foreground text-sm">{t('report.empty')}</p>
          ) : (
            <Card>
              <CardContent className="pt-6">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('report.columnModel')}</TableHead>
                      <TableHead className="text-right">{t('report.columnRequests')}</TableHead>
                      <TableHead className="text-right">{t('report.columnInputTokens')}</TableHead>
                      <TableHead className="text-right">{t('report.columnOutputTokens')}</TableHead>
                      <TableHead className="text-right">{t('report.columnCost')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.report.rows.map((row) => (
                      <TableRow key={row.model}>
                        <TableCell className="font-medium">{row.model}</TableCell>
                        <TableCell className="text-right tabular-nums">
                          {intFmt.format(row.requestCount)}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {intFmt.format(row.inputTokens)}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {intFmt.format(row.outputTokens)}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {usdFmt.format(row.totalCostUsd)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </section>
      </div>
    </AnalyticsPageShell>
  )
}
