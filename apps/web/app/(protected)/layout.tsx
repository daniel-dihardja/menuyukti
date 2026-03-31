import { SidebarProvider } from "@workspace/ui/components/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { AnalyticsProvider } from "./analytics/analytics-provider";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { routes } from "@/lib/routes";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { userId } = await auth();
  if (!userId) {
    redirect(routes.login);
  }

  return (
    <SidebarProvider>
      <AppSidebar />
      <AnalyticsProvider>{children}</AnalyticsProvider>
    </SidebarProvider>
  );
}
