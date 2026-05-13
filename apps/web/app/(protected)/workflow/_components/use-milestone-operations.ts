'use client'

import type { Dispatch } from 'react'
import { useMemo } from 'react'

import { useMilestoneCrud } from './use-milestone-crud'
import { useMilestonePatches } from './use-milestone-patches'
import { useMilestoneRun } from './use-milestone-run'
import { useWorkflowExport } from './use-workflow-export'
import type { WorkflowMilestoneAction } from './workflow-milestone-reducer'

export function useMilestoneOperations(
  dispatch: Dispatch<WorkflowMilestoneAction>,
  {
    workflowId,
    locationId,
    t,
  }: {
    workflowId: string
    locationId: number
    /** `useTranslations('analytics.workflows.chat')` */
    t: (key: string) => string
  },
) {
  const ctx = { workflowId, locationId, t }
  const crud = useMilestoneCrud(dispatch, ctx)
  const patches = useMilestonePatches(dispatch, ctx)
  const run = useMilestoneRun(dispatch, ctx)
  const exportOps = useWorkflowExport(dispatch, ctx)

  return useMemo(
    () => ({
      ...crud,
      ...patches,
      ...run,
      ...exportOps,
    }),
    [crud, patches, run, exportOps],
  )
}
