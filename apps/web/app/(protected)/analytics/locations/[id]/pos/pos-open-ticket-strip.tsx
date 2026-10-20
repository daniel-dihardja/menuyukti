'use client'

import { useTranslations } from 'next-intl'

import { Button } from '@workspace/ui/components/button'
import { cn } from '@workspace/ui/lib/utils'

import type { PosOrder } from '@/lib/graphql/queries/pos-orders'

type PosOpenTicketStripProps = {
  openOrders: PosOrder[]
  currentOrderId: number | null
  onSelectTicket: (order: PosOrder) => void
}

export function PosOpenTicketStrip({
  openOrders,
  currentOrderId,
  onSelectTicket,
}: PosOpenTicketStripProps) {
  const t = useTranslations('pos')

  if (openOrders.length === 0) return null

  return (
    <div className="shrink-0">
      <p className="mb-2 text-xs font-medium text-muted-foreground">{t('openTicketsTitle')}</p>
      <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
        {openOrders.map((order) => {
          const selected = currentOrderId === order.id
          const label = order.tableLabel?.trim()
            ? t('openTicketWithTable', { bill: order.billNumber, table: order.tableLabel })
            : order.billNumber
          return (
            <Button
              key={order.id}
              type="button"
              size="lg"
              variant={selected ? 'default' : 'outline'}
              className={cn('min-h-11 shrink-0 snap-start', selected && 'pointer-events-none')}
              aria-pressed={selected}
              onClick={() => onSelectTicket(order)}
            >
              {label}
            </Button>
          )
        })}
      </div>
    </div>
  )
}
