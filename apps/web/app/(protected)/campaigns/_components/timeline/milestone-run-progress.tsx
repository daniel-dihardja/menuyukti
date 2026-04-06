'use client'

import { useTranslations } from 'next-intl'
import { Check, Circle } from 'lucide-react'

import { Spinner } from '@workspace/ui/components/spinner'
import { cn } from '@workspace/ui/lib/utils'

/** Agent graph step keys emitted over SSE (order matches the evaluation pipeline). */
export const MILESTONE_RUN_STEP_KEYS = [
  'fetch_context',
  'evaluate_criterion',
  'update_criteria',
  'synthesize',
  'store_result',
] as const

export function milestoneRunStepIndex(step: string | null): number {
  if (!step) {
    return 0
  }
  const i = (MILESTONE_RUN_STEP_KEYS as readonly string[]).indexOf(step)
  return i === -1 ? 0 : i
}

export function MilestoneRunProgressStrip({ runningStep }: { runningStep: string | null }) {
  const t = useTranslations('analytics.campaigns.milestoneRun')
  const labels = [
    t('stepFetchContext'),
    t('stepEvaluateCriteria'),
    t('stepUpdateCriteria'),
    t('stepSynthesize'),
    t('stepStoreResult'),
  ]
  const currentIdx = milestoneRunStepIndex(runningStep)

  return (
    <div
      aria-live="polite"
      className="border-border/60 border-b bg-muted/30 px-6 py-3"
      role="status"
    >
      <p className="mb-2 font-medium text-foreground text-xs">{t('runningLabel')}</p>
      <ol className="flex flex-wrap items-center gap-x-1 gap-y-2 text-muted-foreground text-xs">
        {labels.map((label, j) => {
          const done = j < currentIdx
          const active = j === currentIdx
          return (
            <li className="flex min-w-0 items-center gap-1" key={MILESTONE_RUN_STEP_KEYS[j]}>
              {j > 0 ? (
                <span aria-hidden className="px-0.5 text-muted-foreground/50">
                  →
                </span>
              ) : null}
              <span
                className={cn(
                  'flex min-w-0 items-center gap-1.5 rounded-md px-1 py-0.5',
                  active && 'bg-background/80 font-medium text-foreground shadow-sm',
                  done && 'text-foreground/90',
                )}
              >
                {done ? (
                  <Check aria-hidden className="size-3.5 shrink-0 text-primary" />
                ) : active ? (
                  <Spinner className="size-3.5 shrink-0" />
                ) : (
                  <Circle aria-hidden className="size-3.5 shrink-0 opacity-60" />
                )}
                <span className="min-w-0 leading-tight">{label}</span>
              </span>
            </li>
          )
        })}
      </ol>
    </div>
  )
}
