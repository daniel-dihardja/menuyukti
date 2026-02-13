"use client";

import { useState } from "react";
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

type ToneOutputs = {
  tone_profile: string;
  language_guidelines: string;
  caption_style: string;
  hashtag_style: string;
  content_dos_donts: string;
};

export function ToneAgentRunner() {
  const t = useTranslations("agents.detail.toneRunner");
  const { analyticsId } = useAnalytics();
  const outputRegionId = "tone-agent-output";
  const [running, setRunning] = useState(false);
  const [hasRun, setHasRun] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [outputs, setOutputs] = useState<ToneOutputs | null>(null);

  const runAgent = async () => {
    if (analyticsId === null) {
      setError("Select an analytics report first.");
      return;
    }

    setRunning(true);
    setError(null);
    try {
      const res = await fetch("/api/agents/tone", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ analyticsId }),
      });

      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as {
          error?: string;
        };
        throw new Error(body.error ?? "Failed to run tone agent");
      }

      const body = (await res.json()) as { outputs?: ToneOutputs };
      setOutputs(body.outputs ?? null);
      setHasRun(true);
    } catch (err) {
      setHasRun(false);
      setOutputs(null);
      setError((err as Error).message);
    } finally {
      setRunning(false);
    }
  };

  return (
    <Card>
      <CardHeader className="space-y-2">
        <CardTitle>{t("title")}</CardTitle>
        <CardDescription>{t("description")}</CardDescription>
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

          {error ? (
            <p className="text-destructive">{error}</p>
          ) : !hasRun || !outputs ? (
            <p className="text-muted-foreground">{t("output.empty")}</p>
          ) : (
            <div className="space-y-2 text-muted-foreground">
              <p>
                <span className="font-medium text-foreground">
                  {t("output.toneProfileLabel")} {" "}
                </span>
                {outputs.tone_profile}
              </p>
              <p>
                <span className="font-medium text-foreground">
                  {t("output.languageGuidelinesLabel")} {" "}
                </span>
                {outputs.language_guidelines}
              </p>
              <p>
                <span className="font-medium text-foreground">
                  {t("output.captionStyleLabel")} {" "}
                </span>
                {outputs.caption_style}
              </p>
              <p>
                <span className="font-medium text-foreground">
                  {t("output.hashtagStyleLabel")} {" "}
                </span>
                {outputs.hashtag_style}
              </p>
              <p>
                <span className="font-medium text-foreground">
                  {t("output.contentDosDontsLabel")} {" "}
                </span>
                {outputs.content_dos_donts}
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
