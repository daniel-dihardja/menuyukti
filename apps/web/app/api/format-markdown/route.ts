import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { z } from 'zod'

import { getPythonAgentsUrl } from '@/lib/config'
export const maxDuration = 120

const bodySchema = z.object({
  content: z.string().max(200_000),
  preset: z.enum(['milestone-goal', 'milestone-data']),
})

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status })
}

export async function POST(req: Request) {
  const { userId } = await auth()
  if (!userId) {
    return jsonError('Unauthorized', 401)
  }

  let json: unknown
  try {
    json = await req.json()
  } catch {
    return jsonError('Invalid JSON body', 400)
  }

  const parsed = bodySchema.safeParse(json)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid body', issues: parsed.error.issues }, { status: 400 })
  }

  const { content, preset } = parsed.data // aligns with @/lib/markdown-format-presets
  const baseUrl = getPythonAgentsUrl()

  let agentRes: Response
  try {
    agentRes = await fetch(`${baseUrl}/format-markdown`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Menuyukti-User-Id': userId,
      },
      body: JSON.stringify({ content, preset }),
      signal: req.signal,
    })
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err)
    return jsonError(
      `Cannot connect to agents at ${baseUrl} (${detail}). Start apps/agents (make dev, port 8001) and set PYTHON_AGENTS_URL if needed.`,
      502,
    )
  }

  const text = await agentRes.text()
  if (!agentRes.ok) {
    let message = `Agents error (${agentRes.status})`
    try {
      const errJson = JSON.parse(text) as { detail?: unknown }
      if (typeof errJson.detail === 'string') {
        message = errJson.detail
      }
    } catch {
      if (text) message = text
    }
    return jsonError(message, agentRes.status >= 500 ? 502 : 400)
  }

  try {
    const data = JSON.parse(text) as { formatted?: string }
    if (typeof data.formatted !== 'string') {
      return jsonError('Invalid agents response', 502)
    }
    return NextResponse.json({ formatted: data.formatted })
  } catch {
    return jsonError('Invalid agents response', 502)
  }
}
