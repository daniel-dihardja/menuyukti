'use client'

import { cn } from '@workspace/ui/lib/utils'

type InstagramItemDefaultImageProps = {
  /** Unused; accepted so existing call sites keep working. */
  kind?: string
  className?: string
  iconClassName?: string
  label?: string
}

/**
 * Placeholder media tile when an Instagram item / page has no generated image.
 * Uses a darkened page background so multi-item grids stay calm.
 */
export function InstagramItemDefaultImage({
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
        className,
      )}
    >
      <span
        aria-hidden
        className={cn(
          'select-none font-semibold text-2xl leading-none tracking-tight',
          iconClassName,
        )}
      >
        M
      </span>
      {label ? <span className="font-medium text-xs leading-none">{label}</span> : null}
    </span>
  )
}
