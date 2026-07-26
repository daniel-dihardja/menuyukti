'use client'

import {
  BarChart3,
  CalendarDays,
  ChevronRight,
  FileUp,
  Image,
  LayoutDashboard,
  MapPin,
  Megaphone,
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
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarSeparator,
} from '@workspace/ui/components/sidebar'
import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { usePathname } from 'next/navigation'
import { useMenuyuktiRole } from '@/hooks/use-menuyukti-role'
import { isNavItemHiddenFromNonAdmin } from '@/lib/admin-only-features'
import { isNavKeyEnabled } from '@/lib/feature-flags'
import { isMenuyuktiAdmin } from '@/lib/menuyukti-role'
import { routes } from '@/lib/routes'
import { Fragment, type ReactNode } from 'react'

type NavItem = {
  key: string
  labelKey: string
  href?: string
  icon?: ReactNode
  children?: NavItem[]
  /**
   * Logical sidebar section. A divider is rendered between consecutive visible
   * items that belong to different groups (so disabled flags don’t leave
   * orphan single-item sections from hard-coded separators).
   * Optional for admin items that live in their own SidebarGroup.
   */
  group?: 'overview' | 'create' | 'analytics' | 'commerce' | 'account'
}

/**
 * Sidebar order follows daily product flow:
 * overview → create/plan → measure → commerce → account.
 * Chat leads create (default authenticated home is `/workflow`).
 */
const NAV_WORKSPACE: NavItem[] = [
  {
    key: 'dashboard',
    labelKey: 'dashboard',
    href: routes.dashboard,
    icon: <LayoutDashboard className="w-4 h-4" />,
    group: 'overview',
  },
  {
    key: 'workflows',
    labelKey: 'workflows',
    href: routes.workflows.list,
    icon: <Megaphone className="w-4 h-4" />,
    group: 'create',
  },
  {
    key: 'posts',
    labelKey: 'posts',
    href: routes.igStudio,
    icon: <SquarePen className="w-4 h-4" />,
    group: 'create',
  },
  {
    key: 'media',
    labelKey: 'media',
    href: routes.media,
    icon: <Image className="w-4 h-4" />,
    group: 'create',
  },
  {
    key: 'calendar',
    labelKey: 'calendar',
    href: routes.calendar,
    icon: <CalendarDays className="w-4 h-4" />,
    group: 'create',
  },
  {
    key: 'reports',
    labelKey: 'reports',
    icon: <FileUp className="w-4 h-4" />,
    href: routes.analytics.sales,
    group: 'analytics',
  },
  {
    key: 'branches',
    labelKey: 'branches',
    href: routes.analytics.branches,
    icon: <MapPin className="w-4 h-4" />,
    group: 'analytics',
  },
  {
    key: 'printShop',
    labelKey: 'printShop',
    href: routes.shop,
    icon: <Store className="w-4 h-4" />,
    group: 'commerce',
  },
  {
    key: 'team',
    labelKey: 'team',
    href: routes.profileTeam,
    icon: <Users className="w-4 h-4" />,
    group: 'account',
  },
]

/** Platform tools; visibility keys listed in `config/admin-only-features.json`. */
const NAV_ADMIN: NavItem[] = [
  {
    key: 'usage',
    labelKey: 'usage',
    href: routes.usage,
    icon: <BarChart3 className="w-4 h-4" />,
  },
]

type NavMenuItemsProps = {
  items: NavItem[]
  t: ReturnType<typeof useTranslations<'sidebar'>>
  isActive: (url?: string) => boolean
}

function NavMenuItems({ items, t, isActive }: NavMenuItemsProps) {
  return items.map((item, index) => {
    const active = isActive(item.href) || item.children?.some((c) => isActive(c.href))
    const prev = index > 0 ? items[index - 1] : null
    const showSeparator =
      prev != null && prev.group != null && item.group != null && prev.group !== item.group
    const separatorRow = showSeparator ? (
      <SidebarMenuItem key={`${item.key}__sep`} className="list-none p-0" aria-hidden>
        <SidebarSeparator className="my-1" />
      </SidebarMenuItem>
    ) : null

    if (item.children) {
      return (
        <Fragment key={item.key}>
          {separatorRow}
          <Collapsible asChild defaultOpen={active} className="group/collapsible">
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
        </Fragment>
      )
    }
    return (
      <Fragment key={item.key}>
        {separatorRow}
        <SidebarMenuItem>
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
      </Fragment>
    )
  })
}

/** Feature flag first, then admin-only role gate. */
function visibleNavItemsForRole(items: NavItem[], showAdminNav: boolean): NavItem[] {
  return items.filter(
    (item) => isNavKeyEnabled(item.key) && (!isNavItemHiddenFromNonAdmin(item.key) || showAdminNav),
  )
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
    return pathname.startsWith(url)
  }

  const visibleWorkspaceItems = visibleNavItemsForRole(NAV_WORKSPACE, showAdminNav)
  const visibleAdminItems = visibleNavItemsForRole(NAV_ADMIN, showAdminNav)

  return (
    <>
      <SidebarGroup>
        <SidebarMenu>
          <NavMenuItems items={visibleWorkspaceItems} t={t} isActive={isActive} />
        </SidebarMenu>
      </SidebarGroup>

      {visibleAdminItems.length > 0 ? (
        <>
          <SidebarSeparator />
          <SidebarGroup>
            <SidebarMenu>
              <NavMenuItems items={visibleAdminItems} t={t} isActive={isActive} />
            </SidebarMenu>
          </SidebarGroup>
        </>
      ) : null}
    </>
  )
}
