import { redirect } from 'next/navigation'

import { routes } from '@/lib/routes'

/** Legacy customer-shell team URL — Team lives in the operator shell. */
export default function LegacyProfileTeamRedirect() {
  redirect(routes.team)
}
