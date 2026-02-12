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
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@workspace/ui/components/tooltip";
import { notFound } from "next/navigation";
import { routes } from "@/lib/routes";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import agents from "@/lib/agents.json";
import { prisma } from "@/lib/prisma/client";
import { AgentFilters } from "../agent-filters";
import { AudienceAgentRunner } from "./audience-agent-runner";
import { CheckCircle2, ChevronLeft, CircleAlert, CircleHelp } from "lucide-react";

type PageProps = {
  params: Promise<{ agentId?: string }>;
};

const AUDIENCE_OUTPUT_COVERAGE: Record<string, "covered" | "missing"> = {
  top_items: "covered",
  peak_hours: "covered",
  weekday_bias: "covered",
  audience_intent_clusters: "covered",
  price_sensitivity_signal: "missing",
  promotion_response_window_signal: "missing",
  party_size_signal: "covered",
  social_dining_probability: "covered",
  time_window_party_shift: "missing",
  audience_mix_summary: "covered",
  analysis_window: "covered",
  sample_size: "missing",
  confidence_score: "missing",
  data_coverage: "missing",
  anomaly_flags: "missing",
  daypart_demand_distribution: "covered",
  weekday_demand_distribution: "covered",
  top_item_revenue_share: "covered",
  top_item_stability: "missing",
  category_mix: "covered",
};

function formatOutputLabel(output: string) {
  return output.replaceAll("_", " ");
}

export default async function Page({ params }: PageProps) {
  const t = await getTranslations("agents");
  const tDetail = await getTranslations("agents.detail");
  const { agentId } = await params;
  if (!agentId) notFound();

  const agent = agents.find((item) => item.id === agentId);
  if (!agent) notFound();
  const statusLabel =
    agent.status === "ready"
      ? tDetail("status.ready")
      : agent.status === "draft"
        ? tDetail("status.draft")
        : agent.status;

  const branches = await prisma.branch.findMany({
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

          {agent.id === "audience" ? <AudienceAgentRunner /> : null}

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
                      {agent.id === "audience" ? (
                        <span className="ml-1 inline-flex items-center gap-1.5 whitespace-nowrap align-middle">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <button
                                type="button"
                                className="inline-flex items-center text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                                aria-label={tDetail("outputHelp.open")}
                              >
                                <CircleHelp className="h-3.5 w-3.5 shrink-0" />
                              </button>
                            </TooltipTrigger>
                            <TooltipContent side="top" className="max-w-64">
                              {tDetail(`outputHelp.items.${item}`)}
                            </TooltipContent>
                          </Tooltip>
                          {AUDIENCE_OUTPUT_COVERAGE[item] === "covered" ? (
                            <CheckCircle2
                              className="h-3.5 w-3.5 shrink-0 text-emerald-600"
                              aria-hidden="true"
                            />
                          ) : (
                            <CircleAlert
                              className="h-3.5 w-3.5 shrink-0 text-amber-600"
                              aria-hidden="true"
                            />
                          )}
                          <span className="sr-only">
                            {AUDIENCE_OUTPUT_COVERAGE[item] === "covered"
                              ? tDetail("outputsStatus.covered")
                              : tDetail("outputsStatus.missing")}
                          </span>
                        </span>
                      ) : null}
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
