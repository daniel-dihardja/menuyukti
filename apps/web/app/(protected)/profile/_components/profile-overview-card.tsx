import Image from 'next/image'

import { cn } from '@workspace/ui/lib/utils'

import { isNextImageRemoteHost, withProfileImageParams } from '@/lib/clerk-profile-image'

export type ProfileOverviewCardProps = {
  name: string
  email: string
  imageUrl: string | null
  avatarAlt: string
}

const AVATAR_PX = 64

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

export function ProfileOverviewCard({
  name,
  email,
  imageUrl,
  avatarAlt,
}: ProfileOverviewCardProps) {
  const initials = initialsFromName(name)
  const resolvedSrc = imageUrl ? withProfileImageParams(imageUrl, AVATAR_PX) : null
  const canOptimize = resolvedSrc ? hostnameAllowsNextImage(resolvedSrc) : false

  return (
    <div className="flex max-w-md flex-row items-center gap-4">
      <div
        className={cn(
          'relative flex size-16 shrink-0 overflow-hidden rounded-full bg-muted text-lg font-medium text-muted-foreground',
          'items-center justify-center select-none',
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
          // eslint-disable-next-line @next/next/no-img-element -- host not in next/image remotePatterns
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
      </div>
      <div className="min-w-0 flex-1 space-y-1">
        <h2 className="truncate text-xl font-semibold tracking-tight text-foreground">{name}</h2>
        <p className="truncate text-sm text-muted-foreground">{email}</p>
      </div>
    </div>
  )
}
