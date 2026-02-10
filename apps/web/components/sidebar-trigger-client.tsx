"use client";

import Link from "next/link";
import { Fragment } from "react";
import { SidebarTrigger } from "@workspace/ui/components/sidebar";
import { Separator } from "@workspace/ui/components/separator";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@workspace/ui/components/breadcrumb";

interface SidebarTriggerClientProps {
  title: string;
  breadcrumbs?: Array<{ label: string; href?: string }>;
  showBreadcrumb?: boolean;
}

export function SidebarTriggerClient({
  title,
  breadcrumbs,
  showBreadcrumb,
}: SidebarTriggerClientProps) {
  const items = breadcrumbs ?? [];
  const shouldShowBreadcrumb = showBreadcrumb ?? items.length > 0;

  return (
    <div className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
      <SidebarTrigger className="-ml-1" />

      <Separator
        orientation="vertical"
        className="mr-2 data-[orientation=vertical]:h-4"
      />

      {shouldShowBreadcrumb && items.length > 0 ? (
        <Breadcrumb>
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
      ) : null}
    </div>
  );
}
