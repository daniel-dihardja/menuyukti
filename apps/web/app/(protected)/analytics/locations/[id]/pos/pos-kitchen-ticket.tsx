'use client'

import { useTranslations } from 'next-intl'

import type { PosOrder } from '@/lib/graphql/queries/pos-orders'

type PosKitchenTicketProps = {
  order: PosOrder
  locationName: string
}

function formatWhen(iso: string | null | undefined): string {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleString(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short',
    })
  } catch {
    return iso
  }
}

export function PosKitchenTicket({ order, locationName }: PosKitchenTicketProps) {
  const t = useTranslations('pos')

  return (
    <div className="pos-kitchen-print mx-auto w-full max-w-md space-y-5 bg-white p-5 text-black">
      <header className="space-y-1 border-b-2 border-black pb-3 text-center">
        <h2 className="text-2xl font-bold tracking-tight">{t('kitchenTitle')}</h2>
        <p className="text-lg font-semibold">{locationName}</p>
        <p className="text-xl font-bold tabular-nums">{order.billNumber}</p>
        {order.fulfillmentMode === 'PICKUP' ? (
          <p className="text-lg font-semibold">{t('fulfillmentPickup')}</p>
        ) : order.fulfillmentMode === 'DELIVERY' ? (
          <div className="space-y-1 text-left">
            <p className="text-lg font-semibold text-center">{t('fulfillmentDelivery')}</p>
            {order.deliveryAddress ? (
              <p className="text-base font-semibold whitespace-pre-wrap">{order.deliveryAddress}</p>
            ) : null}
            {order.deliveryPhone ? (
              <p className="text-base font-semibold">
                {t('deliveryPhone')}: {order.deliveryPhone}
              </p>
            ) : null}
            {order.deliveryNotes ? (
              <p className="text-sm whitespace-pre-wrap">
                {t('deliveryNotes')}: {order.deliveryNotes}
              </p>
            ) : null}
          </div>
        ) : order.tableLabel ? (
          <p className="text-lg font-semibold">
            {t('tableLabel')}: {order.tableLabel}
          </p>
        ) : null}
        {order.prepStatus ? (
          <p className="text-base font-semibold">
            {t(`prep.status.${order.prepStatus.toLowerCase()}`)}
          </p>
        ) : null}
        <p className="text-sm tabular-nums">{formatWhen(order.openedAt)}</p>
      </header>

      <ul className="space-y-4">
        {order.lines.map((line) => (
          <li key={line.id} className="border-b border-neutral-300 pb-3 last:border-0">
            <p className="text-2xl font-bold leading-tight">
              <span className="tabular-nums">{line.qty}×</span> {line.nameSnapshot}
            </p>
            {(line.modifiers ?? []).length > 0 ? (
              <ul className="mt-1 space-y-0.5 pl-1 text-lg">
                {(line.modifiers ?? []).map((modifier) => (
                  <li key={modifier.id}>
                    + {modifier.nameSnapshot}
                    {modifier.groupNameSnapshot ? (
                      <span className="text-base font-normal text-neutral-600">
                        {' '}
                        ({modifier.groupNameSnapshot})
                      </span>
                    ) : null}
                  </li>
                ))}
              </ul>
            ) : null}
            {line.note ? (
              <p className="mt-2 text-lg font-semibold italic">
                {t('kitchenNote')}: {line.note}
              </p>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  )
}
