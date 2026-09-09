import { NextResponse, connection } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { ZodError } from 'zod'

import { graphqlQuery } from '@/lib/graphql/client'
import {
  DELETE_PLAYBOOK_MUTATION,
  PLAYBOOK_QUERY,
  UPDATE_PLAYBOOK_MUTATION,
  type DeletePlaybookData,
  type PlaybookData,
  type UpdatePlaybookData,
} from '@/lib/graphql/queries/playbooks'

import { updatePlaybookBodySchema } from '../schema'

type RouteContext = {
  params: Promise<{ id: string }>
}

function parsePlaybookId(idParam: string): number | null {
  const id = Number(idParam)
  if (!Number.isInteger(id) || id < 1) return null
  return id
}

function mapPlaybookWriteError(message: string): { status: number; message: string } {
  const lower = message.toLowerCase()
  if (lower.includes('not found')) {
    return { status: 404, message }
  }
  if (lower.includes('not allowed') || lower.includes('owner')) {
    return { status: 403, message }
  }
  if (
    lower.includes('cannot be empty') ||
    lower.includes('unknown playbook') ||
    lower.includes('must be') ||
    lower.includes('too long')
  ) {
    return { status: 400, message }
  }
  return { status: 500, message }
}

export async function GET(_req: Request, context: RouteContext) {
  try {
    await connection()
    const { isAuthenticated, userId } = await auth()
    if (!isAuthenticated || !userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: idParam } = await context.params
    const id = parsePlaybookId(idParam)
    if (id === null) {
      return NextResponse.json({ message: 'Invalid playbook id' }, { status: 400 })
    }

    const data = await graphqlQuery<PlaybookData>(PLAYBOOK_QUERY, { id }, userId)
    if (!data.playbook) {
      return NextResponse.json({ message: 'Playbook not found' }, { status: 404 })
    }
    return NextResponse.json({ playbook: data.playbook })
  } catch (error) {
    console.error('[playbooks/:id] GET', error)
    const message = error instanceof Error ? error.message : 'Failed to load playbook'
    return NextResponse.json({ message }, { status: 500 })
  }
}

export async function PATCH(req: Request, context: RouteContext) {
  try {
    await connection()
    const { isAuthenticated, userId } = await auth()
    if (!isAuthenticated || !userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: idParam } = await context.params
    const id = parsePlaybookId(idParam)
    if (id === null) {
      return NextResponse.json({ message: 'Invalid playbook id' }, { status: 400 })
    }

    const json = await req.json()
    const body = updatePlaybookBodySchema.parse(json)
    if (body.endDate < body.startDate) {
      return NextResponse.json(
        { message: 'endDate must be on or after startDate' },
        { status: 400 },
      )
    }

    const data = await graphqlQuery<UpdatePlaybookData>(
      UPDATE_PLAYBOOK_MUTATION,
      {
        id,
        name: body.name,
        locationId: body.locationId,
        startDate: body.startDate,
        endDate: body.endDate,
      },
      userId,
    )

    return NextResponse.json({ playbook: data.updatePlaybook })
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ message: 'Invalid input', issues: error.issues }, { status: 400 })
    }
    console.error('[playbooks/:id] PATCH', error)
    const message = error instanceof Error ? error.message : 'Failed to update playbook'
    const mapped = mapPlaybookWriteError(message)
    return NextResponse.json({ message: mapped.message }, { status: mapped.status })
  }
}

export async function DELETE(_req: Request, context: RouteContext) {
  try {
    await connection()
    const { isAuthenticated, userId } = await auth()
    if (!isAuthenticated || !userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: idParam } = await context.params
    const id = parsePlaybookId(idParam)
    if (id === null) {
      return NextResponse.json({ message: 'Invalid playbook id' }, { status: 400 })
    }

    const data = await graphqlQuery<DeletePlaybookData>(DELETE_PLAYBOOK_MUTATION, { id }, userId)
    return NextResponse.json({ ok: data.deletePlaybook })
  } catch (error) {
    console.error('[playbooks/:id] DELETE', error)
    const message = error instanceof Error ? error.message : 'Failed to delete playbook'
    const mapped = mapPlaybookWriteError(message)
    return NextResponse.json({ message: mapped.message }, { status: mapped.status })
  }
}
