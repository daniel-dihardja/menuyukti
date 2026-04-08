'use client'

import { useCallback, useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import { ChevronDown } from 'lucide-react'

import { FieldSaveStatus } from '@/components/field-save-status'
import { MarkdownEditField } from '@/components/markdown-edit-field'
import { Button } from '@workspace/ui/components/button'
import { Card, CardAction, CardContent, CardHeader, CardTitle } from '@workspace/ui/components/card'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@workspace/ui/components/collapsible'
import { cn } from '@workspace/ui/lib/utils'

export type CampaignGoalEditorProps = {
  campaignId: string
  initialGoal: string | null
}

type ToastState = { kind: 'error'; message: string } | null

export function CampaignGoalEditor({ campaignId, initialGoal }: CampaignGoalEditorProps) {
  const t = useTranslations('analytics.campaigns.workspace')
  const tChat = useTranslations('analytics.campaigns.chat')
  const goalFieldId = `campaign-goal-${campaignId}`
  const goalTitleId = `campaign-goal-title-${campaignId}`

  const [open, setOpen] = useState(true)
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
      const res = await fetch(`/api/campaigns/${encodeURIComponent(campaignId)}`, {
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
  }, [campaignId, draft, lastSaved, saving, showError, t])

  const handleBlur = useCallback(() => {
    void persistGoal()
  }, [persistGoal])

  const saveStatusMessages = {
    saving: tChat('fieldSaveStatusSaving'),
    saved: tChat('fieldSaveStatusSaved'),
    unsaved: tChat('fieldSaveStatusUnsaved'),
  }
  const goalSaveStatus = saving
    ? 'saving'
    : draft !== lastSaved
      ? 'unsaved'
      : 'saved'

  return (
    <Collapsible onOpenChange={setOpen} open={open}>
      <Card
        className={cn(
          'gap-0 border py-4 shadow-none transition-[background-color,box-shadow,border-color]',
          'hover:bg-accent/30',
        )}
      >
        <CardHeader className="gap-1.5 pb-0">
          <CardTitle className="text-base leading-snug" id={goalTitleId}>
            {t('goalLabel')}
          </CardTitle>
          <CardAction>
            <CollapsibleTrigger asChild>
              <Button
                aria-expanded={open}
                aria-label={open ? tChat('milestoneCollapseDetails') : tChat('milestoneExpandDetails')}
                className="size-9 shrink-0"
                size="icon"
                type="button"
                variant="ghost"
              >
                <ChevronDown
                  aria-hidden
                  className={cn(
                    'motion-safe:transition-transform motion-safe:duration-200',
                    open ? 'rotate-180' : 'rotate-0',
                  )}
                />
              </Button>
            </CollapsibleTrigger>
          </CardAction>
        </CardHeader>
        <CollapsibleContent
          aria-labelledby={goalTitleId}
          onClick={(e) => e.stopPropagation()}
          onPointerDown={(e) => e.stopPropagation()}
        >
          <CardContent className="flex flex-col gap-2 border-border/60 border-t px-6 pt-4 pb-0">
            <MarkdownEditField
              disabled={saving}
              editTabLabel={tChat('milestoneDataEditTab')}
              formatPreset="milestone-goal"
              id={goalFieldId}
              onBlur={handleBlur}
              onChange={setDraft}
              placeholder={tChat('milestoneGoalPlaceholder')}
              previewEmptyLabel={tChat('milestoneGoalPreviewEmpty')}
              previewTabLabel={tChat('milestoneDataPreviewTab')}
              textareaClassName="min-h-[120px] resize-y whitespace-pre-wrap"
              value={draft}
            />
            <div className="flex justify-end">
              <FieldSaveStatus
                className="inline-flex"
                messages={saveStatusMessages}
                status={goalSaveStatus}
              />
            </div>

            {toast ? (
              <p className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-destructive text-sm">
                {toast.message}
              </p>
            ) : null}
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  )
}
