'use client'

import { createContext, use, useMemo, type ReactNode } from 'react'
import { useTranslations } from 'next-intl'

import { useTimelineChat, useTimelineWorkspaceState } from './timeline-context'
import { useWorkflowVisualizationsState } from './workflow-visualizations-context'

const WorkflowChatMentionContext = createContext<string[] | null>(null)

export type WorkflowChatMentionTitle = {
  id: string
  title: string | null | undefined
}

export function WorkflowChatMentionProvider({
  children,
  milestoneTitles,
}: {
  children: ReactNode
  milestoneTitles: ReadonlyArray<WorkflowChatMentionTitle>
}) {
  const { addedIds } = useWorkflowVisualizationsState()
  const tViz = useTranslations('analytics.workflows.visualizations.catalog')

  const mentionTitles = useMemo(() => {
    const titles = milestoneTitles
      .map((m) => m.title?.trim())
      .filter((title): title is string => Boolean(title))
    const visualizationTitles = addedIds.map((id) => tViz(`${id}.title`))
    return [...titles, ...visualizationTitles]
  }, [addedIds, milestoneTitles, tViz])

  return <WorkflowChatMentionContext value={mentionTitles}>{children}</WorkflowChatMentionContext>
}

export function useWorkflowChatMentionTitles(): string[] | undefined {
  return use(WorkflowChatMentionContext) ?? undefined
}

export type VisualizationMentionItem = {
  id: string
  title: string
}

export function useWorkflowChatMentionItems() {
  const { milestoneState, selectedMilestoneId } = useTimelineWorkspaceState()
  const { isBusy: mentionMenusDisabled } = useTimelineChat()
  const { addedIds } = useWorkflowVisualizationsState()
  const tViz = useTranslations('analytics.workflows.visualizations.catalog')

  const milestones = useMemo(
    () => milestoneState.milestones.map((m) => ({ id: m.id, title: m.title })),
    [milestoneState.milestones],
  )

  const visualizations = useMemo(
    (): VisualizationMentionItem[] =>
      addedIds.map((id) => ({
        id,
        title: tViz(`${id}.title`),
      })),
    [addedIds, tViz],
  )

  return { milestones, visualizations, selectedMilestoneId, mentionMenusDisabled }
}
