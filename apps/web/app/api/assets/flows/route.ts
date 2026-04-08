import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'

import { graphqlQuery } from '@/lib/graphql/client'
import { IMAGE_AI_FLOWS_QUERY, type ImageAiFlowsData } from '@/lib/graphql/queries'

export const runtime = 'nodejs'

export async function GET() {
  const { isAuthenticated } = await auth()
  if (!isAuthenticated) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

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
