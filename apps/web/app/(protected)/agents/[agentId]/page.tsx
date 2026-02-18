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

function formatLabel(value: string) {
  return value.replaceAll("_", " ");
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
            <Card data-agent-input-contract={agent.id}>
              <CardHeader>
                <CardTitle>Input Contract</CardTitle>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="outline" data-contract-input-version>
                    input {agent.contract.inputContractVersion}
                  </Badge>
                  <Badge variant="outline" data-contract-prompt-version>
                    prompt {agent.contract.promptContractVersion}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                <p className="mb-1 font-medium text-foreground/80">{tDetail("cards.inputs")}</p>
                <ul className="list-disc pl-4 space-y-1">
                  {agent.inputs.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
                <p className="mt-3 mb-1 font-medium text-foreground/80">Value Constraints</p>
                <ul className="list-disc pl-4 space-y-1" data-contract-input-constraints>
                  {agent.contract.inputValueConstraints.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            <Card data-agent-output-contract={agent.id}>
              <CardHeader>
                <CardTitle>Output Contract</CardTitle>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="outline" data-contract-output-version>
                    output {agent.contract.outputContractVersion}
                  </Badge>
                  <Badge variant="outline" data-contract-model-version>
                    model {agent.contract.modelContractVersion}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                <p className="mb-1 font-medium text-foreground/80">{tDetail("cards.outputs")}</p>
                <ul className="list-disc pl-4 space-y-1">
                  {agent.outputs.map((item) => (
                    <li key={item}>
                      <span>{formatOutputLabel(item)}</span>
                    </li>
                  ))}
                </ul>
                <p className="mt-3 mb-1 font-medium text-foreground/80">Required Trust Metadata</p>
                <ul className="list-disc pl-4 space-y-1" data-contract-required-trust-fields>
                  {agent.contract.requiredTrustFields.map((item) => (
                    <li key={item}>{formatLabel(item)}</li>
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
