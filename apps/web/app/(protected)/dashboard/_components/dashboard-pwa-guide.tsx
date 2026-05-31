'use client'

import { useState } from 'react'
import { Download, Monitor, Smartphone, TabletSmartphone } from 'lucide-react'
import { useTranslations } from 'next-intl'

import { Alert, AlertDescription } from '@workspace/ui/components/alert'
import { Badge } from '@workspace/ui/components/badge'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@workspace/ui/components/card'
import { Separator } from '@workspace/ui/components/separator'
import { ToggleGroup, ToggleGroupItem } from '@workspace/ui/components/toggle-group'

const PLATFORMS = ['ios', 'android', 'desktop'] as const

type Platform = (typeof PLATFORMS)[number]

const PLATFORM_ICONS: Record<Platform, typeof Smartphone> = {
  ios: Smartphone,
  android: TabletSmartphone,
  desktop: Monitor,
}

const STEP_KEYS = ['step1', 'step2', 'step3'] as const

export function DashboardPwaGuide() {
  const t = useTranslations('platform.dashboard.pwa')
  const [platform, setPlatform] = useState<Platform>('ios')

  const PlatformIcon = PLATFORM_ICONS[platform]

  return (
    <section aria-labelledby="dashboard-pwa-heading" className="flex flex-col gap-4">
      <div className="flex flex-col gap-1 px-0.5">
        <div className="flex items-center gap-2">
          <Download aria-hidden className="text-muted-foreground" />
          <h2 className="font-semibold text-base tracking-tight" id="dashboard-pwa-heading">
            {t('sectionTitle')}
          </h2>
        </div>
        <p className="text-muted-foreground text-sm leading-relaxed">{t('sectionHint')}</p>
      </div>

      <ToggleGroup
        className="grid w-full grid-cols-3 gap-1.5"
        onValueChange={(value) => {
          if (value) {
            setPlatform(value as Platform)
          }
        }}
        type="single"
        value={platform}
      >
        {PLATFORMS.map((key) => {
          const Icon = PLATFORM_ICONS[key]
          return (
            <ToggleGroupItem
              aria-label={t(`platforms.${key}.label`)}
              className="min-h-11 flex-col gap-1 px-2 py-2.5 sm:min-h-10 sm:flex-row sm:gap-2 sm:px-3"
              key={key}
              value={key}
            >
              <Icon aria-hidden />
              <span className="truncate text-xs sm:text-sm">{t(`platforms.${key}.label`)}</span>
            </ToggleGroupItem>
          )
        })}
      </ToggleGroup>

      <Card className="gap-0 py-0 shadow-none">
        <CardHeader className="flex flex-row items-start gap-3 border-b px-4 py-4 sm:px-6">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted">
            <PlatformIcon aria-hidden className="text-foreground" />
          </div>
          <div className="min-w-0 flex-1">
            <CardTitle className="text-base">{t(`platforms.${platform}.label`)}</CardTitle>
            <CardDescription className="text-pretty">
              {t(`platforms.${platform}.browser`)}
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="px-4 py-2 sm:px-6">
          <ol className="flex flex-col">
            {STEP_KEYS.map((stepKey, index) => (
              <li key={stepKey}>
                <div className="flex items-start gap-3 py-3.5 sm:py-3">
                  <Badge
                    className="size-7 shrink-0 justify-center rounded-full p-0 tabular-nums"
                    variant="secondary"
                  >
                    {index + 1}
                  </Badge>
                  <p className="min-w-0 pt-0.5 text-sm leading-relaxed">
                    {t(`platforms.${platform}.steps.${stepKey}`)}
                  </p>
                </div>
                {index < STEP_KEYS.length - 1 ? <Separator /> : null}
              </li>
            ))}
          </ol>
        </CardContent>
      </Card>

      <Alert className="border-muted/60 bg-muted/40">
        <Smartphone aria-hidden />
        <AlertDescription>{t('installHint')}</AlertDescription>
      </Alert>
    </section>
  )
}
