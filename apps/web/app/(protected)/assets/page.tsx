import { redirect } from 'next/navigation'

import { routes } from '@/lib/routes'

/** Brand asset library moved to Studio. */
export default function Page() {
  redirect(routes.studio)
}
