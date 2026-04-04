'use client'

import { ChevronRight, FileUp, Images, MapPin, Megaphone } from 'lucide-react'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@workspace/ui/components/collapsible'
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from '@workspace/ui/components/sidebar'
import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { usePathname } from 'next/navigation'
import { routes } from '@/lib/routes'
import type { ReactNode } from 'react'

type NavItem = {
  key: string
  labelKey: string
  href?: string
  icon?: ReactNode
  children?: NavItem[]
}

const NAV_ITEMS: NavItem[] = [
  // {
  //   key: "news",
  //   labelKey: "news",
  //   href: routes.news,
  //   icon: <Newspaper className="w-4 h-4" />,
  // },
  {
    key: 'campaigns',
    labelKey: 'campaigns',
    href: routes.campaigns.list,
    icon: <Megaphone className="w-4 h-4" />,
  },
  {
    key: 'assets',
    labelKey: 'assets',
    href: routes.assets,
    icon: <Images className="w-4 h-4" />,
  },
  {
    key: 'reports',
    labelKey: 'reports',
    icon: <FileUp className="w-4 h-4" />,
    href: routes.analytics.sales,
  },
  {
    key: 'branches',
    labelKey: 'branches',
    href: routes.analytics.branches,
    icon: <MapPin className="w-4 h-4" />,
  },
  // {
  //   key: "sales_children",
  //   children: [
  //     { key: "sales", labelKey: "sales", href: routes.analytics.sales },
  //     { key: "cogs", labelKey: "cogs", href: routes.analytics.cogs },
  //   ],
  // },
  // {
  //   key: "docs",
  //   labelKey: "docs",
  //   href: routes.docs,
  //   icon: <BookOpenText className="w-4 h-4" />,
  // },
  // {
  //   key: "agents",
  //   labelKey: "agents",
  //   href: routes.agents.list,
  //   icon: <Bot className="w-4 h-4" />,
  // },
]

export function NavMain() {
  const t = useTranslations('sidebar')
  const pathname = usePathname()

  const isActive = (url?: string) => (url ? pathname.startsWith(url) : false)

  return (
    <SidebarGroup>
      <SidebarGroupLabel className="text-xs uppercase text-muted-foreground tracking-wider">
        {t('groupLabel')}
      </SidebarGroupLabel>

      <SidebarMenu>
        {NAV_ITEMS.map((item) => {
          const active = isActive(item.href) || item.children?.some((c) => isActive(c.href))

          if (item.children) {
            return (
              <Collapsible
                key={item.key}
                asChild
                defaultOpen={active}
                className="group/collapsible"
              >
                <SidebarMenuItem>
                  <div className="flex items-center">
                    <SidebarMenuButton
                      asChild
                      tooltip={t(item.labelKey)}
                      className={`flex items-center gap-2 flex-1 ${
                        active
                          ? 'bg-sidebar-accent/60 text-sidebar-accent-foreground'
                          : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      <Link href={item.href!} className="flex items-center gap-2 w-full">
                        {item.icon}
                        <span>{t(item.labelKey)}</span>
                      </Link>
                    </SidebarMenuButton>

                    <CollapsibleTrigger asChild>
                      <button
                        type="button"
                        className="px-2 text-muted-foreground hover:text-foreground"
                        aria-label={`Toggle ${item.key}`}
                      >
                        <ChevronRight className="transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                      </button>
                    </CollapsibleTrigger>
                  </div>

                  <CollapsibleContent>
                    <SidebarMenuSub>
                      {item.children.map((child) => (
                        <SidebarMenuSubItem key={child.key}>
                          <SidebarMenuSubButton
                            asChild
                            className={`transition-colors ${
                              isActive(child.href)
                                ? 'bg-sidebar-accent text-sidebar-accent-foreground font-medium'
                                : 'text-muted-foreground hover:text-foreground'
                            }`}
                          >
                            <Link href={child.href!}>
                              <span>{t(child.labelKey)}</span>
                            </Link>
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                      ))}
                    </SidebarMenuSub>
                  </CollapsibleContent>
                </SidebarMenuItem>
              </Collapsible>
            )
          }
          return (
            <SidebarMenuItem key={item.key}>
              <SidebarMenuButton
                asChild
                tooltip={t(item.labelKey)}
                data-active={isActive(item.href)}
                className={`text-sm transition-colors rounded-none ${
                  isActive(item.href)
                    ? 'bg-sidebar-accent text-sidebar-accent-foreground font-medium'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <Link href={item.href!} className="flex items-center gap-2">
                  {item.icon}
                  <span>{t(item.labelKey)}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          )
        })}
      </SidebarMenu>
    </SidebarGroup>
  )
}
