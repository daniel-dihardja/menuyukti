import { NextResponse } from 'next/server'

import { requireMenuyuktiAdminApi } from '@/lib/menuyukti-admin-api'
import { ZodError } from 'zod'

import { buildAgentsHeaders } from '@/lib/agents/headers'
import { getPythonAgentsUrl } from '@/lib/config'

import { holidayRelevanceBodySchema, holidayRelevanceResponseSchema } from './schema'

export const maxDuration = 120

export async function POST(req: Request) {
  try {
    const authz = await requireMenuyuktiAdminApi()
    if (!authz.ok) return authz.response
    const { userId } = authz

    const json = await req.json()
    const body = holidayRelevanceBodySchema.parse(json)

    const baseUrl = getPythonAgentsUrl()
    let agentRes: Response
    try {
      agentRes = await fetch(`${baseUrl}/playbooks/public-holidays/relevance`, {
        method: 'POST',
        headers: buildAgentsHeaders(userId),
        body: JSON.stringify({
          locationId: body.locationId,
          holidays: body.holidays.map((h) => ({
            id: h.id,
            date: h.date,
            name: h.name,
            ...(h.localName ? { localName: h.localName } : {}),
          })),
          ...(body.instructions ? { instructions: body.instructions } : {}),
        }),
        signal: req.signal,
      })
    } catch (err) {
      const detail = err instanceof Error ? err.message : String(err)
      return NextResponse.json(
        {
          message: `Cannot connect to agents at ${baseUrl} (${detail}). Start apps/agents (make dev, port 8001) and set PYTHON_AGENTS_URL if needed.`,
        },
        { status: 502 },
      )
    }

    const text = await agentRes.text()
    if (!agentRes.ok) {
      let message = 'Failed to score holiday relevance'
      try {
        const parsed = JSON.parse(text) as { detail?: string; message?: string }
        if (typeof parsed.detail === 'string' && parsed.detail.trim()) {
          message = parsed.detail
        } else if (typeof parsed.message === 'string' && parsed.message.trim()) {
          message = parsed.message
        }
      } catch {
        if (text.trim()) message = text.slice(0, 500)
      }
      return NextResponse.json({ message }, { status: agentRes.status === 404 ? 404 : 502 })
    }

    let payload: unknown
    try {
      payload = JSON.parse(text)
    } catch {
      return NextResponse.json({ message: 'Invalid agents response' }, { status: 502 })
    }

    const parsed = holidayRelevanceResponseSchema.safeParse(payload)
    if (!parsed.success) {
      return NextResponse.json({ message: 'Invalid agents response' }, { status: 502 })
    }

    return NextResponse.json({ holidays: parsed.data.holidays })
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ message: 'Invalid input', issues: error.issues }, { status: 400 })
    }
    console.error('[playbooks/public-holidays/relevance] POST', error)
    const message = error instanceof Error ? error.message : 'Failed to score holiday relevance'
    return NextResponse.json({ message }, { status: 500 })
  }
}
