import { AlertCircle } from 'lucide-react'
import { auth } from '@clerk/nextjs/server'
import { getTranslations } from 'next-intl/server'
import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { Suspense } from 'react'

import { AnalyticsPageShell } from '@/components/analytics-page-shell'
import { PageHeading } from '@/components/page-heading'
import { defaultReportDateRange, loadAiGatewayPersonalUsage } from '@/lib/ai-gateway/usage'
import { graphqlQuery } from '@/lib/graphql/client'
import {
  MY_AI_USAGE_SUMMARY_QUERY,
  type AiUsageBucket,
  type MyAiUsageSummaryData,
} from '@/lib/graphql/queries/ai-usage'
import { routes } from '@/lib/routes'
import { Alert, AlertDescription, AlertTitle } from '@workspace/ui/components/alert'
import { Skeleton } from '@workspace/ui/components/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@workspace/ui/components/table'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('usage')
  const title = t('title')
  const description = t('description')
  return { title, description, openGraph: { title, description } }
}

const intFmt = new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 })
const usdFmt = new Intl.NumberFormat(undefined, {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 2,
  maximumFractionDigits: 4,
})

type LlmRow = {
  key: string
  model: string
  requestCount: number
  inputTokens: number
  outputTokens: number
  totalCostUsd: number | null
}

function UsageDataSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <Skeleton className="h-4 w-64" />
      <Skeleton className="h-64 w-full" />
      <Skeleton className="h-48 w-full" />
    </div>
  )
}

function llmRowsFromLedger(buckets: AiUsageBucket[]): LlmRow[] {
  const byModel = new Map<string, LlmRow>()
  for (const b of buckets) {
    if (b.provider !== 'ai_gateway') continue
    const model = b.model?.trim() || b.feature || '(unknown)'
    const cur = byModel.get(model) ?? {
      key: model,
      model,
      requestCount: 0,
      inputTokens: 0,
      outputTokens: 0,
      totalCostUsd: null,
    }
    cur.requestCount += b.eventCount
    cur.inputTokens += b.inputTokens ?? 0
    cur.outputTokens += b.outputTokens ?? 0
    byModel.set(model, cur)
  }
  return [...byModel.values()].sort((a, b) => b.requestCount - a.requestCount)
}

async function UsageDataContent({ userId }: { userId: string }) {
  const t = await getTranslations('usage')
  const [gateway, summaryResult] = await Promise.all([
    loadAiGatewayPersonalUsage(userId),
    graphqlQuery<MyAiUsageSummaryData>(MY_AI_USAGE_SUMMARY_QUERY, {}, userId).catch(
      (err: unknown) => {
        console.error('[usage] myAiUsageSummary failed', {
          userIdPrefix: userId.slice(0, 8),
          message: err instanceof Error ? err.message : String(err),
        })
        return null
      },
    ),
  ])

  const summary = summaryResult?.myAiUsageSummary ?? null
  const dateRange = summary
    ? { startDate: summary.startDate, endDate: summary.endDate }
    : gateway.dateRange.startDate
      ? gateway.dateRange
      : defaultReportDateRange()

  const leonardoBuckets = summary?.buckets.filter((b) => b.provider === 'leonardo') ?? []
  const ledgerLlmRows = llmRowsFromLedger(summary?.buckets ?? [])

  let llmRows: LlmRow[] = []
  let llmSource: 'gateway' | 'ledger' | 'none' = 'none'
  let llmError: 'missing_key' | 'forbidden' | 'http_error' | 'parse_error' | null = null

  if (gateway.report.ok) {
    llmRows = gateway.report.rows.map((row) => ({
      key: row.model,
      model: row.model,
      requestCount: row.requestCount,
      inputTokens: row.inputTokens,
      outputTokens: row.outputTokens,
      totalCostUsd: row.totalCostUsd,
    }))
    llmSource = 'gateway'
  } else if (ledgerLlmRows.length > 0) {
    llmRows = ledgerLlmRows
    llmSource = 'ledger'
    if (gateway.report.code === 'forbidden' || gateway.report.code === 'missing_key') {
      llmError = gateway.report.code
    }
  } else if (gateway.report.ok === false) {
    llmError = gateway.report.code
  }

  return (
    <>
      <p className="text-muted-foreground text-sm">
        {t('dateRange', {
          start: dateRange.startDate,
          end: dateRange.endDate,
        })}
      </p>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-medium tracking-tight">{t('llm.sectionTitle')}</h2>
        <p className="text-muted-foreground text-sm">
          {llmSource === 'ledger' ? t('llm.sectionHintLedger') : t('llm.sectionHint')}
        </p>

        {llmSource === 'none' && llmError === 'missing_key' ? (
          <Alert variant="destructive">
            <AlertCircle />
            <AlertTitle>{t('llm.missingKeyTitle')}</AlertTitle>
            <AlertDescription>{t('llm.missingKeyDescription')}</AlertDescription>
          </Alert>
        ) : llmSource === 'none' && llmError === 'forbidden' ? (
          <Alert>
            <AlertCircle />
            <AlertTitle>{t('llm.forbiddenTitle')}</AlertTitle>
            <AlertDescription>{t('llm.forbiddenDescription')}</AlertDescription>
          </Alert>
        ) : llmSource === 'none' && llmError ? (
          <Alert variant="destructive">
            <AlertCircle />
            <AlertTitle>{t('llm.errorTitle')}</AlertTitle>
            <AlertDescription>
              {llmError === 'parse_error'
                ? t('llm.parseError')
                : t('llm.httpError', {
                    status:
                      gateway.report.ok === false && 'status' in gateway.report
                        ? (gateway.report.status ?? '—')
                        : '—',
                  })}
            </AlertDescription>
          </Alert>
        ) : llmRows.length === 0 ? (
          <p className="text-muted-foreground text-sm">{t('llm.empty')}</p>
        ) : (
          <>
            {llmSource === 'ledger' && llmError === 'forbidden' ? (
              <p className="text-muted-foreground text-sm">{t('llm.ledgerCostNote')}</p>
            ) : null}
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('llm.columnModel')}</TableHead>
                  <TableHead className="text-right">{t('llm.columnRequests')}</TableHead>
                  <TableHead className="text-right">{t('llm.columnInputTokens')}</TableHead>
                  <TableHead className="text-right">{t('llm.columnOutputTokens')}</TableHead>
                  <TableHead className="text-right">{t('llm.columnCost')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {llmRows.map((row) => (
                  <TableRow key={row.key}>
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
                      {row.totalCostUsd == null ? '—' : usdFmt.format(row.totalCostUsd)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </>
        )}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-medium tracking-tight">{t('leonardo.sectionTitle')}</h2>
        <p className="text-muted-foreground text-sm">{t('leonardo.sectionHint')}</p>

        {summaryResult == null ? (
          <Alert variant="destructive">
            <AlertCircle />
            <AlertTitle>{t('leonardo.errorTitle')}</AlertTitle>
            <AlertDescription>{t('leonardo.errorDescription')}</AlertDescription>
          </Alert>
        ) : leonardoBuckets.length === 0 ? (
          <p className="text-muted-foreground text-sm">{t('leonardo.empty')}</p>
        ) : (
          <>
            <p className="text-sm tabular-nums">
              {t('leonardo.totalUnits', {
                count: intFmt.format(leonardoBuckets.reduce((sum, b) => sum + b.units, 0)),
              })}
            </p>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('leonardo.columnFeature')}</TableHead>
                  <TableHead>{t('leonardo.columnModel')}</TableHead>
                  <TableHead className="text-right">{t('leonardo.columnGenerations')}</TableHead>
                  <TableHead className="text-right">{t('leonardo.columnEvents')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {leonardoBuckets.map((row) => (
                  <TableRow key={`${row.feature}:${row.model ?? ''}`}>
                    <TableCell className="font-medium">{row.feature}</TableCell>
                    <TableCell>{row.model ?? '—'}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {intFmt.format(row.units)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {intFmt.format(row.eventCount)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </>
        )}
      </section>
    </>
  )
}

export default async function UsagePage() {
  const { isAuthenticated, userId } = await auth()
  if (!isAuthenticated || !userId) {
    redirect(routes.login)
  }

  const t = await getTranslations('usage')

  return (
    <AnalyticsPageShell title={t('title')} breadcrumbs={[{ label: t('breadcrumb') }]}>
      <div className="flex flex-col gap-6">
        <PageHeading title={t('heading')} description={t('description')} />

        <Suspense fallback={<UsageDataSkeleton />}>
          <UsageDataContent userId={userId} />
        </Suspense>
      </div>
    </AnalyticsPageShell>
  )
}
