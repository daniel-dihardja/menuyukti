'use client'

import type { Dispatch } from 'react'
import { useCallback, useRef } from 'react'

import { DEFAULT_CHAT_GATEWAY_MODEL, type ChatGatewayModelId } from '@/lib/chat/gateway-chat-models'

import { deriveMilestoneRailStatus } from './milestone-map'
import { parseDataPreviewForPreset, type MilestoneOpsContext } from './milestone-ops-shared'
import { hasPostLineupPosts, isEmptyPostLineupData } from '@/lib/milestones/post-lineup'
import { normalizeMilestonePresetData } from '@/lib/milestones/preset-definitions'
import type {
  MilestoneDataValue,
  MilestoneInput,
  PassCriteriaRow,
  PassCriteriaStatus,
  TimelineMilestone,
} from './timeline/types'
import type { WorkflowMilestoneAction } from './workflow-milestone-reducer'
import {
  parseReflectionCritiqueSummaryPayload,
  upsertReflectionRound,
  type CampaignBriefReflectionRound,
} from '@/lib/milestones/campaign-brief-reflection-run'

export function useMilestoneRun(
  dispatch: Dispatch<WorkflowMilestoneAction>,
  { workflowId, locationId, t }: MilestoneOpsContext,
) {
  const abortRef = useRef<AbortController | null>(null)
  const reflectionRoundsRef = useRef<CampaignBriefReflectionRound[]>([])

  const handleStopMilestoneRun = useCallback(() => {
    abortRef.current?.abort()
  }, [])

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
        const dataValue =
          body.milestoneData !== undefined
            ? normalizeMilestonePresetData(
                body.presetId ?? undefined,
                body.milestoneData === null ? undefined : body.milestoneData,
              )
            : undefined
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
              const keepExistingPostLineup =
                body.presetId === 'post_lineup' &&
                isEmptyPostLineupData(dataValue) &&
                hasPostLineupPosts(m.data)
              const next: TimelineMilestone = {
                ...m,
                ...(dataValue !== undefined && !keepExistingPostLineup ? { data: dataValue } : {}),
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

  const handleRunMilestone = useCallback(
    async (milestoneId: string, chatModel: ChatGatewayModelId = DEFAULT_CHAT_GATEWAY_MODEL) => {
      abortRef.current?.abort()
      const controller = new AbortController()
      abortRef.current = controller
      const { signal } = controller

      reflectionRoundsRef.current = []
      dispatch({
        type: 'PATCH',
        patch: {
          milestoneRunError: null,
          milestoneRunCriteriaHint: null,
          runningMilestoneId: milestoneId,
          runningStep: null,
          runningStepIteration: null,
          runningReflectionRounds: [],
          runningReflectionAddressing: [],
        },
      })
      dispatch({
        type: 'UPDATE_MILESTONES',
        updater: (prev) =>
          prev.map((m) => (m.id === milestoneId ? { ...m, status: 'pending' as const } : m)),
      })
      try {
        const hydrateRes = await fetch(`/api/workflows/${workflowId}/milestones/${milestoneId}`, {
          signal,
        })
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
            milestoneData: hydrateBody?.milestoneData ?? undefined,
          }),
          signal,
        })
        if (!res.ok) {
          const body = (await res.json().catch(() => null)) as {
            error?: string
            issues?: Array<{ message?: string; path?: Array<string | number> }>
          } | null
          const issueHint = body?.issues?.[0]?.message
          throw new Error(
            issueHint
              ? `${body?.error ?? t('milestoneRunError')}: ${issueHint}`
              : (body?.error ?? t('milestoneRunError')),
          )
        }
        if (!res.body) {
          throw new Error(t('milestoneRunError'))
        }
        const reader = res.body.getReader()
        const decoder = new TextDecoder()
        let buffer = ''
        let runCompleted = false
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
              if (payload.step === 'reflect_critique_summary') {
                const round = parseReflectionCritiqueSummaryPayload(payload)
                if (round) {
                  reflectionRoundsRef.current = upsertReflectionRound(
                    reflectionRoundsRef.current,
                    round,
                  )
                  dispatch({
                    type: 'PATCH',
                    patch: {
                      runningReflectionRounds: reflectionRoundsRef.current,
                      runningReflectionAddressing: [],
                    },
                  })
                }
                continue
              }

              const stepPatch: {
                runningStep: string
                runningStepIteration?: number
                runningReflectionRounds?: CampaignBriefReflectionRound[]
                runningReflectionAddressing?: Array<{ criterionId: string; feedback: string }>
              } = { runningStep: payload.step }
              if (typeof payload.iteration === 'number' && Number.isFinite(payload.iteration)) {
                stepPatch.runningStepIteration = payload.iteration
              }
              if (payload.step === 'reflect_revise' && Array.isArray(payload.addressing)) {
                const addressing = payload.addressing
                  .filter(
                    (row): row is { id?: unknown; feedback?: unknown } =>
                      row != null && typeof row === 'object',
                  )
                  .map((row) => ({
                    criterionId: typeof row.id === 'string' ? row.id : '',
                    feedback: typeof row.feedback === 'string' ? row.feedback.trim() : '',
                  }))
                  .filter((row) => row.criterionId)
                if (addressing.length > 0) {
                  stepPatch.runningReflectionAddressing = addressing
                }
              }
              dispatch({ type: 'PATCH', patch: stepPatch })
            }
            if (payload.done === true) {
              runCompleted = true
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
        if (runCompleted) {
          await handleHydrateMilestoneData(milestoneId)
        }
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') {
          dispatch({
            type: 'UPDATE_MILESTONES',
            updater: (prev) =>
              prev.map((m) => {
                if (m.id !== milestoneId) {
                  return m
                }
                return {
                  ...m,
                  status: deriveMilestoneRailStatus(m.passCriteria, m.resultMarkdown),
                }
              }),
          })
          return
        }
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
        if (abortRef.current === controller) {
          abortRef.current = null
        }
        dispatch({
          type: 'PATCH',
          patch: {
            runningMilestoneId: null,
            runningStep: null,
            runningStepIteration: null,
            runningReflectionAddressing: [],
          },
        })
      }
    },
    [workflowId, dispatch, locationId, t, handleHydrateMilestoneData],
  )

  return { handleRunMilestone, handleStopMilestoneRun, handleHydrateMilestoneData }
}
