import { clerkClient } from '@clerk/nextjs/server'
import { verifyWebhook } from '@clerk/backend/webhooks'
import { NextResponse } from 'next/server'

import { normalizeMenuyuktiRole } from '@/lib/menuyukti-role'

/**
 * Sets `publicMetadata.menuyuktiRole` to `user` on signup when unset.
 * Configure in Clerk Dashboard → Webhooks → endpoint `POST /api/webhooks/clerk`
 * (events: `user.created`). Set `CLERK_WEBHOOK_SIGNING_SECRET` from the webhook detail page.
 */
export async function POST(request: Request) {
  const signingSecret = process.env.CLERK_WEBHOOK_SIGNING_SECRET?.trim()
  if (!signingSecret) {
    return NextResponse.json({ error: 'Webhook signing secret not configured' }, { status: 503 })
  }

  let evt: Awaited<ReturnType<typeof verifyWebhook>>
  try {
    evt = await verifyWebhook(request, { signingSecret })
  } catch {
    return NextResponse.json({ error: 'Invalid webhook' }, { status: 400 })
  }

  if (evt.type === 'user.created') {
    const userId = evt.data.id
    const client = await clerkClient()
    const user = await client.users.getUser(userId)
    const meta = (user.publicMetadata ?? {}) as Record<string, unknown>
    const existing = normalizeMenuyuktiRole(meta.menuyuktiRole)
    if (existing === 'admin') {
      return NextResponse.json({ ok: true })
    }
    if (meta.menuyuktiRole === 'user') {
      return NextResponse.json({ ok: true })
    }
    await client.users.updateUser(userId, {
      publicMetadata: {
        ...meta,
        menuyuktiRole: 'user',
      },
    })
  }

  return NextResponse.json({ ok: true })
}
