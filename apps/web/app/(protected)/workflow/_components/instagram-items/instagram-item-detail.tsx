'use client'

import { useCallback, useEffect, useId, useMemo, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { ArrowLeftIcon, PlusIcon, SparklesIcon, XIcon } from 'lucide-react'
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
import { Alert, AlertDescription } from '@workspace/ui/components/alert'
import { Button, buttonVariants } from '@workspace/ui/components/button'
import { ButtonGroup } from '@workspace/ui/components/button-group'
import { Checkbox } from '@workspace/ui/components/checkbox'
import { DateTimePicker } from '@workspace/ui/components/date-time-picker'
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldSeparator,
} from '@workspace/ui/components/field'
import { Input } from '@workspace/ui/components/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@workspace/ui/components/select'
import { Separator } from '@workspace/ui/components/separator'
import { Spinner } from '@workspace/ui/components/spinner'
import { Textarea } from '@workspace/ui/components/textarea'
import { ToggleGroup, ToggleGroupItem } from '@workspace/ui/components/toggle-group'
import { cn } from '@workspace/ui/lib/utils'

import { PostCreatorImagePicker } from '@/app/(protected)/ig-studio/post-creator/_components/post-creator-image-picker'
import { PostCreatorReferenceThumbnails } from '@/app/(protected)/ig-studio/post-creator/_components/post-creator-reference-thumbnails'
import { StyleUsageGuide } from '@/components/styles/style-usage-guide'
import type {
  InstagramItemDto,
  InstagramItemMediaVersionDto,
} from '@/lib/graphql/queries/instagram-items'
import { mediaDownloadHref } from '@/lib/media/client-api'
import { parsePostMediaFilename } from '@/lib/posts/parse-post-media-filename'
import {
  DEFAULT_LEONARDO_POST_MODEL,
  getLeonardoPostModelMessageKey,
  isLeonardoPostModelId,
  LEONARDO_POST_MODEL_IDS,
  type LeonardoPostModelId,
} from '@/lib/posts/leonardo-post-models'
import type { PostCreatorReferenceImage } from '@/lib/posts/post-creator-types'
import { resolveGenerationReferences } from '@/lib/posts/resolve-generation-references'
import { routes } from '@/lib/routes'
import { listStyles, type Style } from '@/lib/styles/client-api'

import { InstagramItemPreview } from './instagram-item-preview'
import {
  toFormValues,
  type InstagramItemFormValues,
  type InstagramItemKind,
  type InstagramItemStatus,
} from './use-instagram-items'

const STYLE_NONE = '__none__'

const optionChipClassName = cn(
  buttonVariants({ variant: 'secondary', size: 'sm' }),
  'h-auto shadow-none hover:translate-y-0',
  'border border-transparent',
  'data-[state=off]:border-border data-[state=off]:bg-transparent data-[state=off]:text-foreground data-[state=off]:hover:bg-secondary/50',
  'data-[state=on]:bg-secondary data-[state=on]:text-secondary-foreground data-[state=on]:ring-2 data-[state=on]:ring-ring/40',
)

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
  const pathname = usePathname()
  const modelFieldId = useId()
  const modelBlurbId = useId()
  const styleFieldId = useId()
  const kindFieldId = useId()
  const statusFieldId = useId()
  const useCurrentPreviewRefId = useId()
  const [values, setValues] = useState<InstagramItemFormValues>(() => toFormValues(item))
  const [referenceImages, setReferenceImages] = useState<PostCreatorReferenceImage[]>(() =>
    refsFromItem(item),
  )
  const [styles, setStyles] = useState<Style[]>([])
  const [stylesLoading, setStylesLoading] = useState(false)
  const [generationModel, setGenerationModel] = useState<LeonardoPostModelId>(
    DEFAULT_LEONARDO_POST_MODEL,
  )
  const [isGenerating, setIsGenerating] = useState(false)
  const [generateError, setGenerateError] = useState<string | null>(null)
  const [useCurrentPreviewAsReference, setUseCurrentPreviewAsReference] = useState(true)
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

  useEffect(() => {
    let cancelled = false
    setStylesLoading(true)
    void listStyles()
      .then((list) => {
        if (cancelled) return
        setStyles(list)
      })
      .catch(() => {
        if (!cancelled) {
          setStyles([])
          toast.error(t('generate.style.loadError'))
        }
      })
      .finally(() => {
        if (!cancelled) setStylesLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [t])

  const selectedStyle = styles.find((style) => style.id === values.styleId) ?? null
  const createStyleHref = `${routes.igStudioStyleNew}?returnTo=${encodeURIComponent(pathname || '')}`

  const selectedNames = useMemo(
    () => new Set(referenceImages.map((image) => image.name)),
    [referenceImages],
  )

  const busy = saving || isGenerating || isCommitting || isDeletingVersion
  const canGenerate = values.visualBrief.trim().length > 0 && !busy
  const previewVersion = imageVersions[previewVersionIndex] ?? imageVersions[0]
  const visibleMediaS3Key = previewVersion?.mediaS3Key || null
  const hasVisiblePreviousResult = parsePostMediaFilename(visibleMediaS3Key) != null
  const canDeleteVersion = Boolean(previewVersion?.mediaS3Key) && imageVersions.length > 0 && !busy
  const headerTitle = values.title.trim() ? values.title : t('untitled')
  const footerError = actionError || generateError

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

  const handlePreviewIndexChange = useCallback(
    (index: number) => {
      if (busy || imageVersions.length === 0) return
      setPreviewVersionIndex(index)
    },
    [busy, imageVersions.length],
  )

  async function handleGenerate() {
    const prompt = values.visualBrief.trim()
    if (!prompt) return

    const persistedRefs = persistableRefs(referenceImages)
    const { references, tooManyReferences } = resolveGenerationReferences({
      referenceImages,
      previewMediaS3Key: visibleMediaS3Key,
      includePreviousResult: useCurrentPreviewAsReference,
      styleSelected: values.styleId != null,
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
          styleId: values.styleId,
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
    if (!version?.mediaS3Key || previewVersionIndex === committedVersionIndex) return

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
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex shrink-0 items-center gap-2 pb-3">
        <Button
          aria-label={t('backAria')}
          disabled={busy}
          onClick={onBack}
          size="icon"
          type="button"
          variant="ghost"
        >
          <ArrowLeftIcon />
        </Button>
        <h2 className="min-w-0 flex-1 truncate font-semibold text-base tracking-tight">
          {headerTitle}
        </h2>
      </div>

      <form
        className="flex min-h-0 flex-1 flex-col"
        onSubmit={(event) => {
          event.preventDefault()
          void onSave(valuesWithRefs())
        }}
      >
        <div className="min-h-0 flex-1 overflow-y-auto pr-0.5 pt-2">
          <FieldGroup className="gap-5 pb-4">
            <FieldSeparator className="mt-1">{t('sections.content')}</FieldSeparator>

            <Field>
              <FieldLabel htmlFor={kindFieldId}>{t('fields.kind')}</FieldLabel>
              <ToggleGroup
                aria-label={t('fields.kind')}
                className="gap-1.5"
                disabled={busy}
                id={kindFieldId}
                onValueChange={(value) => {
                  if (!value) return
                  setValues((prev) => ({ ...prev, kind: value as InstagramItemKind }))
                }}
                type="single"
                value={values.kind}
              >
                {(['story', 'post', 'reel'] as const).map((kind) => (
                  <ToggleGroupItem
                    className={cn(optionChipClassName, 'min-h-8 flex-1 rounded-sm px-2 text-xs')}
                    key={kind}
                    value={kind}
                  >
                    {t(`kind.${kind}`)}
                  </ToggleGroupItem>
                ))}
              </ToggleGroup>
            </Field>

            <Field>
              <FieldLabel htmlFor={statusFieldId}>{t('fields.status')}</FieldLabel>
              <ToggleGroup
                aria-label={t('fields.status')}
                className="gap-1.5"
                disabled={busy}
                id={statusFieldId}
                onValueChange={(value) => {
                  if (!value) return
                  setValues((prev) => ({ ...prev, status: value as InstagramItemStatus }))
                }}
                type="single"
                value={values.status}
              >
                {(['draft', 'ready'] as const).map((status) => (
                  <ToggleGroupItem
                    className={cn(optionChipClassName, 'min-h-8 flex-1 rounded-sm px-2 text-xs')}
                    key={status}
                    value={status}
                  >
                    {t(`status.${status}`)}
                  </ToggleGroupItem>
                ))}
              </ToggleGroup>
            </Field>

            <Field>
              <FieldLabel>{t('fields.schedule')}</FieldLabel>
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
                    <XIcon />
                  </Button>
                ) : null}
              </div>
            </Field>

            <Field>
              <FieldLabel htmlFor="ig-item-title">{t('fields.title')}</FieldLabel>
              <Input
                disabled={busy}
                id="ig-item-title"
                onChange={(event) => setValues((prev) => ({ ...prev, title: event.target.value }))}
                value={values.title}
              />
            </Field>

            <Field>
              <FieldLabel htmlFor="ig-item-hook">{t('fields.hook')}</FieldLabel>
              <Textarea
                disabled={busy}
                id="ig-item-hook"
                onChange={(event) => setValues((prev) => ({ ...prev, hook: event.target.value }))}
                rows={2}
                value={values.hook}
              />
            </Field>

            <Field>
              <FieldLabel htmlFor="ig-item-caption">{t('fields.caption')}</FieldLabel>
              <Textarea
                disabled={busy}
                id="ig-item-caption"
                onChange={(event) =>
                  setValues((prev) => ({ ...prev, caption: event.target.value }))
                }
                rows={3}
                value={values.caption}
              />
            </Field>

            <FieldSeparator>{t('sections.generate')}</FieldSeparator>

            <InstagramItemPreview
              busy={busy}
              canDeleteVersion={canDeleteVersion}
              committedIndex={committedVersionIndex}
              isCommitting={isCommitting}
              isGenerating={isGenerating}
              kind={values.kind}
              onCommit={() => {
                void handleCommitVersion()
              }}
              onPreviewIndexChange={handlePreviewIndexChange}
              onRequestDelete={() => setDeleteDialogOpen(true)}
              previewIndex={previewVersionIndex}
              versions={imageVersions}
            />

            <Field>
              <FieldLabel htmlFor={modelFieldId}>{tModel('label')}</FieldLabel>
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
              <FieldDescription id={modelBlurbId}>
                {tModel(`options.${getLeonardoPostModelMessageKey(generationModel)}.blurb`)}
              </FieldDescription>
            </Field>

            <Field>
              <FieldLabel htmlFor={styleFieldId}>{t('generate.style.label')}</FieldLabel>
              <Select
                disabled={busy || stylesLoading}
                onValueChange={(value) => {
                  if (value === STYLE_NONE) {
                    setValues((prev) => ({ ...prev, styleId: null }))
                    return
                  }
                  const next = Number(value)
                  if (Number.isInteger(next) && next > 0) {
                    setValues((prev) => ({ ...prev, styleId: next }))
                  }
                }}
                value={values.styleId != null ? String(values.styleId) : STYLE_NONE}
              >
                <SelectTrigger aria-label={t('generate.style.label')} id={styleFieldId}>
                  {selectedStyle ? (
                    <span className="flex min-w-0 items-center gap-2">
                      {/* eslint-disable-next-line @next/next/no-img-element -- media download URLs */}
                      <img
                        alt=""
                        className="size-6 shrink-0 rounded object-cover"
                        src={mediaDownloadHref(selectedStyle.referenceImageName)}
                      />
                      <span className="truncate">
                        {selectedStyle.isDefault
                          ? `${selectedStyle.name} (${t('generate.style.defaultSuffix')})`
                          : selectedStyle.name}
                      </span>
                    </span>
                  ) : (
                    <SelectValue placeholder={t('generate.style.placeholder')} />
                  )}
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={STYLE_NONE}>{t('generate.style.none')}</SelectItem>
                  {styles.map((style) => (
                    <SelectItem key={style.id} value={String(style.id)}>
                      <span className="flex items-center gap-2">
                        {/* eslint-disable-next-line @next/next/no-img-element -- media download URLs */}
                        <img
                          alt=""
                          className="size-6 shrink-0 rounded object-cover"
                          src={mediaDownloadHref(style.referenceImageName)}
                        />
                        <span>
                          {style.isDefault
                            ? `${style.name} (${t('generate.style.defaultSuffix')})`
                            : style.name}
                        </span>
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FieldDescription>{t('generate.style.description')}</FieldDescription>
              {selectedStyle ? <StyleUsageGuide spec={selectedStyle.spec} /> : null}
              <div className="flex flex-wrap gap-2 pt-0.5">
                <Button asChild disabled={busy} size="sm" type="button" variant="outline">
                  <Link href={createStyleHref}>
                    <PlusIcon data-icon="inline-start" />
                    {t('generate.style.create')}
                  </Link>
                </Button>
                <Button asChild disabled={busy} size="sm" type="button" variant="ghost">
                  <Link href={routes.igStudioStyles}>{t('generate.style.manage')}</Link>
                </Button>
              </div>
            </Field>

            <Field>
              <FieldLabel htmlFor="ig-item-visual-brief">{t('fields.visualBrief')}</FieldLabel>
              <FieldDescription>{t('generate.visualBriefHint')}</FieldDescription>
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
            </Field>
          </FieldGroup>
        </div>

        <div className="flex shrink-0 flex-col gap-3 bg-card pt-3 pb-1">
          <Separator />
          {footerError ? (
            <Alert variant="destructive">
              <AlertDescription>{footerError}</AlertDescription>
            </Alert>
          ) : null}
          <Field
            className="rounded-md border border-border/60 bg-muted/30 px-3 py-2.5"
            data-disabled={!hasVisiblePreviousResult || busy ? true : undefined}
            orientation="horizontal"
          >
            <Checkbox
              checked={useCurrentPreviewAsReference && hasVisiblePreviousResult}
              disabled={!hasVisiblePreviousResult || busy}
              id={useCurrentPreviewRefId}
              onCheckedChange={(checked) => {
                setUseCurrentPreviewAsReference(checked === true)
              }}
            />
            <FieldContent className="gap-0.5">
              <FieldLabel htmlFor={useCurrentPreviewRefId}>
                {t('generate.useCurrentPreviewAsReference')}
              </FieldLabel>
              <FieldDescription>
                {hasVisiblePreviousResult
                  ? t('generate.useCurrentPreviewAsReferenceHint')
                  : t('generate.useCurrentPreviewAsReferenceUnavailable')}
              </FieldDescription>
            </FieldContent>
          </Field>
          <ButtonGroup className="w-full [&>*]:flex-1">
            <Button disabled={busy} type="submit" variant="outline">
              {saving ? <Spinner data-icon="inline-start" /> : null}
              {t('saveButton')}
            </Button>
            <Button
              disabled={!canGenerate}
              onClick={() => {
                void handleGenerate()
              }}
              type="button"
            >
              {isGenerating ? (
                <Spinner data-icon="inline-start" />
              ) : (
                <SparklesIcon data-icon="inline-start" />
              )}
              {isGenerating ? t('generate.generating') : t('generate.button')}
            </Button>
          </ButtonGroup>
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
              {isDeletingVersion ? <Spinner data-icon="inline-start" /> : null}
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
