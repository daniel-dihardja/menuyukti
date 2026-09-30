'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'

import { Button } from '@workspace/ui/components/button'
import {
  SERVICE_KEY_CASHBACK,
  SERVICE_KEY_DIGITAL_MENU,
  SERVICE_KEY_STAMP_CARD,
  type ServiceKey,
} from '@/lib/graphql/queries/service-subscriptions'

export type SubscriptionOverviewRow = {
  id: string
  locationId: number
  locationName: string
  serviceKey: string
}

type Props = {
  subscriptions: SubscriptionOverviewRow[]
}

function serviceLabelKey(serviceKey: string): ServiceKey | null {
  if (
    serviceKey === SERVICE_KEY_DIGITAL_MENU ||
    serviceKey === SERVICE_KEY_STAMP_CARD ||
    serviceKey === SERVICE_KEY_CASHBACK
  ) {
    return serviceKey
  }
  return null
}

export function ServicesSubscriptionsOverview({ subscriptions: initial }: Props) {
  const t = useTranslations('services.subscriptions')
  const router = useRouter()
  const [rows, setRows] = useState(initial)
  const [error, setError] = useState<string | null>(null)
  const [pendingId, setPendingId] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  async function handleCancel(row: SubscriptionOverviewRow) {
    setError(null)
    setPendingId(row.id)
    try {
      const res = await fetch('/api/services/subscriptions', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          locationId: row.locationId,
          serviceKey: row.serviceKey,
        }),
      })
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { message?: string } | null
        throw new Error(body?.message || t('cancelFailed'))
      }
      setRows((prev) => prev.filter((r) => r.id !== row.id))
      startTransition(() => {
        router.refresh()
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : t('cancelFailed'))
    } finally {
      setPendingId(null)
    }
  }

  return (
    <section className="flex max-w-2xl flex-col gap-3">
      <div className="flex flex-col gap-1">
        <h2 className="text-base font-semibold">{t('title')}</h2>
        <p className="text-muted-foreground text-sm">{t('subtitle')}</p>
        <p className="text-muted-foreground text-xs">{t('billingNote')}</p>
      </div>

      {rows.length === 0 ? (
        <div className="border-border flex flex-col gap-1 rounded-lg border border-dashed p-4">
          <p className="text-sm">{t('empty')}</p>
          <p className="text-muted-foreground text-xs">{t('emptyHint')}</p>
        </div>
      ) : (
        <ul className="border-border divide-border divide-y rounded-lg border">
          {rows.map((row) => {
            const key = serviceLabelKey(row.serviceKey)
            const label = key ? t(`serviceLabels.${key}`) : row.serviceKey
            const busy = isPending || pendingId === row.id
            return (
              <li
                key={row.id}
                className="flex flex-wrap items-center justify-between gap-3 px-4 py-3"
              >
                <div className="flex min-w-0 flex-col gap-0.5">
                  <span className="text-sm font-medium">{label}</span>
                  <span className="text-muted-foreground text-xs">{row.locationName}</span>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={busy}
                  onClick={() => void handleCancel(row)}
                >
                  {pendingId === row.id ? t('canceling') : t('cancel')}
                </Button>
              </li>
            )
          })}
        </ul>
      )}

      {error ? <p className="text-destructive text-sm">{error}</p> : null}
    </section>
  )
}
