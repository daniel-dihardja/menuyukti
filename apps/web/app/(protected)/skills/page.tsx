import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'

import { AnalyticsPageShell } from '@/components/analytics-page-shell'
import { PageHeading } from '@/components/page-heading'
import { MILESTONE_PRESET_RUN_REGISTRY } from '@/lib/milestone-run-skill-registry'
import { CHAT_TOOLS_REGISTRY } from '@/lib/milestone-run-tools-registry'
import { routes } from '@/lib/routes'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@workspace/ui/components/card'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('skillsPage')
  const title = t('title')
  const description = t('description')
  return {
    title,
    description,
    openGraph: { title, description },
  }
}

function SkillOrToolList({
  items,
}: {
  items: readonly { id: string; name: string; description: string }[]
}) {
  return (
    <ul className="flex flex-col gap-4">
      {items.map((item) => (
        <li key={item.id}>
          <Card>
            <CardHeader className="flex flex-col gap-1 pb-2">
              <CardTitle className="text-base leading-snug">{item.name}</CardTitle>
              <CardDescription className="font-mono text-xs">{item.id}</CardDescription>
            </CardHeader>
            <CardContent className="text-muted-foreground text-sm leading-relaxed">
              {item.description}
            </CardContent>
          </Card>
        </li>
      ))}
    </ul>
  )
}

export default async function SkillsAndToolsPage() {
  const [t, tDash] = await Promise.all([
    getTranslations('skillsPage'),
    getTranslations('platform.dashboard'),
  ])

  return (
    <AnalyticsPageShell
      title={t('title')}
      breadcrumbs={[{ label: tDash('title'), href: routes.dashboard }, { label: t('title') }]}
    >
      <PageHeading description={t('description')} title={t('title')} />

      <section className="flex flex-col gap-4" aria-labelledby="skills-heading">
        <h2 id="skills-heading" className="font-semibold text-lg tracking-tight">
          {t('skillsHeading')}
        </h2>
        <SkillOrToolList items={MILESTONE_PRESET_RUN_REGISTRY} />
      </section>

      <section className="mt-10 flex flex-col gap-4" aria-labelledby="tools-heading">
        <h2 id="tools-heading" className="font-semibold text-lg tracking-tight">
          {t('toolsHeading')}
        </h2>
        <p className="text-muted-foreground text-sm leading-relaxed">{t('toolsDescription')}</p>
        <SkillOrToolList items={CHAT_TOOLS_REGISTRY} />
      </section>
    </AnalyticsPageShell>
  )
}
