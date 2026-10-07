import { SidebarInset, SidebarProvider } from '@workspace/ui/components/sidebar'
import { AppSidebar } from '@/components/app-sidebar'
import { ProtectedSkipLink } from '@/components/protected-skip-link'
import { WorkspacePlanProvider } from '@/components/workspace-plan-provider'
import { WorkspacePlanRouteGuard } from '@/components/workspace-plan-route-guard'
import { auth } from '@clerk/nextjs/server'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { routes } from '@/lib/routes'
import { enforceWorkspacePlanRoute } from '@/lib/workspace-plan-route'
import { getWorkspacePlanForUser } from '@/lib/workspace-plan-server'
import { AnalyticsProvider } from './analytics/analytics-provider'

/** Auth + workspace-plan GraphQL gate; layout is allowed to block navigations. */
export const instant = false

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = await auth()
  if (!isAuthenticated) {
    redirect(routes.login)
  }

  // cookies() is independent of the plan GraphQL gate — start both together.
  const cookieStorePromise = cookies()
  await enforceWorkspacePlanRoute()
  const [{ plan, workspaceId }, cookieStore] = await Promise.all([
    getWorkspacePlanForUser(),
    cookieStorePromise,
  ])
  const defaultOpen = cookieStore.get('sidebar_state')?.value !== 'false'

  return (
    <WorkspacePlanProvider plan={plan} workspaceId={workspaceId}>
      <SidebarProvider defaultOpen={defaultOpen} className="h-svh min-h-0">
        <AppSidebar />
        <SidebarInset className="min-h-0 min-w-0 flex-1 overflow-hidden">
          <ProtectedSkipLink />
          <WorkspacePlanRouteGuard>
            <AnalyticsProvider>{children}</AnalyticsProvider>
          </WorkspacePlanRouteGuard>
        </SidebarInset>
      </SidebarProvider>
    </WorkspacePlanProvider>
  )
}
