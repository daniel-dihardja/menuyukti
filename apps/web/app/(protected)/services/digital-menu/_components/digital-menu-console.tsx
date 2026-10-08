'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'

import { MediaCatalogPicker } from '@/components/media/media-catalog-picker'
import { mediaDownloadHref, type MediaCatalogItem } from '@/lib/media/client-api'
import { parsePublicMenuTableLabel } from '@/lib/public-menu/table-label'
import { routes } from '@/lib/routes'

import { DigitalMenuQr, useClientAbsoluteUrl } from './digital-menu-qr'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@workspace/ui/components/alert-dialog'
import { Button } from '@workspace/ui/components/button'
import { Field, FieldGroup, FieldLabel } from '@workspace/ui/components/field'
import { Input } from '@workspace/ui/components/input'
import { Switch } from '@workspace/ui/components/switch'

type Props = {
  locationId: number
  locationName: string
  initialPublicEnabled: boolean
  initialPublicSlug: string
  initialHeaderImageFilename: string | null
}

export function DigitalMenuConsole({
  locationId,
  locationName,
  initialPublicEnabled,
  initialPublicSlug,
  initialHeaderImageFilename,
}: Props) {
  const t = useTranslations('services.digitalMenu.console')
  const router = useRouter()
  const [publicEnabled, setPublicEnabled] = useState(initialPublicEnabled)
  const [headerImageFilename, setHeaderImageFilename] = useState<string | null>(
    initialHeaderImageFilename,
  )
  const [persistedPublicEnabled, setPersistedPublicEnabled] = useState(initialPublicEnabled)
  const [copied, setCopied] = useState(false)
  const [loading, setLoading] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [disableOpen, setDisableOpen] = useState(false)
  const [pendingDisable, setPendingDisable] = useState(false)
  const [tableLabelInput, setTableLabelInput] = useState('')

  const locationSlug = initialPublicSlug.trim()
  const hasSlug = Boolean(locationSlug)
  const livePublicPath =
    persistedPublicEnabled && hasSlug ? routes.public.locationMenu(locationSlug) : null
  const liveLocationHomePath = hasSlug ? routes.public.locationHome(locationSlug) : null
  const needsPublishSave = publicEnabled && !persistedPublicEnabled
  const locationBasicsHref = routes.analytics.branchesDetail(locationId)

  const validatedTableLabel = parsePublicMenuTableLabel(tableLabelInput)
  const liveTablePath =
    livePublicPath && validatedTableLabel
      ? routes.public.locationMenuTable(locationSlug, validatedTableLabel)
      : null
  const absoluteTableUrl = useClientAbsoluteUrl(liveTablePath)
  const qrDownloadFileName = validatedTableLabel
    ? `${locationSlug || 'menu'}-table-${validatedTableLabel.replaceAll(/[^\w.-]+/g, '-')}-qr.png`
    : `${locationSlug || 'menu'}-table-qr.png`

  function handleEnabledChange(next: boolean) {
    if (!next && publicEnabled) {
      setPendingDisable(true)
      setDisableOpen(true)
      return
    }
    setPublicEnabled(next)
    setSaved(false)
  }

  function confirmDisable() {
    setPublicEnabled(false)
    setPendingDisable(false)
    setDisableOpen(false)
    setSaved(false)
  }

  function cancelDisable() {
    setPendingDisable(false)
    setDisableOpen(false)
  }

  async function saveSettings() {
    setError(null)
    setSaved(false)
    if (publicEnabled && !hasSlug) {
      setError(t('errors.slugRequired'))
      return
    }
    setLoading(true)
    try {
      const res = await fetch(`/api/locations/${locationId}/menu/public`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          publicEnabled,
          headerImageFilename,
        }),
      })
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as { message?: string } | null
        const message = data?.message || t('errors.saveFailed')
        if (message.toLowerCase().includes('digital_menu subscription')) {
          throw new Error(t('errors.subscriptionRequired'))
        }
        if (message.toLowerCase().includes('publicslug')) {
          throw new Error(t('errors.slugRequired'))
        }
        throw new Error(message)
      }
      const body = (await res.json()) as {
        publicEnabled?: boolean
        menu?: { headerImageFilename?: string | null }
      }
      if (typeof body.publicEnabled === 'boolean') {
        setPublicEnabled(body.publicEnabled)
        setPersistedPublicEnabled(body.publicEnabled)
      }
      if (body.menu && 'headerImageFilename' in body.menu) {
        setHeaderImageFilename(body.menu.headerImageFilename ?? null)
      }
      setSaved(true)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : t('errors.unknown'))
    } finally {
      setLoading(false)
    }
  }

  async function handleCopyUrl() {
    if (!livePublicPath) return
    try {
      const absolute = `${window.location.origin}${livePublicPath}`
      await navigator.clipboard.writeText(absolute)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
    } catch {
      setCopied(false)
    }
  }

  return (
    <div className="flex flex-col gap-8 lg:flex-row lg:items-start">
      <div className="flex min-w-0 flex-1 flex-col gap-6">
        <section className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold tracking-tight">{t('heading')}</h1>
          <p className="text-muted-foreground text-sm">{t('description')}</p>
        </section>

        <section className="border-border flex max-w-xl flex-col gap-4 rounded-lg border p-4">
          <h2 className="text-base font-semibold">{t('statusTitle')}</h2>
          <FieldGroup>
            <Field orientation="horizontal" className="items-center justify-between gap-4">
              <div className="flex flex-col gap-1">
                <FieldLabel htmlFor="digital-menu-enabled">{t('enabled')}</FieldLabel>
                <p className="text-muted-foreground text-xs">{t('enabledHint')}</p>
              </div>
              <Switch
                id="digital-menu-enabled"
                checked={publicEnabled}
                onCheckedChange={handleEnabledChange}
                disabled={loading || pendingDisable}
              />
            </Field>
            {!hasSlug ? (
              <p className="text-muted-foreground text-sm">
                {t('slugMissingHint')}{' '}
                <Link
                  href={locationBasicsHref}
                  className="text-foreground underline-offset-4 hover:underline"
                >
                  {t('editLocationBasics')}
                </Link>
              </p>
            ) : null}
            {publicEnabled && hasSlug ? (
              <Field>
                <FieldLabel htmlFor="digital-menu-url">{t('publicUrl')}</FieldLabel>
                {needsPublishSave ? (
                  <p className="text-muted-foreground text-xs">{t('saveToPublishHint')}</p>
                ) : null}
                <div className="flex flex-wrap items-center gap-2">
                  <Input
                    id="digital-menu-url"
                    value={livePublicPath ?? routes.public.locationMenu(locationSlug)}
                    readOnly
                    className="font-mono text-xs"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleCopyUrl}
                    disabled={loading || !livePublicPath}
                  >
                    {copied ? t('copiedPublicUrl') : t('copyPublicUrl')}
                  </Button>
                  {livePublicPath ? (
                    <Button asChild type="button" variant="ghost">
                      <Link href={livePublicPath} target="_blank" rel="noreferrer">
                        {t('openPublicUrl')}
                      </Link>
                    </Button>
                  ) : (
                    <Button type="button" variant="ghost" disabled>
                      {t('openPublicUrl')}
                    </Button>
                  )}
                </div>
              </Field>
            ) : null}
            {liveLocationHomePath ? (
              <Field>
                <FieldLabel htmlFor="digital-menu-home-url">{t('locationHomeUrl')}</FieldLabel>
                <div className="flex flex-wrap items-center gap-2">
                  <Input
                    id="digital-menu-home-url"
                    value={liveLocationHomePath}
                    readOnly
                    className="font-mono text-xs"
                  />
                  <Button asChild type="button" variant="ghost">
                    <Link href={liveLocationHomePath} target="_blank" rel="noreferrer">
                      {t('openLocationHome')}
                    </Link>
                  </Button>
                </div>
              </Field>
            ) : null}
            {publicEnabled && livePublicPath ? (
              <Field>
                <FieldLabel htmlFor="digital-menu-table-label">{t('tableLabel')}</FieldLabel>
                <p className="text-muted-foreground text-xs">{t('tableLabelHint')}</p>
                <Input
                  id="digital-menu-table-label"
                  value={tableLabelInput}
                  onChange={(e) => setTableLabelInput(e.target.value)}
                  placeholder={t('tableLabelPlaceholder')}
                  maxLength={64}
                  disabled={loading}
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                />
                {absoluteTableUrl && validatedTableLabel ? (
                  <DigitalMenuQr
                    absoluteUrl={absoluteTableUrl}
                    locationName={locationName}
                    downloadFileName={qrDownloadFileName}
                    showSlugChangedHint={false}
                    title={t('qrTitle')}
                    cta={t('qrCta')}
                    downloadPngLabel={t('qrDownloadPng')}
                    printLabel={t('qrPrint')}
                    ariaLabel={t('qrAriaLabel', { label: validatedTableLabel })}
                    slugChangedHint={t('qrSlugChangedHint')}
                    printTitle={t('qrPrintTitle', {
                      locationName,
                      label: validatedTableLabel,
                    })}
                  />
                ) : (
                  <p className="text-muted-foreground text-xs">{t('qrTableRequiredHint')}</p>
                )}
              </Field>
            ) : null}
          </FieldGroup>
        </section>

        <section className="border-border flex max-w-xl flex-col gap-4 rounded-lg border p-4">
          <h2 className="text-base font-semibold">{t('appearanceTitle')}</h2>
          <Field className="gap-1.5">
            <FieldLabel>{t('headerImage')}</FieldLabel>
            <p className="text-muted-foreground text-xs">{t('headerImageHint')}</p>
            <MediaCatalogPicker
              selectedImage={
                headerImageFilename
                  ? {
                      name: headerImageFilename,
                      url: mediaDownloadHref(headerImageFilename),
                    }
                  : null
              }
              onSelect={(media: MediaCatalogItem) => {
                setHeaderImageFilename(media.name)
                setSaved(false)
              }}
              onClear={() => {
                setHeaderImageFilename(null)
                setSaved(false)
              }}
              disabled={loading}
              pickLabel={t('pickImage')}
              pickerAriaLabel={t('headerImagePickerAria')}
              emptyLabel={t('emptyMedia')}
              removeLabel={t('removeImage')}
              fromMediaLabel={t('fromMedia')}
            />
          </Field>
        </section>

        <section className="border-border flex max-w-xl flex-col gap-3 rounded-lg border p-4">
          <h2 className="text-base font-semibold">{t('menuDataTitle')}</h2>
          <p className="text-muted-foreground text-sm">{t('menuDataHint')}</p>
          <Button asChild variant="outline" className="w-fit">
            <Link href={routes.analytics.branchesMenu(locationId)}>{t('editMenuCta')}</Link>
          </Button>
        </section>

        <div className="flex flex-wrap items-center gap-3">
          <Button type="button" onClick={saveSettings} disabled={loading}>
            {loading ? t('saving') : t('save')}
          </Button>
          {saved ? <p className="text-muted-foreground text-sm">{t('saved')}</p> : null}
          {error ? <p className="text-destructive text-sm">{error}</p> : null}
        </div>
      </div>

      <aside className="border-border flex h-[calc(100svh-6rem)] w-full max-w-xl flex-col gap-3 rounded-lg border p-4 lg:sticky lg:top-4 lg:h-[calc(100svh-5.5rem)] lg:w-[min(42vw,36rem)] lg:max-w-none lg:shrink-0">
        <h2 className="shrink-0 text-base font-semibold">{t('previewTitle')}</h2>
        <div className="bg-muted flex min-h-0 w-full flex-1 items-stretch justify-center overflow-hidden rounded-2xl border border-border">
          {livePublicPath ? (
            <iframe
              title={t('previewTitle')}
              src={livePublicPath}
              className="h-full w-full bg-background"
            />
          ) : (
            <p className="text-muted-foreground px-4 text-center text-xs">
              {!hasSlug
                ? t('slugMissingHint')
                : needsPublishSave
                  ? t('saveToPublishHint')
                  : t('previewPlaceholder')}
            </p>
          )}
        </div>
        {livePublicPath ? (
          <Button asChild variant="secondary" className="w-full shrink-0">
            <Link href={livePublicPath} target="_blank" rel="noreferrer">
              {t('previewOpen')}
            </Link>
          </Button>
        ) : null}
      </aside>

      <AlertDialog
        open={disableOpen}
        onOpenChange={(open) => {
          if (!open) cancelDisable()
          else setDisableOpen(true)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('disableTitle')}</AlertDialogTitle>
            <AlertDialogDescription>{t('disableDescription')}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel type="button" onClick={cancelDisable}>
              {t('disableCancel')}
            </AlertDialogCancel>
            <AlertDialogAction type="button" onClick={confirmDisable}>
              {t('disableConfirm')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
