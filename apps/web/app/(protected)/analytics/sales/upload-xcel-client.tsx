'use client'

import { useId, useRef } from 'react'
import { Button } from '@workspace/ui/components/button'
import { useTranslations } from 'next-intl'
import { cn } from '@workspace/ui/lib/utils'

export type UploadStatus = 'idle' | 'success' | 'error'

interface UploadExcelClientProps {
  disabled?: boolean
  uploading?: boolean

  status?: UploadStatus
  message?: string | null
  pos?: string | null

  /** Compact: button only (for advisor rail). Default includes supported-POS hint. */
  variant?: 'default' | 'compact'
  className?: string
  buttonClassName?: string

  onFileSelected: (file: File) => void
}

export default function UploadExcelClient({
  disabled = false,
  uploading = false,
  status = 'idle',
  message = null,
  pos = null,
  variant = 'default',
  className,
  buttonClassName,
  onFileSelected,
}: UploadExcelClientProps) {
  const t = useTranslations('analytics.sales.upload')
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const fileInputId = useId()
  const compact = variant === 'compact'

  function openFileDialog() {
    fileInputRef.current?.click()
  }

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return

    onFileSelected(file)

    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  return (
    <div className={cn('flex w-full flex-col items-start gap-2', compact && 'w-auto', className)}>
      <label htmlFor={fileInputId} className="sr-only">
        {t('fileInputLabel')}
      </label>
      <input
        id={fileInputId}
        ref={fileInputRef}
        type="file"
        accept=".xlsx"
        className="hidden"
        onChange={handleFileChange}
      />

      <Button
        type="button"
        size={compact ? 'sm' : 'default'}
        onClick={openFileDialog}
        disabled={disabled || uploading}
        className={cn(compact ? 'shrink-0 whitespace-nowrap' : 'w-full sm:w-auto', buttonClassName)}
      >
        {uploading ? t('uploading') : t('cta')}
      </Button>

      {!compact ? <p className="text-xs text-muted-foreground">{t('supportedPos')}</p> : null}

      {message ? (
        <p
          role="status"
          aria-live={status === 'error' ? 'assertive' : 'polite'}
          className={cn(
            'text-left text-sm',
            compact && 'max-w-[14rem] text-xs',
            status === 'success' ? 'text-green-600' : 'text-red-600',
          )}
        >
          {message}

          {status === 'success' && pos ? (
            <>
              <br />
              <span className="text-muted-foreground">
                {t('detectedPos')} <strong>{pos.toUpperCase()}</strong>
              </span>
            </>
          ) : null}
        </p>
      ) : null}
    </div>
  )
}
