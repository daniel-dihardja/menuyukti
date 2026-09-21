'use client'

import { useTranslations } from 'next-intl'

import { Badge } from '@workspace/ui/components/badge'
import { Button } from '@workspace/ui/components/button'
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from '@workspace/ui/components/empty'
import { Field, FieldGroup, FieldLabel } from '@workspace/ui/components/field'
import { Input } from '@workspace/ui/components/input'
import { ScrollArea } from '@workspace/ui/components/scroll-area'
import { Separator } from '@workspace/ui/components/separator'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@workspace/ui/components/sheet'
import { Spinner } from '@workspace/ui/components/spinner'
import { ToggleGroup, ToggleGroupItem } from '@workspace/ui/components/toggle-group'
import { cn } from '@workspace/ui/lib/utils'

import type { PosDaySummary, PosOrder } from '@/lib/graphql/queries/pos-orders'
import { formatCurrency } from '@/lib/currency'

import { TODAY_FILTERS, type TodayFilter, statusBadgeVariant, truncateClerkId } from './pos-utils'

type PosOpsSheetProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  todayOrders: PosOrder[]
  filteredTodayOrders: PosOrder[]
  todayFilter: TodayFilter
  onTodayFilterChange: (filter: TodayFilter) => void
  currentOrderId: number | null
  pending: boolean
  currencyCode: string
  dayCloseDate: string
  daySummary: PosDaySummary | null
  onDayCloseDateChange: (value: string) => void
  onLoadDaySummary: () => void
  onSelectTicket: (order: PosOrder) => void
}

export function PosOpsSheet({
  open,
  onOpenChange,
  todayOrders,
  filteredTodayOrders,
  todayFilter,
  onTodayFilterChange,
  currentOrderId,
  pending,
  currencyCode,
  dayCloseDate,
  daySummary,
  onDayCloseDateChange,
  onLoadDaySummary,
  onSelectTicket,
}: PosOpsSheetProps) {
  const t = useTranslations('pos')

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="flex w-full flex-col gap-0 sm:max-w-md">
        <SheetHeader>
          <SheetTitle>{t('opsSheetTitle')}</SheetTitle>
          <SheetDescription>{t('opsSheetDescription')}</SheetDescription>
        </SheetHeader>

        <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-4 pb-6">
          <section className="flex flex-col gap-3">
            <h3 className="text-sm font-semibold">{t('todayTitle')}</h3>
            <div className="-mx-1 overflow-x-auto px-1">
              <ToggleGroup
                type="single"
                value={todayFilter}
                onValueChange={(value) => {
                  if (!value) return
                  onTodayFilterChange(value as TodayFilter)
                }}
                className="flex w-max flex-nowrap gap-2"
              >
                {TODAY_FILTERS.map((filter) => (
                  <ToggleGroupItem key={filter} value={filter} className="min-h-11 snap-start px-3">
                    {filter === 'all' ? t('todayFilterAll') : t(`status.${filter.toLowerCase()}`)}
                  </ToggleGroupItem>
                ))}
              </ToggleGroup>
            </div>

            <ScrollArea className="h-56">
              {filteredTodayOrders.length === 0 ? (
                <Empty className="border-0 p-4 md:p-6">
                  <EmptyHeader>
                    <EmptyTitle className="text-base">{t('todayEmptyTitle')}</EmptyTitle>
                    <EmptyDescription>
                      {todayOrders.length === 0 ? t('todayEmpty') : t('todayFilterEmpty')}
                    </EmptyDescription>
                  </EmptyHeader>
                </Empty>
              ) : (
                <ul className="flex flex-col gap-1 pr-3">
                  {filteredTodayOrders.map((order) => {
                    const selected = currentOrderId === order.id
                    return (
                      <li key={order.id}>
                        <button
                          type="button"
                          disabled={pending}
                          onClick={() => {
                            onSelectTicket(order)
                            onOpenChange(false)
                          }}
                          aria-pressed={selected}
                          className={cn(
                            'flex w-full min-h-11 items-center justify-between gap-2 rounded-md px-3 py-2 text-left text-sm transition-colors',
                            'hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                            selected && 'bg-muted',
                            'disabled:opacity-50',
                          )}
                        >
                          <span className="min-w-0 truncate font-medium">
                            {order.billNumber}
                            {order.tableLabel ? (
                              <span className="font-normal text-muted-foreground">
                                {' '}
                                ·{' '}
                                {order.tableLabel.length > 12
                                  ? `${order.tableLabel.slice(0, 12)}…`
                                  : order.tableLabel}
                              </span>
                            ) : null}
                            {order.openedByClerkUserId ? (
                              <span className="font-normal text-muted-foreground">
                                {' '}
                                · {truncateClerkId(order.openedByClerkUserId)}
                              </span>
                            ) : null}
                          </span>
                          <Badge
                            variant={statusBadgeVariant(order.status)}
                            className="shrink-0"
                          >
                            {t(`status.${order.status.toLowerCase()}`)}
                          </Badge>
                        </button>
                      </li>
                    )
                  })}
                </ul>
              )}
            </ScrollArea>
          </section>

          <Separator />

          <section className="flex flex-col gap-3">
            <h3 className="text-sm font-semibold">{t('dayCloseTitle')}</h3>
            <FieldGroup className="gap-3">
              <Field orientation="horizontal" className="flex-wrap items-end gap-2">
                <FieldLabel htmlFor="pos-day-close-date">{t('dayCloseDate')}</FieldLabel>
                <Input
                  id="pos-day-close-date"
                  type="date"
                  value={dayCloseDate}
                  onChange={(e) => onDayCloseDateChange(e.target.value)}
                  disabled={pending}
                  className="h-11 w-auto"
                />
                <Button
                  type="button"
                  size="lg"
                  variant="outline"
                  disabled={pending || !dayCloseDate}
                  onClick={onLoadDaySummary}
                >
                  {pending ? <Spinner data-icon="inline-start" /> : null}
                  {t('dayCloseLoad')}
                </Button>
              </Field>
            </FieldGroup>

            {daySummary ? (
              <div className="flex flex-col gap-2 text-sm">
                <dl className="grid grid-cols-2 gap-x-3 gap-y-2">
                  <dt className="text-muted-foreground">{t('dayCloseOpen')}</dt>
                  <dd className="text-right tabular-nums">{daySummary.openCount}</dd>
                  <dt className="text-muted-foreground">{t('dayClosePaid')}</dt>
                  <dd className="text-right tabular-nums">{daySummary.paidCount}</dd>
                  <dt className="text-muted-foreground">{t('dayCloseVoid')}</dt>
                  <dd className="text-right tabular-nums">{daySummary.voidCount}</dd>
                  <dt className="text-muted-foreground">{t('dayCloseRefunded')}</dt>
                  <dd className="text-right tabular-nums">{daySummary.refundedCount}</dd>
                  <dt className="text-muted-foreground">{t('dayCloseDiscount')}</dt>
                  <dd className="text-right tabular-nums">
                    {formatCurrency(daySummary.paidDiscountTotal, currencyCode)}
                  </dd>
                  <dt className="text-muted-foreground">{t('dayCloseRefundedGross')}</dt>
                  <dd className="text-right tabular-nums">
                    {formatCurrency(daySummary.refundedGrossTotal, currencyCode)}
                  </dd>
                  <dt className="text-muted-foreground">{t('dayCloseOpenRemaining')}</dt>
                  <dd className="text-right tabular-nums">{daySummary.openTicketsRemaining}</dd>
                </dl>
                {daySummary.paidByPaymentMethod.length > 0 ? (
                  <ul className="flex flex-col gap-1 border-t border-border/50 pt-2">
                    {daySummary.paidByPaymentMethod.map((row) => (
                      <li
                        key={row.paymentMethod}
                        className="flex items-center justify-between gap-2"
                      >
                        <span className="text-muted-foreground">
                          {t(`payment.${row.paymentMethod.toLowerCase()}`)} ({row.ticketCount})
                        </span>
                        <span className="tabular-nums">
                          {formatCurrency(row.grossTotal, currencyCode)}
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">{t('dayCloseEmpty')}</p>
            )}
          </section>
        </div>
      </SheetContent>
    </Sheet>
  )
}
