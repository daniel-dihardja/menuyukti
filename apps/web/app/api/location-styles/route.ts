import { NextResponse } from 'next/server'
import { ZodError } from 'zod'

import { graphqlQuery } from '@/lib/graphql/client'
import {
  CREATE_LOCATION_STYLE_MUTATION,
  LOCATION_STYLES_QUERY,
  type CreateLocationStyleData,
  type LocationStylesData,
} from '@/lib/graphql/queries/location-styles'
import { requireMenuyuktiAdminApi } from '@/lib/menuyukti-admin-api'

import { assertUserPhotoExists, mapGraphqlStyleError } from './helpers'
import { createLocationStyleBodySchema } from './schema'

export async function GET(req: Request) {
  try {
    const authz = await requireMenuyuktiAdminApi()
    if (!authz.ok) return authz.response
    const { userId } = authz

    const locationIdParam = new URL(req.url).searchParams.get('locationId')
    const locationId = locationIdParam ? Number(locationIdParam) : NaN
    if (!Number.isInteger(locationId) || locationId <= 0) {
      return NextResponse.json({ message: 'locationId is required' }, { status: 400 })
    }

    const data = await graphqlQuery<LocationStylesData>(
      LOCATION_STYLES_QUERY,
      { locationId },
      userId,
    )

    return NextResponse.json({ styles: data.locationStyles })
  } catch (error) {
    console.error('[location-styles] GET', error)
    const message = error instanceof Error ? error.message : 'Failed to list styles'
    const mapped = mapGraphqlStyleError(message)
    return NextResponse.json({ message: mapped.message }, { status: mapped.status })
  }
}

export async function POST(req: Request) {
  try {
    const authz = await requireMenuyuktiAdminApi()
    if (!authz.ok) return authz.response
    const { userId } = authz

    const json = await req.json()
    const body = createLocationStyleBodySchema.parse(json)

    const photoError = await assertUserPhotoExists(userId, body.referenceImageName)
    if (photoError) return photoError

    const data = await graphqlQuery<CreateLocationStyleData>(
      CREATE_LOCATION_STYLE_MUTATION,
      {
        locationId: body.locationId,
        name: body.name,
        rules: body.rules,
        referenceImageName: body.referenceImageName,
        isDefault: body.isDefault ?? false,
      },
      userId,
    )

    return NextResponse.json({ style: data.createLocationStyle }, { status: 201 })
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ message: 'Invalid input', issues: error.issues }, { status: 400 })
    }
    console.error('[location-styles] POST', error)
    const message = error instanceof Error ? error.message : 'Failed to create style'
    const mapped = mapGraphqlStyleError(message)
    return NextResponse.json({ message: mapped.message }, { status: mapped.status })
  }
}
