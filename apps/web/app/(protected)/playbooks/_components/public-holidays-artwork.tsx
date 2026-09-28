'use client'

import { useId } from 'react'
import { useTranslations } from 'next-intl'
import { ChevronDown, ImageIcon, Play } from 'lucide-react'

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
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@workspace/ui/components/collapsible'
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from '@workspace/ui/components/empty'
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from '@workspace/ui/components/field'
import { Textarea } from '@workspace/ui/components/textarea'

import { MediaCatalogPicker } from '@/components/media/media-catalog-picker'
import { mediaDownloadHref, type MediaCatalogItem } from '@/lib/media/client-api'
import type { StoryDraftResult } from '@/lib/playbooks/client-api'

export type ArtworkHolidayItem = {
  id: string
  date: string
  name: string
  result: StoryDraftResult
}

export type ArtworkStyleReference = {
  name: string
}

export type ArtworkItemStatus = 'pending' | 'loading' | 'ready' | 'error'

type PublicHolidaysArtworkProps = {
  holidays: ArtworkHolidayItem[]
  confirmedArtworks: ArtworkHolidayItem[]
  statuses: Record<string, ArtworkItemStatus>
  instructions: string
  onInstructionsChange: (value: string) => void
  styleReference: ArtworkStyleReference | null
  onStyleReferenceChange: (value: ArtworkStyleReference | null) => void
  formatDate: (iso: string) => string
  onConfirm: (id: string) => void
  onSkip: (id: string) => void
  onRemoveConfirmed: (id: string) => void
}

/** Instagram story frame (9:16 portrait) until generation is wired. */
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

export function PublicHolidaysArtwork({
  holidays,
  confirmedArtworks,
  statuses,
  instructions,
  onInstructionsChange,
  styleReference,
  onStyleReferenceChange,
  formatDate,
  onConfirm,
  onSkip,
  onRemoveConfirmed,
}: PublicHolidaysArtworkProps) {
  const t = useTranslations('playbooks.items.publicHolidays.workspace.artwork')
  const instructionsId = useId()

  const selectedImage = styleReference
    ? { name: styleReference.name, url: mediaDownloadHref(styleReference.name) }
    : null

  function handleSelectMedia(item: MediaCatalogItem) {
    onStyleReferenceChange({ name: item.name })
  }

  return (
    <div className="flex flex-col gap-4">
      <Card className="gap-4 py-4">
        <CardHeader>
          <CardTitle className="text-sm">{t('settingsTitle')}</CardTitle>
          <CardDescription>{t('settingsDescription')}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <FieldGroup className="gap-4">
            <Field>
              <FieldLabel htmlFor={instructionsId}>{t('instructionsLabel')}</FieldLabel>
              <Textarea
                id={instructionsId}
                value={instructions}
                onChange={(e) => onInstructionsChange(e.target.value)}
                placeholder={t('instructionsPlaceholder')}
                maxLength={2000}
                rows={3}
                className="min-h-20 resize-y"
              />
              <FieldDescription>{t('instructionsHint')}</FieldDescription>
            </Field>

            <Field>
              <FieldLabel>{t('styleReferenceLabel')}</FieldLabel>
              <MediaCatalogPicker
                selectedImage={selectedImage}
                onSelect={handleSelectMedia}
                onClear={() => onStyleReferenceChange(null)}
                pickLabel={t('styleReferencePick')}
                pickerAriaLabel={t('styleReferencePickerAria')}
                emptyLabel={t('styleReferenceEmpty')}
                removeLabel={t('styleReferenceRemove')}
                fromMediaLabel={t('styleReferenceFromMedia')}
              />
              <FieldDescription>{t('styleReferenceHint')}</FieldDescription>
            </Field>
          </FieldGroup>
        </CardContent>
        <CardFooter className="flex flex-col items-stretch gap-2 border-t pt-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-muted-foreground text-sm">{t('generateDisabledHint')}</p>
          <Button type="button" disabled className="sm:ml-auto">
            <Play data-icon="inline-start" />
            {t('generate')}
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
                  const canConfirm = status === 'ready'
                  return (
                  <li key={item.id} className="flex flex-col gap-3 px-3 py-3">
                    <div className="flex min-w-0 items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{item.name}</p>
                        <p className="text-muted-foreground text-xs tabular-nums">
                          {formatDate(item.date)}
                        </p>
                      </div>
                      <Badge variant="outline" className="shrink-0 font-normal">
                        {status === 'ready' ? t('statusReady') : t('statusPending')}
                      </Badge>
                    </div>

                    <div className="flex flex-col gap-3 rounded-lg bg-muted/40 p-3 sm:flex-row sm:items-start">
                      <ArtworkImagePlaceholder label={t('imagePlaceholder')} />
                      <div className="flex min-w-0 flex-1 flex-col gap-2">
                        <div>
                          <p className="text-muted-foreground text-xs font-medium">
                            {t('captionLabel')}
                          </p>
                          <p className="text-sm whitespace-pre-wrap">{item.result.caption}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground text-xs font-medium">
                            {t('visualBriefLabel')}
                          </p>
                          <p className="text-sm whitespace-pre-wrap">{item.result.visualBrief}</p>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap justify-end gap-2">
                      <Button
                        type="button"
                        size="sm"
                        disabled={!canConfirm}
                        title={canConfirm ? undefined : t('confirmDisabledHint')}
                        onClick={() => onConfirm(item.id)}
                      >
                        {t('confirm')}
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        disabled={status === 'loading'}
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
                        onClick={() => onRemoveConfirmed(item.id)}
                      >
                        {t('remove')}
                      </Button>
                    </div>
                    <div className="flex flex-col gap-3 rounded-lg bg-muted/40 p-3 sm:flex-row sm:items-start">
                      <ArtworkImagePlaceholder label={t('imagePlaceholder')} />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm whitespace-pre-wrap">{item.result.caption}</p>
                        <Collapsible className="mt-2">
                          <CollapsibleTrigger asChild>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="h-auto px-0 py-1 text-muted-foreground"
                            >
                              {t('visualBriefToggle')}
                              <ChevronDown data-icon="inline-end" />
                            </Button>
                          </CollapsibleTrigger>
                          <CollapsibleContent>
                            <p className="text-sm whitespace-pre-wrap text-muted-foreground">
                              {item.result.visualBrief}
                            </p>
                          </CollapsibleContent>
                        </Collapsible>
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
