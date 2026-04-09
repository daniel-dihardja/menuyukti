import captionSprint from './caption-sprint.json'
import fullSocialMonth from './full-social-month.json'
import quickInstagramCampaign from './quick-instagram-campaign.json'

/**
 * Built-in workflow import payloads (`workflowImportPayload` from
 * `apps/graphql/workflow_export_schema.json`). Shown first in the import dialog.
 */
export type WorkflowImportPresetId =
  | 'caption-sprint'
  | 'full-social-month'
  | 'quick-instagram-campaign'

export type WorkflowImportPreset = {
  id: WorkflowImportPresetId
  payload: typeof quickInstagramCampaign
}

export const WORKFLOW_IMPORT_PRESETS: readonly WorkflowImportPreset[] = [
  { id: 'quick-instagram-campaign', payload: quickInstagramCampaign },
  { id: 'full-social-month', payload: fullSocialMonth },
  { id: 'caption-sprint', payload: captionSprint },
] as const

export const PRESET_KEY_PREFIX = 'preset:' as const

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
