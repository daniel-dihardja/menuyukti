import type { ReactNode } from "react";
import { SidebarInset } from "@workspace/ui/components/sidebar";
import { cn } from "@workspace/ui/lib/utils";
import { SidebarTriggerClient } from "@/components/sidebar-trigger-client";

type Breadcrumb = {
  label: string;
  href?: string;
};

type AnalyticsPageShellProps = {
  title: string;
  breadcrumbs: Breadcrumb[];
  children: ReactNode;
  mainClassName?: string;
  triggerWrapperClassName?: string;
  beforeContent?: ReactNode;
};

export function AnalyticsPageShell({
  title,
  breadcrumbs,
  children,
  mainClassName,
  triggerWrapperClassName,
  beforeContent,
}: AnalyticsPageShellProps) {
  return (
    <SidebarInset>
      {beforeContent}
      <div className="w-full">
        {triggerWrapperClassName ? (
          <div className={triggerWrapperClassName}>
            <SidebarTriggerClient title={title} breadcrumbs={breadcrumbs} />
          </div>
        ) : (
          <SidebarTriggerClient title={title} breadcrumbs={breadcrumbs} />
        )}

        <main className={cn("mx-auto max-w-6xl p-4 space-y-6", mainClassName)}>
          {children}
        </main>
      </div>
    </SidebarInset>
  );
}
