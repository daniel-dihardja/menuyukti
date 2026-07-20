'use client'

import { useId } from 'react'
import { useTranslations } from 'next-intl'

import { Input } from '@workspace/ui/components/input'
import { Label } from '@workspace/ui/components/label'

import { resolveLeonardoOutputDimensions } from '@/lib/posts/leonardo-post-dimensions'

import { usePostCreator } from '../_context/use-post-creator'
import { clampSafeZoneInsetPx, maxSafeZoneInsetPx } from './post-creator-constants'

export function PostCreatorSafeZoneSettings() {
  const t = useTranslations('postCreator.settings')
  const { state, actions } = usePostCreator()
  const { imageFormat, imageQuality, generationModel, safeZoneInsetXPx, safeZoneInsetYPx } = state
  const { setSafeZoneInsetXPx, setSafeZoneInsetYPx } = actions

  const horizontalId = useId()
  const verticalId = useId()
  const helperId = `${horizontalId}-helper`

  const resolved = resolveLeonardoOutputDimensions({
    model: generationModel,
    format: imageFormat,
    quality: imageQuality,
  })
  const maxX = maxSafeZoneInsetPx(resolved.width)
  const maxY = maxSafeZoneInsetPx(resolved.height)
  const displayX = clampSafeZoneInsetPx(safeZoneInsetXPx, resolved.width)
  const displayY = clampSafeZoneInsetPx(safeZoneInsetYPx, resolved.height)

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-0.5">
        <h4 className="text-sm font-medium">{t('safeZoneTitle')}</h4>
        <p id={helperId} className="text-xs text-muted-foreground">
          {t('safeZoneHelper')}
        </p>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={horizontalId} className="text-sm font-normal text-muted-foreground">
            {t('safeZoneHorizontal')}
          </Label>
          <Input
            id={horizontalId}
            type="number"
            min={0}
            max={maxX}
            step={1}
            value={displayX}
            onChange={(event) => {
              const next = Number(event.target.value)
              setSafeZoneInsetXPx(clampSafeZoneInsetPx(next, resolved.width))
            }}
            aria-describedby={helperId}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={verticalId} className="text-sm font-normal text-muted-foreground">
            {t('safeZoneVertical')}
          </Label>
          <Input
            id={verticalId}
            type="number"
            min={0}
            max={maxY}
            step={1}
            value={displayY}
            onChange={(event) => {
              const next = Number(event.target.value)
              setSafeZoneInsetYPx(clampSafeZoneInsetPx(next, resolved.height))
            }}
            aria-describedby={helperId}
          />
        </div>
      </div>
    </div>
  )
}
