'use client'

import { useId } from 'react'
import { useTranslations } from 'next-intl'

import { Input } from '@workspace/ui/components/input'
import { Label } from '@workspace/ui/components/label'
import { Switch } from '@workspace/ui/components/switch'

import { usePostCreator } from '../_context/use-post-creator'
import { normalizeSolidBackgroundColor } from './post-creator-constants'

export function PostCreatorSolidBackgroundSettings() {
  const t = useTranslations('postCreator.settings')
  const { state, actions } = usePostCreator()
  const { solidBackgroundEnabled, solidBackgroundColor } = state
  const { setSolidBackgroundEnabled, setSolidBackgroundColor } = actions

  const toggleId = useId()
  const colorId = useId()
  const helperId = `${toggleId}-helper`
  const displayColor = normalizeSolidBackgroundColor(solidBackgroundColor)

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-0.5">
        <h4 className="text-sm font-medium">{t('solidBackgroundTitle')}</h4>
        <p id={helperId} className="text-xs text-muted-foreground">
          {t('solidBackgroundHelper')}
        </p>
      </div>
      <div className="flex items-center justify-between gap-3">
        <Label htmlFor={toggleId} className="text-sm font-normal text-muted-foreground">
          {t('solidBackgroundToggle')}
        </Label>
        <Switch
          id={toggleId}
          checked={solidBackgroundEnabled}
          onCheckedChange={setSolidBackgroundEnabled}
          aria-describedby={helperId}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={colorId} className="text-sm font-normal text-muted-foreground">
          {t('solidBackgroundColor')}
        </Label>
        <div className="flex items-center gap-2">
          <Input
            id={colorId}
            type="color"
            value={displayColor}
            disabled={!solidBackgroundEnabled}
            onChange={(event) => {
              setSolidBackgroundColor(normalizeSolidBackgroundColor(event.target.value))
            }}
            className="h-9 w-14 cursor-pointer p-1 disabled:cursor-not-allowed"
            aria-describedby={helperId}
          />
          <span className="font-mono text-sm uppercase text-muted-foreground" aria-hidden>
            {displayColor}
          </span>
        </div>
      </div>
    </div>
  )
}
