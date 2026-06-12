import { Card, CardDescription, CardHeader, CardTitle } from '@workspace/ui/components/card'
import { Camera, Upload } from 'lucide-react'

import { AnalyticsIllustration } from '@/app/_components/landing/section-illustrations'

export type LandingSharedWorkspacePersona = {
  title: string
  description: string
}

type LandingSharedWorkspaceProps = {
  title: string
  subtitle: string
  owner: LandingSharedWorkspacePersona
  partner: LandingSharedWorkspacePersona
}

export function LandingSharedWorkspace({
  title,
  subtitle,
  owner,
  partner,
}: LandingSharedWorkspaceProps) {
  return (
    <section
      id="shared-workspace"
      className="bg-background py-16 md:py-20"
      aria-labelledby="shared-workspace-heading"
    >
      <div className="mx-auto max-w-6xl px-6">
        <div className="mx-auto max-w-3xl text-center">
          <h2
            id="shared-workspace-heading"
            className="text-balance text-3xl font-bold leading-tight md:text-4xl md:leading-tight"
          >
            {title}
          </h2>
          <p className="mt-5 text-pretty text-base leading-relaxed text-foreground/80 md:text-lg">
            {subtitle}
          </p>
        </div>

        <div className="mt-12 grid items-center gap-10 lg:grid-cols-2 lg:gap-12">
          <div className="grid gap-6">
            <Card className="shadow-none">
              <CardHeader className="gap-3">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-md bg-primary/10">
                  <Upload className="size-5 text-primary" aria-hidden />
                </div>
                <CardTitle className="text-lg leading-snug">{owner.title}</CardTitle>
                <CardDescription className="text-pretty text-base leading-relaxed">
                  {owner.description}
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="shadow-none">
              <CardHeader className="gap-3">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-md bg-primary/10">
                  <Camera className="size-5 text-primary" aria-hidden />
                </div>
                <CardTitle className="text-lg leading-snug">{partner.title}</CardTitle>
                <CardDescription className="text-pretty text-base leading-relaxed">
                  {partner.description}
                </CardDescription>
              </CardHeader>
            </Card>
          </div>

          <div className="hidden lg:block" aria-hidden>
            <AnalyticsIllustration />
          </div>
        </div>
      </div>
    </section>
  )
}
