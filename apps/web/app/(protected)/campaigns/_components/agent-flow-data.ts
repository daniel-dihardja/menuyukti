/**
 * Static graph data for the campaign chat artifact: agents and their dependency edges.
 * Flow: Location Profile → Campaign → Promotion Candidates
 */

export type AgentNodeData = {
  id: string
  label: string
  description: string
}

export type AgentEdgeData = {
  id: string
  source: string
  target: string
}

export const agentNodes: AgentNodeData[] = [
  {
    id: 'location-profile',
    label: 'Location Profile',
    description:
      'Analyses sales data to build a location personality and menu focus.',
  },
  {
    id: 'campaign',
    label: 'Campaign',
    description:
      'Plans post schedule, theme, tone and brief based on the location profile.',
  },
  {
    id: 'promotion-candidates',
    label: 'Promotion Candidates',
    description:
      'Identifies menu items to promote based on campaign intent and analytics.',
  },
]

export const agentEdges: AgentEdgeData[] = [
  { id: 'lp-c', source: 'location-profile', target: 'campaign' },
  { id: 'c-pc', source: 'campaign', target: 'promotion-candidates' },
]
