'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'

import { PageHeading } from '@/components/page-heading'
import { routes } from '@/lib/routes'
import { Button } from '@workspace/ui/components/button'
import { Field, FieldGroup, FieldLabel } from '@workspace/ui/components/field'
import { Input } from '@workspace/ui/components/input'
import { Switch } from '@workspace/ui/components/switch'

export type FrontpageFavoritePreview = {
  menu: string
}

export type FrontpageComboPreview = {
  menuA: string
  menuB: string
}

type Props = {
  locationId: number
  locationName: string
  initialTagline: string
  initialShowGuestFavorites: boolean
  initialShowPopularCombos: boolean
  latestRunName: string | null
  favorites: FrontpageFavoritePreview[]
  combos: FrontpageComboPreview[]
  hasAnalyticsRun: boolean
}

export function LocationFrontpageForm({
  locationId,
  locationName,
  initialTagline,
  initialShowGuestFavorites,
  initialShowPopularCombos,
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
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const [isPending, startTransition] = useTransition()

  function handleSave() {
    setError(null)
    setSaved(false)
    startTransition(async () => {
      try {
        const res = await fetch(`/api/locations/${locationId}/frontpage`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            tagline: tagline.trim() ? tagline.trim() : null,
            showGuestFavorites,
            showPopularCombos,
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
              <Link href={routes.analytics.salesWithLocation(locationId)}>{t('empty.uploadCta')}</Link>
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
                <ul className="flex flex-col gap-2">
                  {favorites.map((item) => (
                    <li key={item.menu} className="text-sm">
                      <span className="font-medium">{item.menu}</span>
                      <span className="text-muted-foreground"> · {t('preview.guestFavorite')}</span>
                    </li>
                  ))}
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
                <ul className="flex flex-col gap-2">
                  {combos.map((pair) => (
                    <li key={`${pair.menuA}::${pair.menuB}`} className="text-sm">
                      <span className="font-medium">
                        {pair.menuA} + {pair.menuB}
                      </span>
                      <span className="text-muted-foreground">
                        {' '}
                        · {t('preview.oftenTogether')}
                      </span>
                    </li>
                  ))}
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
