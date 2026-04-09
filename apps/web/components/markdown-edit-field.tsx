'use client'

import { useTranslations } from 'next-intl'
import { Maximize2, WandSparkles, X } from 'lucide-react'
import { type ReactNode, useCallback, useContext, useEffect, useRef, useState } from 'react'

import { MarkdownMessage } from '@/components/markdown-message'
import { PanelFullscreenContext } from '@/components/panel-fullscreen-context'
import type { MarkdownFormatPreset } from '@/lib/markdown-format-presets'
import { Button } from '@workspace/ui/components/button'
import { Spinner } from '@workspace/ui/components/spinner'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@workspace/ui/components/tabs'
import { Textarea } from '@workspace/ui/components/textarea'
import { Tooltip, TooltipContent, TooltipTrigger } from '@workspace/ui/components/tooltip'
import { cn } from '@workspace/ui/lib/utils'

/** Scroll/surface styling for Markdown preview areas (edit tabs + presentation mode). */
export type MarkdownPreviewSurfaceVariant = 'embedded' | 'fullscreen' | 'fill'

export function markdownPreviewSurfaceClass(variant: MarkdownPreviewSurfaceVariant): string {
  return cn(
    'scrollbar-thumb-only overflow-y-auto rounded-md border border-border/60 bg-muted/30 p-3',
    variant === 'embedded' && 'max-h-[min(50vh,28rem)]',
    (variant === 'fullscreen' || variant === 'fill') && 'min-h-0 flex-1',
  )
}

export type MarkdownPresentationLayout = 'embedded' | 'fill'

export type MarkdownEditFieldPresentationProps = {
  presentationOnly: true
  id: string
  value: string
  previewEmptyLabel: string
  /** `fill` uses available height (e.g. side panel); `embedded` matches in-card preview max height. */
  presentationLayout?: MarkdownPresentationLayout
  /** Optional id of a heading/label element (`aria-labelledby`). */
  ariaLabelledBy?: string
}

export type MarkdownEditFieldEditProps = {
  presentationOnly?: false
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
  /** When true, shows expand control and allows filling the milestones pane (requires PanelFullscreenProvider). */
  enablePanelFullscreen?: boolean
  /** Optional title shown in the fullscreen header (e.g. field label). */
  fullscreenHeaderTitle?: string
  /**
   * `fill` makes preview/edit tabs use the container height (side panels).
   * Default `embedded` caps preview height for compact in-card layouts.
   */
  embeddedHeight?: 'default' | 'fill'
}

export type MarkdownEditFieldProps = MarkdownEditFieldPresentationProps | MarkdownEditFieldEditProps

type MarkdownEditTabsPaneProps = {
  layout: 'embedded' | 'fullscreen' | 'fill'
  innerTab: string
  onInnerTabChange: (next: string) => void
  commitBlur: () => void
  id: string
  value: string
  onChange: (v: string) => void
  disabled: boolean
  placeholder?: string
  previewTabLabel: string
  editTabLabel: string
  previewEmptyLabel: string
  textareaClassName: string
  formatError: string | null
  formatting: boolean
  onFormatClick: () => void
  formatButtonLabel: string
  formatFormattingLabel: string
  /** Shown after the format control on the same row as the tab triggers (e.g. expand). */
  headerTrailing?: ReactNode
}

function MarkdownPresentationPane({
  id,
  value,
  previewEmptyLabel,
  presentationLayout = 'embedded',
  ariaLabelledBy,
}: {
  id: string
  value: string
  previewEmptyLabel: string
  presentationLayout?: MarkdownPresentationLayout
  ariaLabelledBy?: string
}) {
  const surfaceVariant: MarkdownPreviewSurfaceVariant =
    presentationLayout === 'fill' ? 'fill' : 'embedded'

  return (
    <div
      aria-labelledby={ariaLabelledBy}
      className="flex min-h-0 flex-1 flex-col"
      id={id}
      role="region"
    >
      {value.trim() ? (
        <div className={markdownPreviewSurfaceClass(surfaceVariant)}>
          <MarkdownMessage content={value} />
        </div>
      ) : (
        <p className="text-muted-foreground text-sm">{previewEmptyLabel}</p>
      )}
    </div>
  )
}

function MarkdownEditTabsPane({
  layout,
  innerTab,
  onInnerTabChange,
  commitBlur,
  id,
  value,
  onChange,
  disabled,
  placeholder,
  previewTabLabel,
  editTabLabel,
  previewEmptyLabel,
  textareaClassName,
  formatError,
  formatting,
  onFormatClick,
  formatButtonLabel,
  formatFormattingLabel,
  headerTrailing,
}: MarkdownEditTabsPaneProps) {
  const textareaId = layout === 'fullscreen' ? `${id}-fullscreen` : id
  const stretchHeight = layout === 'fullscreen' || layout === 'fill'
  const tabsClass = stretchHeight ? 'flex min-h-0 flex-1 flex-col gap-3' : 'gap-3'
  const previewSurfaceVariant: MarkdownPreviewSurfaceVariant =
    layout === 'fullscreen' ? 'fullscreen' : layout === 'fill' ? 'fill' : 'embedded'
  const previewScrollClass = markdownPreviewSurfaceClass(previewSurfaceVariant)
  const textareaClass = stretchHeight
    ? cn('scrollbar-thumb-only min-h-0 flex-1 resize-y overflow-y-auto', textareaClassName)
    : cn('scrollbar-thumb-only max-h-[min(50vh,28rem)] min-h-0 overflow-y-auto', textareaClassName)
  const editContentClass = stretchHeight
    ? 'mt-0 flex min-h-0 flex-1 flex-col gap-2'
    : 'mt-0 flex flex-col gap-2'

  return (
    <Tabs
      className={tabsClass}
      onValueChange={(next) => {
        if (innerTab === 'edit' && next !== 'edit') {
          commitBlur()
        }
        onInnerTabChange(next)
      }}
      value={innerTab}
    >
      <div
        className="flex min-w-0 flex-wrap items-center justify-between gap-2"
        onClick={(e) => e.stopPropagation()}
        onPointerDown={(e) => e.stopPropagation()}
      >
        <TabsList className="w-fit max-w-full" variant="line">
          <TabsTrigger value="preview">{previewTabLabel}</TabsTrigger>
          <TabsTrigger value="edit">{editTabLabel}</TabsTrigger>
        </TabsList>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          {innerTab === 'edit' ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  aria-label={formatButtonLabel}
                  className="gap-1.5"
                  disabled={disabled || formatting}
                  onClick={(e) => {
                    e.stopPropagation()
                    void onFormatClick()
                  }}
                  onPointerDown={(e) => e.stopPropagation()}
                  size="sm"
                  type="button"
                  variant="secondary"
                >
                  {formatting ? (
                    <>
                      <Spinner className="size-4" />
                      {formatFormattingLabel}
                    </>
                  ) : (
                    <>
                      <WandSparkles aria-hidden />
                      {formatButtonLabel}
                    </>
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">{formatButtonLabel}</TooltipContent>
            </Tooltip>
          ) : null}
          {headerTrailing}
        </div>
      </div>
      <TabsContent
        className={stretchHeight ? 'mt-0 flex min-h-0 flex-1 flex-col' : 'mt-0'}
        value="preview"
      >
        {value.trim() ? (
          <div className={previewScrollClass}>
            <MarkdownMessage content={value} />
          </div>
        ) : (
          <p className="text-muted-foreground text-sm">{previewEmptyLabel}</p>
        )}
      </TabsContent>
      <TabsContent className={editContentClass} value="edit">
        {formatError ? (
          <p className="text-destructive text-sm" role="alert">
            {formatError}
          </p>
        ) : null}
        <Textarea
          className={textareaClass}
          disabled={disabled}
          id={textareaId}
          onChange={(e) => onChange(e.target.value)}
          onBlur={commitBlur}
          onClick={(e) => e.stopPropagation()}
          onPointerDown={(e) => e.stopPropagation()}
          placeholder={placeholder}
          value={value}
        />
      </TabsContent>
    </Tabs>
  )
}

type FullscreenMarkdownShellProps = {
  title?: string
  regionAriaLabel: string
  closeLabel: string
  onClose: () => void
  children: ReactNode
}

function FullscreenMarkdownShell({
  title,
  regionAriaLabel,
  closeLabel,
  onClose,
  children,
}: FullscreenMarkdownShellProps) {
  return (
    <div
      aria-label={regionAriaLabel}
      className="flex min-h-0 flex-1 flex-col bg-background"
      role="region"
    >
      <div className="flex shrink-0 items-center justify-between gap-2 border-border/60 border-b px-3 py-2">
        {title ? (
          <span className="min-w-0 flex-1 truncate font-medium text-foreground text-sm">
            {title}
          </span>
        ) : (
          <span className="min-w-0 flex-1" />
        )}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              aria-label={closeLabel}
              autoFocus
              onClick={(e) => {
                e.stopPropagation()
                onClose()
              }}
              onPointerDown={(e) => e.stopPropagation()}
              size="icon"
              type="button"
              variant="ghost"
            >
              <X aria-hidden />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">{closeLabel}</TooltipContent>
        </Tooltip>
      </div>
      <div className="flex min-h-0 flex-1 flex-col p-3">{children}</div>
    </div>
  )
}

function MarkdownEditFieldEditor({
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
  enablePanelFullscreen = false,
  fullscreenHeaderTitle,
  embeddedHeight = 'default',
}: MarkdownEditFieldEditProps) {
  const t = useTranslations('analytics.campaigns.chat')
  const panelCtx = useContext(PanelFullscreenContext)
  const expandButtonRef = useRef<HTMLButtonElement>(null)
  const panelCtxRef = useRef(panelCtx)
  panelCtxRef.current = panelCtx

  const [formatting, setFormatting] = useState(false)
  const [formatError, setFormatError] = useState<string | null>(null)
  /** Preview vs Edit — controlled so we can persist when leaving Edit without relying on textarea blur (Radix may hide content before blur). */
  const [innerTab, setInnerTab] = useState('preview')
  const [isPanelFullscreen, setIsPanelFullscreen] = useState(false)

  const onBlurRef = useRef(onBlur)
  onBlurRef.current = onBlur
  const blurLock = useRef(false)

  const commitBlur = useCallback(() => {
    if (!onBlurRef.current) return
    if (blurLock.current) return
    blurLock.current = true
    queueMicrotask(() => {
      blurLock.current = false
    })
    onBlurRef.current()
  }, [])

  useEffect(() => {
    return () => {
      onBlurRef.current?.()
    }
  }, [])

  useEffect(() => {
    return () => {
      if (enablePanelFullscreen) {
        panelCtxRef.current?.clearContent()
      }
    }
  }, [enablePanelFullscreen])

  const handleFormat = useCallback(async () => {
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
  }, [formatPreset, onChange, t, value])

  const closePanelFullscreen = useCallback(() => {
    panelCtx?.clearContent()
    setIsPanelFullscreen(false)
    requestAnimationFrame(() => {
      expandButtonRef.current?.focus()
    })
  }, [panelCtx])

  const showExpandControl = Boolean(enablePanelFullscreen && panelCtx)

  useEffect(() => {
    if (!isPanelFullscreen || !panelCtx) {
      return
    }
    panelCtx.setContent(
      <FullscreenMarkdownShell
        closeLabel={t('milestoneDataCloseFullscreen')}
        regionAriaLabel={fullscreenHeaderTitle ?? t('milestoneDataLabel')}
        title={fullscreenHeaderTitle}
        onClose={closePanelFullscreen}
      >
        <MarkdownEditTabsPane
          commitBlur={commitBlur}
          formatButtonLabel={t('formatMarkdownButton')}
          formatError={formatError}
          formatFormattingLabel={t('formatMarkdownFormatting')}
          formatting={formatting}
          id={id}
          innerTab={innerTab}
          layout="fullscreen"
          onChange={onChange}
          onFormatClick={handleFormat}
          onInnerTabChange={setInnerTab}
          disabled={disabled}
          editTabLabel={editTabLabel}
          placeholder={placeholder}
          previewEmptyLabel={previewEmptyLabel}
          previewTabLabel={previewTabLabel}
          textareaClassName={textareaClassName}
          value={value}
        />
      </FullscreenMarkdownShell>,
    )
  }, [
    closePanelFullscreen,
    commitBlur,
    disabled,
    editTabLabel,
    formatError,
    formatting,
    fullscreenHeaderTitle,
    handleFormat,
    id,
    innerTab,
    isPanelFullscreen,
    onChange,
    panelCtx,
    placeholder,
    previewEmptyLabel,
    previewTabLabel,
    t,
    textareaClassName,
    value,
  ])

  const expandHeaderTrailing = showExpandControl ? (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          ref={expandButtonRef}
          aria-label={t('milestoneDataFullscreen')}
          disabled={disabled}
          onClick={(e) => {
            e.stopPropagation()
            setIsPanelFullscreen(true)
          }}
          onPointerDown={(e) => e.stopPropagation()}
          size="icon"
          type="button"
          variant="ghost"
        >
          <Maximize2 aria-hidden />
        </Button>
      </TooltipTrigger>
      <TooltipContent side="bottom">{t('milestoneDataFullscreen')}</TooltipContent>
    </Tooltip>
  ) : null

  if (isPanelFullscreen) {
    return <div aria-hidden className="min-h-px" />
  }

  const tabsLayout = embeddedHeight === 'fill' ? 'fill' : 'embedded'

  return (
    <div
      className={
        embeddedHeight === 'fill' ? 'flex min-h-0 flex-1 flex-col gap-3' : 'flex flex-col gap-3'
      }
    >
      <MarkdownEditTabsPane
        commitBlur={commitBlur}
        formatButtonLabel={t('formatMarkdownButton')}
        formatError={formatError}
        formatFormattingLabel={t('formatMarkdownFormatting')}
        formatting={formatting}
        headerTrailing={expandHeaderTrailing}
        id={id}
        innerTab={innerTab}
        layout={tabsLayout}
        onChange={onChange}
        onFormatClick={handleFormat}
        onInnerTabChange={setInnerTab}
        disabled={disabled}
        editTabLabel={editTabLabel}
        placeholder={placeholder}
        previewEmptyLabel={previewEmptyLabel}
        previewTabLabel={previewTabLabel}
        textareaClassName={textareaClassName}
        value={value}
      />
    </div>
  )
}

export function MarkdownEditField(props: MarkdownEditFieldProps) {
  if (props.presentationOnly === true) {
    return (
      <MarkdownPresentationPane
        ariaLabelledBy={props.ariaLabelledBy}
        id={props.id}
        presentationLayout={props.presentationLayout}
        previewEmptyLabel={props.previewEmptyLabel}
        value={props.value}
      />
    )
  }
  return <MarkdownEditFieldEditor {...props} />
}
