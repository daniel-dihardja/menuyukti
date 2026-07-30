'use client'

import { useTranslations } from 'next-intl'

import { StoryArtifactPlaceholderImage } from './story-artifact-placeholder-image'

type StoryImageArtifactProps = {
  imageUrl?: string | null
}

export function StoryImageArtifact({ imageUrl }: StoryImageArtifactProps) {
  const t = useTranslations('analytics.workflows.chat.storyArtifact')
  const hasImage = typeof imageUrl === 'string' && imageUrl.length > 0

  return (
    <section
      aria-label={t('ariaLabel')}
      className="relative min-h-0 w-full flex-1 overflow-hidden [container-type:size]"
    >
      <div className="absolute inset-0 flex items-center justify-center">
        <div
          className="overflow-hidden rounded-lg border border-border/60"
          style={{
            aspectRatio: '9 / 16',
            width: 'min(100cqw, calc(100cqh * 9 / 16))',
            height: 'min(100cqh, calc(100cqw * 16 / 9))',
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
    </section>
  )
}

/** @deprecated Prefer StoryImageArtifact */
export function StoryImageArtifactPlaceholder() {
  return <StoryImageArtifact />
}
