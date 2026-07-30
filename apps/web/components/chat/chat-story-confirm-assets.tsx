'use client'

import { useTranslations } from 'next-intl'

import type { StoryAssetRef } from '@/lib/chat/story-assets-from-messages'
import { mediaDownloadHref } from '@/lib/media/client-api'
import { formatMediaMentionLabel } from '@/lib/chat/chat-media-mention'

type ChatStoryConfirmAssetsProps = {
  assets: StoryAssetRef[]
}

function roleLabelKey(role: 'style' | 'content'): 'roleStyle' | 'roleContent' {
  return role === 'style' ? 'roleStyle' : 'roleContent'
}

export function ChatStoryConfirmAssets({ assets }: ChatStoryConfirmAssetsProps) {
  const t = useTranslations('chat.storyAssets')

  if (assets.length === 0) {
    return null
  }

  return (
    <ul className="flex flex-wrap gap-2" data-testid="story-confirm-assets">
      {assets.map((asset) => {
        if (asset.role !== 'style' && asset.role !== 'content') return null
        const roleLabel = t(roleLabelKey(asset.role))
        const label = asset.note.trim() || formatMediaMentionLabel(asset.name)
        return (
          <li
            className="flex max-w-full items-center gap-2 rounded-md border border-border/70 bg-muted/40 py-1 pr-2 pl-1"
            key={`${asset.role}:${asset.name}`}
          >
            {/* eslint-disable-next-line @next/next/no-img-element -- media library download URL */}
            <img
              alt=""
              className="size-10 shrink-0 rounded object-cover"
              src={mediaDownloadHref(asset.name)}
            />
            <div className="min-w-0 flex-1">
              <p className="truncate text-[0.65rem] font-semibold uppercase tracking-wide text-muted-foreground">
                {roleLabel}
              </p>
              <p className="truncate text-xs text-foreground" title={asset.name}>
                {label}
              </p>
            </div>
          </li>
        )
      })}
    </ul>
  )
}
