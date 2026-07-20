import { graphqlQuery } from '@/lib/graphql/client'
import {
  UPDATE_NODE_MUTATION,
  parseUpdateNodeData,
  type UpdateNodeDataRaw,
} from '@/lib/graphql/queries'
import { revalidateWorkflowCampaignTreeCache } from '@/lib/graphql/revalidate-workflow-tree'
import {
  collectExistingDisplayCodes,
  generateMilestoneDisplayCode,
  parseMilestoneDisplayCode,
} from '@/lib/milestones/milestone-display-code'

export type MilestoneNodeForDisplayCode = {
  id: string
  data?: unknown | null
}

/**
 * Ensure every milestone has a valid `data.displayCode`, persisting new codes via GraphQL.
 * Returns a map of milestone id → displayCode (existing or newly assigned).
 */
export async function ensureMilestoneDisplayCodes(
  userId: string,
  workflowId: string,
  milestones: ReadonlyArray<MilestoneNodeForDisplayCode>,
): Promise<Map<string, string>> {
  const result = new Map<string, string>()
  const existing = collectExistingDisplayCodes(milestones)
  let wrote = false

  for (const milestone of milestones) {
    const current =
      milestone.data != null && typeof milestone.data === 'object' && !Array.isArray(milestone.data)
        ? parseMilestoneDisplayCode((milestone.data as { displayCode?: unknown }).displayCode)
        : undefined
    if (current) {
      result.set(milestone.id, current)
      continue
    }

    const displayCode = generateMilestoneDisplayCode(existing)
    existing.add(displayCode)

    const baseData =
      milestone.data != null && typeof milestone.data === 'object' && !Array.isArray(milestone.data)
        ? { ...(milestone.data as Record<string, unknown>) }
        : {}

    parseUpdateNodeData(
      await graphqlQuery<UpdateNodeDataRaw>(
        UPDATE_NODE_MUTATION,
        {
          id: milestone.id,
          data: { ...baseData, displayCode },
        },
        userId,
      ),
    )
    result.set(milestone.id, displayCode)
    wrote = true
  }

  if (wrote) {
    revalidateWorkflowCampaignTreeCache(userId, workflowId)
  }

  return result
}

/** Assign a single new display code for a just-created milestone among siblings. */
export async function assignDisplayCodeToNewMilestone(
  userId: string,
  workflowId: string,
  milestoneId: string,
  milestoneData: unknown | null | undefined,
  siblingMilestones: ReadonlyArray<MilestoneNodeForDisplayCode>,
): Promise<{ displayCode: string; data: Record<string, unknown> }> {
  const existing = collectExistingDisplayCodes(siblingMilestones)
  const displayCode = generateMilestoneDisplayCode(existing)
  const baseData =
    milestoneData != null && typeof milestoneData === 'object' && !Array.isArray(milestoneData)
      ? { ...(milestoneData as Record<string, unknown>) }
      : {}
  const data = { ...baseData, displayCode }

  parseUpdateNodeData(
    await graphqlQuery<UpdateNodeDataRaw>(UPDATE_NODE_MUTATION, { id: milestoneId, data }, userId),
  )
  revalidateWorkflowCampaignTreeCache(userId, workflowId)
  return { displayCode, data }
}
