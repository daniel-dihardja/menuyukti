import { NextResponse } from 'next/server'
import { ZodError } from 'zod'

import { requireAuthenticatedApi } from '@/lib/authenticated-api'
import { graphqlQuery } from '@/lib/graphql/client'
import {
  CREATE_CRM_ENROLLMENT_TOKEN_MUTATION,
  type CreateCrmEnrollmentTokenData,
} from '@/lib/graphql/queries/crm-registrations'

import { createEnrollmentTokenBodySchema } from '../schema'

export async function POST(req: Request) {
  try {
    const authz = await requireAuthenticatedApi()
    if (!authz.ok) return authz.response
    const { userId } = authz

    const json = await req.json()
    const body = createEnrollmentTokenBodySchema.parse(json)

    const data = await graphqlQuery<CreateCrmEnrollmentTokenData>(
      CREATE_CRM_ENROLLMENT_TOKEN_MUTATION,
      { appId: body.appId },
      userId,
    )

    return NextResponse.json({ enrollment: data.createCrmEnrollmentToken }, { status: 201 })
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ message: 'Invalid input', issues: error.issues }, { status: 400 })
    }
    console.error('[crm/registrations/enrollment-token] POST', error)
    const message = error instanceof Error ? error.message : 'Failed to create enrollment token'
    const status = message.includes('not found') || message.includes('Not allowed') ? 403 : 500
    return NextResponse.json({ message }, { status })
  }
}
