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
import { Card, CardDescription, CardHeader, CardTitle } from '@workspace/ui/components/card'
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from '@workspace/ui/components/resizable'
import { Spinner } from '@workspace/ui/components/spinner'
import { useChat } from '@ai-sdk/react'
import { DefaultChatTransport } from 'ai'
import { useTranslations } from 'next-intl'
import { useCallback, useEffect, useMemo, useReducer, useState } from 'react'

import type { TimelineMilestone } from './timeline-workspace'
import { TimelineWorkspace } from './timeline-workspace'
import { ChatMessageParts } from './chat-message-parts'

import {
  campaignMilestoneReducer,
  createInitialCampaignMilestoneUiState,
} from './campaign-milestone-reducer'
import { TimelineProvider, type TimelineContextValue } from './timeline-context'
import { useMilestoneOperations } from './use-milestone-operations'

export type CampaignChatPanelProps = {
  campaignId: string
  initialMilestones: TimelineMilestone[]
  locationId: number
}

export function CampaignChatPanel({
  campaignId,
  initialMilestones,
  locationId,
}: CampaignChatPanelProps) {
  const t = useTranslations('analytics.campaigns.chat')
  const tWorkspace = useTranslations('analytics.campaigns.workspace')
  const [text, setText] = useState('')

  const [milestoneUi, dispatch] = useReducer(
    campaignMilestoneReducer,
    initialMilestones,
    createInitialCampaignMilestoneUiState,
  )

  useEffect(() => {
    dispatch({ type: 'RESET', milestones: initialMilestones })
  }, [campaignId, initialMilestones])

  const ops = useMilestoneOperations(dispatch, { campaignId, locationId, t })

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

  const isSubmitDisabled = !text.trim() || status === 'streaming' || status === 'submitted'
  const isChatBusy = status === 'streaming' || status === 'submitted'

  const timelineValue = useMemo<TimelineContextValue>(
    () => ({
      ...milestoneUi,
      campaignId,
      isChatBusy,
      onCreateMilestone: ops.handleCreateMilestone,
      onDeleteMilestone: ops.handleDeleteMilestone,
      onRenameMilestone: ops.handleRenameMilestone,
      onMoveMilestone: ops.handleMoveMilestone,
      onUpdatePassCriteria: ops.handleUpdatePassCriteria,
      onUpdateMilestoneGoal: ops.handleUpdateMilestoneGoal,
      onUpdateMilestoneData: ops.handleUpdateMilestoneData,
      onSetMilestoneDataTask: ops.handleSetMilestoneDataTask,
      onPrepareMilestone: ops.handlePrepareMilestone,
      onRunMilestone: ops.handleRunMilestone,
      onExport: ops.handleExportCampaign,
    }),
    [campaignId, milestoneUi, isChatBusy, ops],
  )

  const visibleMessages = messages.filter((msg) => msg.role !== 'system')

  return (
    <TimelineProvider value={timelineValue}>
      <ResizablePanelGroup className="h-full min-h-0 flex-1 overflow-hidden rounded-lg border">
        <ResizablePanel defaultSize={40} minSize={28}>
          <div className="flex h-full min-h-0 min-w-0 flex-col overflow-hidden">
            <TimelineWorkspace />
          </div>
        </ResizablePanel>

        <ResizableHandle withHandle />

        <ResizablePanel defaultSize={22} minSize={16}>
          <div className="flex h-full min-h-0 min-w-0 flex-col overflow-hidden bg-muted/20 p-3">
            <Card className="flex h-full min-h-0 flex-col overflow-hidden border-dashed">
              <CardHeader className="shrink-0">
                <CardTitle className="text-base">{tWorkspace('previewTitle')}</CardTitle>
                <CardDescription className="text-pretty">
                  {tWorkspace('previewDescription')}
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        </ResizablePanel>

        <ResizableHandle withHandle />

        <ResizablePanel defaultSize={38} minSize={22}>
          <div className="relative flex h-full min-h-0 min-w-0 flex-col divide-y overflow-hidden">
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
                  <ConversationEmptyState
                    description={t('emptyDescription')}
                    title={t('emptyTitle')}
                  />
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
        </ResizablePanel>
      </ResizablePanelGroup>
    </TimelineProvider>
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
