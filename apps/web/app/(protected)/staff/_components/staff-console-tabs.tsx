'use client'

import { useTranslations } from 'next-intl'

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@workspace/ui/components/tabs'

import { StaffDevDataForm } from './staff-dev-data-form'
import { StaffProvisionWorkspaceForm } from './staff-provision-workspace-form'
import { StaffWorkspacePlanForm } from './staff-workspace-plan-form'

export function StaffConsoleTabs() {
  const t = useTranslations('staff')

  return (
    <Tabs defaultValue="workspaces" className="w-full">
      <TabsList variant="line" className="w-full justify-start" aria-label={t('tabsAria')}>
        <TabsTrigger value="workspaces">{t('tabs.workspaces')}</TabsTrigger>
        <TabsTrigger value="mockData">{t('tabs.mockData')}</TabsTrigger>
      </TabsList>

      <TabsContent value="workspaces" className="mt-4 space-y-6">
        <StaffProvisionWorkspaceForm />
        <StaffWorkspacePlanForm />
      </TabsContent>

      <TabsContent value="mockData" className="mt-4">
        <StaffDevDataForm />
      </TabsContent>
    </Tabs>
  )
}
