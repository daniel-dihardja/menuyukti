'use client'

import { useTranslations } from 'next-intl'
import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'

import { PostCreatorLayout } from './_components/post-creator-layout'
import { PostCreatorPreviewPane } from './_components/post-creator-preview-pane'
import { PostCreatorPromptPane } from './_components/post-creator-prompt-pane'
import {
  PostCreatorThumbnailsPane,
  type PostCreatorPage,
} from './_components/post-creator-thumbnails-pane'

type GenerateResponse = {
  url: string
  name: string
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
    imageUrl: string | null
  }>
}

export function PostCreatorClient({ postId }: { postId: string | null }) {
  const tToast = useTranslations('postCreator.toast')
  const [pages, setPages] = useState<PostCreatorPage[]>([])
  const [selectedPageId, setSelectedPageId] = useState<string | null>(null)
  const [prompt, setPrompt] = useState('')
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [isLoadingPost, setIsLoadingPost] = useState(Boolean(postId))

  const applySelectedPage = useCallback((nextPages: PostCreatorPage[], pageId: string) => {
    const page = nextPages.find((p) => p.id === pageId)
    setSelectedPageId(pageId)
    setImageUrl(page?.imageUrl ?? null)
    setPrompt(page?.prompt ?? '')
  }, [])

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
            imageUrl: page.imageUrl,
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
      applySelectedPage(pages, pageId)
    },
    [applySelectedPage, pages],
  )

  const handleGenerate = useCallback(async () => {
    const trimmed = prompt.trim()
    if (!trimmed || isGenerating) return

    setIsGenerating(true)
    try {
      const body: { prompt: string; postId?: string; pageId?: string } = { prompt: trimmed }
      if (postId && selectedPageId) {
        body.postId = postId
        body.pageId = selectedPageId
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

      setImageUrl(data.url)

      if (selectedPageId) {
        setPages((current) =>
          current.map((page) =>
            page.id === selectedPageId ? { ...page, imageUrl: data.url, prompt: trimmed } : page,
          ),
        )
      }
    } catch {
      toast.error(tToast('generateError'))
    } finally {
      setIsGenerating(false)
    }
  }, [isGenerating, postId, prompt, selectedPageId, tToast])

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
        previewPane={<PostCreatorPreviewPane imageUrl={imageUrl} isLoading={isGenerating} />}
        promptPane={
          <PostCreatorPromptPane
            isGenerating={isGenerating}
            onPromptChange={setPrompt}
            onSubmit={() => void handleGenerate()}
            prompt={prompt}
          />
        }
      />
    </div>
  )
}
