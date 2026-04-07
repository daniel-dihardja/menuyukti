'use client'

import { useTranslations } from 'next-intl'
import { Check, Circle, Trash2, X } from 'lucide-react'

import { FieldSaveStatus } from '@/components/field-save-status'
import { MarkdownEditField } from '@/components/markdown-edit-field'
import { MarkdownMessage } from '@/components/markdown-message'
import { Button } from '@workspace/ui/components/button'
import { CardContent } from '@workspace/ui/components/card'
import { Field, FieldDescription, FieldGroup, FieldLabel } from '@workspace/ui/components/field'
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from '@workspace/ui/components/input-group'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@workspace/ui/components/select'
import { Spinner } from '@workspace/ui/components/spinner'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@workspace/ui/components/tabs'

import type { MilestoneDataTask, PassCriteriaRow, TimelineMilestone } from './types'

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
  isPreparing?: boolean
  onSetMilestoneDataTask?: (dataTask: MilestoneDataTask) => void | Promise<void>
  onPrepareMilestone?: () => void | Promise<void>
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
  isPreparing = false,
  onSetMilestoneDataTask,
  onPrepareMilestone,
  handleGoalBlur,
  handleDataBlur,
  handleAddPassCriterion,
  handleRemovePassCriterion,
}: MilestoneItemTabsProps) {
  const t = useTranslations('analytics.campaigns.chat')
  const dataTask: MilestoneDataTask = milestone.dataTask ?? 'manual'
  const dataTaskFieldId = `milestone-data-task-${milestone.id}`
  const hasGeneratedData = Boolean((milestone.data ?? '').trim())
  const saveStatusMessages = {
    saving: t('fieldSaveStatusSaving'),
    saved: t('fieldSaveStatusSaved'),
    unsaved: t('fieldSaveStatusUnsaved'),
  }
  const goalSaveStatus = savingGoal
    ? 'saving'
    : goalDraft !== (milestone.goal ?? '')
      ? 'unsaved'
      : 'saved'
  const dataSaveStatus = savingData
    ? 'saving'
    : dataDraft !== (milestone.data ?? '')
      ? 'unsaved'
      : 'saved'

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
              <div className="flex flex-col gap-1.5">
                <MarkdownEditField
                  disabled={savingGoal}
                  editTabLabel={t('milestoneDataEditTab')}
                  formatPreset="milestone-goal"
                  id={goalFieldId}
                  onBlur={handleGoalBlur}
                  onChange={setGoalDraft}
                  placeholder={t('milestoneGoalPlaceholder')}
                  previewEmptyLabel={t('milestoneGoalPreviewEmpty')}
                  previewTabLabel={t('milestoneDataPreviewTab')}
                  textareaClassName="min-h-[120px] resize-y whitespace-pre-wrap"
                  value={goalDraft}
                />
                <div className="flex justify-end">
                  <FieldSaveStatus
                    className="inline-flex"
                    messages={saveStatusMessages}
                    status={goalSaveStatus}
                  />
                </div>
              </div>
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
                    <span className="min-w-0 break-words leading-snug">{row.requirement}</span>
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
          <InputGroup className="h-auto min-h-9 w-full flex-col items-stretch gap-2 sm:h-9 sm:flex-row sm:items-center sm:gap-0">
            <InputGroupInput
              aria-label={t('milestonePassCriteriaAddPlaceholder')}
              className="min-h-9"
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
            <InputGroupAddon align="inline-end" className="w-full sm:w-auto">
              <InputGroupButton
                disabled={savingPassCriteria}
                onClick={(e) => {
                  e.stopPropagation()
                  void handleAddPassCriterion()
                }}
                size="sm"
                variant="secondary"
              >
                {t('milestonePassCriteriaAddButton')}
              </InputGroupButton>
            </InputGroupAddon>
          </InputGroup>
        </TabsContent>
        <TabsContent value="data">
          <FieldGroup className="gap-4">
            <Field>
              <FieldLabel htmlFor={dataTaskFieldId}>{t('milestoneDataTaskLabel')}</FieldLabel>
              <Select
                disabled={!onSetMilestoneDataTask}
                onValueChange={(v) => {
                  void onSetMilestoneDataTask?.(v as MilestoneDataTask)
                }}
                value={dataTask}
              >
                <SelectTrigger
                  className="w-full max-w-md"
                  id={dataTaskFieldId}
                  onClick={(e) => e.stopPropagation()}
                  onPointerDown={(e) => e.stopPropagation()}
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="manual">{t('milestoneDataTaskManual')}</SelectItem>
                  <SelectItem value="location_profile">
                    {t('milestoneDataTaskLocationProfile')}
                  </SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field>
              <FieldLabel htmlFor={dataFieldId}>{t('milestoneDataLabel')}</FieldLabel>
              <FieldDescription>
                {dataTask === 'manual'
                  ? t('milestoneDataDescription')
                  : t('milestoneDataDescriptionLocationProfile')}
              </FieldDescription>
              {dataTask === 'location_profile' ? (
                <div className="flex flex-wrap items-center gap-2 pb-2">
                  <Button
                    disabled={isPreparing || !onPrepareMilestone}
                    onClick={(e) => {
                      e.stopPropagation()
                      void onPrepareMilestone?.()
                    }}
                    size="sm"
                    type="button"
                    variant="default"
                  >
                    {isPreparing ? (
                      <>
                        <Spinner className="size-4" />
                        {t('milestonePrepareRunning')}
                      </>
                    ) : hasGeneratedData ? (
                      t('milestoneRegenerateButton')
                    ) : (
                      t('milestoneGenerateButton')
                    )}
                  </Button>
                </div>
              ) : null}
              <div className="flex flex-col gap-1.5">
                <MarkdownEditField
                  disabled={savingData}
                  editTabLabel={t('milestoneDataEditTab')}
                  formatPreset="milestone-data"
                  id={dataFieldId}
                  onBlur={handleDataBlur}
                  onChange={setDataDraft}
                  placeholder={t('milestoneDataPlaceholder')}
                  previewEmptyLabel={t('milestoneDataPreviewEmpty')}
                  previewTabLabel={t('milestoneDataPreviewTab')}
                  textareaClassName="min-h-[200px] resize-y whitespace-pre-wrap"
                  value={dataDraft}
                />
                <div className="flex justify-end">
                  <FieldSaveStatus
                    className="inline-flex"
                    messages={saveStatusMessages}
                    status={dataSaveStatus}
                  />
                </div>
              </div>
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
