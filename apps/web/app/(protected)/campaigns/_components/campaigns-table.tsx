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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@workspace/ui/components/dropdown-menu'
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

export function CampaignsTable({ campaigns }: CampaignsTableProps) {
  const t = useTranslations('analytics.campaigns.table')

  return (
    <div className="border w-full">
      <Table className="w-full">
        <TableHeader>
          <TableRow>
            <TableHead className="w-[60px]">{t('index')}</TableHead>
            <TableHead>{t('name')}</TableHead>
            <TableHead className="w-[80px] text-right">{t('action')}</TableHead>
          </TableRow>
        </TableHeader>

        <TableBody>
          {campaigns.map((row, index) => (
            <TableRow key={row.id}>
              <TableCell>{index + 1}</TableCell>
              <TableCell>
                <span>{row.name}</span>
              </TableCell>
              <TableCell className="text-right">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>

                  <DropdownMenuContent align="end">
                    <DropdownMenuItem asChild>
                      <Link href={routes.campaigns.detail(row.id)} className="flex items-center gap-2">
                        <Eye className="h-4 w-4" />
                        {t('view')}
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
  )
}
