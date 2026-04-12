import { NextResponse } from 'next/server'
import { graphqlQuery } from '@/lib/graphql/client'
import { requireMenuyuktiAdminApi } from '@/lib/menuyukti-admin-api'
import { IMAGE_AI_FLOWS_QUERY, type ImageAiFlowsData } from '@/lib/graphql/queries'

export async function GET() {
  const authz = await requireMenuyuktiAdminApi()
  if (!authz.ok) return authz.response

  try {
    const data = await graphqlQuery<ImageAiFlowsData>(IMAGE_AI_FLOWS_QUERY)
    const flows = (data.imageAiFlows ?? []).map((f) => ({
      slug: f.slug,
      displayName: f.displayName,
    }))
    return NextResponse.json({ flows })
  } catch (err) {
    console.error('[assets/flows] GraphQL failed', {
      message: err instanceof Error ? err.message : String(err),
    })
    return NextResponse.json({ message: 'Could not load AI flows' }, { status: 502 })
  }
}
