import { NextResponse } from 'next/server'
import { ZodError } from 'zod'

import { graphqlQuery } from '@/lib/graphql/client'
import {
  DELETE_LOCATION_STYLE_MUTATION,
  UPDATE_LOCATION_STYLE_MUTATION,
  type DeleteLocationStyleData,
  type UpdateLocationStyleData,
} from '@/lib/graphql/queries/location-styles'
import { requireMenuyuktiAdminApi } from '@/lib/menuyukti-admin-api'

import { assertUserPhotoExists, mapGraphqlStyleError } from '../helpers'
import { updateLocationStyleBodySchema } from '../schema'

type RouteContext = {
  params: Promise<{ id: string }>
}

export async function PATCH(req: Request, context: RouteContext) {
  try {
    const authz = await requireMenuyuktiAdminApi()
    if (!authz.ok) return authz.response
    const { userId } = authz

    const { id: rawId } = await context.params
    const id = Number(rawId)
    if (!Number.isInteger(id) || id <= 0) {
      return NextResponse.json({ message: 'Invalid id' }, { status: 400 })
    }

    const json = await req.json()
    const body = updateLocationStyleBodySchema.parse(json)

    if (body.referenceImageName !== undefined) {
      const photoError = await assertUserPhotoExists(userId, body.referenceImageName)
      if (photoError) return photoError
    }

    const variables: Record<string, unknown> = { id }
    if (body.name !== undefined) variables.name = body.name
    if (body.rules !== undefined) variables.rules = body.rules
    if (body.referenceImageName !== undefined) {
      variables.referenceImageName = body.referenceImageName
    }
    if (body.isDefault !== undefined) variables.isDefault = body.isDefault
    if (body.styleSpec !== undefined) variables.styleSpec = body.styleSpec

    const data = await graphqlQuery<UpdateLocationStyleData>(
      UPDATE_LOCATION_STYLE_MUTATION,
      variables,
      userId,
    )

    return NextResponse.json({ style: data.updateLocationStyle })
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ message: 'Invalid input', issues: error.issues }, { status: 400 })
    }
    console.error('[location-styles] PATCH', error)
    const message = error instanceof Error ? error.message : 'Failed to update style'
    const mapped = mapGraphqlStyleError(message)
    return NextResponse.json({ message: mapped.message }, { status: mapped.status })
  }
}

export async function DELETE(_req: Request, context: RouteContext) {
  try {
    const authz = await requireMenuyuktiAdminApi()
    if (!authz.ok) return authz.response
    const { userId } = authz

    const { id: rawId } = await context.params
    const id = Number(rawId)
    if (!Number.isInteger(id) || id <= 0) {
      return NextResponse.json({ message: 'Invalid id' }, { status: 400 })
    }

    await graphqlQuery<DeleteLocationStyleData>(DELETE_LOCATION_STYLE_MUTATION, { id }, userId)

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('[location-styles] DELETE', error)
    const message = error instanceof Error ? error.message : 'Failed to delete style'
    const mapped = mapGraphqlStyleError(message)
    return NextResponse.json({ message: mapped.message }, { status: mapped.status })
  }
}
