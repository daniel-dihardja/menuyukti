'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslations } from 'next-intl'
import { Pencil } from 'lucide-react'

import {
  FieldSaveStatus,
  type FieldSaveStatusProps,
  type FieldSaveStatusVariant,
} from '@/components/field-save-status'
import { Alert, AlertDescription } from '@workspace/ui/components/alert'
import { Badge } from '@workspace/ui/components/badge'
import { Button } from '@workspace/ui/components/button'
import { Textarea } from '@workspace/ui/components/textarea'
import { ScrollArea } from '@workspace/ui/components/scroll-area'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@workspace/ui/components/sheet'
import { cn } from '@workspace/ui/lib/utils'

export type CampaignGoalEditorProps = {
  workflowId: string
  initialGoal: string | null
}

type ToastState = { kind: 'error'; message: string } | null

const GOAL_PREVIEW_MAX_LEN = 160

/** One-line preview for the compact bar (strips common markdown from legacy saves). */
function workflowGoalPreview(text: string, maxLength: number): string {
  const trimmed = text.trim()
  if (!trimmed) return ''
  const firstLine = trimmed.split(/\r?\n/).find((line) => line.trim().length > 0) ?? trimmed
  const rough = firstLine
    .replace(/^#{1,6}\s+/, '')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/`+/g, '')
    .replace(/\[(.*?)\]\([^)]*\)/g, '$1')
    .trim()
  if (rough.length <= maxLength) return rough
  return `${rough.slice(0, Math.max(0, maxLength - 1)).trimEnd()}…`
}

function PlainTextGoalSaveFooter({
  disabled,
  messages,
  onSave,
  saveButtonLabel,
  status,
}: {
  disabled: boolean
  messages: FieldSaveStatusProps['messages']
  onSave: () => void
  saveButtonLabel: string
  status: FieldSaveStatusVariant
}) {
  const isSaved = status === 'saved'
  const isSaving = status === 'saving'
  const saveDisabled = disabled || isSaving

  if (isSaved) {
    return (
      <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
        <FieldSaveStatus className="inline-flex" messages={messages} status={status} />
      </div>
    )
  }

  return (
    <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
      <Button
        disabled={saveDisabled}
        onClick={(e) => {
          e.stopPropagation()
          onSave()
        }}
        onPointerDown={(e) => e.stopPropagation()}
        size="sm"
        type="button"
      >
        {saveButtonLabel}
      </Button>
      {isSaving ? (
        <FieldSaveStatus className="inline-flex" messages={messages} status={status} />
      ) : null}
    </div>
  )
}

export function CampaignGoalEditor({ workflowId, initialGoal }: CampaignGoalEditorProps) {
  const t = useTranslations('analytics.campaigns.workspace')
  const tChat = useTranslations('analytics.campaigns.chat')
  const goalFieldId = `workflow-goal-${workflowId}`

  const [sheetOpen, setSheetOpen] = useState(false)
  const [draft, setDraft] = useState(initialGoal ?? '')
  /** Last value persisted to the server (avoids overwriting with stale `initialGoal` after save). */
  const [lastSaved, setLastSaved] = useState(initialGoal ?? '')
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState<ToastState>(null)

  useEffect(() => {
    const next = initialGoal ?? ''
    setDraft(next)
    setLastSaved(next)
  }, [initialGoal])

  const showError = useCallback((message: string) => {
    setToast({ kind: 'error', message })
    window.setTimeout(() => setToast(null), 4200)
  }, [])

  const persistGoal = useCallback(async () => {
    if (saving) {
      return false
    }
    const server = lastSaved
    if (draft === server) {
      return true
    }
    setSaving(true)
    try {
      const res = await fetch(`/api/workflows/${encodeURIComponent(workflowId)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ goal: draft }),
      })
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { message?: string } | null
        showError(body?.message ?? t('goalSaveError'))
        setDraft(server)
        return false
      }
      const updated = (await res.json()) as { data?: { goal?: string } | null }
      const next = updated.data?.goal ?? ''
      setLastSaved(next)
      setDraft(next)
      return true
    } catch {
      showError(t('goalSaveError'))
      setDraft(server)
      return false
    } finally {
      setSaving(false)
    }
  }, [workflowId, draft, lastSaved, saving, showError, t])

  const handleSheetOpenChange = useCallback(
    (next: boolean) => {
      if (!next) {
        void persistGoal()
      }
      setSheetOpen(next)
    },
    [persistGoal],
  )

  const saveStatusMessages = useMemo(
    () => ({
      saving: tChat('fieldSaveStatusSaving'),
      saved: tChat('fieldSaveStatusSaved'),
      unsaved: tChat('fieldSaveStatusUnsaved'),
    }),
    [tChat],
  )
  const goalSaveStatus: FieldSaveStatusVariant = saving
    ? 'saving'
    : draft !== lastSaved
      ? 'unsaved'
      : 'saved'

  const hasSavedGoal = lastSaved.trim().length > 0
  const previewText = hasSavedGoal
    ? workflowGoalPreview(lastSaved, GOAL_PREVIEW_MAX_LEN)
    : t('goalPreviewEmpty')

  return (
    <div className="flex min-w-0 flex-col gap-2">
      <div
        className={cn(
          'flex min-w-0 flex-col gap-3 rounded-lg border bg-card/30 py-4 pr-4 pl-4 shadow-none transition-[background-color,box-shadow,border-color]',
          'sm:flex-row sm:items-center sm:gap-4',
          'hover:bg-accent/30',
        )}
      >
        <div className="min-w-0 flex-1 flex flex-col gap-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="font-medium text-base leading-snug">{t('goalLabel')}</h2>
            {!hasSavedGoal ? <Badge variant="secondary">{t('goalNotSetBadge')}</Badge> : null}
          </div>
          <p
            className={cn(
              'text-sm leading-snug break-words',
              hasSavedGoal ? 'text-muted-foreground line-clamp-2' : 'text-muted-foreground italic',
            )}
          >
            {previewText}
          </p>
        </div>
        <Button
          aria-label={t('goalEditAriaLabel')}
          className="w-full shrink-0 sm:w-auto"
          onClick={() => setSheetOpen(true)}
          type="button"
          variant="outline"
        >
          <Pencil aria-hidden data-icon="inline-start" />
          {t('goalEditButton')}
        </Button>
      </div>

      {toast ? (
        <Alert variant="destructive">
          <AlertDescription>{toast.message}</AlertDescription>
        </Alert>
      ) : null}

      <Sheet onOpenChange={handleSheetOpenChange} open={sheetOpen}>
        <SheetContent className="flex w-full flex-col gap-0 p-0 sm:max-w-2xl">
          <SheetHeader className="border-b px-6 py-4 text-left">
            <SheetTitle>{t('goalSheetTitle')}</SheetTitle>
            <SheetDescription>{t('goalSheetDescription')}</SheetDescription>
          </SheetHeader>
          <ScrollArea className="min-h-0 flex-1 px-4 py-4">
            <div className="flex flex-col gap-3 pr-2 pb-2">
              <Textarea
                className="min-h-[min(280px,40vh)] resize-y whitespace-pre-wrap"
                disabled={saving}
                id={goalFieldId}
                onChange={(e) => setDraft(e.target.value)}
                placeholder={tChat('milestoneGoalPlaceholder')}
                value={draft}
              />
              <PlainTextGoalSaveFooter
                disabled={saving}
                messages={saveStatusMessages}
                onSave={() => {
                  void persistGoal()
                }}
                saveButtonLabel={tChat('fieldSaveButton')}
                status={goalSaveStatus}
              />
            </div>
          </ScrollArea>
        </SheetContent>
      </Sheet>
    </div>
  )
}
