'use client'

import { useState } from 'react'
import { File, Plus } from 'lucide-react'
import { useTranslations } from 'next-intl'
import type { LucideIcon } from 'lucide-react'

import {
  MILESTONE_PRESET_IDS,
  milestonePresetIconFor,
  type MilestonePresetId,
} from '@/lib/milestones/preset-definitions'
import { Button } from '@workspace/ui/components/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@workspace/ui/components/dialog'
import { Spinner } from '@workspace/ui/components/spinner'
import { cn } from '@workspace/ui/lib/utils'

const EMPTY_PRESET_CHOICE = '__none__' as const

type PendingChoice = typeof EMPTY_PRESET_CHOICE | MilestonePresetId

export type MilestoneCreateControlsProps = {
  disabled: boolean
  creating: boolean
  onCreateMilestone: () => boolean | Promise<boolean>
  onCreateMilestoneFromPreset: (presetId: MilestonePresetId) => boolean | Promise<boolean>
}

export function MilestoneCreateControls({
  disabled,
  creating,
  onCreateMilestone,
  onCreateMilestoneFromPreset,
}: MilestoneCreateControlsProps) {
  const t = useTranslations('analytics.workflows.chat')
  const [open, setOpen] = useState(false)
  const [pendingChoice, setPendingChoice] = useState<PendingChoice | null>(null)

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen)
    if (!nextOpen) {
      setPendingChoice(null)
    }
  }

  const handleCreateEmpty = async () => {
    setPendingChoice(EMPTY_PRESET_CHOICE)
    const ok = await onCreateMilestone()
    if (ok) {
      setOpen(false)
      setPendingChoice(null)
    } else {
      setPendingChoice(null)
    }
  }

  const handleCreatePreset = async (presetId: MilestonePresetId) => {
    setPendingChoice(presetId)
    const ok = await onCreateMilestoneFromPreset(presetId)
    if (ok) {
      setOpen(false)
      setPendingChoice(null)
    } else {
      setPendingChoice(null)
    }
  }

  const optionsDisabled = disabled || creating || pendingChoice !== null

  return (
    <div
      className="flex shrink-0 items-center justify-center"
      data-milestone-card
      onClick={(event) => event.stopPropagation()}
    >
      <Dialog onOpenChange={handleOpenChange} open={open}>
        <Button
          aria-busy={creating}
          aria-label={creating ? t('creatingMilestone') : t('milestonePreset.addAriaLabel')}
          className="rounded-full"
          disabled={disabled || creating}
          onClick={() => setOpen(true)}
          size="icon"
          type="button"
          variant="outline"
        >
          {creating ? <Spinner /> : <Plus />}
        </Button>
        <DialogContent className="flex max-h-[min(85vh,40rem)] flex-col gap-4 overflow-hidden p-6 sm:max-w-xl">
          <DialogHeader className="shrink-0">
            <DialogTitle>{t('milestonePreset.dialogTitle')}</DialogTitle>
            <DialogDescription>{t('milestonePreset.dialogDescription')}</DialogDescription>
          </DialogHeader>
          <div className="min-h-0 max-h-[min(60vh,28rem)] flex-1 overflow-y-auto overscroll-contain pr-1">
            <div className="flex flex-col gap-2 pb-1">
              <MilestonePresetOption
                description={t('milestonePreset.noneSummary')}
                disabled={optionsDisabled}
                icon={File}
                pending={pendingChoice === EMPTY_PRESET_CHOICE}
                selected={pendingChoice === EMPTY_PRESET_CHOICE}
                onSelect={() => void handleCreateEmpty()}
                title={t('milestonePreset.noneLabel')}
              />
              {MILESTONE_PRESET_IDS.map((id) => {
                const Icon = milestonePresetIconFor(id)
                const isSelected = pendingChoice === id
                return (
                  <MilestonePresetOption
                    key={id}
                    description={presetOptionSummary(id, t)}
                    disabled={optionsDisabled}
                    icon={Icon}
                    pending={isSelected}
                    selected={isSelected}
                    onSelect={() => void handleCreatePreset(id)}
                    title={presetOptionLabel(id, t)}
                  />
                )
              })}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

type MilestonePresetOptionProps = {
  title: string
  description: string
  icon: LucideIcon
  disabled: boolean
  selected: boolean
  pending: boolean
  onSelect: () => void
}

function MilestonePresetOption({
  title,
  description,
  icon: Icon,
  disabled,
  selected,
  pending,
  onSelect,
}: MilestonePresetOptionProps) {
  return (
    <button
      aria-busy={pending}
      aria-pressed={selected}
      className={cn(
        'flex w-full items-start gap-3 rounded-xl border border-card-border bg-card p-4 text-left shadow-none transition-[border-color,background-color,box-shadow,opacity] duration-200',
        'hover:border-[var(--color-border-strong)]',
        'focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50',
        'disabled:pointer-events-none',
        selected ? 'border-primary bg-primary/5 ring-1 ring-primary/30' : 'disabled:opacity-40',
      )}
      disabled={disabled}
      onClick={onSelect}
      type="button"
    >
      <span
        className={cn(
          'flex size-10 shrink-0 items-center justify-center rounded-lg text-foreground',
          selected ? 'bg-primary text-primary-foreground' : 'bg-muted',
        )}
      >
        {pending ? <Spinner /> : <Icon aria-hidden />}
      </span>
      <span className="flex min-w-0 flex-col gap-1">
        <span className="font-semibold text-foreground text-sm leading-none">{title}</span>
        <span className="text-muted-foreground text-sm">{description}</span>
      </span>
    </button>
  )
}

function presetOptionLabel(id: MilestonePresetId, t: (key: string) => string): string {
  switch (id) {
    case 'dates':
      return t('milestonePreset.dates.label')
    case 'restaurant_campaign_brief':
      return t('milestonePreset.restaurant_campaign_brief.label')
    case 'promotion_candidates':
      return t('milestonePreset.promotion_candidates.label')
    case 'menu_tagger':
      return t('milestonePreset.menu_tagger.label')
    case 'menu_clusterer':
      return t('milestonePreset.menu_clusterer.label')
    case 'culture_hooks':
      return t('milestonePreset.culture_hooks.label')
    case 'ig_profile':
      return t('milestonePreset.ig_profile.label')
    case 'ig_plan':
      return t('milestonePreset.ig_plan.label')
    case 'ig_menu_picker':
      return t('milestonePreset.ig_menu_picker.label')
    case 'ig_format':
      return t('milestonePreset.ig_format.label')
    case 'ig_text':
      return t('milestonePreset.ig_text.label')
    case 'drafts':
      return t('milestonePreset.drafts.label')
    case 'scheduler':
      return t('milestonePreset.scheduler.label')
    default: {
      const _exhaustive: never = id
      return _exhaustive
    }
  }
}

function presetOptionSummary(id: MilestonePresetId, t: (key: string) => string): string {
  switch (id) {
    case 'dates':
      return t('milestonePreset.dates.summary')
    case 'restaurant_campaign_brief':
      return t('milestonePreset.restaurant_campaign_brief.summary')
    case 'promotion_candidates':
      return t('milestonePreset.promotion_candidates.summary')
    case 'menu_tagger':
      return t('milestonePreset.menu_tagger.summary')
    case 'menu_clusterer':
      return t('milestonePreset.menu_clusterer.summary')
    case 'culture_hooks':
      return t('milestonePreset.culture_hooks.summary')
    case 'ig_profile':
      return t('milestonePreset.ig_profile.summary')
    case 'ig_plan':
      return t('milestonePreset.ig_plan.summary')
    case 'ig_menu_picker':
      return t('milestonePreset.ig_menu_picker.summary')
    case 'ig_format':
      return t('milestonePreset.ig_format.summary')
    case 'ig_text':
      return t('milestonePreset.ig_text.summary')
    case 'drafts':
      return t('milestonePreset.drafts.summary')
    case 'scheduler':
      return t('milestonePreset.scheduler.summary')
    default: {
      const _exhaustive: never = id
      return _exhaustive
    }
  }
}
