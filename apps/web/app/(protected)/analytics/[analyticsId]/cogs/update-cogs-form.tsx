'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'

import { Button } from '@workspace/ui/components/button'
import { Checkbox } from '@workspace/ui/components/checkbox'
import { Label } from '@workspace/ui/components/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@workspace/ui/components/select'
import { Card, CardContent, CardHeader, CardTitle } from '@workspace/ui/components/card'
import { Field, FieldGroup, FieldLabel } from '@workspace/ui/components/field'
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  InputGroupText,
} from '@workspace/ui/components/input-group'
import { Separator } from '@workspace/ui/components/separator'
import { TableCell, TableRow } from '@workspace/ui/components/table'
import { Slider } from '@workspace/ui/components/slider'
import { formatCurrencyInput, getCurrencyLocale, parseCurrencyInput } from '@/lib/currency'
import {
  SortableTable,
  useSortableColumns,
  type SortableTableColumn,
} from '@/components/sortable-table'

const WE_STEP = 0.01
const UNCATEGORIZED_KEY = '__uncategorized__'

function clampWe(value: number): number {
  if (!Number.isFinite(value)) return 0
  return Math.min(1, Math.max(0, value))
}

type CogsColKey = 'menuName' | 'rowNumber' | 'cogsWe'

type MenuItem = {
  id: number
  menuName: string
  cogs: number | null
  quantity: number
  totalRevenue: number
  price: number
  menuCategory: string | null
}

type CogsAmountInputProps = {
  item: MenuItem
  loading: boolean
  currencyCode: string
  cogsRaw: string
  displayFormatted: string
  isEditing: boolean
  onCogsInputChange: (raw: string) => void
  onCogsFocus: () => void
  onCogsBlur: () => void
}

function CogsAmountInput({
  item,
  loading,
  currencyCode,
  cogsRaw,
  displayFormatted,
  isEditing,
  onCogsInputChange,
  onCogsFocus,
  onCogsBlur,
}: CogsAmountInputProps) {
  return (
    <InputGroup className="min-w-0">
      <InputGroupAddon>
        <InputGroupText>{currencyCode}</InputGroupText>
      </InputGroupAddon>
      <InputGroupInput
        id={`cogs-${item.id}`}
        name={`cogs-${item.id}`}
        type="text"
        inputMode="decimal"
        value={isEditing ? cogsRaw : displayFormatted}
        onChange={(event) => onCogsInputChange(event.target.value)}
        onFocus={onCogsFocus}
        onBlur={onCogsBlur}
        placeholder="0.00"
        disabled={loading}
        className="text-right tabular-nums"
      />
    </InputGroup>
  )
}

type WeRatioSliderProps = {
  item: MenuItem
  loading: boolean
  weValue: number
  onWeSliderChange: (next: number) => void
  weAriaLabel: string
}

function WeRatioSlider({
  item,
  loading,
  weValue,
  onWeSliderChange,
  weAriaLabel,
}: WeRatioSliderProps) {
  return (
    <div className="flex min-w-0 items-center gap-3">
      <Slider
        id={`we-${item.id}`}
        value={[weValue]}
        min={0}
        max={1}
        step={WE_STEP}
        disabled={loading || item.price <= 0}
        onValueChange={(vals) => {
          const next = vals[0]
          if (next === undefined) return
          onWeSliderChange(next)
        }}
        aria-label={weAriaLabel}
        className="min-w-0 flex-1"
      />
      <span className="w-10 shrink-0 text-right text-xs tabular-nums text-muted-foreground">
        {Math.round(weValue * 100)}%
      </span>
    </div>
  )
}

type MenuItemCogsFieldsProps = CogsAmountInputProps & WeRatioSliderProps

function MenuItemCogsFields({
  item,
  loading,
  currencyCode,
  cogsRaw,
  displayFormatted,
  isEditing,
  onCogsInputChange,
  onCogsFocus,
  onCogsBlur,
  weValue,
  onWeSliderChange,
  weAriaLabel,
}: MenuItemCogsFieldsProps) {
  return (
    <div className="flex w-full min-w-0 flex-col gap-2">
      <CogsAmountInput
        item={item}
        loading={loading}
        currencyCode={currencyCode}
        cogsRaw={cogsRaw}
        displayFormatted={displayFormatted}
        isEditing={isEditing}
        onCogsInputChange={onCogsInputChange}
        onCogsFocus={onCogsFocus}
        onCogsBlur={onCogsBlur}
      />
      <WeRatioSlider
        item={item}
        loading={loading}
        weValue={weValue}
        onWeSliderChange={onWeSliderChange}
        weAriaLabel={weAriaLabel}
      />
    </div>
  )
}

type Props = {
  analyticsId: number
  menuItems: MenuItem[]
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
    const categorized = new Map<string, MenuItem[]>()
    const uncategorized: MenuItem[] = []

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
    const sortItems = (items: MenuItem[]) =>
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
              key: UNCATEGORIZED_KEY,
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

  function applyCategoryWe(items: MenuItem[], nextWe: number) {
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

  function handleCogsInputChange(item: MenuItem, raw: string) {
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

  function handleWeSliderChange(item: MenuItem, next: number) {
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

      {(() => {
        let rowNumber = 1

        const renderRow = (item: MenuItem) => {
          const currentRowNumber = rowNumber
          rowNumber += 1

          return (
            <TableRow
              key={item.id}
              className="transition-colors focus-within:bg-muted focus-within:ring-1 focus-within:ring-primary/40"
            >
              <TableCell className="px-3 py-2 text-sm text-muted-foreground tabular-nums">
                {currentRowNumber}.
              </TableCell>
              <TableCell className="px-3 py-2">
                <Label htmlFor={`cogs-${item.id}`} className="truncate">
                  {item.menuName}
                </Label>
              </TableCell>
              <TableCell className="px-3 py-2">
                <MenuItemCogsFields
                  item={item}
                  loading={loading}
                  currencyCode={currencyCode}
                  cogsRaw={cogsValues[item.id] ?? ''}
                  displayFormatted={formatDisplayValue(cogsValues[item.id] ?? '')}
                  isEditing={activeInputId === item.id}
                  weValue={weValues[item.id] ?? 0}
                  onCogsInputChange={(raw) => handleCogsInputChange(item, raw)}
                  onCogsFocus={() => setActiveInputId(item.id)}
                  onCogsBlur={() => setActiveInputId((prev) => (prev === item.id ? null : prev))}
                  onWeSliderChange={(next) => handleWeSliderChange(item, next)}
                  weAriaLabel={t('table.weAria', { menu: item.menuName })}
                />
              </TableCell>
            </TableRow>
          )
        }

        const renderCategoryBulkBlock = (sectionKey: string, itemsForApply: MenuItem[]) => (
          <div className="mb-4 flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <Checkbox
                id={`category-we-enable-${sectionKey}`}
                checked={categoryWeEnabled[sectionKey] ?? false}
                onCheckedChange={(checked) => {
                  setCategoryWeEnabled((prev) => ({
                    ...prev,
                    [sectionKey]: checked === true,
                  }))
                }}
                disabled={loading}
              />
              <Label htmlFor={`category-we-enable-${sectionKey}`}>
                {t('table.categoryWe.enable')}
              </Label>
            </div>
            <div className="flex min-w-0 items-center gap-2">
              <Slider
                id={`category-we-${sectionKey}`}
                value={[categoryWeValues[sectionKey] ?? 0]}
                min={0}
                max={1}
                step={WE_STEP}
                disabled={loading || !(categoryWeEnabled[sectionKey] ?? false)}
                onValueChange={(vals) => {
                  const next = vals[0]
                  if (next === undefined) return
                  setCategoryWeValues((prev) => ({ ...prev, [sectionKey]: next }))
                  applyCategoryWe(itemsForApply, next)
                }}
                aria-label={t('table.categoryWe.aria', {
                  category:
                    sectionKey === UNCATEGORIZED_KEY ? t('table.uncategorizedTitle') : sectionKey,
                })}
                className="min-w-0 flex-1"
              />
              <span className="w-10 shrink-0 text-right text-xs tabular-nums text-muted-foreground">
                {Math.round((categoryWeValues[sectionKey] ?? 0) * 100)}%
              </span>
            </div>
            <p className="text-xs text-muted-foreground">{t('table.categoryWe.hint')}</p>
          </div>
        )

        const renderMobileItemBlock = (item: MenuItem, indexInSection: number) => (
          <div key={item.id} className="min-w-0 py-3 first:pt-0">
            <div className="flex flex-col gap-3">
              <div className="min-w-0">
                <p className="text-xs tabular-nums text-muted-foreground">#{indexInSection}</p>
                <p className="text-sm font-medium leading-snug break-words">{item.menuName}</p>
              </div>
              <FieldGroup className="gap-4">
                <Field>
                  <FieldLabel htmlFor={`cogs-${item.id}`}>{t('table.cogs')}</FieldLabel>
                  <CogsAmountInput
                    item={item}
                    loading={loading}
                    currencyCode={currencyCode}
                    cogsRaw={cogsValues[item.id] ?? ''}
                    displayFormatted={formatDisplayValue(cogsValues[item.id] ?? '')}
                    isEditing={activeInputId === item.id}
                    onCogsInputChange={(raw) => handleCogsInputChange(item, raw)}
                    onCogsFocus={() => setActiveInputId(item.id)}
                    onCogsBlur={() => setActiveInputId((prev) => (prev === item.id ? null : prev))}
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor={`we-${item.id}`}>{t('table.we')}</FieldLabel>
                  <WeRatioSlider
                    item={item}
                    loading={loading}
                    weValue={weValues[item.id] ?? 0}
                    onWeSliderChange={(next) => handleWeSliderChange(item, next)}
                    weAriaLabel={t('table.weAria', { menu: item.menuName })}
                  />
                </Field>
              </FieldGroup>
            </div>
          </div>
        )

        const mobileSortLabel =
          sortKey === 'menuName' && sortDirection === 'asc'
            ? t('table.sortNameAsc')
            : t('table.sortNameDesc')
        const mobileSortAria =
          sortKey === 'menuName' && sortDirection === 'asc'
            ? t('table.sortNameButtonAriaAsc')
            : t('table.sortNameButtonAriaDesc')

        const renderMobileSortToolbar = () => (
          <div className="flex flex-col gap-1 border-b pb-3">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-9 w-fit shrink-0 px-2"
              onClick={() => toggleSort('menuName')}
              aria-label={mobileSortAria}
            >
              {mobileSortLabel}
            </Button>
            <p className="text-xs text-muted-foreground">{t('table.sortNameHint')}</p>
          </div>
        )

        return (
          <div className="flex flex-col gap-6">
            {sortedGroupedMenuItems.categorized.map((group) => (
              <Card key={group.category} className="min-w-0 overflow-hidden">
                <CardHeader className="flex min-w-0 flex-col gap-3">
                  <CardTitle className="break-words">{group.category}</CardTitle>
                  <div className="lg:hidden">{renderMobileSortToolbar()}</div>
                </CardHeader>
                <CardContent className="min-w-0">
                  {renderCategoryBulkBlock(group.category, group.items)}
                  <div className="lg:hidden">
                    <div className="flex flex-col">
                      {group.items.map((item, idx) => (
                        <div key={item.id}>
                          {idx > 0 ? <Separator className="my-0" /> : null}
                          {renderMobileItemBlock(item, idx + 1)}
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="hidden lg:block">
                    <SortableTable<CogsColKey>
                      columns={tableColumns}
                      sortKey={sortKey}
                      sortDirection={sortDirection}
                      onSort={toggleSort}
                    >
                      {group.items.map((item) => renderRow(item))}
                    </SortableTable>
                  </div>
                </CardContent>
              </Card>
            ))}

            {sortedGroupedMenuItems.uncategorized.length > 0 && (
              <Card className="min-w-0 overflow-hidden">
                <CardHeader className="flex min-w-0 flex-col gap-3">
                  <CardTitle>{t('table.uncategorizedTitle')}</CardTitle>
                  <div className="lg:hidden">{renderMobileSortToolbar()}</div>
                </CardHeader>
                <CardContent className="min-w-0">
                  {renderCategoryBulkBlock(UNCATEGORIZED_KEY, sortedGroupedMenuItems.uncategorized)}
                  <div className="lg:hidden">
                    <div className="flex flex-col">
                      {sortedGroupedMenuItems.uncategorized.map((item, idx) => (
                        <div key={item.id}>
                          {idx > 0 ? <Separator className="my-0" /> : null}
                          {renderMobileItemBlock(item, idx + 1)}
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="hidden lg:block">
                    <SortableTable<CogsColKey>
                      columns={tableColumns}
                      sortKey={sortKey}
                      sortDirection={sortDirection}
                      onSort={toggleSort}
                    >
                      {sortedGroupedMenuItems.uncategorized.map((item) => renderRow(item))}
                    </SortableTable>
                  </div>
                </CardContent>
              </Card>
            )}

            {error && (
              <p className="text-sm text-destructive" role="alert" aria-live="assertive">
                {error}
              </p>
            )}
          </div>
        )
      })()}

      <div className="flex justify-end">
        <Button type="submit" disabled={loading} className="w-full sm:w-auto">
          {loading ? t('actions.saving') : t('actions.save')}
        </Button>
      </div>
    </form>
  )
}
