import { WorkspacePlanProvider } from '@/components/workspace-plan-provider'
import { WorkspacePlanRouteGuard } from '@/components/workspace-plan-route-guard'
import { auth } from '@clerk/nextjs/server'
import { connection } from 'next/server'
import { redirect } from 'next/navigation'
import { routes } from '@/lib/routes'
import { enforceWorkspacePlanRoute } from '@/lib/workspace-plan-route'
import { getWorkspacePlanForUser } from '@/lib/workspace-plan-server'

/**
 * Auth-required customer shell (no operator sidebar).
 * Chrome: global `MainHeader` via `AppChrome`. Plan gates: free → `/home` | `/profile`.
 */
/** Auth + workspace-plan GraphQL gate; layout is allowed to block navigations. */
export const instant = false

export default async function CustomerLayout({ children }: { children: React.ReactNode }) {
  // Same as AdminLayout: Clerk may read current time during auth under Cache Components.
  await connection()
  const { isAuthenticated } = await auth()
  if (!isAuthenticated) {
    // Prefer middleware `auth.protect`; this is defense-in-depth only.
    redirect(routes.login)
  }

  await enforceWorkspacePlanRoute()
  const { plan, workspaceId } = await getWorkspacePlanForUser()

  return (
    <WorkspacePlanProvider plan={plan} workspaceId={workspaceId}>
      <WorkspacePlanRouteGuard>
        <div className="flex min-h-0 min-w-0 flex-1 flex-col">{children}</div>
      </WorkspacePlanRouteGuard>
    </WorkspacePlanProvider>
  )
}
