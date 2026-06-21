'use client'

import dynamic from 'next/dynamic'

import { Skeleton } from '@workspace/ui/components/skeleton'

import type { ComponentProps } from 'react'
import type { HeatmapView } from './heatmap-view'

const HeatmapViewLazy = dynamic(() => import('./heatmap-view').then((m) => m.HeatmapView), {
  loading: () => <Skeleton className="min-h-[24rem] w-full rounded-lg" />,
})

export function HeatmapViewDynamic(props: ComponentProps<typeof HeatmapView>) {
  return <HeatmapViewLazy {...props} />
}
