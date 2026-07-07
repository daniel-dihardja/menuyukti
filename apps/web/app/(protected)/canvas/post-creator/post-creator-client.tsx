'use client'

import { useTranslations } from 'next-intl'
import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'

import { MAX_REFERENCE_IMAGES } from './_components/post-creator-constants'
import { PostCreatorLayout } from './_components/post-creator-layout'
import { PostCreatorPreviewPane } from './_components/post-creator-preview-pane'
import { PostCreatorPromptPane } from './_components/post-creator-prompt-pane'
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

export function PostCreatorClient({ postId }: { postId: string | null }) {
  const tToast = useTranslations('postCreator.toast')
  const [pages, setPages] = useState<PostCreatorPage[]>([])
  const [selectedPageId, setSelectedPageId] = useState<string | null>(null)
  const [prompt, setPrompt] = useState('')
  const [imageVersions, setImageVersions] = useState<PostCreatorImageVersion[]>([])
  const [previewVersionIndex, setPreviewVersionIndex] = useState(0)
  const [postImageVersionIndex, setPostImageVersionIndex] = useState(0)
  const [referenceImages, setReferenceImages] = useState<PostCreatorReferenceImage[]>([])
  const [isGenerating, setIsGenerating] = useState(false)
  const [isCommittingPostImage, setIsCommittingPostImage] = useState(false)
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
                  ? { ...page, prompt, referenceImages, previewVersionIndex }
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
        return withSyncedCurrent
      })
    },
    [previewVersionIndex, prompt, referenceImages, selectedPageId],
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
      if (referenceImages.length >= MAX_REFERENCE_IMAGES) return

      const next = [...referenceImages, photo]
      setReferenceImages(next)
      if (selectedPageId) {
        syncPageState(selectedPageId, { referenceImages: next })
      }
    },
    [referenceImages, selectedPageId, syncPageState],
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

  const handleGenerate = useCallback(async () => {
    const trimmed = prompt.trim()
    if (!trimmed || isGenerating) return

    setIsGenerating(true)
    try {
      const body: {
        prompt: string
        postId?: string
        pageId?: string
        referenceImages?: string[]
      } = { prompt: trimmed }

      if (postId && selectedPageId) {
        body.postId = postId
        body.pageId = selectedPageId
      }

      if (referenceImages.length > 0) {
        body.referenceImages = referenceImages.map((image) => image.name)
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

      if (selectedPageId) {
        syncPageState(selectedPageId, {
          imageUrl: data.url,
          mediaS3Key: data.mediaS3Key,
          imageVersions: nextVersions,
          previewVersionIndex: 0,
          prompt: trimmed,
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
    prompt,
    referenceImages,
    selectedPageId,
    syncPageState,
    tToast,
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

  const previewImageUrl =
    imageVersions[previewVersionIndex]?.imageUrl ??
    pages.find((page) => page.id === selectedPageId)?.imageUrl ??
    null

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
          />
        }
        previewPane={
          <PostCreatorPreviewPane
            imageUrl={previewImageUrl}
            imageVersions={imageVersions}
            previewVersionIndex={previewVersionIndex}
            postImageVersionIndex={postImageVersionIndex}
            onPreviewVersionIndex={handlePreviewVersion}
            onUseAsPostImage={() => void handleUseAsPostImage()}
            isLoading={isGenerating}
            isCommittingPostImage={isCommittingPostImage}
          />
        }
        promptPane={
          <PostCreatorPromptPane
            isGenerating={isGenerating}
            onAddReference={handleAddReference}
            onPromptChange={handlePromptChange}
            onRemoveReference={handleRemoveReference}
            onSubmit={() => void handleGenerate()}
            prompt={prompt}
            referenceImages={referenceImages}
          />
        }
      />
    </div>
  )
}
