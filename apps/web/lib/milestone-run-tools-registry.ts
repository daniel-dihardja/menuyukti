/**
 * Milestone-run LangChain tools for UI. Each execute step gets: core read tools (always), optional extras
 * from each skill's SKILL.md `extra_tools` frontmatter (see `make_milestone_run_tools` in
 * `apps/agents/agents/core/milestone_run/tools/`), then `write_result_data`.
 * Order in this array is illustrative (core + common optional).
 */
import 'server-only'

export type MilestoneRunToolMeta = {
  id: string
  name: string
  description: string
}

/** Typical order: core reads, optional extras (per skill), write. */
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
    description: 'Return the current milestone data as JSON text (from the milestonedata child).',
  },
  {
    id: 'read_prior_milestones_data',
    name: 'Read prior milestones data',
    description:
      "Return JSON text listing earlier milestones' milestonedata (title + data per row). Call when the current milestone is missing context (e.g. campaign dates) that a previous milestone should have set. Empty or unavailable if the run was not scoped to a workflow.",
  },
  {
    id: 'get_public_holidays',
    name: 'Get public holidays',
    description:
      "Optional extra tool (listed in a skill's SKILL.md `extra_tools` when needed): fetch public holidays for this location's country (YYYY-MM-DD range). Returns a Markdown bullet list (date, name, local name) or a short message if none apply, the country is unknown, or the range is invalid. Use with write_result_data when holidays must be filled in milestone data.",
  },
  {
    id: 'get_available_dates',
    name: 'Get available dates',
    description:
      'Optional extra tool for the scheduler skill: list each calendar day from start_date through end_date (YYYY-MM-DD). Set exclude_weekends and/or exclude_holidays to omit weekend days or dates in public_holiday_dates (from Campaign Brief `publicHolidays`). Returns a markdown table or a message if the range is invalid or no dates remain after filters.',
  },
  {
    id: 'search_web',
    name: 'Search web',
    description:
      'When TAVILY_API_KEY is set on the agents service: Tavily-backed web search for current external facts (titles, URLs, snippets as JSON). Prefer prior milestone data and internal tools first; omitted entirely when the key is unset.',
  },
  {
    id: 'write_result_data',
    name: 'Write result data',
    description:
      'Upsert the milestonedata child under this milestone with structured JSON (preset-specific shape). Updates context result_data and returns a short confirmation including the node id.',
  },
] as const
