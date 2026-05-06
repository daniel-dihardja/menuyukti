'use client'

import type { ChangeEvent, DragEvent, RefObject } from 'react'
import { ImageIcon, Loader2, Sparkles, Upload } from 'lucide-react'
import { useTranslations } from 'next-intl'

import { Button } from '@workspace/ui/components/button'
import { Card } from '@workspace/ui/components/card'
import { Field, FieldLabel } from '@workspace/ui/components/field'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@workspace/ui/components/select'
import { cn } from '@workspace/ui/lib/utils'

export type AiFlowOption = { slug: string; displayName: string }

export type AssetsUploadZoneProps = {
  inputRef: RefObject<HTMLInputElement | null>
  selectedFlow: string
  onSelectedFlowChange: (value: string) => void
  aiFlows: AiFlowOption[]
  uploading: boolean
  flowsLoading: boolean
  dragActive: boolean
  onSetDragActive: (active: boolean) => void
  onInputChange: (e: ChangeEvent<HTMLInputElement>) => void
  onDrop: (e: DragEvent) => void
  onBrowse: () => void
}

export function AssetsUploadZone({
  inputRef,
  selectedFlow,
  onSelectedFlowChange,
  aiFlows,
  uploading,
  flowsLoading,
  dragActive,
  onSetDragActive,
  onInputChange,
  onDrop,
  onBrowse,
}: AssetsUploadZoneProps) {
  const t = useTranslations('assets')

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
            ? 'border-primary bg-primary/5 shadow-[0_0_0_1px_hsl(var(--primary)/0.2)]'
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
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_hsl(var(--primary)/0.06),_transparent_55%)]" />
        <div className="relative flex flex-col gap-3 px-4 py-7 sm:gap-3 sm:px-5 sm:py-8">
          <div className="flex items-start gap-3 sm:items-center sm:gap-4">
            <div
              className={cn(
                'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border bg-background/80 shadow-sm transition-transform duration-300',
                dragActive ? 'scale-105 border-primary/50 text-primary' : 'text-muted-foreground',
              )}
            >
              {uploading ? (
                <Loader2 className="size-5 animate-spin text-primary" aria-hidden />
              ) : (
                <Upload className="size-5" aria-hidden />
              )}
            </div>
            <div className="flex min-w-0 flex-1 flex-col gap-0.5 text-left">
              <h2 className="text-base font-semibold tracking-tight">{t('upload.title')}</h2>
              <p className="text-pretty text-xs text-muted-foreground sm:text-sm">
                {t('upload.hint')}
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:gap-3">
            <Field className="min-w-0 flex-1 gap-1.5">
              <FieldLabel
                htmlFor="asset-upload-flow"
                className="text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-muted-foreground/90"
              >
                {t('upload.flow.label')}
              </FieldLabel>
              <Select
                value={selectedFlow}
                onValueChange={onSelectedFlowChange}
                disabled={uploading || flowsLoading}
              >
                <SelectTrigger
                  id="asset-upload-flow"
                  size="default"
                  className={cn(
                    'h-10 w-full justify-between rounded-lg border-border/80 bg-background/90 px-3 shadow-sm transition-[box-shadow,border-color] duration-200',
                    'hover:border-primary/30 hover:bg-background',
                    'data-[state=open]:border-primary/40 data-[state=open]:shadow-[0_0_0_3px_hsl(var(--ring)/0.25)]',
                  )}
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent
                  align="start"
                  position="popper"
                  className="min-w-[var(--radix-select-trigger-width)]"
                >
                  <SelectItem value="none">{t('upload.flow.none')}</SelectItem>
                  {aiFlows.map((flow) => (
                    <SelectItem key={flow.slug} value={flow.slug} className="cursor-pointer">
                      <span className="flex w-full items-center gap-2">
                        <Sparkles className="size-4 shrink-0 text-primary" aria-hidden />
                        <span className="flex-1">{flow.displayName}</span>
                        <span className="rounded-md bg-primary/15 px-1.5 py-0.5 text-[0.65rem] font-bold uppercase tracking-wide text-primary">
                          AI
                        </span>
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Button
              type="button"
              className="h-10 shrink-0 rounded-full px-6 shadow-sm sm:min-w-[9rem]"
              disabled={uploading}
              onClick={onBrowse}
            >
              {uploading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t('upload.uploading')}
                </>
              ) : (
                <>
                  <ImageIcon className="mr-2 h-4 w-4" />
                  {t('upload.browse')}
                </>
              )}
            </Button>
          </div>
        </div>
      </Card>
    </section>
  )
}
