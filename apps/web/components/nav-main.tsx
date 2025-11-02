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
import { usePathname } from "next/navigation";
import { routes } from "@/lib/routes";

export function NavMain() {
  const t = useTranslations("sidebar");
  const pathname = usePathname();

  const items = [
    { title: t("news"), url: routes.news, icon: Newspaper },
    { title: t("import"), url: routes.import, icon: BarChart3 },
    { title: t("docs"), url: routes.docs, icon: BookOpenText },
  ];

  return (
    <SidebarGroup>
      <SidebarGroupLabel className="text-xs uppercase text-muted-foreground tracking-wider">
        {t("groupLabel")}
      </SidebarGroupLabel>

      <SidebarMenu>
        {items.map((item) => {
          const isActive = pathname === item.url;

          return (
            <SidebarMenuItem key={item.title}>
              <SidebarMenuButton
                asChild
                tooltip={item.title}
                data-active={isActive}
                className={`text-sm transition-colors rounded-none ${
                  isActive
                    ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Link href={item.url} className="flex items-center">
                  <item.icon className="w-4 h-4" />
                  <span>{item.title}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          );
        })}
      </SidebarMenu>
    </SidebarGroup>
  );
}
