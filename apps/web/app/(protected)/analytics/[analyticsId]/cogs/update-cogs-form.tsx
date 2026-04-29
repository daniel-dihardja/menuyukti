'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { ArrowUpDown } from 'lucide-react'

import { Button } from '@workspace/ui/components/button'
import { Checkbox } from '@workspace/ui/components/checkbox'
import { Input } from '@workspace/ui/components/input'
import { Label } from '@workspace/ui/components/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@workspace/ui/components/select'
import { Card, CardContent, CardHeader, CardTitle } from '@workspace/ui/components/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@workspace/ui/components/table'
import { Slider } from '@workspace/ui/components/slider'
import { formatCurrencyInput, getCurrencyLocale, parseCurrencyInput } from '@/lib/currency'

const WE_STEP = 0.01
const UNCATEGORIZED_KEY = '__uncategorized__'

function clampWe(value: number): number {
  if (!Number.isFinite(value)) return 0
  return Math.min(1, Math.max(0, value))
}

type MenuItem = {
  id: number
  menuName: string
  cogs: number | null
  quantity: number
  totalRevenue: number
  price: number
  menuCategory: string | null
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
  const [sortBy, setSortBy] = useState<'name' | 'quantity' | 'price'>('name')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')
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
        if (sortBy === 'quantity') {
          return sortDirection === 'asc' ? a.quantity - b.quantity : b.quantity - a.quantity
        }

        if (sortBy === 'price') {
          return sortDirection === 'asc' ? a.price - b.price : b.price - a.price
        }

        const nameCompare = a.menuName.localeCompare(b.menuName)
        return sortDirection === 'asc' ? nameCompare : -nameCompare
      })

    return {
      categorized: groupedMenuItems.categorized.map((group) => ({
        category: group.category,
        items: sortItems(group.items),
      })),
      uncategorized: sortItems(groupedMenuItems.uncategorized),
    }
  }, [groupedMenuItems, sortBy, sortDirection])
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

  function toggleSort(column: 'name' | 'quantity' | 'price') {
    if (sortBy === column) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'))
      return
    }

    setSortBy(column)
    setSortDirection('asc')
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    // Correctly normalize values
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

  return (
    <form className="space-y-4" onSubmit={onSubmit}>
      <section className="space-y-1">
        <h1 className="text-2xl font-semibold">{t('heading')}</h1>
        <p className="text-sm text-muted-foreground">{t('description')}</p>
      </section>

      {options.length > 0 && (
        <div className="space-y-2">
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
              <TableCell className="text-sm text-muted-foreground tabular-nums">
                {currentRowNumber}.
              </TableCell>
              <TableCell>
                <Label htmlFor={`cogs-${item.id}`} className="truncate">
                  {item.menuName}
                </Label>
              </TableCell>
              <TableCell className="text-right tabular-nums">{item.quantity}</TableCell>
              <TableCell className="text-right tabular-nums">
                {formatCurrencyInput(item.price, currencyCode, locale)}
              </TableCell>
              <TableCell>
                <div className="flex flex-col gap-2">
                  <div className="relative">
                    <span className="absolute left-2 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                      {currencyCode}
                    </span>

                    <Input
                      id={`cogs-${item.id}`}
                      name={`cogs-${item.id}`}
                      type="text"
                      inputMode="decimal"
                      value={
                        activeInputId === item.id
                          ? (cogsValues[item.id] ?? '')
                          : formatDisplayValue(cogsValues[item.id] ?? '')
                      }
                      onChange={(event) => {
                        const raw = event.target.value
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
                      }}
                      onFocus={() => setActiveInputId(item.id)}
                      onBlur={() => setActiveInputId((prev) => (prev === item.id ? null : prev))}
                      placeholder="0.00"
                      disabled={loading}
                      className="w-full pl-8 text-right tabular-nums"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <Slider
                      id={`we-${item.id}`}
                      value={[weValues[item.id] ?? 0]}
                      min={0}
                      max={1}
                      step={WE_STEP}
                      disabled={loading || item.price <= 0}
                      onValueChange={(vals) => {
                        const next = vals[0]
                        if (next === undefined) return
                        setWeValues((prev) => ({ ...prev, [item.id]: next }))
                        const cogsAmount = Math.round(next * item.price)
                        setCogsValues((prev) => ({
                          ...prev,
                          [item.id]: String(cogsAmount),
                        }))
                      }}
                      aria-label={t('table.weAria', { menu: item.menuName })}
                      className="flex-1"
                    />
                    <span className="w-10 shrink-0 text-right text-xs tabular-nums text-muted-foreground">
                      {Math.round((weValues[item.id] ?? 0) * 100)}%
                    </span>
                  </div>
                </div>
              </TableCell>
            </TableRow>
          )
        }

        return (
          <div className="space-y-6">
            {sortedGroupedMenuItems.categorized.map((group) => (
              <Card key={group.category}>
                <CardHeader>
                  <CardTitle>{group.category}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="mb-4 space-y-3">
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id={`category-we-enable-${group.category}`}
                        checked={categoryWeEnabled[group.category] ?? false}
                        onCheckedChange={(checked) => {
                          setCategoryWeEnabled((prev) => ({
                            ...prev,
                            [group.category]: checked === true,
                          }))
                        }}
                        disabled={loading}
                      />
                      <Label htmlFor={`category-we-enable-${group.category}`}>
                        {t('table.categoryWe.enable')}
                      </Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <Slider
                        id={`category-we-${group.category}`}
                        value={[categoryWeValues[group.category] ?? 0]}
                        min={0}
                        max={1}
                        step={WE_STEP}
                        disabled={loading || !(categoryWeEnabled[group.category] ?? false)}
                        onValueChange={(vals) => {
                          const next = vals[0]
                          if (next === undefined) return
                          setCategoryWeValues((prev) => ({ ...prev, [group.category]: next }))
                          applyCategoryWe(group.items, next)
                        }}
                        aria-label={t('table.categoryWe.aria', { category: group.category })}
                        className="flex-1"
                      />
                      <span className="w-10 shrink-0 text-right text-xs tabular-nums text-muted-foreground">
                        {Math.round((categoryWeValues[group.category] ?? 0) * 100)}%
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">{t('table.categoryWe.hint')}</p>
                  </div>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[60px]">#</TableHead>
                        <TableHead>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="-ml-3 h-8"
                            onClick={() => toggleSort('name')}
                          >
                            {t('table.menuName')}
                            <ArrowUpDown className="ml-2 h-3.5 w-3.5" />
                          </Button>
                        </TableHead>
                        <TableHead className="w-[140px] text-right">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="ml-auto h-8"
                            onClick={() => toggleSort('quantity')}
                          >
                            {t('table.quantity')}
                            <ArrowUpDown className="ml-2 h-3.5 w-3.5" />
                          </Button>
                        </TableHead>
                        <TableHead className="w-[160px] text-right">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="ml-auto h-8"
                            onClick={() => toggleSort('price')}
                          >
                            {t('table.price')}
                            <ArrowUpDown className="ml-2 h-3.5 w-3.5" />
                          </Button>
                        </TableHead>
                        <TableHead className="w-[320px] text-right">
                          <span className="block">{t('table.cogs')}</span>
                          <span className="block text-xs font-normal text-muted-foreground">
                            {t('table.we')}
                          </span>
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>{group.items.map((item) => renderRow(item))}</TableBody>
                  </Table>
                </CardContent>
              </Card>
            ))}

            {sortedGroupedMenuItems.uncategorized.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>{t('table.uncategorizedTitle')}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="mb-4 space-y-3">
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id={`category-we-enable-${UNCATEGORIZED_KEY}`}
                        checked={categoryWeEnabled[UNCATEGORIZED_KEY] ?? false}
                        onCheckedChange={(checked) => {
                          setCategoryWeEnabled((prev) => ({
                            ...prev,
                            [UNCATEGORIZED_KEY]: checked === true,
                          }))
                        }}
                        disabled={loading}
                      />
                      <Label htmlFor={`category-we-enable-${UNCATEGORIZED_KEY}`}>
                        {t('table.categoryWe.enable')}
                      </Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <Slider
                        id={`category-we-${UNCATEGORIZED_KEY}`}
                        value={[categoryWeValues[UNCATEGORIZED_KEY] ?? 0]}
                        min={0}
                        max={1}
                        step={WE_STEP}
                        disabled={loading || !(categoryWeEnabled[UNCATEGORIZED_KEY] ?? false)}
                        onValueChange={(vals) => {
                          const next = vals[0]
                          if (next === undefined) return
                          setCategoryWeValues((prev) => ({ ...prev, [UNCATEGORIZED_KEY]: next }))
                          applyCategoryWe(sortedGroupedMenuItems.uncategorized, next)
                        }}
                        aria-label={t('table.categoryWe.aria', {
                          category: t('table.uncategorizedTitle'),
                        })}
                        className="flex-1"
                      />
                      <span className="w-10 shrink-0 text-right text-xs tabular-nums text-muted-foreground">
                        {Math.round((categoryWeValues[UNCATEGORIZED_KEY] ?? 0) * 100)}%
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">{t('table.categoryWe.hint')}</p>
                  </div>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[60px]">#</TableHead>
                        <TableHead>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="-ml-3 h-8"
                            onClick={() => toggleSort('name')}
                          >
                            {t('table.menuName')}
                            <ArrowUpDown className="ml-2 h-3.5 w-3.5" />
                          </Button>
                        </TableHead>
                        <TableHead className="w-[140px] text-right">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="ml-auto h-8"
                            onClick={() => toggleSort('quantity')}
                          >
                            {t('table.quantity')}
                            <ArrowUpDown className="ml-2 h-3.5 w-3.5" />
                          </Button>
                        </TableHead>
                        <TableHead className="w-[160px] text-right">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="ml-auto h-8"
                            onClick={() => toggleSort('price')}
                          >
                            {t('table.price')}
                            <ArrowUpDown className="ml-2 h-3.5 w-3.5" />
                          </Button>
                        </TableHead>
                        <TableHead className="w-[320px] text-right">
                          <span className="block">{t('table.cogs')}</span>
                          <span className="block text-xs font-normal text-muted-foreground">
                            {t('table.we')}
                          </span>
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {sortedGroupedMenuItems.uncategorized.map((item) => renderRow(item))}
                    </TableBody>
                  </Table>
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
