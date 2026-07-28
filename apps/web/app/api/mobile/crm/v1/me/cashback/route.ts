import { NextResponse } from 'next/server'

import { mobileCorsPreflightResponse, withMobileCors } from '@/lib/mobile/cors'
import { getCrmUpstream } from '@/lib/mobile/crm-upstream'

export async function OPTIONS(request: Request) {
  return mobileCorsPreflightResponse(request)
}

export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get('Authorization')
    const hasBearer = Boolean(
      authHeader?.toLowerCase().startsWith('bearer ') && authHeader.slice(7).trim(),
    )
    if (!hasBearer || !authHeader) {
      return withMobileCors(
        NextResponse.json({ message: 'Authorization Bearer token is required' }, { status: 401 }),
        request,
      )
    }

    const result = await getCrmUpstream({
      path: '/crm/v1/me/cashback',
      headers: { Authorization: authHeader },
      logLabel: 'mobile/crm/me/cashback',
      unreachableMessage: 'Could not reach CRM cashback service',
    })

    return withMobileCors(NextResponse.json(result.body, { status: result.status }), request)
  } catch (error) {
    console.error('[api/mobile/crm/v1/me/cashback] GET', error)
    return withMobileCors(
      NextResponse.json({ message: 'Cashback overview failed' }, { status: 500 }),
      request,
    )
  }
}
