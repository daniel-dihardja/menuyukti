import { NextResponse, connection } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import type { z } from 'zod'
import { graphqlQuery } from '@/lib/graphql/client'
import { revalidateWorkflowCampaignTreeCache } from '@/lib/graphql/revalidate-workflow-tree'
import {
  datesMilestoneDataSchema,
  campaignBriefMilestoneDataSchema,
  milestoneDataSchema,
  milestoneInputSchema,
  milestonedataValueSchema,
  postSchedulerMilestoneDataSchema,
  promotionCandidatesMilestoneDataSchema,
  type PassCriteriaData,
} from '@/lib/graphql/node-schemas'
import type { MilestoneNode } from '@/lib/graphql/node-schemas'
import {
  DELETE_NODE_MUTATION,
  NODE_QUERY,
  NODES_QUERY,
  UPDATE_NODE_MUTATION,
  parseNodeData,
  parseNodesData,
  parseUpdateNodeData,
  type DeleteNodeData,
  type NodeDataRaw,
  type NodesDataRaw,
  type UpdateNodeDataRaw,
} from '@/lib/graphql/queries'
import { passCriteriasFromMilestoneData } from '@/app/(protected)/workflow/_components/milestone-map'
import { milestoneIdParamSchema, patchMilestoneSchema, workflowIdParamSchema } from '../schema'

type RouteContext = {
  params: Promise<{ id: string; milestoneId: string }>
}

async function loadWorkflowRootOrThrow(workflowId: string, userId: string) {
  const data = parseNodeData(
    await graphqlQuery<NodeDataRaw>(NODE_QUERY, { id: workflowId }, userId),
  )
  const node = data.node
  if (!node) {
    return { error: NextResponse.json({ message: 'Workflow not found' }, { status: 404 }) }
  }
  if (node.nodeType !== 'workflow') {
    return { error: NextResponse.json({ message: 'Not a workflow root' }, { status: 400 }) }
  }
  if (node.locationId == null) {
    return { error: NextResponse.json({ message: 'Workflow has no location' }, { status: 400 }) }
  }
  return { node, locationId: node.locationId }
}

async function validateMilestoneUnderWorkflow(
  workflowId: string,
  milestoneId: string,
  userId: string,
) {
  const milestoneData = parseNodeData(
    await graphqlQuery<NodeDataRaw>(NODE_QUERY, { id: milestoneId }, userId),
  )
  const milestoneNode = milestoneData.node
  if (!milestoneNode) {
    return { error: NextResponse.json({ message: 'Milestone not found' }, { status: 404 }) }
  }
  if (milestoneNode.nodeType !== 'milestone') {
    return { error: NextResponse.json({ message: 'Not a milestone' }, { status: 400 }) }
  }
  if (milestoneNode.parentId !== workflowId) {
    return {
      error: NextResponse.json(
        { message: 'Milestone does not belong to this workflow' },
        { status: 400 },
      ),
    }
  }
  return { milestoneNode }
}

/** Load persisted Data-tab payload (same sources as the workflow page SSR). */
export async function GET(_req: Request, context: RouteContext) {
  try {
    await connection()
    const { isAuthenticated, userId } = await auth()
    if (!isAuthenticated) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: rawWorkflowId, milestoneId: rawMilestoneId } = await context.params

    const workflowParsed = workflowIdParamSchema.safeParse(rawWorkflowId)
    const milestoneParsed = milestoneIdParamSchema.safeParse(rawMilestoneId)
    if (!workflowParsed.success || !milestoneParsed.success) {
      return NextResponse.json({ message: 'Invalid id' }, { status: 400 })
    }
    const workflowId = workflowParsed.data
    const milestoneId = milestoneParsed.data

    const [workflowRoot, validated] = await Promise.all([
      loadWorkflowRootOrThrow(workflowId, userId),
      validateMilestoneUnderWorkflow(workflowId, milestoneId, userId),
    ])
    if ('error' in workflowRoot) {
      return workflowRoot.error
    }
    if ('error' in validated) {
      return validated.error
    }

    const mn = validated.milestoneNode
    if (mn.nodeType !== 'milestone') {
      return NextResponse.json({ message: 'Not a milestone' }, { status: 400 })
    }
    const ms = mn as MilestoneNode

    let milestoneData: z.infer<typeof milestonedataValueSchema> | null = null
    const mpd = ms.milestonePresetData
    if (mpd != null && typeof mpd === 'object') {
      const pp = milestonedataValueSchema.safeParse(mpd)
      if (pp.success) {
        milestoneData = pp.data
      }
    }

    const parsedMilestoneNodeData =
      ms.data != null && typeof ms.data === 'object' ? milestoneDataSchema.safeParse(ms.data) : null
    let passCriterias: PassCriteriaData[] = []
    if (Array.isArray(ms.passCriterias) && ms.passCriterias.length > 0) {
      passCriterias = ms.passCriterias as PassCriteriaData[]
    } else if (parsedMilestoneNodeData?.success) {
      passCriterias = passCriteriasFromMilestoneData(parsedMilestoneNodeData.data)
    }

    if (parsedMilestoneNodeData?.success && parsedMilestoneNodeData.data.presetId === 'dates') {
      const datesDataParsed = datesMilestoneDataSchema.safeParse(milestoneData)
      if (!datesDataParsed.success) {
        milestoneData = {
          startDate: '',
          endDate: '',
          publicHolidays: [],
        }
      }
    }

    if (
      parsedMilestoneNodeData?.success &&
      parsedMilestoneNodeData.data.presetId === 'restaurant_campaign_brief'
    ) {
      const campaignBriefDataParsed = campaignBriefMilestoneDataSchema.safeParse(milestoneData)
      if (!campaignBriefDataParsed.success) {
        milestoneData = {
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
          mainCategory: '(uncategorized)',
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
    if (
      parsedMilestoneNodeData?.success &&
      parsedMilestoneNodeData.data.presetId === 'post_scheduler'
    ) {
      const psParsed = postSchedulerMilestoneDataSchema.safeParse(milestoneData)
      if (!psParsed.success) {
        milestoneData = {
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
    if (
      parsedMilestoneNodeData?.success &&
      parsedMilestoneNodeData.data.presetId === 'promotion_candidates'
    ) {
      const pcParsed = promotionCandidatesMilestoneDataSchema.safeParse(milestoneData)
      if (!pcParsed.success) {
        milestoneData = {
          mainCategory: '(uncategorized)',
          categories: [{ category: '(uncategorized)', starItems: [], puzzleItems: [] }],
          sourceAnalyticsRunId: null,
          notes: '',
        }
      }
    }

    const goal =
      typeof ms.milestoneGoal === 'string' && ms.milestoneGoal.trim()
        ? ms.milestoneGoal
        : parsedMilestoneNodeData?.success && typeof parsedMilestoneNodeData.data.goal === 'string'
          ? parsedMilestoneNodeData.data.goal
          : ''

    let milestoneInput: z.infer<typeof milestoneInputSchema> | null = null
    if (ms.milestoneInput != null) {
      const colParsed = milestoneInputSchema.safeParse(ms.milestoneInput)
      if (colParsed.success) {
        milestoneInput = colParsed.data
      }
    } else if (
      parsedMilestoneNodeData?.success &&
      parsedMilestoneNodeData.data.milestoneInput !== undefined
    ) {
      const inputParsed = milestoneInputSchema.safeParse(
        parsedMilestoneNodeData.data.milestoneInput,
      )
      if (inputParsed.success) {
        milestoneInput = inputParsed.data
      }
    }

    return NextResponse.json(
      {
        milestoneData,
        goal,
        passCriterias,
        presetId: parsedMilestoneNodeData?.success
          ? (parsedMilestoneNodeData.data.presetId ?? null)
          : null,
        milestoneInput,
      },
      { status: 200 },
    )
  } catch (error) {
    console.error(error)
    const message = error instanceof Error ? error.message : 'Failed to load milestone'
    return NextResponse.json({ message }, { status: 500 })
  }
}

export async function PATCH(req: Request, context: RouteContext) {
  try {
    await connection()
    const { isAuthenticated, userId } = await auth()
    if (!isAuthenticated || !userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: rawWorkflowId, milestoneId: rawMilestoneId } = await context.params

    const workflowParsed = workflowIdParamSchema.safeParse(rawWorkflowId)
    const milestoneParsed = milestoneIdParamSchema.safeParse(rawMilestoneId)
    if (!workflowParsed.success || !milestoneParsed.success) {
      return NextResponse.json({ message: 'Invalid id' }, { status: 400 })
    }
    const workflowId = workflowParsed.data
    const milestoneId = milestoneParsed.data

    const workflowRoot = await loadWorkflowRootOrThrow(workflowId, userId)
    if ('error' in workflowRoot) {
      return workflowRoot.error
    }

    let json: unknown
    try {
      json = await req.json()
    } catch {
      return NextResponse.json({ message: 'Invalid JSON body' }, { status: 400 })
    }

    const parsed = patchMilestoneSchema.safeParse(json)
    if (!parsed.success) {
      return NextResponse.json(
        { message: 'Invalid input', issues: parsed.error.issues },
        { status: 400 },
      )
    }

    const validated = await validateMilestoneUnderWorkflow(workflowId, milestoneId, userId)
    if ('error' in validated) {
      return validated.error
    }

    const body = parsed.data

    if (body.move !== undefined) {
      const list = parseNodesData(
        await graphqlQuery<NodesDataRaw>(
          NODES_QUERY,
          {
            locationId: workflowRoot.locationId,
            nodeType: 'milestone',
            parentId: workflowId,
          },
          userId,
        ),
      )
      const milestones = list.nodes.filter((n) => n.nodeType === 'milestone')
      const idx = milestones.findIndex((n) => n.id === milestoneId)
      if (idx === -1) {
        return NextResponse.json({ message: 'Milestone not found in workflow' }, { status: 404 })
      }
      const j = body.move === 'up' ? idx - 1 : idx + 1
      if (j < 0 || j >= milestones.length) {
        return NextResponse.json({ message: 'Cannot move milestone' }, { status: 400 })
      }
      // Swap positions in the sorted list, then assign sequential orders 1..n so stored
      // `order` always matches display order (avoids duplicate order values that made swaps a no-op).
      const reordered = [...milestones]
      const a = reordered[idx]
      const b = reordered[j]
      if (!a || !b) {
        return NextResponse.json({ message: 'Milestone not found' }, { status: 404 })
      }
      reordered[idx] = b
      reordered[j] = a

      await Promise.all(
        reordered.map((node, i) => {
          if (!node) {
            return Promise.resolve()
          }
          return graphqlQuery<UpdateNodeDataRaw>(
            UPDATE_NODE_MUTATION,
            { id: node.id, data: { order: i + 1 } },
            userId,
          ).then((res) => parseUpdateNodeData(res))
        }),
      )

      revalidateWorkflowCampaignTreeCache(userId, workflowId)

      return NextResponse.json({ ok: true }, { status: 200 })
    }

    if (
      body.presetId !== undefined ||
      body.milestoneInput !== undefined ||
      body.passCriterias !== undefined ||
      body.goal !== undefined
    ) {
      const mn = validated.milestoneNode
      const merged: Record<string, unknown> = {
        ...(mn.data != null && typeof mn.data === 'object'
          ? { ...(mn.data as Record<string, unknown>) }
          : {}),
      }
      if (body.presetId !== undefined) {
        merged.presetId = body.presetId
      }
      if (body.milestoneInput !== undefined) {
        merged.milestoneInput = body.milestoneInput
      }
      if (body.passCriterias !== undefined) {
        merged.passCriterias = body.passCriterias
      }
      if (body.goal !== undefined) {
        merged.milestoneGoal = body.goal
      }
      parseUpdateNodeData(
        await graphqlQuery<UpdateNodeDataRaw>(
          UPDATE_NODE_MUTATION,
          { id: milestoneId, data: merged },
          userId,
        ),
      )
    }

    if (body.milestoneData !== undefined) {
      parseUpdateNodeData(
        await graphqlQuery<UpdateNodeDataRaw>(
          UPDATE_NODE_MUTATION,
          {
            id: milestoneId,
            data:
              body.milestoneData === null
                ? { milestonePresetData: null }
                : { milestonePresetData: body.milestoneData },
          },
          userId,
        ),
      )
    }

    if (body.name !== undefined) {
      parseUpdateNodeData(
        await graphqlQuery<UpdateNodeDataRaw>(
          UPDATE_NODE_MUTATION,
          { id: milestoneId, name: body.name },
          userId,
        ),
      )
    }

    const milestoneAfter = parseNodeData(
      await graphqlQuery<NodeDataRaw>(NODE_QUERY, { id: milestoneId }, userId),
    )

    const m = milestoneAfter.node
    let passCriterias: PassCriteriaData[] = []
    if (m?.nodeType === 'milestone') {
      const ms = m as MilestoneNode
      if (Array.isArray(ms.passCriterias) && ms.passCriterias.length > 0) {
        passCriterias = ms.passCriterias as PassCriteriaData[]
      } else if (ms.data != null && typeof ms.data === 'object') {
        passCriterias = passCriteriasFromMilestoneData(ms.data)
      }
    }

    revalidateWorkflowCampaignTreeCache(userId, workflowId)

    return NextResponse.json(
      {
        id: milestoneId,
        name: m?.name ?? '',
        nodeType: m?.nodeType ?? 'milestone',
        passCriterias,
        data: m?.data ?? null,
      },
      { status: 200 },
    )
  } catch (error) {
    console.error(error)
    const message = error instanceof Error ? error.message : 'Failed to update milestone'
    return NextResponse.json({ message }, { status: 500 })
  }
}

export async function DELETE(_req: Request, context: RouteContext) {
  try {
    await connection()
    const { isAuthenticated, userId } = await auth()
    if (!isAuthenticated || !userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: rawWorkflowId, milestoneId: rawMilestoneId } = await context.params

    const workflowParsed = workflowIdParamSchema.safeParse(rawWorkflowId)
    const milestoneParsed = milestoneIdParamSchema.safeParse(rawMilestoneId)
    if (!workflowParsed.success || !milestoneParsed.success) {
      return NextResponse.json({ message: 'Invalid id' }, { status: 400 })
    }
    const workflowId = workflowParsed.data
    const milestoneId = milestoneParsed.data

    const workflowRoot = await loadWorkflowRootOrThrow(workflowId, userId)
    if ('error' in workflowRoot) {
      return workflowRoot.error
    }

    const validated = await validateMilestoneUnderWorkflow(workflowId, milestoneId, userId)
    if ('error' in validated) {
      return validated.error
    }

    await graphqlQuery<DeleteNodeData>(DELETE_NODE_MUTATION, { id: milestoneId }, userId)

    revalidateWorkflowCampaignTreeCache(userId, workflowId)

    return new NextResponse(null, { status: 204 })
  } catch (error) {
    console.error(error)
    const message = error instanceof Error ? error.message : 'Failed to delete milestone'
    return NextResponse.json({ message }, { status: 500 })
  }
}
