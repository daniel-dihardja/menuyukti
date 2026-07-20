'use client'

import { useId } from 'react'
import { useTranslations } from 'next-intl'

import { buttonVariants } from '@workspace/ui/components/button'
import { Field, FieldDescription, FieldLabel } from '@workspace/ui/components/field'
import { ToggleGroup, ToggleGroupItem } from '@workspace/ui/components/toggle-group'
import { cn } from '@workspace/ui/lib/utils'

import {
  formatAspectCss,
  isQualityAvailable,
  POST_IMAGE_EXPLICIT_FORMAT_IDS,
  POST_IMAGE_QUALITY_COST_MULTIPLIER,
  POST_IMAGE_QUALITY_IDS,
  resolveLeonardoOutputDimensions,
  type PostImageExplicitFormatId,
  type PostImageFormatId,
  type PostImageQualityId,
} from '@/lib/posts/leonardo-post-dimensions'
import type { LeonardoPostModelId } from '@/lib/posts/leonardo-post-models'

type PostCreatorFormatControlsProps = {
  disabled?: boolean
  generationModel: LeonardoPostModelId
  imageFormat: PostImageFormatId
  imageQuality: PostImageQualityId
  hasTemplate: boolean
  onFormatChange: (format: PostImageFormatId) => void
  onQualityChange: (quality: PostImageQualityId) => void
}

/** Secondary-button look for option chips; selected uses secondary fill + ring. */
const optionChipClassName = cn(
  buttonVariants({ variant: 'secondary', size: 'sm' }),
  'h-auto shadow-none hover:translate-y-0',
  'border border-transparent',
  'data-[state=off]:border-border data-[state=off]:bg-transparent data-[state=off]:text-foreground data-[state=off]:hover:bg-secondary/50',
  'data-[state=on]:bg-secondary data-[state=on]:text-secondary-foreground data-[state=on]:ring-2 data-[state=on]:ring-ring/40',
)

function FormatPreviewFrame({ format }: { format: PostImageExplicitFormatId | 'match-layout' }) {
  const aspect = formatAspectCss(format === 'match-layout' ? 'feed' : format)
  return (
    <span
      aria-hidden
      className="mb-1 block h-5 w-auto max-w-6 rounded-[2px] border border-current/50 bg-current/10"
      style={{ aspectRatio: aspect }}
    />
  )
}

export function PostCreatorFormatControls({
  disabled = false,
  generationModel,
  imageFormat,
  imageQuality,
  hasTemplate,
  onFormatChange,
  onQualityChange,
}: PostCreatorFormatControlsProps) {
  const t = useTranslations('postCreator.prompt')
  const formatFieldId = useId()
  const qualityFieldId = useId()
  const dimsHintId = `${qualityFieldId}-dims`

  const resolved = resolveLeonardoOutputDimensions({
    model: generationModel,
    format: imageFormat,
    quality: imageQuality,
  })
  const costMultiplier = POST_IMAGE_QUALITY_COST_MULTIPLIER[imageQuality]
  const showMatchWarning = hasTemplate && imageFormat !== 'match-layout'

  const formatOptions: PostImageFormatId[] = hasTemplate
    ? ['match-layout', ...POST_IMAGE_EXPLICIT_FORMAT_IDS]
    : [...POST_IMAGE_EXPLICIT_FORMAT_IDS]

  return (
    <div className="flex flex-col gap-3">
      <Field className="gap-1.5">
        <FieldLabel htmlFor={formatFieldId}>{t('format.label')}</FieldLabel>
        <ToggleGroup
          id={formatFieldId}
          type="single"
          value={imageFormat}
          onValueChange={(value) => {
            if (!value) return
            onFormatChange(value as PostImageFormatId)
          }}
          disabled={disabled}
          className="gap-1.5"
          aria-label={t('format.label')}
        >
          {formatOptions.map((formatId) => {
            const name = t(`format.options.${formatId}.name`)
            const ratio = t(`format.options.${formatId}.ratio`)
            return (
              <ToggleGroupItem
                key={formatId}
                value={formatId}
                className={cn(
                  optionChipClassName,
                  'min-h-0 flex-col gap-0.5 rounded-sm px-2 py-1.5 text-xs font-medium',
                  formatId === 'match-layout' && 'min-w-[4.5rem]',
                )}
                aria-label={`${name} ${ratio}`}
              >
                <FormatPreviewFrame
                  format={formatId === 'match-layout' ? 'match-layout' : formatId}
                />
                <span className="leading-tight">{name}</span>
                <span className="text-[10px] leading-none opacity-70">{ratio}</span>
              </ToggleGroupItem>
            )
          })}
        </ToggleGroup>
        <FieldDescription>{t('format.description')}</FieldDescription>
        {showMatchWarning ? (
          <p className="text-amber-700 dark:text-amber-400 text-xs" role="status">
            {t('format.matchOverrideWarning')}
          </p>
        ) : null}
      </Field>

      <Field className="gap-1.5">
        <FieldLabel htmlFor={qualityFieldId}>{t('quality.label')}</FieldLabel>
        <ToggleGroup
          id={qualityFieldId}
          type="single"
          value={imageQuality}
          onValueChange={(value) => {
            if (!value) return
            onQualityChange(value as PostImageQualityId)
          }}
          disabled={disabled}
          className="w-full gap-1.5"
          aria-label={t('quality.label')}
          aria-describedby={dimsHintId}
        >
          {POST_IMAGE_QUALITY_IDS.map((qualityId) => {
            const available = isQualityAvailable(generationModel, qualityId)
            return (
              <ToggleGroupItem
                key={qualityId}
                value={qualityId}
                disabled={!available}
                className={cn(
                  optionChipClassName,
                  'min-h-9 flex-1 rounded-sm px-2 py-1.5 text-xs font-medium',
                )}
                aria-label={t(`quality.options.${qualityId}.name`)}
              >
                <span>{t(`quality.options.${qualityId}.name`)}</span>
              </ToggleGroupItem>
            )
          })}
        </ToggleGroup>
        <FieldDescription id={dimsHintId}>
          {t('quality.resolvedHint', {
            width: resolved.width,
            height: resolved.height,
            cost: costMultiplier,
          })}
        </FieldDescription>
      </Field>
    </div>
  )
}
