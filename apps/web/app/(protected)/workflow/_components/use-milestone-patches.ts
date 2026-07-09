'use client'

import type { Dispatch } from 'react'
import { useCallback } from 'react'

import { milestoneDataSchema } from '@/lib/graphql/node-schemas'
import { isAllowedChatGatewayModel, type ChatGatewayModelId } from '@/lib/chat/gateway-chat-models'

import { deriveMilestoneRailStatus } from './milestone-map'
import type { MilestoneOpsContext } from './milestone-ops-shared'
import type { MilestoneDataValue, MilestoneInput, PassCriteriaRow } from './timeline/types'
import type { WorkflowMilestoneAction } from './workflow-milestone-reducer'

export function useMilestonePatches(
  dispatch: Dispatch<WorkflowMilestoneAction>,
  { workflowId, t }: MilestoneOpsContext,
) {
  const handleUpdatePassCriteria = useCallback(
    async (milestoneId: string, passCriteria: PassCriteriaRow[]): Promise<boolean> => {
      dispatch({
        type: 'PATCH',
        patch: { passCriteriaError: null, savingPassCriteriaMilestoneId: milestoneId },
      })
      try {
        const res = await fetch(`/api/workflows/${workflowId}/milestones/${milestoneId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ passCriterias: passCriteria }),
        })
        const body = (await res.json().catch(() => null)) as {
          message?: string
          passCriterias?: PassCriteriaRow[]
        } | null
        if (!res.ok) {
          throw new Error(body?.message ?? t('milestonesPassCriteriaError'))
        }
        const nextCriteria = body?.passCriterias ?? passCriteria
        dispatch({
          type: 'UPDATE_MILESTONES',
          updater: (prev) =>
            prev.map((m) => {
              if (m.id !== milestoneId) {
                return m
              }
              return {
                ...m,
                passCriteria: nextCriteria,
                status: deriveMilestoneRailStatus(nextCriteria, m.resultMarkdown),
              }
            }),
        })
        return true
      } catch (err) {
        dispatch({
          type: 'PATCH',
          patch: {
            passCriteriaError:
              err instanceof Error ? err.message : t('milestonesPassCriteriaError'),
          },
        })
        return false
      } finally {
        dispatch({ type: 'PATCH', patch: { savingPassCriteriaMilestoneId: null } })
      }
    },
    [workflowId, dispatch, t],
  )

  const handleUpdateMilestoneGoal = useCallback(
    async (milestoneId: string, goal: string): Promise<boolean> => {
      dispatch({ type: 'PATCH', patch: { goalError: null, savingGoalMilestoneId: milestoneId } })
      try {
        const res = await fetch(`/api/workflows/${workflowId}/milestones/${milestoneId}`, {
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
        dispatch({
          type: 'UPDATE_MILESTONES',
          updater: (prev) =>
            prev.map((m) => (m.id === milestoneId ? { ...m, goal: nextGoal ?? goal } : m)),
        })
        return true
      } catch (err) {
        dispatch({
          type: 'PATCH',
          patch: { goalError: err instanceof Error ? err.message : t('milestonesGoalError') },
        })
        return false
      } finally {
        dispatch({ type: 'PATCH', patch: { savingGoalMilestoneId: null } })
      }
    },
    [workflowId, dispatch, t],
  )

  const handleUpdateMilestoneData = useCallback(
    async (milestoneId: string, milestoneData: MilestoneDataValue): Promise<boolean> => {
      dispatch({
        type: 'PATCH',
        patch: { milestoneDataError: null, savingDataMilestoneId: milestoneId },
      })
      try {
        const res = await fetch(`/api/workflows/${workflowId}/milestones/${milestoneId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ milestoneData }),
        })
        const body = (await res.json().catch(() => null)) as { message?: string } | null
        if (!res.ok) {
          throw new Error(body?.message ?? t('milestonesMilestoneDataError'))
        }
        dispatch({
          type: 'UPDATE_MILESTONES',
          updater: (prev) =>
            prev.map((m) => (m.id === milestoneId ? { ...m, data: milestoneData } : m)),
        })
        return true
      } catch (err) {
        dispatch({
          type: 'PATCH',
          patch: {
            milestoneDataError:
              err instanceof Error ? err.message : t('milestonesMilestoneDataError'),
          },
        })
        return false
      } finally {
        dispatch({ type: 'PATCH', patch: { savingDataMilestoneId: null } })
      }
    },
    [workflowId, dispatch, t],
  )

  const handleUpdateMilestoneInput = useCallback(
    async (milestoneId: string, milestoneInput: MilestoneInput): Promise<boolean> => {
      dispatch({
        type: 'PATCH',
        patch: { milestoneDataError: null, savingDataMilestoneId: milestoneId },
      })
      try {
        const res = await fetch(`/api/workflows/${workflowId}/milestones/${milestoneId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ milestoneInput }),
        })
        const body = (await res.json().catch(() => null)) as { message?: string } | null
        if (!res.ok) {
          throw new Error(body?.message ?? t('milestonesMilestoneDataError'))
        }
        dispatch({
          type: 'UPDATE_MILESTONES',
          updater: (prev) => prev.map((m) => (m.id === milestoneId ? { ...m, milestoneInput } : m)),
        })
        return true
      } catch (err) {
        dispatch({
          type: 'PATCH',
          patch: {
            milestoneDataError:
              err instanceof Error ? err.message : t('milestonesMilestoneDataError'),
          },
        })
        return false
      } finally {
        dispatch({ type: 'PATCH', patch: { savingDataMilestoneId: null } })
      }
    },
    [workflowId, dispatch, t],
  )

  const handleUpdateMilestoneRunChatModel = useCallback(
    async (milestoneId: string, runChatModel: ChatGatewayModelId): Promise<boolean> => {
      dispatch({
        type: 'PATCH',
        patch: { runChatModelError: null, savingRunChatModelMilestoneId: milestoneId },
      })
      try {
        const res = await fetch(`/api/workflows/${workflowId}/milestones/${milestoneId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ runChatModel }),
        })
        const body = (await res.json().catch(() => null)) as {
          message?: string
          data?: unknown
        } | null
        if (!res.ok) {
          throw new Error(body?.message ?? t('milestonesRunChatModelError'))
        }
        let nextRunChatModel: ChatGatewayModelId = runChatModel
        const rawData = body?.data
        if (rawData != null && typeof rawData === 'object') {
          const parsed = milestoneDataSchema.safeParse(rawData)
          if (
            parsed.success &&
            parsed.data.runChatModel != null &&
            isAllowedChatGatewayModel(parsed.data.runChatModel)
          ) {
            nextRunChatModel = parsed.data.runChatModel
          }
        }
        dispatch({
          type: 'UPDATE_MILESTONES',
          updater: (prev) =>
            prev.map((m) => (m.id === milestoneId ? { ...m, runChatModel: nextRunChatModel } : m)),
        })
        return true
      } catch (err) {
        dispatch({
          type: 'PATCH',
          patch: {
            runChatModelError:
              err instanceof Error ? err.message : t('milestonesRunChatModelError'),
          },
        })
        return false
      } finally {
        dispatch({ type: 'PATCH', patch: { savingRunChatModelMilestoneId: null } })
      }
    },
    [workflowId, dispatch, t],
  )

  return {
    handleUpdatePassCriteria,
    handleUpdateMilestoneGoal,
    handleUpdateMilestoneData,
    handleUpdateMilestoneInput,
    handleUpdateMilestoneRunChatModel,
  }
}
