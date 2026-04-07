'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useCallback, useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'

import { routes } from '@/lib/routes'
import { Card, CardContent } from '@workspace/ui/components/card'
import { Skeleton } from '@workspace/ui/components/skeleton'

type AssetItem = {
  name: string
  url: string
}

const PREVIEW_COUNT = 6

export function DashboardRecentAssets() {
  const t = useTranslations('platform.dashboard')
  const [items, setItems] = useState<AssetItem[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/assets/list')
      if (!res.ok) throw new Error('list failed')
      const data = (await res.json()) as { items: AssetItem[] }
      setItems((data.items ?? []).slice(0, PREVIEW_COUNT))
    } catch {
      setItems([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  if (loading) {
    return (
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
        {Array.from({ length: PREVIEW_COUNT }, (_, i) => (
          <Skeleton className="aspect-square w-full rounded-md" key={`dash-asset-skel-${i}`} />
        ))}
      </div>
    )
  }

  if (items.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="py-8 text-center text-muted-foreground text-sm">
          {t('assetsEmpty')}
        </CardContent>
      </Card>
    )
  }

  return (
    <ul className="grid grid-cols-3 gap-2 sm:grid-cols-6">
      {items.map((item) => (
        <li className="min-w-0" key={item.name}>
          <Link
            className="relative block aspect-square overflow-hidden rounded-md border transition-opacity hover:opacity-90"
            href={routes.studio}
          >
            <Image alt={item.name} className="object-cover" fill sizes="120px" src={item.url} />
          </Link>
        </li>
      ))}
    </ul>
  )
}
