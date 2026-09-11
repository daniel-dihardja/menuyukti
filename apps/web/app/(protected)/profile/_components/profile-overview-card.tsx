'use client'

import { isClerkAPIResponseError } from '@clerk/nextjs/errors'
import { useUser } from '@clerk/nextjs'
import { Camera } from 'lucide-react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { type ChangeEvent, useId, useRef, useState } from 'react'
import { toast } from 'sonner'

import { Button } from '@workspace/ui/components/button'
import { cn } from '@workspace/ui/lib/utils'

import { isNextImageRemoteHost, withProfileImageParams } from '@/lib/clerk-profile-image'
import type { ProfileAvatarPreset } from '@/lib/profile-avatar-presets'

import { ProfileAvatarPresets } from './profile-avatar-presets'

export type ProfileOverviewCardProps = {
  name: string
  email: string
  imageUrl: string | null
  avatarAlt: string
}

const AVATAR_PX = 64
const MAX_BYTES = 10 * 1024 * 1024
const ACCEPTED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif'])

function hostnameAllowsNextImage(url: string): boolean {
  try {
    return isNextImageRemoteHost(new URL(url).hostname)
  } catch {
    return false
  }
}

function initialsFromName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length >= 2) {
    return `${parts[0]![0] ?? ''}${parts[1]![0] ?? ''}`.toUpperCase()
  }
  if (parts.length === 1 && parts[0]!.length >= 2) {
    return parts[0]!.slice(0, 2).toUpperCase()
  }
  return name.slice(0, 2).toUpperCase() || '?'
}

function clerkErrorMessage(err: unknown, fallback: string): string {
  if (isClerkAPIResponseError(err) && err.errors?.[0]?.message) {
    return err.errors[0].message
  }
  if (err instanceof Error && err.message) {
    return err.message
  }
  return fallback
}

export function ProfileOverviewCard({
  name,
  email,
  imageUrl: imageUrlFromServer,
  avatarAlt,
}: ProfileOverviewCardProps) {
  const t = useTranslations('profile')
  const router = useRouter()
  const { user, isLoaded } = useUser()
  const inputRef = useRef<HTMLInputElement>(null)
  const inputId = useId()
  const hintId = useId()

  const [busy, setBusy] = useState<'upload' | 'remove' | 'preset' | null>(null)

  const liveImageUrl = isLoaded && user?.imageUrl ? user.imageUrl : imageUrlFromServer
  const hasCustomImage = Boolean(isLoaded && user?.hasImage)
  const initials = initialsFromName(name)
  const resolvedSrc = liveImageUrl ? withProfileImageParams(liveImageUrl, AVATAR_PX) : null
  const canOptimize = resolvedSrc ? hostnameAllowsNextImage(resolvedSrc) : false
  const canInteract = isLoaded && Boolean(user) && busy === null

  const openPicker = () => {
    if (!canInteract) return
    inputRef.current?.click()
  }

  const applyProfileFile = async (file: File) => {
    if (!user) return
    await user.setProfileImage({ file })
    toast.success(t('avatarChangeSuccess'))
    router.refresh()
  }

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    // Allow selecting the same file again later.
    event.target.value = ''
    if (!file || !user) return

    if (!ACCEPTED_TYPES.has(file.type)) {
      toast.error(t('avatarInvalidType'))
      return
    }
    if (file.size > MAX_BYTES) {
      toast.error(t('avatarTooLarge'))
      return
    }

    setBusy('upload')
    try {
      await applyProfileFile(file)
    } catch (err) {
      toast.error(clerkErrorMessage(err, t('avatarChangeError')))
    } finally {
      setBusy(null)
    }
  }

  const handlePresetSelect = async (preset: ProfileAvatarPreset) => {
    if (!user || !canInteract) return

    setBusy('preset')
    try {
      const res = await fetch(preset.src)
      if (!res.ok) {
        throw new Error(`Failed to load preset (${res.status})`)
      }
      const blob = await res.blob()
      const file = new File([blob], `${preset.id}.webp`, { type: 'image/webp' })
      await applyProfileFile(file)
    } catch (err) {
      toast.error(clerkErrorMessage(err, t('avatarChangeError')))
    } finally {
      setBusy(null)
    }
  }

  const handleRemove = async () => {
    if (!user || !canInteract || !user.hasImage) return

    setBusy('remove')
    try {
      await user.setProfileImage({ file: null })
      toast.success(t('avatarRemoveSuccess'))
      router.refresh()
    } catch (err) {
      toast.error(clerkErrorMessage(err, t('avatarRemoveError')))
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="max-w-md space-y-6">
      <div className="flex flex-row items-center gap-4">
        <div className="relative shrink-0">
          <input
            ref={inputRef}
            id={inputId}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            className="sr-only"
            disabled={!canInteract}
            onChange={handleFileChange}
            aria-describedby={hintId}
          />
          <button
            type="button"
            onClick={openPicker}
            disabled={!canInteract}
            aria-label={
              busy === 'upload' || busy === 'preset' ? t('avatarUploading') : t('avatarChangeAria')
            }
            aria-describedby={hintId}
            className={cn(
              'group relative flex size-16 overflow-hidden rounded-full bg-muted text-lg font-medium text-muted-foreground',
              'items-center justify-center select-none',
              'focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none',
              'disabled:cursor-not-allowed disabled:opacity-70',
            )}
          >
            {resolvedSrc && canOptimize ? (
              <Image
                src={resolvedSrc}
                alt={avatarAlt}
                width={AVATAR_PX}
                height={AVATAR_PX}
                priority
                sizes="64px"
                className="size-full object-cover"
              />
            ) : resolvedSrc ? (
              // eslint-disable-next-line @next/next/no-img-element -- host outside images.remotePatterns
              <img
                src={resolvedSrc}
                alt={avatarAlt}
                width={AVATAR_PX}
                height={AVATAR_PX}
                className="size-full object-cover"
                fetchPriority="high"
              />
            ) : (
              <span className="text-lg font-medium text-foreground">{initials}</span>
            )}
            <span
              className={cn(
                'absolute inset-0 flex items-center justify-center bg-black/45 text-white',
                'opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100',
                busy !== null && 'opacity-100',
              )}
              aria-hidden
            >
              {busy === 'upload' || busy === 'preset' ? (
                <span className="text-xs font-medium">{t('avatarUploading')}</span>
              ) : busy === 'remove' ? (
                <span className="text-xs font-medium">{t('avatarRemoving')}</span>
              ) : (
                <Camera className="size-5" />
              )}
            </span>
          </button>
        </div>
        <div className="min-w-0 flex-1 space-y-1">
          <h2 className="truncate text-xl font-semibold tracking-tight text-foreground">{name}</h2>
          <p className="truncate text-sm text-muted-foreground">{email}</p>
          <p id={hintId} className="text-muted-foreground text-xs">
            {t('avatarChangeHint')}
          </p>
          {hasCustomImage ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-auto px-0 text-muted-foreground hover:text-foreground"
              disabled={!canInteract}
              onClick={() => {
                void handleRemove()
              }}
            >
              {busy === 'remove' ? t('avatarRemoving') : t('avatarRemove')}
            </Button>
          ) : null}
        </div>
      </div>

      <ProfileAvatarPresets
        disabled={!canInteract}
        onSelect={(preset) => {
          void handlePresetSelect(preset)
        }}
      />
    </div>
  )
}
