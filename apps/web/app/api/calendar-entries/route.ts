import { NextResponse, connection } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { revalidateTag } from 'next/cache'
import { ZodError } from 'zod'

import { graphqlQuery } from '@/lib/graphql/client'
import {
  CREATE_CALENDAR_ENTRY_MUTATION,
  type CreateCalendarEntryData,
} from '@/lib/graphql/queries/calendar-entries'
import {
  graphqlSchedulerCalendarCacheTag,
  revalidateTagAfterMutation,
} from '@/lib/graphql/cache-tags'

import { createCalendarEntryBodySchema } from './schema'

export async function POST(req: Request) {
  try {
    await connection()
    const { isAuthenticated, userId } = await auth()
    if (!isAuthenticated || !userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const json = await req.json()
    const body = createCalendarEntryBodySchema.parse(json)

    const data = await graphqlQuery<CreateCalendarEntryData>(
      CREATE_CALENDAR_ENTRY_MUTATION,
      {
        locationId: body.locationId,
        title: body.title,
        date: body.date,
        time: body.time,
        description: body.description ?? '',
        mediaRefs: body.mediaRefs ?? [],
        ...(body.sourceRef !== undefined ? { sourceRef: body.sourceRef } : {}),
      },
      userId,
    )

    revalidateTag(
      graphqlSchedulerCalendarCacheTag(userId, body.locationId),
      revalidateTagAfterMutation,
    )

    return NextResponse.json({ entry: data.createCalendarEntry }, { status: 201 })
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ message: 'Invalid input', issues: error.issues }, { status: 400 })
    }
    console.error('[calendar-entries] POST', error)
    const message = error instanceof Error ? error.message : 'Failed to create calendar entry'
    if (message.toLowerCase().includes('not allowed') || message.toLowerCase().includes('owner')) {
      return NextResponse.json({ message }, { status: 403 })
    }
    return NextResponse.json({ message }, { status: 500 })
  }
}
