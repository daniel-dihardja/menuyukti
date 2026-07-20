'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useTranslations } from 'next-intl'

import type { FieldSaveStatusVariant } from '@/components/field-save-status'
import {
  campaignBriefInputFromMilestoneInput,
  normalizeCampaignBriefInput,
  normalizedCampaignBriefInputsEqual,
  type CampaignBriefInputDraft,
} from '@/lib/milestones/campaign-brief-input'
import { extractCampaignBriefMainCategory } from '@/lib/milestones/campaign-brief-main-category'
import {
  milestonePresetHasDefaultOptionalNotesInput,
  milestonePresetUsesManualInputSave,
  normalizePromotionCandidatesInput,
  normalizeMenuClustererInput,
  normalizeIgMenuPickerInput,
  normalizedPromotionCandidatesInputsEqual,
  normalizedMenuClustererInputsEqual,
  normalizedIgMenuPickerInputsEqual,
  optionalNotesFromMilestoneInput,
  promotionCandidatesDraftFromNormalized,
  promotionCandidatesInputFromMilestoneInput,
  menuClustererInputFromMilestoneInput,
  igMenuPickerInputFromMilestoneInput,
  igMenuPickerInputEqual,
  igFormatNotesFromMilestoneInput,
  igTextNotesFromMilestoneInput,
} from '@/lib/milestones/milestone-input-tab'
import { withPreservedDependencyIds } from '@/lib/milestones/milestone-dependencies'
import { milestonePresetInputType } from '@/lib/milestones/preset-definitions'
import type { ChatGatewayModelId } from '@/lib/chat/gateway-chat-models'

import type { TimelineActions } from '../timeline-context'
import { useTimelineWorkspaceState } from '../timeline-context'
import type { MilestoneInputModel } from './milestone-item-input-model'
import type { PromotionCandidatesInputDraft } from './milestone-promotion-candidates-input'
import type { MenuClustererInputDraft } from './milestone-menu-clusterer-input'
import type { IgMenuPickerInputDraft } from './milestone-ig-menu-picker-input'
import type { TimelineMilestone } from './types'
import type { MilestoneInput } from './types'

type MilestoneInputFlushResult = {
  ok: boolean
  milestoneInput?: MilestoneInput
}

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
  return normalizedPromotionCandidatesInputsEqual(
    normalizePromotionCandidatesInput(a),
    normalizePromotionCandidatesInput(b),
  )
}

function menuClustererInputEqual(a: MenuClustererInputDraft, b: MenuClustererInputDraft): boolean {
  return normalizedMenuClustererInputsEqual(
    normalizeMenuClustererInput(a),
    normalizeMenuClustererInput(b),
  )
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
  const usesManualInputSave = milestonePresetUsesManualInputSave(inputType)
  const usesOptionalNotesInput = inputType === 'optional_notes'
  const isDatesPreset = inputType === 'dates'
  const isPromotionCandidatesPreset = inputType === 'promotion_candidates'
  const isCampaignBriefPreset = inputType === 'campaign_brief'
  const isMenuClustererPreset = inputType === 'menu_clusterer'
  const isIgMenuPickerPreset = inputType === 'ig_menu_picker'
  const isIgFormatPreset = inputType === 'ig_format'
  const isIgTextPreset = inputType === 'ig_text'
  const isIgNotesPreset = isIgFormatPreset || isIgTextPreset

  const [inputDraft, setInputDraft] = useState<{ startDate: string; endDate: string }>(() =>
    datesInputFromMilestone(milestone.milestoneInput),
  )
  const [promotionCandidatesDraft, setPromotionCandidatesDraft] =
    useState<PromotionCandidatesInputDraft>(() =>
      promotionCandidatesInputFromMilestoneInput(milestone.milestoneInput),
    )
  const [campaignBriefDraft, setCampaignBriefDraft] = useState<CampaignBriefInputDraft>(() =>
    campaignBriefInputFromMilestoneInput(milestone.milestoneInput),
  )
  const [menuClustererDraft, setMenuClustererDraft] = useState<MenuClustererInputDraft>(() =>
    menuClustererInputFromMilestoneInput(milestone.milestoneInput),
  )
  const [igMenuPickerDraft, setIgMenuPickerDraft] = useState<IgMenuPickerInputDraft>(() =>
    igMenuPickerInputFromMilestoneInput(milestone.milestoneInput),
  )
  const [optionalNotesDraft, setOptionalNotesDraft] = useState(() => {
    if (milestonePresetHasDefaultOptionalNotesInput(milestone.presetId)) {
      return optionalNotesFromMilestoneInput(milestone.milestoneInput, milestone.presetId)
    }
    if (milestone.presetId === 'ig_format') {
      return igFormatNotesFromMilestoneInput(milestone.milestoneInput)
    }
    if (milestone.presetId === 'ig_text') {
      return igTextNotesFromMilestoneInput(milestone.milestoneInput)
    }
    return ''
  })

  useEffect(() => {
    if (isDatesPreset) {
      setInputDraft(datesInputFromMilestone(milestone.milestoneInput))
    }
  }, [isDatesPreset, milestone.id, milestone.milestoneInput])

  const previousMilestoneIdRef = useRef(milestone.id)
  const hasUnsavedManualEditsRef = useRef(false)
  const optionalNotesFocusedRef = useRef(false)

  useEffect(() => {
    hasUnsavedManualEditsRef.current = false
    previousMilestoneIdRef.current = milestone.id
  }, [milestone.id])

  useEffect(() => {
    if (milestone.presetId !== 'promotion_candidates') {
      return
    }
    const server = promotionCandidatesInputFromMilestoneInput(milestone.milestoneInput)
    setPromotionCandidatesDraft((prev) => {
      if (previousMilestoneIdRef.current !== milestone.id) {
        previousMilestoneIdRef.current = milestone.id
        hasUnsavedManualEditsRef.current = false
        return server
      }
      if (!promotionCandidatesInputEqual(prev, server)) {
        if (!hasUnsavedManualEditsRef.current) {
          return server
        }
        return prev
      }
      return prev
    })
  }, [milestone.presetId, milestone.id, milestone.milestoneInput])

  useEffect(() => {
    if (milestone.presetId !== 'restaurant_campaign_brief') {
      return
    }
    const server = campaignBriefInputFromMilestoneInput(milestone.milestoneInput)
    setCampaignBriefDraft((prev) => {
      if (previousMilestoneIdRef.current !== milestone.id) {
        previousMilestoneIdRef.current = milestone.id
        hasUnsavedManualEditsRef.current = false
        return server
      }
      if (!normalizedCampaignBriefInputsEqual(prev, server)) {
        if (!hasUnsavedManualEditsRef.current) {
          return server
        }
        return prev
      }
      return prev
    })
  }, [milestone.presetId, milestone.id, milestone.milestoneInput])

  useEffect(() => {
    if (milestone.presetId !== 'menu_clusterer') {
      return
    }
    const server = menuClustererInputFromMilestoneInput(milestone.milestoneInput)
    setMenuClustererDraft((prev) => {
      if (previousMilestoneIdRef.current !== milestone.id) {
        previousMilestoneIdRef.current = milestone.id
        hasUnsavedManualEditsRef.current = false
        return server
      }
      if (!menuClustererInputEqual(prev, server)) {
        if (!hasUnsavedManualEditsRef.current) {
          return server
        }
        return prev
      }
      return prev
    })
  }, [milestone.presetId, milestone.id, milestone.milestoneInput])

  useEffect(() => {
    if (milestone.presetId !== 'ig_menu_picker') {
      return
    }
    const server = igMenuPickerInputFromMilestoneInput(milestone.milestoneInput)
    setIgMenuPickerDraft((prev) => {
      if (previousMilestoneIdRef.current !== milestone.id) {
        previousMilestoneIdRef.current = milestone.id
        hasUnsavedManualEditsRef.current = false
        return server
      }
      if (!igMenuPickerInputEqual(prev, server)) {
        if (!hasUnsavedManualEditsRef.current) {
          return server
        }
        return prev
      }
      return prev
    })
  }, [milestone.presetId, milestone.id, milestone.milestoneInput])

  useEffect(() => {
    if (!milestonePresetHasDefaultOptionalNotesInput(milestone.presetId) && !isIgNotesPreset) {
      previousMilestoneIdRef.current = milestone.id
      return
    }
    let server = ''
    if (milestone.presetId === 'ig_format') {
      server = igFormatNotesFromMilestoneInput(milestone.milestoneInput)
    } else if (milestone.presetId === 'ig_text') {
      server = igTextNotesFromMilestoneInput(milestone.milestoneInput)
    } else if (milestonePresetHasDefaultOptionalNotesInput(milestone.presetId)) {
      server = optionalNotesFromMilestoneInput(milestone.milestoneInput, milestone.presetId)
    }
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
  }, [milestone.presetId, milestone.id, milestone.milestoneInput, isIgNotesPreset])

  const milestoneRef = useRef(milestone)
  milestoneRef.current = milestone
  const inputDraftRef = useRef(inputDraft)
  inputDraftRef.current = inputDraft
  const optionalNotesDraftRef = useRef(optionalNotesDraft)
  optionalNotesDraftRef.current = optionalNotesDraft
  const promotionCandidatesDraftRef = useRef(promotionCandidatesDraft)
  promotionCandidatesDraftRef.current = promotionCandidatesDraft
  const campaignBriefDraftRef = useRef(campaignBriefDraft)
  campaignBriefDraftRef.current = campaignBriefDraft
  const menuClustererDraftRef = useRef(menuClustererDraft)
  menuClustererDraftRef.current = menuClustererDraft
  const igMenuPickerDraftRef = useRef(igMenuPickerDraft)
  igMenuPickerDraftRef.current = igMenuPickerDraft
  const onUpdateMilestoneInputRef = useRef(onUpdateMilestoneInput)
  onUpdateMilestoneInputRef.current = onUpdateMilestoneInput
  const debounceTimerRef = useRef<number | null>(null)
  const flushChainRef = useRef<Promise<unknown>>(Promise.resolve())

  const handleDatesDraftChange = useCallback((next: { startDate: string; endDate: string }) => {
    inputDraftRef.current = next
    setInputDraft(next)
  }, [])

  const handleOptionalNotesDraftChange = useCallback((next: string) => {
    optionalNotesDraftRef.current = next
    setOptionalNotesDraft(next)
  }, [])

  const serverDatesInput = datesInputFromMilestone(milestone.milestoneInput)
  const inputDirty =
    inputDraft.startDate !== serverDatesInput.startDate ||
    inputDraft.endDate !== serverDatesInput.endDate

  const optionalNotesDirty = useMemo(() => {
    if (milestone.presetId === 'ig_format') {
      const server = igFormatNotesFromMilestoneInput(milestone.milestoneInput).trim()
      return optionalNotesDraft.trim() !== server
    }
    if (milestone.presetId === 'ig_text') {
      const server = igTextNotesFromMilestoneInput(milestone.milestoneInput).trim()
      return optionalNotesDraft.trim() !== server
    }
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

  const campaignBriefDirty = useMemo(() => {
    if (!isCampaignBriefPreset) {
      return false
    }
    const server = campaignBriefInputFromMilestoneInput(milestone.milestoneInput)
    return !normalizedCampaignBriefInputsEqual(
      normalizeCampaignBriefInput(campaignBriefDraft),
      normalizeCampaignBriefInput(server),
    )
  }, [campaignBriefDraft, isCampaignBriefPreset, milestone.milestoneInput])

  const menuClustererDirty = useMemo(() => {
    if (!isMenuClustererPreset) {
      return false
    }
    const server = menuClustererInputFromMilestoneInput(milestone.milestoneInput)
    return !menuClustererInputEqual(menuClustererDraft, server)
  }, [isMenuClustererPreset, milestone.milestoneInput, menuClustererDraft])

  const igMenuPickerDirty = useMemo(() => {
    if (!isIgMenuPickerPreset) {
      return false
    }
    const server = igMenuPickerInputFromMilestoneInput(milestone.milestoneInput)
    return !normalizedIgMenuPickerInputsEqual(igMenuPickerDraft, server)
  }, [igMenuPickerDraft, isIgMenuPickerPreset, milestone.milestoneInput])

  const buildMilestoneInputPayload = useCallback((): MilestoneInput | undefined => {
    const m = milestoneRef.current
    const existingValue = m.milestoneInput?.value
    if (m.presetId === 'dates') {
      return {
        type: 'dates',
        value: {
          startDate: inputDraftRef.current.startDate,
          endDate: inputDraftRef.current.endDate,
        },
      }
    }
    if (m.presetId === 'promotion_candidates') {
      return {
        type: 'promotion_candidates',
        value: withPreservedDependencyIds(
          normalizePromotionCandidatesInput(promotionCandidatesDraftRef.current),
          existingValue,
        ),
      }
    }
    if (m.presetId === 'restaurant_campaign_brief') {
      return {
        type: 'restaurant_campaign_brief',
        value: normalizeCampaignBriefInput(campaignBriefDraftRef.current),
      }
    }
    if (m.presetId === 'menu_clusterer') {
      return {
        type: 'menu_clusterer',
        value: withPreservedDependencyIds(
          normalizeMenuClustererInput(menuClustererDraftRef.current),
          existingValue,
        ),
      }
    }
    if (m.presetId === 'ig_menu_picker') {
      return {
        type: 'ig_menu_picker',
        value: withPreservedDependencyIds(
          normalizeIgMenuPickerInput(igMenuPickerDraftRef.current),
          existingValue,
        ),
      }
    }
    if (m.presetId === 'ig_format') {
      return {
        type: 'ig_format',
        value: withPreservedDependencyIds(
          { notes: optionalNotesDraftRef.current.trim() },
          existingValue,
        ),
      }
    }
    if (m.presetId === 'ig_text') {
      return {
        type: 'ig_text',
        value: withPreservedDependencyIds(
          { notes: optionalNotesDraftRef.current.trim() },
          existingValue,
        ),
      }
    }
    if (m.presetId && milestonePresetHasDefaultOptionalNotesInput(m.presetId)) {
      return {
        type: m.presetId,
        value: withPreservedDependencyIds(
          { notes: optionalNotesDraftRef.current.trim() },
          existingValue,
        ),
      }
    }
    return undefined
  }, [])

  const performMilestoneInputFlush = useCallback(
    async ({
      finalizeDraft,
      normalizeOptionalNotesDraft,
    }: {
      finalizeDraft: boolean
      normalizeOptionalNotesDraft: boolean
    }): Promise<MilestoneInputFlushResult> => {
      const milestoneInputPayload = buildMilestoneInputPayload()
      const onUpdate = onUpdateMilestoneInputRef.current
      if (!onUpdate) {
        return { ok: true, milestoneInput: milestoneInputPayload }
      }
      const m = milestoneRef.current
      if (m.presetId === 'dates') {
        const server = datesInputFromMilestone(m.milestoneInput)
        const draft = inputDraftRef.current
        if (draft.startDate === server.startDate && draft.endDate === server.endDate) {
          return { ok: true, milestoneInput: milestoneInputPayload }
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
        return { ok, milestoneInput: milestoneInputPayload }
      }
      if (m.presetId === 'promotion_candidates') {
        const server = promotionCandidatesInputFromMilestoneInput(m.milestoneInput)
        const normalizedDraft = normalizePromotionCandidatesInput(
          promotionCandidatesDraftRef.current,
        )
        const normalizedServer = normalizePromotionCandidatesInput(server)
        const canonicalDraft = promotionCandidatesDraftFromNormalized(normalizedDraft)
        if (normalizedPromotionCandidatesInputsEqual(normalizedDraft, normalizedServer)) {
          if (
            finalizeDraft &&
            !promotionCandidatesInputEqual(promotionCandidatesDraftRef.current, canonicalDraft)
          ) {
            setPromotionCandidatesDraft(canonicalDraft)
          }
          if (finalizeDraft) {
            hasUnsavedManualEditsRef.current = false
          }
          return { ok: true, milestoneInput: milestoneInputPayload }
        }
        const ok = await onUpdate(m.id, {
          type: 'promotion_candidates',
          value: withPreservedDependencyIds(normalizedDraft, m.milestoneInput?.value),
        })
        if (!ok) {
          setPromotionCandidatesDraft(server)
        } else if (finalizeDraft) {
          setPromotionCandidatesDraft(canonicalDraft)
          hasUnsavedManualEditsRef.current = false
        }
        return { ok, milestoneInput: milestoneInputPayload }
      }
      if (m.presetId === 'restaurant_campaign_brief') {
        const server = campaignBriefInputFromMilestoneInput(m.milestoneInput)
        const normalizedDraft = normalizeCampaignBriefInput(campaignBriefDraftRef.current)
        const normalizedServer = normalizeCampaignBriefInput(server)
        if (normalizedCampaignBriefInputsEqual(normalizedDraft, normalizedServer)) {
          if (
            finalizeDraft &&
            !normalizedCampaignBriefInputsEqual(campaignBriefDraftRef.current, normalizedDraft)
          ) {
            setCampaignBriefDraft(normalizedDraft)
          }
          if (finalizeDraft) {
            hasUnsavedManualEditsRef.current = false
          }
          return { ok: true, milestoneInput: milestoneInputPayload }
        }
        const ok = await onUpdate(m.id, {
          type: 'restaurant_campaign_brief',
          value: normalizedDraft,
        })
        if (!ok) {
          setCampaignBriefDraft(server)
        } else if (finalizeDraft) {
          setCampaignBriefDraft(normalizedDraft)
          hasUnsavedManualEditsRef.current = false
        }
        return { ok, milestoneInput: milestoneInputPayload }
      }
      if (m.presetId === 'menu_clusterer') {
        const server = menuClustererInputFromMilestoneInput(m.milestoneInput)
        const normalizedDraft = normalizeMenuClustererInput(menuClustererDraftRef.current)
        const normalizedServer = normalizeMenuClustererInput(server)
        if (normalizedMenuClustererInputsEqual(normalizedDraft, normalizedServer)) {
          if (
            finalizeDraft &&
            !menuClustererInputEqual(menuClustererDraftRef.current, normalizedDraft)
          ) {
            setMenuClustererDraft(normalizedDraft)
          }
          if (finalizeDraft) {
            hasUnsavedManualEditsRef.current = false
          }
          return { ok: true, milestoneInput: milestoneInputPayload }
        }
        const ok = await onUpdate(m.id, {
          type: 'menu_clusterer',
          value: withPreservedDependencyIds(normalizedDraft, m.milestoneInput?.value),
        })
        if (!ok) {
          setMenuClustererDraft(server)
        } else if (finalizeDraft) {
          setMenuClustererDraft(normalizedDraft)
          hasUnsavedManualEditsRef.current = false
        }
        return { ok, milestoneInput: milestoneInputPayload }
      }
      if (m.presetId === 'ig_menu_picker') {
        const server = igMenuPickerInputFromMilestoneInput(m.milestoneInput)
        const normalizedDraft = normalizeIgMenuPickerInput(igMenuPickerDraftRef.current)
        const normalizedServer = normalizeIgMenuPickerInput(server)
        const canonicalDraft = {
          notes: normalizedDraft.notes,
          selectedSlotKeys: normalizedDraft.selectedSlotKeys,
        }
        if (normalizedIgMenuPickerInputsEqual(normalizedDraft, normalizedServer)) {
          if (
            finalizeDraft &&
            !igMenuPickerInputEqual(igMenuPickerDraftRef.current, canonicalDraft)
          ) {
            setIgMenuPickerDraft(canonicalDraft)
          }
          if (finalizeDraft) {
            hasUnsavedManualEditsRef.current = false
          }
          return { ok: true, milestoneInput: milestoneInputPayload }
        }
        const ok = await onUpdate(m.id, {
          type: 'ig_menu_picker',
          value: withPreservedDependencyIds(normalizedDraft, m.milestoneInput?.value),
        })
        if (!ok) {
          setIgMenuPickerDraft(server)
        } else if (finalizeDraft) {
          setIgMenuPickerDraft(canonicalDraft)
          hasUnsavedManualEditsRef.current = false
        }
        return { ok, milestoneInput: milestoneInputPayload }
      }
      if (m.presetId === 'ig_format') {
        const server = igFormatNotesFromMilestoneInput(m.milestoneInput)
        const trimmedDraft = optionalNotesDraftRef.current.trim()
        const trimmedServer = server.trim()
        if (trimmedDraft === trimmedServer) {
          if (normalizeOptionalNotesDraft && optionalNotesDraftRef.current !== trimmedDraft) {
            setOptionalNotesDraft(trimmedDraft)
          }
          return { ok: true, milestoneInput: milestoneInputPayload }
        }
        const ok = await onUpdate(m.id, {
          type: 'ig_format',
          value: withPreservedDependencyIds({ notes: trimmedDraft }, m.milestoneInput?.value),
        })
        if (!ok) {
          setOptionalNotesDraft(server)
        } else if (normalizeOptionalNotesDraft) {
          setOptionalNotesDraft(trimmedDraft)
        }
        return { ok, milestoneInput: milestoneInputPayload }
      }
      if (m.presetId === 'ig_text') {
        const server = igTextNotesFromMilestoneInput(m.milestoneInput)
        const trimmedDraft = optionalNotesDraftRef.current.trim()
        const trimmedServer = server.trim()
        if (trimmedDraft === trimmedServer) {
          if (normalizeOptionalNotesDraft && optionalNotesDraftRef.current !== trimmedDraft) {
            setOptionalNotesDraft(trimmedDraft)
          }
          return { ok: true, milestoneInput: milestoneInputPayload }
        }
        const ok = await onUpdate(m.id, {
          type: 'ig_text',
          value: withPreservedDependencyIds({ notes: trimmedDraft }, m.milestoneInput?.value),
        })
        if (!ok) {
          setOptionalNotesDraft(server)
        } else if (normalizeOptionalNotesDraft) {
          setOptionalNotesDraft(trimmedDraft)
        }
        return { ok, milestoneInput: milestoneInputPayload }
      }
      if (milestonePresetHasDefaultOptionalNotesInput(m.presetId)) {
        const server = optionalNotesFromMilestoneInput(m.milestoneInput, m.presetId)
        const trimmedDraft = optionalNotesDraftRef.current.trim()
        const trimmedServer = server.trim()
        if (trimmedDraft === trimmedServer) {
          if (normalizeOptionalNotesDraft && optionalNotesDraftRef.current !== trimmedDraft) {
            setOptionalNotesDraft(trimmedDraft)
          }
          return { ok: true, milestoneInput: milestoneInputPayload }
        }
        const ok = await onUpdate(m.id, {
          type: m.presetId,
          value: withPreservedDependencyIds({ notes: trimmedDraft }, m.milestoneInput?.value),
        })
        if (!ok) {
          setOptionalNotesDraft(server)
        } else if (normalizeOptionalNotesDraft) {
          setOptionalNotesDraft(trimmedDraft)
        }
        return { ok, milestoneInput: milestoneInputPayload }
      }
      return { ok: true, milestoneInput: milestoneInputPayload }
    },
    [buildMilestoneInputPayload],
  )

  const flushMilestoneInputSave = useCallback(
    async (options?: {
      finalizeDraft?: boolean
      normalizeOptionalNotesDraft?: boolean
    }): Promise<MilestoneInputFlushResult> => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
        debounceTimerRef.current = null
      }
      const finalizeDraft = options?.finalizeDraft ?? usesManualInputSave
      const normalizeOptionalNotesDraft = options?.normalizeOptionalNotesDraft ?? false
      const run = flushChainRef.current.then(() =>
        performMilestoneInputFlush({ finalizeDraft, normalizeOptionalNotesDraft }),
      )
      flushChainRef.current = run.then((result) => result.ok).catch(() => false)
      return run
    },
    [performMilestoneInputFlush, usesManualInputSave],
  )

  useEffect(() => {
    if (!onUpdateMilestoneInput) {
      return
    }
    if (isMilestoneRunning) {
      return
    }
    if (usesManualInputSave) {
      return
    }
    const dirty =
      (isDatesPreset && inputDirty) ||
      (usesOptionalNotesInput && optionalNotesDirty) ||
      (isIgNotesPreset && optionalNotesDirty)
    if (!dirty) {
      return
    }
    const id = window.setTimeout(() => {
      debounceTimerRef.current = null
      void flushMilestoneInputSave({ finalizeDraft: false })
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
    flushMilestoneInputSave,
    inputDirty,
    inputDraft,
    usesManualInputSave,
    usesOptionalNotesInput,
    isIgFormatPreset,
    isIgTextPreset,
    isIgNotesPreset,
    isDatesPreset,
    isMilestoneRunning,
    onUpdateMilestoneInput,
  ])

  const handleRunMilestoneWithInputFlush = useCallback(
    async (id: string, chatModel?: ChatGatewayModelId) => {
      let milestoneInputForRun: MilestoneInput | undefined
      if (id === milestone.id) {
        const flushResult = await flushMilestoneInputSave()
        if (!flushResult.ok) {
          return
        }
        milestoneInputForRun = flushResult.milestoneInput
      }
      await onRunMilestone(id, chatModel, { milestoneInput: milestoneInputForRun })
    },
    [flushMilestoneInputSave, milestone.id, onRunMilestone],
  )

  const inputSaveStatus: FieldSaveStatusVariant = savingInput
    ? 'saving'
    : (isDatesPreset && inputDirty) ||
        (isPromotionCandidatesPreset && promotionCandidatesDirty) ||
        (isCampaignBriefPreset && campaignBriefDirty) ||
        (isMenuClustererPreset && menuClustererDirty) ||
        (isIgMenuPickerPreset && igMenuPickerDirty) ||
        ((usesOptionalNotesInput || isIgNotesPreset) && optionalNotesDirty)
      ? 'unsaved'
      : 'saved'

  const handleManualInputSave = useCallback(() => {
    void flushMilestoneInputSave({ finalizeDraft: true })
  }, [flushMilestoneInputSave])

  const handleOptionalNotesBlur = useCallback(() => {
    optionalNotesFocusedRef.current = false
    void flushMilestoneInputSave({
      finalizeDraft: false,
      normalizeOptionalNotesDraft: true,
    })
  }, [flushMilestoneInputSave])

  const handleOptionalNotesFocus = useCallback(() => {
    optionalNotesFocusedRef.current = true
  }, [])

  const handleManualInputNotesBlur = useCallback(() => {}, [])

  const handleManualInputNotesFocus = useCallback(() => {}, [])

  const markManualInputDirty = useCallback(() => {
    hasUnsavedManualEditsRef.current = true
  }, [])

  const handlePromotionCandidatesDraftChange = useCallback(
    (next: PromotionCandidatesInputDraft) => {
      markManualInputDirty()
      promotionCandidatesDraftRef.current = next
      setPromotionCandidatesDraft(next)
    },
    [markManualInputDirty],
  )

  const handleCampaignBriefDraftChange = useCallback(
    (next: CampaignBriefInputDraft) => {
      markManualInputDirty()
      campaignBriefDraftRef.current = next
      setCampaignBriefDraft(next)
    },
    [markManualInputDirty],
  )

  const handleMenuClustererDraftChange = useCallback(
    (next: MenuClustererInputDraft) => {
      markManualInputDirty()
      menuClustererDraftRef.current = next
      setMenuClustererDraft(next)
    },
    [markManualInputDirty],
  )

  const handleIgMenuPickerDraftChange = useCallback(
    (next: IgMenuPickerInputDraft) => {
      markManualInputDirty()
      igMenuPickerDraftRef.current = next
      setIgMenuPickerDraft(next)
    },
    [markManualInputDirty],
  )

  const manualSave = useMemo(
    () => ({
      onSave: handleManualInputSave,
    }),
    [handleManualInputSave],
  )

  const inputModel = useMemo((): MilestoneInputModel => {
    if (isDatesPreset) {
      return {
        type: 'dates',
        draft: inputDraft,
        setDraft: handleDatesDraftChange,
        saveStatus: inputSaveStatus,
        saving: savingInput,
      }
    }
    if (isPromotionCandidatesPreset) {
      return {
        type: 'promotion_candidates',
        draft: promotionCandidatesDraft,
        onChange: handlePromotionCandidatesDraftChange,
        onNotesBlur: handleManualInputNotesBlur,
        onNotesFocus: handleManualInputNotesFocus,
        mainCategory: campaignBriefMainCategory,
        manualSave,
        saveStatus: inputSaveStatus,
        saving: savingInput,
      }
    }
    if (isCampaignBriefPreset) {
      return {
        type: 'campaign_brief',
        draft: campaignBriefDraft,
        onChange: handleCampaignBriefDraftChange,
        onNotesBlur: handleManualInputNotesBlur,
        onNotesFocus: handleManualInputNotesFocus,
        manualSave,
        saveStatus: inputSaveStatus,
        saving: savingInput,
      }
    }
    if (isMenuClustererPreset) {
      return {
        type: 'menu_clusterer',
        draft: menuClustererDraft,
        onChange: handleMenuClustererDraftChange,
        onNotesBlur: handleManualInputNotesBlur,
        onNotesFocus: handleManualInputNotesFocus,
        manualSave,
        saveStatus: inputSaveStatus,
        saving: savingInput,
      }
    }
    if (isIgMenuPickerPreset) {
      return {
        type: 'ig_menu_picker',
        milestoneId: milestone.id,
        draft: igMenuPickerDraft,
        onChange: handleIgMenuPickerDraftChange,
        onNotesBlur: handleManualInputNotesBlur,
        onNotesFocus: handleManualInputNotesFocus,
        manualSave,
        saveStatus: inputSaveStatus,
        saving: savingInput,
      }
    }
    if (isIgFormatPreset) {
      return {
        type: 'ig_format',
        milestoneId: milestone.id,
        notes: optionalNotesDraft,
        onNotesChange: handleOptionalNotesDraftChange,
        onNotesBlur: handleOptionalNotesBlur,
        onNotesFocus: handleOptionalNotesFocus,
        saveStatus: inputSaveStatus,
        saving: savingInput,
      }
    }
    if (isIgTextPreset) {
      return {
        type: 'ig_text',
        milestoneId: milestone.id,
        notes: optionalNotesDraft,
        onNotesChange: handleOptionalNotesDraftChange,
        onNotesBlur: handleOptionalNotesBlur,
        onNotesFocus: handleOptionalNotesFocus,
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
        setDraft: handleOptionalNotesDraftChange,
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
    campaignBriefDraft,
    campaignBriefMainCategory,
    handleCampaignBriefDraftChange,
    handleDatesDraftChange,
    handleManualInputNotesBlur,
    handleManualInputNotesFocus,
    handleMenuClustererDraftChange,
    handleIgMenuPickerDraftChange,
    handleOptionalNotesBlur,
    handleOptionalNotesDraftChange,
    handleOptionalNotesFocus,
    handlePromotionCandidatesDraftChange,
    inputDraft,
    inputSaveStatus,
    isCampaignBriefPreset,
    isDatesPreset,
    isIgMenuPickerPreset,
    isIgFormatPreset,
    isIgTextPreset,
    isMenuClustererPreset,
    isPromotionCandidatesPreset,
    manualSave,
    milestone.id,
    milestone.presetId,
    igMenuPickerDraft,
    optionalNotesDraft,
    promotionCandidatesDraft,
    menuClustererDraft,
    savingInput,
    t,
    usesOptionalNotesInput,
  ])

  return {
    inputModel,
    handleRunMilestoneWithInputFlush,
  }
}
