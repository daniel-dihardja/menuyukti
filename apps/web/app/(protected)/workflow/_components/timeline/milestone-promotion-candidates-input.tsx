'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslations } from 'next-intl'

import { Alert, AlertDescription } from '@workspace/ui/components/alert'
import { Badge } from '@workspace/ui/components/badge'
import { Button } from '@workspace/ui/components/button'
import { Checkbox } from '@workspace/ui/components/checkbox'
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from '@workspace/ui/components/field'
import { Label } from '@workspace/ui/components/label'
import { Separator } from '@workspace/ui/components/separator'
import { Skeleton } from '@workspace/ui/components/skeleton'
import { Textarea } from '@workspace/ui/components/textarea'
import { ToggleGroup, ToggleGroupItem } from '@workspace/ui/components/toggle-group'
import { cn } from '@workspace/ui/lib/utils'

import {
  UNCATEGORIZED_MENU_CATEGORY_KEY,
  type MenuCategorySummary,
} from '@/lib/analytics/menu-categories'
import type { PromotionCandidatesItemLimit } from '@/lib/graphql/node-schemas'

export type PromotionCandidatesInputDraft = {
  notes: string
  selectedMenuCategories: string[]
  starItemLimit: PromotionCandidatesItemLimit
  puzzleItemLimit: PromotionCandidatesItemLimit
}

type LoadState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'ready'; categories: MenuCategorySummary[] }
  | { status: 'error' }

export type MilestonePromotionCandidatesInputProps = {
  locationId: number
  analyticsRunId: number | null
  draft: PromotionCandidatesInputDraft
  onDraftChange: (next: PromotionCandidatesInputDraft) => void
  onNotesBlur: () => void
  onNotesFocus: () => void
  disabled?: boolean
}

const ITEM_LIMIT_OPTIONS: PromotionCandidatesItemLimit[] = [5, 10, 'all']

function categoryLabel(name: string, uncategorizedLabel: string): string {
  return name === UNCATEGORIZED_MENU_CATEGORY_KEY ? uncategorizedLabel : name
}

function parseItemLimit(value: string): PromotionCandidatesItemLimit | null {
  if (value === 'all') return 'all'
  if (value === '5') return 5
  if (value === '10') return 10
  return null
}

function limitLabel(
  t: ReturnType<typeof useTranslations<'analytics.workflows.chat'>>,
  limit: PromotionCandidatesItemLimit,
): string {
  if (limit === 'all') return t('milestonePromotionCandidatesInputLimitAll')
  return t('milestonePromotionCandidatesInputLimitTopN', { count: limit })
}

type ItemLimitRowProps = {
  ariaLabel: string
  disabled: boolean
  label: string
  onChange: (value: PromotionCandidatesItemLimit) => void
  t: ReturnType<typeof useTranslations<'analytics.workflows.chat'>>
  value: PromotionCandidatesItemLimit
}

function ItemLimitRow({ ariaLabel, disabled, label, onChange, t, value }: ItemLimitRowProps) {
  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
      <FieldLegend className="text-sm font-medium">{label}</FieldLegend>
      <ToggleGroup
        aria-label={ariaLabel}
        disabled={disabled}
        onValueChange={(next) => {
          if (!next) return
          const parsed = parseItemLimit(next)
          if (parsed) onChange(parsed)
        }}
        type="single"
        value={String(value)}
      >
        {ITEM_LIMIT_OPTIONS.map((option) => (
          <ToggleGroupItem key={option} value={String(option)}>
            {limitLabel(t, option)}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
    </div>
  )
}

export function MilestonePromotionCandidatesInput({
  locationId,
  analyticsRunId,
  draft,
  onDraftChange,
  onNotesBlur,
  onNotesFocus,
  disabled = false,
}: MilestonePromotionCandidatesInputProps) {
  const t = useTranslations('analytics.workflows.chat')
  const [loadState, setLoadState] = useState<LoadState>({ status: 'idle' })
  const [reloadToken, setReloadToken] = useState(0)

  const fetchCategories = useCallback(async () => {
    setLoadState({ status: 'loading' })
    try {
      const params = new URLSearchParams({ locationId: String(locationId) })
      if (analyticsRunId !== null) {
        params.set('analyticsRunId', String(analyticsRunId))
      }
      const res = await fetch(`/api/analytics/menu-categories?${params.toString()}`, {
        cache: 'no-store',
      })
      if (!res.ok) {
        throw new Error('fetch failed')
      }
      const body = (await res.json()) as { categories?: MenuCategorySummary[] }
      setLoadState({
        status: 'ready',
        categories: Array.isArray(body.categories) ? body.categories : [],
      })
    } catch {
      setLoadState({ status: 'error' })
    }
  }, [analyticsRunId, locationId])

  useEffect(() => {
    void fetchCategories()
  }, [fetchCategories, reloadToken])

  const availableNames = useMemo(() => {
    if (loadState.status !== 'ready') return [] as string[]
    return loadState.categories.map((c) => c.name)
  }, [loadState])

  const effectiveSelected = useMemo(() => {
    if (draft.selectedMenuCategories.length === 0) {
      return new Set(availableNames)
    }
    return new Set(draft.selectedMenuCategories)
  }, [availableNames, draft.selectedMenuCategories])

  const selectedCount =
    draft.selectedMenuCategories.length === 0
      ? availableNames.length
      : draft.selectedMenuCategories.filter((name) => availableNames.includes(name)).length

  const shortlistBadge = t('milestonePromotionCandidatesInputCategoryShortlistBadge', {
    starLimit: limitLabel(t, draft.starItemLimit),
    puzzleLimit: limitLabel(t, draft.puzzleItemLimit),
  })

  const setSelectedExplicit = useCallback(
    (names: string[]) => {
      onDraftChange({
        ...draft,
        selectedMenuCategories: names,
      })
    },
    [draft, onDraftChange],
  )

  const toggleCategory = (name: string, checked: boolean) => {
    const base =
      draft.selectedMenuCategories.length === 0
        ? [...availableNames]
        : [...draft.selectedMenuCategories]
    const next = checked
      ? base.includes(name)
        ? base
        : [...base, name]
      : base.filter((n) => n !== name)
    const normalized =
      next.length === availableNames.length ? [] : next.filter((n) => availableNames.includes(n))
    setSelectedExplicit(normalized)
  }

  const handleSelectAll = () => setSelectedExplicit([])

  const uncategorizedLabel = t('milestonePromotionCandidatesInputUncategorized')

  return (
    <FieldGroup className="gap-4">
      <Field>
        <FieldLabel>{t('milestonePromotionCandidatesInputShortlistLabel')}</FieldLabel>
        <FieldDescription>
          {t('milestonePromotionCandidatesInputShortlistDescription')}
        </FieldDescription>
        <FieldSet
          className={cn(
            'flex flex-col gap-4 rounded-lg border bg-muted/15 p-3',
            disabled && 'pointer-events-none opacity-60',
          )}
        >
          <ItemLimitRow
            ariaLabel={t('milestonePromotionCandidatesInputStarLimitAria')}
            disabled={disabled}
            label={t('milestonePromotionCandidatesInputStarLimitLabel')}
            onChange={(value) => onDraftChange({ ...draft, starItemLimit: value })}
            t={t}
            value={draft.starItemLimit}
          />
          <ItemLimitRow
            ariaLabel={t('milestonePromotionCandidatesInputPuzzleLimitAria')}
            disabled={disabled}
            label={t('milestonePromotionCandidatesInputPuzzleLimitLabel')}
            onChange={(value) => onDraftChange({ ...draft, puzzleItemLimit: value })}
            t={t}
            value={draft.puzzleItemLimit}
          />
        </FieldSet>
      </Field>

      <Separator />

      <Field>
        <FieldLabel>{t('milestonePromotionCandidatesInputCategoriesLabel')}</FieldLabel>
        <FieldDescription>
          {t('milestonePromotionCandidatesInputCategoriesDescription')}
        </FieldDescription>

        {loadState.status === 'loading' || loadState.status === 'idle' ? (
          <div className="flex flex-col gap-2 rounded-lg border bg-muted/20 p-3">
            <Skeleton className="h-9 w-full" />
            <Skeleton className="h-9 w-full" />
            <Skeleton className="h-9 w-5/6" />
          </div>
        ) : null}

        {loadState.status === 'error' ? (
          <Alert variant="destructive">
            <AlertDescription className="flex flex-wrap items-center justify-between gap-2">
              <span>{t('milestonePromotionCandidatesInputLoadError')}</span>
              <Button
                disabled={disabled}
                onClick={() => setReloadToken((n) => n + 1)}
                size="sm"
                type="button"
                variant="outline"
              >
                {t('milestonePromotionCandidatesInputRetry')}
              </Button>
            </AlertDescription>
          </Alert>
        ) : null}

        {loadState.status === 'ready' && loadState.categories.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            {t('milestonePromotionCandidatesInputEmptyCategories')}
          </p>
        ) : null}

        {loadState.status === 'ready' && loadState.categories.length > 0 ? (
          <div className="flex flex-col gap-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-muted-foreground text-xs tabular-nums">
                {t('milestonePromotionCandidatesInputSelectionSummary', {
                  selected: selectedCount,
                  total: loadState.categories.length,
                })}
              </p>
              <Button
                className="h-8 px-2 text-xs"
                disabled={disabled || draft.selectedMenuCategories.length === 0}
                onClick={handleSelectAll}
                type="button"
                variant="ghost"
              >
                {t('milestonePromotionCandidatesInputSelectAll')}
              </Button>
            </div>
            <div
              aria-label={t('milestonePromotionCandidatesInputCategoriesLabel')}
              className={cn(
                'max-h-64 flex flex-col gap-1 overflow-y-auto rounded-lg border bg-muted/15 p-2',
                disabled && 'pointer-events-none opacity-60',
              )}
              role="group"
            >
              {loadState.categories.map((row) => {
                const id = `promotion-category-${row.name}`
                const checked = effectiveSelected.has(row.name)
                return (
                  <CategoryRow
                    checked={checked}
                    disabled={disabled}
                    id={id}
                    key={row.name}
                    onToggle={(value) => toggleCategory(row.name, value)}
                    row={row}
                    shortlistBadge={shortlistBadge}
                    t={t}
                    uncategorizedLabel={uncategorizedLabel}
                  />
                )
              })}
            </div>
          </div>
        ) : null}
      </Field>

      <Separator />

      <Field>
        <FieldLabel>{t('milestonePreset.promotion_candidates.inputLabel')}</FieldLabel>
        <FieldDescription>
          {t('milestonePreset.promotion_candidates.inputDescription')}
        </FieldDescription>
        <Textarea
          className="min-h-[100px] resize-y whitespace-pre-wrap"
          disabled={disabled}
          onBlur={onNotesBlur}
          onChange={(e) => onDraftChange({ ...draft, notes: e.target.value })}
          onClick={(e) => e.stopPropagation()}
          onFocus={onNotesFocus}
          onPointerDown={(e) => e.stopPropagation()}
          placeholder={t('milestonePreset.promotion_candidates.inputPlaceholder')}
          value={draft.notes}
        />
      </Field>
    </FieldGroup>
  )
}

type CategoryRowProps = {
  checked: boolean
  disabled: boolean
  id: string
  onToggle: (checked: boolean) => void
  row: MenuCategorySummary
  shortlistBadge: string
  t: ReturnType<typeof useTranslations<'analytics.workflows.chat'>>
  uncategorizedLabel: string
}

function CategoryRow({
  checked,
  disabled,
  id,
  onToggle,
  row,
  shortlistBadge,
  t,
  uncategorizedLabel,
}: CategoryRowProps) {
  return (
    <div className="flex items-center gap-3 rounded-md px-2 py-2 transition-colors hover:bg-muted/40">
      <Checkbox
        checked={checked}
        disabled={disabled}
        id={id}
        onCheckedChange={(value) => onToggle(value === true)}
      />
      <Label
        className="flex min-w-0 flex-1 cursor-pointer flex-col gap-1 font-normal sm:flex-row sm:items-center sm:justify-between"
        htmlFor={id}
      >
        <span className="truncate">{categoryLabel(row.name, uncategorizedLabel)}</span>
        <span className="flex shrink-0 flex-wrap items-center justify-end gap-1.5">
          {checked ? (
            <Badge className="hidden tabular-nums sm:inline-flex" variant="outline">
              {shortlistBadge}
            </Badge>
          ) : null}
          <Badge className="tabular-nums" variant="secondary">
            {t('milestonePromotionCandidatesInputItemCount', { count: row.itemCount })}
          </Badge>
        </span>
      </Label>
    </div>
  )
}
