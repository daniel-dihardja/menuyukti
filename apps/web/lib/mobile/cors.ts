import { NextResponse } from 'next/server'

const DEFAULT_MOBILE_CORS_ORIGINS = [
  'http://localhost:8081',
  'http://localhost:8082',
  'http://127.0.0.1:8081',
  'http://127.0.0.1:8082',
]

export function mobileCorsAllowOrigins(): string[] {
  const raw = process.env.MOBILE_CORS_ORIGINS?.trim()
  if (raw) {
    return raw
      .split(',')
      .map((o) => o.trim())
      .filter(Boolean)
  }
  return DEFAULT_MOBILE_CORS_ORIGINS
}

export function resolveMobileCorsOrigin(requestOrigin: string | null): string | null {
  if (!requestOrigin) return null
  const allowed = mobileCorsAllowOrigins()
  return allowed.includes(requestOrigin) ? requestOrigin : null
}

/** Apply CORS headers when Origin is allowed (Expo web). Native apps ignore CORS. */
export function withMobileCors(response: NextResponse, request: Request): NextResponse {
  const origin = resolveMobileCorsOrigin(request.headers.get('Origin'))
  if (origin) {
    response.headers.set('Access-Control-Allow-Origin', origin)
    response.headers.set('Access-Control-Allow-Methods', 'POST, OPTIONS')
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type')
    response.headers.set('Vary', 'Origin')
  }
  return response
}

export function mobileCorsPreflightResponse(request: Request): NextResponse {
  const response = new NextResponse(null, { status: 204 })
  return withMobileCors(response, request)
}
