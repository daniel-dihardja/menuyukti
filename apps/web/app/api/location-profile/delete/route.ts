import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { graphqlQuery } from '@/lib/graphql/client'
import {
  DELETE_LOCATION_PROFILE_MUTATION,
  type DeleteLocationProfileData,
} from '@/lib/graphql/queries'

/**
 * DELETE /api/location-profile/delete
 * Body: { id: string }
 */
export async function DELETE(req: Request) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const id = body?.id

    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 })
    }

    const data = await graphqlQuery<DeleteLocationProfileData>(
      DELETE_LOCATION_PROFILE_MUTATION,
      { id: String(id) },
      userId,
    )

    if (!data.deleteLocationProfile) {
      return NextResponse.json({ error: 'Location profile not found' }, { status: 404 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Location profile delete failed:', err)
    const message = err instanceof Error ? err.message : 'Failed to delete location profile'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
