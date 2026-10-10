import Link from 'next/link'
import { ArrowRight, Coins, Vote } from 'lucide-react'

import { cn } from '@workspace/ui/lib/utils'

type PublicHubVoteRowProps = {
  href: string
  question: string
  pointsLabel: string | null
  ctaLabel: string
  completed: boolean
  className?: string
}

/** Compact one-line vote teaser — question only, no options. */
export function PublicHubVoteRow({
  href,
  question,
  pointsLabel,
  ctaLabel,
  completed,
  className,
}: PublicHubVoteRowProps) {
  return (
    <Link
      href={href}
      className={cn(
        'public-hub-enter-cta-secondary group flex items-center gap-3 rounded-xl border border-card-border bg-card px-3.5 py-3 text-card-foreground transition-[border-color,background-color] duration-200',
        'hover:border-[var(--color-border-strong)] hover:bg-muted/30',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
        className,
      )}
    >
      <span
        className="flex size-9 shrink-0 items-center justify-center rounded-lg tone-analytics text-foreground"
        aria-hidden
      >
        <Vote className="size-4" />
      </span>
      <span className="min-w-0 flex-1">
        <span
          className={cn(
            'block truncate text-sm font-medium tracking-tight',
            completed ? 'text-muted-foreground' : 'text-foreground',
          )}
        >
          {question}
        </span>
        {pointsLabel ? (
          <span className="mt-0.5 inline-flex items-center gap-1 text-xs font-medium text-warning">
            <Coins className="size-3 shrink-0" aria-hidden />
            {pointsLabel}
          </span>
        ) : null}
      </span>
      <span className="inline-flex shrink-0 items-center gap-1 text-xs font-medium text-muted-foreground">
        {ctaLabel}
        <ArrowRight
          className="size-3.5 opacity-70 transition-transform group-hover:translate-x-0.5"
          aria-hidden
        />
      </span>
    </Link>
  )
}
