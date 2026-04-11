'use client'

import {
  ChevronRight,
  FileUp,
  LayoutDashboard,
  MapPin,
  Megaphone,
  Package,
  Shield,
  Sparkles,
  User,
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
import { isMenuyuktiAdmin } from '@/lib/menuyukti-role'
import { routes } from '@/lib/routes'
import type { ReactNode } from 'react'

type NavItem = {
  key: string
  labelKey: string
  href?: string
  icon?: ReactNode
  children?: NavItem[]
  /** If true, only users with platform role `admin` see this item. */
  adminOnly?: boolean
}

/** Day-to-day marketing work: overview, campaigns, performance, locations. */
const NAV_WORKSPACE: NavItem[] = [
  {
    key: 'dashboard',
    labelKey: 'dashboard',
    href: routes.dashboard,
    icon: <LayoutDashboard className="w-4 h-4" />,
  },
  {
    key: 'workflows',
    labelKey: 'workflows',
    href: routes.workflows.list,
    icon: <Megaphone className="w-4 h-4" />,
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
]

const NAV_ACCOUNT: NavItem[] = [
  {
    key: 'profil',
    labelKey: 'profil',
    href: routes.profile,
    icon: <User className="w-4 h-4" />,
  },
]

/** Platform tools; gated by `showAdminNav` at render time. */
const NAV_ADMIN: NavItem[] = [
  {
    key: 'studio',
    labelKey: 'studio',
    href: routes.studio,
    icon: <Sparkles className="w-4 h-4" />,
    adminOnly: true,
  },
  {
    key: 'printOrders',
    labelKey: 'printOrders',
    href: routes.printOrders,
    icon: <Package className="w-4 h-4" />,
    adminOnly: true,
  },
  {
    key: 'staff',
    labelKey: 'staffTools',
    href: routes.staff,
    icon: <Shield className="w-4 h-4" />,
    adminOnly: true,
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
  })
}

export function NavMain() {
  const t = useTranslations('sidebar')
  const pathname = usePathname()
  const { role, isLoaded } = useMenuyuktiRole()
  const showAdminNav = isLoaded && isMenuyuktiAdmin(role)

  const isActive = (url?: string) => (url ? pathname.startsWith(url) : false)

  const visibleAdminItems = NAV_ADMIN.filter((item) => !item.adminOnly || showAdminNav)

  return (
    <>
      <SidebarGroup>
        <SidebarMenu>
          <NavMenuItems items={NAV_WORKSPACE} t={t} isActive={isActive} />
        </SidebarMenu>
      </SidebarGroup>

      <SidebarSeparator />

      <SidebarGroup>
        <SidebarMenu>
          <NavMenuItems items={NAV_ACCOUNT} t={t} isActive={isActive} />
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
