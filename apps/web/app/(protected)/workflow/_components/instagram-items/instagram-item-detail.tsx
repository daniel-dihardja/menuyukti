'use client'

import { useCallback, useEffect, useId, useState } from 'react'
import { useTranslations } from 'next-intl'
import { ArrowLeftIcon, CopyIcon, PlusIcon, SparklesIcon, Trash2Icon, XIcon } from 'lucide-react'

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
import { DateTimePicker } from '@workspace/ui/components/date-time-picker'
import {
  Field,
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@workspace/ui/components/tabs'
import { Textarea } from '@workspace/ui/components/textarea'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@workspace/ui/components/tooltip'

import { toast } from 'sonner'

import { createCalendarEntry } from '@/lib/calendar/client-api'
import type {
  InstagramItemDto,
  InstagramItemPageDto,
  InstagramItemPageMediaVersionDto,
} from '@/lib/graphql/queries/instagram-items'
import { mediaDownloadHref } from '@/lib/media/client-api'
import { DEFAULT_LEONARDO_POST_MODEL } from '@/lib/posts/leonardo-post-models'
import type { PostCreatorReferenceImage } from '@/lib/posts/post-creator-types'
import { resolveGenerationReferences } from '@/lib/posts/resolve-generation-references'

import { useTimelineWorkspaceState } from '../timeline-context'
import { InstagramItemPreview } from './instagram-item-preview'
import {
  toFormValues,
  type InstagramItemFormValues,
  type InstagramItemKind,
  type InstagramItemStatus,
} from './use-instagram-items'

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
  const { locationId } = useTimelineWorkspaceState()
  const kindFieldId = useId()
  const statusFieldId = useId()
  const [values, setValues] = useState<InstagramItemFormValues>(() => toFormValues(item))
  const [referenceImages, setReferenceImages] = useState<PostCreatorReferenceImage[]>(() =>
    refsFromItem(item),
  )
  const [isGenerating, setIsGenerating] = useState(false)
  const [generateError, setGenerateError] = useState<string | null>(null)
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
  const [isAddingToCalendar, setIsAddingToCalendar] = useState(false)
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

  const selectedPage = pages.find((page) => page.id === selectedPageId) ?? pages[0]
  const pagePrompt = selectedPageId ? (pagePromptsById[selectedPageId] ?? '') : ''
  const busy =
    saving ||
    isGenerating ||
    isCommitting ||
    isDeletingVersion ||
    isAddingPage ||
    isDuplicatingPage ||
    isDeletingPage ||
    isAddingToCalendar
  const canAddToCalendar =
    !busy &&
    Boolean(locationId) &&
    values.title.trim().length > 0 &&
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(values.schedule.trim())
  const canGenerate = pagePrompt.trim().length > 0 && !busy && Boolean(selectedPageId)
  const previewVersion = imageVersions[previewVersionIndex] ?? imageVersions[0]
  const visibleMediaS3Key = previewVersion?.mediaS3Key || null
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
  const footerError = actionError

  function valuesWithRefs(): InstagramItemFormValues {
    return {
      ...values,
      referenceImages: persistableRefs(referenceImages),
    }
  }

  async function handleAddToCalendar() {
    const schedule = values.schedule.trim()
    const title = values.title.trim()
    const match = /^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})$/.exec(schedule)
    if (!locationId || !title || !match) {
      toast.error(t('addToCalendarNeedSchedule'))
      return
    }
    setIsAddingToCalendar(true)
    try {
      await createCalendarEntry({
        locationId,
        title,
        date: match[1]!,
        time: match[2]!,
        description: '',
        sourceRef: {
          type: 'instagram_item',
          workflowId: String(workflowId),
          itemId: String(item.id),
        },
      })
      toast.success(t('addToCalendarSuccess'))
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('addToCalendarError'))
    } finally {
      setIsAddingToCalendar(false)
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
          pageId: selectedPageId,
          prompt,
          model: DEFAULT_LEONARDO_POST_MODEL,
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
              <FieldSeparator className="mt-1">{t('sections.content')}</FieldSeparator>

              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                <Field>
                  <FieldLabel htmlFor={kindFieldId}>{t('fields.kind')}</FieldLabel>
                  <Select
                    disabled={busy}
                    onValueChange={(value) => {
                      setValues((prev) => ({ ...prev, kind: value as InstagramItemKind }))
                    }}
                    value={values.kind}
                  >
                    <SelectTrigger
                      aria-label={t('fields.kind')}
                      className="w-full"
                      id={kindFieldId}
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        {(['story', 'post', 'reel'] as const).map((kind) => (
                          <SelectItem key={kind} value={kind}>
                            {t(`kind.${kind}`)}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </Field>

                <Field>
                  <FieldLabel htmlFor={statusFieldId}>{t('fields.status')}</FieldLabel>
                  <Select
                    disabled={busy}
                    onValueChange={(value) => {
                      setValues((prev) => ({ ...prev, status: value as InstagramItemStatus }))
                    }}
                    value={values.status}
                  >
                    <SelectTrigger
                      aria-label={t('fields.status')}
                      className="w-full"
                      id={statusFieldId}
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        {(['draft', 'ready'] as const).map((status) => (
                          <SelectItem key={status} value={status}>
                            {t(`status.${status}`)}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
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

              <FieldSeparator>{t('pages.label')}</FieldSeparator>

              {pages.length > 0 && selectedPageId ? (
                <Tabs
                  className="gap-6"
                  onValueChange={(pageId) => {
                    selectPage(pageId)
                  }}
                  value={selectedPageId}
                >
                  <div className="flex min-w-0 items-center justify-between gap-2">
                    <TabsList
                      className="w-fit max-w-full min-w-0 shrink justify-start overflow-x-auto overflow-y-hidden overscroll-x-contain [-webkit-overflow-scrolling:touch]"
                      variant="line"
                    >
                      {pages.map((page, index) => (
                        <TabsTrigger
                          className="flex-none shrink-0 px-3"
                          disabled={busy}
                          key={page.id}
                          value={page.id}
                        >
                          {t('pages.tabLabel', { index: index + 1 })}
                        </TabsTrigger>
                      ))}
                    </TabsList>
                    <ButtonGroup aria-label={t('pages.actionsAria')} className="shrink-0">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            aria-label={t('pages.add')}
                            disabled={!canAddPage}
                            onClick={() => {
                              void handleAddPage()
                            }}
                            size="icon-sm"
                            type="button"
                            variant="outline"
                          >
                            {isAddingPage ? <Spinner /> : <PlusIcon />}
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent side="bottom">{t('pages.add')}</TooltipContent>
                      </Tooltip>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            aria-label={t('pages.duplicate')}
                            disabled={!canDuplicatePage}
                            onClick={() => {
                              void handleDuplicatePage()
                            }}
                            size="icon-sm"
                            type="button"
                            variant="outline"
                          >
                            {isDuplicatingPage ? <Spinner /> : <CopyIcon />}
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent side="bottom">{t('pages.duplicate')}</TooltipContent>
                      </Tooltip>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            aria-label={t('pages.delete')}
                            disabled={!canDeletePage}
                            onClick={() => {
                              setDeleteTarget('page')
                              setDeleteDialogOpen(true)
                            }}
                            size="icon-sm"
                            type="button"
                            variant="outline"
                          >
                            <Trash2Icon />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent side="bottom">{t('pages.delete')}</TooltipContent>
                      </Tooltip>
                    </ButtonGroup>
                  </div>

                  {pages.map((page) => (
                    <TabsContent className="flex flex-col gap-5 pt-2" key={page.id} value={page.id}>
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
                        <FieldLabel htmlFor={`ig-item-page-content-${page.id}`}>
                          {t('fields.pageContent')}
                        </FieldLabel>
                        <FieldDescription>{t('fields.pageContentHint')}</FieldDescription>
                        <Textarea
                          disabled={busy}
                          id={`ig-item-page-content-${page.id}`}
                          onChange={(event) => {
                            setPagePromptsById((prev) => ({
                              ...prev,
                              [page.id]: event.target.value,
                            }))
                          }}
                          placeholder={t('fields.pageContentPlaceholder')}
                          rows={4}
                          value={pagePromptsById[page.id] ?? ''}
                        />
                      </Field>

                      {generateError ? (
                        <Alert variant="destructive">
                          <AlertDescription>{generateError}</AlertDescription>
                        </Alert>
                      ) : null}

                      <div className="flex sm:justify-end">
                        <Button
                          className="w-full sm:w-auto"
                          disabled={!canGenerate}
                          onClick={() => {
                            void handleGenerate()
                          }}
                          size="sm"
                          type="button"
                          variant="secondary"
                        >
                          {isGenerating ? (
                            <Spinner data-icon="inline-start" />
                          ) : (
                            <SparklesIcon data-icon="inline-start" />
                          )}
                          {isGenerating ? t('generate.generating') : t('generate.button')}
                        </Button>
                      </div>
                    </TabsContent>
                  ))}
                </Tabs>
              ) : (
                <Alert>
                  <AlertDescription>{t('pages.empty')}</AlertDescription>
                </Alert>
              )}
            </FieldGroup>
          </div>

          <div className="flex shrink-0 flex-col gap-3 pt-3 pb-1">
            <Separator />
            {footerError ? (
              <Alert variant="destructive">
                <AlertDescription>{footerError}</AlertDescription>
              </Alert>
            ) : null}
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button
                className="sm:flex-1"
                disabled={!canAddToCalendar}
                onClick={() => {
                  void handleAddToCalendar()
                }}
                type="button"
                variant="outline"
              >
                {isAddingToCalendar ? <Spinner data-icon="inline-start" /> : null}
                {t('addToCalendar')}
              </Button>
              <Button className="sm:flex-1" disabled={busy} type="submit">
                {saving ? <Spinner data-icon="inline-start" /> : null}
                {t('saveButton')}
              </Button>
            </div>
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
