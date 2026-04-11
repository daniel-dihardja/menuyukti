'use client'

import Image from 'next/image'
import { useCallback, useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'

import { routes } from '@/lib/routes'
import { Button } from '@workspace/ui/components/button'
import { Card, CardContent } from '@workspace/ui/components/card'
import { Skeleton } from '@workspace/ui/components/skeleton'
import Link from 'next/link'

type AssetItem = {
  name: string
  url: string
  size: number
  createdAt: string
}

export type CampaignAssetsTabProps = {
  workflowId: string
  onOpenPrintShop: () => void
  isPlatformAdmin: boolean
  /** When false, role is not known yet — avoid showing the admin-only message prematurely. */
  platformRoleLoaded: boolean
}

export function CampaignAssetsTab({
  workflowId,
  onOpenPrintShop,
  isPlatformAdmin,
  platformRoleLoaded,
}: CampaignAssetsTabProps) {
  const t = useTranslations('analytics.campaigns.workspace')
  const tAssets = useTranslations('assets')
  const [items, setItems] = useState<AssetItem[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/assets/list')
      if (!res.ok) throw new Error('list failed')
      const data = (await res.json()) as { items: AssetItem[] }
      setItems(data.items ?? [])
    } catch {
      setItems([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!platformRoleLoaded || !isPlatformAdmin) {
      setItems([])
      setLoading(false)
      return
    }
    void load()
  }, [isPlatformAdmin, load, platformRoleLoaded])

  if (!platformRoleLoaded) {
    return (
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
        {Array.from({ length: 8 }, (_, i) => (
          <Skeleton className="aspect-square w-full rounded-md" key={`asset-role-skel-${i}`} />
        ))}
      </div>
    )
  }

  if (!isPlatformAdmin) {
    return <p className="text-muted-foreground text-sm text-pretty">{t('assetsTabAdminOnly')}</p>
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-muted-foreground text-sm text-pretty">{t('assetsTabDescription')}</p>
      <div className="flex flex-wrap gap-2">
        <Button asChild variant="outline">
          <Link href={`${routes.studio}?workflowId=${encodeURIComponent(workflowId)}`}>
            {tAssets('title')}
          </Link>
        </Button>
        <Button onClick={onOpenPrintShop} type="button" variant="default">
          {t('orderPrints')}
        </Button>
      </div>
      {loading ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
          {Array.from({ length: 8 }, (_, i) => (
            <Skeleton className="aspect-square w-full rounded-md" key={`asset-skel-${i}`} />
          ))}
        </div>
      ) : items.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center gap-2 py-10 text-center">
            <p className="font-medium">{t('assetsEmpty')}</p>
            <p className="text-muted-foreground text-sm">{t('assetsEmptyHint')}</p>
          </CardContent>
        </Card>
      ) : (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
          {items.map((item) => (
            <li className="min-w-0" key={item.name}>
              <Card className="overflow-hidden py-0">
                <CardContent className="relative aspect-square p-0">
                  <Image
                    alt=""
                    className="object-cover"
                    fill
                    loading="lazy"
                    sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                    src={item.url}
                  />
                </CardContent>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
