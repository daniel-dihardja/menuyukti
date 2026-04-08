import { SidebarProvider } from '@workspace/ui/components/sidebar'
import { AppSidebar } from '@/components/app-sidebar'
import { AnalyticsProvider } from './analytics/analytics-provider'
import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { routes } from '@/lib/routes'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = await auth()
  if (!isAuthenticated) {
    redirect(routes.login)
  }

  return (
    <SidebarProvider className="h-svh min-h-0">
      <AppSidebar />
      <AnalyticsProvider>{children}</AnalyticsProvider>
    </SidebarProvider>
  )
}
