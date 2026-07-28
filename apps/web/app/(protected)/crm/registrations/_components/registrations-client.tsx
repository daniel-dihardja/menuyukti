'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { QrCode } from 'lucide-react'

import { routes } from '@/lib/routes'
import { Button } from '@workspace/ui/components/button'

import { AppSelect } from './app-select'

type AppOption = {
  id: number
  title: string
}

type Props = {
  apps: AppOption[]
  initialAppId: number | null
}

export function RegistrationsClient({ apps, initialAppId }: Props) {
  const t = useTranslations('platform.crm.registrations')
  const router = useRouter()
  const [appId, setAppId] = useState<number | null>(initialAppId)

  useEffect(() => {
    setAppId(initialAppId)
  }, [initialAppId])

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

  const activeAppId = appId ?? initialAppId

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
        <Button type="button" disabled title={t('enrollQrSoon')} className="shrink-0 gap-2">
          <QrCode className="size-4" aria-hidden />
          {t('enrollQr')}
        </Button>
      </div>

      {activeAppId === null ? (
        <p className="text-sm text-muted-foreground">{t('selectApp')}</p>
      ) : (
        <div
          className="flex flex-col items-start gap-2 rounded-lg border border-dashed border-border px-6 py-12"
          role="status"
        >
          <p className="text-base font-medium tracking-tight">{t('emptyTitle')}</p>
          <p className="max-w-md text-sm text-muted-foreground">{t('emptyDescription')}</p>
        </div>
      )}
    </div>
  )
}
