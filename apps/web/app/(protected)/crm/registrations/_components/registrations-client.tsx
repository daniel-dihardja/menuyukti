'use client'

import { useEffect, useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Check, Copy, Loader2, QrCode, RefreshCw, Trash2 } from 'lucide-react'
import { QRCodeSVG } from 'qrcode.react'
import { toast } from 'sonner'

import {
  createCrmEnrollmentToken,
  deleteCrmCustomer,
  listCrmCustomers,
  type CrmCustomer,
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
import { Button } from '@workspace/ui/components/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@workspace/ui/components/dialog'
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
}

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
                <TableHead>{t('columns.uuid')}</TableHead>
                <TableHead>{t('columns.enrolledAt')}</TableHead>
                <TableHead className="text-right">{t('columns.devices')}</TableHead>
                <TableHead className="w-[1%] text-right">
                  <span className="sr-only">{t('columns.actions')}</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {customers.map((row) => (
                <TableRow key={row.id}>
                  <TableCell className="font-mono text-xs font-medium">{row.id}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {new Date(row.createdAt).toLocaleString()}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{row.deviceCount}</TableCell>
                  <TableCell className="text-right">
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
              {pendingDelete ? t('deleteConfirmDescription', { uuid: pendingDelete.id }) : null}
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
    </div>
  )
}
