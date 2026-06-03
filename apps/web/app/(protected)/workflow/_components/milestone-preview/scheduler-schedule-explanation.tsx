'use client'

import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { useTranslations } from 'next-intl'

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@workspace/ui/components/collapsible'
import { cn } from '@workspace/ui/lib/utils'

import {
  scheduleExplanationPreviewSnippet,
  scheduleExplanationUsesDisclosure,
  shouldShowScheduleExplanation,
} from '@/lib/milestones/scheduler-schedule-explanation'

import { milestonePreviewTypography as mp } from './milestone-preview-typography'

export type SchedulerScheduleExplanationProps = {
  scheduleExplanation: string
}

export function SchedulerScheduleExplanation({
  scheduleExplanation,
}: SchedulerScheduleExplanationProps) {
  const t = useTranslations('analytics.workflows.chat')
  const text = scheduleExplanation.trim()

  if (!shouldShowScheduleExplanation(text)) {
    return null
  }

  const usesDisclosure = scheduleExplanationUsesDisclosure(text)
  const previewSnippet = usesDisclosure ? scheduleExplanationPreviewSnippet(text) : null
  const [open, setOpen] = useState(false)

  if (!usesDisclosure) {
    return (
      <section className="mt-4 shrink-0 border-t border-border/80 pt-4">
        <p className={mp.sectionTitle}>{t('milestoneSchedulerPreviewScheduleExplanation')}</p>
        <p className={`${mp.body} mt-2`}>{text}</p>
      </section>
    )
  }

  return (
    <Collapsible
      open={open}
      onOpenChange={setOpen}
      className="mt-4 shrink-0 border-t border-border/80 pt-4"
    >
      <CollapsibleTrigger
        type="button"
        className={cn(
          'flex w-full min-w-0 items-start gap-2 rounded-md text-left',
          'hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        )}
        aria-label={
          open
            ? t('milestoneSchedulerPreviewScheduleExplanationCollapse')
            : t('milestoneSchedulerPreviewScheduleExplanationExpand')
        }
      >
        <ChevronDown
          aria-hidden
          className={cn(
            'mt-0.5 size-4 shrink-0 text-muted-foreground transition-transform',
            open && 'rotate-180',
          )}
        />
        <span className="min-w-0 flex-1">
          <span className={mp.sectionTitle}>
            {t('milestoneSchedulerPreviewScheduleExplanation')}
          </span>
          {!open && previewSnippet ? (
            <span className={`${mp.bodySmall} mt-1 block line-clamp-2`}>{previewSnippet}</span>
          ) : !open ? (
            <span className={`${mp.bodySmall} mt-1 block`}>
              {t('milestoneSchedulerPreviewScheduleExplanationExpand')}
            </span>
          ) : null}
        </span>
      </CollapsibleTrigger>
      <CollapsibleContent className="pt-2 pl-6">
        <p className={mp.body}>{text}</p>
      </CollapsibleContent>
    </Collapsible>
  )
}
