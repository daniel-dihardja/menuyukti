'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useTranslations } from 'next-intl'

import type { FieldSaveStatusVariant } from '@/components/field-save-status'
import { extractCampaignBriefMainCategory } from '@/lib/milestones/campaign-brief-main-category'
import {
  milestonePresetHasDefaultOptionalNotesInput,
  normalizePromotionCandidatesInput,
  optionalNotesFromMilestoneInput,
  promotionCandidatesInputFromMilestoneInput,
} from '@/lib/milestones/milestone-input-tab'
import { milestonePresetInputType } from '@/lib/milestones/preset-definitions'
import type { ChatGatewayModelId } from '@/lib/chat/gateway-chat-models'

import type { TimelineActions } from '../timeline-context'
import { useTimelineWorkspaceState } from '../timeline-context'
import type { MilestoneInputModel } from './milestone-item-tabs'
import type { PromotionCandidatesInputDraft } from './milestone-promotion-candidates-input'
import type { TimelineMilestone } from './types'

/** Input autosave debounce; optional notes updates avoid draft rewrites to preserve caret. */
const MILESTONE_INPUT_AUTOSAVE_DEBOUNCE_MS = 1200

function datesInputFromMilestone(raw: TimelineMilestone['milestoneInput']): {
  startDate: string
  endDate: string
} {
  if (raw?.type === 'dates' && raw.value != null && typeof raw.value === 'object') {
    const value = raw.value as Partial<{ startDate: string; endDate: string }>
    return {
      startDate: typeof value.startDate === 'string' ? value.startDate : '',
      endDate: typeof value.endDate === 'string' ? value.endDate : '',
    }
  }
  return { startDate: '', endDate: '' }
}

function promotionCandidatesInputEqual(
  a: PromotionCandidatesInputDraft,
  b: PromotionCandidatesInputDraft,
): boolean {
  const na = normalizePromotionCandidatesInput(a)
  const nb = normalizePromotionCandidatesInput(b)
  if (na.notes !== nb.notes) return false
  if (na.starItemLimit !== nb.starItemLimit) return false
  if (na.puzzleItemLimit !== nb.puzzleItemLimit) return false
  if (na.selectedMenuCategories.length !== nb.selectedMenuCategories.length) return false
  return na.selectedMenuCategories.every((v, i) => v === nb.selectedMenuCategories[i])
}

export function useMilestoneItemDrafts(
  milestone: TimelineMilestone,
  {
    onUpdateMilestoneInput,
    onRunMilestone,
    savingInput,
    isMilestoneRunning,
  }: {
    onUpdateMilestoneInput: TimelineActions['onUpdateMilestoneInput']
    onRunMilestone: TimelineActions['onRunMilestone']
    savingInput: boolean
    isMilestoneRunning: boolean
  },
) {
  const t = useTranslations('analytics.workflows.chat')
  const { milestoneState } = useTimelineWorkspaceState()
  const campaignBriefMainCategory = useMemo(
    () => extractCampaignBriefMainCategory(milestoneState.milestones),
    [milestoneState.milestones],
  )

  const inputType = milestonePresetInputType(milestone.presetId)
  const usesOptionalNotesInput = inputType === 'optional_notes'
  const isDatesPreset = inputType === 'dates'
  const isPromotionCandidatesPreset = inputType === 'promotion_candidates'

  const [inputDraft, setInputDraft] = useState<{ startDate: string; endDate: string }>(() =>
    datesInputFromMilestone(milestone.milestoneInput),
  )
  const [promotionCandidatesDraft, setPromotionCandidatesDraft] =
    useState<PromotionCandidatesInputDraft>(() =>
      promotionCandidatesInputFromMilestoneInput(milestone.milestoneInput),
    )
  const [optionalNotesDraft, setOptionalNotesDraft] = useState(() =>
    milestonePresetHasDefaultOptionalNotesInput(milestone.presetId)
      ? optionalNotesFromMilestoneInput(milestone.milestoneInput, milestone.presetId)
      : '',
  )

  useEffect(() => {
    setInputDraft(datesInputFromMilestone(milestone.milestoneInput))
    if (milestone.presetId === 'promotion_candidates') {
      setPromotionCandidatesDraft(
        promotionCandidatesInputFromMilestoneInput(milestone.milestoneInput),
      )
    }
  }, [milestone.id, milestone.milestoneInput, milestone.presetId])

  const previousMilestoneIdRef = useRef(milestone.id)
  const promotionCandidatesFocusedRef = useRef(false)
  const optionalNotesFocusedRef = useRef(false)

  useEffect(() => {
    if (milestone.presetId !== 'promotion_candidates') {
      previousMilestoneIdRef.current = milestone.id
      return
    }
    const server = promotionCandidatesInputFromMilestoneInput(milestone.milestoneInput)
    setPromotionCandidatesDraft((prev) => {
      if (previousMilestoneIdRef.current !== milestone.id) {
        previousMilestoneIdRef.current = milestone.id
        return server
      }
      if (!promotionCandidatesInputEqual(prev, server)) {
        if (!promotionCandidatesFocusedRef.current) {
          return server
        }
        return prev
      }
      return prev
    })
  }, [milestone.presetId, milestone.id, milestone.milestoneInput])

  useEffect(() => {
    if (!milestonePresetHasDefaultOptionalNotesInput(milestone.presetId)) {
      previousMilestoneIdRef.current = milestone.id
      return
    }
    const server = optionalNotesFromMilestoneInput(milestone.milestoneInput, milestone.presetId)
    setOptionalNotesDraft((prev) => {
      if (previousMilestoneIdRef.current !== milestone.id) {
        previousMilestoneIdRef.current = milestone.id
        return server
      }
      if (prev.trim() !== server.trim()) {
        if (!optionalNotesFocusedRef.current) {
          return server
        }
        return prev
      }
      return prev === server ? prev : server
    })
  }, [milestone.presetId, milestone.id, milestone.milestoneInput])

  const milestoneRef = useRef(milestone)
  milestoneRef.current = milestone
  const inputDraftRef = useRef(inputDraft)
  inputDraftRef.current = inputDraft
  const optionalNotesDraftRef = useRef(optionalNotesDraft)
  optionalNotesDraftRef.current = optionalNotesDraft
  const promotionCandidatesDraftRef = useRef(promotionCandidatesDraft)
  promotionCandidatesDraftRef.current = promotionCandidatesDraft
  const onUpdateMilestoneInputRef = useRef(onUpdateMilestoneInput)
  onUpdateMilestoneInputRef.current = onUpdateMilestoneInput
  const debounceTimerRef = useRef<number | null>(null)
  const flushChainRef = useRef<Promise<unknown>>(Promise.resolve())

  const serverDatesInput = datesInputFromMilestone(milestone.milestoneInput)
  const inputDirty =
    inputDraft.startDate !== serverDatesInput.startDate ||
    inputDraft.endDate !== serverDatesInput.endDate

  const optionalNotesDirty = useMemo(() => {
    if (!milestonePresetHasDefaultOptionalNotesInput(milestone.presetId)) {
      return false
    }
    const server = optionalNotesFromMilestoneInput(
      milestone.milestoneInput,
      milestone.presetId,
    ).trim()
    return optionalNotesDraft.trim() !== server
  }, [milestone.milestoneInput, milestone.presetId, optionalNotesDraft])

  const promotionCandidatesDirty = useMemo(() => {
    if (!isPromotionCandidatesPreset) {
      return false
    }
    const server = promotionCandidatesInputFromMilestoneInput(milestone.milestoneInput)
    return !promotionCandidatesInputEqual(promotionCandidatesDraft, server)
  }, [isPromotionCandidatesPreset, milestone.milestoneInput, promotionCandidatesDraft])

  const performMilestoneInputFlush = useCallback(
    async ({
      normalizeOptionalNotesDraft,
    }: {
      normalizeOptionalNotesDraft: boolean
    }): Promise<boolean> => {
      const onUpdate = onUpdateMilestoneInputRef.current
      if (!onUpdate) {
        return true
      }
      const m = milestoneRef.current
      if (m.presetId === 'dates') {
        const server = datesInputFromMilestone(m.milestoneInput)
        const draft = inputDraftRef.current
        if (draft.startDate === server.startDate && draft.endDate === server.endDate) {
          return true
        }
        const ok = await onUpdate(m.id, {
          type: 'dates',
          value: {
            startDate: draft.startDate,
            endDate: draft.endDate,
          },
        })
        if (!ok) {
          setInputDraft(server)
        }
        return ok
      }
      if (m.presetId === 'promotion_candidates') {
        const server = promotionCandidatesInputFromMilestoneInput(m.milestoneInput)
        const normalizedDraft = normalizePromotionCandidatesInput(
          promotionCandidatesDraftRef.current,
        )
        if (promotionCandidatesInputEqual(normalizedDraft, server)) {
          if (
            normalizeOptionalNotesDraft &&
            !promotionCandidatesInputEqual(promotionCandidatesDraftRef.current, normalizedDraft)
          ) {
            setPromotionCandidatesDraft(normalizedDraft)
          }
          return true
        }
        const ok = await onUpdate(m.id, {
          type: 'promotion_candidates',
          value: normalizedDraft,
        })
        if (!ok) {
          setPromotionCandidatesDraft(server)
        } else if (normalizeOptionalNotesDraft) {
          setPromotionCandidatesDraft(normalizedDraft)
        }
        return ok
      }
      if (milestonePresetHasDefaultOptionalNotesInput(m.presetId)) {
        const server = optionalNotesFromMilestoneInput(m.milestoneInput, m.presetId)
        const trimmedDraft = optionalNotesDraftRef.current.trim()
        const trimmedServer = server.trim()
        if (trimmedDraft === trimmedServer) {
          if (normalizeOptionalNotesDraft && optionalNotesDraftRef.current !== trimmedDraft) {
            setOptionalNotesDraft(trimmedDraft)
          }
          return true
        }
        const ok = await onUpdate(m.id, {
          type: m.presetId,
          value: { notes: trimmedDraft },
        })
        if (!ok) {
          setOptionalNotesDraft(server)
        } else if (normalizeOptionalNotesDraft) {
          setOptionalNotesDraft(trimmedDraft)
        }
        return ok
      }
      return true
    },
    [],
  )

  const flushMilestoneInputSave = useCallback(
    async (options?: { normalizeOptionalNotesDraft?: boolean }): Promise<boolean> => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
        debounceTimerRef.current = null
      }
      const normalizeOptionalNotesDraft = options?.normalizeOptionalNotesDraft ?? false
      const run = flushChainRef.current.then(() =>
        performMilestoneInputFlush({ normalizeOptionalNotesDraft }),
      )
      flushChainRef.current = run.catch(() => false)
      return run
    },
    [performMilestoneInputFlush],
  )

  useEffect(() => {
    if (!onUpdateMilestoneInput) {
      return
    }
    if (isMilestoneRunning) {
      return
    }
    const dirty =
      (isDatesPreset && inputDirty) ||
      (isPromotionCandidatesPreset && promotionCandidatesDirty) ||
      (!isDatesPreset &&
        !isPromotionCandidatesPreset &&
        usesOptionalNotesInput &&
        optionalNotesDirty)
    if (!dirty) {
      return
    }
    const id = window.setTimeout(() => {
      debounceTimerRef.current = null
      void flushMilestoneInputSave()
    }, MILESTONE_INPUT_AUTOSAVE_DEBOUNCE_MS)
    debounceTimerRef.current = id
    return () => {
      window.clearTimeout(id)
      if (debounceTimerRef.current === id) {
        debounceTimerRef.current = null
      }
    }
  }, [
    optionalNotesDirty,
    optionalNotesDraft,
    promotionCandidatesDirty,
    promotionCandidatesDraft,
    flushMilestoneInputSave,
    inputDirty,
    inputDraft,
    isPromotionCandidatesPreset,
    usesOptionalNotesInput,
    isDatesPreset,
    isMilestoneRunning,
    onUpdateMilestoneInput,
  ])

  const handleRunMilestoneWithInputFlush = useCallback(
    async (id: string, chatModel?: ChatGatewayModelId) => {
      if (id === milestone.id) {
        const ok = await flushMilestoneInputSave()
        if (!ok) {
          return
        }
      }
      await onRunMilestone(id, chatModel)
    },
    [flushMilestoneInputSave, milestone.id, onRunMilestone],
  )

  const inputSaveStatus: FieldSaveStatusVariant = savingInput
    ? 'saving'
    : (isDatesPreset && inputDirty) ||
        (isPromotionCandidatesPreset && promotionCandidatesDirty) ||
        (usesOptionalNotesInput && optionalNotesDirty)
      ? 'unsaved'
      : 'saved'

  const handleOptionalNotesBlur = useCallback(() => {
    optionalNotesFocusedRef.current = false
    void flushMilestoneInputSave({ normalizeOptionalNotesDraft: true })
  }, [flushMilestoneInputSave])

  const handleOptionalNotesFocus = useCallback(() => {
    optionalNotesFocusedRef.current = true
  }, [])

  const handlePromotionCandidatesNotesBlur = useCallback(() => {
    promotionCandidatesFocusedRef.current = false
    void flushMilestoneInputSave({ normalizeOptionalNotesDraft: true })
  }, [flushMilestoneInputSave])

  const handlePromotionCandidatesNotesFocus = useCallback(() => {
    promotionCandidatesFocusedRef.current = true
  }, [])

  const handlePromotionCandidatesDraftChange = useCallback(
    (next: PromotionCandidatesInputDraft) => {
      promotionCandidatesFocusedRef.current = true
      setPromotionCandidatesDraft(next)
    },
    [],
  )

  const inputModel = useMemo((): MilestoneInputModel => {
    if (isDatesPreset) {
      return {
        type: 'dates',
        draft: inputDraft,
        setDraft: setInputDraft,
        saveStatus: inputSaveStatus,
        saving: savingInput,
      }
    }
    if (isPromotionCandidatesPreset) {
      return {
        type: 'promotion_candidates',
        draft: promotionCandidatesDraft,
        onChange: handlePromotionCandidatesDraftChange,
        onNotesBlur: handlePromotionCandidatesNotesBlur,
        onNotesFocus: handlePromotionCandidatesNotesFocus,
        mainCategory: campaignBriefMainCategory,
        saveStatus: inputSaveStatus,
        saving: savingInput,
      }
    }
    if (usesOptionalNotesInput && milestone.presetId) {
      const presetId = milestone.presetId
      const base = `milestonePreset.${presetId}` as const
      return {
        type: 'optional_notes',
        draft: optionalNotesDraft,
        setDraft: setOptionalNotesDraft,
        onBlur: handleOptionalNotesBlur,
        onFocus: handleOptionalNotesFocus,
        copy: {
          label: t(`${base}.inputLabel`),
          description: t(`${base}.inputDescription`),
          placeholder: t(`${base}.inputPlaceholder`),
        },
        saveStatus: inputSaveStatus,
        saving: savingInput,
      }
    }
    return { type: 'none' }
  }, [
    campaignBriefMainCategory,
    handleOptionalNotesBlur,
    handleOptionalNotesFocus,
    handlePromotionCandidatesDraftChange,
    handlePromotionCandidatesNotesBlur,
    handlePromotionCandidatesNotesFocus,
    inputDraft,
    inputSaveStatus,
    isDatesPreset,
    isPromotionCandidatesPreset,
    milestone.presetId,
    optionalNotesDraft,
    promotionCandidatesDraft,
    savingInput,
    t,
    usesOptionalNotesInput,
  ])

  return {
    inputModel,
    handleRunMilestoneWithInputFlush,
  }
}
