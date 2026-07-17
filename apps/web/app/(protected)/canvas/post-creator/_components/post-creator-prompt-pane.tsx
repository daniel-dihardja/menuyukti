'use client'

import { Loader2, Sparkles } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useId, useMemo } from 'react'
import { toast } from 'sonner'

import { Alert, AlertDescription, AlertTitle } from '@workspace/ui/components/alert'
import { Button } from '@workspace/ui/components/button'
import { Field, FieldDescription, FieldLabel } from '@workspace/ui/components/field'
import { Label } from '@workspace/ui/components/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@workspace/ui/components/select'
import { Switch } from '@workspace/ui/components/switch'
import { Textarea } from '@workspace/ui/components/textarea'

import {
  getLeonardoPostModelMessageKey,
  isLeonardoPostModelId,
  LEONARDO_POST_MODEL_IDS,
} from '@/lib/posts/leonardo-post-models'

import { usePostCreator } from '../_context/use-post-creator'
import { PostCreatorImagePicker } from './post-creator-image-picker'
import { PostCreatorReferenceThumbnails } from './post-creator-reference-thumbnails'
import { PostCreatorTemplatePicker } from './post-creator-template-picker'

export function PostCreatorPromptPane() {
  const t = useTranslations('postCreator.prompt')
  const { state, actions, meta } = usePostCreator()
  const {
    prompt,
    isGenerating,
    templateImage,
    referenceImages,
    usePreviousResult,
    generationModel,
  } = state
  const {
    setPrompt,
    generate,
    addReference,
    removeReference,
    toggleReferenceEnabled,
    setUsePreviousResult,
    selectTemplate,
    clearTemplate,
    setGenerationModel,
  } = actions
  const { hasPreviewableVersion, generationReferenceSummary } = meta

  const previousResultId = useId()
  const promptId = useId()
  const templateFieldId = useId()
  const modelFieldId = useId()
  const modelBlurbId = `${modelFieldId}-blurb`
  const disabled = isGenerating
  const canSubmit = prompt.trim().length > 0 && !isGenerating
  const selectedNames = useMemo(
    () => new Set(referenceImages.map((image) => image.name)),
    [referenceImages],
  )
  const previousResultDisabled = disabled || templateImage != null

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden p-4 pt-0">
      <form
        className="flex min-h-0 flex-col gap-3"
        onSubmit={(e) => {
          e.preventDefault()
          if (canSubmit) void generate()
        }}
      >
        <Field className="gap-1.5">
          <FieldLabel htmlFor={templateFieldId}>{t('template.label')}</FieldLabel>
          <PostCreatorTemplatePicker
            disabled={disabled}
            emptyLabel={t('template.empty')}
            fromMediaLabel={t('template.fromMedia')}
            pickLabel={t('template.pick')}
            pickerAriaLabel={t('template.pickerAriaLabel')}
            removeLabel={t('template.remove')}
            templateImage={templateImage}
            onClearTemplate={clearTemplate}
            onSelectTemplate={selectTemplate}
          />
        </Field>
        <Field className="gap-1.5">
          <FieldLabel htmlFor={modelFieldId}>{t('model.label')}</FieldLabel>
          <Select
            value={generationModel}
            onValueChange={(value) => {
              if (isLeonardoPostModelId(value)) {
                setGenerationModel(value)
              }
            }}
            disabled={disabled}
          >
            <SelectTrigger
              id={modelFieldId}
              className="w-full"
              aria-label={t('model.label')}
              aria-describedby={modelBlurbId}
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {LEONARDO_POST_MODEL_IDS.map((modelId) => (
                <SelectItem key={modelId} value={modelId}>
                  {t(`model.options.${getLeonardoPostModelMessageKey(modelId)}.name`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <FieldDescription id={modelBlurbId}>
            {t(`model.options.${getLeonardoPostModelMessageKey(generationModel)}.blurb`)}
          </FieldDescription>
        </Field>
        <Field className="gap-1.5">
          <FieldLabel htmlFor={promptId}>{t('label')}</FieldLabel>
          <PostCreatorImagePicker
            disabled={disabled}
            emptyLabel={t('picker.empty')}
            maxReachedLabel={t('picker.maxReached')}
            onAddReference={addReference}
            onUploadError={() => toast.error(t('picker.uploadError'))}
            onValueChange={setPrompt}
            pickerAriaLabel={t('picker.ariaLabel')}
            selectedNames={selectedNames}
            uploadLabel={t('picker.upload')}
            uploadingLabel={t('picker.uploading')}
            value={prompt}
          >
            <Textarea
              id={promptId}
              className="min-h-[160px] resize-y"
              disabled={disabled}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder={t('placeholder')}
              value={prompt}
            />
          </PostCreatorImagePicker>
        </Field>
        <PostCreatorReferenceThumbnails
          ariaLabel={t('references.ariaLabel')}
          disabled={disabled}
          images={referenceImages}
          includeLabel={t('references.include')}
          indexLabel={(index) => {
            const refIndex = templateImage ? index + 2 : index + 1
            return t('references.indexLabel', { index: refIndex })
          }}
          onRemove={removeReference}
          onToggleEnabled={toggleReferenceEnabled}
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
              onCheckedChange={setUsePreviousResult}
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
