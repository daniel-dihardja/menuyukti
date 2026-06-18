'use client'

import type { Dispatch } from 'react'
import { useMemo } from 'react'

import { useMilestoneCrud } from './use-milestone-crud'
import { useMilestonePatches } from './use-milestone-patches'
import { useMilestoneRun } from './use-milestone-run'
import type { TimelineMilestone } from './timeline/types'
import type { WorkflowMilestoneAction } from './workflow-milestone-reducer'

export function useMilestoneOperations(
  dispatch: Dispatch<WorkflowMilestoneAction>,
  {
    workflowId,
    locationId,
    t,
    getMilestoneSnapshot,
  }: {
    workflowId: string
    locationId: number
    /** `useTranslations('analytics.workflows.chat')` */
    t: (key: string) => string
    getMilestoneSnapshot?: (milestoneId: string) => TimelineMilestone | undefined
  },
) {
  const ctx = { workflowId, locationId, t, getMilestoneSnapshot }
  const crud = useMilestoneCrud(dispatch, ctx)
  const patches = useMilestonePatches(dispatch, ctx)
  const run = useMilestoneRun(dispatch, ctx)

  return useMemo(
    () => ({
      ...crud,
      ...patches,
      ...run,
    }),
    [crud, patches, run],
  )
}
