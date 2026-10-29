'use client'

import { useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'

import { getAppCurrencyCode } from '@/lib/app-currency'
import { formatCurrencyInput, getCurrencyLocale, parseCurrencyInput } from '@/lib/currency'
import { Button } from '@workspace/ui/components/button'
import { Input } from '@workspace/ui/components/input'
import { Label } from '@workspace/ui/components/label'
import { Skeleton } from '@workspace/ui/components/skeleton'

type CogsListItem = {
  id: number
  menuName: string
  cogs: number | null
  menuCategory: string | null
  quantity: number
}

function sortByQuantityDesc(items: CogsListItem[]): CogsListItem[] {
  return items.toSorted((a, b) => {
    const qtyDiff = (b.quantity ?? 0) - (a.quantity ?? 0)
    if (qtyDiff !== 0) return qtyDiff
    return a.menuName.localeCompare(b.menuName)
  })
}

type Props = {
  analyticsRunId: number
}

export function AdvisorWorkspaceCogsForm({ analyticsRunId }: Props) {
  const t = useTranslations('chat.workspace')
  const [items, setItems] = useState<CogsListItem[]>([])
  const [cogsValues, setCogsValues] = useState<Record<string, string>>({})
  const [currencyCode, setCurrencyCode] = useState(getAppCurrencyCode)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)

    void (async () => {
      try {
        const res = await fetch(`/api/analytics/${analyticsRunId}/cogs`)
        if (!res.ok) {
          const data = (await res.json().catch(() => null)) as { error?: string } | null
          throw new Error(data?.error || t('cogsLoadError'))
        }
        const data = (await res.json()) as {
          currencyCode?: string
          items: CogsListItem[]
        }
        if (cancelled) return
        const nextItems = sortByQuantityDesc(
          (data.items ?? []).map((item) => ({
            ...item,
            quantity: item.quantity ?? 0,
          })),
        )
        const nextValues: Record<string, string> = {}
        for (const item of nextItems) {
          nextValues[item.menuName] = item.cogs === null ? '' : String(item.cogs)
        }
        setItems(nextItems)
        setCogsValues(nextValues)
        if (data.currencyCode) setCurrencyCode(data.currencyCode)
      } catch (err) {
        if (cancelled) return
        setItems([])
        setCogsValues({})
        setError(err instanceof Error ? err.message : t('cogsLoadError'))
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [analyticsRunId, t])

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setSaving(true)
    const locale = getCurrencyLocale(currencyCode)

    const payload = items
      .map((item) => {
        const raw = cogsValues[item.menuName] ?? ''
        const value = parseCurrencyInput(raw, currencyCode, locale)
        return {
          menuName: item.menuName,
          cogs: value,
          menuCategory: item.menuCategory,
        }
      })
      .filter(
        (item): item is { menuName: string; cogs: number; menuCategory: string | null } =>
          typeof item.cogs === 'number' && Number.isFinite(item.cogs),
      )

    try {
      const res = await fetch(`/api/analytics/${analyticsRunId}/cogs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: payload }),
      })
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as { message?: string } | null
        throw new Error(data?.message || t('cogsSaveError'))
      }
      toast.success(t('cogsSaveSuccess'))
    } catch (err) {
      setError(err instanceof Error ? err.message : t('cogsSaveError'))
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    )
  }

  if (error && items.length === 0) {
    return <p className="text-destructive text-sm">{error}</p>
  }

  if (items.length === 0) {
    return <p className="text-muted-foreground text-sm">{t('cogsEmptyItems')}</p>
  }

  return (
    <form className="flex min-h-0 flex-1 flex-col gap-3" onSubmit={onSubmit}>
      <div className="flex shrink-0 items-center justify-between gap-2">
        <h3 className="font-medium text-sm">{t('cogsSectionTitle')}</h3>
        <Button type="submit" size="sm" disabled={saving}>
          {saving ? t('cogsSaving') : t('cogsSave')}
        </Button>
      </div>
      {error ? <p className="text-destructive shrink-0 text-sm">{error}</p> : null}
      <ul className="grid min-h-0 flex-1 grid-cols-[minmax(0,max-content)_6.5rem] justify-start gap-x-3 gap-y-2 overflow-y-auto pr-1">
        {items.map((item) => {
          const raw = cogsValues[item.menuName] ?? ''
          return (
            <li key={item.menuName} className="contents">
              <Label
                htmlFor={`cogs-${item.menuName}`}
                className="max-w-48 truncate self-center text-xs"
                title={item.menuName}
              >
                {item.menuName}
              </Label>
              <Input
                id={`cogs-${item.menuName}`}
                className="w-full"
                inputMode="decimal"
                disabled={saving}
                value={raw}
                onChange={(e) => {
                  const next = e.target.value
                  setCogsValues((prev) => ({ ...prev, [item.menuName]: next }))
                }}
                onBlur={() => {
                  const locale = getCurrencyLocale(currencyCode)
                  const parsed = parseCurrencyInput(raw, currencyCode, locale)
                  if (parsed === null) return
                  setCogsValues((prev) => ({
                    ...prev,
                    [item.menuName]: formatCurrencyInput(parsed, currencyCode, locale),
                  }))
                }}
              />
            </li>
          )
        })}
      </ul>
    </form>
  )
}
