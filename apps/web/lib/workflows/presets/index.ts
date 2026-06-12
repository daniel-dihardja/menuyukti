/**
 * Built-in workflow import payloads (`workflowImportPayload` from
 * `apps/graphql/workflow_export_schema.json`). Shown first in the import dialog.
 */
export type WorkflowImportPresetId = string

export type WorkflowImportPreset = {
  id: WorkflowImportPresetId
  payload: unknown
}

export const WORKFLOW_IMPORT_PRESETS: readonly WorkflowImportPreset[] = []

/** Strategy picker labels without import payloads (creation still uses an empty workflow). */
export const WORKFLOW_STRATEGY_OPTIONS = [
  { id: 'local-pulse', labelKey: 'localPulseStrategy' },
] as const

export type WorkflowStrategyId = (typeof WORKFLOW_STRATEGY_OPTIONS)[number]['id']

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
  const id = key.slice(PRESET_KEY_PREFIX.length)
  return WORKFLOW_IMPORT_PRESETS.some((p) => p.id === id) ? id : null
}
