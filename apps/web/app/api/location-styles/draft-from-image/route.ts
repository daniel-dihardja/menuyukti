import { NextResponse, connection } from 'next/server'
import { ZodError } from 'zod'

import { ChatImageError, loadUserPhotoAsDataUrl } from '@/lib/chat/build-python-user-message'
import { getPythonAgentsUrl } from '@/lib/config'
import { parseStyleSpecResult } from '@/lib/location-styles/style-spec'
import { requireMenuyuktiAdminApi } from '@/lib/menuyukti-admin-api'

import { assertUserPhotoExists } from '../helpers'
import { draftFromImageBodySchema } from '../schema'

export const maxDuration = 120

export async function POST(req: Request) {
  await connection()
  try {
    const authz = await requireMenuyuktiAdminApi()
    if (!authz.ok) return authz.response
    const { userId } = authz

    const json = await req.json()
    const body = draftFromImageBodySchema.parse(json)

    const photoError = await assertUserPhotoExists(userId, body.mediaName)
    if (photoError) return photoError

    let imageUrl: string
    try {
      imageUrl = await loadUserPhotoAsDataUrl(userId, body.mediaName)
    } catch (err) {
      if (err instanceof ChatImageError) {
        return NextResponse.json({ message: err.message }, { status: err.status })
      }
      throw err
    }

    const baseUrl = getPythonAgentsUrl()
    let agentRes: Response
    try {
      agentRes = await fetch(`${baseUrl}/style-specs/draft-from-image`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Menuyukti-User-Id': userId,
        },
        body: JSON.stringify({
          image_url: imageUrl,
          intent: body.intent,
          model: body.model,
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
      let message = `Agents error (${agentRes.status})`
      try {
        const errJson = JSON.parse(text) as { detail?: unknown }
        if (typeof errJson.detail === 'string') {
          message = errJson.detail
        }
      } catch {
        if (text) message = text
      }
      return NextResponse.json({ message }, { status: agentRes.status >= 500 ? 502 : 400 })
    }

    let parsed: { name?: string; style_spec?: unknown }
    try {
      parsed = JSON.parse(text) as { name?: string; style_spec?: unknown }
    } catch {
      return NextResponse.json({ message: 'Invalid agents response' }, { status: 502 })
    }

    if (typeof parsed.name !== 'string' || !parsed.name.trim()) {
      return NextResponse.json(
        { message: 'Invalid style spec from agents (missing name)' },
        { status: 502 },
      )
    }

    const specResult = parseStyleSpecResult(parsed.style_spec)
    if (!specResult.ok) {
      const detail = specResult.issues
        .slice(0, 5)
        .map((issue) => `${issue.path.join('.') || '(root)'}: ${issue.message}`)
        .join('; ')
      console.error('[location-styles/draft-from-image] styleSpec validation failed', {
        issues: specResult.issues,
        styleSpec: parsed.style_spec,
      })
      return NextResponse.json(
        {
          message: detail
            ? `Invalid style spec from agents: ${detail}`
            : 'Invalid style spec from agents',
          issues: specResult.issues.slice(0, 8),
        },
        { status: 502 },
      )
    }

    return NextResponse.json({
      name: parsed.name.trim().slice(0, 128),
      styleSpec: specResult.data,
      mediaName: body.mediaName,
    })
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ message: 'Invalid input', issues: error.issues }, { status: 400 })
    }
    console.error('[location-styles/draft-from-image] POST', error)
    const message = error instanceof Error ? error.message : 'Failed to draft style'
    return NextResponse.json({ message }, { status: 500 })
  }
}
