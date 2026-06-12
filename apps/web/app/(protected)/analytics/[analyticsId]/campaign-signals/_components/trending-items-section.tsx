import type { ReactNode } from 'react'

import { formatChangePercent } from '@/lib/analytics/campaign-signals-page-adapter'
import { formatCurrencyWithCode } from '@/lib/currency'
import type { InstagramSignalsTrendingItem } from '@/lib/graphql/queries/analytics'
import { Separator } from '@workspace/ui/components/separator'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@workspace/ui/components/table'

type TrendingItemsSectionProps = {
  items: InstagramSignalsTrendingItem[]
  locale: string
  currency: string
  menuColumn: string
  currentRevenueColumn: string
  changePctColumn: string
  rankColumn: string
  wasRankLabel: (rank: number) => string
}

function TrendingMetric({
  label,
  value,
  className,
}: {
  label: string
  value: ReactNode
  className?: string
}) {
  return (
    <div className="flex min-w-0 flex-col gap-0.5">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className={className ?? 'text-sm font-medium tabular-nums'}>{value}</span>
    </div>
  )
}

export function TrendingItemsSection({
  items,
  locale,
  currency,
  menuColumn,
  currentRevenueColumn,
  changePctColumn,
  rankColumn,
  wasRankLabel,
}: TrendingItemsSectionProps) {
  return (
    <>
      <ul className="flex flex-col md:hidden">
        {items.map((item, index) => (
          <li key={item.menu} className="min-w-0 px-4 py-3 sm:px-6">
            {index > 0 ? <Separator className="mb-3" /> : null}
            <div className="flex flex-col gap-3">
              <p className="text-sm font-medium leading-snug break-words">{item.menu}</p>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                <TrendingMetric
                  label={currentRevenueColumn}
                  value={formatCurrencyWithCode(item.currentRevenue, currency, locale)}
                />
                <TrendingMetric
                  label={changePctColumn}
                  value={formatChangePercent(item.changePct, locale) ?? '—'}
                />
                <TrendingMetric
                  label={rankColumn}
                  value={
                    <>
                      {item.rankCurrent}
                      {item.rankPrevious !== item.rankCurrent ? (
                        <span className="ml-1 text-xs font-normal text-muted-foreground">
                          ({wasRankLabel(item.rankPrevious)})
                        </span>
                      ) : null}
                    </>
                  }
                  className="text-sm font-medium tabular-nums"
                />
              </div>
            </div>
          </li>
        ))}
      </ul>

      <div className="hidden overflow-x-auto md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{menuColumn}</TableHead>
              <TableHead className="text-right">{currentRevenueColumn}</TableHead>
              <TableHead className="text-right">{changePctColumn}</TableHead>
              <TableHead className="text-right">{rankColumn}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item) => (
              <TableRow key={item.menu}>
                <TableCell className="min-w-0 max-w-xs whitespace-normal">
                  <span className="truncate font-medium">{item.menu}</span>
                </TableCell>
                <TableCell className="shrink-0 text-right tabular-nums">
                  {formatCurrencyWithCode(item.currentRevenue, currency, locale)}
                </TableCell>
                <TableCell className="shrink-0 text-right tabular-nums">
                  {formatChangePercent(item.changePct, locale) ?? '—'}
                </TableCell>
                <TableCell className="shrink-0 text-right tabular-nums text-muted-foreground">
                  {item.rankCurrent}
                  {item.rankPrevious !== item.rankCurrent
                    ? ` (${wasRankLabel(item.rankPrevious)})`
                    : ''}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </>
  )
}
