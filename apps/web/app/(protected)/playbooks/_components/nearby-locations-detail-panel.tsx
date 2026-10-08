'use client'

import { useTranslations } from 'next-intl'
import { ExternalLink } from 'lucide-react'

import { googleMapsPlaceUrl, type NearbyScanNode } from '@/lib/playbooks/nearby-locations'
import { Badge } from '@workspace/ui/components/badge'
import { Button } from '@workspace/ui/components/button'
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from '@workspace/ui/components/empty'

type NearbyLocationsDetailPanelProps = {
  node: NearbyScanNode | null
}

export function NearbyLocationsDetailPanel({ node }: NearbyLocationsDetailPanelProps) {
  const t = useTranslations('playbooks.items.nearbyLocations.workspace')

  if (!node) {
    return (
      <div className="flex min-h-[320px] items-center justify-center rounded-lg border border-dashed p-4">
        <Empty>
          <EmptyHeader>
            <EmptyTitle>{t('panelEmptyTitle')}</EmptyTitle>
            <EmptyDescription>{t('panelEmptyDescription')}</EmptyDescription>
          </EmptyHeader>
        </Empty>
      </div>
    )
  }

  return (
    <div className="flex min-h-[320px] flex-col gap-4 rounded-lg border p-4">
      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-base font-semibold leading-snug">{node.name}</h3>
          <Badge variant="secondary">{t(`kind.${node.kind}`)}</Badge>
        </div>
        {node.address ? <p className="text-muted-foreground text-sm">{node.address}</p> : null}
      </div>

      <dl className="grid gap-3 text-sm">
        {node.rating != null ? (
          <div>
            <dt className="text-muted-foreground">{t('panelRating')}</dt>
            <dd className="font-medium">{node.rating.toFixed(1)}</dd>
          </div>
        ) : null}
        {node.distanceMeters != null ? (
          <div>
            <dt className="text-muted-foreground">{t('panelDistance')}</dt>
            <dd className="font-medium">
              {t('panelDistanceValue', { meters: node.distanceMeters })}
            </dd>
          </div>
        ) : null}
        {node.marketingHook ? (
          <div>
            <dt className="text-muted-foreground">{t('panelHook')}</dt>
            <dd className="mt-1 leading-relaxed">{node.marketingHook}</dd>
          </div>
        ) : null}
        {node.signals.length > 0 ? (
          <div>
            <dt className="text-muted-foreground">{t('panelSignals')}</dt>
            <dd className="mt-1">
              <ul className="list-disc space-y-1 pl-4">
                {node.signals.map((signal) => (
                  <li key={signal}>{signal}</li>
                ))}
              </ul>
            </dd>
          </div>
        ) : null}
        {node.sources.length > 0 ? (
          <div>
            <dt className="text-muted-foreground">{t('panelSources')}</dt>
            <dd className="mt-1 flex flex-col gap-1">
              {node.sources.map((url) => (
                <a
                  key={url}
                  href={url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-primary truncate text-sm underline-offset-2 hover:underline"
                >
                  {url}
                </a>
              ))}
            </dd>
          </div>
        ) : null}
      </dl>

      <div className="mt-auto pt-2">
        <Button asChild variant="outline" size="sm">
          <a href={googleMapsPlaceUrl(node)} target="_blank" rel="noreferrer">
            <ExternalLink data-icon="inline-start" />
            {t('panelOpenMaps')}
          </a>
        </Button>
      </div>
    </div>
  )
}
