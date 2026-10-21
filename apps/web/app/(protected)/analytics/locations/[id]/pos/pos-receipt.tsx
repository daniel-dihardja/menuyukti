'use client'

import { QRCodeSVG } from 'qrcode.react'
import { useLocale, useTranslations } from 'next-intl'

import type { PosOrder } from '@/lib/graphql/queries/pos-orders'
import { formatCurrency } from '@/lib/currency'

import { linePreDiscountTotal, orderPayableTotal, orderPreDiscountSubtotal } from './pos-utils'

export type PosReceiptSeller = {
  legalName: string | null
  street: string | null
  city: string | null
  country: string | null
  taxNumber: string | null
  vatId: string | null
}

type PosReceiptProps = {
  order: PosOrder
  locationName: string
  currencyCode: string
  seller?: PosReceiptSeller
}

function receiptDateLocale(appLocale: string): string {
  return appLocale === 'de' ? 'de-DE' : 'en-GB'
}

function formatWhen(iso: string | null | undefined, locale: string): string {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleString(receiptDateLocale(locale), {
      dateStyle: 'medium',
      timeStyle: 'short',
    })
  } catch {
    return iso
  }
}

function formatTaxRate(bps: number): string {
  return `${(bps / 100).toFixed(bps % 100 === 0 ? 0 : 1)}%`
}

export function PosReceipt({ order, locationName, currencyCode, seller }: PosReceiptProps) {
  const t = useTranslations('pos')
  const locale = useLocale()
  // lineTotal is post-discount allocated gross; receipt subtotal must be pre-discount.
  const subtotal = orderPreDiscountSubtotal(order.lines)
  const discount = order.discountAmount ?? 0
  const total = orderPayableTotal(order)
  const isRefunded = order.status === 'REFUNDED'
  const displayName = seller?.legalName?.trim() || locationName
  const addressLine = [seller?.street, seller?.city, seller?.country]
    .map((part) => part?.trim())
    .filter(Boolean)
    .join(', ')
  const breakdown = order.taxBreakdown ?? []
  const saleFiscal =
    (order.fiscalProcesses ?? []).find((p) => p.kind === 'sale' && p.state === 'finished') ??
    (order.fiscalProcesses ?? []).find((p) => p.kind === 'sale') ??
    null
  const refundFiscal =
    (order.fiscalProcesses ?? []).find((p) => p.kind === 'refund' && p.state === 'finished') ?? null
  const showFiscal = saleFiscal?.state === 'finished' || refundFiscal?.state === 'finished'
  const isMockProvider = saleFiscal?.provider === 'mock' || refundFiscal?.provider === 'mock'

  return (
    <div className="pos-receipt-print mx-auto w-full max-w-sm space-y-4 bg-white p-4 text-black">
      <header className="space-y-1 text-center">
        <h2 className="text-lg font-semibold">{displayName}</h2>
        {addressLine ? <p className="text-xs text-neutral-700">{addressLine}</p> : null}
        {seller?.taxNumber ? (
          <p className="text-xs text-neutral-700">
            {t('receiptTaxNumber')}: {seller.taxNumber}
          </p>
        ) : null}
        {seller?.vatId ? (
          <p className="text-xs text-neutral-700">
            {t('receiptVatId')}: {seller.vatId}
          </p>
        ) : null}
        <p className="text-sm font-medium">{t('receiptTitle')}</p>
        <p className="text-sm tabular-nums">{order.billNumber}</p>
        {order.tableLabel ? (
          <p className="text-sm">
            {t('tableLabel')}: {order.tableLabel}
          </p>
        ) : null}
        {isRefunded ? <p className="text-sm font-medium">{t('receiptRefundedNote')}</p> : null}
      </header>

      <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-xs">
        <dt className="text-neutral-600">{t('receiptOpened')}</dt>
        <dd className="text-right tabular-nums">{formatWhen(order.openedAt, locale)}</dd>
        <dt className="text-neutral-600">{t('receiptClosed')}</dt>
        <dd className="text-right tabular-nums">{formatWhen(order.closedAt, locale)}</dd>
        {order.paymentMethod ? (
          <>
            <dt className="text-neutral-600">{t('receiptPayment')}</dt>
            <dd className="text-right">{t(`payment.${order.paymentMethod.toLowerCase()}`)}</dd>
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
              {formatCurrency(linePreDiscountTotal(line), currencyCode)}
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
        {breakdown.length > 0 ? (
          <div className="space-y-1 border-t border-neutral-200 pt-2 text-xs">
            <p className="font-medium text-neutral-700">{t('receiptVatBreakdown')}</p>
            {breakdown.map((row) => (
              <div key={row.taxRateBps} className="space-y-0.5">
                <div className="flex justify-between gap-3">
                  <span>
                    {t('receiptNet')} ({formatTaxRate(row.taxRateBps)})
                  </span>
                  <span className="tabular-nums">{formatCurrency(row.net, currencyCode)}</span>
                </div>
                <div className="flex justify-between gap-3">
                  <span>
                    {t('receiptVat')} ({formatTaxRate(row.taxRateBps)})
                  </span>
                  <span className="tabular-nums">{formatCurrency(row.tax, currencyCode)}</span>
                </div>
              </div>
            ))}
          </div>
        ) : null}
        <div className="flex justify-between gap-3 text-base font-semibold">
          <span>{t('total')}</span>
          <span className="tabular-nums">{formatCurrency(total, currencyCode)}</span>
        </div>
      </div>

      {showFiscal ? (
        <div className="space-y-2 border-t border-neutral-300 pt-3 text-xs">
          <p className="font-medium text-neutral-800">{t('receiptTseTitle')}</p>
          {isMockProvider ? (
            <p className="font-medium text-neutral-700">{t('receiptTseMockBanner')}</p>
          ) : null}
          {saleFiscal?.state === 'finished' ? (
            <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1">
              {saleFiscal.tseTransactionId ? (
                <>
                  <dt className="text-neutral-600">{t('receiptTseTxId')}</dt>
                  <dd className="break-all text-right font-mono text-[10px]">
                    {saleFiscal.tseTransactionId}
                  </dd>
                </>
              ) : null}
              {saleFiscal.signatureCounter != null ? (
                <>
                  <dt className="text-neutral-600">{t('receiptTseCounter')}</dt>
                  <dd className="text-right tabular-nums">{saleFiscal.signatureCounter}</dd>
                </>
              ) : null}
              {saleFiscal.certificateSerial ? (
                <>
                  <dt className="text-neutral-600">{t('receiptTseSerial')}</dt>
                  <dd className="break-all text-right font-mono text-[10px]">
                    {saleFiscal.certificateSerial}
                  </dd>
                </>
              ) : null}
              {saleFiscal.tseSignature ? (
                <>
                  <dt className="text-neutral-600">{t('receiptTseSignature')}</dt>
                  <dd className="break-all text-right font-mono text-[10px]">
                    {saleFiscal.tseSignature.slice(0, 48)}
                    {saleFiscal.tseSignature.length > 48 ? '…' : ''}
                  </dd>
                </>
              ) : null}
            </dl>
          ) : null}
          {saleFiscal?.qrPayload ? (
            <div className="flex flex-col items-center gap-2 pt-1">
              <QRCodeSVG
                value={saleFiscal.qrPayload}
                size={128}
                level="M"
                title={t('receiptTseTitle')}
                className="bg-white"
              />
              <p className="max-w-full break-all font-mono text-[9px] leading-snug text-neutral-500">
                {saleFiscal.qrPayload}
              </p>
            </div>
          ) : null}
          {refundFiscal?.state === 'finished' ? (
            <div className="space-y-2">
              <p className="text-neutral-700">
                {t('receiptTseRefund')}: {refundFiscal.tseTransactionId ?? '—'}
              </p>
              {refundFiscal.qrPayload ? (
                <div className="flex flex-col items-center gap-2">
                  <QRCodeSVG
                    value={refundFiscal.qrPayload}
                    size={96}
                    level="M"
                    title={t('receiptTseRefund')}
                    className="bg-white"
                  />
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
