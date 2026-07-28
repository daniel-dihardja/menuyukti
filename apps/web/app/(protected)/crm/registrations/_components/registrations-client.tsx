'use client'

import { useEffect, useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Check, Copy, Eye, Loader2, QrCode, RefreshCw, Trash2 } from 'lucide-react'
import { QRCodeSVG } from 'qrcode.react'
import { toast } from 'sonner'

import {
  awardCrmCashback,
  createCrmEnrollmentToken,
  deleteCrmCustomer,
  getCrmCustomer,
  listCrmCustomers,
  revokeCrmDevice,
  type CrmCustomer,
  type CrmDevice,
  type CrmEnrollmentToken,
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@workspace/ui/components/dialog'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@workspace/ui/components/sheet'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@workspace/ui/components/table'

import { AppSelect } from './app-select'

type AppOption = {
  id: number
  appId: string
  title: string
  cashbackThresholdAmount: number
  cashbackPercent: number
}

type CashbackMode = 'award' | 'redeem'

type Props = {
  apps: AppOption[]
  initialAppId: number | null
  initialCustomers: CrmCustomer[]
}

function formatCountdown(msRemaining: number): string {
  const totalSeconds = Math.max(0, Math.ceil(msRemaining / 1000))
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${minutes}:${String(seconds).padStart(2, '0')}`
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

export function RegistrationsClient({ apps, initialAppId, initialCustomers }: Props) {
  const t = useTranslations('platform.crm.registrations')
  const router = useRouter()
  const [appId, setAppId] = useState<number | null>(initialAppId)
  const [customers, setCustomers] = useState(initialCustomers)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [enrollment, setEnrollment] = useState<CrmEnrollmentToken | null>(null)
  const [msRemaining, setMsRemaining] = useState(0)
  const [copied, setCopied] = useState(false)
  const [pendingDelete, setPendingDelete] = useState<CrmCustomer | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [detailCustomer, setDetailCustomer] = useState<CrmCustomer | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [pendingRevoke, setPendingRevoke] = useState<CrmDevice | null>(null)
  const [isRevoking, setIsRevoking] = useState(false)
  const [awardMode, setAwardMode] = useState<CashbackMode>('award')
  const [awardAmount, setAwardAmount] = useState('')
  const [awardLabel, setAwardLabel] = useState('')
  const [isAwarding, setIsAwarding] = useState(false)
  const [isMinting, startMintTransition] = useTransition()
  const [isRefreshing, startRefreshTransition] = useTransition()

  useEffect(() => {
    setAppId(initialAppId)
  }, [initialAppId])

  useEffect(() => {
    setCustomers(initialCustomers)
  }, [initialCustomers])

  useEffect(() => {
    if (initialAppId !== null) return
    if (appId !== null) {
      if (apps.length > 0 && !apps.some((a) => a.id === appId)) {
        setAppId(null)
      }
      return
    }
    if (apps.length !== 1) return
    const [onlyApp] = apps
    if (!onlyApp) return
    setAppId(onlyApp.id)
  }, [initialAppId, appId, apps])

  useEffect(() => {
    if (appId === null) return
    if (appId === initialAppId) return
    router.replace(routes.crmRegistrationsWithApp(appId))
  }, [appId, initialAppId, router])

  useEffect(() => {
    if (!enrollment) {
      setMsRemaining(0)
      return
    }
    const expiresAt = new Date(enrollment.expiresAt).getTime()
    const tick = () => setMsRemaining(expiresAt - Date.now())
    tick()
    const id = window.setInterval(tick, 1000)
    return () => window.clearInterval(id)
  }, [enrollment])

  const activeAppId = appId ?? initialAppId
  const expired = enrollment !== null && msRemaining <= 0
  const detailOpen = detailCustomer !== null || detailLoading

  const mintToken = (selectedAppId: number) => {
    startMintTransition(async () => {
      try {
        const next = await createCrmEnrollmentToken(selectedAppId)
        setEnrollment(next)
        setCopied(false)
        setDialogOpen(true)
      } catch (err) {
        toast.error(err instanceof Error ? err.message : t('toast.enrollError'))
      }
    })
  }

  const refreshCustomers = (selectedAppId: number) => {
    startRefreshTransition(async () => {
      try {
        const rows = await listCrmCustomers(selectedAppId)
        setCustomers(rows)
      } catch (err) {
        toast.error(err instanceof Error ? err.message : t('toast.loadError'))
      }
    })
  }

  const openDetail = (customerId: string) => {
    setDetailLoading(true)
    setDetailCustomer(null)
    setAwardAmount('')
    setAwardLabel('')
    void (async () => {
      try {
        const customer = await getCrmCustomer(customerId)
        if (!customer) {
          toast.error(t('toast.detailError'))
          setDetailLoading(false)
          return
        }
        setDetailCustomer(customer)
      } catch (err) {
        toast.error(err instanceof Error ? err.message : t('toast.detailError'))
      } finally {
        setDetailLoading(false)
      }
    })()
  }

  const closeDetail = () => {
    if (isRevoking || isAwarding) return
    setDetailCustomer(null)
    setDetailLoading(false)
    setPendingRevoke(null)
    setAwardMode('award')
    setAwardAmount('')
    setAwardLabel('')
  }

  const activeApp = apps.find((app) => app.id === activeAppId) ?? null
  const parsedAwardAmount = parsePositiveInt(awardAmount)
  const awardPreviewCredit =
    awardMode === 'award' &&
    activeApp !== null &&
    parsedAwardAmount !== null &&
    parsedAwardAmount >= activeApp.cashbackThresholdAmount
      ? Math.floor((parsedAwardAmount * activeApp.cashbackPercent) / 100)
      : null

  const handleAwardCashback = () => {
    if (!detailCustomer || isAwarding || parsedAwardAmount === null) return
    const label = awardLabel.trim()
    setIsAwarding(true)
    void (async () => {
      try {
        if (awardMode === 'award') {
          await awardCrmCashback(detailCustomer.id, {
            paymentAmount: parsedAwardAmount,
            ...(label ? { label } : {}),
          })
        } else {
          await awardCrmCashback(detailCustomer.id, {
            redeemAmount: parsedAwardAmount,
            ...(label ? { label } : {}),
          })
        }
        setAwardAmount('')
        setAwardLabel('')
        toast.success(t('toast.awarded'))
      } catch (err) {
        toast.error(err instanceof Error ? err.message : t('toast.awardError'))
      } finally {
        setIsAwarding(false)
      }
    })()
  }

  const handleCopy = async () => {
    if (!enrollment) return
    try {
      await navigator.clipboard.writeText(enrollment.enrollUrl)
      setCopied(true)
      toast.success(t('toast.copied'))
    } catch {
      toast.error(t('toast.copyError'))
    }
  }

  const confirmDelete = () => {
    if (pendingDelete === null || isDeleting) return
    const customer = pendingDelete
    setIsDeleting(true)
    void (async () => {
      try {
        await deleteCrmCustomer(customer.id)
        setCustomers((prev) => prev.filter((row) => row.id !== customer.id))
        if (detailCustomer?.id === customer.id) {
          setDetailCustomer(null)
        }
        setPendingDelete(null)
        toast.success(t('toast.deleted'))
        router.refresh()
      } catch (err) {
        toast.error(err instanceof Error ? err.message : t('toast.deleteError'))
      } finally {
        setIsDeleting(false)
      }
    })()
  }

  const confirmRevoke = () => {
    if (pendingRevoke === null || isRevoking || detailCustomer === null) return
    const device = pendingRevoke
    const customerId = detailCustomer.id
    setIsRevoking(true)
    void (async () => {
      try {
        await revokeCrmDevice(device.id)
        const refreshed = await getCrmCustomer(customerId)
        if (refreshed) setDetailCustomer(refreshed)
        if (activeAppId !== null) {
          const rows = await listCrmCustomers(activeAppId)
          setCustomers(rows)
        }
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

  if (apps.length === 0) {
    return (
      <div className="flex flex-col items-start gap-3">
        <p className="text-sm text-muted-foreground">{t('noApps')}</p>
        <Button asChild variant="outline" size="sm">
          <Link href={routes.crmApps}>{t('noAppsCta')}</Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <AppSelect
          apps={apps}
          value={activeAppId}
          onValueChange={setAppId}
          id="crm-registrations-app-select"
          label={t('appLabel')}
          placeholder={apps.length > 1 ? t('appPlaceholder') : undefined}
          description={t('appDescription')}
          className="w-full max-w-none sm:max-w-xs"
        />
        <div className="flex shrink-0 gap-2">
          <Button
            type="button"
            variant="outline"
            className="gap-2"
            disabled={activeAppId === null || isRefreshing}
            onClick={() => {
              if (activeAppId === null) return
              refreshCustomers(activeAppId)
            }}
          >
            {isRefreshing ? (
              <Loader2 className="size-4 animate-spin" aria-hidden />
            ) : (
              <RefreshCw className="size-4" aria-hidden />
            )}
            {t('refresh')}
          </Button>
          <Button
            type="button"
            className="gap-2"
            disabled={activeAppId === null || isMinting}
            onClick={() => {
              if (activeAppId === null) return
              mintToken(activeAppId)
            }}
          >
            {isMinting ? (
              <Loader2 className="size-4 animate-spin" aria-hidden />
            ) : (
              <QrCode className="size-4" aria-hidden />
            )}
            {t('enrollQr')}
          </Button>
        </div>
      </div>

      {activeAppId === null ? (
        <p className="text-sm text-muted-foreground">{t('selectApp')}</p>
      ) : customers.length === 0 ? (
        <div
          className="flex flex-col items-start gap-2 rounded-lg border border-dashed border-border px-6 py-12"
          role="status"
        >
          <p className="text-base font-medium tracking-tight">{t('emptyTitle')}</p>
          <p className="max-w-md text-sm text-muted-foreground">{t('emptyDescription')}</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('columns.phone')}</TableHead>
                <TableHead>{t('columns.enrolledAt')}</TableHead>
                <TableHead className="text-right">{t('columns.devices')}</TableHead>
                <TableHead>{t('columns.lastSeen')}</TableHead>
                <TableHead>{t('columns.status')}</TableHead>
                <TableHead className="w-[1%] text-right">
                  <span className="sr-only">{t('columns.actions')}</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {customers.map((row) => (
                <TableRow
                  key={row.id}
                  className="cursor-pointer"
                  onClick={() => openDetail(row.id)}
                >
                  <TableCell className="font-medium tabular-nums">{row.phoneMasked}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {new Date(row.createdAt).toLocaleString()}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{row.deviceCount}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatWhen(row.lastSeenAt, t('neverSeen'))}
                  </TableCell>
                  <TableCell>
                    <Badge variant={row.status === 'ACTIVE' ? 'default' : 'secondary'}>
                      {t(`status.${row.status}`)}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="gap-2"
                        onClick={() => openDetail(row.id)}
                        aria-label={t('view')}
                      >
                        <Eye className="size-4" aria-hidden />
                        {t('view')}
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="gap-2 text-destructive hover:text-destructive"
                        disabled={isDeleting}
                        onClick={() => setPendingDelete(row)}
                        aria-label={t('delete')}
                      >
                        <Trash2 className="size-4" aria-hidden />
                        {t('delete')}
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open)
          if (!open && activeAppId !== null) {
            refreshCustomers(activeAppId)
            router.refresh()
          }
        }}
      >
        <DialogContent className="sm:max-w-md" closeLabel={t('dialogClose')}>
          <DialogHeader>
            <DialogTitle>{t('dialogTitle')}</DialogTitle>
            <DialogDescription>{t('dialogDescription')}</DialogDescription>
          </DialogHeader>

          {enrollment ? (
            <div className="flex flex-col items-center gap-4 py-2">
              <div className="rounded-lg bg-white p-3">
                <QRCodeSVG value={enrollment.enrollUrl} size={200} level="M" />
              </div>
              <p
                className={`text-sm tabular-nums ${expired ? 'text-destructive' : 'text-muted-foreground'}`}
              >
                {expired ? t('expired') : t('expiresIn', { time: formatCountdown(msRemaining) })}
              </p>
              <p className="w-full break-all rounded-md bg-muted px-3 py-2 font-mono text-xs">
                {enrollment.enrollUrl}
              </p>
            </div>
          ) : null}

          <DialogFooter className="flex-col gap-2 sm:flex-row">
            <Button
              type="button"
              variant="outline"
              className="gap-2"
              onClick={() => void handleCopy()}
            >
              {copied ? (
                <Check className="size-4" aria-hidden />
              ) : (
                <Copy className="size-4" aria-hidden />
              )}
              {t('copyLink')}
            </Button>
            {(expired || enrollment) && activeAppId !== null ? (
              <Button
                type="button"
                variant={expired ? 'default' : 'secondary'}
                className="gap-2"
                disabled={isMinting}
                onClick={() => mintToken(activeAppId)}
              >
                {isMinting ? (
                  <Loader2 className="size-4 animate-spin" aria-hidden />
                ) : (
                  <RefreshCw className="size-4" aria-hidden />
                )}
                {t('regenerate')}
              </Button>
            ) : null}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Sheet
        open={detailOpen}
        onOpenChange={(open) => {
          if (!open) closeDetail()
        }}
      >
        <SheetContent className="flex w-full flex-col gap-0 overflow-y-auto sm:max-w-lg">
          <SheetHeader className="border-b border-border px-6 py-5 pr-12">
            <SheetTitle>{t('detailTitle')}</SheetTitle>
            <SheetDescription>{t('detailDescription')}</SheetDescription>
          </SheetHeader>

          <div className="flex flex-1 flex-col gap-6 px-6 py-5">
            {detailLoading || !detailCustomer ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="size-4 animate-spin" aria-hidden />
                {t('detailLoading')}
              </div>
            ) : (
              <div className="flex flex-col gap-6">
                <dl className="grid gap-3 text-sm">
                  <div>
                    <dt className="text-muted-foreground">{t('detailPhone')}</dt>
                    <dd className="font-medium tabular-nums">{detailCustomer.phoneMasked}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">{t('detailName')}</dt>
                    <dd>{customerDisplayName(detailCustomer) || t('detailNameEmpty')}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">{t('detailId')}</dt>
                    <dd className="break-all font-mono text-xs">{detailCustomer.id}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">{t('columns.status')}</dt>
                    <dd className="pt-1">
                      <Badge variant={detailCustomer.status === 'ACTIVE' ? 'default' : 'secondary'}>
                        {t(`status.${detailCustomer.status}`)}
                      </Badge>
                    </dd>
                  </div>
                </dl>

                <div className="space-y-3 border-t border-border pt-5">
                  <div className="space-y-1">
                    <h3 className="text-sm font-medium">{t('awardCashbackTitle')}</h3>
                    <p className="text-sm text-muted-foreground">{t('awardCashbackDescription')}</p>
                    {activeApp ? (
                      <p className="text-sm text-muted-foreground">
                        {t('awardRuleSummary', {
                          percent: activeApp.cashbackPercent,
                          threshold: formatIdr(activeApp.cashbackThresholdAmount),
                        })}
                      </p>
                    ) : null}
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
                        awardMode === 'award'
                          ? t('awardPaymentPlaceholder')
                          : t('awardRedeemPlaceholder')
                      }
                      disabled={isAwarding}
                    />
                    <FieldDescription>
                      {awardMode === 'award' ? t('awardPaymentHelp') : t('awardRedeemHelp')}
                    </FieldDescription>
                    {awardMode === 'award' && activeApp && parsedAwardAmount !== null ? (
                      <p className="text-sm text-muted-foreground">
                        {parsedAwardAmount < activeApp.cashbackThresholdAmount
                          ? t('awardPreviewBelowThreshold', {
                              threshold: formatIdr(activeApp.cashbackThresholdAmount),
                            })
                          : awardPreviewCredit !== null && awardPreviewCredit > 0
                            ? t('awardPreview', {
                                amount: formatIdr(awardPreviewCredit),
                                percent: activeApp.cashbackPercent,
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
                </div>

                <div className="space-y-3">
                  <h3 className="text-sm font-medium">{t('detailDevices')}</h3>
                  {(detailCustomer.devices ?? []).length === 0 ? (
                    <p className="text-sm text-muted-foreground">{t('detailDevicesEmpty')}</p>
                  ) : (
                    <ul className="space-y-3">
                      {(detailCustomer.devices ?? []).map((device) => {
                        const revoked = device.revokedAt !== null
                        return (
                          <li
                            key={device.id}
                            className="rounded-lg border border-border px-3 py-3 text-sm"
                          >
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
                                  {t('deviceLastSeen')}:{' '}
                                  {formatWhen(device.lastSeenAt, t('neverSeen'))}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {t('deviceCreated')}:{' '}
                                  {formatWhen(device.createdAt, t('neverSeen'))}
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
                  onClick={() => setPendingDelete(detailCustomer)}
                >
                  <Trash2 className="size-4" aria-hidden />
                  {t('delete')}
                </Button>
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>

      <AlertDialog
        open={pendingDelete !== null}
        onOpenChange={(open) => {
          if (!open && !isDeleting) {
            setPendingDelete(null)
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('deleteConfirmTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingDelete
                ? t('deleteConfirmDescription', { phone: pendingDelete.phoneMasked })
                : null}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting} type="button">
              {t('deleteConfirmCancel')}
            </AlertDialogCancel>
            <Button
              type="button"
              variant="destructive"
              disabled={isDeleting || pendingDelete === null}
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
