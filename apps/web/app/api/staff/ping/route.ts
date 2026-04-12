import { auth } from '@clerk/nextjs/server'
import { connection, NextResponse } from 'next/server'

import { isMenuyuktiAdmin } from '@/lib/menuyukti-role'
import { resolveMenuyuktiRole } from '@/lib/menuyukti-role-server'

export async function GET() {
  await connection()
  const { isAuthenticated } = await auth()
  if (!isAuthenticated) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const role = await resolveMenuyuktiRole()
  if (!isMenuyuktiAdmin(role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  return NextResponse.json({ ok: true })
}
