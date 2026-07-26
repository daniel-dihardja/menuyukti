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
 * Uses the design-system primary color so empties stay on-brand.
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
        'flex size-full flex-col items-center justify-center gap-1 bg-primary text-primary-foreground',
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
