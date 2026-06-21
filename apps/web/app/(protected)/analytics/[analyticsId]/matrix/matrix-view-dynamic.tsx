'use client'

import dynamic from 'next/dynamic'

import { Skeleton } from '@workspace/ui/components/skeleton'

import type { ComponentProps } from 'react'
import type { MatrixView } from './matrix-view'

const MatrixViewLazy = dynamic(() => import('./matrix-view').then((m) => m.MatrixView), {
  loading: () => <Skeleton className="min-h-[24rem] w-full rounded-lg" />,
})

export function MatrixViewDynamic(props: ComponentProps<typeof MatrixView>) {
  return <MatrixViewLazy {...props} />
}
