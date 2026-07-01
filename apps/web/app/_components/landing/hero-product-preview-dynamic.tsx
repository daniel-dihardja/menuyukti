'use client'

import dynamic from 'next/dynamic'

import { Skeleton } from '@workspace/ui/components/skeleton'

import type { HeroProductPreviewProps } from './hero-product-preview'

const HeroProductPreview = dynamic(
  () => import('./hero-product-preview').then((m) => m.HeroProductPreview),
  {
    ssr: false,
    loading: () => (
      <Skeleton className="h-[min(34dvh,16rem)] w-full rounded-3xl sm:h-[min(38dvh,20rem)] md:h-[min(42dvh,24rem)] lg:h-[min(46dvh,28rem)] xl:h-[min(50dvh,32rem)]" />
    ),
  },
)

export function HeroProductPreviewDynamic(props: HeroProductPreviewProps) {
  return <HeroProductPreview {...props} />
}
