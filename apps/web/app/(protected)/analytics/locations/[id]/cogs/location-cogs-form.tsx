'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'

import { Button } from '@workspace/ui/components/button'
import { Field, FieldGroup, FieldLabel } from '@workspace/ui/components/field'
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  InputGroupText,
} from '@workspace/ui/components/input-group'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@workspace/ui/components/select'
import { TableCell, TableRow } from '@workspace/ui/components/table'
import { SortableTable, type SortableTableColumn } from '@/components/sortable-table'
import { formatCurrencyInput, getCurrencyLocale, parseCurrencyInput } from '@/lib/currency'

export type LocationCogsMenuItem = {
  id: number
  menuName: string
  cogs: number | null
  menuCategory: string | null
}

type Props = {
  locationId: number
  menuItems: LocationCogsMenuItem[]
  analyticsOptions: Array<{ id: number; name: string }>
  currencyCode: string
}

type ColKey = 'rowNumber' | 'menuName' | 'cogs'

export function LocationCogsForm({ locationId, menuItems, analyticsOptions, currencyCode }: Props) {
  const router = useRouter()
  const t = useTranslations('analytics.locationCogs')
  const locale = getCurrencyLocale(currencyCode)

  const [loading, setLoading] = useState(false)
  const [importing, setImporting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [importRunId, setImportRunId] = useState<number | null>(
    () => analyticsOptions[0]?.id ?? null,
  )
  const [cogsValues, setCogsValues] = useState<Record<number, string>>(() => {
    const initial: Record<number, string> = {}
    for (const item of menuItems) {
      initial[item.id] = item.cogs === null ? '' : String(item.cogs)
    }
    return initial
  })
  const [activeInputId, setActiveInputId] = useState<number | null>(null)

  const sortedItems = useMemo(
    () => [...menuItems].sort((a, b) => a.menuName.localeCompare(b.menuName)),
    [menuItems],
  )

  function formatDisplayValue(raw: string, itemId: number): string {
    if (activeInputId === itemId) return raw
    const parsed = parseCurrencyInput(raw, currencyCode, locale)
    if (parsed === null) return raw
    return formatCurrencyInput(parsed, currencyCode, locale)
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      const items = menuItems
        .map((item) => {
          const raw = (cogsValues[item.id] ?? '').trim()
          if (!raw) return null
          const parsed = parseCurrencyInput(raw, currencyCode, locale)
          if (parsed === null || !Number.isFinite(parsed)) return null
          return {
            menuName: item.menuName,
            cogs: parsed,
            menuCategory: item.menuCategory,
            currency: currencyCode,
          }
        })
        .filter(
          (
            item,
          ): item is {
            menuName: string
            cogs: number
            menuCategory: string | null
            currency: string
          } => Boolean(item),
        )

      const res = await fetch(`/api/locations/${locationId}/cogs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items, currency: currencyCode }),
      })
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as { message?: string } | null
        throw new Error(data?.message || t('errors.saveFailed'))
      }
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : t('errors.unknown'))
    } finally {
      setLoading(false)
    }
  }

  async function importFromRun() {
    if (!importRunId) return
    setImporting(true)
    setError(null)
    try {
      const res = await fetch(`/api/locations/${locationId}/cogs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'importFromRun', analyticsRunId: importRunId }),
      })
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as { message?: string } | null
        throw new Error(data?.message || t('errors.importFailed'))
      }
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : t('errors.unknown'))
    } finally {
      setImporting(false)
    }
  }

  const columns: SortableTableColumn<ColKey>[] = [
    {
      id: 'rowNumber',
      label: '#',
      sortable: false,
      align: 'left',
      className: 'w-[60px]',
    },
    { id: 'menuName', label: t('table.menuName'), sortable: false, align: 'left' },
    {
      id: 'cogs',
      label: t('table.cogsWithCurrency', { currency: currencyCode }),
      sortable: false,
      align: 'right',
      className: 'w-[220px]',
    },
  ]

  return (
    <form className="flex flex-col gap-4" onSubmit={onSubmit}>
      <section className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold">{t('heading')}</h1>
        <p className="text-sm text-muted-foreground">{t('description')}</p>
        <p className="text-sm text-muted-foreground">
          {t('currencyHint', { currency: currencyCode })}
        </p>
      </section>

      {analyticsOptions.length > 0 ? (
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
          <div className="flex flex-1 flex-col gap-2">
            <label htmlFor="import-run-select" className="text-sm font-medium">
              {t('import.label')}
            </label>
            <Select
              value={importRunId !== null ? String(importRunId) : undefined}
              onValueChange={(val) => setImportRunId(val ? Number(val) : null)}
              disabled={loading || importing}
            >
              <SelectTrigger id="import-run-select" className="w-full sm:w-[280px]">
                <SelectValue placeholder={t('import.placeholder')} />
              </SelectTrigger>
              <SelectContent>
                {analyticsOptions.map((option) => (
                  <SelectItem key={option.id} value={String(option.id)}>
                    {option.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button
            type="button"
            variant="secondary"
            disabled={!importRunId || importing || loading}
            onClick={() => void importFromRun()}
          >
            {importing ? t('import.importing') : t('import.action')}
          </Button>
        </div>
      ) : null}

      {menuItems.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t('empty')}</p>
      ) : (
        <SortableTable
          columns={columns}
          sortKey="menuName"
          sortDirection="asc"
          onSort={() => {}}
          sortable={false}
        >
          {sortedItems.map((item, index) => (
            <TableRow key={item.id}>
              <TableCell>{index + 1}</TableCell>
              <TableCell>
                <div className="flex flex-col">
                  <span>{item.menuName}</span>
                  {item.menuCategory ? (
                    <span className="text-xs text-muted-foreground">{item.menuCategory}</span>
                  ) : null}
                </div>
              </TableCell>
              <TableCell className="text-right">
                <FieldGroup>
                  <Field>
                    <FieldLabel className="sr-only" htmlFor={`loc-cogs-${item.id}`}>
                      {t('table.cogs')}
                    </FieldLabel>
                    <InputGroup className="ml-auto min-w-0 max-w-[200px]">
                      <InputGroupAddon>
                        <InputGroupText>{currencyCode}</InputGroupText>
                      </InputGroupAddon>
                      <InputGroupInput
                        id={`loc-cogs-${item.id}`}
                        inputMode="decimal"
                        disabled={loading}
                        value={formatDisplayValue(cogsValues[item.id] ?? '', item.id)}
                        onFocus={() => setActiveInputId(item.id)}
                        onBlur={() => setActiveInputId((prev) => (prev === item.id ? null : prev))}
                        onChange={(e) =>
                          setCogsValues((prev) => ({ ...prev, [item.id]: e.target.value }))
                        }
                        placeholder="0.00"
                        className="text-right tabular-nums"
                      />
                    </InputGroup>
                  </Field>
                </FieldGroup>
              </TableCell>
            </TableRow>
          ))}
        </SortableTable>
      )}

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <div className="flex justify-end">
        <Button type="submit" disabled={loading || menuItems.length === 0}>
          {loading ? t('actions.saving') : t('actions.save')}
        </Button>
      </div>
    </form>
  )
}
