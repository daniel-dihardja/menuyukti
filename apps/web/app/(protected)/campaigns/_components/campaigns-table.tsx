'use client'

import Link from 'next/link'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@workspace/ui/components/table'
import { Button } from '@workspace/ui/components/button'
import { Card, CardContent, CardHeader, CardTitle } from '@workspace/ui/components/card'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@workspace/ui/components/dropdown-menu'
import { Skeleton } from '@workspace/ui/components/skeleton'
import { Eye, MoreHorizontal } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { routes } from '@/lib/routes'

export type CampaignRow = {
  id: string
  name: string
}

interface CampaignsTableProps {
  campaigns: CampaignRow[]
}

export function CampaignsTableSkeleton() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-5 w-56" />
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <div className="flex gap-4 border-b pb-2">
          <Skeleton className="h-4 w-8 shrink-0" />
          <Skeleton className="h-4 min-w-0 flex-1" />
          <Skeleton className="h-4 w-10 shrink-0" />
        </div>
        {Array.from({ length: 5 }, (_, i) => (
          <div className="flex gap-4" key={`skeleton-row-${i}`}>
            <Skeleton className="h-4 w-8 shrink-0" />
            <Skeleton className="h-4 min-w-0 flex-1" />
            <Skeleton className="h-4 w-10 shrink-0" />
          </div>
        ))}
      </CardContent>
    </Card>
  )
}

export function CampaignsTable({ campaigns }: CampaignsTableProps) {
  const t = useTranslations('analytics.campaigns')
  const tTable = useTranslations('analytics.campaigns.table')

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('sectionTitle')}</CardTitle>
      </CardHeader>
      <CardContent className="px-0">
        <div className="w-full overflow-x-auto">
          <Table className="w-full min-w-[20rem]">
            <TableHeader>
              <TableRow>
                <TableHead className="w-[60px]">{tTable('index')}</TableHead>
                <TableHead>{tTable('name')}</TableHead>
                <TableHead className="w-[80px] text-right">{tTable('action')}</TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {campaigns.map((row, index) => (
                <TableRow key={row.id}>
                  <TableCell className="tabular-nums text-muted-foreground">{index + 1}</TableCell>
                  <TableCell className="min-w-0 max-w-[min(100%,24rem)]">
                    <Link
                      className="block truncate font-medium text-foreground underline-offset-4 hover:underline"
                      href={routes.campaigns.detail(row.id)}
                      title={row.name}
                    >
                      {row.name}
                    </Link>
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          aria-label={tTable('actionsForRow', { name: row.name })}
                          size="icon-sm"
                          type="button"
                          variant="ghost"
                        >
                          <MoreHorizontal aria-hidden />
                        </Button>
                      </DropdownMenuTrigger>

                      <DropdownMenuContent align="end">
                        <DropdownMenuItem asChild>
                          <Link
                            className="flex items-center gap-2"
                            href={routes.campaigns.detail(row.id)}
                          >
                            <Eye aria-hidden />
                            {tTable('view')}
                          </Link>
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}
