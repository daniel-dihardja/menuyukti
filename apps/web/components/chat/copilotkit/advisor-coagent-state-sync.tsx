'use client'

import { useCoAgent } from '@copilotkit/react-core'
import { useEffect, useRef } from 'react'

import { useAdvisorChatKitShell } from '@/components/chat/chatkit/advisor-chatkit-shell-context'
import {
  ADVISOR_COAGENT_NAME,
  advisorCoAgentInitialState,
  type AdvisorCoAgentState,
} from '@/lib/chat/advisor-coagent-state'
import { isAdvisorWorkspaceTabId } from '@/lib/chat/advisor-workspace-tabs'

/**
 * Bidirectional sync between advisor shell (right rail) and CopilotKit CoAgent state.
 */
export function AdvisorCoAgentStateSync() {
  const shell = useAdvisorChatKitShell()
  const { state, setState } = useCoAgent<AdvisorCoAgentState>({
    name: ADVISOR_COAGENT_NAME,
    initialState: advisorCoAgentInitialState({
      locationId: shell.locationId,
      analyticsRunId: shell.analyticsRunId,
      workspaceTab: shell.workspaceTab,
      chatMode: shell.chatMode,
    }),
  })

  const lastPushed = useRef('')
  const applyingFromAgent = useRef(false)

  // Shell → agent (operator changed venue / report / tab / mode)
  useEffect(() => {
    if (applyingFromAgent.current) return
    const next: AdvisorCoAgentState = {
      locationId: shell.locationId,
      analyticsRunId: shell.analyticsRunId,
      workspaceTab: shell.workspaceTab,
      chatMode: shell.chatMode,
    }
    const key = JSON.stringify(next)
    if (key === lastPushed.current) return
    lastPushed.current = key
    setState(next)
  }, [shell.locationId, shell.analyticsRunId, shell.workspaceTab, shell.chatMode, setState])

  // Agent → shell (agent updated shared state). chatMode is read-only from agent
  // so mode picker / thread-binding semantics stay TASK-10 consistent.
  useEffect(() => {
    if (!state) return
    applyingFromAgent.current = true
    try {
      if (
        typeof state.locationId === 'number' &&
        state.locationId > 0 &&
        state.locationId !== shell.locationId
      ) {
        shell.setLocationId(state.locationId)
      }
      if (
        (state.analyticsRunId === null || typeof state.analyticsRunId === 'number') &&
        state.analyticsRunId !== shell.analyticsRunId
      ) {
        shell.setAnalyticsRunId(state.analyticsRunId)
      }
      if (
        typeof state.workspaceTab === 'string' &&
        isAdvisorWorkspaceTabId(state.workspaceTab) &&
        state.workspaceTab !== shell.workspaceTab
      ) {
        shell.setWorkspaceTab(state.workspaceTab)
      }
      lastPushed.current = JSON.stringify({
        locationId: state.locationId,
        analyticsRunId: state.analyticsRunId,
        workspaceTab: state.workspaceTab,
        chatMode: shell.chatMode,
      })
    } finally {
      applyingFromAgent.current = false
    }
    // Intentionally depend on state fields + current shell values, not the whole shell object.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- setters are stable
  }, [
    state?.locationId,
    state?.analyticsRunId,
    state?.workspaceTab,
    shell.locationId,
    shell.analyticsRunId,
    shell.workspaceTab,
    shell.chatMode,
    shell.setLocationId,
    shell.setAnalyticsRunId,
    shell.setWorkspaceTab,
  ])

  return null
}
