'use client'

import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { Megaphone } from 'lucide-react'

import { routes } from '@/lib/routes'
import { Button } from '@workspace/ui/components/button'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@workspace/ui/components/tooltip'

export type CreateWorkflowFromReportButtonProps = {
  analyticsId: number
}

export function CreateWorkflowFromReportButton({
  analyticsId,
}: CreateWorkflowFromReportButtonProps) {
  const t = useTranslations('analytics.shared')
  const href = `${routes.workflows.list}?fromAnalytics=${String(analyticsId)}`

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button asChild variant="secondary">
            <Link className="inline-flex items-center gap-2" href={href}>
              <Megaphone aria-hidden data-icon="inline-start" />
              {t('createWorkflowFromReport')}
            </Link>
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>{t('createWorkflowFromReportHint')}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
