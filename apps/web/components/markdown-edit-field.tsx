'use client'

import { useTranslations } from 'next-intl'
import { Maximize2, WandSparkles, X } from 'lucide-react'
import {
  createContext,
  type ReactNode,
  type RefObject,
  use,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'

import {
  FieldSaveStatus,
  type FieldSaveStatusProps,
  type FieldSaveStatusVariant,
} from '@/components/field-save-status'
import { MarkdownMessage } from '@/components/markdown-message'
import { usePanelFullscreen } from '@/components/panel-fullscreen-context'
import { useDesktopLayout } from '@/hooks/use-desktop-layout'
import { useUnsavedChangesGuard } from '@/hooks/use-unsaved-changes-guard'
import type { MarkdownFormatPreset } from '@/lib/markdown-format-presets'
import { Alert, AlertDescription } from '@workspace/ui/components/alert'
import { Button } from '@workspace/ui/components/button'
import { Spinner } from '@workspace/ui/components/spinner'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@workspace/ui/components/tabs'
import { Textarea } from '@workspace/ui/components/textarea'
import { Tooltip, TooltipContent, TooltipTrigger } from '@workspace/ui/components/tooltip'
import { cn } from '@workspace/ui/lib/utils'

export type MarkdownEditFieldManualSave = {
  onSave: () => void
  status: FieldSaveStatusVariant
  messages: FieldSaveStatusProps['messages']
}

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

export type MarkdownPresentationFieldProps = {
  id: string
  value: string
  previewEmptyLabel: string
  /** `fill` uses available height (e.g. side panel); `embedded` matches in-card preview max height. */
  layout?: MarkdownPresentationLayout
  /** Optional id of a heading/label element (`aria-labelledby`). */
  ariaLabelledBy?: string
}

export type MarkdownEditFieldProps = {
  id: string
  value: string
  onChange: (value: string) => void
  disabled?: boolean
  placeholder?: string
  formatPreset: MarkdownFormatPreset
  previewTabLabel: string
  editTabLabel: string
  previewEmptyLabel: string
  textareaClassName?: string
  /**
   * `fill` makes preview/edit tabs use the container height (side panels).
   * Default `embedded` caps preview height for compact in-card layouts.
   */
  layout?: 'embedded' | 'fill'
  /** Optional slot after the format control (e.g. `MarkdownFullscreenExpandControl`). */
  headerTrailing?: ReactNode
  /** Save button + status row below the editor; omit for fields without persistence. */
  manualSave?: MarkdownEditFieldManualSave
}

type MarkdownEditTabsPaneProps = {
  layout: 'embedded' | 'fullscreen' | 'fill'
  innerTab: string
  onInnerTabChange: (next: string) => void
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

type MarkdownEditFullscreenContextValue = {
  disabled: boolean
  expandButtonRef: RefObject<HTMLButtonElement | null>
  isPanelFullscreen: boolean
  openFullscreen: (title?: string) => void
  closeFullscreen: () => void
}

const MarkdownEditFullscreenContext = createContext<MarkdownEditFullscreenContextValue | null>(null)

function useMarkdownEditFullscreen(): MarkdownEditFullscreenContextValue {
  const value = use(MarkdownEditFullscreenContext)
  if (!value) {
    throw new Error('MarkdownFullscreenExpandControl must be used within MarkdownEditField')
  }
  return value
}

export function MarkdownPresentationField({
  id,
  value,
  previewEmptyLabel,
  layout = 'embedded',
  ariaLabelledBy,
}: MarkdownPresentationFieldProps) {
  const surfaceVariant: MarkdownPreviewSurfaceVariant = layout === 'fill' ? 'fill' : 'embedded'

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
    <Tabs className={tabsClass} onValueChange={onInnerTabChange} value={innerTab}>
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
                      <Spinner aria-hidden data-icon="inline-start" />
                      {formatFormattingLabel}
                    </>
                  ) : (
                    <>
                      <WandSparkles aria-hidden data-icon="inline-start" />
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
          <Alert variant="destructive">
            <AlertDescription>{formatError}</AlertDescription>
          </Alert>
        ) : null}
        <Textarea
          className={textareaClass}
          disabled={disabled}
          id={textareaId}
          onChange={(e) => onChange(e.target.value)}
          onClick={(e) => e.stopPropagation()}
          onPointerDown={(e) => e.stopPropagation()}
          placeholder={placeholder}
          value={value}
        />
      </TabsContent>
    </Tabs>
  )
}

function MarkdownManualSaveFooter({
  disabled,
  manualSave,
  saveButtonLabel,
}: {
  disabled: boolean
  manualSave: MarkdownEditFieldManualSave
  saveButtonLabel: string
}) {
  const isSaved = manualSave.status === 'saved'
  const isSaving = manualSave.status === 'saving'
  const saveDisabled = disabled || isSaving

  if (isSaved) {
    return (
      <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
        <FieldSaveStatus
          className="inline-flex"
          messages={manualSave.messages}
          status={manualSave.status}
        />
      </div>
    )
  }

  return (
    <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
      <Button
        disabled={saveDisabled}
        onClick={(e) => {
          e.stopPropagation()
          manualSave.onSave()
        }}
        onPointerDown={(e) => e.stopPropagation()}
        size="sm"
        type="button"
      >
        {saveButtonLabel}
      </Button>
      {isSaving ? (
        <FieldSaveStatus
          className="inline-flex"
          messages={manualSave.messages}
          status={manualSave.status}
        />
      ) : null}
    </div>
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
  const isDesktop = useDesktopLayout()

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
              autoFocus={isDesktop}
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

/**
 * Expand control for `MarkdownEditField` headerTrailing.
 * Requires a parent `PanelFullscreenProvider` and must be rendered inside `MarkdownEditField`.
 */
export function MarkdownFullscreenExpandControl({
  title,
  disabled: disabledProp,
}: {
  title?: string
  disabled?: boolean
}) {
  const t = useTranslations('analytics.workflows.chat')
  const panelCtx = usePanelFullscreen()
  const { disabled: fieldDisabled, expandButtonRef, openFullscreen } = useMarkdownEditFullscreen()

  if (!panelCtx) return null

  const disabled = disabledProp ?? fieldDisabled

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          ref={expandButtonRef}
          aria-label={t('milestoneDataFullscreen')}
          disabled={disabled}
          onClick={(e) => {
            e.stopPropagation()
            openFullscreen(title)
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
  )
}

export function MarkdownEditField({
  id,
  value,
  onChange,
  disabled = false,
  placeholder,
  formatPreset,
  previewTabLabel,
  editTabLabel,
  previewEmptyLabel,
  textareaClassName = 'min-h-[200px] resize-y whitespace-pre-wrap',
  layout = 'embedded',
  headerTrailing,
  manualSave,
}: MarkdownEditFieldProps) {
  const t = useTranslations('analytics.workflows.chat')
  const panelCtx = usePanelFullscreen()
  const expandButtonRef = useRef<HTMLButtonElement>(null)
  const panelCtxRef = useRef(panelCtx)
  panelCtxRef.current = panelCtx
  useUnsavedChangesGuard(Boolean(manualSave?.status === 'unsaved'))

  const [formatting, setFormatting] = useState(false)
  const [formatError, setFormatError] = useState<string | null>(null)
  /** Preview vs Edit — controlled so switching tabs does not depend on textarea blur order (Radix may hide content before blur). */
  const [innerTab, setInnerTab] = useState('preview')
  const [ownsFullscreen, setOwnsFullscreen] = useState(false)
  const [fullscreenTitle, setFullscreenTitle] = useState<string | undefined>(undefined)
  const ownsFullscreenRef = useRef(false)
  ownsFullscreenRef.current = ownsFullscreen
  const isPanelFullscreen = Boolean(panelCtx?.isOpen && ownsFullscreen)

  useEffect(() => {
    return () => {
      if (ownsFullscreenRef.current) {
        panelCtxRef.current?.clearContent()
      }
    }
  }, [])

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

  const closeFullscreen = useCallback(() => {
    setOwnsFullscreen(false)
    setFullscreenTitle(undefined)
    panelCtx?.clearContent()
    requestAnimationFrame(() => {
      expandButtonRef.current?.focus()
    })
  }, [panelCtx])

  const renderPanelFullscreenContent = useCallback(
    (title?: string) => (
      <FullscreenMarkdownShell
        closeLabel={t('milestoneDataCloseFullscreen')}
        regionAriaLabel={title ?? t('milestoneDataLabel')}
        title={title}
        onClose={closeFullscreen}
      >
        <div className="flex min-h-0 flex-1 flex-col gap-3">
          <MarkdownEditTabsPane
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
          {manualSave ? (
            <MarkdownManualSaveFooter
              disabled={disabled}
              manualSave={manualSave}
              saveButtonLabel={t('fieldSaveButton')}
            />
          ) : null}
        </div>
      </FullscreenMarkdownShell>
    ),
    [
      closeFullscreen,
      disabled,
      editTabLabel,
      formatError,
      formatting,
      handleFormat,
      id,
      innerTab,
      manualSave,
      onChange,
      placeholder,
      previewEmptyLabel,
      previewTabLabel,
      t,
      textareaClassName,
      value,
    ],
  )

  const openFullscreen = useCallback(
    (title?: string) => {
      if (!panelCtx) return
      setOwnsFullscreen(true)
      setFullscreenTitle(title)
      panelCtx.setContent(renderPanelFullscreenContent(title))
    },
    [panelCtx, renderPanelFullscreenContent],
  )

  useEffect(() => {
    if (!ownsFullscreen || !panelCtx?.isOpen) {
      return
    }
    panelCtx.setContent(renderPanelFullscreenContent(fullscreenTitle))
  }, [fullscreenTitle, ownsFullscreen, panelCtx, renderPanelFullscreenContent])

  // When panel is cleared externally, drop ownership so the inline editor returns.
  useEffect(() => {
    if (!panelCtx?.isOpen && ownsFullscreen) {
      setOwnsFullscreen(false)
      setFullscreenTitle(undefined)
    }
  }, [ownsFullscreen, panelCtx?.isOpen])

  const fullscreenContextValue = useMemo<MarkdownEditFullscreenContextValue>(
    () => ({
      disabled,
      expandButtonRef,
      isPanelFullscreen,
      openFullscreen,
      closeFullscreen,
    }),
    [closeFullscreen, disabled, isPanelFullscreen, openFullscreen],
  )

  const body = isPanelFullscreen ? (
    <div aria-hidden className="min-h-px" />
  ) : (
    <div
      className={layout === 'fill' ? 'flex min-h-0 flex-1 flex-col gap-3' : 'flex flex-col gap-3'}
    >
      <MarkdownEditTabsPane
        formatButtonLabel={t('formatMarkdownButton')}
        formatError={formatError}
        formatFormattingLabel={t('formatMarkdownFormatting')}
        formatting={formatting}
        headerTrailing={headerTrailing}
        id={id}
        innerTab={innerTab}
        layout={layout}
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
      {manualSave ? (
        <MarkdownManualSaveFooter
          disabled={disabled}
          manualSave={manualSave}
          saveButtonLabel={t('fieldSaveButton')}
        />
      ) : null}
    </div>
  )

  return (
    <MarkdownEditFullscreenContext value={fullscreenContextValue}>
      {body}
    </MarkdownEditFullscreenContext>
  )
}
