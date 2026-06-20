'use client'

import { createContext, use, useMemo, type ReactNode } from 'react'

import { useTimelineChat, useTimelineWorkspaceState } from './timeline-context'

const WorkflowChatMentionContext = createContext<string[] | null>(null)

export function WorkflowChatMentionProvider({ children }: { children: ReactNode }) {
  const { milestoneState } = useTimelineWorkspaceState()
  const mentionTitles = useMemo(
    () => milestoneState.milestones.map((m) => m.title),
    [milestoneState.milestones],
  )
  return <WorkflowChatMentionContext value={mentionTitles}>{children}</WorkflowChatMentionContext>
}

export function useWorkflowChatMentionTitles(): string[] | undefined {
  return use(WorkflowChatMentionContext) ?? undefined
}

export function useWorkflowChatMentionItems() {
  const { milestoneState, selectedMilestoneId } = useTimelineWorkspaceState()
  const { isBusy: mentionMenusDisabled } = useTimelineChat()
  const milestones = useMemo(
    () => milestoneState.milestones.map((m) => ({ id: m.id, title: m.title })),
    [milestoneState.milestones],
  )
  return { milestones, selectedMilestoneId, mentionMenusDisabled }
}
