'use client'

import { ImagePlus, Loader2, PenLine } from 'lucide-react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { useId, useState } from 'react'
import { toast } from 'sonner'

import { Button } from '@workspace/ui/components/button'
import { Checkbox } from '@workspace/ui/components/checkbox'
import { Field, FieldLabel } from '@workspace/ui/components/field'
import { Input } from '@workspace/ui/components/input'
import { Textarea } from '@workspace/ui/components/textarea'

import { ChatGatewayModelSelect } from '@/components/chat-gateway-model-select'
import { MediaCatalogPicker } from '@/components/media/media-catalog-picker'
import {
  DEFAULT_VISION_GATEWAY_MODEL,
  VISION_GATEWAY_MODEL_IDS,
  isAllowedVisionGatewayModel,
  type VisionGatewayModelId,
} from '@/lib/chat/gateway-chat-models'
import { routes } from '@/lib/routes'
import { createStyle, draftStyleFromImage, updateStyle, type Style } from '@/lib/styles/client-api'
import { parseStyleSpec, rulesFromStyleSpec, type StyleSpec } from '@/lib/styles/style-spec'
import { mediaDownloadHref, type MediaCatalogItem } from '@/lib/media/client-api'
import type { PostCreatorReferenceImage } from '@/lib/posts/post-creator-types'

import { StyleSpecReadOnlyPanel } from './style-spec-panel'

type CreatePath = 'choose' | 'from-image' | 'manual'

type FormState = {
  name: string
  rules: string
  referenceImage: PostCreatorReferenceImage | null
  isDefault: boolean
  styleSpec: StyleSpec | null
  intent: string
}

const EMPTY_FORM: FormState = {
  name: '',
  rules: '',
  referenceImage: null,
  isDefault: false,
  styleSpec: null,
  intent: '',
}

function styleToForm(style: Style): FormState {
  return {
    name: style.name,
    rules: style.rules,
    referenceImage: {
      name: style.referenceImageName,
      url: mediaDownloadHref(style.referenceImageName),
      enabled: true,
    },
    isDefault: style.isDefault,
    styleSpec: parseStyleSpec(style.styleSpec),
    intent: '',
  }
}

type StyleEditorProps = { mode: 'create' } | { mode: 'edit'; style: Style }

export function StyleEditor(props: StyleEditorProps) {
  const t = useTranslations('igStudio.styles')
  const router = useRouter()
  const searchParams = useSearchParams()
  const nameId = useId()
  const rulesId = useId()
  const defaultId = useId()
  const intentId = useId()

  const [path, setPath] = useState<CreatePath>(props.mode === 'edit' ? 'manual' : 'choose')
  const [form, setForm] = useState<FormState>(
    props.mode === 'edit' ? styleToForm(props.style) : EMPTY_FORM,
  )
  const [draftModel, setDraftModel] = useState<VisionGatewayModelId>(DEFAULT_VISION_GATEWAY_MODEL)
  const [saving, setSaving] = useState(false)
  const [drafting, setDrafting] = useState(false)

  const busy = saving || drafting
  const showSpecFields = form.styleSpec != null
  const isFromImage = props.mode === 'create' && path === 'from-image'

  const handleSelectImage = (item: MediaCatalogItem) => {
    setForm((prev) => ({
      ...prev,
      referenceImage: { name: item.name, url: item.url, enabled: true },
    }))
  }

  const handleDraftFromImage = async () => {
    if (!form.referenceImage) {
      toast.error(t('toast.imageRequired'))
      return
    }
    setDrafting(true)
    try {
      const draft = await draftStyleFromImage({
        mediaName: form.referenceImage.name,
        intent: form.intent.trim() || undefined,
        model: draftModel,
      })
      setForm((prev) => ({
        ...prev,
        name: draft.name,
        styleSpec: draft.styleSpec,
        rules: rulesFromStyleSpec(draft.styleSpec),
      }))
      toast.success(t('toast.draftReady'))
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('toast.draftError'))
    } finally {
      setDrafting(false)
    }
  }

  const handleSave = async () => {
    if (!form.name.trim() || !form.referenceImage) {
      toast.error(t('toast.validation'))
      return
    }
    const hasSpec = form.styleSpec != null
    if (!hasSpec && !form.rules.trim()) {
      toast.error(t('toast.validation'))
      return
    }
    if (isFromImage && !hasSpec) {
      toast.error(t('toast.draftRequired'))
      return
    }

    setSaving(true)
    try {
      const styleSpec = form.styleSpec ?? undefined
      const rules = styleSpec ? rulesFromStyleSpec(styleSpec) : form.rules.trim()

      if (props.mode === 'edit') {
        await updateStyle(props.style.id, {
          name: form.name.trim(),
          rules,
          referenceImageName: form.referenceImage.name,
          isDefault: form.isDefault,
          ...(styleSpec != null ? { styleSpec } : {}),
        })
        toast.success(t('toast.updated'))
        router.push(routes.igStudioStyles)
        router.refresh()
        return
      }

      const created = await createStyle({
        name: form.name.trim(),
        rules,
        referenceImageName: form.referenceImage.name,
        isDefault: form.isDefault,
        ...(styleSpec != null ? { styleSpec } : {}),
      })
      toast.success(t('toast.created'))
      const returnTo = searchParams.get('returnTo')
      if (returnTo?.startsWith('/ig-studio')) {
        const sep = returnTo.includes('?') ? '&' : '?'
        router.push(`${returnTo}${sep}styleId=${created.id}`)
      } else {
        router.push(routes.igStudioStyles)
      }
      router.refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('toast.saveError'))
    } finally {
      setSaving(false)
    }
  }

  if (props.mode === 'create' && path === 'choose') {
    return (
      <div className="mx-auto grid w-full max-w-2xl gap-4 sm:grid-cols-2">
        <button
          type="button"
          onClick={() => setPath('from-image')}
          className="flex flex-col items-start gap-3 rounded-xl border border-border/60 bg-card p-5 text-left transition-colors hover:border-border hover:bg-muted/30"
        >
          <span className="flex size-10 items-center justify-center rounded-lg bg-muted">
            <ImagePlus className="size-5" aria-hidden />
          </span>
          <span className="text-base font-semibold">{t('pathFromImageTitle')}</span>
          <span className="text-muted-foreground text-sm">{t('pathFromImageDescription')}</span>
        </button>
        <button
          type="button"
          onClick={() => setPath('manual')}
          className="flex flex-col items-start gap-3 rounded-xl border border-border/60 bg-card p-5 text-left transition-colors hover:border-border hover:bg-muted/30"
        >
          <span className="flex size-10 items-center justify-center rounded-lg bg-muted">
            <PenLine className="size-5" aria-hidden />
          </span>
          <span className="text-base font-semibold">{t('pathManualTitle')}</span>
          <span className="text-muted-foreground text-sm">{t('pathManualDescription')}</span>
        </button>
      </div>
    )
  }

  return (
    <div className="mx-auto w-full max-w-xl space-y-4 rounded-xl border border-border/60 p-4 sm:p-5">
      <p className="text-sm font-medium">
        {props.mode === 'edit'
          ? t('editTitle')
          : isFromImage
            ? t('createFromImageTitle')
            : t('createTitle')}
      </p>

      <Field className="gap-1.5">
        <FieldLabel>{t('imageLabel')}</FieldLabel>
        <MediaCatalogPicker
          selectedImage={form.referenceImage}
          onSelect={handleSelectImage}
          onClear={() => setForm((prev) => ({ ...prev, referenceImage: null }))}
          disabled={busy}
          pickLabel={t('imagePick')}
          pickerAriaLabel={t('imagePickerAria')}
          emptyLabel={t('imageEmpty')}
          removeLabel={t('imageRemove')}
          fromMediaLabel={t('imageFromMedia')}
        />
      </Field>

      {isFromImage && !showSpecFields ? (
        <>
          <Field className="gap-1.5">
            <FieldLabel htmlFor={intentId}>{t('intentLabel')}</FieldLabel>
            <Textarea
              id={intentId}
              value={form.intent}
              onChange={(e) => setForm((prev) => ({ ...prev, intent: e.target.value }))}
              placeholder={t('intentPlaceholder')}
              disabled={busy}
              rows={2}
              maxLength={2000}
            />
          </Field>
          <Field className="gap-1.5">
            <FieldLabel>{t('modelLabel')}</FieldLabel>
            <ChatGatewayModelSelect
              value={draftModel}
              onValueChange={(id) => {
                if (isAllowedVisionGatewayModel(id)) setDraftModel(id)
              }}
              modelIds={VISION_GATEWAY_MODEL_IDS}
              disabled={busy}
              className="max-w-full"
            />
          </Field>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              onClick={() => void handleDraftFromImage()}
              disabled={busy || !form.referenceImage}
            >
              {drafting ? (
                <>
                  <Loader2 className="size-4 animate-spin" aria-hidden />
                  {t('drafting')}
                </>
              ) : (
                t('analyzeImage')
              )}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => setPath('choose')}
              disabled={busy}
            >
              {t('back')}
            </Button>
          </div>
        </>
      ) : null}

      {showSpecFields || !isFromImage ? (
        <>
          <Field className="gap-1.5">
            <FieldLabel htmlFor={nameId}>{t('nameLabel')}</FieldLabel>
            <Input
              id={nameId}
              value={form.name}
              onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
              placeholder={t('namePlaceholder')}
              disabled={busy}
              maxLength={128}
            />
          </Field>

          {showSpecFields && form.styleSpec ? (
            <StyleSpecReadOnlyPanel styleSpec={form.styleSpec} />
          ) : (
            <Field className="gap-1.5">
              <FieldLabel htmlFor={rulesId}>{t('rulesLabel')}</FieldLabel>
              <Textarea
                id={rulesId}
                value={form.rules}
                onChange={(e) => setForm((prev) => ({ ...prev, rules: e.target.value }))}
                placeholder={t('rulesPlaceholder')}
                disabled={busy}
                rows={4}
                maxLength={4000}
              />
            </Field>
          )}

          <div className="flex items-center gap-2">
            <Checkbox
              id={defaultId}
              checked={form.isDefault}
              onCheckedChange={(checked) =>
                setForm((prev) => ({ ...prev, isDefault: checked === true }))
              }
              disabled={busy}
            />
            <FieldLabel htmlFor={defaultId} className="font-normal">
              {t('defaultLabel')}
            </FieldLabel>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button type="button" onClick={() => void handleSave()} disabled={busy}>
              {saving ? (
                <>
                  <Loader2 className="size-4 animate-spin" aria-hidden />
                  {t('saving')}
                </>
              ) : (
                t('save')
              )}
            </Button>
            {props.mode === 'create' ? (
              <Button
                type="button"
                variant="outline"
                onClick={() => setPath('choose')}
                disabled={busy}
              >
                {t('back')}
              </Button>
            ) : (
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push(routes.igStudioStyles)}
                disabled={busy}
              >
                {t('cancel')}
              </Button>
            )}
          </div>
        </>
      ) : null}
    </div>
  )
}
