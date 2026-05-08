import {
  campaignBriefMilestoneDataSchema,
  cultureHooksMilestoneDataSchema,
  milestoneDataSchema,
  milestoneInputSchema,
  milestonedataValueSchema,
  postSchedulerMilestoneDataSchema,
  promotionCandidatesMilestoneDataSchema,
  resultDataSchema,
} from '@/lib/graphql/node-schemas'
import type { AnyNode } from '@/lib/graphql/queries'

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

export type MilestoneNodeDto = {
  id: string
  name: string
  data?: unknown | null
  milestonedataNodes?: AnyNode[]
  resultNodes?: AnyNode[]
}

export function passCriteriasFromMilestoneData(data: unknown): PassCriteriaRow[] {
  const parsed = milestoneDataSchema.safeParse(data)
  if (!parsed.success || parsed.data.passCriterias === undefined) {
    return []
  }
  return parsed.data.passCriterias
}

/** First valid `milestonedata` child wins (at most one is expected). */
export function milestoneDataFromChildNodes(
  nodes: AnyNode[] | undefined | null,
): MilestoneDataValue | undefined {
  if (nodes == null || !Array.isArray(nodes)) {
    return undefined
  }
  for (const n of nodes) {
    if (n.nodeType !== 'milestonedata') {
      continue
    }
    const d = n.data
    if (d == null || typeof d !== 'object') {
      continue
    }
    const parsed = milestonedataValueSchema.safeParse(d)
    if (parsed.success) {
      return parsed.data
    }
  }
  return undefined
}

/** First valid `result` child wins (at most one is expected). */
export function resultMarkdownFromChildNodes(
  nodes: AnyNode[] | undefined | null,
): string | undefined {
  if (nodes == null || !Array.isArray(nodes)) {
    return undefined
  }
  for (const n of nodes) {
    if (n.nodeType !== 'result') {
      continue
    }
    const d = n.data
    if (d == null || typeof d !== 'object') {
      continue
    }
    const parsed = resultDataSchema.safeParse(d)
    if (parsed.success) {
      return parsed.data.summary
    }
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
  const goal = parsed.success ? parsed.data.goal : undefined
  const data = milestoneDataFromChildNodes(node.milestonedataNodes)
  const passCriteria = passCriteriasFromMilestoneData(node.data)
  const resultMarkdown = resultMarkdownFromChildNodes(node.resultNodes)
  const { presetId, milestoneInput } = milestoneRunSkillFieldsFromData(node.data)
  let normalizedData = data
  if (presetId === 'restaurant_campaign_brief') {
    const parsedCampaignBriefData = campaignBriefMilestoneDataSchema.safeParse(data)
    if (parsedCampaignBriefData.success) {
      normalizedData = parsedCampaignBriefData.data
    } else {
      normalizedData = {
        startDate: '',
        endDate: '',
        publicHolidays: [],
        venueSnapshot: {
          venueName: '',
          city: '',
          country: '',
          currency: '',
        },
        contentPillars: [],
        audienceHypotheses: [],
        proofOrientedAngles: [],
        toneGuardrails: [],
        campaignObjective: '',
        mainCategory: 'FOOD',
        targetSegments: [],
        messageHierarchy: [],
        offerAndCtaPlan: [],
        contentPillarPlan: [],
        measurementPlan: [],
        testingPlan: [],
        riskGuardrails: [],
      }
    }
  }
  if (presetId === 'promotion_candidates') {
    const parsedPromotionCandidates = promotionCandidatesMilestoneDataSchema.safeParse(data)
    if (parsedPromotionCandidates.success) {
      normalizedData = parsedPromotionCandidates.data
    } else {
      normalizedData = {
        mainCategory: 'FOOD',
        categories: [
          { category: 'FOOD', starItems: [], puzzleItems: [] },
          { category: 'DRINK', starItems: [], puzzleItems: [] },
        ],
        sourceAnalyticsRunId: null,
        notes: '',
      }
    }
  }
  if (presetId === 'post_scheduler') {
    const parsedPs = postSchedulerMilestoneDataSchema.safeParse(data)
    if (parsedPs.success) {
      normalizedData = parsedPs.data
    } else {
      normalizedData = {
        monthlyArc: {
          weeks: [
            { week: 1, objective: '', rationale: '' },
            { week: 2, objective: '', rationale: '' },
            { week: 3, objective: '', rationale: '' },
            { week: 4, objective: '', rationale: '' },
          ],
        },
        contentRatio: { pillars: [] },
        formatMix: { formats: [] },
        weeklySlotPlan: [],
        guardrailCheck: '',
      }
    }
  }
  if (presetId === 'culture_hooks') {
    const parsedCultureHooks = cultureHooksMilestoneDataSchema.safeParse(data)
    if (parsedCultureHooks.success) {
      normalizedData = parsedCultureHooks.data
    } else {
      normalizedData = {
        locationConcept: '',
        targetAudience: '',
        intersections: [],
        guardrailCheck: '',
      }
    }
  }
  return {
    id: node.id,
    title: node.name,
    goal,
    data: normalizedData,
    presetId,
    milestoneInput,
    passCriteria,
    resultMarkdown,
    status: deriveMilestoneRailStatus(passCriteria, resultMarkdown),
  }
}
