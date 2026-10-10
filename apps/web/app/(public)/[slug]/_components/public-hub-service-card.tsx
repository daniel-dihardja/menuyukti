import Link from 'next/link'
import type { LucideIcon } from 'lucide-react'
import { ArrowRight, Coins } from 'lucide-react'

import { Button } from '@workspace/ui/components/button'
import { Card, CardContent } from '@workspace/ui/components/card'
import { cn } from '@workspace/ui/lib/utils'

type PublicHubServiceCardProps = {
  href: string
  title: string
  description: string | null
  pointsLabel: string | null
  ctaLabel: string
  completed: boolean
  icon: LucideIcon
  iconClassName?: string
  iconWrapClassName?: string
  className?: string
}

export function PublicHubServiceCard({
  href,
  title,
  description,
  pointsLabel,
  ctaLabel,
  completed,
  icon: Icon,
  iconClassName,
  iconWrapClassName,
  className,
}: PublicHubServiceCardProps) {
  return (
    <Card className={cn('public-hub-enter-cta-secondary gap-0 py-0 shadow-none', className)}>
      <CardContent className="flex flex-col gap-4 p-4 sm:p-5">
        <div className="flex items-start gap-3">
          <span
            className={cn(
              'flex size-10 shrink-0 items-center justify-center rounded-xl',
              iconWrapClassName ?? 'bg-accent text-foreground',
            )}
            aria-hidden
          >
            <Icon className={cn('size-5', iconClassName)} />
          </span>
          <div className="min-w-0 flex-1">
            <h3 className="text-base font-semibold tracking-tight text-foreground">{title}</h3>
            {description ? (
              <p className="mt-1 text-pretty text-sm leading-relaxed text-muted-foreground">
                {description}
              </p>
            ) : null}
            {pointsLabel ? (
              <p className="mt-2 inline-flex items-center gap-1.5 text-sm font-medium text-warning">
                <Coins className="size-3.5 shrink-0" aria-hidden />
                {pointsLabel}
              </p>
            ) : null}
          </div>
        </div>

        <Button
          asChild
          size="lg"
          variant="outline"
          className={cn(
            'h-auto min-h-11 w-full justify-between gap-2 border-border bg-transparent px-4 py-2.5 text-sm font-medium text-foreground shadow-none',
            'hover:border-[var(--color-border-strong)] hover:bg-muted/40',
            completed && 'text-muted-foreground',
          )}
        >
          <Link href={href}>
            <span>{ctaLabel}</span>
            <ArrowRight className="size-4 shrink-0 opacity-60" aria-hidden />
          </Link>
        </Button>
      </CardContent>
    </Card>
  )
}
