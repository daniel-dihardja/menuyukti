'use client'

import { useEffect, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'

import { updateCrmApp, type CrmApp } from '@/lib/crm/client-api'
import { routes } from '@/lib/routes'
import { Button } from '@workspace/ui/components/button'
import { Field, FieldDescription, FieldLabel } from '@workspace/ui/components/field'
import { Input } from '@workspace/ui/components/input'

type Props = {
  initialApp: CrmApp
}

export function AppDetailClient({ initialApp }: Props) {
  const t = useTranslations('platform.crm.apps')
  const router = useRouter()
  const [app, setApp] = useState(initialApp)
  const [title, setTitle] = useState(initialApp.title)
  const [isPending, startTransition] = useTransition()

  useEffect(() => {
    setApp(initialApp)
    setTitle(initialApp.title)
  }, [initialApp])

  const trimmed = title.trim()
  const isDirty = trimmed !== app.title
  const canSave = isDirty && trimmed.length > 0 && !isPending

  const handleSave = () => {
    if (!canSave) return
    startTransition(async () => {
      try {
        const updated = await updateCrmApp(app.id, { title: trimmed })
        setApp(updated)
        setTitle(updated.title)
        toast.success(t('toast.updated'))
        router.refresh()
      } catch (err) {
        toast.error(err instanceof Error ? err.message : t('toast.updateError'))
      }
    })
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-6">
      <form
        className="flex max-w-lg flex-col gap-5"
        onSubmit={(e) => {
          e.preventDefault()
          handleSave()
        }}
      >
        <Field className="space-y-2">
          <FieldLabel htmlFor="crm-app-detail-title">{t('titleLabel')}</FieldLabel>
          <Input
            id="crm-app-detail-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={t('titlePlaceholder')}
            maxLength={256}
            disabled={isPending}
            autoFocus
          />
        </Field>

        <Field className="space-y-2">
          <FieldLabel htmlFor="crm-app-detail-app-id">{t('appIdLabel')}</FieldLabel>
          <Input
            id="crm-app-detail-app-id"
            value={app.appId}
            readOnly
            className="font-mono text-sm"
          />
          <FieldDescription>{t('appIdHelp')}</FieldDescription>
        </Field>

        <div className="flex flex-wrap gap-2">
          <Button type="submit" disabled={!canSave} className="gap-2">
            {isPending ? (
              <>
                <Loader2 className="size-4 animate-spin" aria-hidden />
                {t('saving')}
              </>
            ) : (
              t('save')
            )}
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={isPending}
            onClick={() => router.push(routes.crmApps)}
          >
            {t('cancel')}
          </Button>
        </div>
      </form>
    </div>
  )
}
