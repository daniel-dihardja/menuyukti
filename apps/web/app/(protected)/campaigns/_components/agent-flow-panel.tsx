'use client'

import {
  ReactFlow,
  ReactFlowProvider,
  useEdgesState,
  useNodesState,
  useReactFlow,
  Handle,
  Position,
  MarkerType,
  type Edge,
  type Node,
  type NodeProps,
  type NodeTypes,
} from '@xyflow/react'
import type { SimulationLinkDatum, SimulationNodeDatum } from 'd3-force'
import '@xyflow/react/dist/style.css'
import { forceCenter, forceLink, forceManyBody, forceSimulation } from 'd3-force'
import { useCallback, useEffect, useMemo, useRef, useState, type MouseEvent } from 'react'
import { useTranslations } from 'next-intl'
import {
  Artifact,
  ArtifactContent,
  ArtifactDescription,
  ArtifactHeader,
  ArtifactTitle,
} from '@workspace/ui/components/ai-elements/artifact'
import { MessageResponse } from '@workspace/ui/components/ai-elements/message'
import { Button } from '@workspace/ui/components/button'
import { cn } from '@workspace/ui/lib/utils'
import { MapPinIcon, XIcon } from 'lucide-react'
import { agentEdges, agentNodes, type AgentNodeData as AgentNodeMeta } from './agent-flow-data'

/** Approximate node box for centering in force layout (matches Tailwind max-w + padding). */
const NODE_WIDTH = 220
const NODE_HEIGHT = 96

type AgentNodeData = { label: string; description: string }

function AgentNode({ data, selected }: NodeProps<Node<AgentNodeData, 'agent'>>) {
  return (
    <div
      className={cn(
        'max-w-[220px] rounded-lg border px-3 py-2.5 shadow-sm transition-colors',
        selected
          ? 'border-primary bg-primary/5 ring-2 ring-primary/30'
          : 'border-border bg-card',
      )}
    >
      <Handle type="target" position={Position.Left} className="!size-2 !border-2 !bg-primary" />
      <p className="text-sm font-semibold leading-snug text-foreground">{data.label}</p>
      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{data.description}</p>
      <Handle type="source" position={Position.Right} className="!size-2 !border-2 !bg-primary" />
    </div>
  )
}

const nodeTypes: NodeTypes = { agent: AgentNode }

function buildEdges(): Edge[] {
  return agentEdges.map((e) => ({
    id: e.id,
    source: e.source,
    target: e.target,
    type: 'smoothstep',
    style: { strokeWidth: 2 },
    markerEnd: {
      type: MarkerType.ArrowClosed,
      width: 20,
      height: 20,
      color: 'var(--border)',
    },
  }))
}

type SimNode = (typeof agentNodes)[number] &
  SimulationNodeDatum & {
    id: string
  }

type SimLink = SimulationLinkDatum<SimNode>

function runForceLayout(width: number, height: number): Node<AgentNodeData, 'agent'>[] {
  const simNodes: SimNode[] = agentNodes.map((n, i) => ({
    ...n,
    x: width / 2 + (i - 1) * (width * 0.12),
    y: height / 2 + Math.sin(i * 1.2) * (height * 0.08),
  }))

  const links: SimLink[] = agentEdges.map((e) => ({
    source: e.source,
    target: e.target,
  }))

  const simulation = forceSimulation(simNodes)
    .force(
      'link',
      forceLink<SimNode, SimLink>(links)
        .id((d) => d.id)
        .distance(Math.min(width, height) * 0.28)
        .strength(0.85),
    )
    .force('charge', forceManyBody<SimNode>().strength(-Math.min(width, height) * 0.45))
    .force('center', forceCenter(width / 2, height / 2))
    .alphaDecay(0.05)
    .velocityDecay(0.35)

  for (let i = 0; i < 400 && simulation.alpha() > 0.02; i += 1) {
    simulation.tick()
  }
  simulation.stop()

  return agentNodes.map((n) => {
    const sn = simNodes.find((s) => s.id === n.id)!
    const x = (sn.x ?? width / 2) - NODE_WIDTH / 2
    const y = (sn.y ?? height / 2) - NODE_HEIGHT / 2
    return {
      id: n.id,
      type: 'agent' as const,
      position: { x, y },
      data: { label: n.label, description: n.description },
    }
  })
}

function applySelection(
  list: Node<AgentNodeData, 'agent'>[],
  selectedNodeId: string | null,
): Node<AgentNodeData, 'agent'>[] {
  return list.map((n) => ({
    ...n,
    selected: n.id === selectedNodeId,
  }))
}

type AgentFlowCanvasProps = {
  selectedNodeId: string | null
  onNodeSelect: (id: string) => void
}

function AgentFlowCanvas({ selectedNodeId, onNodeSelect }: AgentFlowCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  /** Keeps selection when relayout runs without adding selectedNodeId to layout deps (avoids relayout on every click). */
  const selectedNodeIdRef = useRef(selectedNodeId)
  selectedNodeIdRef.current = selectedNodeId

  const { fitView } = useReactFlow()
  const initialEdges = useMemo(() => buildEdges(), [])
  const [nodes, setNodes, onNodesChange] = useNodesState<Node<AgentNodeData, 'agent'>>([])
  const [edges, , onEdgesChange] = useEdgesState<Edge>(initialEdges)

  const layoutAndFit = useCallback(() => {
    const el = containerRef.current
    if (!el) return
    const { width, height } = el.getBoundingClientRect()
    if (width < 32 || height < 32) return
    setNodes(applySelection(runForceLayout(width, height), selectedNodeIdRef.current))
    requestAnimationFrame(() => {
      fitView({ padding: 0.12, duration: 200 })
    })
  }, [fitView, setNodes])

  useEffect(() => {
    layoutAndFit()
  }, [layoutAndFit])

  useEffect(() => {
    const el = containerRef.current
    if (!el || typeof ResizeObserver === 'undefined') return
    const ro = new ResizeObserver(() => {
      layoutAndFit()
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [layoutAndFit])

  useEffect(() => {
    setNodes((nds) => applySelection(nds, selectedNodeId))
  }, [selectedNodeId, setNodes])

  const onNodeClick = useCallback(
    (_: MouseEvent, node: Node<AgentNodeData, 'agent'>) => {
      onNodeSelect(node.id)
    },
    [onNodeSelect],
  )

  return (
    <div ref={containerRef} className="relative h-full min-h-0 w-full min-w-0 flex-1">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={onNodeClick}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.12 }}
        minZoom={0.25}
        maxZoom={1.5}
        proOptions={{ hideAttribution: true }}
        className="bg-muted/20"
      />
    </div>
  )
}

type AgentDetailProps = {
  selectedAgent: AgentNodeMeta | null
  locationSummary?: string | null
  locationProfileId?: number | null
  onCreateLocationProfile?: () => void
  onDeleteLocationProfile?: () => void
  isStreaming?: boolean
}

function AgentDetail({
  selectedAgent,
  locationSummary,
  locationProfileId,
  onCreateLocationProfile,
  onDeleteLocationProfile,
  isStreaming,
}: AgentDetailProps) {
  const t = useTranslations('analytics.campaigns.agentPipeline')

  const isLocationProfile = selectedAgent?.id === 'location-profile'
  const hasProfile =
    typeof locationSummary === 'string' && locationSummary.trim().length > 0

  return (
    <div className="flex min-h-0 min-h-[12rem] flex-1 basis-0 flex-col overflow-auto border-t border-border p-4">
      {!selectedAgent ? (
        <p className="text-sm text-muted-foreground">{t('selectAgent')}</p>
      ) : isLocationProfile ? (
        <>
          <div className="flex items-start gap-2">
            <h3 className="text-sm font-semibold text-foreground">{selectedAgent.label}</h3>
            {hasProfile && (
              <Button
                type="button"
                onClick={() => {
                  if (window.confirm(t('deleteLocationProfileConfirm'))) {
                    onDeleteLocationProfile?.()
                  }
                }}
                disabled={isStreaming || !locationProfileId}
                variant="ghost"
                size="sm"
                className="ml-auto h-8 shrink-0 px-2"
                title={t('deleteLocationProfile')}
              >
                <XIcon className="size-4" />
                <span className="sr-only">{t('deleteLocationProfile')}</span>
              </Button>
            )}
          </div>
          {hasProfile ? (
            <MessageResponse className="mt-3 text-sm leading-relaxed text-foreground">
              {locationSummary!.trim()}
            </MessageResponse>
          ) : (
            <div className="mt-3 space-y-3">
              <p className="text-sm leading-relaxed text-muted-foreground">{t('locationProfileEmpty')}</p>
              <Button
                type="button"
                className="w-full sm:w-auto"
                onClick={() => onCreateLocationProfile?.()}
                disabled={isStreaming}
              >
                <MapPinIcon className="size-4" />
                {t('createLocationProfile')}
              </Button>
            </div>
          )}
        </>
      ) : (
        <>
          <h3 className="text-sm font-semibold text-foreground">{selectedAgent.label}</h3>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            {selectedAgent.description}
          </p>
        </>
      )}
    </div>
  )
}

export type AgentFlowPanelProps = {
  locationSummary?: string | null
  locationProfileId?: number | null
  onCreateLocationProfile?: () => void
  onDeleteLocationProfile?: () => void
  isStreaming?: boolean
}

export function AgentFlowPanel({
  locationSummary,
  locationProfileId,
  onCreateLocationProfile,
  onDeleteLocationProfile,
  isStreaming,
}: AgentFlowPanelProps = {}) {
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)
  const selectedAgent = useMemo(
    () => agentNodes.find((n) => n.id === selectedNodeId) ?? null,
    [selectedNodeId],
  )

  return (
    <Artifact className="flex size-full min-h-0 flex-col">
      <ArtifactHeader>
        <ArtifactTitle>Agent pipeline</ArtifactTitle>
        <ArtifactDescription>Location profile → campaign → promotion candidates</ArtifactDescription>
      </ArtifactHeader>
      <ArtifactContent className="flex min-h-0 flex-1 flex-col p-0">
        <ReactFlowProvider>
          <div className="flex min-h-0 flex-1 flex-col">
            <div className="relative flex min-h-0 min-h-[12rem] flex-1 basis-0 flex-col">
              <AgentFlowCanvas selectedNodeId={selectedNodeId} onNodeSelect={setSelectedNodeId} />
            </div>
            <AgentDetail
              selectedAgent={selectedAgent}
              locationSummary={locationSummary}
              locationProfileId={locationProfileId}
              onCreateLocationProfile={onCreateLocationProfile}
              onDeleteLocationProfile={onDeleteLocationProfile}
              isStreaming={isStreaming}
            />
          </div>
        </ReactFlowProvider>
      </ArtifactContent>
    </Artifact>
  )
}
