'use client'

import { useTranslations } from 'next-intl'
import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { toast } from 'sonner'

import { parsePostMediaFilename } from '@/lib/posts/parse-post-media-filename'
import { resolveGenerationReferences } from '@/lib/posts/resolve-generation-references'
import {
  MAX_POST_PAGES,
  type PostCreatorDeleteTarget,
  type PostCreatorImageVersion,
  type PostCreatorPage,
  type PostCreatorReferenceImage,
} from '@/lib/posts/post-creator-types'
import {
  pageHasGeneratedImage,
  resolvePageImageVersions,
  resolvePostImageVersionIndex,
  resolvePreviewVersionIndex,
  resolveUsePreviousResultForPage,
} from '@/lib/posts/post-creator-utils'

import { MAX_ATTACHED_REFERENCE_PHOTOS } from '../_components/post-creator-constants'
import { PostCreatorContext } from './post-creator-context'
import type { PostCreatorContextValue, PostCreatorMode } from './types'

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

type PostCreatorProviderProps = {
  mode: PostCreatorMode
  postId: string | null
  children: ReactNode
}

export function PostCreatorProvider({ mode, postId, children }: PostCreatorProviderProps) {
  const tToast = useTranslations('postCreator.toast')
  const tPrompt = useTranslations('postCreator.prompt')
  const canPersistPages = mode === 'persisted' && postId !== null

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
  const [deleteTarget, setDeleteTarget] = useState<PostCreatorDeleteTarget>('version')
  const [isLoadingPost, setIsLoadingPost] = useState(canPersistPages)

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
    setUsePreviousResult(resolveUsePreviousResultForPage(page, previewMediaS3Key))
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
    if (!canPersistPages || !postId) {
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
  }, [applySelectedPage, canPersistPages, postId, tToast])

  const selectPage = useCallback(
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
        setUsePreviousResult(resolveUsePreviousResultForPage(page, previewMediaS3Key))
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

  const setPromptValue = useCallback(
    (value: string) => {
      setPrompt(value)
      if (selectedPageId) {
        syncPageState(selectedPageId, { prompt: value })
      }
    },
    [selectedPageId, syncPageState],
  )

  const addReference = useCallback(
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

  const toggleReferenceEnabled = useCallback(
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

  const setUsePreviousResultValue = useCallback(
    (value: boolean) => {
      setUsePreviousResult(value)
      if (selectedPageId) {
        syncPageState(selectedPageId, { usePreviousResult: value })
      }
    },
    [selectedPageId, syncPageState],
  )

  const removeReference = useCallback(
    (name: string) => {
      const next = referenceImages.filter((image) => image.name !== name)
      setReferenceImages(next)
      if (selectedPageId) {
        syncPageState(selectedPageId, { referenceImages: next })
      }
    },
    [referenceImages, selectedPageId, syncPageState],
  )

  const selectTemplate = useCallback(
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

  const clearTemplate = useCallback(() => {
    setTemplateImage(null)
    if (selectedPageId) {
      syncPageState(selectedPageId, { templateImage: null })
    }
  }, [selectedPageId, syncPageState])

  const generate = useCallback(async () => {
    const trimmed = prompt.trim()
    if (!trimmed || isGenerating) return

    const previewMediaS3Key = imageVersions[previewVersionIndex]?.mediaS3Key
    const {
      mode: genMode,
      references,
      tooManyReferences,
      hasTemplatePreviousConflict,
    } = resolveGenerationReferences({
      templateImage,
      referenceImages,
      usePreviousResult,
      previewMediaS3Key,
    })

    if (hasTemplatePreviousConflict) {
      toast.error(tPrompt('generation.templatePreviousConflict'))
      return
    }

    if (genMode === 'template-composite' && templateImage) {
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

      if (canPersistPages && postId && selectedPageId) {
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
    canPersistPages,
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

  const previewVersion = useCallback(
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

  const commitPostImage = useCallback(async () => {
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

    if (!canPersistPages || !postId || !selectedPageId || !version.mediaS3Key) {
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
    canPersistPages,
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

  const confirmDelete = useCallback(async () => {
    if (deleteTarget === 'page') {
      await handleConfirmDeletePage()
      return
    }
    await handleConfirmDeleteVersion()
  }, [deleteTarget, handleConfirmDeletePage, handleConfirmDeleteVersion])

  const requestDelete = useCallback(() => {
    if (!canPersistPages || !postId || !selectedPageId) {
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
  }, [canPersistPages, imageVersions, pages, postId, previewVersionIndex, selectedPageId])

  const closeDeleteDialog = useCallback(() => {
    if (!isDeletingVersion) {
      setDeleteDialogOpen(false)
    }
  }, [isDeletingVersion])

  const createPageFromSource = useCallback(
    async (copyFromPageId: string) => {
      if (!canPersistPages || !postId || pages.length >= MAX_POST_PAGES) {
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
      canPersistPages,
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

  const addPage = useCallback(async () => {
    if (!canPersistPages || isAddingPage || isDuplicatingPage || pages.length >= MAX_POST_PAGES) {
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
  }, [canPersistPages, createPageFromSource, isAddingPage, isDuplicatingPage, pages, tToast])

  const duplicatePage = useCallback(async () => {
    if (
      !canPersistPages ||
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
    canPersistPages,
    createPageFromSource,
    isAddingPage,
    isDuplicatingPage,
    pages.length,
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
    const { mode: genMode, references } = resolveGenerationReferences({
      templateImage,
      referenceImages,
      usePreviousResult,
      previewMediaS3Key,
    })
    const enabledPhotoCount = references.filter((reference) => reference.type === 'photo').length

    if (genMode === 'template-composite' && templateImage) {
      return tPrompt('generation.referenceSummaryTemplateComposite', {
        count: enabledPhotoCount,
        template: templateImage.name,
      })
    }
    if (genMode === 'filled-edit') {
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
  const canAddPage = canPersistPages && pages.length > 0 && pages.length < MAX_POST_PAGES
  const canDuplicatePage =
    canPersistPages && Boolean(selectedPageId) && pages.length > 0 && pages.length < MAX_POST_PAGES
  const canDelete = canPersistPages && Boolean(postId) && Boolean(selectedPageId)

  const value = useMemo<PostCreatorContextValue>(
    () => ({
      state: {
        pages,
        selectedPageId,
        prompt,
        imageVersions,
        previewVersionIndex,
        postImageVersionIndex,
        referenceImages,
        templateImage,
        usePreviousResult,
        isGenerating,
        isCommittingPostImage,
        isDeletingVersion,
        isAddingPage,
        isDuplicatingPage,
        isLoadingPost,
        deleteDialogOpen,
        deleteTarget,
      },
      actions: {
        selectPage,
        setPrompt: setPromptValue,
        generate,
        previewVersion,
        commitPostImage,
        requestDelete,
        confirmDelete,
        closeDeleteDialog,
        addPage,
        duplicatePage,
        addReference,
        removeReference,
        toggleReferenceEnabled,
        setUsePreviousResult: setUsePreviousResultValue,
        selectTemplate,
        clearTemplate,
      },
      meta: {
        mode,
        postId,
        canPersistPages,
        previewImageUrl,
        previewMediaS3Key,
        hasPreviewableVersion,
        generationReferenceSummary,
        canRemoveEmptyPage,
        canAddPage,
        canDuplicatePage,
        canDelete,
        selectedPageMediaS3Key:
          selectedPage?.mediaS3Key ?? imageVersions[previewVersionIndex]?.mediaS3Key,
      },
    }),
    [
      addPage,
      addReference,
      canAddPage,
      canDelete,
      canDuplicatePage,
      canPersistPages,
      canRemoveEmptyPage,
      clearTemplate,
      closeDeleteDialog,
      commitPostImage,
      confirmDelete,
      deleteDialogOpen,
      deleteTarget,
      duplicatePage,
      generate,
      generationReferenceSummary,
      hasPreviewableVersion,
      imageVersions,
      isAddingPage,
      isCommittingPostImage,
      isDeletingVersion,
      isDuplicatingPage,
      isGenerating,
      isLoadingPost,
      mode,
      pages,
      postId,
      postImageVersionIndex,
      previewImageUrl,
      previewMediaS3Key,
      previewVersion,
      previewVersionIndex,
      prompt,
      referenceImages,
      removeReference,
      requestDelete,
      selectPage,
      selectTemplate,
      selectedPage?.mediaS3Key,
      selectedPageId,
      setPromptValue,
      setUsePreviousResultValue,
      templateImage,
      toggleReferenceEnabled,
      usePreviousResult,
    ],
  )

  return <PostCreatorContext value={value}>{children}</PostCreatorContext>
}
