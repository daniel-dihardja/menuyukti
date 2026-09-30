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
  const t = useTranslations('services.digitalMenu.enable')
  const router = useRouter()
  const [locationId, setLocationId] = useState<string>(
    locations.length === 1 ? String(locations[0]!.id) : '',
  )

  function handleConfirm() {
    const id = Number(locationId)
    if (!Number.isInteger(id) || id < 1) return
    onOpenChange(false)
    router.push(routes.servicesDigitalMenuLocation(id))
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
            <FieldLabel htmlFor="enable-digital-menu-location">{t('locationLabel')}</FieldLabel>
            <Select value={locationId} onValueChange={setLocationId}>
              <SelectTrigger id="enable-digital-menu-location" className="w-full">
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

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            {t('cancel')}
          </Button>
          {locations.length > 0 ? (
            <Button type="button" onClick={handleConfirm} disabled={!locationId}>
              {t('confirm')}
            </Button>
          ) : null}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
