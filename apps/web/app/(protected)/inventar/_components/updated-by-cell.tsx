'use client'

import type { InventoryActor } from '@/lib/graphql/queries/inventory-stock'
import { withProfileImageParams } from '@/lib/clerk-profile-image'
import { Avatar, AvatarFallback, AvatarImage } from '@workspace/ui/components/avatar'
import { cn } from '@workspace/ui/lib/utils'

const AVATAR_PX = 24

function initialsFromName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase()
  return `${parts[0]![0] ?? ''}${parts[1]![0] ?? ''}`.toUpperCase()
}

type Props = {
  actor: InventoryActor | null | undefined
  emptyLabel: string
  className?: string
}

export function UpdatedByCell({ actor, emptyLabel, className }: Props) {
  if (actor == null) {
    return <span className={cn('text-sm text-muted-foreground', className)}>{emptyLabel}</span>
  }

  const displayName = actor.name?.trim() || emptyLabel
  const imageUrl = actor.imageUrl ? withProfileImageParams(actor.imageUrl, AVATAR_PX) : undefined

  return (
    <div className={cn('flex min-w-0 items-center gap-2', className)} title={displayName}>
      <Avatar size="sm" className="size-6">
        {imageUrl ? <AvatarImage src={imageUrl} alt="" /> : null}
        <AvatarFallback>{initialsFromName(displayName)}</AvatarFallback>
      </Avatar>
      <span className="truncate text-sm">{displayName}</span>
    </div>
  )
}
