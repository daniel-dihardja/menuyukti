'use client'

import { Loader2, Sparkles } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useId, useMemo } from 'react'
import { toast } from 'sonner'

import { Alert, AlertDescription, AlertTitle } from '@workspace/ui/components/alert'
import { Button } from '@workspace/ui/components/button'
import { Field, FieldLabel } from '@workspace/ui/components/field'
import { Label } from '@workspace/ui/components/label'
import { Switch } from '@workspace/ui/components/switch'
import { Textarea } from '@workspace/ui/components/textarea'

import { PostCreatorImagePicker } from './post-creator-image-picker'
import { PostCreatorReferenceThumbnails } from './post-creator-reference-thumbnails'
import { PostCreatorTemplatePicker } from './post-creator-template-picker'
import type { PostCreatorReferenceImage } from './post-creator-thumbnails-pane'

export type PostCreatorPromptPaneProps = {
  prompt: string
  onPromptChange: (value: string) => void
  onSubmit: () => void
  isGenerating: boolean
  disabled?: boolean
  templateImage: PostCreatorReferenceImage | null
  onSelectTemplate: (design: { name: string; url: string }) => void
  onClearTemplate: () => void
  referenceImages: PostCreatorReferenceImage[]
  onAddReference: (photo: PostCreatorReferenceImage) => void
  onRemoveReference: (name: string) => void
  onToggleReferenceEnabled: (name: string, enabled: boolean) => void
  hasPreviewableVersion: boolean
  usePreviousResult: boolean
  onUsePreviousResultChange: (value: boolean) => void
  generationReferenceSummary: string | null
}

export function PostCreatorPromptPane({
  prompt,
  onPromptChange,
  onSubmit,
  isGenerating,
  disabled = false,
  templateImage,
  onSelectTemplate,
  onClearTemplate,
  referenceImages,
  onAddReference,
  onRemoveReference,
  onToggleReferenceEnabled,
  hasPreviewableVersion,
  usePreviousResult,
  onUsePreviousResultChange,
  generationReferenceSummary,
}: PostCreatorPromptPaneProps) {
  const t = useTranslations('postCreator.prompt')
  const previousResultId = useId()
  const promptId = useId()
  const templateFieldId = useId()
  const canSubmit = prompt.trim().length > 0 && !isGenerating && !disabled
  const selectedNames = useMemo(
    () => new Set(referenceImages.map((image) => image.name)),
    [referenceImages],
  )
  const previousResultDisabled = disabled || isGenerating || templateImage != null

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden p-4 pt-0">
      <form
        className="flex min-h-0 flex-col gap-3"
        onSubmit={(e) => {
          e.preventDefault()
          if (canSubmit) onSubmit()
        }}
      >
        <Field className="gap-1.5">
          <FieldLabel htmlFor={templateFieldId}>{t('template.label')}</FieldLabel>
          <PostCreatorTemplatePicker
            disabled={disabled || isGenerating}
            emptyLabel={t('template.empty')}
            fromMediaLabel={t('template.fromMedia')}
            pickLabel={t('template.pick')}
            pickerAriaLabel={t('template.pickerAriaLabel')}
            removeLabel={t('template.remove')}
            templateImage={templateImage}
            onClearTemplate={onClearTemplate}
            onSelectTemplate={onSelectTemplate}
          />
        </Field>
        <Field className="gap-1.5">
          <FieldLabel htmlFor={promptId}>{t('label')}</FieldLabel>
          <PostCreatorImagePicker
            disabled={disabled || isGenerating}
            emptyLabel={t('picker.empty')}
            maxReachedLabel={t('picker.maxReached')}
            onAddReference={onAddReference}
            onUploadError={() => toast.error(t('picker.uploadError'))}
            onValueChange={onPromptChange}
            pickerAriaLabel={t('picker.ariaLabel')}
            selectedNames={selectedNames}
            uploadLabel={t('picker.upload')}
            uploadingLabel={t('picker.uploading')}
            value={prompt}
          >
            <Textarea
              id={promptId}
              className="min-h-[160px] resize-y"
              disabled={disabled || isGenerating}
              onChange={(e) => onPromptChange(e.target.value)}
              placeholder={t('placeholder')}
              value={prompt}
            />
          </PostCreatorImagePicker>
        </Field>
        <PostCreatorReferenceThumbnails
          ariaLabel={t('references.ariaLabel')}
          disabled={disabled || isGenerating}
          images={referenceImages}
          includeLabel={t('references.include')}
          indexLabel={(index) => {
            const refIndex = templateImage ? index + 2 : index + 1
            return t('references.indexLabel', { index: refIndex })
          }}
          onRemove={onRemoveReference}
          onToggleEnabled={onToggleReferenceEnabled}
          removeLabel={t('references.remove')}
        />
        {hasPreviewableVersion && !templateImage ? (
          <div className="flex items-start justify-between gap-3 rounded-md border border-border/60 px-3 py-2">
            <div className="space-y-1">
              <Label htmlFor={previousResultId} className="text-sm font-medium">
                {t('previousResult.label')}
              </Label>
              <p className="text-muted-foreground text-xs">{t('previousResult.description')}</p>
            </div>
            <Switch
              id={previousResultId}
              checked={usePreviousResult}
              disabled={previousResultDisabled}
              onCheckedChange={onUsePreviousResultChange}
            />
          </div>
        ) : null}
        <Alert>
          <AlertTitle>{t('tip.title')}</AlertTitle>
          <AlertDescription>{t('tip.description')}</AlertDescription>
        </Alert>
        {generationReferenceSummary ? (
          <p className="text-muted-foreground text-xs">{generationReferenceSummary}</p>
        ) : null}
        <Button className="w-full shrink-0" disabled={!canSubmit} type="submit">
          {isGenerating ? (
            <>
              <Loader2 className="animate-spin" data-icon="inline-start" />
              {t('generating')}
            </>
          ) : (
            <>
              <Sparkles data-icon="inline-start" />
              {t('generate')}
            </>
          )}
        </Button>
      </form>
    </div>
  )
}
