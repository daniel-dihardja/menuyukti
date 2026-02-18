export type SelectedContext = {
  locationId: number | null;
  analyticsId: number | null;
};

export type SelectedContextState = {
  status: "ready" | "degraded" | "blocked";
  canRun: boolean;
  reason: string;
};

export function resolveSelectedContextState(context: SelectedContext): SelectedContextState {
  if (!context.locationId && !context.analyticsId) {
    return {
      status: "blocked",
      canRun: false,
      reason: "Select a branch and analytics report to run this agent.",
    };
  }
  if (context.locationId && !context.analyticsId) {
    return {
      status: "degraded",
      canRun: false,
      reason: "Select an analytics report for the chosen branch.",
    };
  }
  if (!context.locationId && context.analyticsId) {
    return {
      status: "degraded",
      canRun: false,
      reason: "Select a branch for the current analytics report.",
    };
  }
  return {
    status: "ready",
    canRun: true,
    reason: "Selected context is ready.",
  };
}
