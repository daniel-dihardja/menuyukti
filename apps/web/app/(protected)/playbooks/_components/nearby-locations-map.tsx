'use client'

import { useEffect, useMemo } from 'react'
import { APIProvider, Map, AdvancedMarker, useMap } from '@vis.gl/react-google-maps'
import { useTranslations } from 'next-intl'

import {
  type NearbyNodeKind,
  type NearbyScanNode,
  type NearbyScanResult,
} from '@/lib/playbooks/nearby-locations'
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from '@workspace/ui/components/empty'

const KIND_COLORS: Record<NearbyNodeKind, string> = {
  origin: '#0f766e',
  demand: '#2563eb',
  competitor: '#dc2626',
  landmark: '#9333ea',
}

type NearbyLocationsMapProps = {
  result: NearbyScanResult | null
  selectedId: string | null
  visibleKinds: Set<NearbyNodeKind>
  onSelect: (nodeId: string) => void
}

function FitBounds({ nodes }: { nodes: NearbyScanNode[] }) {
  const map = useMap()
  useEffect(() => {
    if (!map || nodes.length === 0) return
    if (nodes.length === 1) {
      const only = nodes[0]
      if (only) {
        map.setCenter({ lat: only.lat, lng: only.lng })
        map.setZoom(15)
      }
      return
    }
    let north = -90
    let south = 90
    let east = -180
    let west = 180
    for (const node of nodes) {
      north = Math.max(north, node.lat)
      south = Math.min(south, node.lat)
      east = Math.max(east, node.lng)
      west = Math.min(west, node.lng)
    }
    map.fitBounds({ north, south, east, west }, 64)
  }, [map, nodes])
  return null
}

function MapCanvas({
  result,
  selectedId,
  visibleKinds,
  onSelect,
}: NearbyLocationsMapProps & { result: NearbyScanResult }) {
  const markers = useMemo(() => {
    const all = [result.origin, ...result.nodes]
    return all.filter((n) => visibleKinds.has(n.kind))
  }, [result, visibleKinds])

  const center = { lat: result.origin.lat, lng: result.origin.lng }

  return (
    <Map
      className="h-full min-h-[320px] w-full rounded-lg"
      defaultCenter={center}
      defaultZoom={14}
      mapId="DEMO_MAP_ID"
      gestureHandling="greedy"
      disableDefaultUI={false}
    >
      <FitBounds nodes={markers} />
      {markers.map((node) => {
        const selected = node.id === selectedId
        const color = KIND_COLORS[node.kind]
        return (
          <AdvancedMarker
            key={node.id}
            position={{ lat: node.lat, lng: node.lng }}
            title={node.name}
            onClick={() => onSelect(node.id)}
          >
            <button
              type="button"
              className="flex flex-col items-center gap-0.5 border-0 bg-transparent p-0"
              aria-label={node.name}
              aria-pressed={selected}
            >
              <span
                className="block size-3.5 rounded-full border-2 border-white shadow-md"
                style={{
                  backgroundColor: color,
                  transform: selected ? 'scale(1.35)' : 'scale(1)',
                  outline: selected ? `2px solid ${color}` : undefined,
                  outlineOffset: selected ? 2 : undefined,
                }}
              />
            </button>
          </AdvancedMarker>
        )
      })}
    </Map>
  )
}

export function NearbyLocationsMap(props: NearbyLocationsMapProps) {
  const t = useTranslations('playbooks.items.nearbyLocations.workspace')
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY?.trim() ?? ''

  if (!apiKey) {
    return (
      <div className="bg-muted/30 flex min-h-[320px] items-center justify-center rounded-lg border border-dashed">
        <Empty>
          <EmptyHeader>
            <EmptyTitle>{t('mapMissingKeyTitle')}</EmptyTitle>
            <EmptyDescription>{t('mapMissingKeyDescription')}</EmptyDescription>
          </EmptyHeader>
        </Empty>
      </div>
    )
  }

  if (!props.result) {
    return (
      <div className="bg-muted/30 flex min-h-[320px] items-center justify-center rounded-lg border border-dashed">
        <Empty>
          <EmptyHeader>
            <EmptyTitle>{t('mapEmptyTitle')}</EmptyTitle>
            <EmptyDescription>{t('mapEmptyDescription')}</EmptyDescription>
          </EmptyHeader>
        </Empty>
      </div>
    )
  }

  return (
    <APIProvider apiKey={apiKey}>
      <div className="h-[min(60vh,520px)] min-h-[320px] w-full overflow-hidden rounded-lg border">
        <MapCanvas {...props} result={props.result} />
      </div>
    </APIProvider>
  )
}
