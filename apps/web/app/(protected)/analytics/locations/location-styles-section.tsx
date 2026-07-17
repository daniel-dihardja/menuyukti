'use client'

import { Loader2, Pencil, Plus, Trash2 } from 'lucide-react'
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
import { Textarea } from '@workspace/ui/components/textarea'

import { PostCreatorTemplatePicker } from '@/app/(protected)/canvas/post-creator/_components/post-creator-template-picker'
import {
  createLocationStyle,
  deleteLocationStyle,
  listLocationStyles,
  updateLocationStyle,
  type LocationStyle,
} from '@/lib/location-styles/client-api'
import { mediaDownloadHref, type MediaCatalogItem } from '@/lib/media/client-api'
import type { PostCreatorReferenceImage } from '@/lib/posts/post-creator-types'

type FormState = {
  name: string
  rules: string
  referenceImage: PostCreatorReferenceImage | null
  isDefault: boolean
}

const EMPTY_FORM: FormState = {
  name: '',
  rules: '',
  referenceImage: null,
  isDefault: false,
}

function styleToForm(style: LocationStyle): FormState {
  return {
    name: style.name,
    rules: style.rules,
    referenceImage: {
      name: style.referenceImageName,
      url: mediaDownloadHref(style.referenceImageName),
      enabled: true,
    },
    isDefault: style.isDefault,
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

  const [styles, setStyles] = useState<LocationStyle[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [formOpen, setFormOpen] = useState(false)
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

  const openCreate = () => {
    setEditingId(null)
    setForm(EMPTY_FORM)
    setFormOpen(true)
  }

  const openEdit = (style: LocationStyle) => {
    setEditingId(style.id)
    setForm(styleToForm(style))
    setFormOpen(true)
  }

  const closeForm = () => {
    setFormOpen(false)
    setEditingId(null)
    setForm(EMPTY_FORM)
  }

  const handleSelectImage = (item: MediaCatalogItem) => {
    setForm((prev) => ({
      ...prev,
      referenceImage: { name: item.name, url: item.url, enabled: true },
    }))
  }

  const handleSave = async () => {
    if (!form.name.trim() || !form.rules.trim() || !form.referenceImage) {
      toast.error(t('toast.validation'))
      return
    }
    setSaving(true)
    try {
      if (editingId != null) {
        await updateLocationStyle(editingId, {
          name: form.name.trim(),
          rules: form.rules.trim(),
          referenceImageName: form.referenceImage.name,
          isDefault: form.isDefault,
        })
        toast.success(t('toast.updated'))
      } else {
        await createLocationStyle({
          locationId,
          name: form.name.trim(),
          rules: form.rules.trim(),
          referenceImageName: form.referenceImage.name,
          isDefault: form.isDefault,
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

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0">
        <div className="space-y-1.5">
          <CardTitle>{t('title')}</CardTitle>
          <CardDescription>{t('description')}</CardDescription>
        </div>
        {!formOpen ? (
          <Button type="button" size="sm" onClick={openCreate} className="shrink-0">
            <Plus className="size-4" aria-hidden />
            {t('add')}
          </Button>
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
              {editingId != null ? t('editTitle') : t('createTitle')}
            </p>
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
              <FieldLabel htmlFor={rulesId}>{t('rulesLabel')}</FieldLabel>
              <Textarea
                id={rulesId}
                value={form.rules}
                onChange={(e) => setForm((prev) => ({ ...prev, rules: e.target.value }))}
                placeholder={t('rulesPlaceholder')}
                disabled={saving}
                rows={4}
                maxLength={4000}
              />
            </Field>
            <Field className="gap-1.5">
              <FieldLabel>{t('imageLabel')}</FieldLabel>
              <PostCreatorTemplatePicker
                templateImage={form.referenceImage}
                onSelectTemplate={handleSelectImage}
                onClearTemplate={() => setForm((prev) => ({ ...prev, referenceImage: null }))}
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
            <div className="flex gap-2">
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
              <Button type="button" variant="outline" onClick={closeForm} disabled={saving}>
                {t('cancel')}
              </Button>
            </div>
          </div>
        ) : null}
      </CardContent>
    </Card>
  )
}
