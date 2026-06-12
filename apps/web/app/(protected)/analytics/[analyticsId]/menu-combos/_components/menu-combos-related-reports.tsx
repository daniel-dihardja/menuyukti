'use client'

import { ChevronDown, Radio } from 'lucide-react'
import Link from 'next/link'
import { useTranslations } from 'next-intl'

import { routes } from '@/lib/routes'
import { Button } from '@workspace/ui/components/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@workspace/ui/components/dropdown-menu'

type MenuCombosRelatedReportsProps = {
  analyticsId: number
  matrixAvailable: boolean
}

export function MenuCombosRelatedReports({
  analyticsId,
  matrixAvailable,
}: MenuCombosRelatedReportsProps) {
  const t = useTranslations('analytics.menuCombos')

  return (
    <>
      <div className="hidden flex-wrap gap-2 md:flex">
        <Button asChild variant="outline" size="sm">
          <Link href={routes.analytics.matrix(analyticsId)}>{t('linkToMatrix')}</Link>
        </Button>
        <Button asChild variant="outline" size="sm">
          <Link href={routes.analytics.campaignSignals(analyticsId)}>
            <Radio aria-hidden data-icon="inline-start" />
            {t('linkToCampaignSignals')}
          </Link>
        </Button>
        {!matrixAvailable ? (
          <Button asChild variant="outline" size="sm">
            <Link href={routes.analytics.cogs(analyticsId)}>{t('linkToCogs')}</Link>
          </Button>
        ) : null}
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="w-full md:hidden">
            {t('relatedReports.trigger')}
            <ChevronDown aria-hidden data-icon="inline-end" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-[var(--radix-dropdown-menu-trigger-width)]">
          <DropdownMenuItem asChild>
            <Link href={routes.analytics.matrix(analyticsId)}>{t('linkToMatrix')}</Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link href={routes.analytics.campaignSignals(analyticsId)}>
              {t('linkToCampaignSignals')}
            </Link>
          </DropdownMenuItem>
          {!matrixAvailable ? (
            <DropdownMenuItem asChild>
              <Link href={routes.analytics.cogs(analyticsId)}>{t('linkToCogs')}</Link>
            </DropdownMenuItem>
          ) : null}
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  )
}
