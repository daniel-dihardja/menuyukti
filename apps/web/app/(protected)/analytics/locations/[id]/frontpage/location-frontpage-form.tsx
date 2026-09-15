'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ChevronDown } from 'lucide-react'
import { useTranslations } from 'next-intl'

import { MediaCatalogPicker } from '@/components/media/media-catalog-picker'
import { PageHeading } from '@/components/page-heading'
import { mediaDownloadHref, type MediaCatalogItem } from '@/lib/media/client-api'
import { routes } from '@/lib/routes'
import { Button } from '@workspace/ui/components/button'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@workspace/ui/components/collapsible'
import { Field, FieldGroup, FieldLabel } from '@workspace/ui/components/field'
import { Input } from '@workspace/ui/components/input'
import { Switch } from '@workspace/ui/components/switch'
import { Textarea } from '@workspace/ui/components/textarea'
import { cn } from '@workspace/ui/lib/utils'

export type FrontpageFavoritePreview = {
  menu: string
}

export type FrontpageComboPreview = {
  menuA: string
  menuB: string
}

export type FrontpageFavoriteImageOverride = {
  menu: string
  imageFilename: string | null
  description: string | null
  published: boolean
}

export type FrontpageComboImageOverride = {
  menuA: string
  menuB: string
  imageFilename: string | null
  description: string | null
  published: boolean
}

type FavoritePatch = {
  imageFilename?: string | null
  description?: string | null
  published?: boolean
}

type ComboPatch = FavoritePatch

type Props = {
  locationId: number
  locationName: string
  initialTagline: string
  initialShowGuestFavorites: boolean
  initialShowPopularCombos: boolean
  initialWallEnabled: boolean
  initialPublicSlug: string
  initialFavoriteImages: FrontpageFavoriteImageOverride[]
  initialComboImages: FrontpageComboImageOverride[]
  latestRunName: string | null
  favorites: FrontpageFavoritePreview[]
  combos: FrontpageComboPreview[]
  hasAnalyticsRun: boolean
}

function suggestSlugFromName(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 128)
}

function comboKey(menuA: string, menuB: string): string {
  return menuA <= menuB ? `${menuA}::${menuB}` : `${menuB}::${menuA}`
}

function findFavoriteOverride(
  overrides: FrontpageFavoriteImageOverride[],
  menu: string,
): FrontpageFavoriteImageOverride | null {
  return overrides.find((row) => row.menu === menu) ?? null
}

function findComboOverride(
  overrides: FrontpageComboImageOverride[],
  menuA: string,
  menuB: string,
): FrontpageComboImageOverride | null {
  const key = comboKey(menuA, menuB)
  return overrides.find((row) => comboKey(row.menuA, row.menuB) === key) ?? null
}

function upsertFavoriteOverride(
  overrides: FrontpageFavoriteImageOverride[],
  menu: string,
  patch: FavoritePatch,
): FrontpageFavoriteImageOverride[] {
  const existing = findFavoriteOverride(overrides, menu)
  const imageFilename =
    patch.imageFilename !== undefined
      ? patch.imageFilename?.trim()
        ? patch.imageFilename.trim()
        : null
      : (existing?.imageFilename ?? null)
  const description =
    patch.description !== undefined ? patch.description : (existing?.description ?? null)
  const published = patch.published !== undefined ? patch.published : (existing?.published ?? true)
  const without = overrides.filter((row) => row.menu !== menu)
  const hasDescription = Boolean(description && description.length > 0)
  if (!imageFilename && !hasDescription && published) return without
  return [
    ...without,
    {
      menu,
      imageFilename,
      description: hasDescription ? description : null,
      published,
    },
  ]
}

function upsertComboOverride(
  overrides: FrontpageComboImageOverride[],
  menuA: string,
  menuB: string,
  patch: ComboPatch,
): FrontpageComboImageOverride[] {
  const existing = findComboOverride(overrides, menuA, menuB)
  const imageFilename =
    patch.imageFilename !== undefined
      ? patch.imageFilename?.trim()
        ? patch.imageFilename.trim()
        : null
      : (existing?.imageFilename ?? null)
  const description =
    patch.description !== undefined ? patch.description : (existing?.description ?? null)
  const published = patch.published !== undefined ? patch.published : (existing?.published ?? true)
  const key = comboKey(menuA, menuB)
  const without = overrides.filter((row) => comboKey(row.menuA, row.menuB) !== key)
  const hasDescription = Boolean(description && description.length > 0)
  if (!imageFilename && !hasDescription && published) return without
  const [canonicalA, canonicalB] = menuA <= menuB ? [menuA, menuB] : [menuB, menuA]
  return [
    ...without,
    {
      menuA: canonicalA,
      menuB: canonicalB,
      imageFilename,
      description: hasDescription ? description : null,
      published,
    },
  ]
}

function serializeOverridesForSave(
  favoriteImages: FrontpageFavoriteImageOverride[],
  comboImages: FrontpageComboImageOverride[],
) {
  return {
    favoriteImages: favoriteImages
      .map((row) => ({
        menu: row.menu,
        imageFilename: row.imageFilename?.trim() || null,
        description: row.description?.trim() || null,
        published: row.published,
      }))
      .filter((row) => row.imageFilename || row.description || !row.published),
    comboImages: comboImages
      .map((row) => ({
        menuA: row.menuA,
        menuB: row.menuB,
        imageFilename: row.imageFilename?.trim() || null,
        description: row.description?.trim() || null,
        published: row.published,
      }))
      .filter((row) => row.imageFilename || row.description || !row.published),
  }
}

type FavoriteItemRowProps = {
  menu: string
  subtitle: string
  imageFilename: string | null
  description: string
  published: boolean
  disabled: boolean
  onPatch: (patch: FavoritePatch) => void
}

function FavoriteItemRow({
  menu,
  subtitle,
  imageFilename,
  description,
  published,
  disabled,
  onPatch,
}: FavoriteItemRowProps) {
  const t = useTranslations('analytics.locationFrontpage')
  const [open, setOpen] = useState(false)
  const publishId = `favorite-publish-${menu}`
  const descId = `favorite-desc-${menu}`

  return (
    <Collapsible
      open={open}
      onOpenChange={setOpen}
      className="border-border/70 rounded-md border p-3"
    >
      <div className="flex items-center gap-2">
        <CollapsibleTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            disabled={disabled}
            className="h-auto min-w-0 flex-1 justify-start gap-2 px-2 py-1.5 text-left font-medium"
            aria-label={open ? t('actions.collapseItem') : t('actions.expandItem')}
          >
            <ChevronDown
              aria-hidden
              className={cn(
                'text-muted-foreground size-4 shrink-0 transition-transform',
                open && 'rotate-180',
              )}
            />
            <span className="min-w-0 truncate">
              <span className="font-medium">{menu}</span>
              <span className="text-muted-foreground font-normal"> · {subtitle}</span>
            </span>
          </Button>
        </CollapsibleTrigger>
        <div className="flex shrink-0 items-center gap-2 pr-1">
          <FieldLabel htmlFor={publishId} className="text-muted-foreground font-normal">
            {t('fields.publish')}
          </FieldLabel>
          <Switch
            id={publishId}
            checked={published}
            onCheckedChange={(checked) => onPatch({ published: checked })}
            disabled={disabled}
          />
        </div>
      </div>

      <CollapsibleContent className="flex flex-col gap-3 pt-3">
        <MediaCatalogPicker
          selectedImage={
            imageFilename
              ? {
                  name: imageFilename,
                  url: mediaDownloadHref(imageFilename),
                }
              : null
          }
          onSelect={(media: MediaCatalogItem) => onPatch({ imageFilename: media.name })}
          onClear={() => onPatch({ imageFilename: null })}
          disabled={disabled}
          pickLabel={t('fields.pickImage')}
          pickerAriaLabel={t('fields.pickerAria')}
          emptyLabel={t('fields.emptyMedia')}
          removeLabel={t('fields.removeImage')}
          fromMediaLabel={t('fields.fromMedia')}
        />
        <Field className="gap-1.5">
          <FieldLabel htmlFor={descId}>{t('fields.itemDescription')}</FieldLabel>
          <Textarea
            id={descId}
            value={description}
            onChange={(e) => onPatch({ description: e.target.value })}
            placeholder={t('fields.itemDescriptionPlaceholder')}
            maxLength={512}
            rows={2}
            disabled={disabled}
          />
        </Field>
      </CollapsibleContent>
    </Collapsible>
  )
}

type ComboItemRowProps = {
  menuA: string
  menuB: string
  subtitle: string
  imageFilename: string | null
  description: string
  published: boolean
  disabled: boolean
  onPatch: (patch: ComboPatch) => void
}

function ComboItemRow({
  menuA,
  menuB,
  subtitle,
  imageFilename,
  description,
  published,
  disabled,
  onPatch,
}: ComboItemRowProps) {
  const t = useTranslations('analytics.locationFrontpage')
  const [open, setOpen] = useState(false)
  const publishId = `combo-publish-${menuA}-${menuB}`
  const descId = `combo-desc-${menuA}-${menuB}`

  return (
    <Collapsible
      open={open}
      onOpenChange={setOpen}
      className="border-border/70 rounded-md border p-3"
    >
      <div className="flex items-center gap-2">
        <CollapsibleTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            disabled={disabled}
            className="h-auto min-w-0 flex-1 justify-start gap-2 px-2 py-1.5 text-left font-medium"
            aria-label={open ? t('actions.collapseItem') : t('actions.expandItem')}
          >
            <ChevronDown
              aria-hidden
              className={cn(
                'text-muted-foreground size-4 shrink-0 transition-transform',
                open && 'rotate-180',
              )}
            />
            <span className="min-w-0 truncate">
              <span className="font-medium">
                {menuA} + {menuB}
              </span>
              <span className="text-muted-foreground font-normal"> · {subtitle}</span>
            </span>
          </Button>
        </CollapsibleTrigger>
        <div className="flex shrink-0 items-center gap-2 pr-1">
          <FieldLabel htmlFor={publishId} className="text-muted-foreground font-normal">
            {t('fields.publish')}
          </FieldLabel>
          <Switch
            id={publishId}
            checked={published}
            onCheckedChange={(checked) => onPatch({ published: checked })}
            disabled={disabled}
          />
        </div>
      </div>

      <CollapsibleContent className="flex flex-col gap-3 pt-3">
        <MediaCatalogPicker
          selectedImage={
            imageFilename
              ? {
                  name: imageFilename,
                  url: mediaDownloadHref(imageFilename),
                }
              : null
          }
          onSelect={(media: MediaCatalogItem) => onPatch({ imageFilename: media.name })}
          onClear={() => onPatch({ imageFilename: null })}
          disabled={disabled}
          pickLabel={t('fields.pickImage')}
          pickerAriaLabel={t('fields.pickerAria')}
          emptyLabel={t('fields.emptyMedia')}
          removeLabel={t('fields.removeImage')}
          fromMediaLabel={t('fields.fromMedia')}
        />
        <Field className="gap-1.5">
          <FieldLabel htmlFor={descId}>{t('fields.itemDescription')}</FieldLabel>
          <Textarea
            id={descId}
            value={description}
            onChange={(e) => onPatch({ description: e.target.value })}
            placeholder={t('fields.itemDescriptionPlaceholder')}
            maxLength={512}
            rows={2}
            disabled={disabled}
          />
        </Field>
      </CollapsibleContent>
    </Collapsible>
  )
}

export function LocationFrontpageForm({
  locationId,
  locationName,
  initialTagline,
  initialShowGuestFavorites,
  initialShowPopularCombos,
  initialWallEnabled,
  initialPublicSlug,
  initialFavoriteImages,
  initialComboImages,
  latestRunName,
  favorites,
  combos,
  hasAnalyticsRun,
}: Props) {
  const t = useTranslations('analytics.locationFrontpage')
  const router = useRouter()
  const [tagline, setTagline] = useState(initialTagline)
  const [showGuestFavorites, setShowGuestFavorites] = useState(initialShowGuestFavorites)
  const [showPopularCombos, setShowPopularCombos] = useState(initialShowPopularCombos)
  const [wallEnabled, setWallEnabled] = useState(initialWallEnabled)
  const [publicSlug, setPublicSlug] = useState(
    () => initialPublicSlug || suggestSlugFromName(locationName),
  )
  const [copied, setCopied] = useState(false)
  const [favoriteImages, setFavoriteImages] =
    useState<FrontpageFavoriteImageOverride[]>(initialFavoriteImages)
  const [comboImages, setComboImages] = useState<FrontpageComboImageOverride[]>(initialComboImages)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const [isPending, startTransition] = useTransition()

  const publicPath = publicSlug.trim() ? routes.public.locationWall(publicSlug.trim()) : null

  function handleSave() {
    setError(null)
    setSaved(false)
    const slug = publicSlug.trim()
    if (wallEnabled && !slug) {
      setError(t('errors.slugRequired'))
      return
    }
    startTransition(async () => {
      try {
        const overrides = serializeOverridesForSave(favoriteImages, comboImages)
        const res = await fetch(`/api/locations/${locationId}/frontpage`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            tagline: tagline.trim() ? tagline.trim() : null,
            showGuestFavorites,
            showPopularCombos,
            wallEnabled,
            publicSlug: slug || null,
            ...overrides,
          }),
        })
        if (!res.ok) {
          const body = (await res.json().catch(() => null)) as { message?: string } | null
          setError(body?.message ?? t('errors.saveFailed'))
          return
        }
        setSaved(true)
        router.refresh()
      } catch {
        setError(t('errors.saveFailed'))
      }
    })
  }

  async function handleCopyUrl() {
    if (!publicPath) return
    try {
      const absolute = `${window.location.origin}${publicPath}`
      await navigator.clipboard.writeText(absolute)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
    } catch {
      setCopied(false)
    }
  }

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-2">
        <PageHeading title={t('heading')} />
        <p className="text-muted-foreground max-w-2xl text-sm">{t('description')}</p>
      </div>

      <section className="flex max-w-xl flex-col gap-4">
        <h2 className="text-base font-semibold">{t('configTitle')}</h2>
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="frontpage-tagline">{t('fields.tagline')}</FieldLabel>
            <Input
              id="frontpage-tagline"
              value={tagline}
              onChange={(e) => setTagline(e.target.value)}
              placeholder={t('fields.taglinePlaceholder')}
              maxLength={512}
              disabled={isPending}
            />
          </Field>
          <Field orientation="horizontal" className="items-center justify-between gap-4">
            <FieldLabel htmlFor="frontpage-favorites">{t('fields.showGuestFavorites')}</FieldLabel>
            <Switch
              id="frontpage-favorites"
              checked={showGuestFavorites}
              onCheckedChange={setShowGuestFavorites}
              disabled={isPending}
            />
          </Field>
          <Field orientation="horizontal" className="items-center justify-between gap-4">
            <FieldLabel htmlFor="frontpage-combos">{t('fields.showPopularCombos')}</FieldLabel>
            <Switch
              id="frontpage-combos"
              checked={showPopularCombos}
              onCheckedChange={setShowPopularCombos}
              disabled={isPending}
            />
          </Field>
          <Field orientation="horizontal" className="items-center justify-between gap-4">
            <div className="flex flex-col gap-1">
              <FieldLabel htmlFor="frontpage-wall">{t('fields.wallEnabled')}</FieldLabel>
              <p className="text-muted-foreground text-xs">{t('fields.wallEnabledHint')}</p>
            </div>
            <Switch
              id="frontpage-wall"
              checked={wallEnabled}
              onCheckedChange={setWallEnabled}
              disabled={isPending}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="frontpage-slug">{t('fields.publicSlug')}</FieldLabel>
            <Input
              id="frontpage-slug"
              value={publicSlug}
              onChange={(e) => setPublicSlug(e.target.value)}
              placeholder={t('fields.publicSlugPlaceholder')}
              maxLength={128}
              disabled={isPending}
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
            />
            <p className="text-muted-foreground text-xs">{t('fields.publicSlugHint')}</p>
          </Field>
          {wallEnabled && publicPath ? (
            <Field>
              <FieldLabel htmlFor="frontpage-public-url">{t('fields.publicUrl')}</FieldLabel>
              <div className="flex flex-wrap items-center gap-2">
                <Input
                  id="frontpage-public-url"
                  value={publicPath}
                  readOnly
                  className="font-mono text-xs"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCopyUrl}
                  disabled={isPending}
                >
                  {copied ? t('fields.copiedPublicUrl') : t('fields.copyPublicUrl')}
                </Button>
                <Button asChild type="button" variant="ghost">
                  <Link href={publicPath} target="_blank" rel="noreferrer">
                    {publicPath}
                  </Link>
                </Button>
              </div>
            </Field>
          ) : null}
        </FieldGroup>
        <div className="flex flex-wrap items-center gap-3">
          <Button type="button" onClick={handleSave} disabled={isPending}>
            {isPending ? t('actions.saving') : t('actions.save')}
          </Button>
          {saved ? <p className="text-muted-foreground text-sm">{t('actions.saved')}</p> : null}
          {error ? <p className="text-destructive text-sm">{error}</p> : null}
        </div>
      </section>

      <section className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <h2 className="text-base font-semibold">{t('previewTitle')}</h2>
          <p className="text-muted-foreground text-sm">
            {hasAnalyticsRun && latestRunName
              ? t('previewFromRun', { runName: latestRunName })
              : t('previewNoRun')}
          </p>
        </div>

        {!hasAnalyticsRun ? (
          <div className="border-border bg-muted/30 flex flex-col gap-3 rounded-lg border p-4">
            <p className="text-sm">{t('empty.noAnalytics')}</p>
            <Button asChild variant="outline" className="w-fit">
              <Link href={routes.analytics.salesWithLocation(locationId)}>
                {t('empty.uploadCta')}
              </Link>
            </Button>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2">
            <div className="border-border flex flex-col gap-3 rounded-lg border p-4">
              <h3 className="text-sm font-semibold">{t('preview.favoritesHeading')}</h3>
              {!showGuestFavorites ? (
                <p className="text-muted-foreground text-sm">{t('preview.sectionHidden')}</p>
              ) : favorites.length === 0 ? (
                <p className="text-muted-foreground text-sm">{t('preview.favoritesEmpty')}</p>
              ) : (
                <ul className="flex flex-col gap-3">
                  {favorites.map((item) => {
                    const override = findFavoriteOverride(favoriteImages, item.menu)
                    return (
                      <li key={item.menu}>
                        <FavoriteItemRow
                          menu={item.menu}
                          subtitle={t('preview.guestFavorite')}
                          imageFilename={override?.imageFilename ?? null}
                          description={override?.description ?? ''}
                          published={override?.published ?? true}
                          disabled={isPending}
                          onPatch={(patch) =>
                            setFavoriteImages((prev) =>
                              upsertFavoriteOverride(prev, item.menu, patch),
                            )
                          }
                        />
                      </li>
                    )
                  })}
                </ul>
              )}
            </div>
            <div className="border-border flex flex-col gap-3 rounded-lg border p-4">
              <h3 className="text-sm font-semibold">{t('preview.combosHeading')}</h3>
              {!showPopularCombos ? (
                <p className="text-muted-foreground text-sm">{t('preview.sectionHidden')}</p>
              ) : combos.length === 0 ? (
                <p className="text-muted-foreground text-sm">{t('preview.combosEmpty')}</p>
              ) : (
                <ul className="flex flex-col gap-3">
                  {combos.map((pair) => {
                    const override = findComboOverride(comboImages, pair.menuA, pair.menuB)
                    return (
                      <li key={`${pair.menuA}::${pair.menuB}`}>
                        <ComboItemRow
                          menuA={pair.menuA}
                          menuB={pair.menuB}
                          subtitle={t('preview.oftenTogether')}
                          imageFilename={override?.imageFilename ?? null}
                          description={override?.description ?? ''}
                          published={override?.published ?? true}
                          disabled={isPending}
                          onPatch={(patch) =>
                            setComboImages((prev) =>
                              upsertComboOverride(prev, pair.menuA, pair.menuB, patch),
                            )
                          }
                        />
                      </li>
                    )
                  })}
                </ul>
              )}
            </div>
          </div>
        )}

        <p className="text-muted-foreground text-xs">
          {t('preview.venueNote', { name: locationName })}
        </p>
      </section>
    </div>
  )
}
