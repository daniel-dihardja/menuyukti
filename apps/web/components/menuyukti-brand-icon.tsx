import { Target } from 'lucide-react'

import { cn } from '@workspace/ui/lib/utils'

type MenuyuktiBrandIconProps = {
  className?: string
}

/** Shared Menuyukti mark — round target for analytics focus. */
export function MenuyuktiBrandIcon({ className }: MenuyuktiBrandIconProps) {
  return <Target className={cn('shrink-0', className)} aria-hidden />
}
