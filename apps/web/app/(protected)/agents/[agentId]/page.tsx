export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { SidebarInset } from "@workspace/ui/components/sidebar";
import { SidebarTriggerClient } from "@/components/sidebar-trigger-client";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Badge } from "@workspace/ui/components/badge";
import { notFound } from "next/navigation";
import { routes } from "@/lib/routes";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import agents from "@/lib/agents.json";
import type { AgentDefinition } from "@/lib/agent-definitions";
import { prisma } from "@/lib/prisma/client";
import { AgentFilters } from "../agent-filters";
import { ChevronLeft } from "lucide-react";
import { StrategistRunner } from "./strategist-runner";
import { ProfitIntelligenceRunner } from "./profit-intelligence-runner";
import { ConsensusRunner } from "./consensus-runner";
import { SimulationRunner } from "./simulation-runner";
import { MemoryRunner } from "./memory-runner";
import { RerankerRunner } from "./reranker-runner";
import { ReleaseLoopRunner } from "./release-loop-runner";

type PageProps = {
  params: Promise<{ agentId?: string }>;
};

function formatOutputLabel(output: string) {
  return output.replaceAll("_", " ");
}

export default async function Page({ params }: PageProps) {
  const t = await getTranslations("agents");
  const tDetail = await getTranslations("agents.detail");
  const agentDefinitions = agents as AgentDefinition[];
  const { agentId } = await params;
  if (!agentId) notFound();

  const agent = agentDefinitions.find((item) => item.id === agentId);
  if (!agent) notFound();
  const isReady = agent.status === "ready";
  const statusLabel =
    agent.status === "ready"
      ? tDetail("status.ready")
      : agent.status === "draft"
        ? tDetail("status.draft")
        : agent.status;

  const branches = await prisma.location.findMany({
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      name: true,
    },
  });

  return (
    <SidebarInset>
      <div className="w-full">
        <SidebarTriggerClient
          title={agent.name}
          breadcrumbs={[
            { label: t("title"), href: routes.agents.list },
            { label: agent.name },
          ]}
        />

        <main className="mx-auto max-w-4xl p-4 space-y-6">
          <header className="space-y-1">
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-semibold">{agent.name}</h1>
              <Badge variant="secondary" className="capitalize">
                {statusLabel}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">{agent.description}</p>
          </header>

          <AgentFilters branches={branches} />

          {isReady ? (
            <>
              {agent.id === "marketer-strategist" ? <StrategistRunner /> : null}
              {agent.id === "menu-profit-intelligence" ? <ProfitIntelligenceRunner /> : null}
              {agent.id === "multi-agent-consensus" ? <ConsensusRunner /> : null}
              {agent.id === "what-if-simulation" ? <SimulationRunner /> : null}
              {agent.id === "agent-memory-tracker" ? <MemoryRunner /> : null}
              {agent.id === "feedback-reranker" ? <RerankerRunner /> : null}
              {agent.id === "learning-release-loop" ? <ReleaseLoopRunner /> : null}
            </>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>Coming Soon</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                This agent is listed in Agent Studio but is not released yet.
              </CardContent>
            </Card>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>{tDetail("cards.inputs")}</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                <ul className="list-disc pl-4 space-y-1">
                  {agent.inputs.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>{tDetail("cards.outputs")}</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                <ul className="list-disc pl-4 space-y-1">
                  {agent.outputs.map((item) => (
                    <li key={item}>
                      <span>{formatOutputLabel(item)}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </div>

          <div className="text-sm text-muted-foreground">
            <Link href={routes.agents.list} className="inline-flex items-center gap-1 underline">
              <ChevronLeft className="h-4 w-4" aria-hidden="true" />
              {tDetail("backToAgents")}
            </Link>
          </div>
        </main>
      </div>
    </SidebarInset>
  );
}
