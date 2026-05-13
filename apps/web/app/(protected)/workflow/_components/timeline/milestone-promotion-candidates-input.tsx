'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslations } from 'next-intl'

import { Alert, AlertDescription } from '@workspace/ui/components/alert'
import { Badge } from '@workspace/ui/components/badge'
import { Button } from '@workspace/ui/components/button'
import { Checkbox } from '@workspace/ui/components/checkbox'
import { Field, FieldDescription, FieldGroup, FieldLabel } from '@workspace/ui/components/field'
import { Label } from '@workspace/ui/components/label'
import { Skeleton } from '@workspace/ui/components/skeleton'
import { Textarea } from '@workspace/ui/components/textarea'
import { cn } from '@workspace/ui/lib/utils'

import {
  UNCATEGORIZED_MENU_CATEGORY_KEY,
  type MenuCategorySummary,
} from '@/lib/analytics/menu-categories'

export type PromotionCandidatesInputDraft = {
  notes: string
  selectedMenuCategories: string[]
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

function categoryLabel(name: string, uncategorizedLabel: string): string {
  return name === UNCATEGORIZED_MENU_CATEGORY_KEY ? uncategorizedLabel : name
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
        <FieldLabel>{t('milestonePromotionCandidatesInputCategoriesLabel')}</FieldLabel>
        <FieldDescription>
          {t('milestonePromotionCandidatesInputCategoriesDescription')}
        </FieldDescription>

        {loadState.status === 'loading' || loadState.status === 'idle' ? (
          <div className="space-y-2 rounded-lg border bg-muted/20 p-3">
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
          <div className="space-y-2">
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
                'max-h-64 space-y-1 overflow-y-auto rounded-lg border bg-muted/15 p-2',
                disabled && 'pointer-events-none opacity-60',
              )}
              role="group"
            >
              {loadState.categories.map((row) => {
                const id = `promotion-category-${row.name}`
                const checked = effectiveSelected.has(row.name)
                return (
                  <div
                    className="flex items-center gap-3 rounded-md px-2 py-2 transition-colors hover:bg-muted/40"
                    key={row.name}
                  >
                    <Checkbox
                      checked={checked}
                      disabled={disabled}
                      id={id}
                      onCheckedChange={(value) => toggleCategory(row.name, value === true)}
                    />
                    <Label
                      className="flex min-w-0 flex-1 cursor-pointer items-center justify-between gap-2 font-normal"
                      htmlFor={id}
                    >
                      <span className="truncate">
                        {categoryLabel(row.name, uncategorizedLabel)}
                      </span>
                      <Badge className="shrink-0 tabular-nums" variant="secondary">
                        {t('milestonePromotionCandidatesInputItemCount', { count: row.itemCount })}
                      </Badge>
                    </Label>
                  </div>
                )
              })}
            </div>
          </div>
        ) : null}
      </Field>

      <Field className="border-t pt-4">
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
