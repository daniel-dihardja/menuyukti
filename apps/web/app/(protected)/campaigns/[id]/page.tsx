export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

import { auth } from '@clerk/nextjs/server'
import { getTranslations } from 'next-intl/server'
import type { Metadata } from 'next'
import { notFound, redirect } from 'next/navigation'
import { routes } from '@/lib/routes'
import { AnalyticsPageShell } from '@/components/analytics-page-shell'
import { CampaignChatPanel } from '../_components/campaign-chat-panel'

type PageProps = {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id: rawId } = await params
  const campaignIdNum = Number(rawId)
  if (!Number.isInteger(campaignIdNum) || campaignIdNum <= 0) {
    return { title: 'Campaign' }
  }
  const tChat = await getTranslations('analytics.campaigns.chat')
  const title = tChat('pageTitle', { id: campaignIdNum })
  return { title }
}

export default async function Page({ params }: PageProps) {
  const { userId: authUserId } = await auth()
  if (!authUserId) {
    redirect(routes.login)
  }

  const { id: rawId } = await params
  const campaignIdNum = Number(rawId)
  if (!Number.isInteger(campaignIdNum) || campaignIdNum <= 0) {
    notFound()
  }

  const tCampaigns = await getTranslations('analytics.campaigns')
  const tChat = await getTranslations('analytics.campaigns.chat')
  const title = tChat('pageTitle', { id: campaignIdNum })

  return (
    <AnalyticsPageShell
      title={title}
      breadcrumbs={[
        { label: tCampaigns('title'), href: routes.campaigns.list },
        { label: title },
      ]}
      mainClassName="max-w-none w-full h-[calc(100vh-4rem)] min-h-[24rem]"
    >
      <CampaignChatPanel campaignId={campaignIdNum} />
    </AnalyticsPageShell>
  )
}
