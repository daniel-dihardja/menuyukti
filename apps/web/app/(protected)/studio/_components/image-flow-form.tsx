'use client'

import { useEffect, useRef, useState } from 'react'
import { useTranslations } from 'next-intl'

import type { ImageAiFlowRow } from '@/lib/graphql/queries'
import { Button } from '@workspace/ui/components/button'
import { Field, FieldDescription, FieldGroup, FieldLabel } from '@workspace/ui/components/field'
import { Input } from '@workspace/ui/components/input'
import { Spinner } from '@workspace/ui/components/spinner'
import { Switch } from '@workspace/ui/components/switch'
import { Textarea } from '@workspace/ui/components/textarea'

function slugify(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export type ImageFlowFormValues = {
  displayName: string
  slug: string
  prompt: string
  model: string
  promptEnhance: string
  imageReferenceStrength: string
  styleIdsText: string
  isActive: boolean
  sortOrder: number
}

function parseStyleIdsJson(raw: string): string[] | null {
  const trimmed = raw.trim()
  if (!trimmed) return null
  let v: unknown
  try {
    v = JSON.parse(trimmed) as unknown
  } catch {
    throw new Error('invalid')
  }
  if (v === null) return null
  if (!Array.isArray(v) || !v.every((x) => typeof x === 'string')) {
    throw new Error('invalid')
  }
  return v
}

type Props = {
  mode: 'create' | 'edit'
  initial?: ImageAiFlowRow | null
  onSubmit: (values: ImageFlowFormValues, styleIds: string[] | null) => Promise<void>
  onCancel: () => void
}

const defaultValues = (): ImageFlowFormValues => ({
  displayName: '',
  slug: '',
  prompt: '',
  model: 'gemini-2.5-flash-image',
  promptEnhance: '',
  imageReferenceStrength: '',
  styleIdsText: '',
  isActive: true,
  sortOrder: 0,
})

function rowToForm(row: ImageAiFlowRow): ImageFlowFormValues {
  let styleIdsText = ''
  if (row.styleIds != null) {
    try {
      styleIdsText = JSON.stringify(row.styleIds, null, 2)
    } catch {
      styleIdsText = String(row.styleIds)
    }
  }
  return {
    displayName: row.displayName,
    slug: row.slug,
    prompt: row.prompt,
    model: row.model,
    promptEnhance: row.promptEnhance ?? '',
    imageReferenceStrength: row.imageReferenceStrength ?? '',
    styleIdsText,
    isActive: row.isActive,
    sortOrder: row.sortOrder,
  }
}

export function ImageFlowForm({ mode, initial, onSubmit, onCancel }: Props) {
  const t = useTranslations('imageFlows')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const slugTouchedRef = useRef(mode === 'edit')

  const [values, setValues] = useState<ImageFlowFormValues>(() =>
    initial ? rowToForm(initial) : defaultValues(),
  )
  const [styleError, setStyleError] = useState<string | null>(null)

  useEffect(() => {
    if (initial) {
      setValues(rowToForm(initial))
      slugTouchedRef.current = true
    } else {
      setValues(defaultValues())
      slugTouchedRef.current = false
    }
  }, [initial])

  const handleDisplayNameChange = (displayName: string) => {
    setValues((v) => {
      if (mode === 'create' && !slugTouchedRef.current) {
        return { ...v, displayName, slug: slugify(displayName) }
      }
      return { ...v, displayName }
    })
  }

  const handleSlugChange = (slug: string) => {
    slugTouchedRef.current = true
    setValues((v) => ({ ...v, slug }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setStyleError(null)
    let styleIds: string[] | null = null
    try {
      styleIds = parseStyleIdsJson(values.styleIdsText)
    } catch {
      setStyleError(t('styleIdsError'))
      return
    }

    setIsSubmitting(true)
    try {
      await onSubmit(values, styleIds)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      <FieldGroup className="gap-5">
        <Field>
          <FieldLabel htmlFor="flow-display-name">{t('displayName')}</FieldLabel>
          <Input
            id="flow-display-name"
            name="displayName"
            value={values.displayName}
            onChange={(e) => handleDisplayNameChange(e.target.value)}
            placeholder={t('displayNamePlaceholder')}
            autoComplete="off"
            required
          />
        </Field>

        <Field>
          <FieldLabel htmlFor="flow-slug">{t('slug')}</FieldLabel>
          <Input
            id="flow-slug"
            name="slug"
            value={values.slug}
            onChange={(e) => handleSlugChange(e.target.value)}
            placeholder={t('slugPlaceholder')}
            autoComplete="off"
            spellCheck={false}
            required
            translate="no"
          />
          <FieldDescription>{t('slugHint')}</FieldDescription>
        </Field>

        <Field>
          <FieldLabel htmlFor="flow-prompt">{t('prompt')}</FieldLabel>
          <Textarea
            id="flow-prompt"
            name="prompt"
            value={values.prompt}
            onChange={(e) => setValues((v) => ({ ...v, prompt: e.target.value }))}
            placeholder={t('promptPlaceholder')}
            rows={5}
            required
            className="min-h-[120px] resize-y"
          />
        </Field>

        <Field>
          <FieldLabel htmlFor="flow-model">{t('model')}</FieldLabel>
          <Input
            id="flow-model"
            name="model"
            value={values.model}
            onChange={(e) => setValues((v) => ({ ...v, model: e.target.value }))}
            placeholder={t('modelPlaceholder')}
            autoComplete="off"
            required
            translate="no"
          />
        </Field>

        <Field>
          <FieldLabel htmlFor="flow-prompt-enhance">{t('promptEnhance')}</FieldLabel>
          <Input
            id="flow-prompt-enhance"
            name="promptEnhance"
            value={values.promptEnhance}
            onChange={(e) => setValues((v) => ({ ...v, promptEnhance: e.target.value }))}
            placeholder={t('promptEnhancePlaceholder')}
            autoComplete="off"
          />
        </Field>

        <Field>
          <FieldLabel htmlFor="flow-ref-strength">{t('imageReferenceStrength')}</FieldLabel>
          <Input
            id="flow-ref-strength"
            name="imageReferenceStrength"
            value={values.imageReferenceStrength}
            onChange={(e) => setValues((v) => ({ ...v, imageReferenceStrength: e.target.value }))}
            placeholder={t('imageReferenceStrengthPlaceholder')}
            autoComplete="off"
          />
        </Field>

        <Field data-invalid={styleError ? true : undefined}>
          <FieldLabel htmlFor="flow-style-ids">{t('styleIds')}</FieldLabel>
          <Textarea
            id="flow-style-ids"
            name="styleIds"
            value={values.styleIdsText}
            onChange={(e) => {
              setStyleError(null)
              setValues((v) => ({ ...v, styleIdsText: e.target.value }))
            }}
            placeholder={t('styleIdsPlaceholder')}
            rows={3}
            aria-invalid={styleError ? true : undefined}
            className="min-h-[72px] resize-y font-mono text-sm"
            translate="no"
          />
          {styleError ? (
            <FieldDescription className="text-destructive">{styleError}</FieldDescription>
          ) : null}
        </Field>

        <Field orientation="responsive">
          <div className="flex flex-col gap-1">
            <FieldLabel htmlFor="flow-active">{t('isActive')}</FieldLabel>
            <FieldDescription>{t('isActiveDescription')}</FieldDescription>
          </div>
          <Switch
            id="flow-active"
            checked={values.isActive}
            onCheckedChange={(checked) => setValues((v) => ({ ...v, isActive: checked }))}
          />
        </Field>

        <Field>
          <FieldLabel htmlFor="flow-sort">{t('sortOrder')}</FieldLabel>
          <Input
            id="flow-sort"
            name="sortOrder"
            type="number"
            inputMode="numeric"
            value={Number.isNaN(values.sortOrder) ? '' : values.sortOrder}
            onChange={(e) => {
              const n = parseInt(e.target.value, 10)
              setValues((v) => ({ ...v, sortOrder: Number.isNaN(n) ? 0 : n }))
            }}
          />
          <FieldDescription>{t('sortOrderHint')}</FieldDescription>
        </Field>
      </FieldGroup>

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end sm:gap-3">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
          {t('cancel')}
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? (
            <>
              <Spinner className="size-4" />
              {t('saving')}
            </>
          ) : mode === 'create' ? (
            t('create')
          ) : (
            t('save')
          )}
        </Button>
      </div>
    </form>
  )
}
