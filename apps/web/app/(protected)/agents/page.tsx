"use client";

import { Bot, TrendingUp, ArrowRight } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { SidebarInset } from "@workspace/ui/components/sidebar";
import { SidebarTriggerClient } from "@/components/sidebar-trigger-client";

type AgentCard = {
  id: string;
  name: string;
  description: string;
  href: string;
  icon: React.ReactNode;
  status: "active" | "coming-soon";
};

const AGENTS: AgentCard[] = [
  {
    id: "menu-strategist",
    name: "Menu Promotion Strategist",
    description:
      "Analyzes menu performance and provides AI-powered recommendations on which items to promote or adjust for maximum profitability.",
    href: "/menu-strategist",
    icon: <TrendingUp className="w-8 h-8" />,
    status: "active",
  },
  // Future agents can be added here
];

export default function AgentsPage() {
  const t = useTranslations("agents");

  return (
    <SidebarInset>
      <div className="w-full">
        <SidebarTriggerClient
          title="Agents"
          breadcrumbs={[{ label: "Agents" }]}
        />

        <main className="mx-auto max-w-6xl p-4 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {AGENTS.map((agent) => (
              <Link
                key={agent.id}
                href={agent.href}
                className={`
              group relative bg-white rounded-lg border shadow-sm p-6 
              transition-all duration-200 
              ${
                agent.status === "active"
                  ? "hover:shadow-lg hover:border-primary/50 cursor-pointer"
                  : "opacity-60 cursor-not-allowed"
              }
            `}
              >
                {agent.status === "coming-soon" && (
                  <div className="absolute top-4 right-4 bg-yellow-100 text-yellow-800 text-xs font-medium px-2.5 py-0.5 rounded">
                    Coming Soon
                  </div>
                )}

                <div className="flex items-start gap-4">
                  <div
                    className={`
                p-3 rounded-lg 
                ${
                  agent.status === "active"
                    ? "bg-primary/10 text-primary"
                    : "bg-gray-100 text-gray-400"
                }
              `}
                  >
                    {agent.icon}
                  </div>

                  <div className="flex-1">
                    <h3 className="text-lg font-semibold mb-2 group-hover:text-primary transition-colors">
                      {agent.name}
                    </h3>
                    <p className="text-sm text-gray-600 leading-relaxed">
                      {agent.description}
                    </p>

                    {agent.status === "active" && (
                      <div className="mt-4 flex items-center gap-2 text-primary text-sm font-medium">
                        <span>Open agent</span>
                        <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                      </div>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>

          {AGENTS.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              <Bot className="w-16 h-16 mx-auto mb-4 opacity-50" />
              <p>No agents available yet</p>
            </div>
          )}
        </main>
      </div>
    </SidebarInset>
  );
}
