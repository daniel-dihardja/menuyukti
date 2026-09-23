'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
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
import { WORKSPACE_PLAN_FREE, WORKSPACE_PLAN_PRO, type WorkspacePlan } from '@/lib/workspace-plan'

export function StaffProvisionWorkspaceForm() {
  const t = useTranslations('staff.provisionWorkspace')
  const router = useRouter()
  const [ownerClerkUserId, setOwnerClerkUserId] = useState('')
  const [name, setName] = useState('')
  const [plan, setPlan] = useState<WorkspacePlan>(WORKSPACE_PLAN_PRO)
  const [busy, setBusy] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const ownerId = ownerClerkUserId.trim()
    const workspaceName = name.trim()
    if (!ownerId || !workspaceName || busy) return

    setBusy(true)
    try {
      const result = await apiFetch<{ id: string; plan: string; name: string }>(
        '/api/staff/workspaces',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ownerClerkUserId: ownerId,
            name: workspaceName,
            plan,
          }),
        },
        t('error'),
      )
      if (!result.ok) {
        toast.error(result.error)
        return
      }
      toast.success(t('success', { id: result.data.id, plan: result.data.plan }))
      setOwnerClerkUserId('')
      setName('')
      setPlan(WORKSPACE_PLAN_PRO)
      router.refresh()
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
          <FieldLabel htmlFor="owner-clerk-user-id">{t('ownerClerkUserIdLabel')}</FieldLabel>
          <Input
            id="owner-clerk-user-id"
            name="ownerClerkUserId"
            value={ownerClerkUserId}
            onChange={(e) => setOwnerClerkUserId(e.target.value)}
            placeholder={t('ownerClerkUserIdPlaceholder')}
            required
            disabled={busy}
            autoComplete="off"
          />
        </Field>
        <Field>
          <FieldLabel htmlFor="workspace-name">{t('nameLabel')}</FieldLabel>
          <Input
            id="workspace-name"
            name="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t('namePlaceholder')}
            required
            disabled={busy}
            autoComplete="off"
          />
        </Field>
        <Field>
          <FieldLabel htmlFor="provision-workspace-plan">{t('planLabel')}</FieldLabel>
          <Select
            value={plan}
            onValueChange={(value) => setPlan(value as WorkspacePlan)}
            disabled={busy}
          >
            <SelectTrigger id="provision-workspace-plan" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={WORKSPACE_PLAN_FREE}>{t('planFree')}</SelectItem>
              <SelectItem value={WORKSPACE_PLAN_PRO}>{t('planPro')}</SelectItem>
            </SelectContent>
          </Select>
        </Field>
        <Field>
          <Button type="submit" disabled={busy || !ownerClerkUserId.trim() || !name.trim()}>
            {busy ? t('saving') : t('save')}
          </Button>
        </Field>
      </FieldGroup>
    </form>
  )
}
