"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@workspace/ui/components/button";
import { useAnalytics } from "@/app/(protected)/analytics/use-analytics";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";

type AudienceOutputs = {
  top_items: string[];
  peak_hours: string[];
  weekday_bias: string;
  audience_intent_clusters: string[];
  daypart_demand_distribution: string;
  weekday_demand_distribution: string;
  party_size_signal: string;
  social_dining_probability: string;
  audience_mix_summary: string;
  popularity_index_summary: string;
  analysis_window: string;
  top_item_revenue_share: string;
  category_mix: string;
};

export function AudienceAgentRunner() {
  const t = useTranslations("agents.detail.audienceRunner");
  const { analyticsId } = useAnalytics();
  const outputRegionId = "audience-agent-output";
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [outputs, setOutputs] = useState<AudienceOutputs | null>(null);

  useEffect(() => {
    if (analyticsId === null) {
      setOutputs(null);
      setError(null);
      return;
    }

    const controller = new AbortController();

    const loadOutputs = async () => {
      setError(null);
      try {
        const res = await fetch(
          `/api/agents/audience?analyticsId=${analyticsId}`,
          {
            method: "GET",
            signal: controller.signal,
          },
        );

        if (!res.ok) {
          const body = (await res.json().catch(() => ({}))) as {
            error?: string;
          };
          throw new Error(body.error ?? "Failed to load audience output");
        }

        const body = (await res.json()) as { outputs?: AudienceOutputs | null };
        setOutputs(body.outputs ?? null);
      } catch (err) {
        if ((err as Error).name === "AbortError") {
          return;
        }
        setOutputs(null);
        setError((err as Error).message);
      }
    };

    void loadOutputs();

    return () => controller.abort();
  }, [analyticsId]);

  const runAgent = async () => {
    if (analyticsId === null) {
      setError("Select an analytics report first.");
      return;
    }

    const forceRerun = Boolean(outputs);
    setRunning(true);
    setError(null);
    try {
      const res = await fetch("/api/agents/audience", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ analyticsId, forceRerun }),
      });

      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as {
          error?: string;
        };
        throw new Error(body.error ?? "Failed to run audience agent");
      }

      const body = (await res.json()) as { outputs?: AudienceOutputs };
      setOutputs(body.outputs ?? null);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setRunning(false);
    }
  };

  return (
    <Card>
      <CardHeader className="space-y-2">
        <CardTitle>{t("title")}</CardTitle>
        <CardDescription>
          {t("description")}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex justify-start">
          <Button
            type="button"
            disabled={running}
            onClick={runAgent}
            aria-controls={outputRegionId}
            aria-busy={running}
          >
            {running
              ? t("actions.running")
              : outputs
                ? t("actions.rerun")
                : t("actions.run")}
          </Button>
        </div>

        <div
          id={outputRegionId}
          className="space-y-3 border p-4 text-sm"
          aria-live="polite"
          aria-atomic="true"
          aria-busy={running}
        >
          <h3 className="font-semibold">{t("output.title")}</h3>

          {error ? <p className="text-destructive">{error}</p> : null}
          {!outputs ? (
            <p className="text-muted-foreground">
              {t("output.empty")}
            </p>
          ) : (
            <div className="space-y-2 text-muted-foreground">
              <p>
                <span className="font-medium text-foreground">
                  {t("output.topItemsLabel")}{" "}
                </span>
                {outputs.top_items.join(", ")}
              </p>
              <p>
                <span className="font-medium text-foreground">
                  {t("output.peakHoursLabel")}{" "}
                </span>
                {outputs.peak_hours.join(", ")}
              </p>
              <p>
                <span className="font-medium text-foreground">
                  {t("output.weekdayBiasLabel")}{" "}
                </span>
                {outputs.weekday_bias}
              </p>
              <p>
                <span className="font-medium text-foreground">
                  {t("output.audienceIntentLabel")}{" "}
                </span>
                {outputs.audience_intent_clusters.join(", ")}
              </p>
              <p>
                <span className="font-medium text-foreground">
                  {t("output.daypartDistributionLabel")}{" "}
                </span>
                {outputs.daypart_demand_distribution}
              </p>
              <p>
                <span className="font-medium text-foreground">
                  {t("output.weekdayDistributionLabel")}{" "}
                </span>
                {outputs.weekday_demand_distribution}
              </p>
              <p>
                <span className="font-medium text-foreground">
                  {t("output.partySizeSignalLabel")}{" "}
                </span>
                {outputs.party_size_signal}
              </p>
              <p>
                <span className="font-medium text-foreground">
                  {t("output.socialDiningProbabilityLabel")}{" "}
                </span>
                {outputs.social_dining_probability}
              </p>
              <p>
                <span className="font-medium text-foreground">
                  {t("output.audienceMixSummaryLabel")}{" "}
                </span>
                {outputs.audience_mix_summary}
              </p>
              <p>
                <span className="font-medium text-foreground">
                  {t("output.popularityIndexSummaryLabel")}{" "}
                </span>
                {outputs.popularity_index_summary}
              </p>
              <p>
                <span className="font-medium text-foreground">
                  {t("output.analysisWindowLabel")}{" "}
                </span>
                {outputs.analysis_window}
              </p>
              <p>
                <span className="font-medium text-foreground">
                  {t("output.topItemRevenueShareLabel")}{" "}
                </span>
                {outputs.top_item_revenue_share}
              </p>
              <p>
                <span className="font-medium text-foreground">
                  {t("output.categoryMixLabel")}{" "}
                </span>
                {outputs.category_mix}
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
