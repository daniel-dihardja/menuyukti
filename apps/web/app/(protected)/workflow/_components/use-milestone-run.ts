'use client'

import type { Dispatch } from 'react'
import { useCallback } from 'react'

import { DEFAULT_CHAT_GATEWAY_MODEL, type ChatGatewayModelId } from '@/lib/chat/gateway-chat-models'

import { deriveMilestoneRailStatus } from './milestone-map'
import { parseDataPreviewForPreset, type MilestoneOpsContext } from './milestone-ops-shared'
import type {
  MilestoneDataValue,
  MilestoneInput,
  PassCriteriaRow,
  PassCriteriaStatus,
  TimelineMilestone,
} from './timeline/types'
import type { WorkflowMilestoneAction } from './workflow-milestone-reducer'

export function useMilestoneRun(
  dispatch: Dispatch<WorkflowMilestoneAction>,
  { workflowId, locationId, t }: MilestoneOpsContext,
) {
  const handleRunMilestone = useCallback(
    async (milestoneId: string, chatModel: ChatGatewayModelId = DEFAULT_CHAT_GATEWAY_MODEL) => {
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
            model: chatModel,
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

  return { handleRunMilestone, handleHydrateMilestoneData }
}
