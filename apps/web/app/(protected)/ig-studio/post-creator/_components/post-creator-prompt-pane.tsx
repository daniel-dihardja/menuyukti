'use client'

import { Loader2, Sparkles } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useEffect, useId, useMemo, useState } from 'react'
import { toast } from 'sonner'

import { Alert, AlertDescription, AlertTitle } from '@workspace/ui/components/alert'
import { Button } from '@workspace/ui/components/button'
import { Field, FieldDescription, FieldLabel } from '@workspace/ui/components/field'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@workspace/ui/components/select'
import { Textarea } from '@workspace/ui/components/textarea'

import { apiFetch } from '@/lib/api/client-fetch'
import { listLocationStyles, type LocationStyle } from '@/lib/location-styles/client-api'
import {
  getLeonardoPostModelMessageKey,
  isLeonardoPostModelId,
  LEONARDO_POST_MODEL_IDS,
} from '@/lib/posts/leonardo-post-models'

import { usePostCreator } from '../_context/use-post-creator'
import { PostCreatorFormatControls } from './post-creator-format-controls'
import { PostCreatorImagePicker } from './post-creator-image-picker'
import { PostCreatorReferenceThumbnails } from './post-creator-reference-thumbnails'
import { PostCreatorTemplatePicker } from './post-creator-template-picker'

const STYLE_NONE = '__none__'
const LOCATION_NONE = '__none__'

type LocationOption = { id: number; name: string }

export function PostCreatorPromptPane() {
  const t = useTranslations('postCreator.prompt')
  const { state, actions, meta } = usePostCreator()
  const {
    prompt,
    isGenerating,
    templateImage,
    referenceImages,
    generationModel,
    previewSource,
    locationId,
    styleId,
    imageFormat,
    imageQuality,
  } = state
  const {
    setPrompt,
    generate,
    addReference,
    removeReference,
    toggleReferenceEnabled,
    selectTemplate,
    clearTemplate,
    setGenerationModel,
    setImageFormat,
    setImageQuality,
    setLocationId,
    setStyleId,
  } = actions
  const { generationReferenceSummary } = meta

  const promptId = useId()
  const templateFieldId = useId()
  const modelFieldId = useId()
  const locationFieldId = useId()
  const styleFieldId = useId()
  const modelBlurbId = `${modelFieldId}-blurb`
  const disabled = isGenerating
  const canSubmit = prompt.trim().length > 0 && !isGenerating
  const selectedNames = useMemo(
    () => new Set(referenceImages.map((image) => image.name)),
    [referenceImages],
  )
  const templateActiveForGeneration = previewSource === 'template' && templateImage != null

  const [locations, setLocations] = useState<LocationOption[]>([])
  const [styles, setStyles] = useState<LocationStyle[]>([])
  const [stylesLoading, setStylesLoading] = useState(false)

  useEffect(() => {
    let cancelled = false
    async function loadLocations() {
      const result = await apiFetch<{ locations?: LocationOption[] }>(
        '/api/locations',
        { cache: 'no-store' },
        'Failed to load locations',
      )
      if (cancelled) return
      if (result.ok) {
        setLocations(result.data.locations ?? [])
      } else {
        setLocations([])
      }
    }
    void loadLocations()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (locationId == null) {
      setStyles([])
      return
    }
    let cancelled = false
    async function loadStyles() {
      setStylesLoading(true)
      try {
        const list = await listLocationStyles(locationId!)
        if (cancelled) return
        setStyles(list)
        const defaultStyle = list.find((style) => style.isDefault)
        if (defaultStyle) {
          setStyleId(defaultStyle.id)
        }
      } catch {
        if (!cancelled) {
          setStyles([])
          toast.error(t('style.loadError'))
        }
      } finally {
        if (!cancelled) setStylesLoading(false)
      }
    }
    void loadStyles()
    return () => {
      cancelled = true
    }
  }, [locationId, setStyleId, t])

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
          <FieldLabel htmlFor={locationFieldId}>{t('location.label')}</FieldLabel>
          <Select
            value={locationId != null ? String(locationId) : LOCATION_NONE}
            onValueChange={(value) => {
              if (value === LOCATION_NONE) {
                setLocationId(null)
                return
              }
              const next = Number(value)
              if (Number.isInteger(next) && next > 0) {
                setLocationId(next)
              }
            }}
            disabled={disabled}
          >
            <SelectTrigger id={locationFieldId} className="w-full" aria-label={t('location.label')}>
              <SelectValue placeholder={t('location.placeholder')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={LOCATION_NONE}>{t('location.none')}</SelectItem>
              {locations.map((loc) => (
                <SelectItem key={loc.id} value={String(loc.id)}>
                  {loc.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <FieldDescription>{t('location.description')}</FieldDescription>
        </Field>
        <Field className="gap-1.5">
          <FieldLabel htmlFor={styleFieldId}>{t('style.label')}</FieldLabel>
          <Select
            value={styleId != null ? String(styleId) : STYLE_NONE}
            onValueChange={(value) => {
              if (value === STYLE_NONE) {
                setStyleId(null)
                return
              }
              const next = Number(value)
              if (Number.isInteger(next) && next > 0) {
                setStyleId(next)
              }
            }}
            disabled={disabled || locationId == null || stylesLoading}
          >
            <SelectTrigger id={styleFieldId} className="w-full" aria-label={t('style.label')}>
              <SelectValue placeholder={t('style.placeholder')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={STYLE_NONE}>{t('style.none')}</SelectItem>
              {styles.map((style) => (
                <SelectItem key={style.id} value={String(style.id)}>
                  {style.isDefault ? `${style.name} (${t('style.defaultSuffix')})` : style.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <FieldDescription>
            {locationId == null ? t('style.needsLocation') : t('style.description')}
          </FieldDescription>
        </Field>
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
        <PostCreatorFormatControls
          disabled={disabled}
          generationModel={generationModel}
          hasTemplate={templateImage != null}
          imageFormat={imageFormat}
          imageQuality={imageQuality}
          onFormatChange={setImageFormat}
          onQualityChange={setImageQuality}
        />
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
            const styleOffset = styleId != null ? 1 : 0
            const templateOffset = templateActiveForGeneration ? 1 : 0
            const refIndex = index + 1 + styleOffset + templateOffset
            return t('references.indexLabel', { index: refIndex })
          }}
          onRemove={removeReference}
          onToggleEnabled={toggleReferenceEnabled}
          removeLabel={t('references.remove')}
        />
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
