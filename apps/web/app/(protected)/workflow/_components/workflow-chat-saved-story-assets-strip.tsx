'use client'

import { XIcon } from 'lucide-react'
import { useTranslations } from 'next-intl'

import type { StoryAssetRef } from '@/lib/chat/story-assets-from-messages'
import { mediaDownloadHref } from '@/lib/media/client-api'
import { formatMediaMentionLabel } from '@/lib/chat/workflow-chat-media-mention'
import { cn } from '@workspace/ui/lib/utils'

type WorkflowChatSavedStoryAssetsStripProps = {
  assets: StoryAssetRef[]
  disabled?: boolean
  onRemove: (name: string) => void
}

export function WorkflowChatSavedStoryAssetsStrip({
  assets,
  disabled = false,
  onRemove,
}: WorkflowChatSavedStoryAssetsStripProps) {
  const t = useTranslations('analytics.workflows.chat.storyAssets')

  if (assets.length === 0) {
    return null
  }

  return (
    <div className="w-full px-3 pt-3" data-testid="story-saved-assets-strip">
      <p className="mb-2 text-xs font-medium text-muted-foreground">{t('title')}</p>
      <ul className="flex flex-wrap gap-2">
        {assets.map((asset) => {
          const label = asset.note.trim() || formatMediaMentionLabel(asset.name)
          const roleLabel = asset.role === 'style' ? t('roleStyle') : t('roleProduct')
          return (
            <li
              className="flex max-w-full items-center gap-2 rounded-md border border-border/70 bg-muted/40 py-1 pr-1 pl-1"
              key={`${asset.role}:${asset.name}`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element -- media download URLs */}
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
              <button
                aria-label={t('removeAriaLabel', { role: roleLabel })}
                className={cn(
                  'inline-flex size-7 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-background hover:text-foreground',
                  disabled && 'pointer-events-none opacity-50',
                )}
                disabled={disabled}
                onClick={() => onRemove(asset.name)}
                type="button"
              >
                <XIcon className="size-3.5" />
              </button>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
