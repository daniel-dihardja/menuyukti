import type { InstagramAttributionRow } from "@/lib/analytics/instagram-attribution";

export type AttributionConfidence = "high" | "medium" | "low" | "blocked";

export type AttributionConfidenceRule =
  | "low_pre_active_days"
  | "low_post_active_days"
  | "low_coverage_ratio"
  | "quality_failed"
  | "freshness_stale"
  | "quality_warn";

export type AttributionConfidenceConfig = {
  minActiveDays: number;
  minCoverageRatio: number;
};

export type AttributionReadinessContext = {
  qualityStatus: string | null;
  isStale: boolean;
};

export type AttributionConfidenceResult = {
  confidence: AttributionConfidence;
  sourceConfidence: AttributionConfidence;
  downgraded: boolean;
  reasons: AttributionConfidenceRule[];
  coverageRatio: number;
};

const DEFAULT_CONFIG: AttributionConfidenceConfig = {
  minActiveDays: 2,
  minCoverageRatio: 0.67,
};

function normalizeConfidence(raw: string): AttributionConfidence {
  const normalized = raw.toLowerCase();
  if (normalized === "high") return "high";
  if (normalized === "medium") return "medium";
  if (normalized === "low") return "low";
  return "blocked";
}

function degradeOneLevel(confidence: AttributionConfidence): AttributionConfidence {
  if (confidence === "high") return "medium";
  if (confidence === "medium") return "low";
  return confidence;
}

export function evaluateAttributionConfidence(
  row: InstagramAttributionRow,
  config: Partial<AttributionConfidenceConfig> = {},
  context: AttributionReadinessContext = { qualityStatus: null, isStale: false },
): AttributionConfidenceResult {
  const rules: AttributionConfidenceRule[] = [];
  const resolvedConfig: AttributionConfidenceConfig = {
    ...DEFAULT_CONFIG,
    ...config,
  };

  const sourceConfidence = normalizeConfidence(row.confidenceLevel);
  let confidence = sourceConfidence;

  const coverageRatio =
    row.attributionWindowDays > 0
      ? Math.min(row.preActiveDays, row.postActiveDays) / row.attributionWindowDays
      : 0;

  if (row.preActiveDays < resolvedConfig.minActiveDays) {
    confidence = degradeOneLevel(confidence);
    rules.push("low_pre_active_days");
  }

  if (row.postActiveDays < resolvedConfig.minActiveDays) {
    confidence = degradeOneLevel(confidence);
    rules.push("low_post_active_days");
  }

  if (coverageRatio < resolvedConfig.minCoverageRatio) {
    confidence = degradeOneLevel(confidence);
    rules.push("low_coverage_ratio");
  }

  const quality = (context.qualityStatus ?? "").toLowerCase();
  if (quality === "failed") {
    confidence = "blocked";
    rules.push("quality_failed");
  } else if (context.isStale) {
    confidence = degradeOneLevel(confidence);
    rules.push("freshness_stale");
  } else if (quality === "warn") {
    confidence = degradeOneLevel(confidence);
    rules.push("quality_warn");
  }

  return {
    confidence,
    sourceConfidence,
    downgraded: confidence !== sourceConfidence,
    reasons: rules,
    coverageRatio,
  };
}

export function parseConfidenceConfig(searchParams: URLSearchParams): AttributionConfidenceConfig {
  const minActiveDaysRaw = Number(searchParams.get("minActiveDays"));
  const minCoverageRatioRaw = Number(searchParams.get("minCoverageRatio"));

  return {
    minActiveDays:
      Number.isFinite(minActiveDaysRaw) && minActiveDaysRaw >= 1 && minActiveDaysRaw <= 7
        ? Math.floor(minActiveDaysRaw)
        : DEFAULT_CONFIG.minActiveDays,
    minCoverageRatio:
      Number.isFinite(minCoverageRatioRaw) && minCoverageRatioRaw >= 0.1 && minCoverageRatioRaw <= 1
        ? minCoverageRatioRaw
        : DEFAULT_CONFIG.minCoverageRatio,
  };
}
