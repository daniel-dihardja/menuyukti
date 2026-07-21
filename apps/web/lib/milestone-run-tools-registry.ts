/**
 * Chat ReAct tools for the Skills catalog UI. Milestone **runs** use dedicated preset
 * subgraphs (GraphQL prefetch + structured LLM nodes), not this tool loop.
 * Keep in sync with `chat_tools_list()` in `apps/agents/agents/core/chat/graph.py`.
 * `generate_instagram_post_image` is bound only when IG Studio postId/pageId are present.
 */

export type ChatToolMeta = {
  id: string
  name: string
  description: string
}

/** Tools available to workflow and standalone `/agent` chat (optional `search_web` when Tavily is configured). */
export const CHAT_TOOLS_REGISTRY: readonly ChatToolMeta[] = [
  {
    id: 'get_workflow_overview',
    name: 'Get workflow overview',
    description:
      'List milestones in the current workflow with id, name, presetId, and short help summaries for cross-milestone discovery.',
  },
  {
    id: 'get_milestone_data',
    name: 'Get milestone data',
    description:
      'Load a milestone (selected or by id): goal, input, pass criteria, eval result, and preset/structured data from GraphQL.',
  },
  {
    id: 'get_milestone_help',
    name: 'Get milestone help',
    description:
      'Return Help-tab guidance for the selected milestone or a specific workflow milestone id.',
  },
  {
    id: 'get_milestone_input_json',
    name: 'Get milestone input JSON',
    description:
      'Return the milestone Input tab payload as formatted JSON for the selected or specified milestone.',
  },
  {
    id: 'get_milestone_preset_data_json',
    name: 'Get milestone preset data JSON',
    description:
      'Return the milestone Data tab preset payload as formatted JSON for the selected or specified milestone.',
  },
  {
    id: 'update_milestone_input',
    name: 'Update milestone input',
    description:
      'Apply JSON-pointer patch operations to the UI-selected milestone Input tab and persist through GraphQL.',
  },
  {
    id: 'update_milestone_drafts',
    name: 'Update milestone drafts',
    description:
      'Create or replace markdown drafts on the UI-selected Drafts milestone (append or replace, up to 20 items per call).',
  },
  {
    id: 'get_location_data',
    name: 'Get location data',
    description:
      'Load location-page data for the campaign venue: basics, opening hours, and owner quick profile from GraphQL.',
  },
  {
    id: 'search_web',
    name: 'Search web',
    description:
      'When TAVILY_API_KEY is set: Tavily-backed web search for current external facts. Omitted when the key is unset.',
  },
  {
    id: 'generate_instagram_post_image',
    name: 'Generate Instagram post image',
    description:
      'IG Studio Post Creator only: compose a Leonardo prompt and generate an image for the current post page (model/format/style/references from the UI). Bound when postId and pageId are present.',
  },
] as const

/** @deprecated Use `CHAT_TOOLS_REGISTRY`. */
export const MILESTONE_RUN_TOOLS_REGISTRY = CHAT_TOOLS_REGISTRY

/** @deprecated Use `ChatToolMeta`. */
export type MilestoneRunToolMeta = ChatToolMeta
