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
import { Badge } from '@workspace/ui/components/badge'
import { Button } from '@workspace/ui/components/button'
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
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@workspace/ui/components/select'
import { Separator } from '@workspace/ui/components/separator'
import { Spinner } from '@workspace/ui/components/spinner'
import { Textarea } from '@workspace/ui/components/textarea'
import { ToggleGroup, ToggleGroupItem } from '@workspace/ui/components/toggle-group'
import { TooltipProvider } from '@workspace/ui/components/tooltip'

import { PostCreatorImagePicker } from '@/app/(protected)/ig-studio/post-creator/_components/post-creator-image-picker'
import { PostCreatorReferenceThumbnails } from '@/app/(protected)/ig-studio/post-creator/_components/post-creator-reference-thumbnails'
import { StyleUsageGuide } from '@/components/styles/style-usage-guide'
import type {
  InstagramItemDto,
  InstagramItemPageDto,
  InstagramItemPageMediaVersionDto,
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

import { InstagramItemPagesStrip } from './instagram-item-pages-strip'
import { InstagramItemPreview } from './instagram-item-preview'
import {
  toFormValues,
  type InstagramItemFormValues,
  type InstagramItemKind,
  type InstagramItemStatus,
} from './use-instagram-items'

const STYLE_NONE = '__none__'
const MAX_ITEM_PAGES = 10

type InstagramItemDetailProps = {
  item: InstagramItemDto
  workflowId: string
  saving: boolean
  actionError: string | null
  onBack: () => void
  onSave: (values: InstagramItemFormValues) => Promise<void>
  onGenerated: (item: InstagramItemDto) => void
}

type ItemImageVersion = InstagramItemPageMediaVersionDto & { imageUrl: string | null }

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

function sortedPages(item: InstagramItemDto): InstagramItemPageDto[] {
  return [...(item.pages ?? [])].toSorted((a, b) => a.sortOrder - b.sortOrder)
}

function versionsFromPage(page: InstagramItemPageDto | undefined): ItemImageVersion[] {
  if (!page) return []
  const raw = Array.isArray(page.mediaVersions) ? page.mediaVersions : []
  if (raw.length > 0) {
    return raw.map((version) => ({
      ...version,
      imageUrl: version.imageUrl ?? null,
    }))
  }
  if (page.imageUrl || page.mediaS3Key) {
    return [
      {
        id: 'current',
        mediaS3Key: page.mediaS3Key ?? '',
        prompt: page.prompt ?? null,
        createdAt: page.updatedAt ?? page.createdAt ?? '',
        imageUrl: page.imageUrl ?? null,
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

function promptsFromPages(pages: InstagramItemPageDto[]): Record<string, string> {
  const next: Record<string, string> = {}
  for (const page of pages) {
    next[page.id] = page.prompt ?? ''
  }
  return next
}

function syncFromItem(
  item: InstagramItemDto,
  preferredPageId?: string | null,
): {
  pages: InstagramItemPageDto[]
  selectedPageId: string | null
  versions: ItemImageVersion[]
  previewIndex: number
  committedIndex: number
  pagePromptsById: Record<string, string>
} {
  const pages = sortedPages(item)
  const selectedPage =
    (preferredPageId ? pages.find((page) => page.id === preferredPageId) : undefined) ??
    pages[0] ??
    null
  const versions = versionsFromPage(selectedPage ?? undefined)
  const committedIndex = resolveVersionIndex(versions, selectedPage?.mediaS3Key)
  return {
    pages,
    selectedPageId: selectedPage?.id ?? null,
    versions,
    previewIndex: committedIndex,
    committedIndex,
    pagePromptsById: promptsFromPages(pages),
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
  const [pages, setPages] = useState<InstagramItemPageDto[]>(initialSync.pages)
  const [selectedPageId, setSelectedPageId] = useState<string | null>(initialSync.selectedPageId)
  const [pagePromptsById, setPagePromptsById] = useState<Record<string, string>>(
    initialSync.pagePromptsById,
  )
  const [imageVersions, setImageVersions] = useState<ItemImageVersion[]>(initialSync.versions)
  const [previewVersionIndex, setPreviewVersionIndex] = useState(initialSync.previewIndex)
  const [committedVersionIndex, setCommittedVersionIndex] = useState(initialSync.committedIndex)
  const [isCommitting, setIsCommitting] = useState(false)
  const [isDeletingVersion, setIsDeletingVersion] = useState(false)
  const [isAddingPage, setIsAddingPage] = useState(false)
  const [isDuplicatingPage, setIsDuplicatingPage] = useState(false)
  const [isDeletingPage, setIsDeletingPage] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<'version' | 'page'>('version')

  useEffect(() => {
    setValues(toFormValues(item))
    setReferenceImages(refsFromItem(item))
    const next = syncFromItem(item, selectedPageId)
    setPages(next.pages)
    setSelectedPageId(next.selectedPageId)
    setPagePromptsById(next.pagePromptsById)
    setImageVersions(next.versions)
    setPreviewVersionIndex(next.previewIndex)
    setCommittedVersionIndex(next.committedIndex)
    setGenerateError(null)
    // Only re-sync when the item identity/payload changes, not when local page selection changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional: prefer sticky page id
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

  const selectedPage = pages.find((page) => page.id === selectedPageId) ?? pages[0]
  const selectedPageIndex = Math.max(
    0,
    pages.findIndex((page) => page.id === (selectedPage?.id ?? selectedPageId)),
  )
  const pagePrompt = selectedPageId ? (pagePromptsById[selectedPageId] ?? '') : ''
  const busy =
    saving ||
    isGenerating ||
    isCommitting ||
    isDeletingVersion ||
    isAddingPage ||
    isDuplicatingPage ||
    isDeletingPage
  const canGenerate = pagePrompt.trim().length > 0 && !busy && Boolean(selectedPageId)
  const previewVersion = imageVersions[previewVersionIndex] ?? imageVersions[0]
  const visibleMediaS3Key = previewVersion?.mediaS3Key || null
  const hasVisiblePreviousResult = parsePostMediaFilename(visibleMediaS3Key) != null
  const canDeleteVersion = Boolean(previewVersion?.mediaS3Key) && imageVersions.length > 0 && !busy
  const canAddPage = !busy && pages.length > 0 && pages.length < MAX_ITEM_PAGES
  const canDuplicatePage = canAddPage && Boolean(selectedPageId)
  const canDeletePage =
    !busy &&
    pages.length > 1 &&
    Boolean(selectedPage) &&
    !selectedPage?.mediaS3Key &&
    (selectedPage?.mediaVersions?.length ?? 0) === 0
  const headerTitle = values.title.trim() ? values.title : t('untitled')
  const footerError = actionError || generateError

  function setSelectedPagePrompt(next: string) {
    if (!selectedPageId) return
    setPagePromptsById((prev) => ({ ...prev, [selectedPageId]: next }))
  }

  function valuesWithRefs(): InstagramItemFormValues {
    return {
      ...values,
      referenceImages: persistableRefs(referenceImages),
    }
  }

  function applyItemUpdate(nextItem: InstagramItemDto, preferredPageId?: string | null) {
    const next = syncFromItem(nextItem, preferredPageId ?? selectedPageId)
    setPages(next.pages)
    setSelectedPageId(next.selectedPageId)
    setPagePromptsById(next.pagePromptsById)
    setImageVersions(next.versions)
    setPreviewVersionIndex(next.previewIndex)
    setCommittedVersionIndex(next.committedIndex)
    setValues(toFormValues(nextItem))
    setReferenceImages(refsFromItem(nextItem))
    onGenerated(nextItem)
  }

  function selectPage(pageId: string) {
    if (busy || pageId === selectedPageId) return
    const page = pages.find((candidate) => candidate.id === pageId)
    if (!page) return
    const versions = versionsFromPage(page)
    const committedIndex = resolveVersionIndex(versions, page.mediaS3Key)
    setSelectedPageId(pageId)
    setImageVersions(versions)
    setPreviewVersionIndex(committedIndex)
    setCommittedVersionIndex(committedIndex)
  }

  const handlePreviewIndexChange = useCallback(
    (index: number) => {
      if (busy || imageVersions.length === 0) return
      setPreviewVersionIndex(index)
    },
    [busy, imageVersions.length],
  )

  async function handleGenerate() {
    const prompt = pagePrompt.trim()
    if (!prompt || !selectedPageId) return

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
          pageId: selectedPageId,
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
        applyItemUpdate(payload.item, selectedPageId)
      } else if (payload.url || payload.mediaS3Key) {
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
    if (!version?.mediaS3Key || !selectedPageId || previewVersionIndex === committedVersionIndex) {
      return
    }

    setIsCommitting(true)
    setGenerateError(null)
    try {
      const res = await fetch(
        `/api/workflows/${workflowId}/instagram-items/${item.id}/pages/${selectedPageId}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ mediaS3Key: version.mediaS3Key }),
        },
      )
      const payload = (await res.json().catch(() => ({}))) as {
        message?: string
        item?: InstagramItemDto
      }
      if (!res.ok || !payload.item) {
        setGenerateError(payload.message || t('generate.commitError'))
        return
      }
      applyItemUpdate(payload.item, selectedPageId)
    } catch {
      setGenerateError(t('generate.commitError'))
    } finally {
      setIsCommitting(false)
    }
  }

  async function handleDeleteVersion() {
    const version = imageVersions[previewVersionIndex]
    if (!version?.mediaS3Key || !selectedPageId) return

    setIsDeletingVersion(true)
    setGenerateError(null)
    try {
      const res = await fetch(
        `/api/workflows/${workflowId}/instagram-items/${item.id}/pages/${selectedPageId}/versions`,
        {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ mediaS3Key: version.mediaS3Key }),
        },
      )
      const payload = (await res.json().catch(() => ({}))) as {
        message?: string
        item?: InstagramItemDto
      }
      if (!res.ok || !payload.item) {
        setGenerateError(payload.message || t('generate.deleteVersionError'))
        return
      }
      setDeleteDialogOpen(false)
      applyItemUpdate(payload.item, selectedPageId)
    } catch {
      setGenerateError(t('generate.deleteVersionError'))
    } finally {
      setIsDeletingVersion(false)
    }
  }

  async function createPage(copyFromPageId?: string) {
    const res = await fetch(`/api/workflows/${workflowId}/instagram-items/${item.id}/pages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(copyFromPageId ? { copyFromPageId } : {}),
    })
    const payload = (await res.json().catch(() => ({}))) as {
      message?: string
      page?: InstagramItemPageDto
      item?: InstagramItemDto
    }
    if (!res.ok || !payload.item) {
      throw new Error(payload.message || t('pages.addError'))
    }
    applyItemUpdate(payload.item, payload.page?.id ?? selectedPageId)
  }

  async function handleAddPage() {
    if (!canAddPage) {
      if (pages.length >= MAX_ITEM_PAGES) {
        setGenerateError(t('pages.maxReached'))
      }
      return
    }
    setIsAddingPage(true)
    setGenerateError(null)
    try {
      await createPage()
    } catch (err) {
      setGenerateError(err instanceof Error ? err.message : t('pages.addError'))
    } finally {
      setIsAddingPage(false)
    }
  }

  async function handleDuplicatePage() {
    if (!canDuplicatePage || !selectedPageId) {
      if (pages.length >= MAX_ITEM_PAGES) {
        setGenerateError(t('pages.maxReached'))
      }
      return
    }
    setIsDuplicatingPage(true)
    setGenerateError(null)
    try {
      await createPage(selectedPageId)
    } catch (err) {
      setGenerateError(err instanceof Error ? err.message : t('pages.duplicateError'))
    } finally {
      setIsDuplicatingPage(false)
    }
  }

  async function handleDeletePage() {
    if (!canDeletePage || !selectedPageId) return

    setIsDeletingPage(true)
    setGenerateError(null)
    try {
      const res = await fetch(
        `/api/workflows/${workflowId}/instagram-items/${item.id}/pages/${selectedPageId}`,
        { method: 'DELETE' },
      )
      const payload = (await res.json().catch(() => ({}))) as {
        message?: string
        item?: InstagramItemDto
      }
      if (!res.ok || !payload.item) {
        setGenerateError(payload.message || t('pages.deleteError'))
        return
      }
      setDeleteDialogOpen(false)
      applyItemUpdate(payload.item)
    } catch {
      setGenerateError(t('pages.deleteError'))
    } finally {
      setIsDeletingPage(false)
    }
  }

  return (
    <TooltipProvider>
      <div className="flex min-h-0 flex-1 flex-col">
        <div className="flex shrink-0 items-start gap-2 pb-3">
          <Button
            aria-label={t('backAria')}
            className="mt-0.5"
            disabled={busy}
            onClick={onBack}
            size="icon"
            type="button"
            variant="ghost"
          >
            <ArrowLeftIcon />
          </Button>
          <div className="min-w-0 flex flex-1 flex-col gap-1.5">
            <h2 className="truncate font-semibold text-base tracking-tight">{headerTitle}</h2>
            <div className="flex flex-wrap items-center gap-1.5">
              <Badge variant="secondary">{t(`kind.${values.kind}`)}</Badge>
              <Badge variant={values.status === 'ready' ? 'default' : 'outline'}>
                {t(`status.${values.status}`)}
              </Badge>
              {pages.length > 0 ? (
                <Badge variant="outline">{t('pages.countBadge', { count: pages.length })}</Badge>
              ) : null}
            </div>
          </div>
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
              <FieldSeparator className="mt-1">{t('sections.generate')}</FieldSeparator>

              <InstagramItemPagesStrip
                busy={busy}
                canAddPage={canAddPage}
                canDeletePage={canDeletePage}
                canDuplicatePage={canDuplicatePage}
                isAddingPage={isAddingPage}
                isDuplicatingPage={isDuplicatingPage}
                kind={values.kind}
                onAddPage={() => {
                  void handleAddPage()
                }}
                onDuplicatePage={() => {
                  void handleDuplicatePage()
                }}
                onRequestDeletePage={() => {
                  setDeleteTarget('page')
                  setDeleteDialogOpen(true)
                }}
                onSelectPage={selectPage}
                pages={pages}
                selectedPageId={selectedPageId}
              />

              {pages.length > 0 ? (
                <FieldSeparator>
                  {t('pages.workspaceHeading', {
                    current: selectedPageIndex + 1,
                    total: pages.length,
                  })}
                </FieldSeparator>
              ) : null}

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
                onRequestDelete={() => {
                  setDeleteTarget('version')
                  setDeleteDialogOpen(true)
                }}
                previewIndex={previewVersionIndex}
                versions={imageVersions}
              />

              <Field>
                <FieldLabel htmlFor="ig-item-visual-brief">
                  {t('fields.pageVisualBrief')}
                </FieldLabel>
                <FieldDescription>{t('generate.pageVisualBriefHint')}</FieldDescription>
                <PostCreatorImagePicker
                  disabled={busy || !selectedPageId}
                  emptyLabel={tPicker('empty')}
                  maxReachedLabel={tPicker('maxReached')}
                  onAddReference={(photo) => {
                    setReferenceImages((prev) => {
                      if (prev.some((image) => image.name === photo.name)) return prev
                      return [...prev, photo]
                    })
                  }}
                  onUploadError={(message) => toast.error(message || tPicker('uploadError'))}
                  onValueChange={setSelectedPagePrompt}
                  pickerAriaLabel={tPicker('ariaLabel')}
                  selectedNames={selectedNames}
                  uploadLabel={tPicker('upload')}
                  uploadingLabel={tPicker('uploading')}
                  value={pagePrompt}
                >
                  <Textarea
                    disabled={busy || !selectedPageId}
                    id="ig-item-visual-brief"
                    onChange={(event) => setSelectedPagePrompt(event.target.value)}
                    placeholder={t('generate.visualBriefPlaceholder')}
                    rows={4}
                    value={pagePrompt}
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

              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
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
                      className="w-full"
                      id={modelFieldId}
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        {LEONARDO_POST_MODEL_IDS.map((modelId) => (
                          <SelectItem key={modelId} value={modelId}>
                            {tModel(`options.${getLeonardoPostModelMessageKey(modelId)}.name`)}
                          </SelectItem>
                        ))}
                      </SelectGroup>
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
                    <SelectTrigger
                      aria-label={t('generate.style.label')}
                      className="w-full"
                      id={styleFieldId}
                    >
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
                      <SelectGroup>
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
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                  <FieldDescription>{t('generate.style.description')}</FieldDescription>
                </Field>
              </div>

              {selectedStyle ? <StyleUsageGuide spec={selectedStyle.spec} /> : null}
              <div className="flex flex-wrap gap-2">
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

              <FieldSeparator>{t('sections.content')}</FieldSeparator>

              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                <Field>
                  <FieldLabel htmlFor={kindFieldId}>{t('fields.kind')}</FieldLabel>
                  <ToggleGroup
                    aria-label={t('fields.kind')}
                    className="w-full"
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
                        className="min-h-8 flex-1 px-2 text-xs"
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
                    className="w-full"
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
                        className="min-h-8 flex-1 px-2 text-xs"
                        key={status}
                        value={status}
                      >
                        {t(`status.${status}`)}
                      </ToggleGroupItem>
                    ))}
                  </ToggleGroup>
                </Field>
              </div>

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
                  onChange={(event) =>
                    setValues((prev) => ({ ...prev, title: event.target.value }))
                  }
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
            if (!isDeletingVersion && !isDeletingPage) setDeleteDialogOpen(open)
          }}
          open={deleteDialogOpen}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>
                {deleteTarget === 'page'
                  ? t('pages.deleteConfirmTitle')
                  : t('generate.deleteVersionConfirmTitle')}
              </AlertDialogTitle>
              <AlertDialogDescription>
                {deleteTarget === 'page'
                  ? t('pages.deleteConfirmDescription')
                  : t('generate.deleteVersionConfirmDescription')}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isDeletingVersion || isDeletingPage} type="button">
                {deleteTarget === 'page'
                  ? t('pages.deleteConfirmCancel')
                  : t('generate.deleteVersionConfirmCancel')}
              </AlertDialogCancel>
              <Button
                disabled={isDeletingVersion || isDeletingPage}
                onClick={() => {
                  if (deleteTarget === 'page') {
                    void handleDeletePage()
                  } else {
                    void handleDeleteVersion()
                  }
                }}
                type="button"
                variant="destructive"
              >
                {isDeletingVersion || isDeletingPage ? <Spinner data-icon="inline-start" /> : null}
                {deleteTarget === 'page'
                  ? isDeletingPage
                    ? t('pages.deleteDeleting')
                    : t('pages.deleteConfirmAction')
                  : isDeletingVersion
                    ? t('generate.deleteVersionDeleting')
                    : t('generate.deleteVersionConfirmAction')}
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </TooltipProvider>
  )
}
