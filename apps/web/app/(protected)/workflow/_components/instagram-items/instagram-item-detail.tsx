'use client'

import { useCallback, useEffect, useId, useMemo, useState, type KeyboardEvent } from 'react'
import { useTranslations } from 'next-intl'
import {
  ArrowLeftIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  SparklesIcon,
  Trash2Icon,
  XIcon,
} from 'lucide-react'
import { toast } from 'sonner'

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
import { DateTimePicker } from '@workspace/ui/components/date-time-picker'
import { Input } from '@workspace/ui/components/input'
import { Label } from '@workspace/ui/components/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@workspace/ui/components/select'
import { Spinner } from '@workspace/ui/components/spinner'
import { Textarea } from '@workspace/ui/components/textarea'
import { cn } from '@workspace/ui/lib/utils'

import { PostCreatorImagePicker } from '@/app/(protected)/ig-studio/post-creator/_components/post-creator-image-picker'
import { PostCreatorReferenceThumbnails } from '@/app/(protected)/ig-studio/post-creator/_components/post-creator-reference-thumbnails'
import type {
  InstagramItemDto,
  InstagramItemMediaVersionDto,
} from '@/lib/graphql/queries/instagram-items'
import { mediaDownloadHref } from '@/lib/media/client-api'
import {
  DEFAULT_LEONARDO_POST_MODEL,
  getLeonardoPostModelMessageKey,
  isLeonardoPostModelId,
  LEONARDO_POST_MODEL_IDS,
  type LeonardoPostModelId,
} from '@/lib/posts/leonardo-post-models'
import type { PostCreatorReferenceImage } from '@/lib/posts/post-creator-types'
import { resolveGenerationReferences } from '@/lib/posts/resolve-generation-references'

import {
  toFormValues,
  type InstagramItemFormValues,
  type InstagramItemKind,
  type InstagramItemStatus,
} from './use-instagram-items'

type InstagramItemDetailProps = {
  item: InstagramItemDto
  workflowId: string
  saving: boolean
  actionError: string | null
  onBack: () => void
  onSave: (values: InstagramItemFormValues) => Promise<void>
  onGenerated: (item: InstagramItemDto) => void
}

type ItemImageVersion = InstagramItemMediaVersionDto & { imageUrl: string | null }

function previewAspectClass(kind: InstagramItemKind): string {
  if (kind === 'post') return 'aspect-square'
  return 'aspect-[9/16]'
}

function refsFromItem(item: InstagramItemDto): PostCreatorReferenceImage[] {
  if (!Array.isArray(item.referenceImages)) return []
  return item.referenceImages.map((ref) => ({
    name: ref.name,
    enabled: ref.enabled !== false,
    url: mediaDownloadHref(ref.name),
  }))
}

function persistableRefs(
  images: PostCreatorReferenceImage[],
): InstagramItemFormValues['referenceImages'] {
  return images.map((image) => ({ name: image.name, enabled: image.enabled }))
}

function versionsFromItem(item: InstagramItemDto): ItemImageVersion[] {
  const raw = Array.isArray(item.mediaVersions) ? item.mediaVersions : []
  if (raw.length > 0) {
    return raw.map((version) => ({
      ...version,
      imageUrl: version.imageUrl ?? null,
    }))
  }
  if (item.imageUrl || item.mediaS3Key) {
    return [
      {
        id: 'current',
        mediaS3Key: item.mediaS3Key ?? '',
        prompt: item.generationPrompt ?? null,
        createdAt: item.updatedAt ?? item.createdAt ?? '',
        imageUrl: item.imageUrl ?? null,
      },
    ]
  }
  return []
}

function resolveVersionIndex(
  versions: ItemImageVersion[],
  activeMediaS3Key: string | null | undefined,
): number {
  if (activeMediaS3Key) {
    const byKey = versions.findIndex((version) => version.mediaS3Key === activeMediaS3Key)
    if (byKey >= 0) {
      return byKey
    }
  }
  return 0
}

function syncFromItem(item: InstagramItemDto): {
  versions: ItemImageVersion[]
  previewIndex: number
  committedIndex: number
  mediaS3Key: string | null
} {
  const versions = versionsFromItem(item)
  const committedIndex = resolveVersionIndex(versions, item.mediaS3Key)
  return {
    versions,
    previewIndex: committedIndex,
    committedIndex,
    mediaS3Key: item.mediaS3Key ?? null,
  }
}

export function InstagramItemDetail({
  item,
  workflowId,
  saving,
  actionError,
  onBack,
  onSave,
  onGenerated,
}: InstagramItemDetailProps) {
  const t = useTranslations('analytics.workflows.instagramItems')
  const tModel = useTranslations('postCreator.prompt.model')
  const tPicker = useTranslations('postCreator.prompt.picker')
  const tRefs = useTranslations('postCreator.prompt.references')
  const modelFieldId = useId()
  const modelBlurbId = useId()
  const [values, setValues] = useState<InstagramItemFormValues>(() => toFormValues(item))
  const [referenceImages, setReferenceImages] = useState<PostCreatorReferenceImage[]>(() =>
    refsFromItem(item),
  )
  const [generationModel, setGenerationModel] = useState<LeonardoPostModelId>(
    DEFAULT_LEONARDO_POST_MODEL,
  )
  const [isGenerating, setIsGenerating] = useState(false)
  const [generateError, setGenerateError] = useState<string | null>(null)
  const initialSync = syncFromItem(item)
  const [imageVersions, setImageVersions] = useState<ItemImageVersion[]>(initialSync.versions)
  const [previewVersionIndex, setPreviewVersionIndex] = useState(initialSync.previewIndex)
  const [committedVersionIndex, setCommittedVersionIndex] = useState(initialSync.committedIndex)
  const [mediaS3Key, setMediaS3Key] = useState<string | null>(initialSync.mediaS3Key)
  const [isCommitting, setIsCommitting] = useState(false)
  const [isDeletingVersion, setIsDeletingVersion] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)

  useEffect(() => {
    setValues(toFormValues(item))
    setReferenceImages(refsFromItem(item))
    const next = syncFromItem(item)
    setImageVersions(next.versions)
    setPreviewVersionIndex(next.previewIndex)
    setCommittedVersionIndex(next.committedIndex)
    setMediaS3Key(next.mediaS3Key)
    setGenerateError(null)
  }, [item])

  const selectedNames = useMemo(
    () => new Set(referenceImages.map((image) => image.name)),
    [referenceImages],
  )

  const busy = saving || isGenerating || isCommitting || isDeletingVersion
  const canGenerate = values.visualBrief.trim().length > 0 && !busy
  const showVersionNav = imageVersions.length > 1
  const previewVersion = imageVersions[previewVersionIndex] ?? imageVersions[0]
  const previewUrl = previewVersion?.imageUrl ?? null
  const canCommit =
    Boolean(previewVersion?.mediaS3Key) &&
    showVersionNav &&
    previewVersionIndex !== committedVersionIndex
  const canDeleteVersion = Boolean(previewVersion?.mediaS3Key) && imageVersions.length > 0 && !busy

  function valuesWithRefs(): InstagramItemFormValues {
    return {
      ...values,
      referenceImages: persistableRefs(referenceImages),
    }
  }

  function applyItemUpdate(nextItem: InstagramItemDto) {
    const next = syncFromItem(nextItem)
    setImageVersions(next.versions)
    setPreviewVersionIndex(next.previewIndex)
    setCommittedVersionIndex(next.committedIndex)
    setMediaS3Key(next.mediaS3Key)
    setValues(toFormValues(nextItem))
    setReferenceImages(refsFromItem(nextItem))
    onGenerated(nextItem)
  }

  const previewVersionAt = useCallback(
    (index: number) => {
      if (busy || imageVersions.length === 0) return
      setPreviewVersionIndex(index)
    },
    [busy, imageVersions.length],
  )

  const goPrev = useCallback(() => {
    if (!showVersionNav || busy) return
    previewVersionAt(previewVersionIndex === 0 ? imageVersions.length - 1 : previewVersionIndex - 1)
  }, [busy, imageVersions.length, previewVersionAt, previewVersionIndex, showVersionNav])

  const goNext = useCallback(() => {
    if (!showVersionNav || busy) return
    previewVersionAt(previewVersionIndex === imageVersions.length - 1 ? 0 : previewVersionIndex + 1)
  }, [busy, imageVersions.length, previewVersionAt, previewVersionIndex, showVersionNav])

  const handlePreviewKeyDown = useCallback(
    (event: KeyboardEvent<HTMLDivElement>) => {
      if (!showVersionNav) return
      if (event.key === 'ArrowLeft') {
        event.preventDefault()
        goPrev()
      } else if (event.key === 'ArrowRight') {
        event.preventDefault()
        goNext()
      }
    },
    [goNext, goPrev, showVersionNav],
  )

  async function handleGenerate() {
    const prompt = values.visualBrief.trim()
    if (!prompt) return

    const persistedRefs = persistableRefs(referenceImages)
    const { references, tooManyReferences } = resolveGenerationReferences({
      referenceImages,
      previewMediaS3Key: mediaS3Key,
      styleSelected: false,
      solidBackgroundEnabled: false,
    })

    if (tooManyReferences) {
      setGenerateError(t('generate.tooManyReferences'))
      return
    }

    setIsGenerating(true)
    setGenerateError(null)
    try {
      const res = await fetch(`/api/workflows/${workflowId}/instagram-items/${item.id}/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt,
          model: generationModel,
          referenceImages: persistedRefs,
          ...(references.length > 0 ? { references } : {}),
        }),
      })
      const payload = (await res.json().catch(() => ({}))) as {
        message?: string
        url?: string
        mediaS3Key?: string
        item?: InstagramItemDto
      }
      if (!res.ok) {
        setGenerateError(payload.message || t('generate.error'))
        return
      }
      if (payload.item) {
        applyItemUpdate(payload.item)
      } else if (payload.url || payload.mediaS3Key) {
        setMediaS3Key(payload.mediaS3Key ?? null)
        setImageVersions([
          {
            id: 'generated',
            mediaS3Key: payload.mediaS3Key ?? '',
            prompt,
            createdAt: new Date().toISOString(),
            imageUrl: payload.url ?? null,
          },
          ...imageVersions.filter((version) => version.mediaS3Key !== payload.mediaS3Key),
        ])
        setPreviewVersionIndex(0)
        setCommittedVersionIndex(0)
      }
    } catch {
      setGenerateError(t('generate.error'))
    } finally {
      setIsGenerating(false)
    }
  }

  async function handleCommitVersion() {
    const version = imageVersions[previewVersionIndex]
    if (!version?.mediaS3Key || !canCommit) return

    setIsCommitting(true)
    setGenerateError(null)
    try {
      const res = await fetch(`/api/workflows/${workflowId}/instagram-items/${item.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mediaS3Key: version.mediaS3Key }),
      })
      const payload = (await res.json().catch(() => ({}))) as {
        message?: string
        item?: InstagramItemDto
      }
      if (!res.ok || !payload.item) {
        setGenerateError(payload.message || t('generate.commitError'))
        return
      }
      applyItemUpdate(payload.item)
    } catch {
      setGenerateError(t('generate.commitError'))
    } finally {
      setIsCommitting(false)
    }
  }

  async function handleDeleteVersion() {
    const version = imageVersions[previewVersionIndex]
    if (!version?.mediaS3Key) return

    setIsDeletingVersion(true)
    setGenerateError(null)
    try {
      const res = await fetch(`/api/workflows/${workflowId}/instagram-items/${item.id}/versions`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mediaS3Key: version.mediaS3Key }),
      })
      const payload = (await res.json().catch(() => ({}))) as {
        message?: string
        item?: InstagramItemDto
      }
      if (!res.ok || !payload.item) {
        setGenerateError(payload.message || t('generate.deleteVersionError'))
        return
      }
      setDeleteDialogOpen(false)
      applyItemUpdate(payload.item)
    } catch {
      setGenerateError(t('generate.deleteVersionError'))
    } finally {
      setIsDeletingVersion(false)
    }
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <div className="flex items-center gap-2">
        <Button
          aria-label={t('backAria')}
          disabled={busy}
          onClick={onBack}
          size="icon"
          type="button"
          variant="ghost"
        >
          <ArrowLeftIcon className="size-4" />
        </Button>
        <h2 className="min-w-0 flex-1 truncate font-semibold text-base tracking-tight">
          {values.title.trim() ? values.title : t('untitled')}
        </h2>
      </div>

      <form
        className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto"
        onSubmit={(event) => {
          event.preventDefault()
          void onSave(valuesWithRefs())
        }}
      >
        <div className="grid gap-1.5">
          <Label>{t('generate.previewLabel')}</Label>
          <div
            className="mx-auto flex w-full max-w-[280px] items-center gap-1"
            onKeyDown={handlePreviewKeyDown}
            role="group"
            tabIndex={showVersionNav ? 0 : undefined}
          >
            {showVersionNav ? (
              <Button
                aria-label={t('generate.previousVersion')}
                className="size-8 shrink-0"
                disabled={busy}
                onClick={goPrev}
                size="icon"
                type="button"
                variant="outline"
              >
                <ChevronLeftIcon className="size-4" />
              </Button>
            ) : null}
            <div className="relative min-w-0 flex-1">
              <div
                className={cn(
                  'overflow-hidden rounded-md border bg-muted/40',
                  previewAspectClass(values.kind),
                )}
              >
                {previewUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element -- presigned S3 URLs
                  <img alt="" className="size-full object-cover" src={previewUrl} />
                ) : (
                  <div className="flex size-full items-center justify-center px-3 text-center text-muted-foreground text-xs">
                    {t('generate.previewEmpty')}
                  </div>
                )}
              </div>
              {canDeleteVersion ? (
                <div className="absolute top-1.5 right-1.5 z-10">
                  <Button
                    aria-label={t('generate.deleteVersion')}
                    className="size-7 shadow-sm"
                    disabled={busy}
                    onClick={() => setDeleteDialogOpen(true)}
                    size="icon"
                    type="button"
                    variant="secondary"
                  >
                    <Trash2Icon className="size-3.5" />
                  </Button>
                </div>
              ) : null}
              {canCommit ? (
                <div className="absolute inset-x-0 bottom-0 z-10 flex justify-center p-2">
                  <Button
                    className="h-7 px-2 text-xs shadow-sm"
                    disabled={busy}
                    onClick={() => {
                      void handleCommitVersion()
                    }}
                    size="sm"
                    type="button"
                  >
                    {isCommitting ? t('generate.committing') : t('generate.useAsItemImage')}
                  </Button>
                </div>
              ) : null}
            </div>
            {showVersionNav ? (
              <Button
                aria-label={t('generate.nextVersion')}
                className="size-8 shrink-0"
                disabled={busy}
                onClick={goNext}
                size="icon"
                type="button"
                variant="outline"
              >
                <ChevronRightIcon className="size-4" />
              </Button>
            ) : null}
          </div>
          {showVersionNav ? (
            <p aria-live="polite" className="text-center text-muted-foreground text-xs">
              {t('generate.versionIndicator', {
                current: previewVersionIndex + 1,
                total: imageVersions.length,
              })}
            </p>
          ) : null}
          <p className="text-muted-foreground text-xs">
            {values.kind === 'post' ? t('generate.formatHintPost') : t('generate.formatHintStory')}
          </p>
        </div>

        <div className="grid gap-1.5">
          <Label htmlFor="ig-item-kind">{t('fields.kind')}</Label>
          <Select
            disabled={busy}
            onValueChange={(value) =>
              setValues((prev) => ({ ...prev, kind: value as InstagramItemKind }))
            }
            value={values.kind}
          >
            <SelectTrigger id="ig-item-kind">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="story">{t('kind.story')}</SelectItem>
              <SelectItem value="post">{t('kind.post')}</SelectItem>
              <SelectItem value="reel">{t('kind.reel')}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="grid gap-1.5">
          <Label htmlFor="ig-item-status">{t('fields.status')}</Label>
          <Select
            disabled={busy}
            onValueChange={(value) =>
              setValues((prev) => ({ ...prev, status: value as InstagramItemStatus }))
            }
            value={values.status}
          >
            <SelectTrigger id="ig-item-status">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="draft">{t('status.draft')}</SelectItem>
              <SelectItem value="ready">{t('status.ready')}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="grid gap-1.5">
          <Label>{t('fields.schedule')}</Label>
          <div className="flex items-center gap-2">
            <div className="min-w-0 flex-1">
              <DateTimePicker
                disabled={busy}
                onChange={(schedule) => setValues((prev) => ({ ...prev, schedule }))}
                placeholder={t('fields.scheduleDatePlaceholder')}
                timeLabel={t('fields.scheduleTime')}
                value={values.schedule || undefined}
              />
            </div>
            {values.schedule ? (
              <Button
                aria-label={t('clearScheduleAria')}
                disabled={busy}
                onClick={() => setValues((prev) => ({ ...prev, schedule: '' }))}
                size="icon"
                type="button"
                variant="ghost"
              >
                <XIcon className="size-4" />
              </Button>
            ) : null}
          </div>
        </div>

        <div className="grid gap-1.5">
          <Label htmlFor="ig-item-title">{t('fields.title')}</Label>
          <Input
            disabled={busy}
            id="ig-item-title"
            onChange={(event) => setValues((prev) => ({ ...prev, title: event.target.value }))}
            value={values.title}
          />
        </div>

        <div className="grid gap-1.5">
          <Label htmlFor="ig-item-hook">{t('fields.hook')}</Label>
          <Textarea
            disabled={busy}
            id="ig-item-hook"
            onChange={(event) => setValues((prev) => ({ ...prev, hook: event.target.value }))}
            rows={2}
            value={values.hook}
          />
        </div>

        <div className="grid gap-1.5">
          <Label htmlFor="ig-item-caption">{t('fields.caption')}</Label>
          <Textarea
            disabled={busy}
            id="ig-item-caption"
            onChange={(event) => setValues((prev) => ({ ...prev, caption: event.target.value }))}
            rows={3}
            value={values.caption}
          />
        </div>

        <div className="grid gap-1.5">
          <Label htmlFor={modelFieldId}>{tModel('label')}</Label>
          <Select
            disabled={busy}
            onValueChange={(value) => {
              if (isLeonardoPostModelId(value)) {
                setGenerationModel(value)
              }
            }}
            value={generationModel}
          >
            <SelectTrigger
              aria-describedby={modelBlurbId}
              aria-label={tModel('label')}
              id={modelFieldId}
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {LEONARDO_POST_MODEL_IDS.map((modelId) => (
                <SelectItem key={modelId} value={modelId}>
                  {tModel(`options.${getLeonardoPostModelMessageKey(modelId)}.name`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-muted-foreground text-xs" id={modelBlurbId}>
            {tModel(`options.${getLeonardoPostModelMessageKey(generationModel)}.blurb`)}
          </p>
        </div>

        <div className="grid gap-1.5">
          <Label htmlFor="ig-item-visual-brief">{t('fields.visualBrief')}</Label>
          <p className="text-muted-foreground text-xs">{t('generate.visualBriefHint')}</p>
          <PostCreatorImagePicker
            disabled={busy}
            emptyLabel={tPicker('empty')}
            maxReachedLabel={tPicker('maxReached')}
            onAddReference={(photo) => {
              setReferenceImages((prev) => {
                if (prev.some((image) => image.name === photo.name)) return prev
                return [...prev, photo]
              })
            }}
            onUploadError={(message) => toast.error(message || tPicker('uploadError'))}
            onValueChange={(next) => setValues((prev) => ({ ...prev, visualBrief: next }))}
            pickerAriaLabel={tPicker('ariaLabel')}
            selectedNames={selectedNames}
            uploadLabel={tPicker('upload')}
            uploadingLabel={tPicker('uploading')}
            value={values.visualBrief}
          >
            <Textarea
              disabled={busy}
              id="ig-item-visual-brief"
              onChange={(event) =>
                setValues((prev) => ({ ...prev, visualBrief: event.target.value }))
              }
              placeholder={t('generate.visualBriefPlaceholder')}
              rows={4}
              value={values.visualBrief}
            />
          </PostCreatorImagePicker>
          <PostCreatorReferenceThumbnails
            ariaLabel={tRefs('ariaLabel')}
            disabled={busy}
            images={referenceImages}
            includeLabel={tRefs('include')}
            indexLabel={(index) => tRefs('indexLabel', { index })}
            onRemove={(name) => {
              setReferenceImages((prev) => prev.filter((image) => image.name !== name))
            }}
            onToggleEnabled={(name, enabled) => {
              setReferenceImages((prev) =>
                prev.map((image) => (image.name === name ? { ...image, enabled } : image)),
              )
            }}
            removeLabel={tRefs('remove')}
          />
        </div>

        {actionError ? (
          <p className="text-destructive text-sm" role="alert">
            {actionError}
          </p>
        ) : null}
        {generateError ? (
          <p className="text-destructive text-sm" role="alert">
            {generateError}
          </p>
        ) : null}

        <div className="mt-auto flex flex-wrap gap-2 pt-2">
          <Button
            className={saving ? 'inline-flex items-center gap-2' : undefined}
            disabled={busy}
            type="submit"
          >
            {saving ? <Spinner className="size-3.5" /> : null}
            {t('saveButton')}
          </Button>
          <Button
            className={isGenerating ? 'inline-flex items-center gap-2' : undefined}
            disabled={!canGenerate}
            onClick={() => {
              void handleGenerate()
            }}
            type="button"
            variant="secondary"
          >
            {isGenerating ? (
              <Spinner className="size-3.5" />
            ) : (
              <SparklesIcon className="size-3.5" />
            )}
            {isGenerating ? t('generate.generating') : t('generate.button')}
          </Button>
        </div>
      </form>

      <AlertDialog
        onOpenChange={(open) => {
          if (!isDeletingVersion) setDeleteDialogOpen(open)
        }}
        open={deleteDialogOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('generate.deleteVersionConfirmTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('generate.deleteVersionConfirmDescription')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeletingVersion} type="button">
              {t('generate.deleteVersionConfirmCancel')}
            </AlertDialogCancel>
            <Button
              disabled={isDeletingVersion}
              onClick={() => {
                void handleDeleteVersion()
              }}
              type="button"
              variant="destructive"
            >
              {isDeletingVersion
                ? t('generate.deleteVersionDeleting')
                : t('generate.deleteVersionConfirmAction')}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
