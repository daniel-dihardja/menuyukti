import { graphqlQuery } from '@/lib/graphql/client'
import type { MilestoneNode } from '@/lib/graphql/node-schemas'
import { NODE_QUERY, parseNodeData, type NodeDataRaw } from '@/lib/graphql/queries'

export type ReferencedPresetLoadResult =
  | { ok: true; title: string; presetPayload: unknown }
  | { ok: false; status: 400 | 404; message: string }

/**
 * Load a milestone’s preset payload for workflow chat @-references.
 * Validates workflow root, request location, and milestone parent/location like milestone GET.
 */
export async function loadReferencedMilestonePresetForChat(
  userId: string,
  args: {
    workflowId: string
    locationId: number
    presetReferenceMilestoneId: string
  },
): Promise<ReferencedPresetLoadResult> {
  const { workflowId, locationId, presetReferenceMilestoneId } = args

  const [wfRaw, msRaw] = await Promise.all([
    graphqlQuery<NodeDataRaw>(NODE_QUERY, { id: workflowId }, userId),
    graphqlQuery<NodeDataRaw>(NODE_QUERY, { id: presetReferenceMilestoneId }, userId),
  ])

  const wfNode = parseNodeData(wfRaw).node
  if (!wfNode || wfNode.nodeType !== 'workflow') {
    return { ok: false, status: 404, message: 'Workflow not found' }
  }
  if (wfNode.locationId == null) {
    return { ok: false, status: 400, message: 'Workflow has no location' }
  }
  if (wfNode.locationId !== locationId) {
    return { ok: false, status: 400, message: 'Location does not match workflow' }
  }

  const msNode = parseNodeData(msRaw).node
  if (!msNode || msNode.nodeType !== 'milestone') {
    return { ok: false, status: 404, message: 'Referenced milestone not found' }
  }
  const ms = msNode as MilestoneNode
  if (ms.parentId !== workflowId) {
    return { ok: false, status: 400, message: 'Milestone does not belong to this workflow' }
  }
  if (ms.locationId != null && ms.locationId !== locationId) {
    return { ok: false, status: 400, message: 'Milestone location does not match workflow context' }
  }

  const rawName = ms.name
  const title =
    typeof rawName === 'string' && rawName.trim().length > 0
      ? rawName.trim().replace(/\s+/g, ' ')
      : presetReferenceMilestoneId

  return { ok: true, title, presetPayload: ms.milestonePresetData }
}
