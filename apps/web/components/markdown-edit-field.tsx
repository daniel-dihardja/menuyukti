'use client'

import { useTranslations } from 'next-intl'
import { WandSparkles } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

import { MarkdownMessage } from '@/components/markdown-message'
import type { MarkdownFormatPreset } from '@/lib/markdown-format-presets'
import { Button } from '@workspace/ui/components/button'
import { Spinner } from '@workspace/ui/components/spinner'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@workspace/ui/components/tabs'
import { Textarea } from '@workspace/ui/components/textarea'
import { Tooltip, TooltipContent, TooltipTrigger } from '@workspace/ui/components/tooltip'

export type MarkdownEditFieldProps = {
  id: string
  value: string
  onChange: (value: string) => void
  onBlur?: () => void
  disabled?: boolean
  placeholder?: string
  formatPreset: MarkdownFormatPreset
  previewTabLabel: string
  editTabLabel: string
  previewEmptyLabel: string
  textareaClassName?: string
}

export function MarkdownEditField({
  id,
  value,
  onChange,
  onBlur,
  disabled = false,
  placeholder,
  formatPreset,
  previewTabLabel,
  editTabLabel,
  previewEmptyLabel,
  textareaClassName = 'min-h-[200px] resize-y whitespace-pre-wrap',
}: MarkdownEditFieldProps) {
  const t = useTranslations('analytics.campaigns.chat')
  const [formatting, setFormatting] = useState(false)
  const [formatError, setFormatError] = useState<string | null>(null)
  /** Preview vs Edit — controlled so we can persist when leaving Edit without relying on textarea blur (Radix may hide content before blur). */
  const [innerTab, setInnerTab] = useState('preview')
  const onBlurRef = useRef(onBlur)
  onBlurRef.current = onBlur
  const blurLock = useRef(false)

  const commitBlur = () => {
    if (!onBlurRef.current) return
    if (blurLock.current) return
    blurLock.current = true
    queueMicrotask(() => {
      blurLock.current = false
    })
    onBlurRef.current()
  }

  useEffect(() => {
    return () => {
      onBlurRef.current?.()
    }
  }, [])

  async function handleFormat() {
    setFormatError(null)
    setFormatting(true)
    try {
      const res = await fetch('/api/format-markdown', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: value, preset: formatPreset }),
      })
      const data = (await res.json().catch(() => ({}))) as { formatted?: string; error?: string }
      if (!res.ok) {
        setFormatError(data.error ?? t('formatMarkdownError'))
        return
      }
      if (typeof data.formatted !== 'string') {
        setFormatError(t('formatMarkdownError'))
        return
      }
      onChange(data.formatted)
    } catch {
      setFormatError(t('formatMarkdownError'))
    } finally {
      setFormatting(false)
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <Tabs
        className="gap-3"
        onValueChange={(next) => {
          if (innerTab === 'edit' && next !== 'edit') {
            commitBlur()
          }
          setInnerTab(next)
        }}
        value={innerTab}
      >
        <TabsList
          className="h-9 w-full max-w-md"
          variant="default"
          onClick={(e) => e.stopPropagation()}
          onPointerDown={(e) => e.stopPropagation()}
        >
          <TabsTrigger className="flex-1" value="preview">
            {previewTabLabel}
          </TabsTrigger>
          <TabsTrigger className="flex-1" value="edit">
            {editTabLabel}
          </TabsTrigger>
        </TabsList>
        <TabsContent className="mt-0" value="preview">
          {value.trim() ? (
            <div className="max-h-[min(50vh,28rem)] overflow-y-auto rounded-md border border-border/60 bg-muted/30 p-3">
              <MarkdownMessage content={value} />
            </div>
          ) : (
            <p className="text-muted-foreground text-sm">{previewEmptyLabel}</p>
          )}
        </TabsContent>
        <TabsContent className="mt-0 flex flex-col gap-2" value="edit">
          <div className="flex justify-end">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  aria-label={t('formatMarkdownButton')}
                  className="gap-1.5"
                  disabled={disabled || formatting}
                  onClick={(e) => {
                    e.stopPropagation()
                    void handleFormat()
                  }}
                  onPointerDown={(e) => e.stopPropagation()}
                  size="sm"
                  type="button"
                  variant="secondary"
                >
                  {formatting ? (
                    <>
                      <Spinner className="size-4" />
                      {t('formatMarkdownFormatting')}
                    </>
                  ) : (
                    <>
                      <WandSparkles className="size-4" aria-hidden />
                      {t('formatMarkdownButton')}
                    </>
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">{t('formatMarkdownButton')}</TooltipContent>
            </Tooltip>
          </div>
          {formatError ? (
            <p className="text-destructive text-sm" role="alert">
              {formatError}
            </p>
          ) : null}
          <Textarea
            className={textareaClassName}
            disabled={disabled}
            id={id}
            onChange={(e) => onChange(e.target.value)}
            onBlur={commitBlur}
            onClick={(e) => e.stopPropagation()}
            onPointerDown={(e) => e.stopPropagation()}
            placeholder={placeholder}
            value={value}
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}
