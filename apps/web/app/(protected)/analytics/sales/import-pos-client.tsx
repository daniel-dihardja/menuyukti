'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { Button } from '@workspace/ui/components/button'
import { DatePicker } from '@workspace/ui/components/date-picker'
import { Field, FieldLabel } from '@workspace/ui/components/field'
import type { ImportPosStatus } from './use-import-pos-analytics'

type ImportPosClientProps = {
  disabled?: boolean
  importing?: boolean
  status?: ImportPosStatus
  errorMessage?: string | null
  successName?: string | null
  successOrderCount?: number | null
  successLineCount?: number | null
  onImport: (startDate: string, endDate: string) => void
}

export default function ImportPosClient({
  disabled = false,
  importing = false,
  status = 'idle',
  errorMessage = null,
  successName = null,
  successOrderCount = null,
  successLineCount = null,
  onImport,
}: ImportPosClientProps) {
  const t = useTranslations('analytics.sales.importPos')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')

  const canSubmit = Boolean(startDate && endDate) && !disabled && !importing

  function resolveErrorMessage(): string | null {
    if (!errorMessage) return null
    if (errorMessage === 'missingLocation') return t('errors.missingLocation')
    if (errorMessage === 'missingDates') return t('errors.missingDates')
    if (errorMessage === 'invalidRange') return t('errors.invalidRange')
    return errorMessage
  }

  const displayMessage =
    status === 'success' &&
    successName != null &&
    successOrderCount != null &&
    successLineCount != null
      ? t('success', {
          name: successName,
          orderCount: successOrderCount,
          lineCount: successLineCount,
        })
      : status === 'error'
        ? resolveErrorMessage()
        : null

  return (
    <section aria-labelledby="import-pos-heading" className="flex w-full flex-col gap-3">
      <div className="flex flex-col gap-1">
        <h2 id="import-pos-heading" className="text-sm font-semibold">
          {t('title')}
        </h2>
        <p className="text-xs text-muted-foreground">{t('description')}</p>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:max-w-lg">
        <Field>
          <FieldLabel htmlFor="import-pos-start">{t('startLabel')}</FieldLabel>
          <DatePicker
            id="import-pos-start"
            value={startDate || undefined}
            onChange={setStartDate}
            disabled={disabled || importing}
            placeholder={t('datePlaceholder')}
            max={endDate || undefined}
          />
        </Field>
        <Field>
          <FieldLabel htmlFor="import-pos-end">{t('endLabel')}</FieldLabel>
          <DatePicker
            id="import-pos-end"
            value={endDate || undefined}
            onChange={setEndDate}
            disabled={disabled || importing}
            placeholder={t('datePlaceholder')}
            min={startDate || undefined}
          />
        </Field>
      </div>

      <Button
        type="button"
        onClick={() => onImport(startDate, endDate)}
        disabled={!canSubmit}
        className="w-full sm:w-auto"
      >
        {importing ? t('importing') : t('cta')}
      </Button>

      {displayMessage ? (
        <p
          role="status"
          aria-live={status === 'error' ? 'assertive' : 'polite'}
          className={`text-left text-sm ${
            status === 'success' ? 'text-green-600' : 'text-red-600'
          }`}
        >
          {displayMessage}
        </p>
      ) : null}
    </section>
  )
}
