"use client";

import { Newspaper, BarChart3, BookOpenText } from "lucide-react";
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@workspace/ui/components/sidebar";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { routes } from "@/lib/routes";

export function NavMain() {
  const t = useTranslations("sidebar");
  const items = [
    { title: t("news"), url: routes.news, icon: Newspaper },
    { title: t("import"), url: routes.import, icon: BarChart3 },
    {
      title: t("docs"),
      url: routes.docs,
      icon: BookOpenText,
    },
  ];

  return (
    <SidebarGroup>
      <SidebarGroupLabel className="text-xs uppercase text-muted-foreground tracking-wider">
        {t("groupLabel")}
      </SidebarGroupLabel>
      <SidebarMenu>
        {items.map((item) => (
          <SidebarMenuItem key={item.title}>
            <SidebarMenuButton asChild tooltip={item.title} className="text-sm">
              <Link href={item.url} className="flex items-center gap-2">
                <item.icon className="w-4 h-4" />
                <span>{item.title}</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        ))}
      </SidebarMenu>
    </SidebarGroup>
  );
}
