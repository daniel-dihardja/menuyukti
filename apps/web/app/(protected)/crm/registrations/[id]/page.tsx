import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { auth } from '@clerk/nextjs/server'
import { getTranslations } from 'next-intl/server'

import { AnalyticsPageShell } from '@/components/analytics-page-shell'
import { graphqlQuery } from '@/lib/graphql/client'
import { CRM_APP_QUERY, type CrmAppData } from '@/lib/graphql/queries/crm-apps'
import { CRM_CUSTOMER_QUERY, type CrmCustomerData } from '@/lib/graphql/queries/crm-registrations'
import { routes } from '@/lib/routes'

import { RegistrationDetailClient } from './_components/registration-detail-client'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

type PageProps = {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params
  const t = await getTranslations('platform.crm.registrations')

  if (!UUID_RE.test(id)) {
    return { title: t('detailTitle') }
  }

  const { isAuthenticated, userId } = await auth()
  if (!isAuthenticated || !userId) {
    return { title: t('detailTitle') }
  }

  const data = await graphqlQuery<CrmCustomerData>(CRM_CUSTOMER_QUERY, { id }, userId)
  const title = data.crmCustomer?.id ?? t('detailTitle')
  const description = t('detailDescription')
  return { title, description, openGraph: { title, description } }
}

export default async function CrmRegistrationDetailPage({ params }: PageProps) {
  const { id } = await params
  if (!UUID_RE.test(id)) {
    notFound()
  }

  const { isAuthenticated, userId } = await auth()
  if (!isAuthenticated || !userId) {
    throw new Error('Invariant: expected authenticated session under (protected) layout')
  }

  const customerData = await graphqlQuery<CrmCustomerData>(CRM_CUSTOMER_QUERY, { id }, userId)
  const customer = customerData.crmCustomer
  if (!customer) {
    notFound()
  }

  const appData = await graphqlQuery<CrmAppData>(CRM_APP_QUERY, { id: customer.appId }, userId)
  if (!appData.crmApp) {
    notFound()
  }

  const t = await getTranslations('platform.crm')
  const tRegistrations = await getTranslations('platform.crm.registrations')

  return (
    <AnalyticsPageShell
      title={customer.id}
      breadcrumbs={[
        { label: t('breadcrumb'), href: routes.crm },
        {
          label: tRegistrations('breadcrumb'),
          href: routes.crmRegistrationsWithApp(customer.appId),
        },
        { label: customer.id },
      ]}
    >
      <div className="space-y-2">
        <h1 className="break-all font-mono text-2xl font-semibold tracking-tight">{customer.id}</h1>
        <p className="text-sm text-muted-foreground">{tRegistrations('detailDescription')}</p>
        <div className="pt-4">
          <RegistrationDetailClient
            initialCustomer={customer}
            cashbackRules={{
              cashbackThresholdAmount: appData.crmApp.cashbackThresholdAmount,
              cashbackPercent: appData.crmApp.cashbackPercent,
            }}
          />
        </div>
      </div>
    </AnalyticsPageShell>
  )
}
