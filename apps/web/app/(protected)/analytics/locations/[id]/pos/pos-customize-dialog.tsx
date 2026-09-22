'use client'

import { useTranslations } from 'next-intl'

import { Button } from '@workspace/ui/components/button'
import { Checkbox } from '@workspace/ui/components/checkbox'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@workspace/ui/components/dialog'
import { Field, FieldGroup, FieldLabel } from '@workspace/ui/components/field'
import { Textarea } from '@workspace/ui/components/textarea'
import { cn } from '@workspace/ui/lib/utils'

import type {
  LocationMenuItem,
  LocationMenuModifierGroup,
} from '@/lib/graphql/queries/location-menu'
import { formatCurrency } from '@/lib/currency'

type PosCustomizeDialogProps = {
  item: LocationMenuItem | null
  groups: LocationMenuModifierGroup[]
  selectedOptionIds: Record<number, number[]>
  lineNoteDraft: string
  currencyCode: string
  pending: boolean
  onOpenChange: (open: boolean) => void
  onToggleOption: (group: LocationMenuModifierGroup, optionId: number) => void
  onLineNoteChange: (value: string) => void
  onConfirm: () => void
}

export function PosCustomizeDialog({
  item,
  groups,
  selectedOptionIds,
  lineNoteDraft,
  currencyCode,
  pending,
  onOpenChange,
  onToggleOption,
  onLineNoteChange,
  onConfirm,
}: PosCustomizeDialogProps) {
  const t = useTranslations('pos')

  return (
    <Dialog open={item != null} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {item ? t('customizeTitle', { name: item.name }) : t('customizeTitleFallback')}
          </DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          {groups.map((group) => (
            <fieldset key={group.id} className="flex flex-col gap-2">
              <legend className="text-sm font-medium">
                {group.name}
                <span className="ml-1 font-normal text-muted-foreground">
                  {t('modifierSelectHint', { min: group.minSelect, max: group.maxSelect })}
                </span>
              </legend>
              <div className="flex flex-col gap-2">
                {group.options.map((option) => {
                  const selected = (selectedOptionIds[group.id] ?? []).includes(option.id)
                  const inputId = `mod-${group.id}-${option.id}`
                  if (group.maxSelect <= 1) {
                    return (
                      <button
                        key={option.id}
                        type="button"
                        id={inputId}
                        disabled={pending}
                        aria-pressed={selected}
                        onClick={() => onToggleOption(group, option.id)}
                        className={cn(
                          'flex min-h-11 w-full items-center justify-between gap-2 rounded-md border px-3 py-2 text-left text-sm transition-colors',
                          'hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                          selected && 'border-primary bg-primary/5',
                          'disabled:opacity-50',
                        )}
                      >
                        <span>{option.name}</span>
                        {option.priceDelta !== 0 ? (
                          <span className="tabular-nums text-muted-foreground">
                            {option.priceDelta > 0 ? '+' : ''}
                            {formatCurrency(option.priceDelta, currencyCode)}
                          </span>
                        ) : null}
                      </button>
                    )
                  }
                  return (
                    <div
                      key={option.id}
                      className="flex min-h-11 items-center gap-3 rounded-md border px-3"
                    >
                      <Checkbox
                        id={inputId}
                        checked={selected}
                        disabled={pending}
                        onCheckedChange={() => onToggleOption(group, option.id)}
                      />
                      <label
                        htmlFor={inputId}
                        className="flex flex-1 cursor-pointer justify-between gap-2 py-2 text-sm"
                      >
                        <span>{option.name}</span>
                        {option.priceDelta !== 0 ? (
                          <span className="tabular-nums text-muted-foreground">
                            {option.priceDelta > 0 ? '+' : ''}
                            {formatCurrency(option.priceDelta, currencyCode)}
                          </span>
                        ) : null}
                      </label>
                    </div>
                  )
                })}
              </div>
            </fieldset>
          ))}
          <FieldGroup className="gap-2">
            <Field>
              <FieldLabel htmlFor="pos-line-note">{t('lineNote')}</FieldLabel>
              <Textarea
                id="pos-line-note"
                value={lineNoteDraft}
                onChange={(e) => onLineNoteChange(e.target.value)}
                disabled={pending}
                rows={2}
                placeholder={t('lineNotePlaceholder')}
              />
            </Field>
          </FieldGroup>
        </div>
        <DialogFooter>
          <Button type="button" size="lg" variant="outline" onClick={() => onOpenChange(false)}>
            {t('customizeCancel')}
          </Button>
          <Button type="button" size="lg" disabled={pending} onClick={onConfirm}>
            {t('customizeAdd')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
