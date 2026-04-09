'use client'

import type { Dispatch } from 'react'
import { useCallback, useMemo } from 'react'

import { milestoneDataSchema } from '@/lib/graphql/node-schemas'

import type { CampaignMilestoneAction } from './campaign-milestone-reducer'
import { deriveMilestoneRailStatus, milestoneNodeToTimelineMilestone } from './milestone-map'
import type {
  MilestoneDataTask,
  PassCriteriaRow,
  PassCriteriaStatus,
  TimelineMilestone,
} from './timeline/types'

export function useMilestoneOperations(
  dispatch: Dispatch<CampaignMilestoneAction>,
  {
    workflowId,
    locationId,
    t,
  }: {
    workflowId: string
    locationId: number
    /** `useTranslations('analytics.campaigns.chat')` */
    t: (key: string) => string
  },
) {
  const handleCreateMilestone = useCallback(async () => {
    dispatch({ type: 'PATCH', patch: { createError: null, creating: true } })
    try {
      const res = await fetch(`/api/workflows/${workflowId}/milestones`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
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
      const name = body?.name
      if (typeof id === 'string' && typeof name === 'string') {
        const created = { id, name, data: body?.data }
        dispatch({
          type: 'UPDATE_MILESTONES',
          updater: (prev) => [...prev, milestoneNodeToTimelineMilestone(created)],
        })
      }
    } catch (err) {
      dispatch({
        type: 'PATCH',
        patch: {
          createError: err instanceof Error ? err.message : t('milestonesCreateError'),
        },
      })
    } finally {
      dispatch({ type: 'PATCH', patch: { creating: false } })
    }
  }, [workflowId, dispatch, t])

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

  const handleRenameMilestone = useCallback(
    async (milestoneId: string, name: string): Promise<boolean> => {
      dispatch({ type: 'PATCH', patch: { renameError: null, renamingMilestoneId: milestoneId } })
      try {
        const res = await fetch(`/api/workflows/${workflowId}/milestones/${milestoneId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name }),
        })
        const body = (await res.json().catch(() => null)) as {
          message?: string
          name?: string
        } | null
        if (!res.ok) {
          throw new Error(body?.message ?? t('milestonesRenameError'))
        }
        const newName = body?.name
        if (typeof newName === 'string') {
          dispatch({
            type: 'UPDATE_MILESTONES',
            updater: (prev) =>
              prev.map((m) => (m.id === milestoneId ? { ...m, title: newName } : m)),
          })
          return true
        }
        return false
      } catch (err) {
        dispatch({
          type: 'PATCH',
          patch: {
            renameError: err instanceof Error ? err.message : t('milestonesRenameError'),
          },
        })
        return false
      } finally {
        dispatch({ type: 'PATCH', patch: { renamingMilestoneId: null } })
      }
    },
    [workflowId, dispatch, t],
  )

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
          body: JSON.stringify({ passCriteria }),
        })
        const body = (await res.json().catch(() => null)) as {
          message?: string
          passCriteria?: PassCriteriaRow[]
        } | null
        if (!res.ok) {
          throw new Error(body?.message ?? t('milestonesPassCriteriaError'))
        }
        const nextCriteria = body?.passCriteria ?? passCriteria
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
    async (milestoneId: string, milestoneData: string): Promise<boolean> => {
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

  const handleSetMilestoneDataTask = useCallback(
    async (milestoneId: string, dataTask: MilestoneDataTask): Promise<boolean> => {
      dispatch({ type: 'PATCH', patch: { milestonePrepareError: null } })
      try {
        const res = await fetch(`/api/workflows/${workflowId}/milestones/${milestoneId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ dataTask }),
        })
        const body = (await res.json().catch(() => null)) as {
          message?: string
          data?: unknown
        } | null
        if (!res.ok) {
          throw new Error(body?.message ?? t('milestonesMilestoneDataError'))
        }
        const nodeBody = body as { data?: unknown }
        const parsed = milestoneDataSchema.safeParse(nodeBody?.data)
        const nextTask: MilestoneDataTask =
          parsed.success && parsed.data.dataTask === 'location_profile'
            ? 'location_profile'
            : 'manual'
        dispatch({
          type: 'UPDATE_MILESTONES',
          updater: (prev) =>
            prev.map((m) => (m.id === milestoneId ? { ...m, dataTask: nextTask } : m)),
        })
        return true
      } catch (err) {
        dispatch({
          type: 'PATCH',
          patch: {
            milestonePrepareError: err instanceof Error ? err.message : t('milestonePrepareError'),
          },
        })
        return false
      }
    },
    [workflowId, dispatch, t],
  )

  const handlePrepareMilestone = useCallback(
    async (milestoneId: string) => {
      dispatch({
        type: 'PATCH',
        patch: { milestonePrepareError: null, preparingMilestoneId: milestoneId },
      })
      try {
        const res = await fetch(`/api/workflows/${workflowId}/milestones/${milestoneId}/prepare`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ locationId }),
        })
        if (!res.ok) {
          const body = (await res.json().catch(() => null)) as { error?: string } | null
          throw new Error(body?.error ?? t('milestonePrepareError'))
        }
        if (!res.body) {
          throw new Error(t('milestonePrepareError'))
        }
        const reader = res.body.getReader()
        const decoder = new TextDecoder()
        let buffer = ''
        while (true) {
          const { done, value } = await reader.read()
          if (done) {
            break
          }
          buffer += decoder.decode(value, { stream: true })
          const blocks = buffer.split('\n\n')
          buffer = blocks.pop() ?? ''
          for (const block of blocks) {
            const m = block.match(/^data: (.+)$/m)
            const raw = m?.[1]?.trim()
            if (!raw) {
              continue
            }
            let payload: Record<string, unknown>
            try {
              payload = JSON.parse(raw) as Record<string, unknown>
            } catch {
              continue
            }
            if (typeof payload.error === 'string') {
              throw new Error(payload.error)
            }
            if (payload.done === true) {
              const preview = typeof payload.dataPreview === 'string' ? payload.dataPreview : ''
              dispatch({
                type: 'UPDATE_MILESTONES',
                updater: (prev) =>
                  prev.map((m) => (m.id === milestoneId ? { ...m, data: preview || m.data } : m)),
              })
            }
          }
        }
      } catch (err) {
        dispatch({
          type: 'PATCH',
          patch: {
            milestonePrepareError: err instanceof Error ? err.message : t('milestonePrepareError'),
          },
        })
      } finally {
        dispatch({ type: 'PATCH', patch: { preparingMilestoneId: null } })
      }
    },
    [workflowId, dispatch, locationId, t],
  )

  const handleRunMilestone = useCallback(
    async (milestoneId: string) => {
      dispatch({
        type: 'PATCH',
        patch: {
          milestoneRunError: null,
          runningMilestoneId: milestoneId,
          runningStep: 'fetch_context',
        },
      })
      dispatch({
        type: 'UPDATE_MILESTONES',
        updater: (prev) =>
          prev.map((m) => (m.id === milestoneId ? { ...m, status: 'pending' as const } : m)),
      })
      try {
        const res = await fetch(`/api/workflows/${workflowId}/milestones/${milestoneId}/run`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ locationId }),
        })
        if (!res.ok) {
          const body = (await res.json().catch(() => null)) as { error?: string } | null
          throw new Error(body?.error ?? t('milestoneRunError'))
        }
        if (!res.body) {
          throw new Error(t('milestoneRunError'))
        }
        const reader = res.body.getReader()
        const decoder = new TextDecoder()
        let buffer = ''
        while (true) {
          const { done, value } = await reader.read()
          if (done) {
            break
          }
          buffer += decoder.decode(value, { stream: true })
          const blocks = buffer.split('\n\n')
          buffer = blocks.pop() ?? ''
          for (const block of blocks) {
            const m = block.match(/^data: (.+)$/m)
            const raw = m?.[1]?.trim()
            if (!raw) {
              continue
            }
            let payload: Record<string, unknown>
            try {
              payload = JSON.parse(raw) as Record<string, unknown>
            } catch {
              continue
            }
            if (typeof payload.error === 'string') {
              throw new Error(payload.error)
            }
            if (typeof payload.step === 'string') {
              dispatch({ type: 'PATCH', patch: { runningStep: payload.step } })
            }
            if (payload.done === true) {
              const summary = typeof payload.summary === 'string' ? payload.summary : ''
              const criteriaRaw = payload.criteria
              const criteriaList = Array.isArray(criteriaRaw)
                ? criteriaRaw.filter(
                    (c): c is { id?: unknown; status?: unknown } =>
                      c != null && typeof c === 'object',
                  )
                : []
              dispatch({
                type: 'UPDATE_MILESTONES',
                updater: (prev) =>
                  prev.map((milestone) => {
                    if (milestone.id !== milestoneId) {
                      return milestone
                    }
                    const idToStatus = new Map(
                      criteriaList.map((c) => [String(c.id ?? ''), String(c.status ?? '')]),
                    )
                    const nextPass = milestone.passCriteria.map((row) => {
                      if (!row.id) {
                        return row
                      }
                      const st = idToStatus.get(row.id)
                      if (st === 'pass' || st === 'fail') {
                        return { ...row, status: st as PassCriteriaStatus }
                      }
                      return row
                    })
                    const hasFail = nextPass.some((row) => row.status === 'fail')
                    return {
                      ...milestone,
                      status: hasFail ? ('failed' as const) : ('complete' as const),
                      passCriteria: nextPass,
                      resultMarkdown: summary || milestone.resultMarkdown,
                    }
                  }),
              })
            }
            if (payload.step === 'evaluate_criterion' && typeof payload.id === 'string') {
              const st = payload.status
              if (st === 'pass' || st === 'fail') {
                const status = st as PassCriteriaStatus
                dispatch({
                  type: 'UPDATE_MILESTONES',
                  updater: (prev) =>
                    prev.map((milestone) => {
                      if (milestone.id !== milestoneId) {
                        return milestone
                      }
                      return {
                        ...milestone,
                        passCriteria: milestone.passCriteria.map((row) =>
                          row.id === payload.id ? { ...row, status } : row,
                        ),
                      }
                    }),
                })
              }
            }
          }
        }
      } catch (err) {
        dispatch({
          type: 'PATCH',
          patch: {
            milestoneRunError: err instanceof Error ? err.message : t('milestoneRunError'),
          },
        })
        dispatch({
          type: 'UPDATE_MILESTONES',
          updater: (prev) =>
            prev.map((m) => (m.id === milestoneId ? { ...m, status: 'empty' as const } : m)),
        })
      } finally {
        dispatch({ type: 'PATCH', patch: { runningMilestoneId: null, runningStep: null } })
      }
    },
    [workflowId, dispatch, locationId, t],
  )

  const handleMoveMilestone = useCallback(
    async (milestoneId: string, direction: 'up' | 'down') => {
      dispatch({ type: 'PATCH', patch: { moveError: null } })
      let snapshot: TimelineMilestone[] | null = null
      dispatch({
        type: 'UPDATE_MILESTONES',
        updater: (prev) => {
          snapshot = prev
          const idx = prev.findIndex((m) => m.id === milestoneId)
          if (idx === -1) {
            return prev
          }
          const j = direction === 'up' ? idx - 1 : idx + 1
          if (j < 0 || j >= prev.length) {
            return prev
          }
          const next = [...prev]
          const a = next[idx]
          const b = next[j]
          if (a && b) {
            next[idx] = b
            next[j] = a
          }
          return next
        },
      })
      dispatch({ type: 'PATCH', patch: { movingMilestoneId: milestoneId } })
      try {
        const res = await fetch(`/api/workflows/${workflowId}/milestones/${milestoneId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ move: direction }),
        })
        if (!res.ok) {
          const body = (await res.json().catch(() => null)) as { message?: string } | null
          throw new Error(body?.message ?? t('milestonesMoveError'))
        }
      } catch (err) {
        if (snapshot) {
          dispatch({ type: 'PATCH', patch: { milestones: snapshot } })
        }
        dispatch({
          type: 'PATCH',
          patch: {
            moveError: err instanceof Error ? err.message : t('milestonesMoveError'),
          },
        })
      } finally {
        dispatch({ type: 'PATCH', patch: { movingMilestoneId: null } })
      }
    },
    [workflowId, dispatch, t],
  )

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

  return useMemo(
    () => ({
      handleCreateMilestone,
      handleDeleteMilestone,
      handleRenameMilestone,
      handleUpdatePassCriteria,
      handleUpdateMilestoneGoal,
      handleUpdateMilestoneData,
      handleSetMilestoneDataTask,
      handlePrepareMilestone,
      handleRunMilestone,
      handleMoveMilestone,
      handleExportWorkflow,
    }),
    [
      handleCreateMilestone,
      handleDeleteMilestone,
      handleRenameMilestone,
      handleUpdatePassCriteria,
      handleUpdateMilestoneGoal,
      handleUpdateMilestoneData,
      handleSetMilestoneDataTask,
      handlePrepareMilestone,
      handleRunMilestone,
      handleMoveMilestone,
      handleExportWorkflow,
    ],
  )
}
