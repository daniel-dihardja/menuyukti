'use client'

import dynamic from 'next/dynamic'

import { Skeleton } from '@workspace/ui/components/skeleton'

import type { ComponentProps } from 'react'
import type { MenuCombosView } from './menu-combos-view'

const MenuCombosViewLazy = dynamic(
  () => import('./menu-combos-view').then((m) => m.MenuCombosView),
  {
    loading: () => <Skeleton className="min-h-[24rem] w-full rounded-lg" />,
  },
)

export function MenuCombosViewDynamic(props: ComponentProps<typeof MenuCombosView>) {
  return <MenuCombosViewLazy {...props} />
}
