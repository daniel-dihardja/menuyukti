'use client'

import { type RefObject, useMemo } from 'react'
import { useTranslations } from 'next-intl'
import { CalendarDays, Check, Circle, Trash2, X } from 'lucide-react'

import { FieldSaveStatus, type FieldSaveStatusVariant } from '@/components/field-save-status'
import { MarkdownMessage } from '@/components/markdown-message'
import { Button } from '@workspace/ui/components/button'
import { Calendar } from '@workspace/ui/components/calendar'
import { cn } from '@workspace/ui/lib/utils'
import { CardContent } from '@workspace/ui/components/card'
import { Field, FieldDescription, FieldGroup, FieldLabel } from '@workspace/ui/components/field'
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from '@workspace/ui/components/input-group'
import { Popover, PopoverContent, PopoverTrigger } from '@workspace/ui/components/popover'
import { Spinner } from '@workspace/ui/components/spinner'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@workspace/ui/components/tabs'
import { Textarea } from '@workspace/ui/components/textarea'

import { getMilestoneHelpDescription } from '@/lib/milestones/milestone-help-description'
import { milestonePresetHasDefaultOptionalNotesInput } from '@/lib/milestones/milestone-input-tab'

import type { PassCriteriaRow, TimelineMilestone } from './types'

type CampaignWindowInput = {
  startDate: string
  endDate: string
}

/** Tab panel state and handlers for one milestone (built in `timeline-item`). */
export type MilestoneItemTabsModel = {
  milestone: TimelineMilestone
  goalFieldId: string
  addCriteriaInputId: string
  addCriteriaInputRef: RefObject<HTMLInputElement | null>
  goalDraft: string
  setGoalDraft: (v: string) => void
  criteriaRows: PassCriteriaRow[]
  savingGoal: boolean
  savingPassCriteria: boolean
  hasResult: boolean
  isMilestoneRunning: boolean
  handleGoalSave: () => void
  handleAddPassCriterion: () => Promise<void>
  handleRemovePassCriterion: (index: number) => Promise<void>
  isCampaignBriefPreset: boolean
  optionalNotesDraft: string
  setOptionalNotesDraft: (v: string) => void
  handleOptionalNotesBlur: () => void
  inputDraft: CampaignWindowInput
  setInputDraft: (next: CampaignWindowInput) => void
  inputSaveStatus: FieldSaveStatusVariant
  savingInput: boolean
}

export type MilestoneItemTabsProps = {
  model: MilestoneItemTabsModel
}

function parseDateInputValue(value: string): Date | undefined {
  if (!value) {
    return undefined
  }
  const parsed = new Date(`${value}T00:00:00`)
  return Number.isNaN(parsed.getTime()) ? undefined : parsed
}

function formatDateForInput(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function formatDateButtonLabel(value: string): string {
  const parsed = parseDateInputValue(value)
  return parsed ? parsed.toLocaleDateString() : value
}

type OptionalNotesPresetId =
  | 'restaurant_campaign_brief'
  | 'post_scheduler'
  | 'promotion_candidates'
  | 'culture_hooks'

function optionalNotesFieldCopy(
  t: (key: string) => string,
  presetId: OptionalNotesPresetId,
): {
  label: string
  description: string
  placeholder: string
} {
  const base = `milestonePreset.${presetId}` as const
  return {
    label: t(`${base}.inputLabel`),
    description: t(`${base}.inputDescription`),
    placeholder: t(`${base}.inputPlaceholder`),
  }
}

export function MilestoneItemTabs({ model }: MilestoneItemTabsProps) {
  const {
    milestone,
    goalFieldId,
    addCriteriaInputId,
    addCriteriaInputRef,
    goalDraft,
    setGoalDraft,
    criteriaRows,
    savingGoal,
    savingPassCriteria,
    hasResult,
    isMilestoneRunning,
    handleGoalSave,
    handleAddPassCriterion,
    handleRemovePassCriterion,
    isCampaignBriefPreset,
    optionalNotesDraft,
    setOptionalNotesDraft,
    handleOptionalNotesBlur,
    inputDraft,
    setInputDraft,
    inputSaveStatus,
    savingInput,
  } = model
  const t = useTranslations('analytics.campaigns.chat')
  const helpDescription = useMemo(() => getMilestoneHelpDescription(milestone, t), [milestone, t])

  const optionalNotesCopy = useMemo(() => {
    const pid = milestone.presetId
    if (!milestonePresetHasDefaultOptionalNotesInput(pid)) {
      return null
    }
    return optionalNotesFieldCopy(t, pid)
  }, [milestone.presetId, t])

  return (
    <CardContent className="min-w-0 border-border/60 border-t px-3 pt-4 pb-0 md:px-6">
      <Tabs className="min-w-0 gap-4" defaultValue="input">
        <TabsList
          className="w-full min-w-0 max-w-full justify-start overflow-x-auto overflow-y-hidden overscroll-x-contain [-webkit-overflow-scrolling:touch]"
          variant="line"
        >
          <TabsTrigger className="shrink-0" value="input">
            {t('milestoneTabInput')}
          </TabsTrigger>
          <TabsTrigger className="shrink-0" value="goal">
            {t('milestoneTabGoal')}
          </TabsTrigger>
          <TabsTrigger className="shrink-0" value="pass">
            {t('milestoneTabPassCriteria')}
          </TabsTrigger>
          <TabsTrigger className="shrink-0" value="result">
            {t('milestoneTabResult')}
          </TabsTrigger>
          <TabsTrigger className="shrink-0" value="help">
            {t('milestoneTabHelp')}
          </TabsTrigger>
        </TabsList>
        <TabsContent value="goal">
          <FieldGroup className="gap-4">
            <Field>
              <Textarea
                className="min-h-[120px] resize-y whitespace-pre-wrap"
                disabled={savingGoal}
                id={goalFieldId}
                onBlur={() => handleGoalSave()}
                onChange={(e) => setGoalDraft(e.target.value)}
                onClick={(e) => e.stopPropagation()}
                onPointerDown={(e) => e.stopPropagation()}
                placeholder={t('milestoneGoalPlaceholder')}
                value={goalDraft}
              />
            </Field>
          </FieldGroup>
        </TabsContent>
        <TabsContent value="input">
          {isCampaignBriefPreset ? (
            <FieldGroup className="gap-4">
              <Field>
                <FieldLabel>{t('milestoneCampaignBriefInputStartDateLabel')}</FieldLabel>
                <FieldDescription>
                  {t('milestoneCampaignBriefInputStartDateDescription')}
                </FieldDescription>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      className={cn('w-full justify-start text-left font-normal')}
                      disabled={savingInput || isMilestoneRunning}
                      type="button"
                      variant="outline"
                    >
                      <CalendarDays aria-hidden data-icon="inline-start" />
                      {inputDraft.startDate
                        ? formatDateButtonLabel(inputDraft.startDate)
                        : t('milestoneCampaignBriefInputPickDate')}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent align="start" className="w-auto p-0">
                    <Calendar
                      mode="single"
                      onSelect={(date) => {
                        setInputDraft({
                          ...inputDraft,
                          startDate: date ? formatDateForInput(date) : '',
                        })
                      }}
                      selected={parseDateInputValue(inputDraft.startDate)}
                    />
                  </PopoverContent>
                </Popover>
              </Field>
              <Field>
                <FieldLabel>{t('milestoneCampaignBriefInputEndDateLabel')}</FieldLabel>
                <FieldDescription>
                  {t('milestoneCampaignBriefInputEndDateDescription')}
                </FieldDescription>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      className={cn('w-full justify-start text-left font-normal')}
                      disabled={savingInput || isMilestoneRunning}
                      type="button"
                      variant="outline"
                    >
                      <CalendarDays aria-hidden data-icon="inline-start" />
                      {inputDraft.endDate
                        ? formatDateButtonLabel(inputDraft.endDate)
                        : t('milestoneCampaignBriefInputPickDate')}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent align="start" className="w-auto p-0">
                    <Calendar
                      mode="single"
                      onSelect={(date) => {
                        setInputDraft({
                          ...inputDraft,
                          endDate: date ? formatDateForInput(date) : '',
                        })
                      }}
                      selected={parseDateInputValue(inputDraft.endDate)}
                    />
                  </PopoverContent>
                </Popover>
              </Field>
              {optionalNotesCopy ? (
                <Field>
                  <FieldLabel>{optionalNotesCopy.label}</FieldLabel>
                  <FieldDescription>{optionalNotesCopy.description}</FieldDescription>
                  <Textarea
                    className="min-h-[120px] resize-y whitespace-pre-wrap"
                    disabled={isMilestoneRunning}
                    onBlur={() => handleOptionalNotesBlur()}
                    onChange={(e) => setOptionalNotesDraft(e.target.value)}
                    onClick={(e) => e.stopPropagation()}
                    onPointerDown={(e) => e.stopPropagation()}
                    placeholder={optionalNotesCopy.placeholder}
                    value={optionalNotesDraft}
                  />
                </Field>
              ) : null}
              <FieldSaveStatus
                className="text-muted-foreground"
                messages={{
                  saving: t('fieldSaveStatusSaving'),
                  saved: t('fieldSaveStatusSaved'),
                  unsaved: t('fieldSaveStatusUnsaved'),
                }}
                status={inputSaveStatus}
              />
            </FieldGroup>
          ) : optionalNotesCopy ? (
            <FieldGroup className="gap-4">
              <Field>
                <FieldLabel>{optionalNotesCopy.label}</FieldLabel>
                <FieldDescription>{optionalNotesCopy.description}</FieldDescription>
                <Textarea
                  className="min-h-[120px] resize-y whitespace-pre-wrap"
                  disabled={isMilestoneRunning}
                  onBlur={() => handleOptionalNotesBlur()}
                  onChange={(e) => setOptionalNotesDraft(e.target.value)}
                  onClick={(e) => e.stopPropagation()}
                  onPointerDown={(e) => e.stopPropagation()}
                  placeholder={optionalNotesCopy.placeholder}
                  value={optionalNotesDraft}
                />
              </Field>
              <FieldSaveStatus
                className="text-muted-foreground"
                messages={{
                  saving: t('fieldSaveStatusSaving'),
                  saved: t('fieldSaveStatusSaved'),
                  unsaved: t('fieldSaveStatusUnsaved'),
                }}
                status={inputSaveStatus}
              />
            </FieldGroup>
          ) : (
            <p className="text-muted-foreground text-sm">{t('milestoneInputUnsupported')}</p>
          )}
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
                    <MarkdownMessage
                      className={cn(
                        'min-w-0 flex-1 text-muted-foreground',
                        'prose-headings:text-muted-foreground prose-strong:text-foreground/90',
                        'prose-p:my-1 prose-headings:my-2 prose-ul:my-1 prose-li:my-0',
                        'first:prose-p:mt-0 last:prose-p:mb-0',
                      )}
                      content={row.requirement}
                    />
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
                    <Trash2 aria-hidden />
                  </Button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-muted-foreground text-sm">{t('milestonePassCriteriaEmpty')}</p>
          )}
          <InputGroup className="h-auto min-h-9 w-full flex-col items-stretch gap-2 sm:h-9 sm:flex-row sm:items-center sm:gap-0">
            <InputGroupInput
              ref={addCriteriaInputRef}
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
        <TabsContent value="result">
          {hasResult ? (
            <MarkdownMessage content={milestone.resultMarkdown ?? ''} />
          ) : (
            <p className="text-muted-foreground text-sm">{t('milestoneResultEmpty')}</p>
          )}
        </TabsContent>
        <TabsContent value="help">
          <FieldGroup className="gap-4">
            <p className="font-semibold text-lg leading-tight">{milestone.title}</p>
            <MarkdownMessage content={helpDescription} />
            {milestone.presetId === 'restaurant_campaign_brief' ? (
              <div className="space-y-2 text-muted-foreground text-sm">
                <p className="font-medium text-foreground">
                  {t('milestoneHelpCampaignBriefOptionalInputTitle')}
                </p>
                <p>{t('milestoneHelpCampaignBriefOptionalInputHowUsed')}</p>
                <p>{t('milestoneHelpCampaignBriefOptionalInputWhenToUse')}</p>
              </div>
            ) : milestone.presetId === 'post_scheduler' ? (
              <div className="space-y-2 text-muted-foreground text-sm">
                <p className="font-medium text-foreground">
                  {t('milestoneHelpPostSchedulerOptionalInputTitle')}
                </p>
                <p>{t('milestoneHelpPostSchedulerOptionalInputHowUsed')}</p>
                <p>{t('milestoneHelpPostSchedulerOptionalInputWhenToUse')}</p>
              </div>
            ) : optionalNotesCopy ? (
              <div className="space-y-2 text-muted-foreground text-sm">
                <p className="font-medium text-foreground">
                  {t('milestoneHelpOptionalInputTitle')}
                </p>
                <p>{t('milestoneHelpOptionalInputSummary')}</p>
              </div>
            ) : null}
          </FieldGroup>
        </TabsContent>
      </Tabs>
    </CardContent>
  )
}
