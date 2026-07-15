'use client'

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
import { Spinner } from '@workspace/ui/components/spinner'
import { useTranslations } from 'next-intl'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'

import { resolveGenerationReferences } from '@/lib/posts/resolve-generation-references'
import { parsePostMediaFilename } from '@/lib/posts/parse-post-media-filename'

import { MAX_ATTACHED_REFERENCE_PHOTOS } from './_components/post-creator-constants'
import { PostCreatorLayout } from './_components/post-creator-layout'
import { PostCreatorPreviewPane } from './_components/post-creator-preview-pane'
import { PostCreatorRightPane } from './_components/post-creator-right-pane'
import {
  PostCreatorThumbnailsPane,
  type PostCreatorImageVersion,
  type PostCreatorPage,
  type PostCreatorReferenceImage,
} from './_components/post-creator-thumbnails-pane'

type GenerateResponse = {
  url: string
  name: string
  mediaS3Key: string
  size: number
  createdAt: string
  pageId: string | null
}

type GenerateErrorResponse = {
  message?: string
  code?: 'leonardo' | 'leonardo_tokens'
}

type PostApiResponse = {
  id: string
  title: string | null
  status: string
  pages: Array<{
    id: string
    sortOrder: number
    prompt: string | null
    mediaS3Key: string | null
    imageUrl: string | null
    imageVersions: PostCreatorImageVersion[]
  }>
}

function resolvePageImageVersions(page: {
  imageUrl: string | null
  mediaS3Key?: string | null
  imageVersions?: PostCreatorImageVersion[]
}): PostCreatorImageVersion[] {
  if (page.imageVersions && page.imageVersions.length > 0) {
    return page.imageVersions
  }
  if (page.imageUrl) {
    return [
      {
        id: 'current',
        mediaS3Key: page.mediaS3Key ?? '',
        imageUrl: page.imageUrl,
        createdAt: '',
      },
    ]
  }
  return []
}

function resolvePostImageVersionIndex(
  versions: PostCreatorImageVersion[],
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

function resolvePreviewVersionIndex(
  versions: PostCreatorImageVersion[],
  postImageIndex: number,
  storedPreviewIndex?: number,
): number {
  if (
    storedPreviewIndex != null &&
    storedPreviewIndex >= 0 &&
    storedPreviewIndex < versions.length
  ) {
    return storedPreviewIndex
  }
  return postImageIndex
}

function pageHasGeneratedImage(
  page: Pick<PostCreatorPage, 'imageUrl' | 'mediaS3Key' | 'imageVersions'> | undefined,
  versions: PostCreatorImageVersion[],
): boolean {
  if (versions.length > 0) {
    return true
  }
  if (page?.imageVersions && page.imageVersions.length > 0) {
    return true
  }
  if (page?.mediaS3Key) {
    return true
  }
  if (page?.imageUrl) {
    return true
  }
  return false
}

type DeleteTarget = 'page' | 'version'

type DeleteVersionResponse = {
  mediaS3Key: string | null
  imageUrl: string | null
  imageVersions: PostCreatorImageVersion[]
}

type CreatePageResponse = {
  id: string
  sortOrder: number
  prompt: string | null
  mediaS3Key: string | null
  imageUrl: string | null
  imageVersions: PostCreatorImageVersion[]
}

const MAX_POST_PAGES = 10

export function PostCreatorClient({ postId }: { postId: string | null }) {
  const tToast = useTranslations('postCreator.toast')
  const tPreview = useTranslations('postCreator.preview')
  const tPrompt = useTranslations('postCreator.prompt')
  const [pages, setPages] = useState<PostCreatorPage[]>([])
  const [selectedPageId, setSelectedPageId] = useState<string | null>(null)
  const [prompt, setPrompt] = useState('')
  const [imageVersions, setImageVersions] = useState<PostCreatorImageVersion[]>([])
  const [previewVersionIndex, setPreviewVersionIndex] = useState(0)
  const [postImageVersionIndex, setPostImageVersionIndex] = useState(0)
  const [referenceImages, setReferenceImages] = useState<PostCreatorReferenceImage[]>([])
  const [templateImage, setTemplateImage] = useState<PostCreatorReferenceImage | null>(null)
  const [usePreviousResult, setUsePreviousResult] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [isCommittingPostImage, setIsCommittingPostImage] = useState(false)
  const [isDeletingVersion, setIsDeletingVersion] = useState(false)
  const [isAddingPage, setIsAddingPage] = useState(false)
  const [isDuplicatingPage, setIsDuplicatingPage] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget>('version')
  const [isLoadingPost, setIsLoadingPost] = useState(Boolean(postId))

  const applySelectedPage = useCallback((nextPages: PostCreatorPage[], pageId: string) => {
    const page = nextPages.find((p) => p.id === pageId)
    const versions = resolvePageImageVersions({
      imageUrl: page?.imageUrl ?? null,
      mediaS3Key: page?.mediaS3Key,
      imageVersions: page?.imageVersions,
    })
    const committedIndex = resolvePostImageVersionIndex(versions, page?.mediaS3Key)
    const previewIndex = resolvePreviewVersionIndex(
      versions,
      committedIndex,
      page?.previewVersionIndex,
    )
    setSelectedPageId(pageId)
    setImageVersions(versions)
    setPostImageVersionIndex(committedIndex)
    setPreviewVersionIndex(previewIndex)
    setPrompt(page?.prompt ?? '')
    setReferenceImages(page?.referenceImages ?? [])
    setTemplateImage(page?.templateImage ?? null)
    const previewMediaS3Key = versions[previewIndex]?.mediaS3Key ?? page?.mediaS3Key ?? null
    setUsePreviousResult(
      page?.templateImage
        ? false
        : (page?.usePreviousResult ?? Boolean(parsePostMediaFilename(previewMediaS3Key))),
    )
  }, [])

  const syncPageState = useCallback(
    (
      pageId: string,
      patch: Partial<
        Pick<
          PostCreatorPage,
          | 'prompt'
          | 'imageUrl'
          | 'mediaS3Key'
          | 'imageVersions'
          | 'previewVersionIndex'
          | 'referenceImages'
          | 'templateImage'
          | 'usePreviousResult'
        >
      >,
    ) => {
      setPages((current) =>
        current.map((page) => (page.id === pageId ? { ...page, ...patch } : page)),
      )
    },
    [],
  )

  useEffect(() => {
    if (!postId) {
      setIsLoadingPost(false)
      return
    }

    let cancelled = false

    async function loadPost() {
      setIsLoadingPost(true)
      try {
        const res = await fetch(`/api/posts/${postId}`)
        if (!res.ok) {
          toast.error(tToast('loadError'))
          return
        }
        const data = (await res.json()) as PostApiResponse
        if (cancelled) return

        const loadedPages: PostCreatorPage[] = data.pages
          .toSorted((a, b) => a.sortOrder - b.sortOrder)
          .map((page) => ({
            id: page.id,
            sortOrder: page.sortOrder,
            prompt: page.prompt,
            mediaS3Key: page.mediaS3Key,
            imageUrl: page.imageUrl,
            imageVersions: page.imageVersions,
            referenceImages: [],
          }))

        setPages(loadedPages)
        if (loadedPages.length > 0) {
          applySelectedPage(loadedPages, loadedPages[0]!.id)
        }
      } catch {
        if (!cancelled) {
          toast.error(tToast('loadError'))
        }
      } finally {
        if (!cancelled) {
          setIsLoadingPost(false)
        }
      }
    }

    void loadPost()

    return () => {
      cancelled = true
    }
  }, [applySelectedPage, postId, tToast])

  const handleSelectPage = useCallback(
    (pageId: string) => {
      setPages((current) => {
        const withSyncedCurrent =
          selectedPageId !== null
            ? current.map((page) =>
                page.id === selectedPageId
                  ? {
                      ...page,
                      prompt,
                      referenceImages,
                      templateImage,
                      previewVersionIndex,
                      usePreviousResult,
                    }
                  : page,
              )
            : current

        const page = withSyncedCurrent.find((p) => p.id === pageId)
        const versions = resolvePageImageVersions({
          imageUrl: page?.imageUrl ?? null,
          mediaS3Key: page?.mediaS3Key,
          imageVersions: page?.imageVersions,
        })
        const committedIndex = resolvePostImageVersionIndex(versions, page?.mediaS3Key)
        const previewIndex = resolvePreviewVersionIndex(
          versions,
          committedIndex,
          page?.previewVersionIndex,
        )
        setSelectedPageId(pageId)
        setImageVersions(versions)
        setPostImageVersionIndex(committedIndex)
        setPreviewVersionIndex(previewIndex)
        setPrompt(page?.prompt ?? '')
        setReferenceImages(page?.referenceImages ?? [])
        setTemplateImage(page?.templateImage ?? null)
        const previewMediaS3Key = versions[previewIndex]?.mediaS3Key ?? page?.mediaS3Key ?? null
        setUsePreviousResult(
          page?.templateImage
            ? false
            : (page?.usePreviousResult ?? Boolean(parsePostMediaFilename(previewMediaS3Key))),
        )
        return withSyncedCurrent
      })
    },
    [
      previewVersionIndex,
      prompt,
      referenceImages,
      selectedPageId,
      templateImage,
      usePreviousResult,
    ],
  )

  const handlePromptChange = useCallback(
    (value: string) => {
      setPrompt(value)
      if (selectedPageId) {
        syncPageState(selectedPageId, { prompt: value })
      }
    },
    [selectedPageId, syncPageState],
  )

  const handleAddReference = useCallback(
    (photo: PostCreatorReferenceImage) => {
      if (referenceImages.some((image) => image.name === photo.name)) return
      if (referenceImages.length >= MAX_ATTACHED_REFERENCE_PHOTOS) return

      const next = [...referenceImages, { ...photo, enabled: photo.enabled ?? true }]
      setReferenceImages(next)
      if (selectedPageId) {
        syncPageState(selectedPageId, { referenceImages: next })
      }
    },
    [referenceImages, selectedPageId, syncPageState],
  )

  const handleToggleReferenceEnabled = useCallback(
    (name: string, enabled: boolean) => {
      const next = referenceImages.map((image) =>
        image.name === name ? { ...image, enabled } : image,
      )
      setReferenceImages(next)
      if (selectedPageId) {
        syncPageState(selectedPageId, { referenceImages: next })
      }
    },
    [referenceImages, selectedPageId, syncPageState],
  )

  const handleUsePreviousResultChange = useCallback(
    (value: boolean) => {
      setUsePreviousResult(value)
      if (selectedPageId) {
        syncPageState(selectedPageId, { usePreviousResult: value })
      }
    },
    [selectedPageId, syncPageState],
  )

  const handleRemoveReference = useCallback(
    (name: string) => {
      const next = referenceImages.filter((image) => image.name !== name)
      setReferenceImages(next)
      if (selectedPageId) {
        syncPageState(selectedPageId, { referenceImages: next })
      }
    },
    [referenceImages, selectedPageId, syncPageState],
  )

  const handleSelectTemplate = useCallback(
    (design: { name: string; url: string }) => {
      const next: PostCreatorReferenceImage = {
        name: design.name,
        url: design.url,
        enabled: true,
      }
      setTemplateImage(next)
      setUsePreviousResult(false)
      if (selectedPageId) {
        syncPageState(selectedPageId, { templateImage: next, usePreviousResult: false })
      }
    },
    [selectedPageId, syncPageState],
  )

  const handleClearTemplate = useCallback(() => {
    setTemplateImage(null)
    if (selectedPageId) {
      syncPageState(selectedPageId, { templateImage: null })
    }
  }, [selectedPageId, syncPageState])

  const handleGenerate = useCallback(async () => {
    const trimmed = prompt.trim()
    if (!trimmed || isGenerating) return

    const previewMediaS3Key = imageVersions[previewVersionIndex]?.mediaS3Key
    const { mode, references, tooManyReferences, hasTemplatePreviousConflict } =
      resolveGenerationReferences({
        templateImage,
        referenceImages,
        usePreviousResult,
        previewMediaS3Key,
      })

    if (hasTemplatePreviousConflict) {
      toast.error(tPrompt('generation.templatePreviousConflict'))
      return
    }

    if (mode === 'template-composite' && templateImage) {
      const enabledProductCount = referenceImages.filter((image) => image.enabled).length
      if (enabledProductCount === 0) {
        toast.error(tPrompt('generation.templateNeedsProducts'))
        return
      }
    }

    if (tooManyReferences) {
      toast.error(tPrompt('generation.tooManyReferences'))
      return
    }

    setIsGenerating(true)
    try {
      const body: {
        prompt: string
        postId?: string
        pageId?: string
        references?: typeof references
      } = { prompt: trimmed }

      if (postId && selectedPageId) {
        body.postId = postId
        body.pageId = selectedPageId
      }

      if (references.length > 0) {
        body.references = references
      }

      const res = await fetch('/api/posts/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as GenerateErrorResponse
        if (data.code === 'leonardo_tokens') {
          toast.error(tToast('leonardoInsufficientTokens'))
        } else if (data.code === 'leonardo') {
          toast.error(tToast('leonardoError'))
        } else {
          toast.error(tToast('generateError'))
        }
        return
      }

      const data = (await res.json()) as GenerateResponse
      if (!data.url) {
        toast.error(tToast('generateError'))
        return
      }

      const nextVersion: PostCreatorImageVersion = {
        id: data.name,
        mediaS3Key: data.mediaS3Key,
        imageUrl: data.url,
        createdAt: data.createdAt,
      }
      const nextVersions = [
        nextVersion,
        ...imageVersions.filter((version) => version.mediaS3Key !== data.mediaS3Key),
      ]
      setImageVersions(nextVersions)
      setPreviewVersionIndex(0)
      setPostImageVersionIndex(0)
      setUsePreviousResult(true)

      if (selectedPageId) {
        syncPageState(selectedPageId, {
          imageUrl: data.url,
          mediaS3Key: data.mediaS3Key,
          imageVersions: nextVersions,
          previewVersionIndex: 0,
          prompt: trimmed,
          usePreviousResult: true,
        })
      }
    } catch {
      toast.error(tToast('generateError'))
    } finally {
      setIsGenerating(false)
    }
  }, [
    imageVersions,
    isGenerating,
    postId,
    previewVersionIndex,
    prompt,
    referenceImages,
    selectedPageId,
    syncPageState,
    tPrompt,
    tToast,
    templateImage,
    usePreviousResult,
  ])

  const handlePreviewVersion = useCallback(
    (index: number) => {
      if (index === previewVersionIndex || isCommittingPostImage) {
        return
      }

      setPreviewVersionIndex(index)
      if (selectedPageId) {
        syncPageState(selectedPageId, { previewVersionIndex: index })
      }
    },
    [isCommittingPostImage, previewVersionIndex, selectedPageId, syncPageState],
  )

  const handleUseAsPostImage = useCallback(async () => {
    if (isCommittingPostImage || previewVersionIndex === postImageVersionIndex) {
      return
    }

    const version = imageVersions[previewVersionIndex]
    if (!version) {
      return
    }

    const previousPostImageIndex = postImageVersionIndex
    const previousPage = pages.find((page) => page.id === selectedPageId)

    setPostImageVersionIndex(previewVersionIndex)
    if (selectedPageId) {
      syncPageState(selectedPageId, {
        imageUrl: version.imageUrl,
        mediaS3Key: version.mediaS3Key || previousPage?.mediaS3Key,
      })
    }

    if (!postId || !selectedPageId || !version.mediaS3Key) {
      return
    }

    setIsCommittingPostImage(true)
    try {
      const res = await fetch(`/api/posts/${postId}/pages/${selectedPageId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mediaS3Key: version.mediaS3Key }),
      })

      if (!res.ok) {
        throw new Error('Failed to set post image')
      }

      const data = (await res.json()) as { imageUrl?: string; mediaS3Key?: string }
      const nextImageUrl = data.imageUrl ?? version.imageUrl
      const nextMediaS3Key = data.mediaS3Key ?? version.mediaS3Key

      if (selectedPageId) {
        syncPageState(selectedPageId, {
          imageUrl: nextImageUrl,
          mediaS3Key: nextMediaS3Key,
        })
      }
    } catch {
      setPostImageVersionIndex(previousPostImageIndex)
      if (selectedPageId && previousPage) {
        syncPageState(selectedPageId, {
          imageUrl: previousPage.imageUrl,
          mediaS3Key: previousPage.mediaS3Key,
        })
      }
      toast.error(tToast('imageSelectError'))
    } finally {
      setIsCommittingPostImage(false)
    }
  }, [
    imageVersions,
    isCommittingPostImage,
    pages,
    postId,
    postImageVersionIndex,
    previewVersionIndex,
    selectedPageId,
    syncPageState,
    tToast,
  ])

  const handleRequestDelete = useCallback(() => {
    if (!postId || !selectedPageId) {
      return
    }

    const selectedPage = pages.find((page) => page.id === selectedPageId)
    if (!pageHasGeneratedImage(selectedPage, imageVersions)) {
      if (pages.length <= 1) {
        return
      }
      setDeleteTarget('page')
      setDeleteDialogOpen(true)
      return
    }

    const version = imageVersions[previewVersionIndex]
    if (!version?.mediaS3Key) {
      return
    }
    setDeleteTarget('version')
    setDeleteDialogOpen(true)
  }, [imageVersions, pages, postId, previewVersionIndex, selectedPageId])

  const handleConfirmDeleteVersion = useCallback(async () => {
    const version = imageVersions[previewVersionIndex]
    if (!version?.mediaS3Key || !postId || !selectedPageId || isDeletingVersion) {
      return
    }

    setIsDeletingVersion(true)
    try {
      const res = await fetch(`/api/posts/${postId}/pages/${selectedPageId}/versions`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mediaS3Key: version.mediaS3Key }),
      })

      if (!res.ok) {
        throw new Error('Failed to delete image version')
      }

      const data = (await res.json()) as DeleteVersionResponse
      const nextVersions = data.imageVersions
      const nextPreviewIndex =
        nextVersions.length === 0
          ? 0
          : Math.min(previewVersionIndex, Math.max(0, nextVersions.length - 1))
      const nextCommittedIndex = resolvePostImageVersionIndex(nextVersions, data.mediaS3Key)

      setImageVersions(nextVersions)
      setPreviewVersionIndex(nextPreviewIndex)
      setPostImageVersionIndex(nextCommittedIndex)
      setDeleteDialogOpen(false)

      const nextUsePreviousResult =
        nextVersions.length > 0 &&
        Boolean(
          parsePostMediaFilename(nextVersions[nextPreviewIndex]?.mediaS3Key ?? data.mediaS3Key),
        )
      setUsePreviousResult(nextUsePreviousResult)

      if (selectedPageId) {
        syncPageState(selectedPageId, {
          imageUrl: data.imageUrl,
          mediaS3Key: data.mediaS3Key,
          imageVersions: nextVersions,
          previewVersionIndex: nextPreviewIndex,
          usePreviousResult: nextUsePreviousResult,
        })
      }
    } catch {
      toast.error(tToast('deleteImageError'))
    } finally {
      setIsDeletingVersion(false)
    }
  }, [
    imageVersions,
    isDeletingVersion,
    postId,
    previewVersionIndex,
    selectedPageId,
    syncPageState,
    tToast,
  ])

  const handleConfirmDeletePage = useCallback(async () => {
    if (!postId || !selectedPageId || isDeletingVersion) {
      return
    }

    setIsDeletingVersion(true)
    try {
      const res = await fetch(`/api/posts/${postId}/pages/${selectedPageId}`, {
        method: 'DELETE',
      })

      if (!res.ok) {
        throw new Error('Failed to delete post page')
      }

      const data = (await res.json()) as { pages: Array<{ id: string; sortOrder: number }> }
      const removedIndex = pages.findIndex((page) => page.id === selectedPageId)
      const nextPages = pages
        .filter((page) => page.id !== selectedPageId)
        .map((page) => {
          const updated = data.pages.find((candidate) => candidate.id === page.id)
          return updated ? { ...page, sortOrder: updated.sortOrder } : page
        })
        .toSorted((a, b) => a.sortOrder - b.sortOrder)

      setPages(nextPages)
      setDeleteDialogOpen(false)

      if (nextPages.length > 0) {
        const nextSelectedIndex = Math.min(Math.max(removedIndex, 0), nextPages.length - 1)
        applySelectedPage(nextPages, nextPages[nextSelectedIndex]!.id)
      } else {
        setSelectedPageId(null)
        setImageVersions([])
        setPrompt('')
        setReferenceImages([])
        setTemplateImage(null)
        setUsePreviousResult(false)
      }
    } catch {
      toast.error(tToast('deletePageError'))
    } finally {
      setIsDeletingVersion(false)
    }
  }, [applySelectedPage, isDeletingVersion, pages, postId, selectedPageId, tToast])

  const handleConfirmDelete = useCallback(async () => {
    if (deleteTarget === 'page') {
      await handleConfirmDeletePage()
      return
    }
    await handleConfirmDeleteVersion()
  }, [deleteTarget, handleConfirmDeletePage, handleConfirmDeleteVersion])

  const createPageFromSource = useCallback(
    async (copyFromPageId: string) => {
      if (!postId || pages.length >= MAX_POST_PAGES) {
        if (pages.length >= MAX_POST_PAGES) {
          toast.error(tToast('maxPagesReached'))
        }
        return
      }

      const syncedPages =
        selectedPageId !== null
          ? pages.map((page) =>
              page.id === selectedPageId
                ? {
                    ...page,
                    prompt,
                    referenceImages,
                    templateImage,
                    previewVersionIndex,
                    usePreviousResult,
                  }
                : page,
            )
          : pages

      if (!syncedPages.some((page) => page.id === copyFromPageId)) {
        return
      }

      setPages(syncedPages)

      const res = await fetch(`/api/posts/${postId}/pages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ copyFromPageId }),
      })

      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string }
        if (res.status === 400 && data.error?.includes('10 images')) {
          toast.error(tToast('maxPagesReached'))
        } else {
          toast.error(tToast('addPageError'))
        }
        return
      }

      const data = (await res.json()) as CreatePageResponse
      const newPage: PostCreatorPage = {
        id: data.id,
        sortOrder: data.sortOrder,
        prompt: data.prompt,
        mediaS3Key: data.mediaS3Key,
        imageUrl: data.imageUrl,
        imageVersions: data.imageVersions,
        referenceImages: [],
      }

      const nextPages = [...syncedPages, newPage].toSorted((a, b) => a.sortOrder - b.sortOrder)
      setPages(nextPages)
      applySelectedPage(nextPages, newPage.id)
    },
    [
      applySelectedPage,
      pages,
      postId,
      previewVersionIndex,
      prompt,
      referenceImages,
      selectedPageId,
      tToast,
      templateImage,
      usePreviousResult,
    ],
  )

  const handleAddPage = useCallback(async () => {
    if (!postId || isAddingPage || isDuplicatingPage || pages.length >= MAX_POST_PAGES) {
      if (pages.length >= MAX_POST_PAGES) {
        toast.error(tToast('maxPagesReached'))
      }
      return
    }

    const lastPage = [...pages].toSorted((a, b) => a.sortOrder - b.sortOrder).at(-1)
    if (!lastPage) {
      return
    }

    setIsAddingPage(true)
    try {
      await createPageFromSource(lastPage.id)
    } catch {
      toast.error(tToast('addPageError'))
    } finally {
      setIsAddingPage(false)
    }
  }, [createPageFromSource, isAddingPage, isDuplicatingPage, pages, postId, tToast])

  const handleDuplicatePage = useCallback(async () => {
    if (
      !postId ||
      !selectedPageId ||
      isAddingPage ||
      isDuplicatingPage ||
      pages.length >= MAX_POST_PAGES
    ) {
      if (pages.length >= MAX_POST_PAGES) {
        toast.error(tToast('maxPagesReached'))
      }
      return
    }

    setIsDuplicatingPage(true)
    try {
      await createPageFromSource(selectedPageId)
    } catch {
      toast.error(tToast('addPageError'))
    } finally {
      setIsDuplicatingPage(false)
    }
  }, [
    createPageFromSource,
    isAddingPage,
    isDuplicatingPage,
    pages.length,
    postId,
    selectedPageId,
    tToast,
  ])

  const selectedPage = pages.find((page) => page.id === selectedPageId)

  const previewImageUrl =
    imageVersions[previewVersionIndex]?.imageUrl ??
    selectedPage?.imageUrl ??
    templateImage?.url ??
    null
  const previewMediaS3Key =
    imageVersions[previewVersionIndex]?.mediaS3Key ?? selectedPage?.mediaS3Key ?? null
  const hasPreviewableVersion = Boolean(parsePostMediaFilename(previewMediaS3Key))

  const generationReferenceSummary = useMemo(() => {
    const { mode, references } = resolveGenerationReferences({
      templateImage,
      referenceImages,
      usePreviousResult,
      previewMediaS3Key,
    })
    const enabledPhotoCount = references.filter((reference) => reference.type === 'photo').length

    if (mode === 'template-composite' && templateImage) {
      return tPrompt('generation.referenceSummaryTemplateComposite', {
        count: enabledPhotoCount,
        template: templateImage.name,
      })
    }
    if (mode === 'filled-edit') {
      return tPrompt('generation.referenceSummaryFilledEdit')
    }

    const includesPrevious = references.some((reference) => reference.type === 'previous-result')

    if (includesPrevious && enabledPhotoCount > 0) {
      return tPrompt('generation.referenceSummaryPreviousAndPhotos', { count: enabledPhotoCount })
    }
    if (includesPrevious) {
      return tPrompt('generation.referenceSummaryPreviousOnly')
    }
    if (enabledPhotoCount > 0) {
      return tPrompt('generation.referenceSummaryPhotosOnly', { count: enabledPhotoCount })
    }
    return tPrompt('generation.referenceSummaryTextOnly')
  }, [previewMediaS3Key, referenceImages, tPrompt, templateImage, usePreviousResult])

  const canRemoveEmptyPage = pages.length > 1 && !pageHasGeneratedImage(selectedPage, imageVersions)

  return (
    <div
      className="flex min-h-0 min-h-[24rem] w-full flex-1 flex-col"
      data-post-id={postId ?? undefined}
    >
      <PostCreatorLayout
        thumbnailsPane={
          <PostCreatorThumbnailsPane
            isLoading={isLoadingPost}
            pages={pages}
            selectedPageId={selectedPageId}
            onSelectPage={handleSelectPage}
            onAddPage={postId ? () => void handleAddPage() : undefined}
            onDuplicatePage={postId ? () => void handleDuplicatePage() : undefined}
            canAddPage={Boolean(postId) && pages.length > 0 && pages.length < MAX_POST_PAGES}
            canDuplicatePage={
              Boolean(postId) &&
              Boolean(selectedPageId) &&
              pages.length > 0 &&
              pages.length < MAX_POST_PAGES
            }
            isAddingPage={isAddingPage}
            isDuplicatingPage={isDuplicatingPage}
          />
        }
        previewPane={
          <PostCreatorPreviewPane
            imageUrl={previewImageUrl}
            mediaS3Key={selectedPage?.mediaS3Key ?? imageVersions[previewVersionIndex]?.mediaS3Key}
            imageVersions={imageVersions}
            previewVersionIndex={previewVersionIndex}
            postImageVersionIndex={postImageVersionIndex}
            onPreviewVersionIndex={handlePreviewVersion}
            onUseAsPostImage={() => void handleUseAsPostImage()}
            onDeleteVersion={postId && selectedPageId ? handleRequestDelete : undefined}
            canRemoveEmptyPage={canRemoveEmptyPage}
            isLoading={isGenerating}
            isCommittingPostImage={isCommittingPostImage}
            isDeletingVersion={isDeletingVersion}
          />
        }
        promptPane={
          <PostCreatorRightPane
            generationReferenceSummary={generationReferenceSummary}
            hasPreviewableVersion={hasPreviewableVersion}
            isGenerating={isGenerating}
            onAddReference={handleAddReference}
            onPromptChange={handlePromptChange}
            onRemoveReference={handleRemoveReference}
            onSubmit={() => void handleGenerate()}
            onToggleReferenceEnabled={handleToggleReferenceEnabled}
            onUsePreviousResultChange={handleUsePreviousResultChange}
            onClearTemplate={handleClearTemplate}
            onSelectTemplate={handleSelectTemplate}
            prompt={prompt}
            referenceImages={referenceImages}
            templateImage={templateImage}
            usePreviousResult={usePreviousResult}
          />
        }
      />
      <AlertDialog
        open={deleteDialogOpen}
        onOpenChange={(open) => {
          if (!open && !isDeletingVersion) {
            setDeleteDialogOpen(false)
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {deleteTarget === 'page'
                ? tPreview('removePageConfirmTitle')
                : tPreview('deleteConfirmTitle')}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget === 'page'
                ? tPreview('removePageConfirmDescription')
                : tPreview('deleteConfirmDescription')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeletingVersion} type="button">
              {tPreview('deleteConfirmCancel')}
            </AlertDialogCancel>
            <Button
              className={isDeletingVersion ? 'inline-flex items-center gap-2' : undefined}
              disabled={isDeletingVersion}
              onClick={() => void handleConfirmDelete()}
              type="button"
              variant="destructive"
            >
              {isDeletingVersion ? (
                <>
                  <Spinner />
                  {deleteTarget === 'page'
                    ? tPreview('removePageConfirmAction')
                    : tPreview('deleteConfirmAction')}
                </>
              ) : deleteTarget === 'page' ? (
                tPreview('removePageConfirmAction')
              ) : (
                tPreview('deleteConfirmAction')
              )}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
