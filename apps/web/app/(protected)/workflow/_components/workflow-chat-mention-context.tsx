'use client'

import { createContext, use, useMemo, type ReactNode } from 'react'
import { useTranslations } from 'next-intl'

import { useWorkflowVisualizationsState } from './workflow-visualizations-context'

const WorkflowChatMentionContext = createContext<string[] | null>(null)

export function WorkflowChatMentionProvider({
  children,
  chatBusy,
}: {
  children: ReactNode
  chatBusy: boolean
}) {
  const { addedIds } = useWorkflowVisualizationsState()
  const tViz = useTranslations('analytics.workflows.visualizations.catalog')

  const mentionTitles = useMemo(() => {
    return addedIds.map((id) => tViz(`${id}.title`))
  }, [addedIds, tViz])

  return (
    <WorkflowChatMentionBusyContext value={chatBusy}>
      <WorkflowChatMentionContext value={mentionTitles}>{children}</WorkflowChatMentionContext>
    </WorkflowChatMentionBusyContext>
  )
}

const WorkflowChatMentionBusyContext = createContext(false)

export function useWorkflowChatMentionTitles(): string[] | undefined {
  return use(WorkflowChatMentionContext) ?? undefined
}

export type VisualizationMentionItem = {
  id: string
  title: string
}

export function useWorkflowChatMentionItems() {
  const mentionMenusDisabled = use(WorkflowChatMentionBusyContext)
  const { addedIds } = useWorkflowVisualizationsState()
  const tViz = useTranslations('analytics.workflows.visualizations.catalog')

  const visualizations = useMemo(
    (): VisualizationMentionItem[] =>
      addedIds.map((id) => ({
        id,
        title: tViz(`${id}.title`),
      })),
    [addedIds, tViz],
  )

  return {
    visualizations,
    mentionMenusDisabled,
  }
}
