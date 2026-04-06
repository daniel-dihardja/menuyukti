'use client'

import type { UIMessage } from 'ai'
import type { PromptInputMessage } from '@workspace/ui/components/ai-elements/prompt-input'
import {
  Conversation,
  ConversationContent,
  ConversationEmptyState,
  ConversationScrollButton,
} from '@workspace/ui/components/ai-elements/conversation'
import { Message, MessageContent } from '@workspace/ui/components/ai-elements/message'
import {
  PromptInput,
  PromptInputBody,
  PromptInputFooter,
  PromptInputSubmit,
  PromptInputTextarea,
} from '@workspace/ui/components/ai-elements/prompt-input'
import { Button } from '@workspace/ui/components/button'
import { Spinner } from '@workspace/ui/components/spinner'
import { useChat } from '@ai-sdk/react'
import { DefaultChatTransport } from 'ai'
import { useTranslations } from 'next-intl'
import { useCallback, useEffect, useMemo, useState } from 'react'

import type { PassCriteriaRow, PassCriteriaStatus, TimelineMilestone } from './timeline-workspace'
import { TimelineWorkspace } from './timeline-workspace'
import { ChatMessageParts } from './chat-message-parts'
import { milestoneDataSchema } from '@/lib/graphql/node-schemas'

import { milestoneNodeToTimelineMilestone } from './milestone-map'

export type CampaignChatPanelProps = {
  campaignId: string
  initialMilestones: TimelineMilestone[]
  locationId: number
}

export function CampaignChatPanel({ campaignId, initialMilestones, locationId }: CampaignChatPanelProps) {
  const t = useTranslations('analytics.campaigns.chat')
  const [text, setText] = useState('')
  const [milestones, setMilestones] = useState<TimelineMilestone[]>(initialMilestones)
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)
  const [deletingMilestoneId, setDeletingMilestoneId] = useState<string | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [renamingMilestoneId, setRenamingMilestoneId] = useState<string | null>(null)
  const [renameError, setRenameError] = useState<string | null>(null)
  const [savingPassCriteriaMilestoneId, setSavingPassCriteriaMilestoneId] = useState<string | null>(
    null,
  )
  const [passCriteriaError, setPassCriteriaError] = useState<string | null>(null)
  const [savingGoalMilestoneId, setSavingGoalMilestoneId] = useState<string | null>(null)
  const [goalError, setGoalError] = useState<string | null>(null)
  const [savingDataMilestoneId, setSavingDataMilestoneId] = useState<string | null>(null)
  const [milestoneDataError, setMilestoneDataError] = useState<string | null>(null)
  const [moveError, setMoveError] = useState<string | null>(null)
  const [movingMilestoneId, setMovingMilestoneId] = useState<string | null>(null)
  const [runningMilestoneId, setRunningMilestoneId] = useState<string | null>(null)
  /** Current agent graph step from SSE (`fetch_context`, `evaluate_criterion`, …). */
  const [runningStep, setRunningStep] = useState<string | null>(null)
  const [milestoneRunError, setMilestoneRunError] = useState<string | null>(null)

  useEffect(() => {
    setMilestones(initialMilestones)
    setCreateError(null)
    setDeleteError(null)
    setDeletingMilestoneId(null)
    setRenameError(null)
    setRenamingMilestoneId(null)
    setPassCriteriaError(null)
    setSavingPassCriteriaMilestoneId(null)
    setGoalError(null)
    setSavingGoalMilestoneId(null)
    setMilestoneDataError(null)
    setSavingDataMilestoneId(null)
    setMoveError(null)
    setMovingMilestoneId(null)
    setRunningMilestoneId(null)
    setRunningStep(null)
    setMilestoneRunError(null)
  }, [campaignId, initialMilestones])

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: '/api/chat',
        body: { campaignId },
      }),
    [campaignId],
  )

  const { messages, sendMessage, status, stop, error, clearError, regenerate } = useChat({
    transport,
  })

  const handleTextChange = useCallback((event: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(event.target.value)
  }, [])

  const handleSubmit = useCallback(
    async (message: PromptInputMessage) => {
      const hasText = Boolean(message.text?.trim())
      const hasAttachments = Boolean(message.files?.length)

      if (!(hasText || hasAttachments)) {
        return
      }

      const content = message.text?.trim() || 'Sent with attachments'
      setText('')
      await sendMessage({
        text: content,
        ...(message.files?.length ? { files: message.files } : {}),
      })
    },
    [sendMessage],
  )

  const handleRetry = useCallback(async () => {
    clearError()
    await regenerate()
  }, [clearError, regenerate])

  const handleCreateMilestone = useCallback(async () => {
    setCreateError(null)
    setCreating(true)
    try {
      const res = await fetch(`/api/campaigns/${campaignId}/milestones`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })
      const body = (await res.json().catch(() => null)) as
        | { message?: string; id?: string; name?: string; data?: unknown | null }
        | null
      if (!res.ok) {
        throw new Error(body?.message ?? t('milestonesCreateError'))
      }
      const id = body?.id
      const name = body?.name
      if (typeof id === 'string' && typeof name === 'string') {
        const created = { id, name, data: body?.data }
        setMilestones((prev) => [...prev, milestoneNodeToTimelineMilestone(created)])
      }
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : t('milestonesCreateError'))
    } finally {
      setCreating(false)
    }
  }, [campaignId, t])

  const handleDeleteMilestone = useCallback(
    async (milestoneId: string) => {
      setDeleteError(null)
      setDeletingMilestoneId(milestoneId)
      try {
        const res = await fetch(`/api/campaigns/${campaignId}/milestones/${milestoneId}`, {
          method: 'DELETE',
        })
        if (res.status === 204) {
          setMilestones((prev) => prev.filter((m) => m.id !== milestoneId))
          return
        }
        const body = (await res.json().catch(() => null)) as { message?: string } | null
        throw new Error(body?.message ?? t('milestonesDeleteError'))
      } catch (err) {
        setDeleteError(err instanceof Error ? err.message : t('milestonesDeleteError'))
      } finally {
        setDeletingMilestoneId(null)
      }
    },
    [campaignId, t],
  )

  const handleRenameMilestone = useCallback(
    async (milestoneId: string, name: string): Promise<boolean> => {
      setRenameError(null)
      setRenamingMilestoneId(milestoneId)
      try {
        const res = await fetch(`/api/campaigns/${campaignId}/milestones/${milestoneId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name }),
        })
        const body = (await res.json().catch(() => null)) as { message?: string; name?: string } | null
        if (!res.ok) {
          throw new Error(body?.message ?? t('milestonesRenameError'))
        }
        const newName = body?.name
        if (typeof newName === 'string') {
          setMilestones((prev) =>
            prev.map((m) => (m.id === milestoneId ? { ...m, title: newName } : m)),
          )
          return true
        }
        return false
      } catch (err) {
        setRenameError(err instanceof Error ? err.message : t('milestonesRenameError'))
        return false
      } finally {
        setRenamingMilestoneId(null)
      }
    },
    [campaignId, t],
  )

  const handleUpdatePassCriteria = useCallback(
    async (milestoneId: string, passCriteria: PassCriteriaRow[]): Promise<boolean> => {
      setPassCriteriaError(null)
      setSavingPassCriteriaMilestoneId(milestoneId)
      try {
        const res = await fetch(`/api/campaigns/${campaignId}/milestones/${milestoneId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ passCriteria }),
        })
        const body = (await res.json().catch(() => null)) as {
          message?: string
          passCriteria?: PassCriteriaRow[]
        } | null
        if (!res.ok) {
          throw new Error(body?.message ?? t('milestonesPassCriteriaError'))
        }
        const nextCriteria = body?.passCriteria ?? passCriteria
        setMilestones((prev) =>
          prev.map((m) => (m.id === milestoneId ? { ...m, passCriteria: nextCriteria } : m)),
        )
        return true
      } catch (err) {
        setPassCriteriaError(err instanceof Error ? err.message : t('milestonesPassCriteriaError'))
        return false
      } finally {
        setSavingPassCriteriaMilestoneId(null)
      }
    },
    [campaignId, t],
  )

  const handleUpdateMilestoneGoal = useCallback(
    async (milestoneId: string, goal: string): Promise<boolean> => {
      setGoalError(null)
      setSavingGoalMilestoneId(milestoneId)
      try {
        const res = await fetch(`/api/campaigns/${campaignId}/milestones/${milestoneId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ goal }),
        })
        const body = (await res.json().catch(() => null)) as {
          message?: string
          data?: unknown
        } | null
        if (!res.ok) {
          throw new Error(body?.message ?? t('milestonesGoalError'))
        }
        const rawData = body?.data
        let nextGoal: string | undefined
        if (rawData != null && typeof rawData === 'object') {
          const parsed = milestoneDataSchema.safeParse(rawData)
          if (parsed.success) {
            nextGoal = parsed.data.goal
          }
        }
        setMilestones((prev) =>
          prev.map((m) => (m.id === milestoneId ? { ...m, goal: nextGoal ?? goal } : m)),
        )
        return true
      } catch (err) {
        setGoalError(err instanceof Error ? err.message : t('milestonesGoalError'))
        return false
      } finally {
        setSavingGoalMilestoneId(null)
      }
    },
    [campaignId, t],
  )

  const handleUpdateMilestoneData = useCallback(
    async (milestoneId: string, milestoneData: string): Promise<boolean> => {
      setMilestoneDataError(null)
      setSavingDataMilestoneId(milestoneId)
      try {
        const res = await fetch(`/api/campaigns/${campaignId}/milestones/${milestoneId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ milestoneData }),
        })
        const body = (await res.json().catch(() => null)) as { message?: string } | null
        if (!res.ok) {
          throw new Error(body?.message ?? t('milestonesMilestoneDataError'))
        }
        setMilestones((prev) =>
          prev.map((m) => (m.id === milestoneId ? { ...m, data: milestoneData } : m)),
        )
        return true
      } catch (err) {
        setMilestoneDataError(err instanceof Error ? err.message : t('milestonesMilestoneDataError'))
        return false
      } finally {
        setSavingDataMilestoneId(null)
      }
    },
    [campaignId, t],
  )

  const handleRunMilestone = useCallback(
    async (milestoneId: string) => {
      setMilestoneRunError(null)
      setRunningMilestoneId(milestoneId)
      setRunningStep('fetch_context')
      setMilestones((prev) =>
        prev.map((m) => (m.id === milestoneId ? { ...m, status: 'pending' as const } : m)),
      )
      try {
        const res = await fetch(`/api/campaigns/${campaignId}/milestones/${milestoneId}/run`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ locationId }),
        })
        if (!res.ok) {
          const body = (await res.json().catch(() => null)) as { error?: string } | null
          throw new Error(body?.error ?? t('milestoneRunError'))
        }
        if (!res.body) {
          throw new Error(t('milestoneRunError'))
        }
        const reader = res.body.getReader()
        const decoder = new TextDecoder()
        let buffer = ''
        while (true) {
          const { done, value } = await reader.read()
          if (done) {
            break
          }
          buffer += decoder.decode(value, { stream: true })
          const blocks = buffer.split('\n\n')
          buffer = blocks.pop() ?? ''
          for (const block of blocks) {
            const m = block.match(/^data: (.+)$/m)
            const raw = m?.[1]?.trim()
            if (!raw) {
              continue
            }
            let payload: Record<string, unknown>
            try {
              payload = JSON.parse(raw) as Record<string, unknown>
            } catch {
              continue
            }
            if (typeof payload.error === 'string') {
              throw new Error(payload.error)
            }
            if (typeof payload.step === 'string') {
              setRunningStep(payload.step)
            }
            if (payload.done === true) {
              const summary = typeof payload.summary === 'string' ? payload.summary : ''
              const criteriaRaw = payload.criteria
              const criteriaList = Array.isArray(criteriaRaw)
                ? criteriaRaw.filter((c): c is { id?: unknown; status?: unknown } => c != null && typeof c === 'object')
                : []
              setMilestones((prev) =>
                prev.map((milestone) => {
                  if (milestone.id !== milestoneId) {
                    return milestone
                  }
                  const idToStatus = new Map(
                    criteriaList.map((c) => [String(c.id ?? ''), String(c.status ?? '')]),
                  )
                  const nextPass = milestone.passCriteria.map((row) => {
                    if (!row.id) {
                      return row
                    }
                    const st = idToStatus.get(row.id)
                    if (st === 'pass' || st === 'fail') {
                      return { ...row, status: st as PassCriteriaStatus }
                    }
                    return row
                  })
                  return {
                    ...milestone,
                    status: 'complete' as const,
                    passCriteria: nextPass,
                    resultMarkdown: summary || milestone.resultMarkdown,
                  }
                }),
              )
            }
            if (payload.step === 'evaluate_criterion' && typeof payload.id === 'string') {
              const st = payload.status
              if (st === 'pass' || st === 'fail') {
                const status = st as PassCriteriaStatus
                setMilestones((prev) =>
                  prev.map((milestone) => {
                    if (milestone.id !== milestoneId) {
                      return milestone
                    }
                    return {
                      ...milestone,
                      passCriteria: milestone.passCriteria.map((row) =>
                        row.id === payload.id ? { ...row, status } : row,
                      ),
                    }
                  }),
                )
              }
            }
          }
        }
      } catch (err) {
        setMilestoneRunError(err instanceof Error ? err.message : t('milestoneRunError'))
        setMilestones((prev) =>
          prev.map((m) => (m.id === milestoneId ? { ...m, status: 'empty' as const } : m)),
        )
      } finally {
        setRunningMilestoneId(null)
        setRunningStep(null)
      }
    },
    [campaignId, locationId, t],
  )

  const handleMoveMilestone = useCallback(
    async (milestoneId: string, direction: 'up' | 'down') => {
      setMoveError(null)
      let snapshot: TimelineMilestone[] | null = null
      setMilestones((prev) => {
        snapshot = prev
        const idx = prev.findIndex((m) => m.id === milestoneId)
        if (idx === -1) {
          return prev
        }
        const j = direction === 'up' ? idx - 1 : idx + 1
        if (j < 0 || j >= prev.length) {
          return prev
        }
        const next = [...prev]
        const a = next[idx]
        const b = next[j]
        if (a && b) {
          next[idx] = b
          next[j] = a
        }
        return next
      })
      setMovingMilestoneId(milestoneId)
      try {
        const res = await fetch(`/api/campaigns/${campaignId}/milestones/${milestoneId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ move: direction }),
        })
        if (!res.ok) {
          const body = (await res.json().catch(() => null)) as { message?: string } | null
          throw new Error(body?.message ?? t('milestonesMoveError'))
        }
      } catch (err) {
        if (snapshot) {
          setMilestones(snapshot)
        }
        setMoveError(err instanceof Error ? err.message : t('milestonesMoveError'))
      } finally {
        setMovingMilestoneId(null)
      }
    },
    [campaignId, t],
  )

  const isSubmitDisabled = !text.trim() || status === 'streaming' || status === 'submitted'
  const isChatBusy = status === 'streaming' || status === 'submitted'

  const visibleMessages = messages.filter((msg) => msg.role !== 'system')

  return (
    <div className="grid h-full min-h-0 flex-1 grid-cols-3 grid-rows-[minmax(0,1fr)] gap-4 overflow-hidden">
      <div className="relative col-span-1 flex min-h-0 flex-col divide-y overflow-hidden rounded-lg border">
        <Conversation aria-live="polite">
          <ConversationContent>
            {error ? (
              <div
                aria-live="polite"
                className="rounded-md border border-destructive/50 bg-destructive/10 p-4 text-destructive text-sm"
                role="alert"
              >
                <p className="font-medium">{t('errorTitle')}</p>
                <p className="mt-1 text-muted-foreground">{error.message}</p>
                <Button
                  className="mt-3"
                  onClick={() => void handleRetry()}
                  size="sm"
                  type="button"
                  variant="outline"
                >
                  {t('retry')}
                </Button>
              </div>
            ) : null}
            {messages.length === 0 && !error ? (
              <ConversationEmptyState description={t('emptyDescription')} title={t('emptyTitle')} />
            ) : (
              <>
                {visibleMessages.map((msg) => {
                  const isLast = msg === visibleMessages[visibleMessages.length - 1]
                  const isActiveStream =
                    isLast && (status === 'submitted' || status === 'streaming')
                  const msgText = getMessageText(msg)
                  const showFallbackSpinner =
                    isActiveStream && msg.role === 'assistant' && msgText.length === 0

                  return (
                    <Message from={msg.role} key={msg.id}>
                      <MessageContent>
                        {showFallbackSpinner ? (
                          <div className="flex items-center gap-2 text-muted-foreground text-sm">
                            <Spinner />
                            <span>{t('thinking')}</span>
                          </div>
                        ) : (
                          <ChatMessageParts message={msg} role={msg.role} />
                        )}
                      </MessageContent>
                    </Message>
                  )
                })}
                {visibleMessages.length > 0 &&
                  (status === 'submitted' || status === 'streaming') &&
                  visibleMessages[visibleMessages.length - 1]?.role === 'user' && (
                    <Message from="assistant">
                      <MessageContent>
                        <div className="flex items-center gap-2 text-muted-foreground text-sm">
                          <Spinner />
                          <span>{t('thinking')}</span>
                        </div>
                      </MessageContent>
                    </Message>
                  )}
              </>
            )}
          </ConversationContent>
          <ConversationScrollButton />
        </Conversation>
        <div className="shrink-0 p-4">
          <PromptInput globalDrop multiple onSubmit={handleSubmit}>
            <PromptInputBody>
              <PromptInputTextarea
                placeholder={t('placeholder')}
                value={text}
                onChange={handleTextChange}
              />
            </PromptInputBody>
            <PromptInputFooter>
              <PromptInputSubmit disabled={isSubmitDisabled} status={status} onStop={stop} />
            </PromptInputFooter>
          </PromptInput>
        </div>
      </div>

      <div className="col-span-2 flex h-full min-h-0 min-w-0 flex-col overflow-hidden">
        <TimelineWorkspace
          createError={createError}
          creating={creating}
          deleteError={deleteError}
          deletingMilestoneId={deletingMilestoneId}
          goalError={goalError}
          isChatBusy={isChatBusy}
          milestoneDataError={milestoneDataError}
          milestoneRunError={milestoneRunError}
          milestones={milestones}
          moveError={moveError}
          movingMilestoneId={movingMilestoneId}
          onCreateMilestone={handleCreateMilestone}
          onDeleteMilestone={handleDeleteMilestone}
          onMoveMilestone={handleMoveMilestone}
          onRenameMilestone={handleRenameMilestone}
          onRunMilestone={handleRunMilestone}
          onUpdateMilestoneData={handleUpdateMilestoneData}
          onUpdateMilestoneGoal={handleUpdateMilestoneGoal}
          onUpdatePassCriteria={handleUpdatePassCriteria}
          passCriteriaError={passCriteriaError}
          renameError={renameError}
          renamingMilestoneId={renamingMilestoneId}
          runningMilestoneId={runningMilestoneId}
          runningStep={runningStep}
          savingDataMilestoneId={savingDataMilestoneId}
          savingGoalMilestoneId={savingGoalMilestoneId}
          savingPassCriteriaMilestoneId={savingPassCriteriaMilestoneId}
        />
      </div>
    </div>
  )
}

function getMessageText(message: UIMessage): string {
  return (
    message.parts
      ?.filter((p): p is { type: 'text'; text: string } => p.type === 'text')
      .map((p) => p.text)
      .join('') ?? ''
  )
}
