'use client'

import { useEffect, useRef, useState } from 'react'
import { useTranslations } from 'next-intl'
import { Check, Pencil } from 'lucide-react'

import { getAgentThread } from '@/lib/chat/agent-thread-registry'
import { useCompactLayout } from '@/hooks/use-desktop-layout'
import { useSalesReportLabel } from '@/hooks/use-sales-report-label'
import { BreadcrumbPage } from '@workspace/ui/components/breadcrumb'
import { Button } from '@workspace/ui/components/button'
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from '@workspace/ui/components/input-group'

import { useAgentThreadTitleEdit } from './use-agent-thread-title-edit'

type AgentThreadBreadcrumbTitleProps = {
  threadId: string
}

export function AgentThreadBreadcrumbTitle({ threadId }: AgentThreadBreadcrumbTitleProps) {
  const t = useTranslations('agentChat')
  const compact = useCompactLayout()
  const [hydrated, setHydrated] = useState(false)
  const [storedTitle, setStoredTitle] = useState<string | null>(null)
  const [locationId, setLocationId] = useState<number | null>(null)
  const [analyticsRunId, setAnalyticsRunId] = useState<number | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const { editingId, draftTitle, editContainerRef, startEdit, saveEdit, setDraftTitle } =
    useAgentThreadTitleEdit()

  const editing = editingId === threadId
  const salesReportLabel = useSalesReportLabel(
    compact && hydrated ? locationId : null,
    analyticsRunId,
  )

  useEffect(() => {
    const record = getAgentThread(threadId)
    setStoredTitle(record?.title ?? null)
    setLocationId(record?.locationId ?? null)
    setAnalyticsRunId(record?.analyticsRunId ?? null)
    setHydrated(true)
  }, [threadId])

  useEffect(() => {
    if (!editing) return
    const input = inputRef.current
    if (!input) return
    input.focus()
    input.select()
  }, [editing])

  const displayTitle = storedTitle?.trim() || t('untitledThread', { id: threadId.slice(0, 8) })

  const handleSave = () => {
    const next = saveEdit(storedTitle)
    if (next !== undefined) {
      setStoredTitle(next)
    }
  }

  if (!hydrated) {
    return (
      <BreadcrumbPage className="max-w-[160px] truncate lg:max-w-[min(100%,24rem)]">
        {t('untitledThread', { id: threadId.slice(0, 8) })}
      </BreadcrumbPage>
    )
  }

  if (editing) {
    return (
      <div ref={editContainerRef} className="min-w-0 max-w-[min(100%,16rem)]">
        <InputGroup className="h-8 min-w-0">
          <InputGroupInput
            ref={inputRef}
            aria-label={t('threadTitleLabel')}
            name="threadTitle"
            onChange={(e) => setDraftTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                handleSave()
              }
            }}
            value={draftTitle}
          />
          <InputGroupAddon align="inline-end">
            <InputGroupButton
              aria-label={t('saveThreadTitleAria')}
              onClick={handleSave}
              size="icon-xs"
            >
              <Check />
            </InputGroupButton>
          </InputGroupAddon>
        </InputGroup>
      </div>
    )
  }

  return (
    <div className="flex min-w-0 items-center gap-1">
      <div className="min-w-0">
        <BreadcrumbPage
          className="max-w-[120px] truncate sm:max-w-[160px] lg:max-w-[min(100%,24rem)]"
          title={displayTitle}
        >
          {displayTitle}
        </BreadcrumbPage>
        {compact ? (
          <p
            className="max-w-[140px] truncate text-muted-foreground text-xs sm:max-w-[180px]"
            title={`${t('salesReportDetailLabel')}: ${salesReportLabel}`}
          >
            {salesReportLabel}
          </p>
        ) : null}
      </div>
      <Button
        aria-label={t('editThreadTitleAria')}
        className="shrink-0"
        onClick={() => startEdit(threadId, storedTitle)}
        size="icon-sm"
        type="button"
        variant="ghost"
      >
        <Pencil />
      </Button>
    </div>
  )
}
