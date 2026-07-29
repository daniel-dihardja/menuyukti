import { NextResponse } from 'next/server'
import { ZodError } from 'zod'

import { mobileCorsPreflightResponse, withMobileCors } from '@/lib/mobile/cors'
import { postCrmUpstream } from '@/lib/mobile/crm-upstream'

import { mobileVerifyBodySchema } from './schema'

export async function OPTIONS(request: Request) {
  return mobileCorsPreflightResponse(request)
}

export async function POST(request: Request) {
  try {
    let json: unknown
    try {
      json = await request.json()
    } catch {
      return withMobileCors(
        NextResponse.json({ message: 'Invalid JSON body' }, { status: 400 }),
        request,
      )
    }

    const body = mobileVerifyBodySchema.parse(json)
    const result = await postCrmUpstream({
      path: '/crm/v1/auth/verify',
      body: {
        deviceId: body.deviceId,
        challengeId: body.challengeId,
        signature: body.signature,
      },
      logLabel: 'mobile/crm/auth/verify',
    })

    return withMobileCors(NextResponse.json(result.body, { status: result.status }), request)
  } catch (error) {
    if (error instanceof ZodError) {
      const first = error.issues[0]?.message ?? 'Invalid input'
      return withMobileCors(NextResponse.json({ message: first }, { status: 400 }), request)
    }
    console.error('[api/mobile/crm/v1/auth/verify] POST', error)
    return withMobileCors(NextResponse.json({ message: 'Verify failed' }, { status: 500 }), request)
  }
}
