'use client'

import { useTranslations } from 'next-intl'
import { Check, Circle, X } from 'lucide-react'

import { Spinner } from '@workspace/ui/components/spinner'
import { cn } from '@workspace/ui/lib/utils'

import {
  buildCampaignBriefPipelineStages,
  campaignBriefPipelineStageLabel,
  campaignBriefRunStepLabel,
  isCampaignBriefCreateStep,
  isCampaignBriefGenerationStep,
} from '@/lib/milestones/campaign-brief-run-progress'
import { DEFAULT_CAMPAIGN_BRIEF_REFLECTION } from '@/lib/milestones/campaign-brief-input'
import {
  reflectionRoundSummary,
  type CampaignBriefReflectionRound,
} from '@/lib/milestones/campaign-brief-reflection-run'
import type { PassCriteriaRow } from './types'

/** Agent graph step keys emitted over SSE (order matches the evaluation pipeline). */
export const MILESTONE_RUN_STEP_KEYS = [
  'fetch_context',
  'evaluate_criterion',
  'update_criteria',
  'synthesize',
  'store_result',
] as const

export type MilestoneRunStepKey = (typeof MILESTONE_RUN_STEP_KEYS)[number]

export function milestoneRunStepKeys(): readonly MilestoneRunStepKey[] {
  return MILESTONE_RUN_STEP_KEYS
}

export function milestoneRunStepIndex(step: string | null): number {
  if (!step) {
    return 0
  }
  const i = MILESTONE_RUN_STEP_KEYS.indexOf(step as MilestoneRunStepKey)
  return i === -1 ? 0 : i
}

type MilestoneRunProgressStripProps = {
  runningStep: string | null
  runningStepIteration?: number | null
  presetId?: string | null
  reflectionEnabled?: boolean
  reflectionMaxRevisions?: number
  reflectionRounds?: CampaignBriefReflectionRound[]
  reflectionAddressing?: Array<{ criterionId: string; feedback: string }>
  passCriteria?: PassCriteriaRow[]
}

function criterionShortLabel(criterionId: string, passCriteria: PassCriteriaRow[]): string {
  const row = passCriteria.find((item) => item.id === criterionId)
  if (!row?.requirement.trim()) {
    return criterionId
  }
  return row.requirement
    .replace(/\*\*/g, '')
    .replace(/\[(.*?)\]\(.*?\)/g, '$1')
    .split('\n')[0]
    .trim()
    .slice(0, 140)
}

function CampaignBriefPipelineStrip({
  runningStep,
  runningStepIteration,
  reflectionEnabled,
  reflectionRounds,
}: {
  runningStep: string | null
  runningStepIteration?: number | null
  reflectionEnabled: boolean
  reflectionRounds: CampaignBriefReflectionRound[]
}) {
  const t = useTranslations('analytics.workflows.milestoneRun')
  const stages = buildCampaignBriefPipelineStages(
    runningStep,
    runningStepIteration,
    reflectionEnabled,
    reflectionRounds,
  )
  const stageLabels = {
    create: t('campaignBriefPipelineCreate'),
    review: t('campaignBriefPipelineReview'),
    reviewAgain: t('campaignBriefPipelineReviewAgain'),
    edit: t('campaignBriefPipelineEdit'),
    save: t('campaignBriefPipelineSave'),
  }

  return (
    <ol className="flex flex-wrap items-center gap-x-1 gap-y-2 text-muted-foreground text-xs">
      {stages.map((stage, index) => {
        const active = stage.status === 'active'
        const done = stage.status === 'done'
        return (
          <li className="flex min-w-0 items-center gap-1" key={stage.id}>
            {index > 0 ? (
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
              <span className="min-w-0 leading-tight">
                {campaignBriefPipelineStageLabel(stage, stageLabels)}
              </span>
            </span>
          </li>
        )
      })}
    </ol>
  )
}

function CampaignBriefReflectionLog({
  reflectionRounds,
  reflectionMaxRevisions,
  passCriteria,
}: {
  reflectionRounds: CampaignBriefReflectionRound[]
  reflectionMaxRevisions: number
  passCriteria: PassCriteriaRow[]
}) {
  const t = useTranslations('analytics.workflows.milestoneRun')

  if (reflectionRounds.length === 0) {
    return null
  }

  return (
    <div className="mt-3 space-y-3 border-border/70 border-t pt-3">
      <p className="font-medium text-foreground text-xs">{t('campaignBriefReflectionFeedTitle')}</p>
      {reflectionRounds.map((round) => {
        const { passCount, failCount, total } = reflectionRoundSummary(round)
        return (
          <div className="space-y-2" key={`reflect-round-${round.iteration}`}>
            <p className="text-muted-foreground text-xs">
              {t('campaignBriefReflectionRoundHeading', {
                pass: round.iteration,
                max: reflectionMaxRevisions,
              })}
              {' · '}
              {failCount === 0
                ? t('campaignBriefReflectionRoundAllPass', { total })
                : t('campaignBriefReflectionRoundSummary', { passCount, failCount, total })}
            </p>
            <ul className="space-y-1.5">
              {round.critiques.map((critique) => (
                <li
                  className="flex items-start gap-2 text-xs"
                  key={`${round.iteration}-${critique.criterionId}`}
                >
                  {critique.qualityPass ? (
                    <Check aria-hidden className="mt-0.5 size-3.5 shrink-0 text-primary" />
                  ) : (
                    <X aria-hidden className="mt-0.5 size-3.5 shrink-0 text-destructive" />
                  )}
                  <div className="min-w-0">
                    <p className="font-medium text-foreground">
                      {criterionShortLabel(critique.criterionId, passCriteria)}
                    </p>
                    {critique.feedback ? (
                      <p className="text-muted-foreground">{critique.feedback}</p>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )
      })}
    </div>
  )
}

function MilestoneEvalProgressStrip({
  runningStep,
  runningLabelKey,
}: {
  runningStep: string | null
  runningLabelKey: 'runningLabel' | 'campaignBriefEvalRunningLabel'
}) {
  const t = useTranslations('analytics.workflows.milestoneRun')
  const stepKeys = milestoneRunStepKeys()
  const labelKeys: Record<MilestoneRunStepKey, string> = {
    fetch_context: 'stepFetchContext',
    evaluate_criterion: 'stepEvaluateCriteria',
    update_criteria: 'stepUpdateCriteria',
    synthesize: 'stepSynthesize',
    store_result: 'stepStoreResult',
  }
  const labels = stepKeys.map((key) => t(labelKeys[key]))
  const currentIdx = milestoneRunStepIndex(runningStep)

  return (
    <div aria-live="polite" className="bg-muted/30 px-3 py-3 md:px-6" role="status">
      <p className="mb-2 font-medium text-foreground text-xs">{t(runningLabelKey)}</p>
      <ol className="flex flex-wrap items-center gap-x-1 gap-y-2 text-muted-foreground text-xs">
        {labels.map((label, j) => {
          const done = j < currentIdx
          const active = j === currentIdx
          return (
            <li className="flex min-w-0 items-center gap-1" key={stepKeys[j]}>
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

function CampaignBriefRunProgressStrip({
  runningStep,
  runningStepIteration,
  reflectionEnabled,
  reflectionMaxRevisions,
  reflectionRounds,
  reflectionAddressing,
  passCriteria,
}: {
  runningStep: string | null
  runningStepIteration?: number | null
  reflectionEnabled: boolean
  reflectionMaxRevisions: number
  reflectionRounds: CampaignBriefReflectionRound[]
  reflectionAddressing: Array<{ criterionId: string; feedback: string }>
  passCriteria: PassCriteriaRow[]
}) {
  const t = useTranslations('analytics.workflows.milestoneRun')
  const currentLabel = campaignBriefRunStepLabel(
    runningStep,
    runningStepIteration,
    reflectionMaxRevisions,
    {
      prepare: t('campaignBriefStepPrepare'),
      generate: t('campaignBriefStepGenerate'),
      review: (pass, max) => t('campaignBriefStepReview', { pass, max }),
      revise: (pass, max) => t('campaignBriefStepRevise', { pass, max }),
      save: t('campaignBriefStepSave'),
      starting: t('campaignBriefStepStarting'),
    },
  )

  return (
    <div aria-live="polite" className="bg-muted/30 px-3 py-3 md:px-6" role="status">
      <p className="mb-2 font-medium text-foreground text-xs">{t('campaignBriefRunningLabel')}</p>
      <div className="mb-3 space-y-2">
        <p className="flex items-center gap-2 font-medium text-foreground text-sm">
          <Spinner className="size-4 shrink-0" />
          <span>{currentLabel}</span>
        </p>
        {runningStep === 'reflect_revise' && reflectionAddressing.length > 0 ? (
          <ul className="space-y-1 border-border/60 border-l-2 pl-3 text-muted-foreground text-xs">
            {reflectionAddressing.map((item) => (
              <li key={item.criterionId}>
                <span className="font-medium text-foreground">
                  {criterionShortLabel(item.criterionId, passCriteria)}:
                </span>{' '}
                {item.feedback || t('campaignBriefReflectionReviseFallback')}
              </li>
            ))}
          </ul>
        ) : null}
        {!reflectionEnabled && isCampaignBriefCreateStep(runningStep) ? (
          <p className="text-muted-foreground text-xs">
            {t('campaignBriefReflectionDisabledHint')}
          </p>
        ) : null}
      </div>
      <CampaignBriefPipelineStrip
        reflectionEnabled={reflectionEnabled}
        reflectionRounds={reflectionRounds}
        runningStep={runningStep}
        runningStepIteration={runningStepIteration}
      />
      <CampaignBriefReflectionLog
        passCriteria={passCriteria}
        reflectionMaxRevisions={reflectionMaxRevisions}
        reflectionRounds={reflectionRounds}
      />
    </div>
  )
}

export function MilestoneRunProgressStrip({
  runningStep,
  runningStepIteration,
  presetId,
  reflectionEnabled = DEFAULT_CAMPAIGN_BRIEF_REFLECTION.enabled,
  reflectionMaxRevisions = DEFAULT_CAMPAIGN_BRIEF_REFLECTION.maxRevisions,
  reflectionRounds = [],
  reflectionAddressing = [],
  passCriteria = [],
}: MilestoneRunProgressStripProps) {
  if (presetId === 'restaurant_campaign_brief') {
    if (isCampaignBriefGenerationStep(runningStep) || !runningStep) {
      return (
        <CampaignBriefRunProgressStrip
          passCriteria={passCriteria}
          reflectionAddressing={reflectionAddressing}
          reflectionEnabled={reflectionEnabled}
          reflectionMaxRevisions={reflectionMaxRevisions}
          reflectionRounds={reflectionRounds}
          runningStep={runningStep}
          runningStepIteration={runningStepIteration}
        />
      )
    }
    return (
      <div className="bg-muted/30">
        <MilestoneEvalProgressStrip
          runningLabelKey="campaignBriefEvalRunningLabel"
          runningStep={runningStep}
        />
        {reflectionRounds.length > 0 ? (
          <div className="px-3 pb-3 md:px-6">
            <CampaignBriefReflectionLog
              passCriteria={passCriteria}
              reflectionMaxRevisions={reflectionMaxRevisions}
              reflectionRounds={reflectionRounds}
            />
          </div>
        ) : null}
      </div>
    )
  }

  return <MilestoneEvalProgressStrip runningLabelKey="runningLabel" runningStep={runningStep} />
}
