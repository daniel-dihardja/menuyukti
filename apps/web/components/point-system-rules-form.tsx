'use client'

import { useEffect, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'

import { Button } from '@workspace/ui/components/button'
import { Field, FieldDescription, FieldLabel } from '@workspace/ui/components/field'
import { Input } from '@workspace/ui/components/input'
import { Spinner } from '@workspace/ui/components/spinner'
import { Switch } from '@workspace/ui/components/switch'
import {
  POINT_EARN_ACTION_COMPLETE_ORDER,
  POINT_EARN_ACTION_OPEN_MENU_QR,
  isPointEarnActionKey,
  type PointEarnActionKey,
  type PointEarnRule,
} from '@/lib/graphql/queries/point-earn-rules'

type DraftRule = {
  actionKey: PointEarnActionKey
  points: string
  enabled: boolean
}

type Props = {
  locationId: number
  initialRules: PointEarnRule[]
}

const ACTION_ORDER: PointEarnActionKey[] = [
  POINT_EARN_ACTION_OPEN_MENU_QR,
  POINT_EARN_ACTION_COMPLETE_ORDER,
]

function toDrafts(rules: PointEarnRule[]): DraftRule[] {
  const byKey = new Map(
    rules.filter((r) => isPointEarnActionKey(r.actionKey)).map((r) => [r.actionKey, r]),
  )
  return ACTION_ORDER.map((actionKey) => {
    const row = byKey.get(actionKey)
    return {
      actionKey,
      points: String(row?.points ?? 0),
      enabled: row?.enabled ?? false,
    }
  })
}

function parseNonNegativeInt(raw: string): number | null {
  if (!/^\d+$/.test(raw.trim())) return null
  const n = Number(raw)
  if (!Number.isInteger(n) || n < 0) return null
  return n
}

export function PointSystemRulesForm({ locationId, initialRules }: Props) {
  const t = useTranslations('services.pointSystem.console')
  const router = useRouter()
  const [drafts, setDrafts] = useState(() => toDrafts(initialRules))
  const [saved, setSaved] = useState(() => toDrafts(initialRules))
  const [isPending, startTransition] = useTransition()

  useEffect(() => {
    const next = toDrafts(initialRules)
    setDrafts(next)
    setSaved(next)
  }, [initialRules])

  const parsed = drafts.map((d) => ({
    actionKey: d.actionKey,
    points: parseNonNegativeInt(d.points),
    enabled: d.enabled,
  }))
  const allValid = parsed.every((r) => r.points !== null)
  const isDirty =
    drafts.length === saved.length &&
    drafts.some((d, i) => d.points !== saved[i]!.points || d.enabled !== saved[i]!.enabled)
  const canSave = isDirty && allValid && !isPending

  function updateDraft(actionKey: PointEarnActionKey, patch: Partial<DraftRule>) {
    setDrafts((prev) =>
      prev.map((row) => (row.actionKey === actionKey ? { ...row, ...patch } : row)),
    )
  }

  function handleSave() {
    if (!canSave) return
    const rules = parsed.map((r) => ({
      actionKey: r.actionKey,
      points: r.points!,
      enabled: r.enabled,
    }))
    startTransition(async () => {
      try {
        const res = await fetch('/api/services/point-system/rules', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ locationId, rules }),
        })
        if (!res.ok) {
          const body = (await res.json().catch(() => null)) as { message?: string } | null
          throw new Error(body?.message || t('saveFailed'))
        }
        const body = (await res.json()) as { rules: PointEarnRule[] }
        const next = toDrafts(body.rules)
        setDrafts(next)
        setSaved(next)
        toast.success(t('saved'))
        router.refresh()
      } catch (err) {
        toast.error(err instanceof Error ? err.message : t('saveFailed'))
      }
    })
  }

  return (
    <form
      className="flex max-w-xl flex-col gap-6"
      onSubmit={(e) => {
        e.preventDefault()
        handleSave()
      }}
    >
      <div className="flex flex-col gap-1">
        <h2 className="text-base font-semibold">{t('rulesTitle')}</h2>
        <p className="text-muted-foreground text-sm">{t('rulesSubtitle')}</p>
      </div>

      <ul className="border-border divide-border divide-y rounded-lg border">
        {drafts.map((draft) => {
          const pointsInvalid = parseNonNegativeInt(draft.points) === null
          return (
            <li key={draft.actionKey} className="flex flex-col gap-4 px-4 py-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className="text-sm font-medium">
                    {t(`actions.${draft.actionKey}.title`)}
                  </span>
                  <span className="text-muted-foreground text-xs">
                    {t(`actions.${draft.actionKey}.description`)}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground text-xs">
                    {draft.enabled ? t('enabledLabel') : t('disabledLabel')}
                  </span>
                  <Switch
                    checked={draft.enabled}
                    onCheckedChange={(checked) =>
                      updateDraft(draft.actionKey, { enabled: checked })
                    }
                    disabled={isPending}
                    aria-label={t(`actions.${draft.actionKey}.toggleAria`)}
                  />
                </div>
              </div>
              <Field>
                <FieldLabel htmlFor={`points-${draft.actionKey}`}>{t('pointsLabel')}</FieldLabel>
                <Input
                  id={`points-${draft.actionKey}`}
                  inputMode="numeric"
                  value={draft.points}
                  disabled={isPending}
                  onChange={(e) => updateDraft(draft.actionKey, { points: e.target.value })}
                  aria-invalid={pointsInvalid}
                />
                <FieldDescription>
                  {pointsInvalid ? t('pointsInvalid') : t('pointsHelp')}
                </FieldDescription>
              </Field>
            </li>
          )
        })}
      </ul>

      <Button type="submit" className="w-fit" disabled={!canSave}>
        {isPending ? (
          <>
            <Spinner data-icon="inline-start" />
            {t('saving')}
          </>
        ) : (
          t('save')
        )}
      </Button>
    </form>
  )
}
