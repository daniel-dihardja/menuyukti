'use client'

import type { Dispatch } from 'react'
import { useCallback } from 'react'

import { apiFetch } from '@/lib/api/client-fetch'
import { milestoneNodeSchema } from '@/lib/graphql/node-schemas'
import {
  getMilestonePresetCreateFields,
  type MilestonePresetId,
} from '@/lib/milestones/preset-definitions'

import { deriveMilestoneRailStatus, milestoneNodeToTimelineMilestone } from './milestone-map'
import { ensurePassCriteriaIds, type MilestoneOpsContext } from './milestone-ops-shared'
import type { TimelineMilestone } from './timeline/types'
import type { WorkflowMilestoneAction } from './workflow-milestone-reducer'

export function useMilestoneCrud(
  dispatch: Dispatch<WorkflowMilestoneAction>,
  { workflowId, t }: MilestoneOpsContext,
) {
  const handleCreateMilestone = useCallback(async (): Promise<boolean> => {
    dispatch({ type: 'PATCH', patch: { createError: null, creating: true } })
    try {
      const result = await apiFetch<{
        message?: string
        id?: string
        name?: string
        data?: unknown | null
      }>(
        `/api/workflows/${workflowId}/milestones`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: t('milestonePreset.noneLabel') }),
        },
        t('milestonesCreateError'),
      )
      if (!result.ok) {
        throw new Error(result.error)
      }
      const body = result.data
      const id = body?.id
      const name = body?.name
      if (typeof id === 'string' && typeof name === 'string' && body !== null) {
        const nodeParsed = milestoneNodeSchema.safeParse(body)
        if (!nodeParsed.success) {
          throw new Error(t('milestonesCreateError'))
        }
        dispatch({
          type: 'UPDATE_MILESTONES',
          updater: (prev) => [...prev, milestoneNodeToTimelineMilestone(nodeParsed.data)],
        })
        return true
      }
      return false
    } catch (err) {
      dispatch({
        type: 'PATCH',
        patch: {
          createError: err instanceof Error ? err.message : t('milestonesCreateError'),
        },
      })
      return false
    } finally {
      dispatch({ type: 'PATCH', patch: { creating: false } })
    }
  }, [workflowId, dispatch, t])

  const handleCreateMilestoneFromPreset = useCallback(
    async (presetId: MilestonePresetId): Promise<boolean> => {
      const fields = getMilestonePresetCreateFields(presetId, t)
      dispatch({ type: 'PATCH', patch: { createError: null, creating: true } })
      let createdId: string | null = null
      try {
        const res = await fetch(`/api/workflows/${workflowId}/milestones`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: fields.name }),
        })
        const body = (await res.json().catch(() => null)) as {
          message?: string
          id?: string
          name?: string
          data?: unknown | null
        } | null
        if (!res.ok) {
          throw new Error(body?.message ?? t('milestonesCreateError'))
        }
        const id = body?.id
        if (typeof id !== 'string') {
          throw new Error(t('milestonesCreateError'))
        }
        createdId = id

        const presetPassCriterias = ensurePassCriteriaIds(fields.passCriteria ?? [])
        const patchBody: Record<string, unknown> = {
          name: fields.name,
          presetId: fields.presetId,
          milestoneData: fields.milestoneData,
          passCriterias: presetPassCriterias,
        }
        if (fields.milestoneInput !== undefined) {
          patchBody.milestoneInput = fields.milestoneInput
        }
        if (fields.goal !== undefined) {
          patchBody.goal = fields.goal
        }
        const patchRes = await fetch(`/api/workflows/${workflowId}/milestones/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(patchBody),
        })
        const patchJson = (await patchRes.json().catch(() => null)) as {
          message?: string
          name?: string
          data?: unknown
        } | null
        if (!patchRes.ok) {
          throw new Error(patchJson?.message ?? t('milestonesCreateError'))
        }

        const title = typeof patchJson?.name === 'string' ? patchJson.name : fields.name

        const next: TimelineMilestone = {
          id,
          title,
          goal: fields.goal?.trim() ? fields.goal : undefined,
          data: fields.milestoneData,
          presetId: fields.presetId,
          ...(fields.milestoneInput !== undefined ? { milestoneInput: fields.milestoneInput } : {}),
          passCriteria: presetPassCriterias,
          status: deriveMilestoneRailStatus(presetPassCriterias, undefined),
        }

        dispatch({
          type: 'UPDATE_MILESTONES',
          updater: (prev) => [...prev, next],
        })
        return true
      } catch (err) {
        if (createdId !== null) {
          try {
            await fetch(`/api/workflows/${workflowId}/milestones/${createdId}`, {
              method: 'DELETE',
            })
          } catch {
            // best-effort rollback
          }
        }
        dispatch({
          type: 'PATCH',
          patch: {
            createError: err instanceof Error ? err.message : t('milestonesCreateError'),
          },
        })
        return false
      } finally {
        dispatch({ type: 'PATCH', patch: { creating: false } })
      }
    },
    [workflowId, dispatch, t],
  )

  const handleDeleteMilestone = useCallback(
    async (milestoneId: string) => {
      dispatch({ type: 'PATCH', patch: { deleteError: null, deletingMilestoneId: milestoneId } })
      try {
        const res = await fetch(`/api/workflows/${workflowId}/milestones/${milestoneId}`, {
          method: 'DELETE',
        })
        if (res.status === 204) {
          dispatch({
            type: 'UPDATE_MILESTONES',
            updater: (prev) => prev.filter((m) => m.id !== milestoneId),
          })
          return
        }
        const body = (await res.json().catch(() => null)) as { message?: string } | null
        throw new Error(body?.message ?? t('milestonesDeleteError'))
      } catch (err) {
        dispatch({
          type: 'PATCH',
          patch: {
            deleteError: err instanceof Error ? err.message : t('milestonesDeleteError'),
          },
        })
      } finally {
        dispatch({ type: 'PATCH', patch: { deletingMilestoneId: null } })
      }
    },
    [workflowId, dispatch, t],
  )

  return {
    handleCreateMilestone,
    handleCreateMilestoneFromPreset,
    handleDeleteMilestone,
  }
}
