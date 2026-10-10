import { NextResponse } from 'next/server'
import { ZodError } from 'zod'

import { requireMenuyuktiAdminApi } from '@/lib/menuyukti-admin-api'
import { runInstagramImageGeneration } from '@/lib/posts/run-instagram-image-generation'

import { generateArtworkBodySchema, LEONARDO_PROMPT_MAX_CHARS } from './schema'

export const maxDuration = 180

export async function POST(req: Request) {
  try {
    const authz = await requireMenuyuktiAdminApi()
    if (!authz.ok) return authz.response
    const { userId } = authz

    const json = await req.json()
    const body = generateArtworkBodySchema.parse(json)

    const isRefine = body.previousImageName !== undefined && body.feedback !== undefined

    // Defensive clip — Leonardo rejects prompts over 1500 characters.
    const rawPrompt = isRefine ? body.feedback! : body.prompt
    const prompt =
      rawPrompt.length > LEONARDO_PROMPT_MAX_CHARS
        ? rawPrompt.slice(0, LEONARDO_PROMPT_MAX_CHARS).trimEnd()
        : rawPrompt

    const result = await runInstagramImageGeneration({
      userId,
      prompt,
      format: 'story',
      references: isRefine
        ? [{ type: 'previous-result', filename: body.previousImageName! }]
        : [{ type: 'photo', name: body.styleImageName }],
      logPrefix: '[playbooks/public-holidays/generate-artwork]',
    })

    if (!result.ok) {
      return NextResponse.json(
        {
          message: result.error.message,
          ...(result.error.code ? { code: result.error.code } : {}),
        },
        { status: result.error.status },
      )
    }

    return NextResponse.json(result.data)
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ message: 'Invalid input', issues: error.issues }, { status: 400 })
    }
    console.error('[playbooks/public-holidays/generate-artwork] POST', error)
    const message = error instanceof Error ? error.message : 'Failed to generate artwork'
    return NextResponse.json({ message }, { status: 500 })
  }
}
