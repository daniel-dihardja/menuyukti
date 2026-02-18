export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { SidebarInset } from "@workspace/ui/components/sidebar";
import { SidebarTriggerClient } from "@/components/sidebar-trigger-client";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@workspace/ui/components/card";
import { Badge } from "@workspace/ui/components/badge";
import Link from "next/link";
import Image from "next/image";
import { routes } from "@/lib/routes";
import { getTranslations } from "next-intl/server";
import agents from "@/lib/agents.json";
import type { AgentDefinition } from "@/lib/agent-definitions";
import { ChevronRight } from "lucide-react";

export default async function Page() {
  const t = await getTranslations("agents");
  const agentDefinitions = agents as AgentDefinition[];

  const personaLabel: Record<AgentDefinition["persona"], string> = {
    marketer: "marketer",
    analyst: "analyst",
    shared: "shared",
    ops: "ops",
  };

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
            {agentDefinitions.map((agent) => {
              const isReady = agent.status === "ready";
              const card = (
                <Card
                  data-agent-card={agent.id}
                  className={`h-full gap-0 py-0 transition-colors ${
                    isReady ? "group-hover:border-foreground/30" : "opacity-80"
                  }`}
                >
                  <div className="relative aspect-[16/9] w-full overflow-hidden border-b bg-muted">
                    <Image
                      src={agent.imageUrl}
                      alt={`${agent.name} preview`}
                      fill
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                      className="object-cover"
                    />
                  </div>
                  <CardHeader className="space-y-2 px-5 pt-5">
                    <CardTitle className="flex items-center justify-between">
                      <span>{agent.name}</span>
                      <Badge
                        variant="secondary"
                        className="capitalize"
                        data-agent-status={agent.status}
                      >
                        {agent.status}
                      </Badge>
                    </CardTitle>
                    <div className="flex flex-wrap gap-2">
                      <Badge variant="outline" data-agent-persona={agent.persona}>
                        persona: {personaLabel[agent.persona]}
                      </Badge>
                      <Badge variant="outline" data-agent-trust-scope={agent.trustScope}>
                        trust: {agent.trustScope}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="px-5 pb-3 text-sm text-muted-foreground">
                    <p data-agent-purpose>{agent.purpose}</p>
                  </CardContent>
                  <CardFooter className="px-5 pb-5 pt-0">
                    <span className="inline-flex items-center gap-1 text-sm font-medium text-foreground/90">
                      {isReady ? "Open Agent" : "Coming Soon"}
                      {isReady ? <ChevronRight className="h-4 w-4" aria-hidden="true" /> : null}
                    </span>
                  </CardFooter>
                </Card>
              );

              if (!isReady) {
                return (
                  <div key={agent.id} className="group" aria-disabled="true">
                    {card}
                  </div>
                );
              }

              return (
                <Link key={agent.id} href={routes.agents.detail(agent.id)} className="group">
                  {card}
                </Link>
              );
            })}
          </div>
          {agentDefinitions.length === 0 ? (
            <Card>
              <CardHeader>
                <CardTitle>No agents available yet</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                Agent workflows are being prepared and will be released in upcoming iterations.
              </CardContent>
            </Card>
          ) : null}
        </main>
      </div>
    </SidebarInset>
  );
}
