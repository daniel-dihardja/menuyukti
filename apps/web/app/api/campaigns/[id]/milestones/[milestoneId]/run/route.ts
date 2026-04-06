import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { z } from 'zod'

import { getPythonAgentsUrl } from '@/lib/config'
import { graphqlQuery } from '@/lib/graphql/client'
import { NODE_QUERY, parseNodeData, type NodeDataRaw } from '@/lib/graphql/queries'
import { campaignIdParamSchema, milestoneIdParamSchema } from '../../schema'

export const maxDuration = 180

const runBodySchema = z.object({
  locationId: z.number().int().positive(),
})

type RouteContext = {
  params: Promise<{ id: string; milestoneId: string }>
}

export async function POST(req: Request, context: RouteContext) {
  const { userId } = await auth()
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id: rawCampaignId, milestoneId: rawMilestoneId } = await context.params
  const campaignParsed = campaignIdParamSchema.safeParse(rawCampaignId)
  const milestoneParsed = milestoneIdParamSchema.safeParse(rawMilestoneId)
  if (!campaignParsed.success || !milestoneParsed.success) {
    return NextResponse.json({ error: 'Invalid id' }, { status: 400 })
  }
  const campaignId = campaignParsed.data
  const milestoneId = milestoneParsed.data

  let json: unknown
  try {
    json = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }
  const parsed = runBodySchema.safeParse(json)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid body', issues: parsed.error.issues }, { status: 400 })
  }
  const { locationId } = parsed.data

  const campaignData = parseNodeData(
    await graphqlQuery<NodeDataRaw>(NODE_QUERY, { id: campaignId }, userId),
  )
  const campaignNode = campaignData.node
  if (!campaignNode || campaignNode.nodeType !== 'campaign') {
    return NextResponse.json({ error: 'Campaign not found' }, { status: 404 })
  }
  if (campaignNode.locationId == null || campaignNode.locationId !== locationId) {
    return NextResponse.json({ error: 'Location mismatch' }, { status: 400 })
  }

  const milestoneData = parseNodeData(
    await graphqlQuery<NodeDataRaw>(NODE_QUERY, { id: milestoneId }, userId),
  )
  const milestoneNode = milestoneData.node
  if (!milestoneNode || milestoneNode.nodeType !== 'milestone') {
    return NextResponse.json({ error: 'Milestone not found' }, { status: 404 })
  }
  if (milestoneNode.parentId !== campaignId) {
    return NextResponse.json({ error: 'Milestone does not belong to this campaign' }, { status: 400 })
  }

  const baseUrl = getPythonAgentsUrl()
  let agentRes: Response
  try {
    agentRes = await fetch(`${baseUrl}/milestones/${milestoneId}/run`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Menuyukti-User-Id': userId,
      },
      body: JSON.stringify({ location_id: locationId }),
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
