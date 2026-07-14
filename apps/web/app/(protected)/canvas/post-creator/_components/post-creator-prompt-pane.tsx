'use client'

import { Loader2, Sparkles } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useId, useMemo } from 'react'
import { toast } from 'sonner'

import { Alert, AlertDescription, AlertTitle } from '@workspace/ui/components/alert'
import { Button } from '@workspace/ui/components/button'
import { Field, FieldLabel } from '@workspace/ui/components/field'
import { Textarea } from '@workspace/ui/components/textarea'

import { PostCreatorImagePicker } from './post-creator-image-picker'
import { PostCreatorReferenceThumbnails } from './post-creator-reference-thumbnails'
import type { PostCreatorReferenceImage } from './post-creator-thumbnails-pane'

export type PostCreatorPromptPaneProps = {
  prompt: string
  onPromptChange: (value: string) => void
  onSubmit: () => void
  isGenerating: boolean
  disabled?: boolean
  referenceImages: PostCreatorReferenceImage[]
  onAddReference: (photo: PostCreatorReferenceImage) => void
  onRemoveReference: (name: string) => void
}

export function PostCreatorPromptPane({
  prompt,
  onPromptChange,
  onSubmit,
  isGenerating,
  disabled = false,
  referenceImages,
  onAddReference,
  onRemoveReference,
}: PostCreatorPromptPaneProps) {
  const t = useTranslations('postCreator.prompt')
  const promptId = useId()
  const canSubmit = prompt.trim().length > 0 && !isGenerating && !disabled
  const selectedNames = useMemo(
    () => new Set(referenceImages.map((image) => image.name)),
    [referenceImages],
  )

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
          onRemove={onRemoveReference}
          removeLabel={t('references.remove')}
        />
        <Alert>
          <AlertTitle>{t('tip.title')}</AlertTitle>
          <AlertDescription>{t('tip.description')}</AlertDescription>
        </Alert>
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
