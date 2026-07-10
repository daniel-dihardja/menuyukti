import { Suspense } from 'react'
import { getTranslations } from 'next-intl/server'
import type { Metadata } from 'next'
import { auth } from '@clerk/nextjs/server'

import { AnalyticsPageShell } from '@/components/analytics-page-shell'
import { PageHeading } from '@/components/page-heading'
import { graphqlQuery } from '@/lib/graphql/client'
import { POSTS_QUERY, type PostsData } from '@/lib/graphql/queries/posts'
import { routes } from '@/lib/routes'
import { ANALYTICS_REPORT_SHELL_MAIN_CLASS, ANALYTICS_REPORT_SECTION_CLASS } from '@/lib/app-layout'
import { cn } from '@workspace/ui/lib/utils'

import { CreatePostButton } from './_components/create-post-button'
import { PostsTable, type PostListItem } from './_components/posts-table'
import PostsLoading from './loading'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('posts')
  const title = t('title')
  const description = t('description')
  return { title, description, openGraph: { title, description } }
}

async function PostsPageData() {
  const { isAuthenticated, userId } = await auth()
  if (!isAuthenticated || !userId) {
    throw new Error('Invariant: expected authenticated session under (protected) layout')
  }

  const data = await graphqlQuery<PostsData>(POSTS_QUERY, { first: 100 }, userId)
  const posts: PostListItem[] = (data.posts ?? []).map((post) => ({
    id: post.id,
    title: post.title,
    status: post.status,
    updatedAt: post.updatedAt,
  }))

  return <PostsTable posts={posts} />
}

export default async function Page() {
  const t = await getTranslations('posts')

  return (
    <AnalyticsPageShell
      title={t('title')}
      breadcrumbs={[{ label: t('title'), href: routes.igStudio }]}
      mainClassName={ANALYTICS_REPORT_SHELL_MAIN_CLASS}
    >
      <section className={cn('flex flex-col gap-4', ANALYTICS_REPORT_SECTION_CLASS)}>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <PageHeading title={t('title')} description={t('description')} />
          <CreatePostButton />
        </div>
        <Suspense fallback={<PostsLoading />}>
          <PostsPageData />
        </Suspense>
      </section>
    </AnalyticsPageShell>
  )
}
