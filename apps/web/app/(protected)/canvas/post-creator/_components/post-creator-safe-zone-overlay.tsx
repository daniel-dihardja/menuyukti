'use client'

import { useTranslations } from 'next-intl'

import {
  INSTAGRAM_GRID_THUMBNAIL_INSET_X,
  INSTAGRAM_GRID_THUMBNAIL_INSET_X_PERCENT,
  INSTAGRAM_GRID_THUMBNAIL_INSET_Y,
  INSTAGRAM_GRID_THUMBNAIL_INSET_Y_PERCENT,
} from './post-creator-constants'

export function PostCreatorSafeZoneOverlay() {
  const t = useTranslations('postCreator.preview')
  const insetXPercent = INSTAGRAM_GRID_THUMBNAIL_INSET_X_PERCENT
  const insetYPercent = INSTAGRAM_GRID_THUMBNAIL_INSET_Y_PERCENT

  return (
    <div className="pointer-events-none absolute inset-0 z-10" aria-hidden>
      <div
        className="absolute inset-y-0 left-0 bg-black/25"
        style={{ width: `${insetXPercent}%` }}
      />
      <div
        className="absolute inset-y-0 right-0 bg-black/25"
        style={{ width: `${insetXPercent}%` }}
      />
      <div
        className="absolute inset-x-0 top-0 bg-black/25"
        style={{ height: `${insetYPercent}%` }}
      />
      <div
        className="absolute inset-x-0 bottom-0 bg-black/25"
        style={{ height: `${insetYPercent}%` }}
      />
      <div
        className="absolute inset-y-0 border-l border-dashed border-primary/80"
        style={{ left: `${insetXPercent}%` }}
      />
      <div
        className="absolute inset-y-0 border-r border-dashed border-primary/80"
        style={{ right: `${insetXPercent}%` }}
      />
      <div
        className="absolute inset-x-0 border-t border-dashed border-primary/80"
        style={{ top: `${insetYPercent}%` }}
      />
      <div
        className="absolute inset-x-0 border-b border-dashed border-primary/80"
        style={{ bottom: `${insetYPercent}%` }}
      />
      <span className="sr-only">
        {t('gridSafeZoneDescription', {
          insetX: INSTAGRAM_GRID_THUMBNAIL_INSET_X,
          insetY: INSTAGRAM_GRID_THUMBNAIL_INSET_Y,
        })}
      </span>
    </div>
  )
}
