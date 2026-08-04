'use client'

import { Show } from '@clerk/nextjs'
import Link from 'next/link'
import { Fragment, useEffect, useState, type ReactNode } from 'react'
import { useTranslations } from 'next-intl'
import { SidebarTrigger } from '@workspace/ui/components/sidebar'
import { Separator } from '@workspace/ui/components/separator'
import {
  Breadcrumb,
  BreadcrumbEllipsis,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@workspace/ui/components/breadcrumb'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@workspace/ui/components/dropdown-menu'
import { Button, buttonVariants } from '@workspace/ui/components/button'
import { cn } from '@workspace/ui/lib/utils'

import { AccountMenu } from '@/components/account/account-menu'

interface SidebarTriggerClientProps {
  title: string
  breadcrumbs?: Array<{ label: string; href?: string }>
  showBreadcrumb?: boolean
  /** When set, renders as the current (last) crumb; `breadcrumbs` are ancestors only. */
  breadcrumbCurrent?: ReactNode
}

export function SidebarTriggerClient({
  title: _title,
  breadcrumbs,
  showBreadcrumb,
  breadcrumbCurrent,
}: SidebarTriggerClientProps) {
  void _title
  const t = useTranslations('appShell')
  const [mounted, setMounted] = useState(false)
  useEffect(() => {
    setMounted(true)
  }, [])

  const items = breadcrumbs ?? []
  const hasCurrentSlot = breadcrumbCurrent != null
  const ancestorItems = hasCurrentSlot ? items : items.slice(0, -1)
  const labelCurrent = hasCurrentSlot ? null : (items[items.length - 1] ?? null)
  const firstItem = hasCurrentSlot ? items[0] : items[0]
  const middleItems = hasCurrentSlot ? items.slice(1) : items.slice(1, -1)
  const hasTrail = items.length > 0 || hasCurrentSlot
  const shouldShowBreadcrumb = showBreadcrumb ?? hasTrail
  const showMobileFirst =
    firstItem != null && (hasCurrentSlot ? items.length >= 1 : items.length > 1)

  return (
    <div className="flex h-16 w-full min-w-0 shrink-0 items-center gap-2 border-b px-4">
      <SidebarTrigger aria-label={t('toggleSidebarAria')} className="-ml-1 shrink-0" />

      <Separator orientation="vertical" className="mr-2 shrink-0 data-[orientation=vertical]:h-4" />

      {shouldShowBreadcrumb && hasTrail ? (
        <div className="flex min-w-0 flex-1 items-center">
          <Breadcrumb className="hidden min-w-0 lg:block">
            <BreadcrumbList>
              {ancestorItems.map((item, index) => (
                <Fragment key={`${item.label}-${index}`}>
                  <BreadcrumbItem>
                    {item.href ? (
                      <BreadcrumbLink asChild>
                        <Link href={item.href}>{item.label}</Link>
                      </BreadcrumbLink>
                    ) : (
                      <BreadcrumbPage>{item.label}</BreadcrumbPage>
                    )}
                  </BreadcrumbItem>
                  <BreadcrumbSeparator />
                </Fragment>
              ))}
              <BreadcrumbItem className="min-w-0">
                {hasCurrentSlot ? (
                  breadcrumbCurrent
                ) : labelCurrent ? (
                  labelCurrent.href ? (
                    <BreadcrumbLink asChild>
                      <Link href={labelCurrent.href}>{labelCurrent.label}</Link>
                    </BreadcrumbLink>
                  ) : (
                    <BreadcrumbPage>{labelCurrent.label}</BreadcrumbPage>
                  )
                ) : null}
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>

          <Breadcrumb className="block lg:hidden min-w-0">
            <BreadcrumbList className="flex-nowrap overflow-hidden">
              {showMobileFirst && firstItem ? (
                <>
                  <BreadcrumbItem className="min-w-0">
                    {firstItem.href ? (
                      <BreadcrumbLink asChild className="max-w-[96px] truncate">
                        <Link href={firstItem.href} title={firstItem.label}>
                          {firstItem.label}
                        </Link>
                      </BreadcrumbLink>
                    ) : (
                      <BreadcrumbPage className="max-w-[96px] truncate" title={firstItem.label}>
                        {firstItem.label}
                      </BreadcrumbPage>
                    )}
                  </BreadcrumbItem>
                  <BreadcrumbSeparator />
                </>
              ) : null}

              {middleItems.length > 0 ? (
                <>
                  <BreadcrumbItem>
                    {mounted ? (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-sm"
                            aria-label={t('openBreadcrumbNavAria')}
                          >
                            <BreadcrumbEllipsis className="size-7" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start">
                          {middleItems.map((item, index) =>
                            item.href ? (
                              <DropdownMenuItem key={`${item.label}-${index}`} asChild>
                                <Link href={item.href}>{item.label}</Link>
                              </DropdownMenuItem>
                            ) : (
                              <DropdownMenuItem key={`${item.label}-${index}`} disabled>
                                {item.label}
                              </DropdownMenuItem>
                            ),
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    ) : (
                      <span
                        className={cn(buttonVariants({ variant: 'ghost', size: 'icon-sm' }))}
                        aria-hidden
                      >
                        <BreadcrumbEllipsis className="size-7" />
                      </span>
                    )}
                  </BreadcrumbItem>
                  <BreadcrumbSeparator />
                </>
              ) : null}

              {hasCurrentSlot ? (
                <BreadcrumbItem className="min-w-0">{breadcrumbCurrent}</BreadcrumbItem>
              ) : labelCurrent ? (
                <BreadcrumbItem className="min-w-0">
                  <BreadcrumbPage className="max-w-[160px] truncate" title={labelCurrent.label}>
                    {labelCurrent.label}
                  </BreadcrumbPage>
                </BreadcrumbItem>
              ) : null}
            </BreadcrumbList>
          </Breadcrumb>
        </div>
      ) : (
        <div className="min-w-0 flex-1" />
      )}

      <div className="ms-auto flex shrink-0 items-center ps-2">
        <Show when="signed-in">
          <AccountMenu />
        </Show>
      </div>
    </div>
  )
}
