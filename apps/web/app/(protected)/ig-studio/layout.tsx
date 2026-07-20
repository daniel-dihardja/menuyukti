import { requireMenuyuktiAdmin } from '@/lib/menuyukti-role-server'
import { ANALYTICS_PAGE_SHELL_PADDING_CLASS } from '@/lib/app-layout'
import { cn } from '@workspace/ui/lib/utils'

import { IgStudioSubnav } from './_components/ig-studio-subnav'

export default async function PostsLayout({ children }: { children: React.ReactNode }) {
  await requireMenuyuktiAdmin()
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <div className={cn(ANALYTICS_PAGE_SHELL_PADDING_CLASS, 'pb-0 pt-4 lg:pb-0')}>
        <IgStudioSubnav />
      </div>
      {children}
    </div>
  )
}
