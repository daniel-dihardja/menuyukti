import { NextResponse, after, connection } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { z } from 'zod'

import { getPythonAgentsUrl } from '@/lib/config'
import { graphqlQuery } from '@/lib/graphql/client'
import { revalidateWorkflowCampaignTreeCache } from '@/lib/graphql/revalidate-workflow-tree'
import { milestonedataValueSchema, milestoneInputSchema } from '@/lib/graphql/node-schemas'
import { NODE_QUERY, parseNodeData, type NodeDataRaw } from '@/lib/graphql/queries'
import { milestoneIdParamSchema, workflowIdParamSchema } from '../../schema'
import { isAllowedChatGatewayModel } from '@/lib/chat/gateway-chat-models'

export const maxDuration = 180

const runBodySchema = z.object({
  locationId: z.number().int().positive(),
  goal: z.string().optional(),
  model: z
    .string()
    .max(120)
    .optional()
    .refine((v) => v === undefined || isAllowedChatGatewayModel(v), {
      message: 'Unsupported chat model',
    }),
  milestoneInput: milestoneInputSchema.nullish(),
  milestoneData: milestonedataValueSchema.nullish(),
})

type RouteContext = {
  params: Promise<{ id: string; milestoneId: string }>
}

function shouldRevalidateWorkflowTreeFromSseBlock(block: string): boolean {
  const match = block.match(/^data: (.+)$/m)
  const raw = match?.[1]?.trim()
  if (!raw) {
    return false
  }
  try {
    const payload = JSON.parse(raw) as { done?: unknown; dataPreview?: unknown }
    return payload.done === true && payload.dataPreview != null
  } catch {
    return false
  }
}

function milestoneRunResponseWithWorkflowTreeRevalidation(
  agentBody: ReadableStream<Uint8Array>,
  onRunPersisted: () => void,
): ReadableStream<Uint8Array> {
  const reader = agentBody.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  let shouldRevalidate = false

  return new ReadableStream<Uint8Array>({
    async pull(controller) {
      const { done, value } = await reader.read()
      if (done) {
        if (buffer.trim()) {
          for (const block of buffer.split('\n\n')) {
            if (shouldRevalidateWorkflowTreeFromSseBlock(block)) {
              shouldRevalidate = true
            }
          }
        }
        if (shouldRevalidate) {
          onRunPersisted()
        }
        controller.close()
        return
      }

      buffer += decoder.decode(value, { stream: true })
      const blocks = buffer.split('\n\n')
      buffer = blocks.pop() ?? ''
      for (const block of blocks) {
        if (shouldRevalidateWorkflowTreeFromSseBlock(block)) {
          shouldRevalidate = true
        }
      }

      controller.enqueue(value)
    },
    cancel(reason) {
      void reader.cancel(reason)
    },
  })
}

export async function POST(req: Request, context: RouteContext) {
  await connection()
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
  const workflowId = workflowParsed.data
  const milestoneId = milestoneParsed.data

  let json: unknown
  try {
    json = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }
  const parsed = runBodySchema.safeParse(json)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid body', issues: parsed.error.issues },
      { status: 400 },
    )
  }
  const {
    locationId,
    goal,
    model: chatModel,
    milestoneData: milestoneDataPayload,
    milestoneInput,
  } = parsed.data

  const [rootRaw, milestoneRaw] = await Promise.all([
    graphqlQuery<NodeDataRaw>(NODE_QUERY, { id: workflowId }, userId),
    graphqlQuery<NodeDataRaw>(NODE_QUERY, { id: milestoneId }, userId),
  ])
  const rootData = parseNodeData(rootRaw)
  const rootNode = rootData.node
  if (!rootNode || rootNode.nodeType !== 'workflow') {
    return NextResponse.json({ error: 'Workflow not found' }, { status: 404 })
  }
  if (rootNode.locationId == null || rootNode.locationId !== locationId) {
    return NextResponse.json({ error: 'Location mismatch' }, { status: 400 })
  }

  const milestoneNode = parseNodeData(milestoneRaw).node
  if (!milestoneNode || milestoneNode.nodeType !== 'milestone') {
    return NextResponse.json({ error: 'Milestone not found' }, { status: 404 })
  }
  if (milestoneNode.parentId !== workflowId) {
    return NextResponse.json(
      { error: 'Milestone does not belong to this workflow' },
      { status: 400 },
    )
  }

  const traceparent = req.headers.get('traceparent')?.trim()

  const baseUrl = getPythonAgentsUrl()
  let agentRes: Response
  try {
    agentRes = await fetch(`${baseUrl}/milestones/${milestoneId}/run`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Menuyukti-User-Id': userId,
        ...(traceparent ? { traceparent } : {}),
      },
      body: JSON.stringify({
        location_id: locationId,
        workflow_id: workflowId,
        goal,
        milestone_input: milestoneInput,
        milestone_data: milestoneDataPayload,
        ...(chatModel != null ? { model: chatModel } : {}),
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

  let shouldRevalidateWorkflowTree = false
  after(() => {
    if (shouldRevalidateWorkflowTree) {
      revalidateWorkflowCampaignTreeCache(userId, workflowId)
    }
  })

  return new NextResponse(
    milestoneRunResponseWithWorkflowTreeRevalidation(agentRes.body, () => {
      shouldRevalidateWorkflowTree = true
    }),
    {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-store',
        Connection: 'keep-alive',
        'X-Accel-Buffering': 'no',
      },
    },
  )
}
