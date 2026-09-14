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

import { useWorkspacePlan } from '@/hooks/use-workspace-plan'
import { apiFetch } from '@/lib/api/client-fetch'
import { WORKSPACE_PLAN_FREE, WORKSPACE_PLAN_PRO, type WorkspacePlan } from '@/lib/workspace-plan'

export function StaffWorkspacePlanForm() {
  const t = useTranslations('staff.workspacePlan')
  const router = useRouter()
  const { workspaceId: myWorkspaceId, plan: myPlan } = useWorkspacePlan()
  const [workspaceId, setWorkspaceId] = useState('')
  const [plan, setPlan] = useState<WorkspacePlan>(WORKSPACE_PLAN_PRO)
  const [busy, setBusy] = useState(false)

  function fillMyWorkspaceId() {
    if (!myWorkspaceId) return
    setWorkspaceId(myWorkspaceId)
    setPlan(myPlan)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const id = workspaceId.trim()
    if (!id || busy) return

    setBusy(true)
    try {
      const result = await apiFetch<{ id: string; plan: string }>(
        '/api/staff/workspace-plan',
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ workspaceId: id, plan }),
        },
        t('error'),
      )
      if (!result.ok) {
        toast.error(result.error)
        return
      }
      toast.success(t('success', { plan: result.data.plan }))
      // Re-seed WorkspacePlanProvider so sidenav matches the new plan immediately.
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

      {myWorkspaceId ? (
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className="text-muted-foreground">
            {t('yourWorkspaceId', { id: myWorkspaceId })}
          </span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={busy}
            onClick={fillMyWorkspaceId}
          >
            {t('useYourWorkspaceId')}
          </Button>
        </div>
      ) : (
        <p className="text-muted-foreground text-sm">{t('noWorkspaceYet')}</p>
      )}

      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="workspace-id">{t('workspaceIdLabel')}</FieldLabel>
          <Input
            id="workspace-id"
            name="workspaceId"
            value={workspaceId}
            onChange={(e) => setWorkspaceId(e.target.value)}
            placeholder={t('workspaceIdPlaceholder')}
            required
            disabled={busy}
            inputMode="numeric"
            autoComplete="off"
          />
        </Field>
        <Field>
          <FieldLabel htmlFor="workspace-plan">{t('planLabel')}</FieldLabel>
          <Select
            value={plan}
            onValueChange={(value) => setPlan(value as WorkspacePlan)}
            disabled={busy}
          >
            <SelectTrigger id="workspace-plan" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={WORKSPACE_PLAN_FREE}>{t('planFree')}</SelectItem>
              <SelectItem value={WORKSPACE_PLAN_PRO}>{t('planPro')}</SelectItem>
            </SelectContent>
          </Select>
        </Field>
        <Field>
          <Button type="submit" disabled={busy || !workspaceId.trim()}>
            {busy ? t('saving') : t('save')}
          </Button>
        </Field>
      </FieldGroup>
    </form>
  )
}
