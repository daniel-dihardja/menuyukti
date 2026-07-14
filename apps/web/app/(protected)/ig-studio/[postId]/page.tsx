import { getTranslations } from 'next-intl/server'
import type { Metadata } from 'next'
import { auth } from '@clerk/nextjs/server'
import { notFound } from 'next/navigation'
import { z } from 'zod'

import { AnalyticsPageShell } from '@/components/analytics-page-shell'
import { PostCreatorDynamic } from '@/app/(protected)/canvas/post-creator/post-creator-dynamic'
import { routes } from '@/lib/routes'

const postIdParamSchema = z.string().regex(/^\d+$/, 'Invalid post id')

type PageProps = {
  params: Promise<{ postId: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const t = await getTranslations('postCreator')
  const { postId: rawId } = await params
  const parsed = postIdParamSchema.safeParse(rawId)
  if (!parsed.success) {
    return { title: t('title') }
  }
  return {
    title: t('title'),
    description: t('description'),
    openGraph: { title: t('title'), description: t('description') },
  }
}

export default async function Page({ params }: PageProps) {
  const tPosts = await getTranslations('posts')
  const tPostCreator = await getTranslations('postCreator')
  const { isAuthenticated, userId } = await auth()
  if (!isAuthenticated || !userId) {
    throw new Error('Invariant: expected authenticated session under (protected) layout')
  }

  const { postId: rawId } = await params
  const parsed = postIdParamSchema.safeParse(rawId)
  if (!parsed.success) {
    notFound()
  }

  return (
    <AnalyticsPageShell
      title={tPostCreator('title')}
      breadcrumbs={[
        { label: tPosts('title'), href: routes.igStudio },
        { label: tPostCreator('title') },
      ]}
      contentWidth="full"
      mainClassName="flex min-h-0 min-h-[24rem] w-full flex-1 flex-col"
    >
      <PostCreatorDynamic postId={parsed.data} />
    </AnalyticsPageShell>
  )
}
