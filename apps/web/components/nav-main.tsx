"use client";

import { Newspaper, BarChart3, BookOpenText, ChevronRight } from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@workspace/ui/components/collapsible";
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "@workspace/ui/components/sidebar";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { usePathname } from "next/navigation";
import { routes } from "@/lib/routes";

export function NavMain() {
  const t = useTranslations("sidebar");
  const pathname = usePathname();

  const isActive = (url: string) => pathname.startsWith(url);

  return (
    <SidebarGroup>
      <SidebarGroupLabel className="text-xs uppercase text-muted-foreground tracking-wider">
        {t("groupLabel")}
      </SidebarGroupLabel>

      <SidebarMenu>
        {/* ---------- News ---------- */}
        <SidebarMenuItem>
          <SidebarMenuButton
            asChild
            tooltip={t("news")}
            data-active={isActive(routes.news)}
            className={`text-sm transition-colors rounded-none ${
              isActive(routes.news)
                ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Link href={routes.news} className="flex items-center gap-2">
              <Newspaper className="w-4 h-4" />
              <span>{t("news")}</span>
            </Link>
          </SidebarMenuButton>
        </SidebarMenuItem>

        {/* ---------- Analysis (Collapsible parent) ---------- */}
        <Collapsible
          asChild
          defaultOpen={
            isActive(routes.analytics.sales) || isActive(routes.analytics.cogs)
          }
          className="group/collapsible"
        >
          <SidebarMenuItem>
            <CollapsibleTrigger asChild>
              <SidebarMenuButton
                tooltip={t("analysis")}
                className={`flex items-center gap-2 ${
                  isActive(routes.analytics.sales) ||
                  isActive(routes.analytics.cogs)
                    ? "bg-sidebar-accent/60 text-sidebar-accent-foreground"
                    : ""
                }`}
              >
                <BarChart3 className="w-4 h-4" />
                <span>{t("analysis")}</span>
                <ChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
              </SidebarMenuButton>
            </CollapsibleTrigger>

            <CollapsibleContent>
              <SidebarMenuSub>
                {/* ---------- Sales ---------- */}
                <SidebarMenuSubItem>
                  <SidebarMenuSubButton
                    asChild
                    className={`transition-colors ${
                      isActive(routes.analytics.sales)
                        ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <Link href={routes.analytics.sales}>
                      <span>{t("sales")}</span>
                    </Link>
                  </SidebarMenuSubButton>
                </SidebarMenuSubItem>

                {/* ---------- COGS ---------- */}
                <SidebarMenuSubItem>
                  <SidebarMenuSubButton
                    asChild
                    className={`transition-colors ${
                      isActive(routes.analytics.cogs)
                        ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <Link href={routes.analytics.cogs}>
                      <span>{t("cogs")}</span>
                    </Link>
                  </SidebarMenuSubButton>
                </SidebarMenuSubItem>
              </SidebarMenuSub>
            </CollapsibleContent>
          </SidebarMenuItem>
        </Collapsible>

        {/* ---------- Docs ---------- */}
        <SidebarMenuItem>
          <SidebarMenuButton
            asChild
            tooltip={t("docs")}
            data-active={isActive(routes.docs)}
            className={`text-sm transition-colors rounded-none ${
              isActive(routes.docs)
                ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Link href={routes.docs} className="flex items-center gap-2">
              <BookOpenText className="w-4 h-4" />
              <span>{t("docs")}</span>
            </Link>
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
    </SidebarGroup>
  );
}
