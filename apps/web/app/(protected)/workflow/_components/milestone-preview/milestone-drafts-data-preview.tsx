'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { useTranslations } from 'next-intl'

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@workspace/ui/components/alert-dialog'
import { Button, buttonVariants } from '@workspace/ui/components/button'
import { Field, FieldLabel } from '@workspace/ui/components/field'
import { Input } from '@workspace/ui/components/input'
import { cn } from '@workspace/ui/lib/utils'

import {
  MarkdownEditField,
  type MarkdownEditFieldManualSave,
} from '@/components/markdown-edit-field'
import type { FieldSaveStatusVariant } from '@/components/field-save-status'
import type { DraftItem, DraftsMilestoneData } from '@/lib/graphql/node-schemas'
import { draftListTitle } from '@/lib/milestones/drafts'

import { useTimelineActions, useTimelineWorkspaceState } from '../timeline-context'

import {
  MilestonePreviewListDetailShell,
  MilestonePreviewListRow,
  useMilestonePreviewSelection,
} from './milestone-preview-list-detail'
import { milestonePreviewTypography as mp } from './milestone-preview-typography'

export type MilestoneDraftsDataPreviewProps = {
  milestoneId: string
  data: DraftsMilestoneData
}

const DETAIL_TITLE_ID = 'drafts-detail-title'

export function MilestoneDraftsDataPreview({ milestoneId, data }: MilestoneDraftsDataPreviewProps) {
  const t = useTranslations('analytics.workflows.chat')
  const { onUpdateMilestoneData } = useTimelineActions()
  const {
    milestoneState: { savingDataMilestoneId },
    errors: { milestoneDataError },
  } = useTimelineWorkspaceState()

  const drafts = data.drafts
  const { selectedId, select, clear } = useMilestonePreviewSelection(drafts)
  const selectedDraft = useMemo(
    () => drafts.find((draft) => draft.id === selectedId) ?? null,
    [drafts, selectedId],
  )
  const selectedDraftId = selectedDraft?.id
  const selectedDraftName = selectedDraft?.name
  const selectedDraftBody = selectedDraft?.body

  const [draftName, setDraftName] = useState('')
  const [draftBody, setDraftBody] = useState('')
  const [saveStatus, setSaveStatus] = useState<FieldSaveStatusVariant>('saved')
  const isSaving = savingDataMilestoneId === milestoneId

  useEffect(() => {
    if (
      selectedDraftId == null ||
      selectedDraftName === undefined ||
      selectedDraftBody === undefined
    ) {
      return
    }
    setDraftName(selectedDraftName)
    setDraftBody(selectedDraftBody)
    setSaveStatus('saved')
  }, [selectedDraftId, selectedDraftName, selectedDraftBody])

  const persistDrafts = useCallback(
    async (nextDrafts: DraftItem[]): Promise<boolean> => {
      return onUpdateMilestoneData(milestoneId, { drafts: nextDrafts })
    },
    [milestoneId, onUpdateMilestoneData],
  )

  const handleAddDraft = useCallback(async () => {
    const newDraft: DraftItem = { id: crypto.randomUUID(), name: '', body: '' }
    const ok = await persistDrafts([...drafts, newDraft])
    if (ok) {
      select(newDraft.id)
    }
  }, [persistDrafts, select, drafts])

  const handleSave = useCallback(async () => {
    if (!selectedDraft) {
      return
    }
    setSaveStatus('saving')
    const nextDrafts = drafts.map((draft) =>
      draft.id === selectedDraft.id ? { ...draft, name: draftName, body: draftBody } : draft,
    )
    const ok = await persistDrafts(nextDrafts)
    setSaveStatus(ok ? 'saved' : 'unsaved')
  }, [draftBody, draftName, persistDrafts, selectedDraft, drafts])

  const handleDelete = useCallback(async () => {
    if (!selectedDraft) {
      return
    }
    const ok = await persistDrafts(drafts.filter((draft) => draft.id !== selectedDraft.id))
    if (ok) {
      clear()
    }
  }, [clear, persistDrafts, selectedDraft, drafts])

  const markUnsaved = useCallback(() => {
    setSaveStatus('unsaved')
  }, [])

  const untitledLabel = t('milestonePreset.drafts.previewUntitledDraft')
  const detailTitle = selectedDraft
    ? draftListTitle({ name: draftName, body: draftBody || selectedDraft.body }, untitledLabel)
    : untitledLabel

  const manualSave: MarkdownEditFieldManualSave = {
    onSave: () => {
      void handleSave()
    },
    status: isSaving ? 'saving' : saveStatus,
    messages: {
      saving: t('fieldSaveStatusSaving'),
      saved: t('fieldSaveStatusSaved'),
      unsaved: t('fieldSaveStatusUnsaved'),
    },
  }

  const list = (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <p className={mp.sectionTitle}>{t('milestonePreset.drafts.title')}</p>
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={isSaving}
          onClick={() => {
            void handleAddDraft()
          }}
        >
          <Plus data-icon="inline-start" />
          {t('milestonePreset.drafts.previewAddDraft')}
        </Button>
      </div>
      {drafts.length === 0 ? (
        <div className="space-y-1.5 rounded-lg border border-dashed border-border/80 bg-muted/20 px-3 py-4">
          <p className="text-base font-semibold text-foreground">
            {t('milestonePreset.drafts.previewEmptyTitle')}
          </p>
          <p className="text-sm leading-relaxed text-muted-foreground">
            {t('milestonePreset.drafts.previewEmptyBody')}
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {drafts.map((draft) => (
            <MilestonePreviewListRow
              key={draft.id}
              title={draftListTitle(draft, untitledLabel)}
              viewDetailsLabel={t('milestonePreset.drafts.previewViewDetails')}
              onSelect={() => select(draft.id)}
            />
          ))}
        </div>
      )}
      {milestoneDataError ? (
        <p className="text-destructive text-sm" role="alert">
          {milestoneDataError}
        </p>
      ) : null}
    </div>
  )

  const detail = selectedDraft ? (
    <div className="flex flex-col gap-4">
      <Field>
        <FieldLabel htmlFor={`draft-name-${selectedDraft.id}`}>
          {t('milestonePreset.drafts.previewNameLabel')}
        </FieldLabel>
        <Input
          id={`draft-name-${selectedDraft.id}`}
          value={draftName}
          disabled={isSaving}
          placeholder={t('milestonePreset.drafts.previewNamePlaceholder')}
          onChange={(e) => {
            setDraftName(e.target.value)
            markUnsaved()
          }}
        />
      </Field>
      <MarkdownEditField
        id={`draft-${selectedDraft.id}`}
        value={draftBody}
        onChange={(value) => {
          setDraftBody(value)
          markUnsaved()
        }}
        disabled={isSaving}
        placeholder={t('milestonePreset.drafts.previewPlaceholder')}
        formatPreset="milestone-data"
        previewTabLabel={t('milestonePreset.drafts.previewPreviewTab')}
        editTabLabel={t('milestonePreset.drafts.previewEditTab')}
        previewEmptyLabel={t('milestonePreset.drafts.previewEmptyMarkdown')}
        manualSave={manualSave}
      />
      <div className="flex justify-end">
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-muted-foreground hover:text-destructive"
              disabled={isSaving}
            >
              <Trash2 data-icon="inline-start" />
              {t('milestonePreset.drafts.previewDeleteDraft')}
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>
                {t('milestonePreset.drafts.previewDeleteConfirmTitle')}
              </AlertDialogTitle>
              <AlertDialogDescription>
                {t('milestonePreset.drafts.previewDeleteConfirmDescription')}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>
                {t('milestonePreset.drafts.previewDeleteCancel')}
              </AlertDialogCancel>
              <AlertDialogAction
                className={cn(buttonVariants({ variant: 'destructive' }))}
                onClick={() => {
                  void handleDelete()
                }}
              >
                {t('milestonePreset.drafts.previewDeleteConfirmAction')}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
      {milestoneDataError ? (
        <p className="text-destructive text-sm" role="alert">
          {milestoneDataError}
        </p>
      ) : null}
    </div>
  ) : null

  return (
    <MilestonePreviewListDetailShell
      selectedId={selectedId}
      backLabel={t('milestonePreset.drafts.previewBackToList')}
      detailTitleId={DETAIL_TITLE_ID}
      detailTitle={detailTitle}
      onBack={clear}
      list={list}
      detail={detail}
    />
  )
}
