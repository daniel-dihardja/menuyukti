import { SidebarProvider } from "@workspace/ui/components/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { AnalyticsProvider } from "./analytics/analytics-provider";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SidebarProvider>
      <AppSidebar />
      <AnalyticsProvider>{children}</AnalyticsProvider>
    </SidebarProvider>
  );
}
