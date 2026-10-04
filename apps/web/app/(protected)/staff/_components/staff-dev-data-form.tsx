'use client'

import { useAuth } from '@clerk/nextjs'
import { useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'

import { Button } from '@workspace/ui/components/button'
import { Field, FieldGroup, FieldLabel } from '@workspace/ui/components/field'
import { Input } from '@workspace/ui/components/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@workspace/ui/components/select'

import { apiFetch } from '@/lib/api/client-fetch'
import type { IngestDevDataResult } from '@/lib/graphql/queries'

const DEV_DATA_SCOPES = ['inventar', 'analytics', 'all', 'clear-inventar'] as const

type DevDataScope = (typeof DEV_DATA_SCOPES)[number]

export function StaffDevDataForm() {
  const t = useTranslations('staff.devData')
  const { userId } = useAuth()
  const [targetClerkUserId, setTargetClerkUserId] = useState('')
  const [scope, setScope] = useState<DevDataScope>('inventar')
  const [busy, setBusy] = useState(false)

  function successMessage(data: IngestDevDataResult): string {
    if (data.inventarCleared) {
      return t('successClear', { workspaceId: data.workspaceId })
    }
    if (data.scope === 'analytics') {
      return t('successAnalytics', {
        workspaceId: data.workspaceId,
        orders: data.analyticsOrderRows ?? 0,
        runId: data.analyticsRunId ?? '—',
      })
    }
    if (data.scope === 'all') {
      return t('successAll', {
        workspaceId: data.workspaceId,
        catalog: data.inventarCatalogItems ?? 0,
        orders: data.analyticsOrderRows ?? 0,
      })
    }
    return t('successInventar', {
      workspaceId: data.workspaceId,
      catalog: data.inventarCatalogItems ?? 0,
      stock: data.inventarStockRows ?? 0,
    })
  }

  useEffect(() => {
    if (userId) {
      setTargetClerkUserId((prev) => prev || userId)
    }
  }, [userId])

  function fillMyUserId() {
    if (!userId) return
    setTargetClerkUserId(userId)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const targetId = targetClerkUserId.trim()
    if (!targetId || busy) return

    const needsConfirm = scope === 'clear-inventar' || scope === 'inventar' || scope === 'all'
    if (needsConfirm && !window.confirm(t('confirm', { scope: t(`scopes.${scope}`) }))) {
      return
    }

    setBusy(true)
    try {
      const result = await apiFetch<IngestDevDataResult>(
        '/api/staff/dev-data',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            targetClerkUserId: targetId,
            scope,
          }),
        },
        t('error'),
      )
      if (!result.ok) {
        toast.error(result.error)
        return
      }
      toast.success(successMessage(result.data))
      for (const note of result.data.notes ?? []) {
        toast.message(note)
      }
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 rounded-xl border border-border/70 p-4">
      <div className="space-y-1">
        <h2 className="text-base font-semibold tracking-tight">{t('title')}</h2>
        <p className="text-muted-foreground text-sm">{t('description')}</p>
      </div>

      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="dev-data-target-clerk-user-id">
            {t('targetClerkUserIdLabel')}
          </FieldLabel>
          <Input
            id="dev-data-target-clerk-user-id"
            name="targetClerkUserId"
            value={targetClerkUserId}
            onChange={(e) => setTargetClerkUserId(e.target.value)}
            placeholder={t('targetClerkUserIdPlaceholder')}
            required
            disabled={busy}
            autoComplete="off"
          />
          {userId ? (
            <p className="text-muted-foreground mt-1 text-xs">
              {t('yourUserId', { id: userId })}{' '}
              <button
                type="button"
                className="text-foreground underline underline-offset-2"
                onClick={fillMyUserId}
                disabled={busy}
              >
                {t('useYourUserId')}
              </button>
            </p>
          ) : null}
        </Field>
        <Field>
          <FieldLabel htmlFor="dev-data-scope">{t('scopeLabel')}</FieldLabel>
          <Select
            value={scope}
            onValueChange={(value) => setScope(value as DevDataScope)}
            disabled={busy}
          >
            <SelectTrigger id="dev-data-scope" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {DEV_DATA_SCOPES.map((value) => (
                <SelectItem key={value} value={value}>
                  {t(`scopes.${value}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field>
          <Button type="submit" disabled={busy || !targetClerkUserId.trim()}>
            {busy ? t('saving') : t('save')}
          </Button>
        </Field>
      </FieldGroup>
    </form>
  )
}
