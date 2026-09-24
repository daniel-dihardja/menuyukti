'use client'

import { useId } from 'react'
import { useTranslations } from 'next-intl'

import { Badge } from '@workspace/ui/components/badge'
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from '@workspace/ui/components/empty'
import { Label } from '@workspace/ui/components/label'
import { Textarea } from '@workspace/ui/components/textarea'

type HolidayItem = {
  id: string
  date: string
  name: string
}

type PublicHolidaysDraftStoriesProps = {
  holidays: HolidayItem[]
  instructions: string
  onInstructionsChange: (value: string) => void
}

export function PublicHolidaysDraftStories({
  holidays,
  instructions,
  onInstructionsChange,
}: PublicHolidaysDraftStoriesProps) {
  const t = useTranslations('playbooks.items.publicHolidays.workspace.draft')
  const instructionsId = useId()
  const instructionsHintId = `${instructionsId}-hint`

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2 rounded-xl border border-border/70 p-4">
        <Label htmlFor={instructionsId} className="text-sm font-medium">
          {t('instructionsLabel')}
        </Label>
        <Textarea
          id={instructionsId}
          value={instructions}
          onChange={(e) => onInstructionsChange(e.target.value)}
          placeholder={t('instructionsPlaceholder')}
          maxLength={2000}
          rows={3}
          className="min-h-20 resize-y"
          aria-describedby={instructionsHintId}
        />
        <p id={instructionsHintId} className="text-muted-foreground text-xs">
          {t('instructionsHint')}
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <section
          className="flex min-w-0 flex-col gap-3 rounded-xl border border-border/70 p-4"
          aria-labelledby="ph-draft-candidates-heading"
        >
          <div className="flex items-center gap-2">
            <h2 id="ph-draft-candidates-heading" className="text-sm font-semibold">
              {t('candidatesTitle')}
            </h2>
            <Badge variant="outline" className="font-normal">
              {t('candidatesCount', { count: holidays.length })}
            </Badge>
          </div>

          {holidays.length === 0 ? (
            <Empty className="border border-dashed border-border/70 py-8 md:py-10">
              <EmptyHeader>
                <EmptyTitle>{t('candidatesEmptyTitle')}</EmptyTitle>
                <EmptyDescription>{t('candidatesEmptyDescription')}</EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : (
            <ul className="divide-y divide-border/60 rounded-lg border border-border/60">
              {holidays.map((item) => (
                <li key={item.id} className="px-3 py-3">
                  <p className="truncate text-sm font-medium">{item.name}</p>
                  <p className="text-muted-foreground text-xs tabular-nums">{item.date}</p>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section
          className="flex min-w-0 flex-col gap-3 rounded-xl border border-border/70 p-4"
          aria-labelledby="ph-draft-confirmed-heading"
        >
          <div className="flex items-center gap-2">
            <h2 id="ph-draft-confirmed-heading" className="text-sm font-semibold">
              {t('confirmedTitle')}
            </h2>
            <Badge variant="outline" className="font-normal">
              {t('confirmedCount', { count: 0 })}
            </Badge>
          </div>

          <Empty className="border border-dashed border-border/70 py-8 md:py-10">
            <EmptyHeader>
              <EmptyTitle>{t('confirmedEmptyTitle')}</EmptyTitle>
              <EmptyDescription>{t('confirmedEmptyDescription')}</EmptyDescription>
            </EmptyHeader>
          </Empty>
        </section>
      </div>
    </div>
  )
}
