import { NextResponse, connection } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { revalidateTag } from 'next/cache'
import { ZodError } from 'zod'

import { graphqlQuery } from '@/lib/graphql/client'
import {
  UPDATE_CALENDAR_ENTRY_MUTATION,
  type UpdateCalendarEntryData,
} from '@/lib/graphql/queries/calendar-entries'
import {
  graphqlSchedulerCalendarCacheTag,
  revalidateTagAfterMutation,
} from '@/lib/graphql/cache-tags'

import { updateCalendarEntryBodySchema } from '../schema'

type RouteContext = {
  params: Promise<{ id: string }>
}

export async function PATCH(req: Request, context: RouteContext) {
  try {
    await connection()
    const { isAuthenticated, userId } = await auth()
    if (!isAuthenticated || !userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: idParam } = await context.params
    const id = Number(idParam)
    if (!Number.isInteger(id) || id < 1) {
      return NextResponse.json({ message: 'Invalid entry id' }, { status: 400 })
    }

    const json = await req.json()
    const body = updateCalendarEntryBodySchema.parse(json)

    const data = await graphqlQuery<UpdateCalendarEntryData>(
      UPDATE_CALENDAR_ENTRY_MUTATION,
      {
        id,
        ...(body.title !== undefined ? { title: body.title } : {}),
        ...(body.date !== undefined ? { date: body.date } : {}),
        ...(body.time !== undefined ? { time: body.time } : {}),
        ...(body.description !== undefined ? { description: body.description } : {}),
        ...(body.mediaRefs !== undefined ? { mediaRefs: body.mediaRefs } : {}),
        ...(body.sourceRef !== undefined ? { sourceRef: body.sourceRef } : {}),
      },
      userId,
    )

    const locationId = data.updateCalendarEntry.locationId
    revalidateTag(graphqlSchedulerCalendarCacheTag(userId, locationId), revalidateTagAfterMutation)

    return NextResponse.json({ entry: data.updateCalendarEntry })
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ message: 'Invalid input', issues: error.issues }, { status: 400 })
    }
    console.error('[calendar-entries] PATCH', error)
    const message = error instanceof Error ? error.message : 'Failed to update calendar entry'
    if (message.toLowerCase().includes('not found')) {
      return NextResponse.json({ message }, { status: 404 })
    }
    if (message.toLowerCase().includes('not allowed') || message.toLowerCase().includes('owner')) {
      return NextResponse.json({ message }, { status: 403 })
    }
    return NextResponse.json({ message }, { status: 500 })
  }
}
