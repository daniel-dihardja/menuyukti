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
import agents from "@/lib/agents.json";
import { prisma } from "@/lib/prisma/client";
import { AgentFilters } from "../agent-filters";

type PageProps = {
  params: Promise<{ agentId?: string }>;
};

export default async function Page({ params }: PageProps) {
  const { agentId } = await params;
  if (!agentId) notFound();

  const agent = agents.find((item) => item.id === agentId);
  if (!agent) notFound();

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
            { label: "Agents", href: routes.agents.list },
            { label: agent.name },
          ]}
        />

        <main className="mx-auto max-w-4xl p-4 space-y-6">
          <header className="space-y-1">
            <Badge variant="secondary" className="w-fit capitalize">
              {agent.status}
            </Badge>
            <h1 className="text-2xl font-semibold">{agent.name}</h1>
            <p className="text-sm text-muted-foreground">{agent.description}</p>
          </header>

          <AgentFilters branches={branches} />

          <div className="grid gap-4 sm:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Inputs</CardTitle>
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
                <CardTitle>Outputs</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                <ul className="list-disc pl-4 space-y-1">
                  {agent.outputs.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </div>

          <div className="text-sm text-muted-foreground">
            <Link href={routes.agents.list} className="underline">
              Back to Agents
            </Link>
          </div>
        </main>
      </div>
    </SidebarInset>
  );
}
