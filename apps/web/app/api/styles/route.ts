import { NextResponse } from 'next/server'
import { ZodError } from 'zod'

import { graphqlQuery } from '@/lib/graphql/client'
import {
  CREATE_STYLE_MUTATION,
  STYLES_QUERY,
  type CreateStyleData,
  type StylesData,
} from '@/lib/graphql/queries/styles'
import { requireMenuyuktiAdminApi } from '@/lib/menuyukti-admin-api'

import { assertUserPhotoExists, mapGraphqlStyleError } from './helpers'
import { createStyleBodySchema } from './schema'

export async function GET() {
  try {
    const authz = await requireMenuyuktiAdminApi()
    if (!authz.ok) return authz.response
    const { userId } = authz

    const data = await graphqlQuery<StylesData>(STYLES_QUERY, {}, userId)

    return NextResponse.json({ styles: data.styles })
  } catch (error) {
    console.error('[styles] GET', error)
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
    const body = createStyleBodySchema.parse(json)

    const photoError = await assertUserPhotoExists(userId, body.referenceImageName)
    if (photoError) return photoError

    const data = await graphqlQuery<CreateStyleData>(
      CREATE_STYLE_MUTATION,
      {
        name: body.name,
        rules: body.rules,
        referenceImageName: body.referenceImageName,
        isDefault: body.isDefault ?? false,
        ...(body.styleSpec != null ? { styleSpec: body.styleSpec } : {}),
      },
      userId,
    )

    return NextResponse.json({ style: data.createStyle }, { status: 201 })
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ message: 'Invalid input', issues: error.issues }, { status: 400 })
    }
    console.error('[styles] POST', error)
    const message = error instanceof Error ? error.message : 'Failed to create style'
    const mapped = mapGraphqlStyleError(message)
    return NextResponse.json({ message: mapped.message }, { status: mapped.status })
  }
}
