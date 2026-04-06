'use client'

import { useTranslations } from 'next-intl'
import { Check, Circle, Trash2, X } from 'lucide-react'

import { MarkdownMessage } from '@/components/markdown-message'
import { Button } from '@workspace/ui/components/button'
import { CardContent } from '@workspace/ui/components/card'
import { Field, FieldDescription, FieldGroup, FieldLabel } from '@workspace/ui/components/field'
import { Input } from '@workspace/ui/components/input'
import { Spinner } from '@workspace/ui/components/spinner'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@workspace/ui/components/tabs'
import { Textarea } from '@workspace/ui/components/textarea'

import type { PassCriteriaRow, TimelineMilestone } from './types'

export type MilestoneItemTabsProps = {
  milestone: TimelineMilestone
  goalFieldId: string
  dataFieldId: string
  addCriteriaInputId: string
  goalDraft: string
  setGoalDraft: (v: string) => void
  dataDraft: string
  setDataDraft: (v: string) => void
  criteriaRows: PassCriteriaRow[]
  savingGoal: boolean
  savingData: boolean
  savingPassCriteria: boolean
  hasResult: boolean
  isMilestoneRunning: boolean
  handleGoalBlur: () => void
  handleDataBlur: () => void
  handleAddPassCriterion: () => Promise<void>
  handleRemovePassCriterion: (index: number) => Promise<void>
}

export function MilestoneItemTabs({
  milestone,
  goalFieldId,
  dataFieldId,
  addCriteriaInputId,
  goalDraft,
  setGoalDraft,
  dataDraft,
  setDataDraft,
  criteriaRows,
  savingGoal,
  savingData,
  savingPassCriteria,
  hasResult,
  isMilestoneRunning,
  handleGoalBlur,
  handleDataBlur,
  handleAddPassCriterion,
  handleRemovePassCriterion,
}: MilestoneItemTabsProps) {
  const t = useTranslations('analytics.campaigns.chat')

  return (
    <CardContent className="border-border/60 border-t px-6 pt-4 pb-0">
      <Tabs className="gap-4" defaultValue="input">
        <TabsList className="w-full" variant="line">
          <TabsTrigger className="flex-1" value="input">
            {t('milestoneTabInput')}
          </TabsTrigger>
          <TabsTrigger className="flex-1" value="pass">
            {t('milestoneTabPassCriteria')}
          </TabsTrigger>
          <TabsTrigger className="flex-1" value="data">
            {t('milestoneTabData')}
          </TabsTrigger>
          <TabsTrigger className="flex-1" value="result">
            {t('milestoneTabResult')}
          </TabsTrigger>
        </TabsList>
        <TabsContent value="input">
          <FieldGroup className="gap-4">
            <Field>
              <FieldLabel htmlFor={goalFieldId}>{t('milestoneGoalLabel')}</FieldLabel>
              <FieldDescription>{t('milestoneGoalDescription')}</FieldDescription>
              <Textarea
                className="min-h-[120px] resize-y whitespace-pre-wrap"
                disabled={savingGoal}
                id={goalFieldId}
                onChange={(e) => setGoalDraft(e.target.value)}
                onBlur={handleGoalBlur}
                onClick={(e) => e.stopPropagation()}
                onPointerDown={(e) => e.stopPropagation()}
                placeholder={t('milestoneGoalPlaceholder')}
                value={goalDraft}
              />
            </Field>
          </FieldGroup>
        </TabsContent>
        <TabsContent className="flex flex-col gap-4" value="pass">
          {criteriaRows.length > 0 ? (
            <ul className="flex flex-col gap-2">
              {criteriaRows.map((row, index) => (
                <li
                  className="flex items-start gap-2 text-sm"
                  key={row.id ?? `${milestone.id}-criteria-${index}`}
                >
                  <div className="flex min-w-0 flex-1 gap-2 text-muted-foreground">
                    {row.status === 'pass' ? (
                      <Check
                        aria-hidden
                        className="mt-0.5 size-4 shrink-0 text-primary stroke-[2.5]"
                      />
                    ) : row.status === 'fail' ? (
                      <X
                        aria-hidden
                        className="mt-0.5 size-4 shrink-0 text-destructive stroke-[2.5]"
                      />
                    ) : isMilestoneRunning ? (
                      <span
                        aria-label={t('milestonePassCriteriaOpenLabel')}
                        className="mt-0.5 inline-flex shrink-0"
                        role="img"
                      >
                        <Spinner className="size-4" />
                      </span>
                    ) : (
                      <span
                        aria-label={t('milestonePassCriteriaOpenLabel')}
                        className="mt-0.5 inline-flex shrink-0"
                        role="img"
                      >
                        <Circle aria-hidden className="size-4 text-muted-foreground stroke-[2.5]" />
                      </span>
                    )}
                    <span className="min-w-0 leading-snug">{row.requirement}</span>
                  </div>
                  <Button
                    aria-label={t('milestonePassCriteriaRemoveLabel')}
                    className="size-8 shrink-0 text-muted-foreground hover:text-destructive"
                    disabled={savingPassCriteria}
                    onClick={(e) => {
                      e.stopPropagation()
                      void handleRemovePassCriterion(index)
                    }}
                    size="icon"
                    type="button"
                    variant="ghost"
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-muted-foreground text-sm">{t('milestonePassCriteriaEmpty')}</p>
          )}
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <Input
              aria-label={t('milestonePassCriteriaAddPlaceholder')}
              className="flex-1"
              disabled={savingPassCriteria}
              id={addCriteriaInputId}
              onKeyDown={(e) => {
                e.stopPropagation()
                if (e.key === 'Enter') {
                  e.preventDefault()
                  void handleAddPassCriterion()
                }
              }}
              placeholder={t('milestonePassCriteriaAddPlaceholder')}
              type="text"
            />
            <Button
              className="shrink-0 sm:w-auto"
              disabled={savingPassCriteria}
              onClick={(e) => {
                e.stopPropagation()
                void handleAddPassCriterion()
              }}
              type="button"
              variant="secondary"
            >
              {t('milestonePassCriteriaAddButton')}
            </Button>
          </div>
        </TabsContent>
        <TabsContent value="data">
          <FieldGroup className="gap-4">
            <Field>
              <FieldLabel htmlFor={dataFieldId}>{t('milestoneDataLabel')}</FieldLabel>
              <FieldDescription>{t('milestoneDataDescription')}</FieldDescription>
              <Textarea
                className="min-h-[120px] resize-y whitespace-pre-wrap"
                disabled={savingData}
                id={dataFieldId}
                onChange={(e) => setDataDraft(e.target.value)}
                onBlur={handleDataBlur}
                onClick={(e) => e.stopPropagation()}
                onPointerDown={(e) => e.stopPropagation()}
                placeholder={t('milestoneDataPlaceholder')}
                value={dataDraft}
              />
            </Field>
          </FieldGroup>
        </TabsContent>
        <TabsContent value="result">
          {hasResult ? (
            <MarkdownMessage content={milestone.resultMarkdown ?? ''} />
          ) : (
            <p className="text-muted-foreground text-sm">{t('milestoneResultEmpty')}</p>
          )}
        </TabsContent>
      </Tabs>
    </CardContent>
  )
}
