"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@workspace/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";

export function AudienceAgentRunner() {
  const t = useTranslations("agents.detail.audienceRunner");
  const outputRegionId = "audience-agent-output";
  const [running, setRunning] = useState(false);
  const [hasRun, setHasRun] = useState(false);
  const topItems = [
    t("output.mock.topItems.item1"),
    t("output.mock.topItems.item2"),
    t("output.mock.topItems.item3"),
  ];
  const peakHours = [
    t("output.mock.peakHours.slot1"),
    t("output.mock.peakHours.slot2"),
  ];

  const runAgent = async () => {
    setRunning(true);
    await new Promise((resolve) => setTimeout(resolve, 700));
    setHasRun(true);
    setRunning(false);
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
            {running ? t("actions.running") : t("actions.run")}
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

          {!hasRun ? (
            <p className="text-muted-foreground">
              {t("output.empty")}
            </p>
          ) : (
            <div className="space-y-2 text-muted-foreground">
              <p>
                <span className="font-medium text-foreground">
                  {t("output.topItemsLabel")}{" "}
                </span>
                {topItems.join(", ")}
              </p>
              <p>
                <span className="font-medium text-foreground">
                  {t("output.peakHoursLabel")}{" "}
                </span>
                {peakHours.join(", ")}
              </p>
              <p>
                <span className="font-medium text-foreground">
                  {t("output.weekdayBiasLabel")}{" "}
                </span>
                {t("output.weekdayBiasValue")}
              </p>
              <p>
                <span className="font-medium text-foreground">
                  {t("output.audienceIntentLabel")}{" "}
                </span>
                {t("output.audienceIntentValue")}
              </p>
              <p>
                <span className="font-medium text-foreground">
                  {t("output.daypartDistributionLabel")}{" "}
                </span>
                {t("output.daypartDistributionValue")}
              </p>
              <p>
                <span className="font-medium text-foreground">
                  {t("output.weekdayDistributionLabel")}{" "}
                </span>
                {t("output.weekdayDistributionValue")}
              </p>
              <p>
                <span className="font-medium text-foreground">
                  {t("output.partySizeSignalLabel")}{" "}
                </span>
                {t("output.partySizeSignalValue")}
              </p>
              <p>
                <span className="font-medium text-foreground">
                  {t("output.socialDiningProbabilityLabel")}{" "}
                </span>
                {t("output.socialDiningProbabilityValue")}
              </p>
              <p>
                <span className="font-medium text-foreground">
                  {t("output.audienceMixSummaryLabel")}{" "}
                </span>
                {t("output.audienceMixSummaryValue")}
              </p>
              <p>
                <span className="font-medium text-foreground">
                  {t("output.popularityIndexSummaryLabel")}{" "}
                </span>
                {t("output.popularityIndexSummaryValue")}
              </p>
              <p>
                <span className="font-medium text-foreground">
                  {t("output.analysisWindowLabel")}{" "}
                </span>
                {t("output.analysisWindowValue")}
              </p>
              <p>
                <span className="font-medium text-foreground">
                  {t("output.topItemRevenueShareLabel")}{" "}
                </span>
                {t("output.topItemRevenueShareValue")}
              </p>
              <p>
                <span className="font-medium text-foreground">
                  {t("output.categoryMixLabel")}{" "}
                </span>
                {t("output.categoryMixValue")}
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
