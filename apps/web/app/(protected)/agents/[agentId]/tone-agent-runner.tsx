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

type ToneOutputs = {
  tone_profile: string;
  language_guidelines: string;
  caption_style: string;
  hashtag_style: string;
  content_dos_donts: string;
  post_concepts: string;
  cta_phrases: string;
  emoji_guidelines: string;
};

export function ToneAgentRunner() {
  const t = useTranslations("agents.detail.toneRunner");
  const { analyticsId } = useAnalytics();
  const outputRegionId = "tone-agent-output";
  const [running, setRunning] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [outputs, setOutputs] = useState<ToneOutputs | null>(null);

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
        const res = await fetch(`/api/agents/tone?analyticsId=${analyticsId}`, {
          method: "GET",
          signal: controller.signal,
        });

        if (!res.ok) {
          const body = (await res.json().catch(() => ({}))) as {
            error?: string;
          };
          throw new Error(body.error ?? "Failed to load tone output");
        }

        const body = (await res.json()) as { outputs?: ToneOutputs | null };
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
      const res = await fetch("/api/agents/tone", {
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
        throw new Error(body.error ?? "Failed to run tone agent");
      }

      const body = (await res.json()) as { outputs?: ToneOutputs };
      setOutputs(body.outputs ?? null);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setRunning(false);
    }
  };

  const clearOutput = async () => {
    if (analyticsId === null) {
      setError("Select an analytics report first.");
      return;
    }

    setClearing(true);
    setError(null);
    try {
      const res = await fetch(`/api/agents/tone?analyticsId=${analyticsId}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as {
          error?: string;
        };
        throw new Error(body.error ?? "Failed to clear tone output");
      }

      setOutputs(null);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setClearing(false);
    }
  };

  return (
    <Card>
      <CardHeader className="space-y-2">
        <CardTitle>{t("title")}</CardTitle>
        <CardDescription>{t("description")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex justify-start gap-2">
          <Button
            type="button"
            disabled={running || clearing}
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
          {outputs ? (
            <Button
              type="button"
              variant="outline"
              disabled={running || clearing}
              onClick={clearOutput}
              aria-controls={outputRegionId}
              aria-busy={clearing}
            >
              {clearing ? t("actions.clearing") : t("actions.clear")}
            </Button>
          ) : null}
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
              <p>
                <span className="font-medium text-foreground">
                  {t("output.postConceptsLabel")} {" "}
                </span>
                {outputs.post_concepts}
              </p>
              <p>
                <span className="font-medium text-foreground">
                  {t("output.ctaPhrasesLabel")} {" "}
                </span>
                {outputs.cta_phrases}
              </p>
              <p>
                <span className="font-medium text-foreground">
                  {t("output.emojiGuidelinesLabel")} {" "}
                </span>
                {outputs.emoji_guidelines}
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
