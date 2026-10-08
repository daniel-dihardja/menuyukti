import Link from 'next/link'

import { PublicGuestHeader, PublicGuestShell } from '@/app/(public)/_components/public-guest-shell'
import type { PublicLocationView } from '@/lib/public-location/load-public-location'
import { routes } from '@/lib/routes'
import { Button } from '@workspace/ui/components/button'
import { cn } from '@workspace/ui/lib/utils'

type HubCopy = {
  lead: string
  emptyLead: string
  menuTitle: string
  menuDishCount: (count: number) => string
  predictionTitle: string
  predictionOpenCount: (count: number) => string
}

type PublicLocationHubProps = {
  location: PublicLocationView
  copy: HubCopy
}

function truncateTeaser(text: string, max = 88): string {
  const trimmed = text.trim()
  if (trimmed.length <= max) return trimmed
  return `${trimmed.slice(0, max - 1).trimEnd()}…`
}

export function PublicLocationHub({ location, copy }: PublicLocationHubProps) {
  const menuService = location.services.find((s) => s.key === 'digital_menu')
  const predictionService = location.services.find((s) => s.key === 'prediction')
  const menuAvailable = Boolean(menuService?.available)
  const predictionAvailable = Boolean(predictionService?.available)
  const hasServices = menuAvailable || predictionAvailable
  const hasHeaderImage = Boolean(location.headerImageUrl)

  const menuHref = routes.public.locationMenu(location.publicSlug)
  const predictionHref = routes.public.locationPrediction(location.publicSlug)

  const menuSubtitle =
    menuAvailable && location.menuDishCount != null && location.menuDishCount > 0
      ? copy.menuDishCount(location.menuDishCount)
      : null

  let predictionSubtitle: string | null = null
  if (predictionAvailable && location.predictionTeaser) {
    const teaser = location.predictionTeaser
    predictionSubtitle =
      teaser.openCount > 1
        ? copy.predictionOpenCount(teaser.openCount)
        : truncateTeaser(teaser.question)
  }

  return (
    <PublicGuestShell>
      <PublicGuestHeader headerImageUrl={location.headerImageUrl}>
        <h1
          className={cn(
            'public-hub-enter-title font-heading text-4xl leading-tight tracking-tight text-pretty sm:text-5xl',
            hasHeaderImage ? 'text-white' : 'text-foreground',
          )}
        >
          {location.name}
        </h1>
        <p
          className={cn(
            'public-hub-enter-lead mt-3 max-w-md text-pretty text-base leading-relaxed sm:text-lg',
            hasHeaderImage ? 'text-white/85' : 'text-muted-foreground',
          )}
        >
          {hasServices ? copy.lead : copy.emptyLead}
        </p>
      </PublicGuestHeader>

      {hasServices ? (
        <div className="mx-auto flex w-full max-w-lg flex-col gap-3 px-6 pb-16 sm:px-10">
          {menuAvailable ? (
            <Button
              asChild
              size="lg"
              className="public-hub-enter-cta h-auto min-h-14 w-full flex-col items-center gap-0.5 whitespace-normal py-3.5 text-base"
            >
              <Link href={menuHref}>
                <span className="font-semibold">{copy.menuTitle}</span>
                {menuSubtitle ? (
                  <span className="text-sm font-normal opacity-90">{menuSubtitle}</span>
                ) : null}
              </Link>
            </Button>
          ) : null}

          {predictionAvailable ? (
            <Button
              asChild
              size="lg"
              variant={menuAvailable ? 'outline' : 'default'}
              className={cn(
                'public-hub-enter-cta-secondary h-auto min-h-14 w-full flex-col items-center gap-0.5 whitespace-normal py-3.5 text-base',
                menuAvailable &&
                  'border-foreground/15 bg-background/70 backdrop-blur-sm hover:bg-background/90',
              )}
            >
              <Link href={predictionHref}>
                <span className="font-semibold">{copy.predictionTitle}</span>
                {predictionSubtitle ? (
                  <span className="line-clamp-2 max-w-full text-sm font-normal opacity-80">
                    {predictionSubtitle}
                  </span>
                ) : null}
              </Link>
            </Button>
          ) : null}
        </div>
      ) : null}
    </PublicGuestShell>
  )
}
