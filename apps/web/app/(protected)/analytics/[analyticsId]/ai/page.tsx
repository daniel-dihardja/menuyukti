export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { getTranslations } from "next-intl/server";
import { routes } from "@/lib/routes";
import { notFound } from "next/navigation";
import { AnalyticsPageShell } from "@/components/analytics-page-shell";
import { PageHeading } from "@/components/page-heading";
import { Button } from "@workspace/ui/components/button";
import Link from "next/link";
import { graphqlQuery } from "@/lib/graphql/client";
import { ANALYTICS_RUN_QUERY, type AnalyticsRunData } from "@/lib/graphql/queries";

type PageProps = {
  params: Promise<{ analyticsId?: string }>;
};

export default async function Page({ params }: PageProps) {
  const tSales = await getTranslations("analytics.sales");
  const tAi = await getTranslations("analytics.ai");

  const { analyticsId: analyticsIdParam } = await params;
  if (!analyticsIdParam) notFound();

  const analyticsId = Number(analyticsIdParam);
  if (!Number.isInteger(analyticsId)) notFound();

  const data = await graphqlQuery<AnalyticsRunData>(ANALYTICS_RUN_QUERY, {
    id: String(analyticsId),
  });
  const run = data.analyticsRun;
  if (!run) notFound();

  const analyticsName =
    run.name ?? run.filename ?? `Analytics #${run.id}`;

  return (
    <AnalyticsPageShell
      title={tAi("reportTitle")}
      breadcrumbs={[
        { label: tSales("title"), href: routes.analytics.sales },
        { label: analyticsName },
        { label: tAi("breadcrumb") },
      ]}
    >
      <section className="border rounded-md p-6 space-y-4">
        <PageHeading
          title={tAi("heading")}
          description={tAi("description")}
        />
        <Button asChild>
          <Link href={routes.analytics.sales}>Back to Sales</Link>
        </Button>
      </section>
    </AnalyticsPageShell>
  );
}
