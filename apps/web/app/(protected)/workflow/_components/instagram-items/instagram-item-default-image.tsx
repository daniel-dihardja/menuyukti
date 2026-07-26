'use client'

import { ClapperboardIcon, ImageIcon, RectangleVerticalIcon } from 'lucide-react'

import { cn } from '@workspace/ui/lib/utils'

import type { InstagramItemKind } from './use-instagram-items'

type InstagramItemDefaultImageProps = {
  kind?: InstagramItemKind | string
  className?: string
  iconClassName?: string
  label?: string
}

function KindIcon({ kind }: { kind?: string }) {
  if (kind === 'story') return <RectangleVerticalIcon aria-hidden />
  if (kind === 'reel') return <ClapperboardIcon aria-hidden />
  return <ImageIcon aria-hidden />
}

/**
 * Placeholder media tile when an Instagram item / page has no generated image.
 * Uses a darkened page background so multi-item grids stay calm.
 */
export function InstagramItemDefaultImage({
  kind,
  className,
  iconClassName,
  label,
}: InstagramItemDefaultImageProps) {
  return (
    <span
      aria-hidden={label ? undefined : true}
      className={cn(
        'flex size-full flex-col items-center justify-center gap-1 text-muted-foreground',
        'bg-[color-mix(in_srgb,var(--background)_78%,var(--foreground)_22%)]',
        "[&_svg:not([class*='size-'])]:size-8",
        className,
      )}
    >
      <KindIcon kind={kind} />
      {label ? (
        <span className={cn('font-medium text-xs leading-none', iconClassName)}>{label}</span>
      ) : null}
    </span>
  )
}
