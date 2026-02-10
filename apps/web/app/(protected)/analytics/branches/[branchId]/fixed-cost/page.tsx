export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { SidebarInset } from "@workspace/ui/components/sidebar";
import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { notFound } from "next/navigation";

import { SidebarTriggerClient } from "@/components/sidebar-trigger-client";
import { routes } from "@/lib/routes";
import { prisma } from "@/lib/prisma/client";

import { FixedCostForm } from "./fixed-cost-form";

type PageProps = {
  params: Promise<{
    branchId?: string;
  }>;
};

export default async function Page({ params }: PageProps) {
  const t = await getTranslations("branches.fixedCosts");

  // --------------------------------------------------
  // Params
  // --------------------------------------------------
  const { branchId: branchIdParam } = await params;
  if (!branchIdParam) notFound();

  const branchId = Number(branchIdParam);
  if (!Number.isInteger(branchId)) notFound();

  // --------------------------------------------------
  // Fetch branch (for display name + scope validation)
  // --------------------------------------------------
  const branch = await prisma.branch.findUnique({
    where: { id: branchId },
    select: {
      id: true,
      name: true,
      slug: true,
    },
  });

  console.log("branch:", branch);

  if (!branch) notFound();

  // --------------------------------------------------
  // Fetch fixed costs for branch
  // --------------------------------------------------
  const rawFixedCosts = await prisma.fixedCost.findMany({
    where: { branchId },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      name: true,
      amount: true,
      category: true,
      notes: true,
      isActive: true,
    },
  });

  const fixedCosts = rawFixedCosts.map((cost) => ({
    id: cost.id,
    name: cost.name,
    amount: Number(cost.amount),
    category: cost.category ?? "",
    notes: cost.notes ?? "",
    isActive: cost.isActive,
  }));

  // --------------------------------------------------
  // UI
  // --------------------------------------------------
  return (
    <SidebarInset>
      <div className="w-full">
        <SidebarTriggerClient
          title={t("title")}
          breadcrumbs={[
            { label: t("breadcrumbs.branches"), href: routes.analytics.branches },
            { label: branch.name },
            { label: t("breadcrumbs.fixedCosts") },
          ]}
        />

        <main className="mx-auto max-w-6xl p-4 space-y-3">

          {/* Fixed Cost Editor */}
          <FixedCostForm branchId={branch.id} fixedCosts={fixedCosts} />
        </main>
      </div>
    </SidebarInset>
  );
}
