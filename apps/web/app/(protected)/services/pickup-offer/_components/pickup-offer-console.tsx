'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'

import { Badge } from '@workspace/ui/components/badge'
import { Button } from '@workspace/ui/components/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@workspace/ui/components/card'
import { DateTimePicker } from '@workspace/ui/components/date-time-picker'
import { Field, FieldDescription, FieldLabel } from '@workspace/ui/components/field'
import { Input } from '@workspace/ui/components/input'
import { Textarea } from '@workspace/ui/components/textarea'
import { GuestSurfacePreview } from '@/components/services/guest-surface-preview'
import type { PickupOffer } from '@/lib/graphql/queries/pickup-offers'
import { routes } from '@/lib/routes'

type Props = {
  locationId: number
  locationCurrency: string | null
  initialPublicSlug: string | null
  initialOffers: PickupOffer[]
}

function toLocalDatetimeValue(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function defaultFromLocal(): string {
  return toLocalDatetimeValue(new Date().toISOString())
}

function defaultUntilLocal(): string {
  const d = new Date(Date.now() + 2 * 60 * 60 * 1000)
  return toLocalDatetimeValue(d.toISOString())
}

function formatWindow(fromIso: string, untilIso: string): string {
  const from = new Date(fromIso)
  const until = new Date(untilIso)
  if (Number.isNaN(from.getTime()) || Number.isNaN(until.getTime())) return ''
  return `${from.toLocaleString()} – ${until.toLocaleString()}`
}

export function PickupOfferConsole({
  locationId,
  locationCurrency,
  initialPublicSlug,
  initialOffers,
}: Props) {
  const t = useTranslations('services.pickupOffer.console')
  const router = useRouter()
  const [offers, setOffers] = useState(initialOffers)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [availableFrom, setAvailableFrom] = useState(defaultFromLocal)
  const [availableUntil, setAvailableUntil] = useState(defaultUntilLocal)
  const [price, setPrice] = useState('')
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<number | null>(null)
  const [copiedKey, setCopiedKey] = useState<string | null>(null)
  const [previewNonce, setPreviewNonce] = useState(0)

  useEffect(() => {
    setOffers(initialOffers)
  }, [initialOffers])

  const locationSlug = initialPublicSlug?.trim() || ''
  const livePath = locationSlug ? routes.public.locationPickupOffer(locationSlug) : null
  const openOffer = offers.find((o) => o.status === 'open' && o.isLive)
  const hasBlockingOpen = offers.some((o) => o.status === 'open')

  function bumpPreview() {
    setPreviewNonce((n) => n + 1)
  }

  async function handleCopyPath(path: string, key: string) {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}${path}`)
      setCopiedKey(key)
      window.setTimeout(() => setCopiedKey(null), 2000)
    } catch {
      setCopiedKey(null)
    }
  }

  async function handleCreate() {
    setCreateError(null)
    const cleanedTitle = title.trim()
    if (!cleanedTitle) {
      setCreateError(t('titleRequired'))
      return
    }
    const from = new Date(availableFrom)
    const until = new Date(availableUntil)
    if (Number.isNaN(from.getTime()) || Number.isNaN(until.getTime())) {
      setCreateError(t('windowRequired'))
      return
    }
    if (until.getTime() <= from.getTime()) {
      setCreateError(t('untilAfterFrom'))
      return
    }
    if (until.getTime() <= Date.now()) {
      setCreateError(t('untilInFuture'))
      return
    }

    let priceValue: number | null = null
    if (price.trim()) {
      const parsed = Number(price)
      if (!Number.isFinite(parsed) || parsed < 0) {
        setCreateError(t('priceInvalid'))
        return
      }
      priceValue = parsed
    }

    setCreating(true)
    try {
      const res = await fetch('/api/services/pickup-offer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          locationId,
          title: cleanedTitle,
          description: description.trim(),
          availableFrom: from.toISOString(),
          availableUntil: until.toISOString(),
          price: priceValue,
        }),
      })
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { message?: string } | null
        throw new Error(body?.message || t('createFailed'))
      }
      const created = (await res.json()) as PickupOffer
      setOffers((prev) => [created, ...prev])
      setTitle('')
      setDescription('')
      setPrice('')
      setAvailableFrom(defaultFromLocal())
      setAvailableUntil(defaultUntilLocal())
      bumpPreview()
      router.refresh()
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : t('createFailed'))
    } finally {
      setCreating(false)
    }
  }

  async function handleClose(offerId: number) {
    setActionError(null)
    setBusyId(offerId)
    try {
      const res = await fetch('/api/services/pickup-offer', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'close', offerId }),
      })
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { message?: string } | null
        throw new Error(body?.message || t('closeFailed'))
      }
      const closed = (await res.json()) as PickupOffer
      setOffers((prev) => prev.map((o) => (o.id === closed.id ? closed : o)))
      bumpPreview()
      router.refresh()
    } catch (err) {
      setActionError(err instanceof Error ? err.message : t('closeFailed'))
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div className="flex flex-col gap-8 lg:flex-row lg:items-start">
      <div className="flex min-w-0 max-w-2xl flex-1 flex-col gap-6">
        <Card>
          <CardHeader>
            <CardTitle>{t('guestLinkTitle')}</CardTitle>
            <CardDescription>{t('guestLinkDescription')}</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {livePath ? (
              <div className="flex flex-wrap items-center gap-2">
                <code className="bg-muted rounded px-2 py-1 text-xs">{livePath}</code>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => void handleCopyPath(livePath, 'pickup')}
                >
                  {copiedKey === 'pickup' ? t('copiedLink') : t('copyLink')}
                </Button>
                <Button asChild variant="ghost" size="sm">
                  <Link href={livePath} target="_blank" rel="noreferrer">
                    {t('openLive')}
                  </Link>
                </Button>
              </div>
            ) : (
              <p className="text-muted-foreground text-sm">
                {t('slugMissing')}{' '}
                <Link
                  href={routes.analytics.branchesDetail(locationId)}
                  className="underline underline-offset-4"
                >
                  {t('setSlugCta')}
                </Link>
              </p>
            )}
            {openOffer ? (
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <Badge variant="secondary">{t('liveBadge')}</Badge>
                <span className="font-medium">{openOffer.title}</span>
                <span className="text-muted-foreground">
                  {formatWindow(openOffer.availableFrom, openOffer.availableUntil)}
                </span>
              </div>
            ) : (
              <p className="text-muted-foreground text-sm">{t('noLiveOffer')}</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t('createTitle')}</CardTitle>
            <CardDescription>{t('createDescription')}</CardDescription>
          </CardHeader>
          <CardContent className="flex max-w-xl flex-col gap-4">
            {hasBlockingOpen ? (
              <p className="text-muted-foreground text-sm">{t('oneOpenHint')}</p>
            ) : null}
            <Field>
              <FieldLabel htmlFor="pickup-title">{t('titleLabel')}</FieldLabel>
              <Input
                id="pickup-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={t('titlePlaceholder')}
                disabled={creating || hasBlockingOpen}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="pickup-description">{t('descriptionLabel')}</FieldLabel>
              <Textarea
                id="pickup-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={t('descriptionPlaceholder')}
                disabled={creating || hasBlockingOpen}
                rows={4}
              />
              <FieldDescription>{t('descriptionHint')}</FieldDescription>
            </Field>
            <Field>
              <FieldLabel htmlFor="pickup-from">{t('availableFromLabel')}</FieldLabel>
              <DateTimePicker
                id="pickup-from"
                value={availableFrom}
                onChange={setAvailableFrom}
                disabled={creating || hasBlockingOpen}
                placeholder={t('availableFromPlaceholder')}
                timeLabel={t('availableFromTimeLabel')}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="pickup-until">{t('availableUntilLabel')}</FieldLabel>
              <DateTimePicker
                id="pickup-until"
                value={availableUntil}
                onChange={setAvailableUntil}
                disabled={creating || hasBlockingOpen}
                placeholder={t('availableUntilPlaceholder')}
                timeLabel={t('availableUntilTimeLabel')}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="pickup-price">{t('priceLabel')}</FieldLabel>
              <Input
                id="pickup-price"
                type="number"
                min={0}
                step="0.01"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder={t('pricePlaceholder')}
                disabled={creating || hasBlockingOpen}
              />
              <FieldDescription>
                {locationCurrency
                  ? t('priceHintWithCurrency', { currency: locationCurrency })
                  : t('priceHint')}
              </FieldDescription>
            </Field>
            {createError ? <p className="text-destructive text-sm">{createError}</p> : null}
            <Button
              type="button"
              className="w-fit"
              disabled={creating || hasBlockingOpen}
              onClick={() => void handleCreate()}
            >
              {creating ? t('creating') : t('createCta')}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t('listTitle')}</CardTitle>
            <CardDescription>{t('listDescription')}</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {actionError ? <p className="text-destructive text-sm">{actionError}</p> : null}
            {offers.length === 0 ? (
              <p className="text-muted-foreground text-sm">{t('listEmpty')}</p>
            ) : (
              <ul className="border-border divide-border divide-y rounded-lg border">
                {offers.map((offer) => {
                  const busy = busyId === offer.id
                  return (
                    <li
                      key={offer.id}
                      className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="flex min-w-0 flex-col gap-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-sm font-medium">{offer.title}</span>
                          {offer.isLive ? (
                            <Badge variant="secondary">{t('liveBadge')}</Badge>
                          ) : (
                            <Badge variant="outline">{offer.status}</Badge>
                          )}
                        </div>
                        <p className="text-muted-foreground text-xs">
                          {formatWindow(offer.availableFrom, offer.availableUntil)}
                          {offer.price != null
                            ? ` · ${offer.price}${locationCurrency ? ` ${locationCurrency}` : ''}`
                            : ''}
                        </p>
                        {offer.description ? (
                          <p className="text-muted-foreground line-clamp-2 text-xs">
                            {offer.description}
                          </p>
                        ) : null}
                      </div>
                      {offer.status === 'open' ? (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={busy}
                          onClick={() => void handleClose(offer.id)}
                        >
                          {busy ? t('closing') : t('closeCta')}
                        </Button>
                      ) : null}
                    </li>
                  )
                })}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <GuestSurfacePreview
        livePath={livePath}
        previewKey={previewNonce}
        title={t('previewTitle')}
        openLabel={t('previewOpen')}
        placeholder={
          <p className="text-muted-foreground max-w-xs text-sm">{t('previewPlaceholder')}</p>
        }
      />
    </div>
  )
}
