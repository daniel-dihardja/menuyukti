"use client";

import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
} from "@workspace/ui/components/sidebar";
import { Leaf } from "lucide-react";
import Link from "next/link";
import * as React from "react";
import { NavMain } from "./nav-main";

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
          <Leaf className="w-4 h-4" />
        </Link>
      </SidebarHeader>

      <SidebarContent>
        <NavMain />
      </SidebarContent>
    </Sidebar>
  );
}
