'use client'

import { useTranslations } from 'next-intl'
import { ImageIcon, Play, RotateCcw } from 'lucide-react'

import { Alert, AlertDescription, AlertTitle } from '@workspace/ui/components/alert'
import { Badge } from '@workspace/ui/components/badge'
import { Button } from '@workspace/ui/components/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@workspace/ui/components/card'
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from '@workspace/ui/components/empty'
import { Progress } from '@workspace/ui/components/progress'
import { Spinner } from '@workspace/ui/components/spinner'
import { cn } from '@workspace/ui/lib/utils'

import type { ArtworkGenerateResult, VisualBriefResult } from '@/lib/playbooks/client-api'

export type ArtworkProgress = {
  current: number
  total: number
  name: string
}

export type ArtworkHolidayItem = {
  id: string
  date: string
  name: string
  brief: VisualBriefResult
  caption: string
}

export type ArtworkItemStatus = 'pending' | 'loading' | 'ready' | 'error'

export type ConfirmedArtwork = ArtworkHolidayItem & {
  image: ArtworkGenerateResult
}

type PublicHolidaysArtworkProps = {
  holidays: ArtworkHolidayItem[]
  confirmedArtworks: ConfirmedArtwork[]
  statuses: Record<string, ArtworkItemStatus>
  results: Record<string, ArtworkGenerateResult>
  running: boolean
  progress: ArtworkProgress | null
  formatDate: (iso: string) => string
  onGenerate: () => void
  onConfirm: (id: string) => void
  onSkip: (id: string) => void
  onRetry: (id: string) => void
  onRemoveConfirmed: (id: string) => void
}

function ArtworkImagePlaceholder({ label }: { label: string }) {
  return (
    <div
      className="mx-auto flex aspect-[9/16] h-56 w-auto shrink-0 flex-col items-center justify-center gap-1.5 rounded-md border border-dashed border-border/70 bg-muted/70"
      role="img"
      aria-label={label}
    >
      <ImageIcon className="size-8 text-muted-foreground" aria-hidden />
      <span className="px-2 text-center text-xs text-muted-foreground">{label}</span>
    </div>
  )
}

function ArtworkImagePreview({
  url,
  alt,
  placeholderLabel,
}: {
  url?: string
  alt: string
  placeholderLabel: string
}) {
  if (!url) {
    return <ArtworkImagePlaceholder label={placeholderLabel} />
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element -- short-lived / generated asset URLs
    <img
      src={url}
      alt={alt}
      className="mx-auto aspect-[9/16] h-56 w-auto shrink-0 rounded-md border border-border/70 object-cover"
    />
  )
}

export function PublicHolidaysArtwork({
  holidays,
  confirmedArtworks,
  statuses,
  results,
  running,
  progress,
  formatDate,
  onGenerate,
  onConfirm,
  onSkip,
  onRetry,
  onRemoveConfirmed,
}: PublicHolidaysArtworkProps) {
  const t = useTranslations('playbooks.items.publicHolidays.workspace.artwork')

  const generateDisabled = running || holidays.length === 0
  const progressValue =
    progress && progress.total > 0 ? Math.round((progress.current / progress.total) * 100) : 0

  return (
    <div className="flex flex-col gap-4">
      <Card className="gap-4 py-4">
        <CardHeader>
          <CardTitle className="text-sm">{t('settingsTitle')}</CardTitle>
          <CardDescription>{t('settingsDescription')}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {progress ? (
            <div className="flex flex-col gap-2" aria-live="polite">
              <p className="text-muted-foreground text-sm">
                {t('progressStatus', {
                  name: progress.name,
                  current: progress.current,
                  total: progress.total,
                })}
              </p>
              <Progress value={progressValue} aria-label={t('progressAria')} />
            </div>
          ) : (
            <p className="text-muted-foreground text-sm">{t('generateHint')}</p>
          )}
        </CardContent>
        <CardFooter className="justify-end border-t pt-4">
          <Button type="button" onClick={onGenerate} disabled={generateDisabled}>
            {running ? <Spinner data-icon="inline-start" /> : <Play data-icon="inline-start" />}
            {running ? t('generating') : t('generate')}
          </Button>
        </CardFooter>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="gap-4 py-4">
          <CardHeader>
            <div className="flex items-center gap-2">
              <CardTitle className="text-sm">{t('candidatesTitle')}</CardTitle>
              <Badge variant="outline" className="font-normal">
                {t('candidatesCount', { count: holidays.length })}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            {holidays.length === 0 ? (
              <Empty className="border border-dashed border-border/70 py-8 md:py-10">
                <EmptyHeader>
                  <EmptyTitle>{t('candidatesEmptyTitle')}</EmptyTitle>
                  <EmptyDescription>{t('candidatesEmptyDescription')}</EmptyDescription>
                </EmptyHeader>
              </Empty>
            ) : (
              <ul className="divide-y divide-border/60 rounded-lg border border-border/60">
                {holidays.map((item) => {
                  const status = statuses[item.id] ?? 'pending'
                  const image = results[item.id]
                  const canConfirm = status === 'ready' && Boolean(image)

                  return (
                    <li key={item.id} className="flex flex-col gap-3 px-3 py-3">
                      <div className="flex min-w-0 items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium">{item.name}</p>
                          <p className="text-muted-foreground text-xs tabular-nums">
                            {formatDate(item.date)}
                          </p>
                        </div>
                        {status === 'loading' ? (
                          <Spinner className="size-4 shrink-0" aria-label={t('generatingAria')} />
                        ) : status === 'pending' ? (
                          <Badge variant="outline" className="shrink-0 font-normal">
                            {t('statusPending')}
                          </Badge>
                        ) : status === 'error' ? (
                          <Badge variant="destructive" className="shrink-0 font-normal">
                            {t('statusError')}
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="shrink-0 font-normal">
                            {t('statusReady')}
                          </Badge>
                        )}
                      </div>

                      <div
                        className={cn(
                          'flex flex-col gap-3 rounded-lg bg-muted/40 p-3 sm:flex-row sm:items-start',
                          status === 'loading' && 'opacity-60',
                        )}
                      >
                        <ArtworkImagePreview
                          url={image?.url}
                          alt={item.name}
                          placeholderLabel={t('imagePlaceholder')}
                        />
                        <div className="flex min-w-0 flex-1 flex-col gap-2">
                          <div>
                            <p className="text-muted-foreground text-xs font-medium">
                              {t('captionLabel')}
                            </p>
                            <p className="text-sm whitespace-pre-wrap">{item.caption}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground text-xs font-medium">
                              {t('sceneLabel')}
                            </p>
                            <p className="text-sm whitespace-pre-wrap">{item.brief.scene}</p>
                          </div>
                        </div>
                      </div>

                      {status === 'error' ? (
                        <Alert variant="destructive">
                          <AlertTitle>{t('generateErrorTitle')}</AlertTitle>
                          <AlertDescription>{t('generateError')}</AlertDescription>
                        </Alert>
                      ) : null}

                      <div className="flex flex-wrap justify-end gap-2">
                        {status === 'error' ? (
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            disabled={running}
                            onClick={() => onRetry(item.id)}
                          >
                            <RotateCcw data-icon="inline-start" />
                            {t('retry')}
                          </Button>
                        ) : null}
                        <Button
                          type="button"
                          size="sm"
                          disabled={!canConfirm || running}
                          title={canConfirm ? undefined : t('confirmDisabledHint')}
                          onClick={() => onConfirm(item.id)}
                        >
                          {t('confirm')}
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          disabled={running || status === 'loading'}
                          onClick={() => onSkip(item.id)}
                        >
                          {t('skip')}
                        </Button>
                      </div>
                    </li>
                  )
                })}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card className="gap-4 py-4">
          <CardHeader>
            <div className="flex items-center gap-2">
              <CardTitle className="text-sm">{t('confirmedTitle')}</CardTitle>
              <Badge variant="outline" className="font-normal">
                {t('confirmedCount', { count: confirmedArtworks.length })}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            {confirmedArtworks.length === 0 ? (
              <Empty className="border border-dashed border-border/70 py-8 md:py-10">
                <EmptyHeader>
                  <EmptyTitle>{t('confirmedEmptyTitle')}</EmptyTitle>
                  <EmptyDescription>{t('confirmedEmptyDescription')}</EmptyDescription>
                </EmptyHeader>
              </Empty>
            ) : (
              <ul className="divide-y divide-border/60 rounded-lg border border-border/60">
                {confirmedArtworks.map((item) => (
                  <li key={item.id} className="flex flex-col gap-3 px-3 py-3">
                    <div className="flex min-w-0 items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{item.name}</p>
                        <p className="text-muted-foreground text-xs tabular-nums">
                          {formatDate(item.date)}
                        </p>
                      </div>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        disabled={running}
                        onClick={() => onRemoveConfirmed(item.id)}
                      >
                        {t('remove')}
                      </Button>
                    </div>
                    <div className="flex flex-col gap-3 rounded-lg bg-muted/40 p-3 sm:flex-row sm:items-start">
                      <ArtworkImagePreview
                        url={item.image.url}
                        alt={item.name}
                        placeholderLabel={t('imagePlaceholder')}
                      />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm whitespace-pre-wrap">{item.caption}</p>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
