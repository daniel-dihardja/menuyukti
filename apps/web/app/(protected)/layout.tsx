import { SidebarInset, SidebarProvider } from '@workspace/ui/components/sidebar'
import { AppSidebar } from '@/components/app-sidebar'
import { ProtectedSkipLink } from '@/components/protected-skip-link'
import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { routes } from '@/lib/routes'
import { AnalyticsProvider } from './analytics/analytics-provider'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = await auth()
  if (!isAuthenticated) {
    redirect(routes.login)
  }

  return (
    <SidebarProvider className="h-svh min-h-0">
      <AppSidebar />
      <SidebarInset className="min-h-0 min-w-0 flex-1 overflow-hidden">
        <ProtectedSkipLink />
        <AnalyticsProvider>{children}</AnalyticsProvider>
      </SidebarInset>
    </SidebarProvider>
  )
}
