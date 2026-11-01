import type { AdvisorWorkspaceTabId } from '@/lib/chat/advisor-workspace-tabs'

/**
 * Shared CoAgent state for the advisor workspace rail (TASK-14.5).
 * JSON-serializable for LangGraph / AG-UI state snapshots.
 *
 * Schema:
 * - locationId — selected venue (shell always has a concrete branch id)
 * - analyticsRunId — pinned sales report, or null when unset
 * - workspaceTab — right-rail tab (`insights` | `story` | `venue` | `cogs`)
 * - chatMode — `general` | `image_assistant` | `inventar` (shell owns picker;
 *   agent reads it; UI does not auto-flip mode from agent writes — TASK-10)
 *
 * Venue switch vs thread-binding stays in shell/registry (TASK-10); CoAgent
 * mirrors the live selection so tools/rail stay aligned without stuffing
 * venue/report into free-text messages.
 */
export type AdvisorCoAgentState = {
  locationId: number
  analyticsRunId: number | null
  workspaceTab: AdvisorWorkspaceTabId
  chatMode: string
}

/** Must match Copilot Runtime agent key / AG-UI agent name. */
export const ADVISOR_COAGENT_NAME = 'advisor'

export function advisorCoAgentInitialState(
  partial?: Partial<AdvisorCoAgentState>,
): AdvisorCoAgentState {
  return {
    locationId: 0,
    analyticsRunId: null,
    workspaceTab: 'insights',
    chatMode: 'general',
    ...partial,
  }
}
