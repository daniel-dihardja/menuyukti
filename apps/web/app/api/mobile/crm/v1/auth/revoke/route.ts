import { NextResponse } from 'next/server'
import { ZodError } from 'zod'

import { mobileCorsPreflightResponse, withMobileCors } from '@/lib/mobile/cors'
import { postCrmUpstream } from '@/lib/mobile/crm-upstream'

import { mobileRevokeBodySchema } from './schema'

export async function OPTIONS(request: Request) {
  return mobileCorsPreflightResponse(request)
}

export async function POST(request: Request) {
  try {
    let json: unknown = {}
    try {
      const text = await request.text()
      if (text.trim()) {
        json = JSON.parse(text) as unknown
      }
    } catch {
      return withMobileCors(
        NextResponse.json({ message: 'Invalid JSON body' }, { status: 400 }),
        request,
      )
    }

    const body = mobileRevokeBodySchema.parse(json ?? {})
    const authHeader = request.headers.get('Authorization')
    const hasRefresh = Boolean(body.refreshToken?.trim())
    const hasBearer = Boolean(
      authHeader?.toLowerCase().startsWith('bearer ') && authHeader.slice(7).trim(),
    )

    if (!hasRefresh && !hasBearer) {
      return withMobileCors(
        NextResponse.json(
          { message: 'refreshToken or Authorization Bearer token is required' },
          { status: 400 },
        ),
        request,
      )
    }

    const result = await postCrmUpstream({
      path: '/crm/v1/auth/revoke',
      body: hasRefresh ? { refreshToken: body.refreshToken!.trim() } : {},
      headers: hasBearer && authHeader ? { Authorization: authHeader } : undefined,
      logLabel: 'mobile/crm/auth/revoke',
    })

    return withMobileCors(NextResponse.json(result.body, { status: result.status }), request)
  } catch (error) {
    if (error instanceof ZodError) {
      const first = error.issues[0]?.message ?? 'Invalid input'
      return withMobileCors(NextResponse.json({ message: first }, { status: 400 }), request)
    }
    console.error('[api/mobile/crm/v1/auth/revoke] POST', error)
    return withMobileCors(NextResponse.json({ message: 'Revoke failed' }, { status: 500 }), request)
  }
}
