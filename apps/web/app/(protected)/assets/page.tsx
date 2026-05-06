import { redirect } from 'next/navigation'

import { routes } from '@/lib/routes'
import { isMenuyuktiAdmin } from '@/lib/menuyukti-role'
import { resolveMenuyuktiRole } from '@/lib/menuyukti-role-server'

/** Brand asset library moved to Canvas (admin-only). */
export default async function Page() {
  const role = await resolveMenuyuktiRole()
  if (!isMenuyuktiAdmin(role)) {
    redirect(routes.dashboard)
  }
  redirect(routes.canvas)
}
