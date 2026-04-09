import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { z } from 'zod'

import { getPythonAgentsUrl } from '@/lib/config'
import { graphqlQuery } from '@/lib/graphql/client'
import { NODE_QUERY, parseNodeData, type NodeDataRaw } from '@/lib/graphql/queries'
import { milestoneIdParamSchema, workflowIdParamSchema } from '../../schema'

export const maxDuration = 180

const prepareBodySchema = z.object({
  locationId: z.number().int().positive(),
  /** Which prepare pipeline to run; must match milestone Data source when set. */
  dataTask: z
    .enum([
      'location_profile',
      'instagram_campaign_schedule',
      'restaurant_brand_brief',
      'social_campaign_calendar',
      'social_caption_batch',
      'visual_creative_brief',
    ])
    .optional(),
})

type RouteContext = {
  params: Promise<{ id: string; milestoneId: string }>
}

export async function POST(req: Request, context: RouteContext) {
  const { isAuthenticated, userId } = await auth()
  if (!isAuthenticated) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id: rawWorkflowId, milestoneId: rawMilestoneId } = await context.params
  const workflowParsed = workflowIdParamSchema.safeParse(rawWorkflowId)
  const milestoneParsed = milestoneIdParamSchema.safeParse(rawMilestoneId)
  if (!workflowParsed.success || !milestoneParsed.success) {
    return NextResponse.json({ error: 'Invalid id' }, { status: 400 })
  }
  const workflowIdFromRoute = workflowParsed.data
  const milestoneId = milestoneParsed.data

  let json: unknown
  try {
    json = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }
  const parsed = prepareBodySchema.safeParse(json)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid body', issues: parsed.error.issues },
      { status: 400 },
    )
  }
  const { locationId, dataTask } = parsed.data
  const data_task = dataTask ?? 'location_profile'

  const rootData = parseNodeData(
    await graphqlQuery<NodeDataRaw>(NODE_QUERY, { id: workflowIdFromRoute }, userId),
  )
  const rootNode = rootData.node
  if (!rootNode || rootNode.nodeType !== 'workflow') {
    return NextResponse.json({ error: 'Workflow not found' }, { status: 404 })
  }
  if (rootNode.locationId == null || rootNode.locationId !== locationId) {
    return NextResponse.json({ error: 'Location mismatch' }, { status: 400 })
  }

  const milestoneData = parseNodeData(
    await graphqlQuery<NodeDataRaw>(NODE_QUERY, { id: milestoneId }, userId),
  )
  const milestoneNode = milestoneData.node
  if (!milestoneNode || milestoneNode.nodeType !== 'milestone') {
    return NextResponse.json({ error: 'Milestone not found' }, { status: 404 })
  }
  if (milestoneNode.parentId !== workflowIdFromRoute) {
    return NextResponse.json(
      { error: 'Milestone does not belong to this workflow' },
      { status: 400 },
    )
  }

  const baseUrl = getPythonAgentsUrl()
  let agentRes: Response
  try {
    agentRes = await fetch(`${baseUrl}/milestones/${milestoneId}/prepare`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Menuyukti-User-Id': userId,
      },
      body: JSON.stringify({
        location_id: locationId,
        data_task,
        workflow_id: workflowIdFromRoute,
      }),
      signal: req.signal,
    })
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err)
    return NextResponse.json(
      {
        error: `Cannot connect to agents at ${baseUrl} (${detail}). Start apps/agents (make dev, port 8001) and set PYTHON_AGENTS_URL if needed.`,
      },
      { status: 502 },
    )
  }

  if (!agentRes.ok) {
    const text = await agentRes.text()
    return NextResponse.json(
      { error: `Agents error (${agentRes.status}): ${text || agentRes.statusText}` },
      { status: 502 },
    )
  }

  if (!agentRes.body) {
    return NextResponse.json({ error: 'Empty response from agents' }, { status: 502 })
  }

  return new NextResponse(agentRes.body, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-store',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  })
}
