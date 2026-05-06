import { NextResponse } from 'next/server'
import { requireMenuyuktiAdminApi } from '@/lib/menuyukti-admin-api'

import { listBuiltinBackgrounds } from '@/lib/assets/backgrounds'

export async function GET() {
  const authz = await requireMenuyuktiAdminApi()
  if (!authz.ok) return authz.response

  try {
    const items = await listBuiltinBackgrounds()
    return NextResponse.json(
      { items },
      {
        headers: {
          'Cache-Control': 'private, max-age=300, stale-while-revalidate=600',
        },
      },
    )
  } catch (err) {
    console.error('[assets/backgrounds/list] failed', {
      message: err instanceof Error ? err.message : String(err),
    })
    return NextResponse.json({ message: 'Failed to list backgrounds' }, { status: 502 })
  }
}
