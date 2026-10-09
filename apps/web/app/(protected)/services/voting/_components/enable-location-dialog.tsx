'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import Link from 'next/link'

import { Button } from '@workspace/ui/components/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@workspace/ui/components/dialog'
import { Field, FieldLabel } from '@workspace/ui/components/field'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@workspace/ui/components/select'
import { SERVICE_KEY_VOTING } from '@/lib/graphql/queries/service-subscriptions'
import { routes } from '@/lib/routes'

export type EnableLocationOption = {
  id: number
  name: string
}

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  locations: EnableLocationOption[]
}

export function EnableLocationDialog({ open, onOpenChange, locations }: Props) {
  const t = useTranslations('services.voting.enable')
  const router = useRouter()
  const [locationId, setLocationId] = useState<string>(
    locations.length === 1 ? String(locations[0]!.id) : '',
  )
  const [isActivating, setIsActivating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleConfirm() {
    const id = Number(locationId)
    if (!Number.isInteger(id) || id < 1) return
    setError(null)
    setIsActivating(true)
    try {
      const res = await fetch('/api/services/subscriptions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          locationId: id,
          serviceKey: SERVICE_KEY_VOTING,
        }),
      })
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { message?: string } | null
        throw new Error(body?.message || t('activateFailed'))
      }
      onOpenChange(false)
      router.push(routes.servicesVotingLocation(id))
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : t('activateFailed'))
    } finally {
      setIsActivating(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('title')}</DialogTitle>
          <DialogDescription>{t('description')}</DialogDescription>
        </DialogHeader>

        {locations.length === 0 ? (
          <div className="flex flex-col gap-3">
            <p className="text-muted-foreground text-sm">{t('noLocations')}</p>
            <Button asChild variant="secondary">
              <Link href={routes.analytics.branches}>{t('createLocationCta')}</Link>
            </Button>
          </div>
        ) : (
          <Field>
            <FieldLabel htmlFor="enable-voting-location">{t('locationLabel')}</FieldLabel>
            <Select value={locationId} onValueChange={setLocationId} disabled={isActivating}>
              <SelectTrigger id="enable-voting-location" className="w-full">
                <SelectValue placeholder={t('locationPlaceholder')} />
              </SelectTrigger>
              <SelectContent>
                {locations.map((location) => (
                  <SelectItem key={location.id} value={String(location.id)}>
                    {location.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        )}

        {error ? <p className="text-destructive text-sm">{error}</p> : null}

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isActivating}
          >
            {t('cancel')}
          </Button>
          {locations.length > 0 ? (
            <Button
              type="button"
              onClick={() => void handleConfirm()}
              disabled={isActivating || !locationId}
            >
              {isActivating ? t('activating') : t('confirm')}
            </Button>
          ) : null}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
