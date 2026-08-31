'use client'

import {
  BarChart3,
  CalendarDays,
  ChartColumn,
  ChevronRight,
  Contact,
  Image,
  LayoutDashboard,
  MapPin,
  Package,
  Sparkles,
  SquarePen,
  Store,
  Users,
} from 'lucide-react'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@workspace/ui/components/collapsible'
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from '@workspace/ui/components/sidebar'
import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { usePathname } from 'next/navigation'
import { useMenuyuktiRole } from '@/hooks/use-menuyukti-role'
import { isNavItemHiddenFromNonAdmin } from '@/lib/admin-only-features'
import { isNavKeyEnabled } from '@/lib/feature-flags'
import { isMenuyuktiAdmin } from '@/lib/menuyukti-role'
import { routes } from '@/lib/routes'
import type { ReactNode } from 'react'

type NavGroupId = 'overview' | 'create' | 'analytics' | 'operations' | 'account'

type NavItem = {
  key: string
  labelKey: string
  href?: string
  icon?: ReactNode
  children?: NavItem[]
  group: NavGroupId
}

const NAV_GROUP_ORDER: NavGroupId[] = [
  'overview',
  'create',
  'analytics',
  'operations',
  'account',
]

const NAV_GROUP_LABEL_KEYS: Record<NavGroupId, string> = {
  overview: 'groupOverview',
  create: 'groupCreate',
  analytics: 'groupAnalytics',
  operations: 'groupOperations',
  account: 'groupAccount',
}

/**
 * Sidebar order follows daily product flow:
 * overview → create/plan → measure → operations → account.
 * Chat leads create (default authenticated home is `/advisor`).
 */
const NAV_WORKSPACE: NavItem[] = [
  {
    key: 'dashboard',
    labelKey: 'dashboard',
    href: routes.dashboard,
    icon: <LayoutDashboard />,
    group: 'overview',
  },
  {
    key: 'chat',
    labelKey: 'chat',
    href: routes.agent,
    icon: <Sparkles />,
    group: 'create',
  },
  {
    key: 'posts',
    labelKey: 'posts',
    href: routes.igStudio,
    icon: <SquarePen />,
    group: 'create',
  },
  {
    key: 'media',
    labelKey: 'media',
    href: routes.media,
    icon: <Image />,
    group: 'create',
  },
  {
    key: 'calendar',
    labelKey: 'calendar',
    href: routes.calendar,
    icon: <CalendarDays />,
    group: 'create',
  },
  {
    key: 'reports',
    labelKey: 'reports',
    icon: <ChartColumn />,
    href: routes.analytics.sales,
    group: 'analytics',
  },
  {
    key: 'branches',
    labelKey: 'branches',
    href: routes.analytics.branches,
    icon: <MapPin />,
    group: 'analytics',
  },
  {
    key: 'crm',
    labelKey: 'crm',
    href: routes.crm,
    icon: <Contact />,
    group: 'operations',
    children: [
      {
        key: 'crmApps',
        labelKey: 'crmApps',
        href: routes.crmApps,
        group: 'operations',
      },
      {
        key: 'crmRegistrations',
        labelKey: 'crmRegistrations',
        href: routes.crmRegistrations,
        group: 'operations',
      },
    ],
  },
  {
    key: 'printShop',
    labelKey: 'printShop',
    href: routes.shop,
    icon: <Store />,
    group: 'operations',
  },
  {
    key: 'inventar',
    labelKey: 'inventar',
    href: routes.inventar,
    icon: <Package />,
    group: 'operations',
  },
  {
    key: 'team',
    labelKey: 'team',
    href: routes.profileTeam,
    icon: <Users />,
    group: 'account',
  },
  {
    key: 'usage',
    labelKey: 'usage',
    href: routes.usage,
    icon: <BarChart3 />,
    group: 'account',
  },
]

type NavMenuItemsProps = {
  items: NavItem[]
  t: ReturnType<typeof useTranslations<'sidebar'>>
  isActive: (url?: string) => boolean
}

function NavMenuItems({ items, t, isActive }: NavMenuItemsProps) {
  return items.map((item) => {
    const active = isActive(item.href) || item.children?.some((c) => isActive(c.href))

    if (item.children) {
      return (
        <Collapsible key={item.key} asChild defaultOpen={active} className="group/collapsible">
          <SidebarMenuItem>
            <SidebarMenuButton asChild tooltip={t(item.labelKey)} isActive={active}>
              <Link href={item.href!}>
                {item.icon}
                <span>{t(item.labelKey)}</span>
              </Link>
            </SidebarMenuButton>

            <CollapsibleTrigger asChild>
              <SidebarMenuAction
                aria-label={t('toggleSectionAria', { section: t(item.labelKey) })}
              >
                <ChevronRight className="transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
              </SidebarMenuAction>
            </CollapsibleTrigger>

            <CollapsibleContent>
              <SidebarMenuSub>
                {item.children.map((child) => (
                  <SidebarMenuSubItem key={child.key}>
                    <SidebarMenuSubButton asChild isActive={isActive(child.href)}>
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
          isActive={isActive(item.href)}
        >
          <Link href={item.href!}>
            {item.icon}
            <span>{t(item.labelKey)}</span>
          </Link>
        </SidebarMenuButton>
      </SidebarMenuItem>
    )
  })
}

/** Feature flag first, then admin-only role gate. */
function visibleNavItemsForRole(items: NavItem[], showAdminNav: boolean): NavItem[] {
  return items.filter(
    (item) => isNavKeyEnabled(item.key) && (!isNavItemHiddenFromNonAdmin(item.key) || showAdminNav),
  )
}

function groupVisibleItems(items: NavItem[]): Array<{ id: NavGroupId; items: NavItem[] }> {
  return NAV_GROUP_ORDER.flatMap((id) => {
    const groupItems = items.filter((item) => item.group === id)
    return groupItems.length > 0 ? [{ id, items: groupItems }] : []
  })
}

export function NavMain() {
  const t = useTranslations('sidebar')
  const pathname = usePathname()
  const { role, isLoaded } = useMenuyuktiRole()
  const showAdminNav = isLoaded && isMenuyuktiAdmin(role)

  const isActive = (url?: string) => {
    if (!url) return false
    if (url === routes.shop) {
      return pathname === routes.shop || pathname.startsWith(`${routes.shop}/`)
    }
    if (url === routes.crm) {
      return pathname === routes.crm || pathname.startsWith(`${routes.crm}/`)
    }
    return pathname.startsWith(url)
  }

  const visibleWorkspaceItems = visibleNavItemsForRole(NAV_WORKSPACE, showAdminNav)
  const groups = groupVisibleItems(visibleWorkspaceItems)

  return (
    <>
      {groups.map((group) => (
        <SidebarGroup key={group.id}>
          <SidebarGroupLabel>{t(NAV_GROUP_LABEL_KEYS[group.id])}</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <NavMenuItems items={group.items} t={t} isActive={isActive} />
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      ))}
    </>
  )
}
