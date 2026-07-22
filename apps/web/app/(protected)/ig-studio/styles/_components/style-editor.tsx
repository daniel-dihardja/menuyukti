'use client'

import { Loader2 } from 'lucide-react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { useId, useState } from 'react'
import { toast } from 'sonner'

import { Button } from '@workspace/ui/components/button'
import { Checkbox } from '@workspace/ui/components/checkbox'
import { Field, FieldLabel } from '@workspace/ui/components/field'
import { Input } from '@workspace/ui/components/input'

import { MediaCatalogPicker } from '@/components/media/media-catalog-picker'
import { mediaDownloadHref, type MediaCatalogItem } from '@/lib/media/client-api'
import type { PostCreatorReferenceImage } from '@/lib/posts/post-creator-types'
import { routes } from '@/lib/routes'
import { createStyle, updateStyle, type Style } from '@/lib/styles/client-api'
import { parseStyleSpecResult, type StyleSpec } from '@/lib/styles/style-spec'

import { StyleJsonEditor } from './style-json-editor'

const EMPTY_SPEC_JSON = `{
  "schemaVersion": 2,
  "properties": {
    "headline": {
      "type": "enum",
      "values": ["auto", "none"],
      "default": "auto",
      "instructions": {
        "auto": "Place a short headline when provided.",
        "none": "Leave the headline area empty."
      }
    }
  }
}`

type FormState = {
  name: string
  jsonText: string
  referenceImage: PostCreatorReferenceImage | null
  isDefault: boolean
}

function specToJson(spec: unknown): string {
  try {
    return JSON.stringify(spec, null, 2)
  } catch {
    return EMPTY_SPEC_JSON
  }
}

function styleToForm(style: Style): FormState {
  return {
    name: style.name,
    jsonText: specToJson(style.spec),
    referenceImage: {
      name: style.referenceImageName,
      url: mediaDownloadHref(style.referenceImageName),
      enabled: true,
    },
    isDefault: style.isDefault,
  }
}

const EMPTY_FORM: FormState = {
  name: '',
  jsonText: EMPTY_SPEC_JSON,
  referenceImage: null,
  isDefault: false,
}

type StyleEditorProps = { mode: 'create' } | { mode: 'edit'; style: Style }

export function StyleEditor(props: StyleEditorProps) {
  const t = useTranslations('igStudio.styles')
  const router = useRouter()
  const searchParams = useSearchParams()
  const nameId = useId()
  const defaultId = useId()

  const [form, setForm] = useState<FormState>(
    props.mode === 'edit' ? styleToForm(props.style) : EMPTY_FORM,
  )
  const [jsonError, setJsonError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const handleSelectImage = (item: MediaCatalogItem) => {
    setForm((prev) => ({
      ...prev,
      referenceImage: { name: item.name, url: item.url, enabled: true },
    }))
  }

  const validateSpec = (): StyleSpec | null => {
    let parsed: unknown
    try {
      parsed = JSON.parse(form.jsonText) as unknown
    } catch {
      setJsonError(t('toast.invalidJson'))
      return null
    }
    const result = parseStyleSpecResult(parsed)
    if (!result.ok) {
      const detail = result.issues
        .slice(0, 3)
        .map((issue) => `${issue.path.join('.') || '(root)'}: ${issue.message}`)
        .join('; ')
      setJsonError(detail || t('toast.invalidSpec'))
      return null
    }
    setJsonError(null)
    return result.data
  }

  const handleSave = async () => {
    if (!form.name.trim() || !form.referenceImage) {
      toast.error(t('toast.validation'))
      return
    }
    const spec = validateSpec()
    if (!spec) {
      toast.error(t('toast.invalidSpec'))
      return
    }

    setSaving(true)
    try {
      if (props.mode === 'edit') {
        await updateStyle(props.style.id, {
          name: form.name.trim(),
          referenceImageName: form.referenceImage.name,
          spec,
          isDefault: form.isDefault,
        })
        toast.success(t('toast.updated'))
        router.push(routes.igStudioStyles)
        router.refresh()
        return
      }

      const created = await createStyle({
        name: form.name.trim(),
        referenceImageName: form.referenceImage.name,
        spec,
        isDefault: form.isDefault,
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

  return (
    <div className="w-full space-y-4">
      <Field className="gap-1.5">
        <FieldLabel htmlFor={nameId}>{t('nameLabel')}</FieldLabel>
        <Input
          id={nameId}
          value={form.name}
          onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
          placeholder={t('namePlaceholder')}
          disabled={saving}
          maxLength={128}
        />
      </Field>

      <Field className="gap-1.5">
        <FieldLabel>{t('specJsonLabel')}</FieldLabel>
        <StyleJsonEditor
          value={form.jsonText}
          onChange={(next) => {
            setForm((prev) => ({ ...prev, jsonText: next }))
            setJsonError(null)
          }}
          disabled={saving}
          ariaLabel={t('specJsonAria')}
        />
        {jsonError ? <p className="text-destructive text-xs">{jsonError}</p> : null}
        <p className="text-muted-foreground text-xs">{t('specJsonHint')}</p>
      </Field>

      <Field className="gap-1.5">
        <FieldLabel>{t('imageLabel')}</FieldLabel>
        <MediaCatalogPicker
          selectedImage={form.referenceImage}
          onSelect={handleSelectImage}
          onClear={() => setForm((prev) => ({ ...prev, referenceImage: null }))}
          disabled={saving}
          pickLabel={t('imagePick')}
          pickerAriaLabel={t('imagePickerAria')}
          emptyLabel={t('imageEmpty')}
          removeLabel={t('imageRemove')}
          fromMediaLabel={t('imageFromMedia')}
        />
      </Field>

      <div className="flex items-center gap-2">
        <Checkbox
          id={defaultId}
          checked={form.isDefault}
          onCheckedChange={(checked) =>
            setForm((prev) => ({ ...prev, isDefault: checked === true }))
          }
          disabled={saving}
        />
        <FieldLabel htmlFor={defaultId} className="font-normal">
          {t('defaultLabel')}
        </FieldLabel>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button type="button" onClick={() => void handleSave()} disabled={saving}>
          {saving ? (
            <>
              <Loader2 className="size-4 animate-spin" aria-hidden />
              {t('saving')}
            </>
          ) : (
            t('save')
          )}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push(routes.igStudioStyles)}
          disabled={saving}
        >
          {t('cancel')}
        </Button>
      </div>
    </div>
  )
}
