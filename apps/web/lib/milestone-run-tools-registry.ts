/**
 * Milestone-run LangChain tools for UI. Built-in tools match
 * `apps/agents/agents/core/milestone_run/tools.py` (`make_milestone_run_tools`) order and intent; workspace
 * API adapter tools are appended at runtime (one entry below describes them in aggregate).
 */
import 'server-only'

export type MilestoneRunToolMeta = {
  id: string
  name: string
  description: string
}

/** Order matches the list returned at the end of `make_milestone_run_tools`. */
export const MILESTONE_RUN_TOOLS_REGISTRY: readonly MilestoneRunToolMeta[] = [
  {
    id: 'read_goal',
    name: 'Read goal',
    description: 'Return the milestone goal text (from the goal child node, loaded into context).',
  },
  {
    id: 'read_criteria',
    name: 'Read criteria',
    description:
      'Return pass/fail criteria as a JSON array of objects with id and requirement strings.',
  },
  {
    id: 'read_data',
    name: 'Read data',
    description:
      'Return the current milestone Data tab content (Markdown in the milestonedata node).',
  },
  {
    id: 'read_prior_milestones_data',
    name: 'Read prior milestones data',
    description:
      'Return Markdown from earlier milestones in this workflow (their Data tabs). Call when the current Data tab is missing context (e.g. campaign dates) that a previous milestone should have set. Empty or unavailable if the run was not scoped to a workflow.',
  },
  {
    id: 'get_public_holidays',
    name: 'Get public holidays',
    description:
      "Shared tool: fetch public holidays for this location's country (YYYY-MM-DD range). Reusable across milestone skills. Returns a Markdown bullet list (date, name, local name) or a short message if none apply, the country is unknown, or the range is invalid. Use with write_result_data when holidays must be filled in the Data tab.",
  },
  {
    id: 'write_result_data',
    name: 'Write result data',
    description:
      'Upsert the milestonedata child under this milestone with the given Markdown body. Updates context result_data and returns a short confirmation including the node id.',
  },
  {
    id: 'workspace_api_adapter_tools',
    name: 'Workspace API adapter tools (dynamic)',
    description:
      'When the campaign location belongs to a workspace, each active API proxy is appended at runtime as a parameterless HTTP GET tool named with its tool_key (see API Proxies page). Not a fixed id list.',
  },
] as const
