import { NextResponse } from 'next/server'

import { requireAuthenticatedApi } from '@/lib/authenticated-api'
import { getPresignedGetUrl, isSafePhotoFilename } from '@/lib/assets/storage'
import {
  listWorkspaceMediaObjects,
  requireWorkspaceMediaAccess,
} from '@/lib/assets/workspace-media-access'
import { graphqlQuery } from '@/lib/graphql/client'
import { DEFAULT_LIST_FIRST } from '@/lib/graphql/pagination'
import { MEDIA_ASSETS_QUERY, type MediaAssetsData } from '@/lib/graphql/queries/media-collections'

export async function GET(req: Request) {
  const authz = await requireAuthenticatedApi()
  if (!authz.ok) return authz.response
  const { userId } = authz

  const mediaAccess = await requireWorkspaceMediaAccess(userId, 'read')
  if (!mediaAccess.ok) return mediaAccess.response

  const collectionIdRaw = new URL(req.url).searchParams.get('collectionId')
  let collectionId: number | undefined
  if (collectionIdRaw !== null && collectionIdRaw !== '') {
    const parsed = Number.parseInt(collectionIdRaw, 10)
    if (!Number.isInteger(parsed) || parsed <= 0) {
      return NextResponse.json({ message: 'Invalid collectionId' }, { status: 400 })
    }
    collectionId = parsed
  }

  type Row = {
    name: string
    url: string
    size: number
    createdAt: string
    displayName: string | null
  }

  try {
    const objectsPromise = listWorkspaceMediaObjects(
      mediaAccess.access,
      'photos',
      isSafePhotoFilename,
    )
    const catalogPromise = graphqlQuery<MediaAssetsData>(
      MEDIA_ASSETS_QUERY,
      { collectionId: collectionId ?? null, first: DEFAULT_LIST_FIRST },
      userId,
    )
      .then((catalog) => ({ ok: true as const, catalog }))
      .catch((err: unknown) => ({ ok: false as const, err }))

    const [objects, catalogResult] = await Promise.all([objectsPromise, catalogPromise])
    const s3ByName = new Map(objects.map((obj) => [obj.name, obj]))

    let catalogFilenames: string[] | null = null
    const displayNameByFilename = new Map<string, string | null>()

    if (catalogResult.ok) {
      for (const asset of catalogResult.catalog.mediaAssets) {
        displayNameByFilename.set(asset.filename, asset.displayName)
      }
      if (collectionId !== undefined) {
        catalogFilenames = catalogResult.catalog.mediaAssets.map((a) => a.filename)
      }
    } else {
      console.error('[media/list] mediaAssets query failed', {
        userIdPrefix: userId.slice(0, 8),
        message:
          catalogResult.err instanceof Error
            ? catalogResult.err.message
            : String(catalogResult.err),
      })
      if (collectionId !== undefined) {
        return NextResponse.json({ message: 'Failed to list collection media' }, { status: 502 })
      }
    }

    const names =
      catalogFilenames !== null
        ? catalogFilenames.filter((name) => s3ByName.has(name))
        : [...s3ByName.keys()]

    const rows: Row[] = await Promise.all(
      names.map(async (name) => {
        const obj = s3ByName.get(name)!
        return {
          name: obj.name,
          url: await getPresignedGetUrl(obj.key),
          size: obj.size,
          createdAt: obj.createdAt,
          displayName: displayNameByFilename.get(name) ?? null,
        }
      }),
    )

    const sortedRows = rows.toSorted((a, b) => b.createdAt.localeCompare(a.createdAt))

    return NextResponse.json(
      { items: sortedRows },
      {
        headers: {
          'Cache-Control': 'private, max-age=30, stale-while-revalidate=120',
        },
      },
    )
  } catch (err) {
    console.error('[media/list] S3 list failed', {
      userIdPrefix: userId.slice(0, 8),
      message: err instanceof Error ? err.message : String(err),
    })
    return NextResponse.json({ message: 'Failed to list media' }, { status: 502 })
  }
}
