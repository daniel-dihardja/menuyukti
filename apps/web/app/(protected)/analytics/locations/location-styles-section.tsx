'use client'

import { ImagePlus, Loader2, Pencil, Plus, Trash2 } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useCallback, useEffect, useId, useState } from 'react'
import { toast } from 'sonner'

import { Button } from '@workspace/ui/components/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@workspace/ui/components/card'
import { Checkbox } from '@workspace/ui/components/checkbox'
import { Field, FieldLabel } from '@workspace/ui/components/field'
import { Input } from '@workspace/ui/components/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@workspace/ui/components/select'
import { Textarea } from '@workspace/ui/components/textarea'

import { PostCreatorTemplatePicker } from '@/app/(protected)/canvas/post-creator/_components/post-creator-template-picker'
import {
  createLocationStyle,
  deleteLocationStyle,
  draftLocationStyleFromImage,
  listLocationStyles,
  updateLocationStyle,
  type LocationStyle,
} from '@/lib/location-styles/client-api'
import {
  parseStyleSpec,
  rulesFromStyleSpec,
  STYLE_SPEC_CONTROL_KEYS,
  type StyleSpec,
  type StyleSpecControlKey,
} from '@/lib/location-styles/style-spec'
import { mediaDownloadHref, type MediaCatalogItem } from '@/lib/media/client-api'
import type { PostCreatorReferenceImage } from '@/lib/posts/post-creator-types'

type FormMode = 'manual' | 'from-image' | 'edit'

type FormState = {
  name: string
  rules: string
  referenceImage: PostCreatorReferenceImage | null
  isDefault: boolean
  styleSpec: StyleSpec | null
  intent: string
  kind: StyleSpec['kind']
}

const EMPTY_FORM: FormState = {
  name: '',
  rules: '',
  referenceImage: null,
  isDefault: false,
  styleSpec: null,
  intent: '',
  kind: 'template',
}

function styleToForm(style: LocationStyle): FormState {
  const styleSpec = parseStyleSpec(style.styleSpec)
  return {
    name: style.name,
    rules: style.rules,
    referenceImage: {
      name: style.referenceImageName,
      url: mediaDownloadHref(style.referenceImageName),
      enabled: true,
    },
    isDefault: style.isDefault,
    styleSpec,
    intent: '',
    kind: styleSpec?.kind ?? 'template',
  }
}

function updateSpecDefault(spec: StyleSpec, key: StyleSpecControlKey, value: string): StyleSpec {
  return {
    ...spec,
    defaults: { ...spec.defaults, [key]: value },
  }
}

function updateSpecBaseRules(spec: StyleSpec, rulesText: string): StyleSpec {
  const baseRules = rulesText
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
  return {
    ...spec,
    baseRules: baseRules.length > 0 ? baseRules : spec.baseRules,
  }
}

type LocationStylesSectionProps = {
  locationId: number
}

export function LocationStylesSection({ locationId }: LocationStylesSectionProps) {
  const t = useTranslations('analytics.branches.styles')
  const nameId = useId()
  const rulesId = useId()
  const defaultId = useId()
  const intentId = useId()
  const kindId = useId()

  const [styles, setStyles] = useState<LocationStyle[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [drafting, setDrafting] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [formMode, setFormMode] = useState<FormMode>('manual')
  const [form, setForm] = useState<FormState>(EMPTY_FORM)

  const refresh = useCallback(async () => {
    setLoading(true)
    try {
      const list = await listLocationStyles(locationId)
      setStyles(list)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('toast.loadError'))
      setStyles([])
    } finally {
      setLoading(false)
    }
  }, [locationId, t])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const openCreateManual = () => {
    setEditingId(null)
    setFormMode('manual')
    setForm(EMPTY_FORM)
    setFormOpen(true)
  }

  const openCreateFromImage = () => {
    setEditingId(null)
    setFormMode('from-image')
    setForm(EMPTY_FORM)
    setFormOpen(true)
  }

  const openEdit = (style: LocationStyle) => {
    setEditingId(style.id)
    setFormMode('edit')
    setForm(styleToForm(style))
    setFormOpen(true)
  }

  const closeForm = () => {
    setFormOpen(false)
    setEditingId(null)
    setFormMode('manual')
    setForm(EMPTY_FORM)
  }

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
      const draft = await draftLocationStyleFromImage({
        mediaName: form.referenceImage.name,
        intent: form.intent.trim() || undefined,
      })
      setForm((prev) => ({
        ...prev,
        name: draft.name,
        styleSpec: draft.styleSpec,
        kind: draft.styleSpec.kind,
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
    if (formMode === 'from-image' && !hasSpec) {
      toast.error(t('toast.draftRequired'))
      return
    }

    setSaving(true)
    try {
      const styleSpec = form.styleSpec != null ? { ...form.styleSpec, kind: form.kind } : undefined
      const rules = styleSpec ? rulesFromStyleSpec(styleSpec) : form.rules.trim()

      if (editingId != null) {
        await updateLocationStyle(editingId, {
          name: form.name.trim(),
          rules,
          referenceImageName: form.referenceImage.name,
          isDefault: form.isDefault,
          ...(styleSpec != null ? { styleSpec } : {}),
        })
        toast.success(t('toast.updated'))
      } else {
        await createLocationStyle({
          locationId,
          name: form.name.trim(),
          rules,
          referenceImageName: form.referenceImage.name,
          isDefault: form.isDefault,
          ...(styleSpec != null ? { styleSpec } : {}),
        })
        toast.success(t('toast.created'))
      }
      closeForm()
      await refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('toast.saveError'))
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (style: LocationStyle) => {
    if (!window.confirm(t('deleteConfirm', { name: style.name }))) return
    try {
      await deleteLocationStyle(style.id)
      toast.success(t('toast.deleted'))
      if (editingId === style.id) closeForm()
      await refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('toast.deleteError'))
    }
  }

  const busy = saving || drafting
  const showSpecFields = form.styleSpec != null

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0">
        <div className="space-y-1.5">
          <CardTitle>{t('title')}</CardTitle>
          <CardDescription>{t('description')}</CardDescription>
        </div>
        {!formOpen ? (
          <div className="flex shrink-0 gap-2">
            <Button type="button" size="sm" variant="outline" onClick={openCreateFromImage}>
              <ImagePlus className="size-4" aria-hidden />
              {t('createFromImage')}
            </Button>
            <Button type="button" size="sm" onClick={openCreateManual}>
              <Plus className="size-4" aria-hidden />
              {t('add')}
            </Button>
          </div>
        ) : null}
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? (
          <div className="text-muted-foreground flex items-center gap-2 text-sm">
            <Loader2 className="size-4 animate-spin" aria-hidden />
            {t('loading')}
          </div>
        ) : styles.length === 0 && !formOpen ? (
          <p className="text-muted-foreground text-sm">{t('empty')}</p>
        ) : (
          <ul className="space-y-2">
            {styles.map((style) => (
              <li
                key={style.id}
                className="flex items-center gap-3 rounded-md border border-border/60 p-2"
              >
                <div className="relative size-12 shrink-0 overflow-hidden rounded-md bg-muted/20">
                  {/* eslint-disable-next-line @next/next/no-img-element -- media download URLs */}
                  <img
                    src={mediaDownloadHref(style.referenceImageName)}
                    alt=""
                    className="size-full object-cover"
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">
                    {style.name}
                    {style.isDefault ? (
                      <span className="text-muted-foreground ml-2 text-xs font-normal">
                        {t('defaultBadge')}
                      </span>
                    ) : null}
                    {parseStyleSpec(style.styleSpec) ? (
                      <span className="text-muted-foreground ml-2 text-xs font-normal">
                        {t('specBadge')}
                      </span>
                    ) : null}
                  </p>
                  <p className="text-muted-foreground line-clamp-1 text-xs">{style.rules}</p>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-8 shrink-0"
                  aria-label={t('edit')}
                  onClick={() => openEdit(style)}
                >
                  <Pencil className="size-4" aria-hidden />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-8 shrink-0"
                  aria-label={t('delete')}
                  onClick={() => void handleDelete(style)}
                >
                  <Trash2 className="size-4" aria-hidden />
                </Button>
              </li>
            ))}
          </ul>
        )}

        {formOpen ? (
          <div className="space-y-3 rounded-md border border-border/60 p-3">
            <p className="text-sm font-medium">
              {editingId != null
                ? t('editTitle')
                : formMode === 'from-image'
                  ? t('createFromImageTitle')
                  : t('createTitle')}
            </p>

            <Field className="gap-1.5">
              <FieldLabel>{t('imageLabel')}</FieldLabel>
              <PostCreatorTemplatePicker
                templateImage={form.referenceImage}
                onSelectTemplate={handleSelectImage}
                onClearTemplate={() => setForm((prev) => ({ ...prev, referenceImage: null }))}
                disabled={busy}
                pickLabel={t('imagePick')}
                pickerAriaLabel={t('imagePickerAria')}
                emptyLabel={t('imageEmpty')}
                removeLabel={t('imageRemove')}
                fromMediaLabel={t('imageFromMedia')}
              />
            </Field>

            {formMode === 'from-image' && !showSpecFields ? (
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
              </>
            ) : null}

            {showSpecFields || formMode !== 'from-image' ? (
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
                  <>
                    <Field className="gap-1.5">
                      <FieldLabel htmlFor={kindId}>{t('kindLabel')}</FieldLabel>
                      <Select
                        value={form.kind}
                        onValueChange={(value) =>
                          setForm((prev) => ({
                            ...prev,
                            kind: value as StyleSpec['kind'],
                          }))
                        }
                        disabled={busy}
                      >
                        <SelectTrigger id={kindId}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="template">{t('kindTemplate')}</SelectItem>
                          <SelectItem value="mood">{t('kindMood')}</SelectItem>
                        </SelectContent>
                      </Select>
                    </Field>

                    <Field className="gap-1.5">
                      <FieldLabel htmlFor={rulesId}>{t('baseRulesLabel')}</FieldLabel>
                      <Textarea
                        id={rulesId}
                        value={form.styleSpec.baseRules.join('\n')}
                        onChange={(e) =>
                          setForm((prev) =>
                            prev.styleSpec
                              ? {
                                  ...prev,
                                  styleSpec: updateSpecBaseRules(prev.styleSpec, e.target.value),
                                  rules: e.target.value,
                                }
                              : prev,
                          )
                        }
                        placeholder={t('baseRulesPlaceholder')}
                        disabled={busy}
                        rows={5}
                      />
                    </Field>

                    {STYLE_SPEC_CONTROL_KEYS.map((key) => {
                      const control = form.styleSpec!.controls[key]
                      return (
                        <Field key={key} className="gap-1.5">
                          <FieldLabel>{t(`controls.${key}`)}</FieldLabel>
                          <Select
                            value={form.styleSpec!.defaults[key]}
                            onValueChange={(value) =>
                              setForm((prev) =>
                                prev.styleSpec
                                  ? {
                                      ...prev,
                                      styleSpec: updateSpecDefault(prev.styleSpec, key, value),
                                    }
                                  : prev,
                              )
                            }
                            disabled={busy}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {control.values.map((value) => (
                                <SelectItem key={value} value={value}>
                                  {value}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <p className="text-muted-foreground text-xs">
                            {control.instructions[form.styleSpec!.defaults[key]]}
                          </p>
                        </Field>
                      )
                    })}
                  </>
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

                <div className="flex gap-2">
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
                  <Button type="button" variant="outline" onClick={closeForm} disabled={busy}>
                    {t('cancel')}
                  </Button>
                </div>
              </>
            ) : (
              <div className="flex gap-2">
                <Button type="button" variant="outline" onClick={closeForm} disabled={busy}>
                  {t('cancel')}
                </Button>
              </div>
            )}
          </div>
        ) : null}
      </CardContent>
    </Card>
  )
}
