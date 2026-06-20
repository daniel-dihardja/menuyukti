'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'

import { Button } from '@workspace/ui/components/button'
import { Label } from '@workspace/ui/components/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@workspace/ui/components/select'
import { useSortableColumns, type SortableTableColumn } from '@/components/sortable-table'
import { formatCurrencyInput, getCurrencyLocale, parseCurrencyInput } from '@/lib/currency'

import {
  COGS_UNCATEGORIZED_KEY,
  CogsCategorySection,
  type CogsColKey,
  type CogsFieldBindings,
  type CogsMenuItem,
} from './update-cogs-form-sections'

function clampWe(value: number): number {
  if (!Number.isFinite(value)) return 0
  return Math.min(1, Math.max(0, value))
}

type Props = {
  analyticsId: number
  menuItems: CogsMenuItem[]
  analyticsOptions: Array<{ id: number; name: string }>
  currencyCode: string
}

export function UpdateCogsForm({ analyticsId, menuItems, analyticsOptions, currencyCode }: Props) {
  const router = useRouter()
  const t = useTranslations('analytics.cogsForm')
  const locale = getCurrencyLocale(currencyCode)

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [importId, setImportId] = useState<number | null>(() => {
    return analyticsOptions[0]?.id ?? null
  })
  const [importing, setImporting] = useState(false)
  const { sortKey, sortDirection, toggleSort } = useSortableColumns<CogsColKey>('menuName', 'asc')
  const [cogsValues, setCogsValues] = useState<Record<number, string>>(() => {
    const initial: Record<number, string> = {}
    for (const item of menuItems) {
      initial[item.id] = item.cogs === null ? '' : String(item.cogs)
    }
    return initial
  })
  const [weValues, setWeValues] = useState<Record<number, number>>(() => {
    const initial: Record<number, number> = {}
    for (const item of menuItems) {
      initial[item.id] = item.cogs !== null && item.price > 0 ? clampWe(item.cogs / item.price) : 0
    }
    return initial
  })
  const [activeInputId, setActiveInputId] = useState<number | null>(null)

  const options = useMemo(() => analyticsOptions, [analyticsOptions])
  const groupedMenuItems = useMemo(() => {
    const categorized = new Map<string, CogsMenuItem[]>()
    const uncategorized: CogsMenuItem[] = []

    for (const item of menuItems) {
      const category = item.menuCategory?.trim()
      if (!category) {
        uncategorized.push(item)
        continue
      }

      const existing = categorized.get(category)
      if (existing) {
        existing.push(item)
      } else {
        categorized.set(category, [item])
      }
    }

    return {
      categorized: Array.from(categorized.entries()).map(([category, items]) => ({
        category,
        items,
      })),
      uncategorized,
    }
  }, [menuItems])
  const sortedGroupedMenuItems = useMemo(() => {
    const sortItems = (items: CogsMenuItem[]) =>
      [...items].sort((a, b) => {
        const cmp = a.menuName.localeCompare(b.menuName)
        return sortDirection === 'asc' ? cmp : -cmp
      })

    return {
      categorized: groupedMenuItems.categorized.map((group) => ({
        category: group.category,
        items: sortItems(group.items),
      })),
      uncategorized: sortItems(groupedMenuItems.uncategorized),
    }
  }, [groupedMenuItems, sortDirection])
  const categorySections = useMemo(
    () => [
      ...groupedMenuItems.categorized.map((group) => ({
        key: group.category,
        label: group.category,
        items: group.items,
      })),
      ...(groupedMenuItems.uncategorized.length > 0
        ? [
            {
              key: COGS_UNCATEGORIZED_KEY,
              label: t('table.uncategorizedTitle'),
              items: groupedMenuItems.uncategorized,
            },
          ]
        : []),
    ],
    [groupedMenuItems, t],
  )
  const [categoryWeEnabled, setCategoryWeEnabled] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {}
    for (const section of categorySections) {
      initial[section.key] = false
    }
    return initial
  })
  const [categoryWeValues, setCategoryWeValues] = useState<Record<string, number>>(() => {
    const initial: Record<string, number> = {}
    for (const section of categorySections) {
      const pricedItems = section.items.filter((item) => item.price > 0)
      if (pricedItems.length === 0) {
        initial[section.key] = 0
        continue
      }
      const totalWe = pricedItems.reduce((sum, item) => {
        const we = item.cogs !== null && item.price > 0 ? clampWe(item.cogs / item.price) : 0
        return sum + we
      }, 0)
      initial[section.key] = clampWe(totalWe / pricedItems.length)
    }
    return initial
  })

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const items = menuItems.map((item) => {
      const raw = cogsValues[item.id] ?? ''
      const value = parseCurrencyInput(raw, currencyCode, locale)

      return {
        id: item.id,
        cogs: value,
        quantity: item.quantity,
        totalRevenue: item.totalRevenue,
        menuName: item.menuName,
      }
    })

    try {
      const res = await fetch(`/api/analytics/${analyticsId}/cogs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.message ?? t('errors.updateFailed'))
      }

      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : t('errors.unknown'))
    } finally {
      setLoading(false)
    }
  }

  function formatDisplayValue(raw: string) {
    const parsed = parseCurrencyInput(raw, currencyCode, locale)
    if (parsed === null) return ''
    return formatCurrencyInput(parsed, currencyCode, locale)
  }

  function applyCategoryWe(items: CogsMenuItem[], nextWe: number) {
    setWeValues((prev) => {
      const next = { ...prev }
      for (const item of items) {
        next[item.id] = nextWe
      }
      return next
    })

    setCogsValues((prev) => {
      const next = { ...prev }
      for (const item of items) {
        const cogsAmount = Math.round(nextWe * item.price)
        next[item.id] = String(cogsAmount)
      }
      return next
    })
  }

  function handleCogsInputChange(item: CogsMenuItem, raw: string) {
    setCogsValues((prev) => ({
      ...prev,
      [item.id]: raw,
    }))
    setWeValues((prev) => {
      const trimmed = raw.trim()
      if (trimmed === '') {
        return { ...prev, [item.id]: 0 }
      }
      const parsed = parseCurrencyInput(raw, currencyCode, locale)
      if (parsed === null) {
        return prev
      }
      if (item.price <= 0) {
        return { ...prev, [item.id]: 0 }
      }
      return { ...prev, [item.id]: clampWe(parsed / item.price) }
    })
  }

  function handleWeSliderChange(item: CogsMenuItem, next: number) {
    setWeValues((prev) => ({ ...prev, [item.id]: next }))
    const cogsAmount = Math.round(next * item.price)
    setCogsValues((prev) => ({
      ...prev,
      [item.id]: String(cogsAmount),
    }))
  }

  const tableColumns: SortableTableColumn<CogsColKey>[] = [
    {
      id: 'rowNumber',
      label: '#',
      sortable: false,
      align: 'left',
      className: 'w-[60px]',
    },
    { id: 'menuName', label: t('table.menuName'), sortable: true, align: 'left' },
    {
      id: 'cogsWe',
      label: (
        <>
          <span className="block">{t('table.cogs')}</span>
          <span className="block text-xs font-normal text-muted-foreground">{t('table.we')}</span>
        </>
      ),
      sortable: false,
      align: 'right',
      className: 'w-[320px]',
    },
  ]

  const fieldBindings: CogsFieldBindings = {
    activeInputId,
    cogsValues,
    currencyCode,
    formatDisplayValue,
    loading,
    onCogsBlur: (itemId) => setActiveInputId((prev) => (prev === itemId ? null : prev)),
    onCogsFocus: setActiveInputId,
    onCogsInputChange: handleCogsInputChange,
    onWeSliderChange: handleWeSliderChange,
    weValues,
  }

  let categorizedRowOffset = 0

  return (
    <form className="flex flex-col gap-4" onSubmit={onSubmit}>
      <section className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold">{t('heading')}</h1>
        <p className="text-sm text-muted-foreground">{t('description')}</p>
      </section>

      {options.length > 0 && (
        <div className="flex flex-col gap-2">
          <Label htmlFor="import-analytics-select">{t('import.label')}</Label>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <Select
              value={importId !== null ? String(importId) : undefined}
              onValueChange={(val) => setImportId(val ? Number(val) : null)}
              disabled={loading || importing}
            >
              <SelectTrigger id="import-analytics-select" className="w-full sm:w-[260px]">
                <SelectValue placeholder={t('import.placeholder')} />
              </SelectTrigger>
              <SelectContent>
                {options.map((option) => (
                  <SelectItem key={option.id} value={String(option.id)}>
                    {option.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button
              type="button"
              variant="secondary"
              disabled={!importId || importing || loading}
              onClick={async () => {
                if (!importId) return
                setImporting(true)
                setError(null)
                try {
                  const res = await fetch(`/api/analytics/${importId}/cogs`)
                  if (!res.ok) {
                    throw new Error(t('errors.loadImportFailed'))
                  }
                  const data = (await res.json()) as {
                    items: Array<{ menuName: string; cogs: number | null }>
                  }

                  const cogsByName = new Map(
                    data.items.map((item) => [item.menuName.toLowerCase(), item.cogs]),
                  )

                  setCogsValues((prev) => {
                    const next = { ...prev }
                    for (const item of menuItems) {
                      const value = cogsByName.get(item.menuName.toLowerCase())
                      if (value !== undefined && value !== null) {
                        next[item.id] = String(value)
                      }
                    }
                    return next
                  })
                  setWeValues((prev) => {
                    const next = { ...prev }
                    for (const item of menuItems) {
                      const value = cogsByName.get(item.menuName.toLowerCase())
                      if (value !== undefined && value !== null && item.price > 0) {
                        next[item.id] = clampWe(value / item.price)
                      }
                    }
                    return next
                  })
                } catch (err) {
                  setError(err instanceof Error ? err.message : t('errors.unknown'))
                } finally {
                  setImporting(false)
                }
              }}
            >
              {importing ? t('import.importing') : t('import.action')}
            </Button>
          </div>
        </div>
      )}

      <div className="flex flex-col gap-6">
        {sortedGroupedMenuItems.categorized.map((group) => {
          const section = (
            <CogsCategorySection
              key={group.category}
              bindings={fieldBindings}
              categoryWeEnabled={categoryWeEnabled}
              categoryWeValues={categoryWeValues}
              items={group.items}
              onApplyCategoryWe={applyCategoryWe}
              onCategoryWeEnabledChange={(sectionKey, enabled) => {
                setCategoryWeEnabled((prev) => ({ ...prev, [sectionKey]: enabled }))
              }}
              onCategoryWeValueChange={(sectionKey, value) => {
                setCategoryWeValues((prev) => ({ ...prev, [sectionKey]: value }))
              }}
              onToggleSort={toggleSort}
              rowNumberOffset={categorizedRowOffset}
              sectionKey={group.category}
              sortDirection={sortDirection}
              sortKey={sortKey}
              tableColumns={tableColumns}
              title={group.category}
            />
          )
          categorizedRowOffset += group.items.length
          return section
        })}

        {sortedGroupedMenuItems.uncategorized.length > 0 ? (
          <CogsCategorySection
            bindings={fieldBindings}
            categoryWeEnabled={categoryWeEnabled}
            categoryWeValues={categoryWeValues}
            items={sortedGroupedMenuItems.uncategorized}
            onApplyCategoryWe={applyCategoryWe}
            onCategoryWeEnabledChange={(sectionKey, enabled) => {
              setCategoryWeEnabled((prev) => ({ ...prev, [sectionKey]: enabled }))
            }}
            onCategoryWeValueChange={(sectionKey, value) => {
              setCategoryWeValues((prev) => ({ ...prev, [sectionKey]: value }))
            }}
            onToggleSort={toggleSort}
            rowNumberOffset={categorizedRowOffset}
            sectionKey={COGS_UNCATEGORIZED_KEY}
            sortDirection={sortDirection}
            sortKey={sortKey}
            tableColumns={tableColumns}
            title={t('table.uncategorizedTitle')}
          />
        ) : null}

        {error ? (
          <p className="text-sm text-destructive" role="alert" aria-live="assertive">
            {error}
          </p>
        ) : null}
      </div>

      <div className="flex justify-end">
        <Button type="submit" disabled={loading} className="w-full sm:w-auto">
          {loading ? t('actions.saving') : t('actions.save')}
        </Button>
      </div>
    </form>
  )
}
