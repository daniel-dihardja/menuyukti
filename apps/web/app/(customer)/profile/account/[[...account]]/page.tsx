import { redirect } from 'next/navigation'

import { routes } from '@/lib/routes'

/** Legacy Clerk UserProfile host — one shared profile lives at `/profile`. */
export default function ProfileAccountRedirectPage() {
  redirect(routes.profile)
}
