import { redirect } from 'next/navigation'

import { routes } from '@/lib/routes'

export default function CrmPage() {
  redirect(routes.crmRegistrations)
}
