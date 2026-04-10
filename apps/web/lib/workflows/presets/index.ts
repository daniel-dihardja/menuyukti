import campaignPlanningMultiSkill from './campaign-planning-multi-skill.json'
import publicHolidaysExample from './public-holidays-example.json'

/**
 * Built-in workflow import payloads (`workflowImportPayload` from
 * `apps/graphql/workflow_export_schema.json`). Shown first in the import dialog.
 */
export type WorkflowImportPresetId = 'public-holidays-example' | 'campaign-planning-multi-skill'

export type WorkflowImportPreset = {
  id: WorkflowImportPresetId
  payload: typeof publicHolidaysExample | typeof campaignPlanningMultiSkill
}

export const WORKFLOW_IMPORT_PRESETS: readonly WorkflowImportPreset[] = [
  { id: 'public-holidays-example', payload: publicHolidaysExample },
  { id: 'campaign-planning-multi-skill', payload: campaignPlanningMultiSkill },
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
