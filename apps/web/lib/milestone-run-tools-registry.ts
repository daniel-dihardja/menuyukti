/**
 * Chat ReAct tools for the Skills catalog UI. Milestone **runs** use dedicated preset
 * subgraphs (GraphQL prefetch + structured LLM nodes), not this tool loop.
 * Keep in sync with `chat_tools_list()` in `apps/agents/agents/core/chat/graph.py`.
 */

export type ChatToolMeta = {
  id: string
  name: string
  description: string
}

/** Tools available to workflow and standalone `/agent` chat (optional `search_web` when Tavily is configured). */
export const CHAT_TOOLS_REGISTRY: readonly ChatToolMeta[] = [
  {
    id: 'get_milestone_data',
    name: 'Get milestone data',
    description:
      'Load the selected milestone: goal, input, pass criteria, eval result, and preset/structured data from GraphQL.',
  },
  {
    id: 'get_milestone_help',
    name: 'Get milestone help',
    description:
      'Return Help-tab guidance for the selected milestone (what it does and optional input notes).',
  },
  {
    id: 'get_milestone_input_json',
    name: 'Get milestone input JSON',
    description: 'Return the milestone Input tab payload as formatted JSON.',
  },
  {
    id: 'get_milestone_preset_data_json',
    name: 'Get milestone preset data JSON',
    description:
      'Return the milestone Data tab preset payload as formatted JSON for the selected milestone.',
  },
  {
    id: 'get_milestone_preset_data_for_milestone',
    name: 'Get preset data for another milestone',
    description:
      'Load preset/structured data from another milestone in the workflow by id (for cross-milestone context in chat).',
  },
  {
    id: 'update_milestone_input',
    name: 'Update milestone input',
    description:
      'Apply JSON-pointer patch operations to the milestone Input tab and persist through GraphQL.',
  },
  {
    id: 'update_milestone_preset_data',
    name: 'Update milestone preset data',
    description:
      'Apply JSON-pointer patch operations to milestone preset data (Data tab) and persist through GraphQL.',
  },
  {
    id: 'search_web',
    name: 'Search web',
    description:
      'When TAVILY_API_KEY is set: Tavily-backed web search for current external facts. Omitted when the key is unset.',
  },
] as const

/** @deprecated Use `CHAT_TOOLS_REGISTRY`. */
export const MILESTONE_RUN_TOOLS_REGISTRY = CHAT_TOOLS_REGISTRY

/** @deprecated Use `ChatToolMeta`. */
export type MilestoneRunToolMeta = ChatToolMeta
