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
import type { ClearWorkspaceServiceDataResult } from '@/lib/graphql/queries'
import {
  SERVICE_KEY_PICK_AND_WIN,
  SERVICE_KEYS,
  type ServiceKey,
} from '@/lib/graphql/queries/service-subscriptions'

/** Services offered in the staff clear UI (aligned with GraphQL clear handlers). */
const CLEAR_SERVICE_KEYS = SERVICE_KEYS

export function StaffClearServiceDataForm() {
  const t = useTranslations('staff.clearServiceData')
  const { userId } = useAuth()
  const [targetClerkUserId, setTargetClerkUserId] = useState('')
  const [serviceKey, setServiceKey] = useState<ServiceKey>(SERVICE_KEY_PICK_AND_WIN)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (userId) {
      setTargetClerkUserId((prev) => prev || userId)
    }
  }, [userId])

  function fillMyUserId() {
    if (!userId) return
    setTargetClerkUserId(userId)
  }

  function successMessage(data: ClearWorkspaceServiceDataResult): string {
    return t('success', {
      service: t(`services.${data.serviceKey}`),
      workspaceId: data.workspaceId,
      locations: data.locationIds.length,
      predictions: data.predictionsDeleted,
      votings: data.votingsDeleted,
      ledger: data.ledgerEntriesDeleted,
      rules: data.earnRulesDeleted,
      posOrders: data.posOrdersDeleted,
      menuCategories: data.menuCategoriesCleared,
      subscriptions: data.subscriptionsCanceled,
    })
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const targetId = targetClerkUserId.trim()
    if (!targetId || busy) return

    if (
      !window.confirm(
        t('confirm', {
          service: t(`services.${serviceKey}`),
        }),
      )
    ) {
      return
    }

    setBusy(true)
    try {
      const result = await apiFetch<ClearWorkspaceServiceDataResult>(
        '/api/staff/clear-service-data',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            targetClerkUserId: targetId,
            serviceKey,
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
          <FieldLabel htmlFor="clear-service-target-clerk-user-id">
            {t('targetClerkUserIdLabel')}
          </FieldLabel>
          <Input
            id="clear-service-target-clerk-user-id"
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
          <FieldLabel htmlFor="clear-service-key">{t('serviceKeyLabel')}</FieldLabel>
          <Select
            value={serviceKey}
            onValueChange={(value) => setServiceKey(value as ServiceKey)}
            disabled={busy}
          >
            <SelectTrigger id="clear-service-key" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CLEAR_SERVICE_KEYS.map((value) => (
                <SelectItem key={value} value={value}>
                  {t(`services.${value}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field>
          <Button type="submit" disabled={busy || !targetClerkUserId.trim()} variant="destructive">
            {busy ? t('saving') : t('save')}
          </Button>
        </Field>
      </FieldGroup>
    </form>
  )
}
