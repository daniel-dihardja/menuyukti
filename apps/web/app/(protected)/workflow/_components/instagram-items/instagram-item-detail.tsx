'use client'

import { useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import { ArrowLeftIcon, XIcon } from 'lucide-react'

import { Button } from '@workspace/ui/components/button'
import { DateTimePicker } from '@workspace/ui/components/date-time-picker'
import { Input } from '@workspace/ui/components/input'
import { Label } from '@workspace/ui/components/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@workspace/ui/components/select'
import { Spinner } from '@workspace/ui/components/spinner'
import { Textarea } from '@workspace/ui/components/textarea'

import type { InstagramItemDto } from '@/lib/graphql/queries/instagram-items'

import {
  toFormValues,
  type InstagramItemFormValues,
  type InstagramItemKind,
  type InstagramItemStatus,
} from './use-instagram-items'

type InstagramItemDetailProps = {
  item: InstagramItemDto
  saving: boolean
  actionError: string | null
  onBack: () => void
  onSave: (values: InstagramItemFormValues) => Promise<void>
}

export function InstagramItemDetail({
  item,
  saving,
  actionError,
  onBack,
  onSave,
}: InstagramItemDetailProps) {
  const t = useTranslations('analytics.workflows.instagramItems')
  const [values, setValues] = useState<InstagramItemFormValues>(() => toFormValues(item))

  useEffect(() => {
    setValues(toFormValues(item))
  }, [item])

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <div className="flex items-center gap-2">
        <Button
          aria-label={t('backAria')}
          disabled={saving}
          onClick={onBack}
          size="icon"
          type="button"
          variant="ghost"
        >
          <ArrowLeftIcon className="size-4" />
        </Button>
        <h2 className="min-w-0 flex-1 truncate font-semibold text-base tracking-tight">
          {values.title.trim() ? values.title : t('untitled')}
        </h2>
      </div>

      <form
        className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto"
        onSubmit={(event) => {
          event.preventDefault()
          void onSave(values)
        }}
      >
        <div className="grid gap-1.5">
          <Label htmlFor="ig-item-kind">{t('fields.kind')}</Label>
          <Select
            disabled={saving}
            onValueChange={(value) =>
              setValues((prev) => ({ ...prev, kind: value as InstagramItemKind }))
            }
            value={values.kind}
          >
            <SelectTrigger id="ig-item-kind">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="story">{t('kind.story')}</SelectItem>
              <SelectItem value="post">{t('kind.post')}</SelectItem>
              <SelectItem value="reel">{t('kind.reel')}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="grid gap-1.5">
          <Label htmlFor="ig-item-status">{t('fields.status')}</Label>
          <Select
            disabled={saving}
            onValueChange={(value) =>
              setValues((prev) => ({ ...prev, status: value as InstagramItemStatus }))
            }
            value={values.status}
          >
            <SelectTrigger id="ig-item-status">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="draft">{t('status.draft')}</SelectItem>
              <SelectItem value="ready">{t('status.ready')}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="grid gap-1.5">
          <Label>{t('fields.schedule')}</Label>
          <div className="flex items-center gap-2">
            <div className="min-w-0 flex-1">
              <DateTimePicker
                disabled={saving}
                onChange={(schedule) => setValues((prev) => ({ ...prev, schedule }))}
                placeholder={t('fields.scheduleDatePlaceholder')}
                timeLabel={t('fields.scheduleTime')}
                value={values.schedule || undefined}
              />
            </div>
            {values.schedule ? (
              <Button
                aria-label={t('clearScheduleAria')}
                disabled={saving}
                onClick={() => setValues((prev) => ({ ...prev, schedule: '' }))}
                size="icon"
                type="button"
                variant="ghost"
              >
                <XIcon className="size-4" />
              </Button>
            ) : null}
          </div>
        </div>

        <div className="grid gap-1.5">
          <Label htmlFor="ig-item-title">{t('fields.title')}</Label>
          <Input
            disabled={saving}
            id="ig-item-title"
            onChange={(event) => setValues((prev) => ({ ...prev, title: event.target.value }))}
            value={values.title}
          />
        </div>

        <div className="grid gap-1.5">
          <Label htmlFor="ig-item-hook">{t('fields.hook')}</Label>
          <Textarea
            disabled={saving}
            id="ig-item-hook"
            onChange={(event) => setValues((prev) => ({ ...prev, hook: event.target.value }))}
            rows={2}
            value={values.hook}
          />
        </div>

        <div className="grid gap-1.5">
          <Label htmlFor="ig-item-caption">{t('fields.caption')}</Label>
          <Textarea
            disabled={saving}
            id="ig-item-caption"
            onChange={(event) => setValues((prev) => ({ ...prev, caption: event.target.value }))}
            rows={3}
            value={values.caption}
          />
        </div>

        <div className="grid gap-1.5">
          <Label htmlFor="ig-item-visual-brief">{t('fields.visualBrief')}</Label>
          <Textarea
            disabled={saving}
            id="ig-item-visual-brief"
            onChange={(event) =>
              setValues((prev) => ({ ...prev, visualBrief: event.target.value }))
            }
            rows={3}
            value={values.visualBrief}
          />
        </div>

        {actionError ? (
          <p className="text-destructive text-sm" role="alert">
            {actionError}
          </p>
        ) : null}

        <div className="mt-auto flex flex-wrap gap-2 pt-2">
          <Button
            className={saving ? 'inline-flex items-center gap-2' : undefined}
            disabled={saving}
            type="submit"
          >
            {saving ? <Spinner className="size-3.5" /> : null}
            {t('saveButton')}
          </Button>
        </div>
      </form>
    </div>
  )
}
