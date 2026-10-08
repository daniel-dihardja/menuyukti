'use client'

import { useEffect, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { InfoIcon, PackageIcon } from 'lucide-react'

import { Alert, AlertDescription, AlertTitle } from '@workspace/ui/components/alert'
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
import { Button } from '@workspace/ui/components/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@workspace/ui/components/card'
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@workspace/ui/components/empty'
import { Spinner } from '@workspace/ui/components/spinner'
import {
  SERVICE_KEY_CASHBACK,
  SERVICE_KEY_DIGITAL_MENU,
  SERVICE_KEY_POINT_SYSTEM,
  SERVICE_KEY_PREDICTION,
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
    serviceKey === SERVICE_KEY_POINT_SYSTEM ||
    serviceKey === SERVICE_KEY_STAMP_CARD ||
    serviceKey === SERVICE_KEY_CASHBACK ||
    serviceKey === SERVICE_KEY_PREDICTION
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
  const [confirmRow, setConfirmRow] = useState<SubscriptionOverviewRow | null>(null)
  const [isPending, startTransition] = useTransition()

  useEffect(() => {
    setRows(initial)
  }, [initial])

  async function handleCancel(row: SubscriptionOverviewRow) {
    setError(null)
    setPendingId(row.id)
    setConfirmRow(null)
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

  const confirmServiceKey = confirmRow ? serviceLabelKey(confirmRow.serviceKey) : null
  const confirmServiceLabel = confirmRow
    ? confirmServiceKey
      ? t(`serviceLabels.${confirmServiceKey}`)
      : confirmRow.serviceKey
    : ''

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{t('title')}</CardTitle>
        <CardDescription>{t('subtitle')}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <Alert>
          <InfoIcon />
          <AlertTitle>{t('billingNoteTitle')}</AlertTitle>
          <AlertDescription>{t('billingNote')}</AlertDescription>
        </Alert>

        {rows.length === 0 ? (
          <Empty className="border border-dashed">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <PackageIcon />
              </EmptyMedia>
              <EmptyTitle>{t('empty')}</EmptyTitle>
              <EmptyDescription>{t('emptyHint')}</EmptyDescription>
            </EmptyHeader>
          </Empty>
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
                  <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <span className="text-sm font-medium">{label}</span>
                    <span className="text-muted-foreground text-xs">{row.locationName}</span>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={busy}
                    onClick={() => setConfirmRow(row)}
                  >
                    {pendingId === row.id ? (
                      <>
                        <Spinner data-icon="inline-start" />
                        {t('canceling')}
                      </>
                    ) : (
                      t('cancel')
                    )}
                  </Button>
                </li>
              )
            })}
          </ul>
        )}

        {error ? (
          <Alert variant="destructive">
            <AlertTitle>{t('cancelFailed')}</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}
      </CardContent>

      <AlertDialog
        open={confirmRow !== null}
        onOpenChange={(open) => {
          if (!open) setConfirmRow(null)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('cancelConfirmTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {confirmRow
                ? t('cancelConfirmDescription', {
                    service: confirmServiceLabel,
                    location: confirmRow.locationName,
                  })
                : null}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('cancelConfirmCancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (confirmRow) void handleCancel(confirmRow)
              }}
            >
              {t('cancelConfirmAction')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  )
}
