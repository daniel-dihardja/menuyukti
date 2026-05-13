'use client'

import type { Dispatch } from 'react'
import { useCallback } from 'react'

import type { MilestoneOpsContext } from './milestone-ops-shared'
import type { WorkflowMilestoneAction } from './workflow-milestone-reducer'

export function useWorkflowExport(
  dispatch: Dispatch<WorkflowMilestoneAction>,
  { workflowId, t }: Pick<MilestoneOpsContext, 'workflowId' | 't'>,
) {
  const handleExportWorkflow = useCallback(async () => {
    dispatch({ type: 'PATCH', patch: { exportError: null, exporting: true } })
    try {
      const res = await fetch(`/api/workflows/${workflowId}/export`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })
      const body = (await res.json().catch(() => null)) as { message?: string } | null
      if (!res.ok) {
        throw new Error(body?.message ?? t('exportError'))
      }
    } catch (err) {
      dispatch({
        type: 'PATCH',
        patch: {
          exportError: err instanceof Error ? err.message : t('exportError'),
        },
      })
    } finally {
      dispatch({ type: 'PATCH', patch: { exporting: false } })
    }
  }, [workflowId, dispatch, t])

  return { handleExportWorkflow }
}
