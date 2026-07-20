'use client'

import { useEffect, useMemo, useRef } from 'react'
import { useTranslations } from 'next-intl'

import { Field, FieldDescription, FieldGroup, FieldLabel } from '@workspace/ui/components/field'
import { Badge } from '@workspace/ui/components/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@workspace/ui/components/select'

import type { MilestoneInput } from '@/lib/graphql/node-schemas'
import {
  defaultDependencyId,
  dependencyOptionLabel,
  dependencyPortsForPreset,
  listDependencyCandidates,
  selectedDependencyIdFromInput,
  type MilestoneDependencyField,
  type MilestoneDependencyPort,
} from '@/lib/milestones/milestone-dependencies'

import { useTimelineActions, useTimelineWorkspaceState } from '../timeline-context'
import type { TimelineMilestone } from './types'

function baseInputValueForMilestone(milestone: TimelineMilestone): Record<string, unknown> {
  const existing = milestone.milestoneInput?.value
  if (existing != null && typeof existing === 'object' && !Array.isArray(existing)) {
    return { ...(existing as Record<string, unknown>) }
  }
  if (milestone.presetId === 'dates') {
    return { startDate: '', endDate: '' }
  }
  if (milestone.presetId === 'promotion_candidates') {
    return {
      notes: '',
      selectedMenuCategories: [],
      ignoredMenuItems: [],
      starItemLimit: 5,
      puzzleItemLimit: 10,
    }
  }
  if (milestone.presetId === 'ig_menu_picker') {
    return { notes: '', selectedSlotKeys: [] }
  }
  if (milestone.presetId === 'menu_clusterer') {
    return { notes: '' }
  }
  return { notes: '' }
}

function inputTypeForMilestone(milestone: TimelineMilestone): string {
  return milestone.presetId ?? milestone.milestoneInput?.type ?? 'notes'
}

export type MilestoneDependencyChromeProps = {
  milestone: TimelineMilestone
  disabled?: boolean
}

export function MilestoneDependencyChrome({
  milestone,
  disabled = false,
}: MilestoneDependencyChromeProps) {
  const t = useTranslations('analytics.workflows.chat')
  const { milestoneState } = useTimelineWorkspaceState()
  const { onUpdateMilestoneInput } = useTimelineActions()
  const ports = dependencyPortsForPreset(milestone.presetId)
  const seedingRef = useRef(false)

  const portStates = useMemo(() => {
    return ports.map((port) => {
      const candidates = listDependencyCandidates(
        milestoneState.milestones,
        milestone.id,
        port.requiredPresetId,
      )
      const selected =
        selectedDependencyIdFromInput(milestone.milestoneInput, port.field) ??
        defaultDependencyId(milestoneState.milestones, milestone.id, port.requiredPresetId) ??
        ''
      return { port, candidates, selected }
    })
  }, [milestone.id, milestone.milestoneInput, milestoneState.milestones, ports])

  useEffect(() => {
    if (!onUpdateMilestoneInput || seedingRef.current || disabled) {
      return
    }
    const missingDefaults: Partial<Record<MilestoneDependencyField, string>> = {}
    let needsSeed = false
    for (const { port, selected } of portStates) {
      const stored = selectedDependencyIdFromInput(milestone.milestoneInput, port.field)
      if (!stored && selected) {
        missingDefaults[port.field] = selected
        needsSeed = true
      }
    }
    if (!needsSeed) {
      return
    }
    seedingRef.current = true
    const nextValue = {
      ...baseInputValueForMilestone(milestone),
      ...missingDefaults,
    }
    void onUpdateMilestoneInput(milestone.id, {
      type: inputTypeForMilestone(milestone),
      value: nextValue,
    }).finally(() => {
      seedingRef.current = false
    })
  }, [disabled, milestone, onUpdateMilestoneInput, portStates])

  const handleSelect = (port: MilestoneDependencyPort, nextId: string) => {
    if (!onUpdateMilestoneInput || !nextId.trim()) {
      return
    }
    const nextValue = {
      ...baseInputValueForMilestone(milestone),
      [port.field]: nextId.trim(),
    }
    void onUpdateMilestoneInput(milestone.id, {
      type: inputTypeForMilestone(milestone),
      value: nextValue,
    } satisfies MilestoneInput)
  }

  return (
    <FieldGroup className="mb-4 gap-4">
      <Field>
        <FieldLabel>{t('milestoneDependencySelfIdLabel')}</FieldLabel>
        <FieldDescription>{t('milestoneDependencySelfIdDescription')}</FieldDescription>
        <div>
          <Badge className="font-mono tracking-wide" variant="secondary">
            {milestone.displayCode?.trim() || milestone.id}
          </Badge>
        </div>
      </Field>
      {portStates.map(({ port, candidates, selected }) => (
        <Field key={port.field}>
          <FieldLabel>{t(port.labelKey)}</FieldLabel>
          <FieldDescription>{t('milestoneDependencySelectDescription')}</FieldDescription>
          {candidates.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t('milestoneDependencySelectEmpty')}</p>
          ) : (
            <Select
              disabled={disabled}
              onValueChange={(value) => handleSelect(port, value)}
              value={selected || undefined}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder={t('milestoneDependencySelectPlaceholder')} />
              </SelectTrigger>
              <SelectContent>
                {candidates.map((candidate) => (
                  <SelectItem key={candidate.id} value={candidate.id}>
                    {dependencyOptionLabel(candidate)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </Field>
      ))}
    </FieldGroup>
  )
}
