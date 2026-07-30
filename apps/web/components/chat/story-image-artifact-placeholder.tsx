'use client'

import { useId } from 'react'
import { useTranslations } from 'next-intl'

import { buttonVariants } from '@workspace/ui/components/button'
import { ToggleGroup, ToggleGroupItem } from '@workspace/ui/components/toggle-group'
import { cn } from '@workspace/ui/lib/utils'

import {
  CHAT_IMAGE_ASSISTANT_FORMAT_IDS,
  formatAspectCss,
  formatAspectNumber,
  type ChatImageAssistantFormatId,
} from '@/lib/posts/leonardo-post-dimensions'

import { StoryArtifactPlaceholderImage } from '@/components/chat/story-artifact-placeholder-image'
import { useChatActions, useChatComposerState, useChatMeta } from '@/components/chat/chat-context'

type StoryImageArtifactProps = {
  imageUrl?: string | null
}

function FormatPreviewFrame({ format }: { format: ChatImageAssistantFormatId }) {
  return (
    <span
      aria-hidden
      className="mb-0.5 block h-3.5 w-auto max-w-5 rounded-[2px] border border-current/50 bg-current/10"
      style={{ aspectRatio: formatAspectCss(format) }}
    />
  )
}

export function StoryImageArtifact({ imageUrl }: StoryImageArtifactProps) {
  const t = useTranslations('chat.storyArtifact')
  const tFormat = useTranslations('postCreator.prompt.format')
  const { selectedImageFormat } = useChatComposerState()
  const { setSelectedImageFormat } = useChatActions()
  const { isChatBusy } = useChatMeta()
  const formatFieldId = useId()
  const hasImage = typeof imageUrl === 'string' && imageUrl.length > 0
  const aspectCss = formatAspectCss(selectedImageFormat)
  const aspectNumber = formatAspectNumber(selectedImageFormat)

  return (
    <section
      aria-label={t('ariaLabel')}
      className="relative flex min-h-0 w-full flex-1 flex-col gap-2 overflow-hidden"
    >
      <div className="shrink-0 px-0.5">
        <ToggleGroup
          id={formatFieldId}
          type="single"
          value={selectedImageFormat}
          onValueChange={(value) => {
            if (!value) return
            setSelectedImageFormat(value as ChatImageAssistantFormatId)
          }}
          disabled={isChatBusy}
          className="flex flex-wrap justify-center gap-1.5"
          aria-label={t('formatAriaLabel')}
        >
          {CHAT_IMAGE_ASSISTANT_FORMAT_IDS.map((formatId) => {
            const name = tFormat(`options.${formatId}.name`)
            const ratio = tFormat(`options.${formatId}.ratio`)
            return (
              <ToggleGroupItem
                key={formatId}
                value={formatId}
                className={cn(
                  buttonVariants({ variant: 'secondary', size: 'sm' }),
                  'h-auto min-h-0 flex-col gap-0.5 rounded-sm px-2 py-1.5 text-xs font-medium shadow-none',
                  'border border-transparent hover:translate-y-0',
                  'data-[state=off]:border-border data-[state=off]:bg-transparent data-[state=off]:text-foreground data-[state=off]:hover:bg-secondary/50',
                  'data-[state=on]:bg-secondary data-[state=on]:text-secondary-foreground data-[state=on]:ring-2 data-[state=on]:ring-ring/40',
                )}
                aria-label={`${name} ${ratio}`}
              >
                <FormatPreviewFrame format={formatId} />
                <span>{name}</span>
                <span className="text-[0.65rem] font-normal opacity-70">{ratio}</span>
              </ToggleGroupItem>
            )
          })}
        </ToggleGroup>
      </div>
      <div className="relative min-h-0 w-full flex-1 overflow-hidden [container-type:size]">
        <div className="absolute inset-0 flex items-center justify-center">
          <div
            className="overflow-hidden rounded-lg border border-border/60"
            style={{
              aspectRatio: aspectCss,
              width: `min(100cqw, calc(100cqh * ${aspectNumber}))`,
              height: `min(100cqh, calc(100cqw / ${aspectNumber}))`,
            }}
          >
            {hasImage ? (
              // eslint-disable-next-line @next/next/no-img-element -- presigned S3 URLs
              <img alt={t('ariaLabel')} className="size-full object-cover" src={imageUrl} />
            ) : (
              <StoryArtifactPlaceholderImage
                className="gap-3 p-8 text-center"
                iconClassName="text-5xl"
                label={t('placeholderLabel')}
              />
            )}
          </div>
        </div>
      </div>
    </section>
  )
}

/** @deprecated Prefer StoryImageArtifact */
export function StoryImageArtifactPlaceholder() {
  return <StoryImageArtifact />
}
