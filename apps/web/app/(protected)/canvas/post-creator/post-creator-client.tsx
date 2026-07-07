'use client'

import { useTranslations } from 'next-intl'
import { useCallback, useState } from 'react'
import { toast } from 'sonner'

import { PostCreatorLayout } from './_components/post-creator-layout'
import { PostCreatorPreviewPane } from './_components/post-creator-preview-pane'
import { PostCreatorPromptPane } from './_components/post-creator-prompt-pane'

type GenerateResponse = {
  url: string
  name: string
  size: number
  createdAt: string
}

type GenerateErrorResponse = {
  message?: string
  code?: 'leonardo' | 'leonardo_tokens'
}

export function PostCreatorClient({ postId }: { postId: string | null }) {
  const t = useTranslations('postCreator')
  const tToast = useTranslations('postCreator.toast')
  const [prompt, setPrompt] = useState('')
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)

  const handleGenerate = useCallback(async () => {
    const trimmed = prompt.trim()
    if (!trimmed || isGenerating) return

    setIsGenerating(true)
    try {
      const res = await fetch('/api/posts/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: trimmed }),
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
    } catch {
      toast.error(tToast('generateError'))
    } finally {
      setIsGenerating(false)
    }
  }, [isGenerating, prompt, tToast])

  return (
    <div
      className="flex min-h-0 min-h-[24rem] w-full flex-1 flex-col"
      data-post-id={postId ?? undefined}
    >
      <PostCreatorLayout
        thumbnailsPane={<section aria-label={t('thumbnailsPane')} className="h-full min-h-0" />}
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
