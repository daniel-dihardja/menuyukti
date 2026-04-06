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
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@workspace/ui/components/dropdown-menu'
import { Eye, MoreHorizontal, Trash2 } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { routes } from '@/lib/routes'
import type { CampaignItem } from './campaigns-client'

interface CampaignsTableProps {
  campaigns: CampaignItem[]
  onDelete: (id: number) => void
  onCreateCampaign: () => void | Promise<void>
  isCreating?: boolean
}

function formatDateRange(startDate: string | null, endDate: string | null): string {
  if (!startDate && !endDate) return '—'
  if (startDate && endDate) return `${startDate} – ${endDate}`
  if (startDate) return `From ${startDate}`
  return `Until ${endDate}`
}

export function CampaignsTable({
  campaigns,
  onDelete,
  onCreateCampaign,
  isCreating = false,
}: CampaignsTableProps) {
  const t = useTranslations('analytics.campaigns')

  if (campaigns.length === 0) {
    return (
      <div className="border rounded-md p-8 text-left space-y-4">
        <h2 className="text-lg font-medium">{t('noCampaigns.title')}</h2>
        <p className="text-muted-foreground">{t('noCampaigns.description')}</p>
        <Button
          onClick={() => {
            void onCreateCampaign()
          }}
          disabled={isCreating}
        >
          {isCreating ? t('loading') : t('noCampaigns.cta')}
        </Button>
      </div>
    )
  }

  return (
    <div className="border w-full">
      <Table className="w-full">
        <TableHeader>
          <TableRow>
            <TableHead className="w-[60px]">{t('table.index')}</TableHead>
            <TableHead>{t('table.name')}</TableHead>
            <TableHead className="w-[120px]">{t('table.status')}</TableHead>
            <TableHead className="w-[220px]">{t('table.dates')}</TableHead>
            <TableHead className="text-right w-[80px]">{t('table.action')}</TableHead>
          </TableRow>
        </TableHeader>

        <TableBody>
          {campaigns.map((row, index) => (
            <TableRow
              key={row.id}
              className="[contain-intrinsic-size:0_3rem] [content-visibility:auto]"
            >
              <TableCell>{index + 1}</TableCell>
              <TableCell>
                <span>{row.name}</span>
              </TableCell>
              <TableCell>
                <span className="capitalize">{row.status}</span>
              </TableCell>
              <TableCell className="text-sm text-muted-foreground">
                {formatDateRange(row.startDate, row.endDate)}
              </TableCell>
              <TableCell className="text-right">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      aria-label={t('table.action')}
                      className="h-8 w-8"
                      size="icon"
                      type="button"
                      variant="ghost"
                    >
                      <MoreHorizontal aria-hidden className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>

                  <DropdownMenuContent align="end">
                    <DropdownMenuItem asChild>
                      <Link
                        href={routes.campaigns.detail(row.id)}
                        className="flex items-center gap-2"
                      >
                        <Eye className="h-4 w-4" />
                        {t('table.view')}
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      className="flex items-center gap-2 text-destructive focus:text-destructive"
                      onClick={() => onDelete(row.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                      {t('table.delete')}
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
