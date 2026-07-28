'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Loader2, Trash2 } from 'lucide-react'
import { toast } from 'sonner'

import {
  awardCrmCashback,
  deleteCrmCustomer,
  getCrmCustomer,
  revokeCrmDevice,
  type CrmCustomer,
  type CrmDevice,
} from '@/lib/crm/client-api'
import { routes } from '@/lib/routes'
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@workspace/ui/components/alert-dialog'
import { Badge } from '@workspace/ui/components/badge'
import { Button } from '@workspace/ui/components/button'
import { Field, FieldDescription, FieldLabel } from '@workspace/ui/components/field'
import { Input } from '@workspace/ui/components/input'

type CashbackMode = 'award' | 'redeem'

type CashbackRules = {
  cashbackThresholdAmount: number
  cashbackPercent: number
}

type Props = {
  initialCustomer: CrmCustomer
  cashbackRules: CashbackRules
}

function formatWhen(value: string | null | undefined, fallback: string): string {
  if (!value) return fallback
  return new Date(value).toLocaleString()
}

function customerDisplayName(row: CrmCustomer): string {
  const parts = [row.givenName, row.familyName].filter(Boolean)
  return parts.join(' ')
}

function formatIdr(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(amount)
}

function parsePositiveInt(raw: string): number | null {
  const trimmed = raw.trim()
  if (!/^\d+$/.test(trimmed)) return null
  const value = Number(trimmed)
  if (!Number.isInteger(value) || value <= 0) return null
  return value
}

export function RegistrationDetailClient({ initialCustomer, cashbackRules }: Props) {
  const t = useTranslations('platform.crm.registrations')
  const router = useRouter()
  const [customer, setCustomer] = useState(initialCustomer)
  const [pendingDelete, setPendingDelete] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [pendingRevoke, setPendingRevoke] = useState<CrmDevice | null>(null)
  const [isRevoking, setIsRevoking] = useState(false)
  const [awardMode, setAwardMode] = useState<CashbackMode>('award')
  const [awardAmount, setAwardAmount] = useState('')
  const [awardLabel, setAwardLabel] = useState('')
  const [isAwarding, setIsAwarding] = useState(false)

  useEffect(() => {
    setCustomer(initialCustomer)
  }, [initialCustomer])

  const parsedAwardAmount = parsePositiveInt(awardAmount)
  const awardPreviewCredit =
    awardMode === 'award' &&
    parsedAwardAmount !== null &&
    parsedAwardAmount >= cashbackRules.cashbackThresholdAmount
      ? Math.floor((parsedAwardAmount * cashbackRules.cashbackPercent) / 100)
      : null

  const handleAwardCashback = () => {
    if (isAwarding || parsedAwardAmount === null) return
    const label = awardLabel.trim()
    setIsAwarding(true)
    void (async () => {
      try {
        if (awardMode === 'award') {
          await awardCrmCashback(customer.id, {
            paymentAmount: parsedAwardAmount,
            ...(label ? { label } : {}),
          })
        } else {
          await awardCrmCashback(customer.id, {
            redeemAmount: parsedAwardAmount,
            ...(label ? { label } : {}),
          })
        }
        const refreshed = await getCrmCustomer(customer.id)
        if (refreshed) setCustomer(refreshed)
        setAwardAmount('')
        setAwardLabel('')
        toast.success(t('toast.awarded'))
        router.refresh()
      } catch (err) {
        toast.error(err instanceof Error ? err.message : t('toast.awardError'))
      } finally {
        setIsAwarding(false)
      }
    })()
  }

  const confirmDelete = () => {
    if (!pendingDelete || isDeleting) return
    setIsDeleting(true)
    void (async () => {
      try {
        await deleteCrmCustomer(customer.id)
        toast.success(t('toast.deleted'))
        router.push(routes.crmRegistrationsWithApp(customer.appId))
        router.refresh()
      } catch (err) {
        toast.error(err instanceof Error ? err.message : t('toast.deleteError'))
        setIsDeleting(false)
      }
    })()
  }

  const confirmRevoke = () => {
    if (pendingRevoke === null || isRevoking) return
    const device = pendingRevoke
    setIsRevoking(true)
    void (async () => {
      try {
        await revokeCrmDevice(device.id)
        const refreshed = await getCrmCustomer(customer.id)
        if (refreshed) setCustomer(refreshed)
        setPendingRevoke(null)
        toast.success(t('toast.revoked'))
        router.refresh()
      } catch (err) {
        toast.error(err instanceof Error ? err.message : t('toast.revokeError'))
      } finally {
        setIsRevoking(false)
      }
    })()
  }

  return (
    <div className="flex min-h-0 max-w-lg flex-1 flex-col gap-6">
      <dl className="grid gap-3 text-sm">
        <div>
          <dt className="text-muted-foreground">{t('detailPhone')}</dt>
          <dd className="font-medium tabular-nums">{customer.phoneMasked}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">{t('detailName')}</dt>
          <dd>{customerDisplayName(customer) || t('detailNameEmpty')}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">{t('columns.status')}</dt>
          <dd className="pt-1">
            <Badge variant={customer.status === 'ACTIVE' ? 'default' : 'secondary'}>
              {t(`status.${customer.status}`)}
            </Badge>
          </dd>
        </div>
      </dl>

      <div className="space-y-3 border-t border-border pt-5">
        <div className="space-y-1">
          <h3 className="text-sm font-medium">{t('awardCashbackTitle')}</h3>
          <p className="text-sm text-muted-foreground">{t('awardCashbackDescription')}</p>
          <p className="text-sm text-muted-foreground">
            {t('awardRuleSummary', {
              percent: cashbackRules.cashbackPercent,
              threshold: formatIdr(cashbackRules.cashbackThresholdAmount),
            })}
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            type="button"
            size="sm"
            variant={awardMode === 'award' ? 'default' : 'outline'}
            disabled={isAwarding}
            onClick={() => {
              setAwardMode('award')
              setAwardAmount('')
            }}
          >
            {t('awardModeAward')}
          </Button>
          <Button
            type="button"
            size="sm"
            variant={awardMode === 'redeem' ? 'default' : 'outline'}
            disabled={isAwarding}
            onClick={() => {
              setAwardMode('redeem')
              setAwardAmount('')
            }}
          >
            {t('awardModeRedeem')}
          </Button>
        </div>
        <Field className="space-y-2">
          <FieldLabel htmlFor="crm-award-amount">
            {awardMode === 'award' ? t('awardPaymentLabel') : t('awardRedeemLabel')}
          </FieldLabel>
          <Input
            id="crm-award-amount"
            inputMode="numeric"
            value={awardAmount}
            onChange={(e) => setAwardAmount(e.target.value)}
            placeholder={
              awardMode === 'award' ? t('awardPaymentPlaceholder') : t('awardRedeemPlaceholder')
            }
            disabled={isAwarding}
          />
          <FieldDescription>
            {awardMode === 'award' ? t('awardPaymentHelp') : t('awardRedeemHelp')}
          </FieldDescription>
          {awardMode === 'award' && parsedAwardAmount !== null ? (
            <p className="text-sm text-muted-foreground">
              {parsedAwardAmount < cashbackRules.cashbackThresholdAmount
                ? t('awardPreviewBelowThreshold', {
                    threshold: formatIdr(cashbackRules.cashbackThresholdAmount),
                  })
                : awardPreviewCredit !== null && awardPreviewCredit > 0
                  ? t('awardPreview', {
                      amount: formatIdr(awardPreviewCredit),
                      percent: cashbackRules.cashbackPercent,
                    })
                  : t('awardPreviewZero')}
            </p>
          ) : null}
        </Field>
        <Field className="space-y-2">
          <FieldLabel htmlFor="crm-award-label">{t('awardLabelLabel')}</FieldLabel>
          <Input
            id="crm-award-label"
            value={awardLabel}
            onChange={(e) => setAwardLabel(e.target.value)}
            placeholder={t('awardLabelPlaceholder')}
            maxLength={256}
            disabled={isAwarding}
          />
          <FieldDescription>{t('awardLabelHelp')}</FieldDescription>
        </Field>
        <Button
          type="button"
          disabled={isAwarding || parsedAwardAmount === null}
          onClick={handleAwardCashback}
          className="gap-2"
        >
          {isAwarding ? (
            <>
              <Loader2 className="size-4 animate-spin" aria-hidden />
              {t('awardSubmitting')}
            </>
          ) : awardMode === 'award' ? (
            t('awardSubmitAward')
          ) : (
            t('awardSubmitRedeem')
          )}
        </Button>

        <div className="space-y-3 border-t border-border pt-5">
          <div>
            <p className="text-sm text-muted-foreground">{t('cashbackBalanceLabel')}</p>
            <p className="text-lg font-semibold tabular-nums tracking-tight">
              {formatIdr(customer.cashbackBalance ?? 0)}
            </p>
          </div>
          <h4 className="text-sm font-medium">{t('cashbackHistoryTitle')}</h4>
          {(customer.cashbackEntries ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground">{t('cashbackHistoryEmpty')}</p>
          ) : (
            <ul className="space-y-3">
              {(customer.cashbackEntries ?? []).map((entry) => {
                const title =
                  entry.label?.trim() ||
                  (entry.amount < 0 ? t('cashbackHistoryRedeem') : t('cashbackHistoryAward'))
                const awardDetail =
                  entry.amount > 0 && entry.paymentAmount !== null && entry.cashbackPercent !== null
                    ? t('cashbackHistoryAwardDetail', {
                        payment: formatIdr(entry.paymentAmount),
                        percent: entry.cashbackPercent,
                      })
                    : null
                return (
                  <li key={entry.id} className="rounded-lg border border-border px-3 py-3 text-sm">
                    <div className="flex items-baseline justify-between gap-3">
                      <span className="min-w-0 flex-1 font-medium">{title}</span>
                      <span
                        className={`shrink-0 tabular-nums ${
                          entry.amount < 0 ? 'text-destructive' : 'text-foreground'
                        }`}
                      >
                        {formatIdr(entry.amount)}
                      </span>
                    </div>
                    {awardDetail ? (
                      <p className="mt-1 text-xs text-muted-foreground">{awardDetail}</p>
                    ) : null}
                    <p className="mt-1 text-xs text-muted-foreground">
                      {formatWhen(entry.createdAt, t('neverSeen'))}
                    </p>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      </div>

      <div className="space-y-3">
        <h3 className="text-sm font-medium">{t('detailDevices')}</h3>
        {(customer.devices ?? []).length === 0 ? (
          <p className="text-sm text-muted-foreground">{t('detailDevicesEmpty')}</p>
        ) : (
          <ul className="space-y-3">
            {(customer.devices ?? []).map((device) => {
              const revoked = device.revokedAt !== null
              return (
                <li key={device.id} className="rounded-lg border border-border px-3 py-3 text-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-medium capitalize">{device.platform}</span>
                        {revoked ? (
                          <Badge variant="secondary">{t('deviceRevokedBadge')}</Badge>
                        ) : null}
                      </div>
                      {device.label ? (
                        <p className="text-muted-foreground">{device.label}</p>
                      ) : null}
                      <p className="text-xs text-muted-foreground">
                        {t('deviceLastSeen')}: {formatWhen(device.lastSeenAt, t('neverSeen'))}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {t('deviceCreated')}: {formatWhen(device.createdAt, t('neverSeen'))}
                      </p>
                    </div>
                    {!revoked ? (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={isRevoking}
                        onClick={() => setPendingRevoke(device)}
                      >
                        {t('deviceRevoke')}
                      </Button>
                    ) : null}
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </div>

      <Button
        type="button"
        variant="destructive"
        className="gap-2 self-start"
        disabled={isDeleting}
        onClick={() => setPendingDelete(true)}
      >
        <Trash2 className="size-4" aria-hidden />
        {t('delete')}
      </Button>

      <AlertDialog
        open={pendingDelete}
        onOpenChange={(open) => {
          if (!open && !isDeleting) {
            setPendingDelete(false)
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('deleteConfirmTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('deleteConfirmDescription', { phone: customer.phoneMasked })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting} type="button">
              {t('deleteConfirmCancel')}
            </AlertDialogCancel>
            <Button
              type="button"
              variant="destructive"
              disabled={isDeleting}
              onClick={confirmDelete}
              className="gap-2"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="size-4 animate-spin" aria-hidden />
                  {t('deleting')}
                </>
              ) : (
                t('deleteConfirmAction')
              )}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={pendingRevoke !== null}
        onOpenChange={(open) => {
          if (!open && !isRevoking) {
            setPendingRevoke(null)
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('deviceRevokeConfirmTitle')}</AlertDialogTitle>
            <AlertDialogDescription>{t('deviceRevokeConfirmDescription')}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isRevoking} type="button">
              {t('deviceRevokeConfirmCancel')}
            </AlertDialogCancel>
            <Button
              type="button"
              variant="destructive"
              disabled={isRevoking || pendingRevoke === null}
              onClick={confirmRevoke}
              className="gap-2"
            >
              {isRevoking ? (
                <>
                  <Loader2 className="size-4 animate-spin" aria-hidden />
                  {t('deviceRevoking')}
                </>
              ) : (
                t('deviceRevokeConfirmAction')
              )}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
