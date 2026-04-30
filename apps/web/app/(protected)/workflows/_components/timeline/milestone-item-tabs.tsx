'use client'

import { type RefObject, useMemo } from 'react'
import { useTranslations } from 'next-intl'
import { CalendarDays, Check, Circle, Trash2, X } from 'lucide-react'

import {
  MarkdownEditField,
  type MarkdownEditFieldManualSave,
} from '@/components/markdown-edit-field'
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

import type { DatesMilestoneInput, PassCriteriaRow, TimelineMilestone } from './types'

const presetGoalTranslationKeyById = {
  dates: 'milestonePreset.dates.goal',
  restaurant_brand_brief: 'milestonePreset.restaurant_brand_brief.goal',
  promotion_candidates: 'milestonePreset.promotion_candidates.goal',
  scheduler: 'milestonePreset.scheduler.goal',
} as const

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
  isDatesPreset: boolean
  inputDraft: DatesMilestoneInput
  setInputDraft: (next: DatesMilestoneInput) => void
  inputDirty: boolean
  handleInputSave: () => Promise<void>
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
  return date.toISOString().slice(0, 10)
}

function formatDateButtonLabel(value: string): string {
  const parsed = parseDateInputValue(value)
  return parsed ? parsed.toLocaleDateString() : value
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
    isDatesPreset,
    inputDraft,
    setInputDraft,
    inputDirty,
    handleInputSave,
    savingInput,
  } = model
  const t = useTranslations('analytics.campaigns.chat')
  const saveStatusMessages = useMemo(
    () => ({
      saving: t('fieldSaveStatusSaving'),
      saved: t('fieldSaveStatusSaved'),
      unsaved: t('fieldSaveStatusUnsaved'),
    }),
    [t],
  )
  const goalSaveStatus = savingGoal
    ? 'saving'
    : goalDraft !== (milestone.goal ?? '')
      ? 'unsaved'
      : 'saved'

  const goalManualSave = useMemo(
    (): MarkdownEditFieldManualSave => ({
      messages: saveStatusMessages,
      onSave: handleGoalSave,
      status: goalSaveStatus,
    }),
    [goalSaveStatus, handleGoalSave, saveStatusMessages],
  )
  const helpDescription = useMemo(() => {
    const presetGoalKey = milestone.presetId
      ? presetGoalTranslationKeyById[milestone.presetId]
      : undefined
    const presetDescription = presetGoalKey ? t(presetGoalKey) : ''
    const customDescription = milestone.goal?.trim() ?? ''
    return presetDescription || customDescription || t('milestoneHelpWhatItDoesFallback')
  }, [milestone.goal, milestone.presetId, t])

  return (
    <CardContent className="border-border/60 border-t px-6 pt-4 pb-0">
      <Tabs className="gap-4" defaultValue="goal">
        <TabsList className="w-full" variant="line">
          <TabsTrigger className="flex-1" value="goal">
            {t('milestoneTabGoal')}
          </TabsTrigger>
          <TabsTrigger className="flex-1" value="input">
            {t('milestoneTabInput')}
          </TabsTrigger>
          <TabsTrigger className="flex-1" value="pass">
            {t('milestoneTabPassCriteria')}
          </TabsTrigger>
          <TabsTrigger className="flex-1" value="result">
            {t('milestoneTabResult')}
          </TabsTrigger>
          <TabsTrigger className="flex flex-1 items-center justify-center gap-1.5" value="help">
            <span
              aria-hidden
              className="inline-flex size-4 items-center justify-center rounded-full border text-[10px] font-semibold leading-none"
            >
              ?
            </span>
            {t('milestoneTabHelp')}
          </TabsTrigger>
        </TabsList>
        <TabsContent value="goal">
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
                  manualSave={goalManualSave}
                  onChange={setGoalDraft}
                  placeholder={t('milestoneGoalPlaceholder')}
                  previewEmptyLabel={t('milestoneGoalPreviewEmpty')}
                  previewTabLabel={t('milestoneDataPreviewTab')}
                  textareaClassName="min-h-[120px] resize-y whitespace-pre-wrap"
                  value={goalDraft}
                />
              </div>
            </Field>
          </FieldGroup>
        </TabsContent>
        <TabsContent value="input">
          {isDatesPreset ? (
            <FieldGroup className="gap-4">
              <Field>
                <FieldLabel>{t('milestoneDatesInputStartDateLabel')}</FieldLabel>
                <FieldDescription>{t('milestoneDatesInputStartDateDescription')}</FieldDescription>
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
                        : t('milestoneDatesInputPickDate')}
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
                <FieldLabel>{t('milestoneDatesInputEndDateLabel')}</FieldLabel>
                <FieldDescription>{t('milestoneDatesInputEndDateDescription')}</FieldDescription>
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
                        : t('milestoneDatesInputPickDate')}
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
              <div className="flex items-center justify-between">
                <p className="text-muted-foreground text-xs">
                  {savingInput
                    ? t('fieldSaveStatusSaving')
                    : inputDirty
                      ? t('fieldSaveStatusUnsaved')
                      : t('fieldSaveStatusSaved')}
                </p>
                <Button
                  disabled={savingInput || isMilestoneRunning || !inputDirty}
                  onClick={() => void handleInputSave()}
                  type="button"
                  variant="secondary"
                >
                  {t('milestoneInputSaveButton')}
                </Button>
              </div>
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
          </FieldGroup>
        </TabsContent>
      </Tabs>
    </CardContent>
  )
}
