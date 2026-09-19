'use client'

import { useTranslations } from 'next-intl'

import type { PosOrder } from '@/lib/graphql/queries/pos-orders'
import { formatCurrency } from '@/lib/currency'

type PosReceiptProps = {
  order: PosOrder
  locationName: string
  currencyCode: string
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

export function PosReceipt({ order, locationName, currencyCode }: PosReceiptProps) {
  const t = useTranslations('pos')
  const subtotal = order.lines.reduce((sum, line) => sum + line.lineTotal, 0)
  const discount = order.discountAmount ?? 0
  const total = Math.max(0, subtotal - discount)
  const isRefunded = order.status === 'REFUNDED'

  return (
    <div className="pos-receipt-print mx-auto w-full max-w-sm space-y-4 bg-white p-4 text-black">
      <header className="space-y-1 text-center">
        <h2 className="text-lg font-semibold">{locationName}</h2>
        <p className="text-sm font-medium">{t('receiptTitle')}</p>
        <p className="text-sm tabular-nums">{order.billNumber}</p>
        {order.tableLabel ? (
          <p className="text-sm">
            {t('tableLabel')}: {order.tableLabel}
          </p>
        ) : null}
        {isRefunded ? (
          <p className="text-sm font-medium">{t('receiptRefundedNote')}</p>
        ) : null}
      </header>

      <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-xs">
        <dt className="text-neutral-600">{t('receiptOpened')}</dt>
        <dd className="text-right tabular-nums">{formatWhen(order.openedAt)}</dd>
        <dt className="text-neutral-600">{t('receiptClosed')}</dt>
        <dd className="text-right tabular-nums">{formatWhen(order.closedAt)}</dd>
        {order.paymentMethod ? (
          <>
            <dt className="text-neutral-600">{t('receiptPayment')}</dt>
            <dd className="text-right">
              {t(`payment.${order.paymentMethod.toLowerCase()}`)}
            </dd>
          </>
        ) : null}
        <dt className="text-neutral-600">{t('receiptStatus')}</dt>
        <dd className="text-right">{t(`status.${order.status.toLowerCase()}`)}</dd>
      </dl>

      <ul className="space-y-2 border-y border-neutral-300 py-3 text-sm">
        {order.lines.map((line) => (
          <li key={line.id} className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="font-medium leading-snug">{line.nameSnapshot}</p>
              {(line.modifiers ?? []).length > 0 ? (
                <ul className="mt-0.5 space-y-0.5 text-xs text-neutral-600">
                  {(line.modifiers ?? []).map((modifier) => (
                    <li key={modifier.id}>
                      + {modifier.nameSnapshot}
                      {modifier.priceDeltaSnapshot !== 0
                        ? ` (${formatCurrency(modifier.priceDeltaSnapshot, currencyCode)})`
                        : null}
                    </li>
                  ))}
                </ul>
              ) : null}
              {line.note ? (
                <p className="mt-0.5 text-xs italic text-neutral-600">
                  {t('lineNote')}: {line.note}
                </p>
              ) : null}
              <p className="text-xs text-neutral-600 tabular-nums">
                {line.qty} × {formatCurrency(line.unitPrice, currencyCode)}
              </p>
            </div>
            <span className="shrink-0 tabular-nums">
              {formatCurrency(line.lineTotal, currencyCode)}
            </span>
          </li>
        ))}
      </ul>

      <div className="space-y-1 text-sm">
        <div className="flex justify-between gap-3">
          <span>{t('subtotal')}</span>
          <span className="tabular-nums">{formatCurrency(subtotal, currencyCode)}</span>
        </div>
        {discount > 0 ? (
          <div className="flex justify-between gap-3">
            <span>{t('discount')}</span>
            <span className="tabular-nums">−{formatCurrency(discount, currencyCode)}</span>
          </div>
        ) : null}
        <div className="flex justify-between gap-3 text-base font-semibold">
          <span>{t('total')}</span>
          <span className="tabular-nums">{formatCurrency(total, currencyCode)}</span>
        </div>
      </div>
    </div>
  )
}
