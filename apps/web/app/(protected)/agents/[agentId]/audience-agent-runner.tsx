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
          <Button type="button" disabled={running} onClick={runAgent}>
            {running ? t("actions.running") : t("actions.run")}
          </Button>
        </div>

        <div className="space-y-3 border p-4 text-sm">
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
                  {t("output.priceSensitivityLabel")}{" "}
                </span>
                {t("output.priceSensitivityValue")}
              </p>
              <p>
                <span className="font-medium text-foreground">
                  {t("output.promotionResponseWindowLabel")}{" "}
                </span>
                {t("output.promotionResponseWindowValue")}
              </p>
              <p>
                <span className="font-medium text-foreground">
                  {t("output.analysisWindowLabel")}{" "}
                </span>
                {t("output.analysisWindowValue")}
              </p>
              <p>
                <span className="font-medium text-foreground">
                  {t("output.sampleSizeLabel")}{" "}
                </span>
                {t("output.sampleSizeValue")}
              </p>
              <p>
                <span className="font-medium text-foreground">
                  {t("output.confidenceScoreLabel")}{" "}
                </span>
                {t("output.confidenceScoreValue")}
              </p>
              <p>
                <span className="font-medium text-foreground">
                  {t("output.dataCoverageLabel")}{" "}
                </span>
                {t("output.dataCoverageValue")}
              </p>
              <p>
                <span className="font-medium text-foreground">
                  {t("output.anomalyFlagsLabel")}{" "}
                </span>
                {t("output.anomalyFlagsValue")}
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
                  {t("output.topItemRevenueShareLabel")}{" "}
                </span>
                {t("output.topItemRevenueShareValue")}
              </p>
              <p>
                <span className="font-medium text-foreground">
                  {t("output.topItemStabilityLabel")}{" "}
                </span>
                {t("output.topItemStabilityValue")}
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
