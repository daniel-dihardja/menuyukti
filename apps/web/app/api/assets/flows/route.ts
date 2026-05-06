import { NextResponse } from 'next/server'
import { requireMenuyuktiAdminApi } from '@/lib/menuyukti-admin-api'
import {
  listBuiltinAiFlowOptions,
  listBuiltinAiFlowOptionsForContext,
  type BuiltinAiFlowContext,
} from '@/lib/assets/builtin-ai-flows'

const VALID_CONTEXTS: BuiltinAiFlowContext[] = ['upload', 'product-card', 'design-create']

export async function GET(request: Request) {
  const authz = await requireMenuyuktiAdminApi()
  if (!authz.ok) return authz.response

  const { searchParams } = new URL(request.url)
  const contextParam = searchParams.get('context')

  if (contextParam && VALID_CONTEXTS.includes(contextParam as BuiltinAiFlowContext)) {
    return NextResponse.json({
      flows: listBuiltinAiFlowOptionsForContext(contextParam as BuiltinAiFlowContext),
    })
  }

  return NextResponse.json({ flows: listBuiltinAiFlowOptions() })
}
