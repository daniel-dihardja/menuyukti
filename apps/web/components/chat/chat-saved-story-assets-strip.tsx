'use client'

import type { UIMessage } from 'ai'
import { XIcon } from 'lucide-react'
import { useTranslations } from 'next-intl'

import {
  resultThumbnailUrlFromMessages,
  type StoryAssetRef,
} from '@/lib/chat/story-assets-from-messages'
import { mediaDownloadHref } from '@/lib/media/client-api'
import { formatMediaMentionLabel } from '@/lib/chat/chat-media-mention'
import { cn } from '@workspace/ui/lib/utils'

type ChatSavedStoryAssetsStripProps = {
  assets: StoryAssetRef[]
  messages?: UIMessage[]
  disabled?: boolean
  onRemove: (name: string) => void
}

function roleLabelKey(role: StoryAssetRef['role']): 'roleStyle' | 'roleContent' | 'roleResult' {
  if (role === 'style') return 'roleStyle'
  if (role === 'content') return 'roleContent'
  return 'roleResult'
}

function assetThumbnailSrc(asset: StoryAssetRef, messages: UIMessage[]): string | null {
  if (asset.role === 'result') {
    return resultThumbnailUrlFromMessages(messages, asset.name)
  }
  return mediaDownloadHref(asset.name)
}

export function ChatSavedStoryAssetsStrip({
  assets,
  messages = [],
  disabled = false,
  onRemove,
}: ChatSavedStoryAssetsStripProps) {
  const t = useTranslations('chat.storyAssets')

  if (assets.length === 0) {
    return null
  }

  return (
    <div className="w-full px-3 pt-3" data-testid="story-saved-assets-strip">
      <p className="mb-2 text-xs font-medium text-muted-foreground">{t('title')}</p>
      <ul className="flex flex-wrap gap-2">
        {assets.map((asset) => {
          const label =
            asset.note.trim() ||
            (asset.role === 'result' ? t('resultLabel') : formatMediaMentionLabel(asset.name))
          const roleLabel = t(roleLabelKey(asset.role))
          const thumbSrc = assetThumbnailSrc(asset, messages)
          return (
            <li
              className="flex max-w-full items-center gap-2 rounded-md border border-border/70 bg-muted/40 py-1 pr-1 pl-1"
              key={`${asset.role}:${asset.name}`}
            >
              {thumbSrc ? (
                // eslint-disable-next-line @next/next/no-img-element -- media / generate URLs
                <img alt="" className="size-10 shrink-0 rounded object-cover" src={thumbSrc} />
              ) : (
                <div aria-hidden className="size-10 shrink-0 rounded bg-muted" />
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate text-[0.65rem] font-semibold uppercase tracking-wide text-muted-foreground">
                  {roleLabel}
                </p>
                <p className="truncate text-xs text-foreground" title={asset.name}>
                  {label}
                </p>
              </div>
              <button
                aria-label={t('removeAriaLabel', { role: roleLabel })}
                className={cn(
                  'inline-flex size-11 shrink-0 touch-manipulation items-center justify-center rounded-md text-muted-foreground hover:bg-background hover:text-foreground lg:size-8',
                  disabled && 'pointer-events-none opacity-50',
                )}
                disabled={disabled}
                onClick={() => onRemove(asset.name)}
                type="button"
              >
                <XIcon aria-hidden />
              </button>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
