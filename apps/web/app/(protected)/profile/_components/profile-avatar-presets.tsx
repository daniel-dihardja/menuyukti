'use client'

import Image from 'next/image'
import { useTranslations } from 'next-intl'

import { cn } from '@workspace/ui/lib/utils'

import {
  PROFILE_AVATAR_PRESETS,
  type ProfileAvatarPreset,
} from '@/lib/profile-avatar-presets'

const PRESET_THUMB_PX = 56

export type ProfileAvatarPresetsProps = {
  disabled: boolean
  onSelect: (preset: ProfileAvatarPreset) => void
}

export function ProfileAvatarPresets({ disabled, onSelect }: ProfileAvatarPresetsProps) {
  const t = useTranslations('profile')

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium text-foreground">{t('avatarPresetsHeading')}</p>
      <ul className="flex flex-row flex-wrap gap-3" role="list">
        {PROFILE_AVATAR_PRESETS.map((preset) => (
          <li key={preset.id}>
            <button
              type="button"
              disabled={disabled}
              aria-label={t(preset.labelKey)}
              onClick={() => onSelect(preset)}
              className={cn(
                'relative size-14 overflow-hidden rounded-full bg-muted',
                'ring-offset-background transition-shadow',
                'focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none',
                'hover:ring-2 hover:ring-ring/40',
                'disabled:cursor-not-allowed disabled:opacity-70',
              )}
            >
              <Image
                src={preset.src}
                alt=""
                width={PRESET_THUMB_PX}
                height={PRESET_THUMB_PX}
                sizes="56px"
                className="size-full object-cover"
              />
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}
