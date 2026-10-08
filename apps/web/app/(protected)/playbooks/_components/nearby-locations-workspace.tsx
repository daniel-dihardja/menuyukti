'use client'

import { useMemo, useState } from 'react'
import { useTranslations } from 'next-intl'
import { Info, MapPin, Play } from 'lucide-react'
import { toast } from 'sonner'

import { NearbyLocationsDetailPanel } from '@/app/(protected)/playbooks/_components/nearby-locations-detail-panel'
import { NearbyLocationsMap } from '@/app/(protected)/playbooks/_components/nearby-locations-map'
import { scanNearbyLocations } from '@/lib/playbooks/client-api'
import {
  NEARBY_NODE_KINDS,
  type NearbyFocusId,
  type NearbyNodeKind,
  type NearbyScanNode,
  type NearbyScanResult,
} from '@/lib/playbooks/nearby-locations'
import { Alert, AlertDescription, AlertTitle } from '@workspace/ui/components/alert'
import { Badge } from '@workspace/ui/components/badge'
import { Button } from '@workspace/ui/components/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@workspace/ui/components/card'
import { Spinner } from '@workspace/ui/components/spinner'
import { ToggleGroup, ToggleGroupItem } from '@workspace/ui/components/toggle-group'

type PrepareRunResult = {
  locationId: number
  address: string
  instructions: string
  focus: NearbyFocusId[]
}

type NearbyLocationsWorkspaceProps = {
  prepareRun: () => Promise<PrepareRunResult>
  onRunningChange?: (running: boolean) => void
}

type ScanProgress = 'idle' | 'geocoding' | 'places' | 'enriching' | 'done'

export function NearbyLocationsWorkspace({
  prepareRun,
  onRunningChange,
}: NearbyLocationsWorkspaceProps) {
  const t = useTranslations('playbooks.items.nearbyLocations.workspace')
  const [running, setRunning] = useState(false)
  const [progress, setProgress] = useState<ScanProgress>('idle')
  const [result, setResult] = useState<NearbyScanResult | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [visibleKinds, setVisibleKinds] = useState<NearbyNodeKind[]>([...NEARBY_NODE_KINDS])

  const selectedNode: NearbyScanNode | null = useMemo(() => {
    if (!result || !selectedId) return null
    if (result.origin.id === selectedId) return result.origin
    return result.nodes.find((n) => n.id === selectedId) ?? null
  }, [result, selectedId])

  const visibleKindSet = useMemo(() => new Set(visibleKinds), [visibleKinds])

  const nodeCount = result ? 1 + result.nodes.length : 0

  async function handleScan() {
    if (running) return
    setRunning(true)
    onRunningChange?.(true)
    setError(null)
    setProgress('geocoding')
    try {
      const prepared = await prepareRun()
      setProgress('places')
      const scanned = await scanNearbyLocations({
        locationId: prepared.locationId,
        address: prepared.address,
        instructions: prepared.instructions,
        focus: prepared.focus,
      })
      setProgress('enriching')
      setResult(scanned)
      setSelectedId(scanned.origin.id)
      setProgress('done')
    } catch (err) {
      if (err instanceof Error && err.message === 'validation') {
        setProgress('idle')
        return
      }
      const message = err instanceof Error ? err.message : t('scanError')
      setError(message)
      setProgress('idle')
      toast.error(message)
    } finally {
      setRunning(false)
      onRunningChange?.(false)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <Alert>
        <Info />
        <AlertTitle>{t('sessionAlertTitle')}</AlertTitle>
        <AlertDescription>{t('sessionAlertDescription')}</AlertDescription>
      </Alert>

      <p className="text-muted-foreground text-sm">{t('workspaceHint')}</p>

      <div className="flex flex-wrap items-center gap-3">
        <Button type="button" onClick={() => void handleScan()} disabled={running}>
          {running ? <Spinner data-icon="inline-start" /> : <Play data-icon="inline-start" />}
          {running ? t('running') : t('run')}
        </Button>
        <span className="text-muted-foreground text-sm">{t(`progress.${progress}`)}</span>
        {result ? (
          <Badge variant="secondary">
            <MapPin data-icon="inline-start" />
            {t('nodesCount', { count: nodeCount })}
          </Badge>
        ) : null}
      </div>

      {error ? (
        <Alert variant="destructive">
          <AlertTitle>{t('scanErrorTitle')}</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      <div className="flex flex-wrap items-center gap-2">
        <span className="text-muted-foreground text-sm">{t('filterLabel')}</span>
        <ToggleGroup
          type="multiple"
          value={visibleKinds}
          onValueChange={(next) => {
            if (next.length === 0) return
            setVisibleKinds(
              next.filter((k): k is NearbyNodeKind =>
                (NEARBY_NODE_KINDS as readonly string[]).includes(k),
              ),
            )
          }}
          aria-label={t('filterLabel')}
        >
          {NEARBY_NODE_KINDS.map((kind) => (
            <ToggleGroupItem key={kind} value={kind}>
              {t(`filter.${kind}`)}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.6fr)_minmax(280px,1fr)]">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">{t('mapTitle')}</CardTitle>
            <CardDescription>{t('mapEmptyDescription')}</CardDescription>
          </CardHeader>
          <CardContent>
            <NearbyLocationsMap
              result={result}
              selectedId={selectedId}
              visibleKinds={visibleKindSet}
              onSelect={setSelectedId}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">{t('panelTitle')}</CardTitle>
          </CardHeader>
          <CardContent>
            <NearbyLocationsDetailPanel node={selectedNode} />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
