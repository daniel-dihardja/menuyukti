import { NextResponse } from 'next/server'
import { requireMenuyuktiAdminApi } from '@/lib/menuyukti-admin-api'
import { listBuiltinAiFlowOptions } from '@/lib/assets/builtin-ai-flows'

export async function GET() {
  const authz = await requireMenuyuktiAdminApi()
  if (!authz.ok) return authz.response

  return NextResponse.json({ flows: listBuiltinAiFlowOptions() })
}
