import campaignBriefDates from './campaign-brief-dates.json'
import captionSprint from './caption-sprint.json'
import facebookCaptionSprint from './facebook-caption-sprint.json'
import facebookFullMonth from './facebook-full-month.json'
import facebookQuickPageCampaign from './facebook-quick-page-campaign.json'
import fullSocialMonth from './full-social-month.json'
import quickInstagramCampaign from './quick-instagram-campaign.json'

/**
 * Built-in workflow import payloads (`workflowImportPayload` from
 * `apps/graphql/workflow_export_schema.json`). Shown first in the import dialog.
 *
 * Facebook presets use the same Prepare skills as Instagram (Meta signals in analytics);
 * milestone copy instructs mapping outputs to Facebook Page / Reels / Stories.
 */
export type WorkflowImportPresetId =
  | 'campaign-brief-dates'
  | 'caption-sprint'
  | 'facebook-caption-sprint'
  | 'facebook-full-month'
  | 'facebook-quick-page-campaign'
  | 'full-social-month'
  | 'quick-instagram-campaign'

export type WorkflowImportPreset = {
  id: WorkflowImportPresetId
  payload: typeof quickInstagramCampaign
}

export const WORKFLOW_IMPORT_PRESETS: readonly WorkflowImportPreset[] = [
  { id: 'campaign-brief-dates', payload: campaignBriefDates },
  { id: 'quick-instagram-campaign', payload: quickInstagramCampaign },
  { id: 'full-social-month', payload: fullSocialMonth },
  { id: 'caption-sprint', payload: captionSprint },
  { id: 'facebook-quick-page-campaign', payload: facebookQuickPageCampaign },
  { id: 'facebook-full-month', payload: facebookFullMonth },
  { id: 'facebook-caption-sprint', payload: facebookCaptionSprint },
] as const

export const PRESET_KEY_PREFIX = 'preset:' as const

/** "Blank workflow" option in overview + new-workflow dialog preset pickers. */
export const BLANK_PRESET_SELECTION_KEY = 'blank' as const

export function workflowTitleFromPresetPayload(
  payload: WorkflowImportPreset['payload'],
): string | null {
  if (payload && typeof payload === 'object' && 'workflowName' in payload) {
    const n = (payload as { workflowName?: unknown }).workflowName
    if (typeof n === 'string' && n.trim()) {
      return n.trim()
    }
  }
  return null
}

export function presetSelectionKey(id: WorkflowImportPresetId): string {
  return `${PRESET_KEY_PREFIX}${id}`
}

export function parsePresetIdFromSelectionKey(key: string): WorkflowImportPresetId | null {
  if (!key.startsWith(PRESET_KEY_PREFIX)) {
    return null
  }
  const id = key.slice(PRESET_KEY_PREFIX.length) as WorkflowImportPresetId
  return WORKFLOW_IMPORT_PRESETS.some((p) => p.id === id) ? id : null
}
