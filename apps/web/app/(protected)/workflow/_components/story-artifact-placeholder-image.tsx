'use client'

import { cn } from '@workspace/ui/lib/utils'

type StoryArtifactPlaceholderImageProps = {
  className?: string
  iconClassName?: string
  label?: string
}

/** Placeholder tile when story mode has no generated image yet. */
export function StoryArtifactPlaceholderImage({
  className,
  iconClassName,
  label,
}: StoryArtifactPlaceholderImageProps) {
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
