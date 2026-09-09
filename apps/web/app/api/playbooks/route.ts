import { NextResponse, connection } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { ZodError } from 'zod'

import { graphqlQuery } from '@/lib/graphql/client'
import {
  CREATE_PLAYBOOK_MUTATION,
  PLAYBOOKS_QUERY,
  type CreatePlaybookData,
  type PlaybooksData,
} from '@/lib/graphql/queries/playbooks'

import { createPlaybookBodySchema } from './schema'

export async function GET(req: Request) {
  try {
    await connection()
    const { isAuthenticated, userId } = await auth()
    if (!isAuthenticated || !userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const playbookType = new URL(req.url).searchParams.get('playbookType')?.trim()
    if (!playbookType) {
      return NextResponse.json({ message: 'playbookType is required' }, { status: 400 })
    }

    const data = await graphqlQuery<PlaybooksData>(PLAYBOOKS_QUERY, { playbookType }, userId)
    return NextResponse.json({ playbooks: data.playbooks })
  } catch (error) {
    console.error('[playbooks] GET', error)
    const message = error instanceof Error ? error.message : 'Failed to list playbooks'
    return NextResponse.json({ message }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    await connection()
    const { isAuthenticated, userId } = await auth()
    if (!isAuthenticated || !userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const json = await req.json()
    const body = createPlaybookBodySchema.parse(json)

    if (body.endDate < body.startDate) {
      return NextResponse.json(
        { message: 'endDate must be on or after startDate' },
        { status: 400 },
      )
    }

    const data = await graphqlQuery<CreatePlaybookData>(
      CREATE_PLAYBOOK_MUTATION,
      {
        locationId: body.locationId,
        name: body.name,
        playbookType: body.playbookType,
        startDate: body.startDate,
        endDate: body.endDate,
      },
      userId,
    )

    return NextResponse.json({ playbook: data.createPlaybook }, { status: 201 })
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ message: 'Invalid input', issues: error.issues }, { status: 400 })
    }
    console.error('[playbooks] POST', error)
    const message = error instanceof Error ? error.message : 'Failed to create playbook'
    if (message.toLowerCase().includes('not allowed') || message.toLowerCase().includes('owner')) {
      return NextResponse.json({ message }, { status: 403 })
    }
    if (
      message.toLowerCase().includes('cannot be empty') ||
      message.toLowerCase().includes('unknown playbook') ||
      message.toLowerCase().includes('must be')
    ) {
      return NextResponse.json({ message }, { status: 400 })
    }
    return NextResponse.json({ message }, { status: 500 })
  }
}
