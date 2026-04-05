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
import { useCallback, useEffect, useMemo, useRef } from 'react'
import {
  Artifact,
  ArtifactContent,
  ArtifactDescription,
  ArtifactHeader,
  ArtifactTitle,
} from '@workspace/ui/components/ai-elements/artifact'
import { agentEdges, agentNodes } from './agent-flow-data'

/** Approximate node box for centering in force layout (matches Tailwind max-w + padding). */
const NODE_WIDTH = 220
const NODE_HEIGHT = 96

type AgentNodeData = { label: string; description: string }

function AgentNode({ data }: NodeProps<Node<AgentNodeData, 'agent'>>) {
  return (
    <div className="max-w-[220px] rounded-lg border border-border bg-card px-3 py-2.5 shadow-sm">
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

function AgentFlowCanvas() {
  const containerRef = useRef<HTMLDivElement>(null)
  const { fitView } = useReactFlow()
  const initialEdges = useMemo(() => buildEdges(), [])
  const [nodes, setNodes, onNodesChange] = useNodesState<Node<AgentNodeData, 'agent'>>([])
  const [edges, , onEdgesChange] = useEdgesState<Edge>(initialEdges)

  const layoutAndFit = useCallback(() => {
    const el = containerRef.current
    if (!el) return
    const { width, height } = el.getBoundingClientRect()
    if (width < 32 || height < 32) return
    setNodes(runForceLayout(width, height))
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

  return (
    <div ref={containerRef} className="relative h-full min-h-[12rem] w-full min-w-0 flex-1">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
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

export function AgentFlowPanel() {
  return (
    <Artifact className="flex size-full min-h-0 flex-col">
      <ArtifactHeader>
        <ArtifactTitle>Agent pipeline</ArtifactTitle>
        <ArtifactDescription>Location profile → campaign → promotion candidates</ArtifactDescription>
      </ArtifactHeader>
      <ArtifactContent className="flex min-h-0 flex-1 flex-col p-0">
        <ReactFlowProvider>
          <AgentFlowCanvas />
        </ReactFlowProvider>
      </ArtifactContent>
    </Artifact>
  )
}
