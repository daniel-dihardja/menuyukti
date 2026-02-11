export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { SidebarInset } from "@workspace/ui/components/sidebar";
import { SidebarTriggerClient } from "@/components/sidebar-trigger-client";
import { Card, CardContent, CardHeader, CardTitle } from "@workspace/ui/components/card";
import { Badge } from "@workspace/ui/components/badge";
import Link from "next/link";
import { routes } from "@/lib/routes";
import { getTranslations } from "next-intl/server";
import agents from "@/lib/agents.json";

export default async function Page() {
  const t = await getTranslations("agents");

  return (
    <SidebarInset>
      <div className="w-full">
        <SidebarTriggerClient
          title={t("title")}
          breadcrumbs={[{ label: t("title") }]}
        />

        <main className="mx-auto max-w-6xl p-4 space-y-6">
          <header className="space-y-1">
            <h1 className="text-2xl font-semibold">{t("title")}</h1>
            <p className="text-sm text-muted-foreground">{t("description")}</p>
          </header>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {agents.map((agent) => (
              <Link
                key={agent.id}
                href={routes.agents.detail(agent.id)}
                className="group"
              >
                <Card className="h-full transition-colors group-hover:border-foreground/30">
                  <CardHeader className="space-y-1">
                    <CardTitle className="flex items-center justify-between">
                      <span>{agent.name}</span>
                      <Badge variant="secondary" className="capitalize">
                        {agent.status}
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm text-muted-foreground">
                    {agent.description}
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </main>
      </div>
    </SidebarInset>
  );
}
