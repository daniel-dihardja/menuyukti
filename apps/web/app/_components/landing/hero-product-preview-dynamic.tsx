'use client'

import dynamic from 'next/dynamic'

import { Skeleton } from '@workspace/ui/components/skeleton'

import type { HeroProductPreviewProps } from './hero-product-preview'

const HeroProductPreview = dynamic(
  () => import('./hero-product-preview').then((m) => m.HeroProductPreview),
  {
    ssr: false,
    loading: () => <Skeleton className="aspect-video w-full rounded-xl" />,
  },
)

export function HeroProductPreviewDynamic(props: HeroProductPreviewProps) {
  return <HeroProductPreview {...props} />
}
