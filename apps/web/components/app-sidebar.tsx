"use client";

import * as React from "react";
import {
  Sidebar,
  SidebarHeader,
  SidebarContent,
} from "@workspace/ui/components/sidebar";
import { NavMain } from "./nav-main";
import { LayoutDashboard } from "lucide-react";
import Link from "next/link";

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader className="relative h-16 border-b">
        <Link
          href="/"
          className="
            absolute left-1 top-6 flex items-center gap-2 pl-3
          "
        >
          <LayoutDashboard className="w-4 h-4 text-muted-foreground" />
        </Link>
      </SidebarHeader>

      <SidebarContent>
        <NavMain />
      </SidebarContent>
    </Sidebar>
  );
}
