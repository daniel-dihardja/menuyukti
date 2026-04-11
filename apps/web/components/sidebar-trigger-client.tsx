'use client'

import { Show, UserButton } from '@clerk/nextjs'
import Link from 'next/link'
import { Fragment, useEffect, useState } from 'react'
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
import { routes } from '@/lib/routes'

interface SidebarTriggerClientProps {
  title: string
  breadcrumbs?: Array<{ label: string; href?: string }>
  showBreadcrumb?: boolean
}

export function SidebarTriggerClient({
  title: _title,
  breadcrumbs,
  showBreadcrumb,
}: SidebarTriggerClientProps) {
  void _title
  const [mounted, setMounted] = useState(false)
  useEffect(() => {
    setMounted(true)
  }, [])

  const items = breadcrumbs ?? []
  const shouldShowBreadcrumb = showBreadcrumb ?? items.length > 0
  const firstItem = items[0]
  const currentItem = items[items.length - 1]
  const middleItems = items.slice(1, -1)

  return (
    <div className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
      <SidebarTrigger aria-label="Toggle sidebar" className="-ml-1" />

      <Separator orientation="vertical" className="mr-2 data-[orientation=vertical]:h-4" />

      {shouldShowBreadcrumb && items.length > 0 ? (
        <>
          <Breadcrumb className="hidden md:block">
            <BreadcrumbList>
              {items.map((item, index) => (
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
                  {index < items.length - 1 ? <BreadcrumbSeparator /> : null}
                </Fragment>
              ))}
            </BreadcrumbList>
          </Breadcrumb>

          <Breadcrumb className="block md:hidden min-w-0">
            <BreadcrumbList className="flex-nowrap overflow-hidden">
              {firstItem && items.length > 1 ? (
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
                            aria-label="Open breadcrumb navigation"
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

              {currentItem ? (
                <BreadcrumbItem className="min-w-0">
                  <BreadcrumbPage className="max-w-[160px] truncate" title={currentItem.label}>
                    {currentItem.label}
                  </BreadcrumbPage>
                </BreadcrumbItem>
              ) : null}
            </BreadcrumbList>
          </Breadcrumb>
        </>
      ) : null}

      <div className="ml-auto flex shrink-0 items-center">
        <Show when="signed-in">
          <UserButton userProfileMode="navigation" userProfileUrl={routes.profileAccount} />
        </Show>
      </div>
    </div>
  )
}
