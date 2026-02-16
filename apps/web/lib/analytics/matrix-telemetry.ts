export type MatrixTelemetryEventName =
  | "matrix_preset_used"
  | "matrix_filter_changed"
  | "matrix_reset_clicked"
  | "matrix_action_reason_opened";

type MatrixTelemetryPayload = {
  eventName: MatrixTelemetryEventName;
  analyticsId: number;
  properties?: Record<string, unknown>;
};

const MATRIX_TELEMETRY_SCHEMA_VERSION = 1;

export function emitMatrixTelemetryEvent(payload: MatrixTelemetryPayload): void {
  const body = JSON.stringify({
    schema_version: MATRIX_TELEMETRY_SCHEMA_VERSION,
    event_name: payload.eventName,
    analytics_id: payload.analyticsId,
    ts_ms: Date.now(),
    properties: payload.properties ?? {},
  });

  void fetch("/api/telemetry/matrix", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
    keepalive: true,
  }).catch(() => {
    // Non-blocking analytics call; ignore transport failures.
  });
}
