'use client'

import type { ChangeEvent, DragEvent, RefObject } from 'react'
import { ImageIcon, Loader2, Upload } from 'lucide-react'
import { useTranslations } from 'next-intl'

import { Button } from '@workspace/ui/components/button'
import { Card } from '@workspace/ui/components/card'
import { cn } from '@workspace/ui/lib/utils'

export type MediaUploadZoneProps = {
  inputRef: RefObject<HTMLInputElement | null>
  uploading: boolean
  dragActive: boolean
  onSetDragActive: (active: boolean) => void
  onInputChange: (e: ChangeEvent<HTMLInputElement>) => void
  onDrop: (e: DragEvent) => void
  onBrowse: () => void
}

export function MediaUploadZone({
  inputRef,
  uploading,
  dragActive,
  onSetDragActive,
  onInputChange,
  onDrop,
  onBrowse,
}: MediaUploadZoneProps) {
  const t = useTranslations('media')

  return (
    <section>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        aria-label={t('upload.browse')}
        className="sr-only"
        onChange={onInputChange}
      />
      <Card
        className={cn(
          'group relative overflow-hidden border-2 border-dashed transition-[border-color,background-color,box-shadow,opacity] duration-300',
          dragActive
            ? 'border-primary bg-primary/5 shadow-[0_0_0_1px_color-mix(in srgb, var(--primary) 20%, transparent)]'
            : 'border-muted-foreground/25 bg-gradient-to-br from-muted/40 via-background to-muted/20 hover:border-primary/40 hover:shadow-md',
          uploading && 'pointer-events-none opacity-80',
        )}
        onDragEnter={(e) => {
          e.preventDefault()
          onSetDragActive(true)
        }}
        onDragLeave={(e) => {
          e.preventDefault()
          if (e.currentTarget === e.target) onSetDragActive(false)
        }}
        onDragOver={(e) => {
          e.preventDefault()
          onSetDragActive(true)
        }}
        onDrop={onDrop}
      >
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_color-mix(in srgb, var(--primary) 6%, transparent),_transparent_55%)]" />
        <div className="relative flex flex-col gap-4 px-4 py-7 sm:flex-row sm:items-center sm:justify-between sm:px-5 sm:py-8">
          <div className="flex items-start gap-3 sm:items-center sm:gap-4">
            <div
              className={cn(
                'flex size-10 shrink-0 items-center justify-center rounded-xl border bg-background/80 shadow-sm transition-transform duration-300',
                dragActive ? 'scale-105 border-primary/50 text-primary' : 'text-muted-foreground',
              )}
            >
              {uploading ? (
                <Loader2 className="animate-spin text-primary" aria-hidden />
              ) : (
                <Upload aria-hidden />
              )}
            </div>
            <div className="flex min-w-0 flex-1 flex-col gap-0.5 text-left">
              <h2 className="text-base font-semibold tracking-tight">{t('upload.title')}</h2>
              <p className="text-pretty text-xs text-muted-foreground sm:hidden">
                {t('upload.hintMobile')}
              </p>
              <p className="hidden text-pretty text-sm text-muted-foreground sm:block">
                {t('upload.hint')}
              </p>
            </div>
          </div>

          <Button
            type="button"
            className="h-11 shrink-0 touch-manipulation px-6 shadow-sm sm:h-10 sm:min-w-[9rem]"
            disabled={uploading}
            onClick={onBrowse}
          >
            {uploading ? (
              <>
                <Loader2 className="animate-spin" />
                {t('upload.uploading')}
              </>
            ) : (
              <>
                <ImageIcon />
                {t('upload.browse')}
              </>
            )}
          </Button>
        </div>
      </Card>
    </section>
  )
}
