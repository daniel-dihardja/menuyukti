export const SALES_DROPDOWN_ACTIONS = [
  "matrix",
  "cogs",
  "heatmap",
  "pairs",
  "scheduler",
  "attribution",
  "finance",
] as const;

export type SalesDropdownAction = (typeof SALES_DROPDOWN_ACTIONS)[number];

export const SALES_DROPDOWN_ACTION_ORDER: SalesDropdownAction[] = [
  "matrix",
  "cogs",
  "heatmap",
  "pairs",
  "scheduler",
  "attribution",
  "finance",
];

export type SalesActionReadinessStatus =
  | "ready"
  | "needs_cogs"
  | "needs_attribution_data"
  | "degraded"
  | "blocked";

export type SalesActionReadinessReasonCode =
  | "none"
  | "missing_core_data"
  | "missing_cogs"
  | "missing_attribution_data"
  | "degraded_upstream_dependency"
  | "blocked_upstream_dependency";

export type SalesActionReadiness = {
  action: SalesDropdownAction;
  status: SalesActionReadinessStatus;
  reasonCode: SalesActionReadinessReasonCode;
  reasonMessage: string | null;
};

export type SalesDropdownReadinessSignals = {
  hasCoreData: boolean;
  hasCogsData: boolean;
  hasAttributionData: boolean;
  hasDegradedDependency?: boolean;
  hasBlockedDependency?: boolean;
};

const REASON_MESSAGES: Record<SalesActionReadinessReasonCode, string | null> = {
  none: null,
  missing_core_data: "Core analytics data is not available yet.",
  missing_cogs: "COGS is required before this action can be used.",
  missing_attribution_data: "Attribution data is required before this action can be used.",
  degraded_upstream_dependency:
    "Upstream data is degraded. Results may be partial or delayed.",
  blocked_upstream_dependency:
    "Upstream dependency is blocked. Resolve pipeline readiness first.",
};

function readiness(
  action: SalesDropdownAction,
  status: SalesActionReadinessStatus,
  reasonCode: SalesActionReadinessReasonCode,
): SalesActionReadiness {
  return {
    action,
    status,
    reasonCode,
    reasonMessage: REASON_MESSAGES[reasonCode],
  };
}

function resolveCoreAndDependencyState(
  action: SalesDropdownAction,
  signals: SalesDropdownReadinessSignals,
): SalesActionReadiness | null {
  if (!signals.hasCoreData) {
    return readiness(action, "blocked", "missing_core_data");
  }

  if (signals.hasBlockedDependency) {
    return readiness(action, "blocked", "blocked_upstream_dependency");
  }

  if (signals.hasDegradedDependency) {
    return readiness(action, "degraded", "degraded_upstream_dependency");
  }

  return null;
}

export function evaluateSalesActionReadiness(
  action: SalesDropdownAction,
  signals: SalesDropdownReadinessSignals,
): SalesActionReadiness {
  const sharedState = resolveCoreAndDependencyState(action, signals);
  if (sharedState) return sharedState;

  if (action === "cogs") {
    return readiness(action, "ready", "none");
  }

  if (
    action === "matrix" ||
    action === "heatmap" ||
    action === "pairs" ||
    action === "finance"
  ) {
    if (!signals.hasCogsData) {
      return readiness(action, "needs_cogs", "missing_cogs");
    }
  }

  if (action === "attribution") {
    if (!signals.hasAttributionData) {
      return readiness(action, "needs_attribution_data", "missing_attribution_data");
    }
  }

  return readiness(action, "ready", "none");
}

export function evaluateSalesDropdownReadiness(
  signals: SalesDropdownReadinessSignals,
): Record<SalesDropdownAction, SalesActionReadiness> {
  return SALES_DROPDOWN_ACTIONS.reduce(
    (acc, action) => {
      acc[action] = evaluateSalesActionReadiness(action, signals);
      return acc;
    },
    {} as Record<SalesDropdownAction, SalesActionReadiness>,
  );
}
