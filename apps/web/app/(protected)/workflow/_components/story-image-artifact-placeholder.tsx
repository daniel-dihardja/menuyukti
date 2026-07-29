'use client'

import { useTranslations } from 'next-intl'

import { InstagramItemDefaultImage } from './instagram-items/instagram-item-default-image'

export function StoryImageArtifactPlaceholder() {
  const t = useTranslations('analytics.workflows.chat.storyArtifact')

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
          <InstagramItemDefaultImage
            className="gap-3 p-8 text-center"
            iconClassName="text-5xl"
            kind="story"
            label={t('placeholderLabel')}
          />
        </div>
      </div>
    </section>
  )
}
