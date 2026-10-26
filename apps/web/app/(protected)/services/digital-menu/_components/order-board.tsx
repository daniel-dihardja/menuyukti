'use client'

import { useCallback, useEffect, useEffectEvent, useRef, useState } from 'react'
import Link from 'next/link'
import { useTranslations } from 'next-intl'

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@workspace/ui/components/alert-dialog'
import { Alert, AlertDescription } from '@workspace/ui/components/alert'
import { Badge } from '@workspace/ui/components/badge'
import { Button } from '@workspace/ui/components/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@workspace/ui/components/card'
import { Empty, EmptyHeader, EmptyTitle } from '@workspace/ui/components/empty'
import { ScrollArea } from '@workspace/ui/components/scroll-area'
import { Spinner } from '@workspace/ui/components/spinner'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@workspace/ui/components/tabs'
import { cn } from '@workspace/ui/lib/utils'

import type { PosOrder, PosPrepStatus } from '@/lib/graphql/queries/pos-orders'
import {
  boardColumnForPrep,
  formatOrderAge,
  nextPrepStatus,
  type OrderBoardColumn,
} from '@/lib/orders/prep-status'
import { routes } from '@/lib/routes'

const POLL_MS = 5000
const NEW_ORDER_FLASH_MS = 4000
const TERMINAL_PREP = new Set<PosPrepStatus>(['SERVED', 'PICKED_UP', 'DELIVERED'])

type Props = {
  locationId: number
  locationName: string
}

type ColumnId = OrderBoardColumn

function prepLabelKey(status: PosPrepStatus): string {
  switch (status) {
    case 'RECEIVED':
      return 'prepReceived'
    case 'PREPARING':
      return 'prepPreparing'
    case 'READY':
      return 'prepReady'
    case 'SERVED':
      return 'prepServed'
    case 'PICKED_UP':
      return 'prepPickedUp'
    case 'DELIVERED':
      return 'prepDelivered'
    default:
      return 'prepReceived'
  }
}

type BoardT = ReturnType<typeof useTranslations>

type OrderBoardCardProps = {
  order: PosOrder
  nowMs: number
  busy: boolean
  highlighted: boolean
  showPrepBadge: boolean
  onAdvance: () => void
  onCancel: () => void
  t: BoardT
}

function OrderBoardCard({
  order,
  nowMs,
  busy,
  highlighted,
  showPrepBadge,
  onAdvance,
  onCancel,
  t,
}: OrderBoardCardProps) {
  const next = nextPrepStatus(order.prepStatus, order.fulfillmentMode)
  const age = formatOrderAge(order.openedAt, nowMs)
  const modeLabel =
    order.fulfillmentMode === 'DINE_IN'
      ? t('modeDineIn')
      : order.fulfillmentMode === 'DELIVERY'
        ? t('modeDelivery')
        : t('modePickup')
  const canCancel = Boolean(order.prepStatus && !TERMINAL_PREP.has(order.prepStatus))
  const tableProminent = order.fulfillmentMode === 'DINE_IN' && Boolean(order.tableLabel)

  return (
    <Card
      className={cn(
        'gap-3 py-3 shadow-sm transition-[box-shadow,border-color]',
        highlighted && 'ring-2 ring-primary',
      )}
    >
      <CardHeader className="gap-2 px-3 [.border-b]:pb-0">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex flex-col gap-1.5">
            <CardTitle className="truncate text-base leading-tight">
              {t('ticketLabel', { billNumber: order.billNumber })}
            </CardTitle>
            {tableProminent ? (
              <p className="text-base font-semibold tracking-tight">
                {t('tableLabel', { label: order.tableLabel! })}
              </p>
            ) : null}
            <CardDescription className="flex flex-wrap items-center gap-1.5">
              <Badge variant="secondary">{modeLabel}</Badge>
              {!tableProminent && order.tableLabel ? (
                <span>{t('tableLabel', { label: order.tableLabel })}</span>
              ) : null}
              {age ? <span>{t('ageLabel', { age })}</span> : null}
            </CardDescription>
          </div>
          {showPrepBadge && order.prepStatus ? (
            <Badge variant="outline">{t(prepLabelKey(order.prepStatus))}</Badge>
          ) : null}
        </div>
      </CardHeader>

      <CardContent className="flex flex-col gap-2 px-3">
        <ul className="flex flex-col gap-1 text-sm">
          {order.lines.map((line) => (
            <li key={line.id}>
              {t('qtyLine', { qty: line.qty, name: line.nameSnapshot })}
              {line.modifiers.length > 0 ? (
                <span className="text-muted-foreground block text-xs">
                  {line.modifiers.map((m) => m.nameSnapshot).join(', ')}
                </span>
              ) : null}
            </li>
          ))}
        </ul>

        {order.deliveryAddress || order.deliveryPhone || order.deliveryNotes ? (
          <div className="text-muted-foreground flex flex-col gap-0.5 text-xs">
            {order.deliveryAddress ? <p>{order.deliveryAddress}</p> : null}
            {order.deliveryPhone ? <p>{order.deliveryPhone}</p> : null}
            {order.deliveryNotes ? <p>{order.deliveryNotes}</p> : null}
          </div>
        ) : null}
      </CardContent>

      {next || canCancel ? (
        <CardFooter className="mt-auto flex flex-col gap-2 px-3">
          {next ? (
            <Button size="lg" className="w-full" disabled={busy} onClick={onAdvance}>
              {busy ? <Spinner data-icon="inline-start" /> : null}
              {t('advanceTo', { status: t(prepLabelKey(next)) })}
            </Button>
          ) : null}
          {canCancel ? (
            <Button
              size="default"
              variant="outline"
              className="w-full"
              disabled={busy}
              onClick={onCancel}
            >
              {t('cancel')}
            </Button>
          ) : null}
        </CardFooter>
      ) : null}
    </Card>
  )
}

function ColumnEmpty({ label }: { label: string }) {
  return (
    <Empty className="border border-dashed p-4 md:p-6">
      <EmptyHeader>
        <EmptyTitle className="text-sm font-medium">{label}</EmptyTitle>
      </EmptyHeader>
    </Empty>
  )
}

export function OrderBoard({ locationId, locationName }: Props) {
  const t = useTranslations('services.digitalMenu.orders')
  const [orders, setOrders] = useState<PosOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<number | null>(null)
  const [cancelId, setCancelId] = useState<number | null>(null)
  const [nowMs, setNowMs] = useState(() => Date.now())
  const [newOrderFlash, setNewOrderFlash] = useState(false)
  const [highlightedIds, setHighlightedIds] = useState<Set<number>>(() => new Set())
  const [activeTab, setActiveTab] = useState<ColumnId>('new')
  const knownIdsRef = useRef<Set<number> | null>(null)
  const flashTimerRef = useRef<number | null>(null)

  useEffect(() => {
    const id = window.setInterval(() => setNowMs(Date.now()), 30_000)
    return () => window.clearInterval(id)
  }, [])

  useEffect(() => {
    return () => {
      if (flashTimerRef.current != null) window.clearTimeout(flashTimerRef.current)
    }
  }, [])

  const onOrdersLoaded = useEffectEvent((next: PosOrder[]) => {
    const ids = new Set(next.map((o) => o.id))
    const prev = knownIdsRef.current
    if (prev != null) {
      const arrived: number[] = []
      for (const id of ids) {
        if (!prev.has(id)) arrived.push(id)
      }
      if (arrived.length > 0) {
        setHighlightedIds(new Set(arrived))
        setActiveTab('new')
        setNewOrderFlash(true)
        if (flashTimerRef.current != null) window.clearTimeout(flashTimerRef.current)
        flashTimerRef.current = window.setTimeout(() => {
          setNewOrderFlash(false)
          setHighlightedIds(new Set())
          flashTimerRef.current = null
        }, NEW_ORDER_FLASH_MS)
      }
    }
    knownIdsRef.current = ids
    setOrders(next)
  })

  const loadOrders = useCallback(async () => {
    try {
      const res = await fetch(`/api/locations/${locationId}/orders?status=OPEN`, {
        cache: 'no-store',
      })
      const json = (await res.json()) as { orders?: PosOrder[]; error?: string }
      if (!res.ok) {
        throw new Error(json.error || 'load failed')
      }
      onOrdersLoaded(json.orders ?? [])
      setError(null)
    } catch {
      setError(t('loadError'))
    } finally {
      setLoading(false)
    }
  }, [locationId, t])

  useEffect(() => {
    void loadOrders()
    const id = window.setInterval(() => void loadOrders(), POLL_MS)
    return () => window.clearInterval(id)
  }, [loadOrders])

  const postAction = async (action: 'advancePrep' | 'void', orderId: number) => {
    setBusyId(orderId)
    setError(null)
    try {
      const res = await fetch(`/api/locations/${locationId}/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, orderId }),
      })
      const json = (await res.json()) as { error?: string }
      if (!res.ok) {
        throw new Error(json.error || 'action failed')
      }
      await loadOrders()
    } catch {
      setError(t('actionFailed'))
    } finally {
      setBusyId(null)
      setCancelId(null)
    }
  }

  const byColumn: Record<ColumnId, PosOrder[]> = {
    new: [],
    preparing: [],
    ready: [],
    done: [],
  }
  for (const order of orders) {
    const col = boardColumnForPrep(order.prepStatus)
    if (col) byColumn[col].push(order)
  }

  const columns: { id: ColumnId; label: string }[] = [
    { id: 'new', label: t('columnNew') },
    { id: 'preparing', label: t('columnPreparing') },
    { id: 'ready', label: t('columnReady') },
    { id: 'done', label: t('columnDone') },
  ]

  const renderCard = (order: PosOrder, showPrepBadge: boolean) => (
    <OrderBoardCard
      key={order.id}
      order={order}
      nowMs={nowMs}
      busy={busyId === order.id}
      highlighted={highlightedIds.has(order.id)}
      showPrepBadge={showPrepBadge}
      onAdvance={() => void postAction('advancePrep', order.id)}
      onCancel={() => setCancelId(order.id)}
      t={t}
    />
  )

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      <div className="flex shrink-0 flex-col gap-1">
        <p className="text-muted-foreground text-sm">{locationName}</p>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="ghost" size="default" asChild className="-ml-2">
            <Link href={routes.servicesDigitalMenuLocation(locationId)}>{t('backToConsole')}</Link>
          </Button>
          {newOrderFlash ? <Badge>{t('newOrderBadge')}</Badge> : null}
          {loading ? (
            <span className="text-muted-foreground text-xs">{t('refreshing')}</span>
          ) : null}
        </div>
      </div>

      {error ? (
        <Alert variant="destructive" className="shrink-0">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      {!loading && orders.length === 0 ? (
        <Empty className="border border-dashed">
          <EmptyHeader>
            <EmptyTitle>{t('emptyBoard')}</EmptyTitle>
          </EmptyHeader>
        </Empty>
      ) : (
        <>
          {/* Phone / tablet portrait: tabs until lg */}
          <div className="min-h-0 flex-1 lg:hidden">
            <Tabs
              value={activeTab}
              onValueChange={(value) => {
                if (
                  value === 'new' ||
                  value === 'preparing' ||
                  value === 'ready' ||
                  value === 'done'
                ) {
                  setActiveTab(value)
                }
              }}
              className="flex min-h-0 flex-col gap-3"
            >
              <TabsList className="grid h-auto w-full shrink-0 grid-cols-4 gap-1 p-1">
                {columns.map((col) => (
                  <TabsTrigger
                    key={col.id}
                    value={col.id}
                    className="min-h-11 flex-col gap-0.5 px-1 py-2 text-xs sm:text-sm"
                  >
                    <span>{col.label}</span>
                    {byColumn[col.id].length > 0 ? (
                      <Badge variant="secondary" className="px-1.5 py-0 text-[10px] tabular-nums">
                        {byColumn[col.id].length}
                      </Badge>
                    ) : null}
                  </TabsTrigger>
                ))}
              </TabsList>
              {columns.map((col) => (
                <TabsContent key={col.id} value={col.id} className="mt-0 flex flex-col gap-3">
                  {byColumn[col.id].length === 0 ? (
                    <ColumnEmpty label={t('emptyColumn')} />
                  ) : (
                    byColumn[col.id].map((order) => renderCard(order, true))
                  )}
                </TabsContent>
              ))}
            </Tabs>
          </div>

          {/* Desktop / tablet landscape: four columns */}
          <div className="hidden min-h-0 flex-1 gap-3 lg:grid lg:grid-cols-4">
            {columns.map((col) => (
              <section key={col.id} className="flex min-h-0 min-w-0 flex-col gap-3">
                <h2 className="border-border bg-background/95 sticky top-0 z-10 flex shrink-0 items-center gap-2 border-b py-2 text-sm font-semibold backdrop-blur">
                  <span>{col.label}</span>
                  <Badge variant="secondary" className="tabular-nums">
                    {byColumn[col.id].length}
                  </Badge>
                </h2>
                <ScrollArea className="h-[calc(100dvh-13rem)] min-h-[12rem]">
                  <div className="flex flex-col gap-3 pr-3 pb-2">
                    {byColumn[col.id].length === 0 ? (
                      <ColumnEmpty label={t('emptyColumn')} />
                    ) : (
                      byColumn[col.id].map((order) => renderCard(order, false))
                    )}
                  </div>
                </ScrollArea>
              </section>
            ))}
          </div>
        </>
      )}

      <AlertDialog open={cancelId != null} onOpenChange={(open) => !open && setCancelId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('cancelConfirmTitle')}</AlertDialogTitle>
            <AlertDialogDescription>{t('cancelConfirmDescription')}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="min-h-11">{t('cancelKeep')}</AlertDialogCancel>
            <AlertDialogAction
              className="min-h-11"
              disabled={cancelId == null || busyId === cancelId}
              onClick={(e) => {
                e.preventDefault()
                if (cancelId != null) void postAction('void', cancelId)
              }}
            >
              {busyId === cancelId ? <Spinner data-icon="inline-start" /> : null}
              {t('cancelConfirm')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
