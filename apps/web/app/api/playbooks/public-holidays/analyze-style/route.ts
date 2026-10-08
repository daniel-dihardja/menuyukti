import { NextResponse, connection } from 'next/server'
import { ZodError } from 'zod'

import { buildAgentsHeaders } from '@/lib/agents/headers'
import { ChatImageError, loadUserPhotoAsDataUrl } from '@/lib/chat/build-python-user-message'
import { getPythonAgentsUrl } from '@/lib/config'
import { requireMenuyuktiAdminApi } from '@/lib/menuyukti-admin-api'
import { assertUserPhotoExists } from '@/app/api/styles/helpers'

import { analyzeStyleBodySchema, styleAnalysisResultSchema } from './schema'

export const maxDuration = 120

export async function POST(req: Request) {
  await connection()
  try {
    const authz = await requireMenuyuktiAdminApi()
    if (!authz.ok) return authz.response
    const { userId } = authz

    const json = await req.json()
    const body = analyzeStyleBodySchema.parse(json)

    const photoError = await assertUserPhotoExists(userId, body.styleImageName)
    if (photoError) return photoError

    let imageUrl: string
    try {
      imageUrl = await loadUserPhotoAsDataUrl(userId, body.styleImageName)
    } catch (err) {
      if (err instanceof ChatImageError) {
        return NextResponse.json({ message: err.message }, { status: err.status })
      }
      throw err
    }

    const baseUrl = getPythonAgentsUrl()
    let agentRes: Response
    try {
      agentRes = await fetch(`${baseUrl}/playbooks/public-holidays/analyze-style`, {
        method: 'POST',
        headers: buildAgentsHeaders(userId),
        body: JSON.stringify({
          imageUrl,
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
      let message = 'Failed to analyze style'
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
      return NextResponse.json({ message }, { status: agentRes.status >= 500 ? 502 : 400 })
    }

    let payload: unknown
    try {
      payload = JSON.parse(text)
    } catch {
      return NextResponse.json({ message: 'Invalid agents response' }, { status: 502 })
    }

    const parsed = styleAnalysisResultSchema.safeParse(payload)
    if (!parsed.success) {
      return NextResponse.json({ message: 'Invalid agents response' }, { status: 502 })
    }

    return NextResponse.json(parsed.data)
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ message: 'Invalid input', issues: error.issues }, { status: 400 })
    }
    console.error('[playbooks/public-holidays/analyze-style] POST', error)
    const message = error instanceof Error ? error.message : 'Failed to analyze style'
    return NextResponse.json({ message }, { status: 500 })
  }
}
