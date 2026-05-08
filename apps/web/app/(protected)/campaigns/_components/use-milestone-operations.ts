'use client'

import type { Dispatch } from 'react'
import { useCallback, useMemo } from 'react'

import {
  campaignBriefMilestoneDataSchema,
  cultureHooksMilestoneDataSchema,
  milestoneDataSchema,
  milestoneNodeSchema,
  postSchedulerMilestoneDataSchema,
  promotionCandidatesMilestoneDataSchema,
} from '@/lib/graphql/node-schemas'
import {
  getMilestonePresetCreateFields,
  type MilestonePresetId,
} from '@/lib/milestones/preset-definitions'

import type { CampaignMilestoneAction } from './campaign-milestone-reducer'
import { deriveMilestoneRailStatus, milestoneNodeToTimelineMilestone } from './milestone-map'
import type {
  MilestoneDataValue,
  MilestoneInput,
  PassCriteriaRow,
  PassCriteriaStatus,
  TimelineMilestone,
} from './timeline/types'

function parseDataPreviewForPreset(
  presetId: TimelineMilestone['presetId'],
  dataPreview: object,
): MilestoneDataValue | undefined {
  if (presetId === 'restaurant_campaign_brief') {
    const parsed = campaignBriefMilestoneDataSchema.safeParse(dataPreview)
    return parsed.success ? parsed.data : undefined
  }
  if (presetId === 'post_scheduler') {
    const parsed = postSchedulerMilestoneDataSchema.safeParse(dataPreview)
    return parsed.success ? parsed.data : undefined
  }
  if (presetId === 'promotion_candidates') {
    const parsed = promotionCandidatesMilestoneDataSchema.safeParse(dataPreview)
    return parsed.success ? parsed.data : undefined
  }
  if (presetId === 'culture_hooks') {
    const parsed = cultureHooksMilestoneDataSchema.safeParse(dataPreview)
    return parsed.success ? parsed.data : undefined
  }
  return undefined
}

function ensurePassCriteriaIds(
  rows: Array<{ id?: string; requirement: string; status: PassCriteriaStatus }>,
): PassCriteriaRow[] {
  return rows.map((row) => ({
    ...row,
    id: row.id ?? crypto.randomUUID(),
  }))
}

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
  const handleCreateMilestone = useCallback(async (): Promise<boolean> => {
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

  const handleRunMilestone = useCallback(
    async (milestoneId: string) => {
      dispatch({
        type: 'PATCH',
        patch: {
          milestoneRunError: null,
          milestoneRunCriteriaHint: null,
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
        const hydrateRes = await fetch(`/api/workflows/${workflowId}/milestones/${milestoneId}`)
        const hydrateBody = (await hydrateRes.json().catch(() => null)) as {
          message?: string
          goal?: string
          milestoneData?: MilestoneDataValue
          milestoneInput?: MilestoneInput | null
        } | null
        if (!hydrateRes.ok) {
          throw new Error(hydrateBody?.message ?? t('milestoneRunError'))
        }
        const res = await fetch(`/api/workflows/${workflowId}/milestones/${milestoneId}/run`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            locationId,
            goal: hydrateBody?.goal ?? '',
            milestoneInput: hydrateBody?.milestoneInput ?? undefined,
            milestoneData: hydrateBody?.milestoneData,
          }),
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
              const rawDataPreview =
                'dataPreview' in payload &&
                payload.dataPreview != null &&
                typeof payload.dataPreview === 'object'
                  ? payload.dataPreview
                  : undefined
              const criteriaRaw = payload.criteria
              const criteriaList = Array.isArray(criteriaRaw)
                ? criteriaRaw.filter(
                    (c): c is { id?: unknown; status?: unknown } =>
                      c != null && typeof c === 'object',
                  )
                : []
              let criteriaHint: string | null = null
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
                    if (hasFail) {
                      criteriaHint = t('milestoneRunFixedSkillsFailHint')
                    }
                    const dataPreview =
                      rawDataPreview !== undefined
                        ? parseDataPreviewForPreset(milestone.presetId, rawDataPreview)
                        : undefined
                    return {
                      ...milestone,
                      status: hasFail ? ('failed' as const) : ('complete' as const),
                      passCriteria: nextPass,
                      resultMarkdown: summary || milestone.resultMarkdown,
                      ...(dataPreview !== undefined ? { data: dataPreview } : {}),
                    }
                  }),
              })
              dispatch({
                type: 'PATCH',
                patch: { milestoneRunCriteriaHint: criteriaHint },
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

  /** Load persisted goal, pass criteria, and milestonedata from the API (navigation, chat tools). */
  const handleHydrateMilestoneData = useCallback(
    async (milestoneId: string) => {
      try {
        const res = await fetch(`/api/workflows/${workflowId}/milestones/${milestoneId}`)
        if (!res.ok) {
          return
        }
        const body = (await res.json().catch(() => null)) as {
          milestoneData?: MilestoneDataValue | null
          milestoneInput?: MilestoneInput | null
          presetId?: TimelineMilestone['presetId'] | null
          goal?: string
          passCriterias?: PassCriteriaRow[]
        } | null
        if (!body) {
          return
        }
        const dataValue = body.milestoneData
        dispatch({
          type: 'UPDATE_MILESTONES',
          updater: (prev) =>
            prev.map((m) => {
              if (m.id !== milestoneId) {
                return m
              }
              const passCriteria =
                body.passCriterias !== undefined && Array.isArray(body.passCriterias)
                  ? body.passCriterias
                  : m.passCriteria
              const goalText = typeof body.goal === 'string' ? body.goal : (m.goal ?? '')
              const next: TimelineMilestone = {
                ...m,
                ...(dataValue !== undefined
                  ? { data: dataValue === null ? undefined : dataValue }
                  : {}),
                presetId: body.presetId ?? m.presetId,
                milestoneInput: body.milestoneInput ?? m.milestoneInput,
                goal: goalText.trim() ? goalText : undefined,
                passCriteria,
                status: deriveMilestoneRailStatus(passCriteria, m.resultMarkdown),
              }
              return next
            }),
        })
      } catch {
        // ignore
      }
    },
    [workflowId, dispatch],
  )

  return useMemo(
    () => ({
      handleCreateMilestone,
      handleCreateMilestoneFromPreset,
      handleDeleteMilestone,
      handleUpdatePassCriteria,
      handleUpdateMilestoneGoal,
      handleUpdateMilestoneData,
      handleUpdateMilestoneInput,
      handleRunMilestone,
      handleMoveMilestone,
      handleExportWorkflow,
      handleHydrateMilestoneData,
    }),
    [
      handleCreateMilestone,
      handleCreateMilestoneFromPreset,
      handleDeleteMilestone,
      handleUpdatePassCriteria,
      handleUpdateMilestoneGoal,
      handleUpdateMilestoneData,
      handleUpdateMilestoneInput,
      handleRunMilestone,
      handleMoveMilestone,
      handleExportWorkflow,
      handleHydrateMilestoneData,
    ],
  )
}
