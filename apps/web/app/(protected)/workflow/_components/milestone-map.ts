import {
  milestoneDataSchema,
  milestoneInputSchema,
  milestonedataValueSchema,
  resultDataSchema,
} from '@/lib/graphql/node-schemas'
import type { MilestoneNode } from '@/lib/graphql/node-schemas'
import { normalizeMilestonePresetData } from '@/lib/milestones/preset-definitions'

import type {
  MilestoneInput,
  MilestonePresetId,
  MilestoneDataValue,
  PassCriteriaRow,
  TimelineMilestone,
  TimelineMilestoneStatus,
} from './timeline-workspace'

/** Rail icon state from persisted pass criteria + optional result (single source for SSR + client). */
export function deriveMilestoneRailStatus(
  passCriteria: PassCriteriaRow[],
  resultMarkdown?: string,
): TimelineMilestoneStatus {
  const rows = passCriteria
  if (rows.length === 0) {
    return resultMarkdown?.trim() ? 'complete' : 'empty'
  }
  if (rows.some((r) => r.status === 'fail')) {
    return 'failed'
  }
  if (rows.every((r) => r.status === 'pass')) {
    return 'complete'
  }
  return 'pending'
}

export type MilestoneNodeDto = Pick<
  MilestoneNode,
  | 'id'
  | 'name'
  | 'data'
  | 'milestoneGoal'
  | 'milestoneInput'
  | 'passCriterias'
  | 'milestonePresetData'
  | 'milestoneResult'
>

export function passCriteriasFromMilestoneData(data: unknown): PassCriteriaRow[] {
  const parsed = milestoneDataSchema.safeParse(data)
  if (!parsed.success || parsed.data.passCriterias === undefined) {
    return []
  }
  return parsed.data.passCriterias
}

/** Parse preset payload from typed column or legacy `data` JSON. */
export function milestonePresetFrom(dto: MilestoneNodeDto): MilestoneDataValue | undefined {
  const raw = dto.milestonePresetData
  if (raw != null && typeof raw === 'object') {
    const parsed = milestonedataValueSchema.safeParse(raw)
    if (parsed.success) {
      return parsed.data
    }
  }
  return undefined
}

export function resultMarkdownFromMilestoneResult(dto: MilestoneNodeDto): string | undefined {
  const raw = dto.milestoneResult
  if (raw == null || typeof raw !== 'object') {
    return undefined
  }
  const parsed = resultDataSchema.safeParse(raw)
  if (parsed.success) {
    return parsed.data.summary
  }
  return undefined
}

function milestoneRunSkillFieldsFromData(data: unknown): {
  presetId?: MilestonePresetId
  milestoneInput?: MilestoneInput
} {
  const parsed = milestoneDataSchema.safeParse(data)
  let presetId: MilestonePresetId | undefined
  let milestoneInput: MilestoneInput | undefined
  if (parsed.success) {
    if (parsed.data.presetId !== undefined) {
      presetId = parsed.data.presetId
    }
    if (parsed.data.milestoneInput !== undefined) {
      const inputParsed = milestoneInputSchema.safeParse(parsed.data.milestoneInput)
      if (inputParsed.success) {
        milestoneInput = inputParsed.data
      }
    }
  }
  return { presetId, milestoneInput }
}

export function milestoneNodeToTimelineMilestone(node: MilestoneNodeDto): TimelineMilestone {
  const parsed = milestoneDataSchema.safeParse(node.data)
  const goalCol =
    typeof node.milestoneGoal === 'string' && node.milestoneGoal.trim()
      ? node.milestoneGoal.trim()
      : undefined
  const goal = goalCol ?? (parsed.success ? parsed.data.goal : undefined)

  const { presetId, milestoneInput: parsedMilestoneInput } = milestoneRunSkillFieldsFromData(
    node.data,
  )
  let milestoneInput = parsedMilestoneInput
  if (node.milestoneInput != null) {
    const colInput = milestoneInputSchema.safeParse(node.milestoneInput)
    if (colInput.success) {
      milestoneInput = colInput.data
    }
  }

  const data = milestonePresetFrom(node)

  let passCriteria: PassCriteriaRow[] = []
  if (Array.isArray(node.passCriterias) && node.passCriterias.length > 0) {
    passCriteria = node.passCriterias
  } else {
    passCriteria = passCriteriasFromMilestoneData(node.data)
  }

  const rm = resultMarkdownFromMilestoneResult(node)
  const normalizedData = normalizeMilestonePresetData(presetId, data)

  return {
    id: node.id,
    title: node.name,
    goal,
    data: normalizedData,
    presetId,
    milestoneInput,
    passCriteria,
    resultMarkdown: rm,
    status: deriveMilestoneRailStatus(passCriteria, rm),
  }
}
