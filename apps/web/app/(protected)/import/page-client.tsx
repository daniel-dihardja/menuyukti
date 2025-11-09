"use client";

import { SidebarTrigger } from "@workspace/ui/components/sidebar";
import { Separator } from "@workspace/ui/components/separator";

interface PageClientProps {
  title: string;
}

export default function PageClient({ title }: PageClientProps) {
  return (
    <div className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
      {/* Sidebar trigger (interactive) */}
      <SidebarTrigger className="-ml-1" />

      {/* Visual divider */}
      <Separator
        orientation="vertical"
        className="mr-2 data-[orientation=vertical]:h-4"
      />

      {/* Page title */}
      <h1 className="text-lg font-semibold">{title}</h1>
    </div>
  );
}
