'use client'

import { useEffect, useRef, useState } from 'react'
import { useTranslations } from 'next-intl'
import { Check, ChevronDown, Circle, Clock, Maximize2, Pencil, Settings, Trash2, X } from 'lucide-react'

import { MarkdownMessage } from '@/components/markdown-message'
import { Badge } from '@workspace/ui/components/badge'
import { Button } from '@workspace/ui/components/button'
import { Card, CardAction, CardContent, CardHeader, CardTitle } from '@workspace/ui/components/card'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@workspace/ui/components/collapsible'
import { Field, FieldDescription, FieldGroup, FieldLabel } from '@workspace/ui/components/field'
import { Input } from '@workspace/ui/components/input'
import { ScrollArea } from '@workspace/ui/components/scroll-area'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@workspace/ui/components/tabs'
import { Textarea } from '@workspace/ui/components/textarea'
import { Skeleton } from '@workspace/ui/components/skeleton'
import { cn } from '@workspace/ui/lib/utils'

export type TimelineMilestoneStatus = 'complete' | 'pending' | 'empty'

export type TimelineMilestone = {
  id: string
  title: string
  /**
   * Pass criteria copy: newline-separated lines. After trim: `!` prefix = not met (X), `?` =
   * not validated yet (neutral circle), otherwise pass (check).
   */
  passCriteria: string
  /** Default text for the Input tab textarea. */
  input?: string
  /** Markdown body for the Result tab. */
  resultMarkdown?: string
  /** Defaults to `empty` when omitted. */
  status?: TimelineMilestoneStatus
}

type MilestoneStatusLabels = {
  complete: string
  pending: string
  empty: string
}

/** Shared layout box for every timeline status marker. */
const TIMELINE_RAIL_MARKER_BOX = 'flex size-7 shrink-0 items-center justify-center'
/** Same nominal size; Check is scaled down — its SVG reads larger than Clock/Circle at identical `size-*`. */
const TIMELINE_RAIL_ICON = 'size-7 origin-center stroke-[2]'
const TIMELINE_RAIL_ICON_CHECK = cn(TIMELINE_RAIL_ICON, 'scale-[0.7]')

function TimelineRailMarker({
   
  status,
  labels,
}: {
  status: TimelineMilestoneStatus
  labels: MilestoneStatusLabels
}) {
  if (status === 'complete') {
    return (
      <span
        aria-label={labels.complete}
        className={cn(
          TIMELINE_RAIL_MARKER_BOX,
          'rounded-full bg-green-600 text-white dark:bg-green-600',
        )}
        role="img"
      >
        <Check aria-hidden className={TIMELINE_RAIL_ICON_CHECK} />
      </span>
    )
  }

  if (status === 'pending') {
    return (
      <span
        aria-label={labels.pending}
        className={cn(TIMELINE_RAIL_MARKER_BOX, 'text-muted-foreground')}
        role="img"
      >
        <Clock aria-hidden className={TIMELINE_RAIL_ICON} />
      </span>
    )
  }

  return (
    <span
      aria-label={labels.empty}
      className={cn(TIMELINE_RAIL_MARKER_BOX, 'text-muted-foreground/80')}
      role="img"
    >
      <Circle aria-hidden className={TIMELINE_RAIL_ICON} />
    </span>
  )
}

type TimelineToolbarProps = {
  title: string
  count: number
  expandLabel: string
  settingsLabel: string
  createLabel?: string
  creatingLabel?: string
  onCreateMilestone?: () => void | Promise<void>
  creating?: boolean
  showCreate?: boolean
}

function TimelineToolbar({
  title,
  count,
  expandLabel,
  settingsLabel,
  createLabel,
  creatingLabel,
  onCreateMilestone,
  creating,
  showCreate,
}: TimelineToolbarProps) {
  return (
    <header className="flex shrink-0 items-center justify-between gap-3 border-b px-4 py-3">
      <div className="flex min-w-0 items-center gap-2">
        <h2 className="truncate font-semibold text-foreground text-sm">{title}</h2>
        <Badge variant="secondary">{count}</Badge>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {showCreate && onCreateMilestone && createLabel && creatingLabel ? (
          <Button
            disabled={creating}
            onClick={() => void onCreateMilestone()}
            size="sm"
            type="button"
            variant="default"
          >
            {creating ? creatingLabel : createLabel}
          </Button>
        ) : null}
        <div className="flex shrink-0 items-center gap-1">
          <Button
            aria-label={expandLabel}
            className="size-9"
            size="icon"
            type="button"
            variant="ghost"
          >
            <Maximize2 data-icon="inline-start" />
          </Button>
          <Button
            aria-label={settingsLabel}
            className="size-9"
            size="icon"
            type="button"
            variant="ghost"
          >
            <Settings data-icon="inline-start" />
          </Button>
        </div>
      </div>
    </header>
  )
}

export type PassCriteriaStatus = 'pass' | 'fail' | 'neutral'

export type PassCriteriaRow = { text: string; status: PassCriteriaStatus }

/** `!` = fail, `?` = neutral (unvalidated), else pass. */
function parsePassCriteriaLines(passCriteria: string): PassCriteriaRow[] {
  return passCriteria
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      if (line.startsWith('!')) {
        return { text: line.slice(1).trim(), status: 'fail' satisfies PassCriteriaStatus }
      }
      if (line.startsWith('?')) {
        return { text: line.slice(1).trim(), status: 'neutral' satisfies PassCriteriaStatus }
      }
      return { text: line, status: 'pass' satisfies PassCriteriaStatus }
    })
}

type TimelineItemProps = {
  milestone: TimelineMilestone
  isFirst: boolean
  isLast: boolean
  isSelected: boolean
  onSelect: (id: string) => void
  expandDetailsLabel: string
  collapseDetailsLabel: string
  statusLabels: MilestoneStatusLabels
  showDelete: boolean
  onDeleteMilestone?: (id: string) => void | Promise<void>
  isDeleting: boolean
  deleteButtonLabel: string
  deleteMilestoneAriaLabel: string
  onRenameMilestone?: (id: string, name: string) => Promise<boolean>
  renamingMilestoneId: string | null
}

function TimelineItem({
  milestone,
  isFirst,
  isLast,
  isSelected,
  onSelect,
  expandDetailsLabel,
  collapseDetailsLabel,
  statusLabels,
  showDelete,
  onDeleteMilestone,
  isDeleting,
  deleteButtonLabel,
  deleteMilestoneAriaLabel,
  onRenameMilestone,
  renamingMilestoneId,
}: TimelineItemProps) {
  const [open, setOpen] = useState(true)
  const [editingTitle, setEditingTitle] = useState(false)
  const [draftTitle, setDraftTitle] = useState(milestone.title)
  const titleEditInputId = `milestone-title-edit-${milestone.id}`
  const titleEditContainerRef = useRef<HTMLDivElement>(null)
  const t = useTranslations('analytics.campaigns.chat')
  const status: TimelineMilestoneStatus = milestone.status ?? 'empty'
  const [criteriaRows, setCriteriaRows] = useState<PassCriteriaRow[]>(() =>
    parsePassCriteriaLines(milestone.passCriteria),
  )
  const addCriteriaInputId = `milestone-pass-criteria-add-${milestone.id}`

  useEffect(() => {
    setCriteriaRows(parsePassCriteriaLines(milestone.passCriteria))
  }, [milestone.id, milestone.passCriteria])

  useEffect(() => {
    if (!editingTitle) {
      setDraftTitle(milestone.title)
    }
  }, [milestone.id, milestone.title, editingTitle])

  useEffect(() => {
    setEditingTitle(false)
  }, [milestone.id])

  useEffect(() => {
    if (!editingTitle) {
      return
    }
    const el = document.getElementById(titleEditInputId)
    if (el instanceof HTMLInputElement) {
      el.focus()
      el.select()
    }
  }, [editingTitle, titleEditInputId])

  useEffect(() => {
    if (!editingTitle) {
      return
    }
    const onPointerDownCapture = (e: PointerEvent) => {
      if (renamingMilestoneId === milestone.id) {
        return
      }
      const target = e.target
      if (!(target instanceof Node)) {
        return
      }
      if (titleEditContainerRef.current?.contains(target)) {
        return
      }
      setEditingTitle(false)
      setDraftTitle(milestone.title)
    }
    document.addEventListener('pointerdown', onPointerDownCapture, true)
    return () => document.removeEventListener('pointerdown', onPointerDownCapture, true)
  }, [editingTitle, milestone.id, milestone.title, renamingMilestoneId])

  const renaming = renamingMilestoneId === milestone.id

  const handleSaveTitle = async () => {
    const trimmed = draftTitle.trim()
    if (!trimmed || !onRenameMilestone) {
      return
    }
    const ok = await onRenameMilestone(milestone.id, trimmed)
    if (ok) {
      setEditingTitle(false)
    }
  }

  const inputId = `milestone-input-${milestone.id}`
  const hasResult = Boolean(milestone.resultMarkdown?.trim())

  return (
    <div
      aria-selected={isSelected}
      className="flex cursor-pointer gap-4 rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
      data-timeline-card=""
      onClick={() => {
        onSelect(milestone.id)
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onSelect(milestone.id)
        }
      }}
      role="option"
      tabIndex={0}
    >
      <div className="flex w-12 shrink-0 flex-col items-center">
        {isFirst ? (
          <div className="flex w-full shrink-0 flex-col items-center pt-4">
            <div className="mt-0.5 flex min-h-9 w-full items-center justify-center">
              <TimelineRailMarker labels={statusLabels} status={status} />
            </div>
          </div>
        ) : (
          <div className="flex w-full shrink-0 flex-col items-center">
            <div className="h-4 w-px shrink-0 border-l border-dashed border-border" />
            <div className="mt-0.5 flex min-h-9 w-full items-center justify-center">
              <TimelineRailMarker labels={statusLabels} status={status} />
            </div>
          </div>
        )}
        {isLast ? null : (
          <div className="min-h-0 w-px flex-1 border-l border-dashed border-border" />
        )}
      </div>
      <div className={cn('min-w-0 flex-1', !isLast && 'pb-8')}>
        <Collapsible onOpenChange={setOpen} open={open}>
          <Card
            className={cn(
              'gap-0 border py-4 shadow-none transition-[background-color,box-shadow,border-color]',
              isSelected
                ? 'border-primary bg-accent/50 ring-2 ring-ring/50'
                : 'hover:bg-accent/30',
            )}
          >
            <CardHeader className="gap-1.5">
              <CardTitle className="flex min-w-0 items-center gap-1 text-base leading-snug">
                {editingTitle ? (
                  <div
                    className="flex min-w-0 flex-1 items-center gap-1"
                    ref={titleEditContainerRef}
                  >
                    <Input
                      id={titleEditInputId}
                      aria-label={t('editMilestoneTitleAriaLabel')}
                      className="h-8 min-w-0 flex-1 text-base font-semibold"
                      disabled={renaming}
                      onChange={(e) => setDraftTitle(e.target.value)}
                      onClick={(e) => e.stopPropagation()}
                      onKeyDown={(e) => {
                        e.stopPropagation()
                        if (e.key === 'Escape') {
                          setEditingTitle(false)
                          setDraftTitle(milestone.title)
                        }
                        if (e.key === 'Enter') {
                          e.preventDefault()
                          void handleSaveTitle()
                        }
                      }}
                      onPointerDown={(e) => e.stopPropagation()}
                      value={draftTitle}
                    />
                    <Button
                      aria-label={t('saveMilestoneTitleAriaLabel')}
                      className="size-9 shrink-0"
                      disabled={renaming || !draftTitle.trim()}
                      onClick={(e) => {
                        e.stopPropagation()
                        void handleSaveTitle()
                      }}
                      onPointerDown={(e) => e.stopPropagation()}
                      size="icon"
                      type="button"
                      variant="default"
                    >
                      <Check className="size-4" />
                    </Button>
                  </div>
                ) : (
                  <>
                    <span className="min-w-0 flex-1 truncate">{milestone.title}</span>
                    {onRenameMilestone ? (
                      <Button
                        aria-label={t('editMilestoneTitleAriaLabel')}
                        className="size-8 shrink-0 text-muted-foreground"
                        onClick={(e) => {
                          e.stopPropagation()
                          setDraftTitle(milestone.title)
                          setEditingTitle(true)
                        }}
                        onPointerDown={(e) => e.stopPropagation()}
                        size="icon"
                        type="button"
                        variant="ghost"
                      >
                        <Pencil className="size-4" />
                      </Button>
                    ) : null}
                  </>
                )}
              </CardTitle>
              <CardAction className="flex items-center gap-1">
                {showDelete && onDeleteMilestone ? (
                  <Button
                    aria-label={deleteMilestoneAriaLabel}
                    className="size-9 shrink-0 text-muted-foreground hover:text-destructive"
                    disabled={isDeleting || editingTitle}
                    onClick={(e) => {
                      e.stopPropagation()
                      void onDeleteMilestone(milestone.id)
                    }}
                    onPointerDown={(e) => e.stopPropagation()}
                    size="icon"
                    title={deleteButtonLabel}
                    type="button"
                    variant="ghost"
                  >
                    <Trash2 className="size-4" />
                  </Button>
                ) : null}
                <CollapsibleTrigger asChild>
                  <Button
                    aria-expanded={open}
                    aria-label={open ? collapseDetailsLabel : expandDetailsLabel}
                    className="size-9 shrink-0"
                    disabled={editingTitle}
                    onClick={(e) => e.stopPropagation()}
                    size="icon"
                    type="button"
                    variant="ghost"
                  >
                    <ChevronDown
                      className={cn(
                        'transition-transform duration-200',
                        open ? 'rotate-180' : 'rotate-0',
                      )}
                      data-icon="inline-start"
                    />
                  </Button>
                </CollapsibleTrigger>
              </CardAction>
            </CardHeader>
            <CollapsibleContent
              onClick={(e) => e.stopPropagation()}
              onPointerDown={(e) => e.stopPropagation()}
            >
              <CardContent className="border-border/60 border-t px-6 pt-4 pb-0">
                <Tabs className="gap-4" defaultValue="pass">
                  <TabsList className="w-full" variant="line">
                    <TabsTrigger className="flex-1" value="pass">
                      {t('milestoneTabPassCriteria')}
                    </TabsTrigger>
                    <TabsTrigger className="flex-1" value="input">
                      {t('milestoneTabInput')}
                    </TabsTrigger>
                    <TabsTrigger className="flex-1" value="result">
                      {t('milestoneTabResult')}
                    </TabsTrigger>
                  </TabsList>
                  <TabsContent className="flex flex-col gap-4" value="pass">
                    {criteriaRows.length > 0 ? (
                      <ul className="flex flex-col gap-2">
                        {criteriaRows.map((row, index) => (
                          <li
                            className="flex items-start gap-2 text-sm"
                            key={`${milestone.id}-criteria-${index}`}
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
                              ) : (
                                <span
                                  aria-label={t('milestonePassCriteriaNeutralLabel')}
                                  className="mt-0.5 inline-flex shrink-0"
                                  role="img"
                                >
                                  <Circle
                                    aria-hidden
                                    className="size-4 text-muted-foreground stroke-[2.5]"
                                  />
                                </span>
                              )}
                              <span className="min-w-0 leading-snug">{row.text}</span>
                            </div>
                            <Button
                              aria-label={t('milestonePassCriteriaRemoveLabel')}
                              className="size-8 shrink-0 text-muted-foreground hover:text-destructive"
                              onClick={(e) => {
                                e.stopPropagation()
                                setCriteriaRows((rows) => rows.filter((_, i) => i !== index))
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
                        id={addCriteriaInputId}
                        placeholder={t('milestonePassCriteriaAddPlaceholder')}
                        type="text"
                      />
                      <Button
                        className="shrink-0 sm:w-auto"
                        onClick={(e) => e.stopPropagation()}
                        type="button"
                        variant="secondary"
                      >
                        {t('milestonePassCriteriaAddButton')}
                      </Button>
                    </div>
                  </TabsContent>
                  <TabsContent value="input">
                    <FieldGroup className="gap-4">
                      <Field>
                        <FieldLabel htmlFor={inputId}>{t('milestoneInputLabel')}</FieldLabel>
                        <FieldDescription>{t('milestoneInputDescription')}</FieldDescription>
                        <Textarea
                          className="min-h-[120px] resize-y"
                          defaultValue={milestone.input ?? ''}
                          id={inputId}
                          placeholder={t('milestoneInputPlaceholder')}
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
            </CollapsibleContent>
          </Card>
        </Collapsible>
      </div>
    </div>
  )
}

type TimelineBodyProps = {
  milestones: TimelineMilestone[]
  selectedId: string | null
  onSelectMilestone: (id: string) => void
  listLabel: string
  expandDetailsLabel: string
  collapseDetailsLabel: string
  statusLabels: MilestoneStatusLabels
  onDeleteMilestone?: (id: string) => void | Promise<void>
  deletingMilestoneId: string | null
  deleteButtonLabel: string
  deleteMilestoneAriaLabel: string
  onRenameMilestone?: (id: string, name: string) => Promise<boolean>
  renamingMilestoneId: string | null
}

function TimelineBody({
  milestones,
  selectedId,
  onSelectMilestone,
  listLabel,
  expandDetailsLabel,
  collapseDetailsLabel,
  statusLabels,
  onDeleteMilestone,
  deletingMilestoneId,
  deleteButtonLabel,
  deleteMilestoneAriaLabel,
  onRenameMilestone,
  renamingMilestoneId,
}: TimelineBodyProps) {
  return (
    <div className="min-h-0 flex-1">
      <ScrollArea className="h-full">
        <div aria-label={listLabel} className="flex flex-col p-4 pr-3" role="listbox">
          {milestones.map((milestone, index) => {
            const isLast = index === milestones.length - 1
            const showDelete = Boolean(isLast && onDeleteMilestone)
            return (
              <TimelineItem
                key={milestone.id}
                collapseDetailsLabel={collapseDetailsLabel}
                deleteButtonLabel={deleteButtonLabel}
                deleteMilestoneAriaLabel={deleteMilestoneAriaLabel}
                expandDetailsLabel={expandDetailsLabel}
                isDeleting={deletingMilestoneId === milestone.id}
                isFirst={index === 0}
                isLast={isLast}
                isSelected={milestone.id === selectedId}
                milestone={milestone}
                onDeleteMilestone={onDeleteMilestone}
                onRenameMilestone={onRenameMilestone}
                onSelect={onSelectMilestone}
                renamingMilestoneId={renamingMilestoneId}
                showDelete={showDelete}
                statusLabels={statusLabels}
              />
            )
          })}
        </div>
      </ScrollArea>
    </div>
  )
}

export type TimelineWorkspaceProps = {
  milestones: TimelineMilestone[]
  isLoading?: boolean
  loadError?: string | null
  createError?: string | null
  deleteError?: string | null
  creating?: boolean
  deletingMilestoneId?: string | null
  onCreateMilestone: () => void | Promise<void>
  onDeleteMilestone?: (id: string) => void | Promise<void>
  onRenameMilestone?: (id: string, name: string) => Promise<boolean>
  renamingMilestoneId?: string | null
  renameError?: string | null
}

export function TimelineWorkspace({
  milestones,
  isLoading = false,
  loadError = null,
  createError = null,
  deleteError = null,
  renameError = null,
  creating = false,
  deletingMilestoneId = null,
  renamingMilestoneId = null,
  onCreateMilestone,
  onDeleteMilestone,
  onRenameMilestone,
}: TimelineWorkspaceProps) {
  const t = useTranslations('analytics.campaigns.chat')

  const [selectedId, setSelectedId] = useState<string | null>(null)

  useEffect(() => {
    setSelectedId((prev) => {
      if (milestones.length === 0) {
        return null
      }
      if (prev !== null && milestones.some((m) => m.id === prev)) {
        return prev
      }
      return milestones[0]?.id ?? null
    })
  }, [milestones])

  useEffect(() => {
    const onPointerDownCapture = (e: PointerEvent) => {
      const node = e.target
      if (!(node instanceof Element)) {
        return
      }
      if (node.closest('[data-timeline-card]')) {
        return
      }
      setSelectedId(null)
    }
    document.addEventListener('pointerdown', onPointerDownCapture, true)
    return () => document.removeEventListener('pointerdown', onPointerDownCapture, true)
  }, [])

  const showTimeline = !isLoading && !loadError && milestones.length > 0

  return (
    <div className="flex h-full min-h-0 min-w-0 flex-col overflow-hidden rounded-lg border bg-background">
      <TimelineToolbar
        count={milestones.length}
        createLabel={t('createMilestone')}
        creating={creating}
        creatingLabel={t('creatingMilestone')}
        expandLabel={t('timelineExpandLabel')}
        onCreateMilestone={onCreateMilestone}
        settingsLabel={t('timelineSettingsLabel')}
        showCreate={showTimeline}
        title={t('timelineToolbarTitle')}
      />
      {createError && showTimeline ? (
        <p className="border-b px-4 py-2 text-destructive text-sm" role="alert">
          {createError}
        </p>
      ) : null}
      {deleteError && showTimeline ? (
        <p className="border-b px-4 py-2 text-destructive text-sm" role="alert">
          {deleteError}
        </p>
      ) : null}
      {renameError && showTimeline ? (
        <p className="border-b px-4 py-2 text-destructive text-sm" role="alert">
          {renameError}
        </p>
      ) : null}
      {isLoading ? (
        <div
          aria-busy="true"
          aria-live="polite"
          className="flex min-h-0 flex-1 flex-col items-center justify-center gap-3 p-8"
        >
          <Skeleton className="h-8 w-full max-w-lg" />
          <Skeleton className="h-28 w-full max-w-lg" />
          <Skeleton className="h-28 w-full max-w-lg" />
        </div>
      ) : loadError ? (
        <p className="flex flex-1 items-center justify-center p-8 text-center text-destructive text-sm" role="alert">
          {loadError}
        </p>
      ) : milestones.length === 0 ? (
        <div
          aria-labelledby="timeline-empty-heading"
          className="flex min-h-0 flex-1 flex-col items-center justify-center gap-4 p-8 text-center"
          role="region"
        >
          <div className="max-w-md space-y-2">
            <h3 className="font-medium text-foreground text-lg" id="timeline-empty-heading">
              {t('timelineEmptyTitle')}
            </h3>
            <p className="text-muted-foreground text-sm">{t('timelineEmptyDescription')}</p>
          </div>
          <Button
            disabled={creating}
            onClick={() => void onCreateMilestone()}
            size="default"
            type="button"
          >
            {creating ? t('creatingMilestone') : t('createMilestone')}
          </Button>
          {createError ? (
            <p className="max-w-md text-destructive text-sm" role="alert">
              {createError}
            </p>
          ) : null}
        </div>
      ) : (
        <TimelineBody
          collapseDetailsLabel={t('milestoneCollapseDetails')}
          deleteButtonLabel={t('deleteMilestone')}
          deleteMilestoneAriaLabel={t('deleteMilestoneAriaLabel')}
          deletingMilestoneId={deletingMilestoneId}
          expandDetailsLabel={t('milestoneExpandDetails')}
          listLabel={t('timelineListLabel')}
          milestones={milestones}
          onDeleteMilestone={onDeleteMilestone}
          onRenameMilestone={onRenameMilestone}
          onSelectMilestone={setSelectedId}
          renamingMilestoneId={renamingMilestoneId}
          selectedId={selectedId}
          statusLabels={{
            complete: t('milestoneStatusComplete'),
            empty: t('milestoneStatusEmpty'),
            pending: t('milestoneStatusPending'),
          }}
        />
      )}
    </div>
  )
}
