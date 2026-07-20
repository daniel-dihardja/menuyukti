'use client'

import { Loader2, Plus, Sparkles } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
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

import { mediaDownloadHref } from '@/lib/media/client-api'
import {
  getLeonardoPostModelMessageKey,
  isLeonardoPostModelId,
  LEONARDO_POST_MODEL_IDS,
} from '@/lib/posts/leonardo-post-models'
import { routes } from '@/lib/routes'
import { listStyles, type Style } from '@/lib/styles/client-api'

import { usePostCreator } from '../_context/use-post-creator'
import { PostCreatorFormatControls } from './post-creator-format-controls'
import { PostCreatorImagePicker } from './post-creator-image-picker'
import { PostCreatorReferenceThumbnails } from './post-creator-reference-thumbnails'
import { PostCreatorTemplatePicker } from './post-creator-template-picker'

const STYLE_NONE = '__none__'

export function PostCreatorPromptPane() {
  const t = useTranslations('postCreator.prompt')
  const pathname = usePathname()
  const { state, actions, meta } = usePostCreator()
  const {
    prompt,
    isGenerating,
    templateImage,
    referenceImages,
    generationModel,
    previewSource,
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
    setStyleId,
  } = actions
  const { generationReferenceSummary } = meta

  const promptId = useId()
  const templateFieldId = useId()
  const modelFieldId = useId()
  const styleFieldId = useId()
  const modelBlurbId = `${modelFieldId}-blurb`
  const disabled = isGenerating
  const canSubmit = prompt.trim().length > 0 && !isGenerating
  const selectedNames = useMemo(
    () => new Set(referenceImages.map((image) => image.name)),
    [referenceImages],
  )
  const templateActiveForGeneration = previewSource === 'template' && templateImage != null

  const [styles, setStyles] = useState<Style[]>([])
  const [stylesLoading, setStylesLoading] = useState(false)

  useEffect(() => {
    let cancelled = false
    async function loadStyles() {
      setStylesLoading(true)
      try {
        const list = await listStyles()
        if (cancelled) return
        setStyles(list)
        const fromQuery = Number(new URLSearchParams(window.location.search).get('styleId'))
        if (Number.isInteger(fromQuery) && fromQuery > 0 && list.some((s) => s.id === fromQuery)) {
          setStyleId(fromQuery)
        } else if (styleId == null) {
          const defaultStyle = list.find((style) => style.isDefault)
          if (defaultStyle) {
            setStyleId(defaultStyle.id)
          }
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
    // eslint-disable-next-line react-hooks/exhaustive-deps -- load once on mount; apply default or ?styleId=
  }, [setStyleId, t])

  const selectedStyle = styles.find((style) => style.id === styleId) ?? null
  const createStyleHref = `${routes.igStudioStyleNew}?returnTo=${encodeURIComponent(pathname || routes.igStudioPostCreator)}`

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
            disabled={disabled || stylesLoading}
          >
            <SelectTrigger id={styleFieldId} className="w-full" aria-label={t('style.label')}>
              {selectedStyle ? (
                <span className="flex min-w-0 items-center gap-2">
                  {/* eslint-disable-next-line @next/next/no-img-element -- media download URLs */}
                  <img
                    src={mediaDownloadHref(selectedStyle.referenceImageName)}
                    alt=""
                    className="size-6 shrink-0 rounded object-cover"
                  />
                  <span className="truncate">
                    {selectedStyle.isDefault
                      ? `${selectedStyle.name} (${t('style.defaultSuffix')})`
                      : selectedStyle.name}
                  </span>
                </span>
              ) : (
                <SelectValue placeholder={t('style.placeholder')} />
              )}
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={STYLE_NONE}>{t('style.none')}</SelectItem>
              {styles.map((style) => (
                <SelectItem key={style.id} value={String(style.id)}>
                  <span className="flex items-center gap-2">
                    {/* eslint-disable-next-line @next/next/no-img-element -- media download URLs */}
                    <img
                      src={mediaDownloadHref(style.referenceImageName)}
                      alt=""
                      className="size-6 shrink-0 rounded object-cover"
                    />
                    <span>
                      {style.isDefault ? `${style.name} (${t('style.defaultSuffix')})` : style.name}
                    </span>
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <FieldDescription>{t('style.description')}</FieldDescription>
          <div className="flex flex-wrap gap-2 pt-0.5">
            <Button asChild type="button" variant="outline" size="sm" disabled={disabled}>
              <Link href={createStyleHref}>
                <Plus className="size-3.5" aria-hidden />
                {t('style.create')}
              </Link>
            </Button>
            <Button asChild type="button" variant="ghost" size="sm" disabled={disabled}>
              <Link href={routes.igStudioStyles}>{t('style.manage')}</Link>
            </Button>
          </div>
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
