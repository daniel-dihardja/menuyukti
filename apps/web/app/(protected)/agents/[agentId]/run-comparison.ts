export type RunComparisonField = {
  label: string;
  value: string;
};

export type SessionRunSnapshot = {
  id: string;
  timestamp: string;
  status: string;
  readiness: string | null;
  confidence: string | null;
  fallbackUsed: boolean;
  guardrailState: string | null;
  fields: RunComparisonField[];
};

export type RunComparisonRow = {
  label: string;
  leftValue: string;
  rightValue: string;
  changed: boolean;
};

function formatMaybe(value: string | null): string {
  return value ?? "n/a";
}

export function buildRunComparisonRows(left: SessionRunSnapshot, right: SessionRunSnapshot): RunComparisonRow[] {
  const rows: RunComparisonRow[] = [
    {
      label: "status",
      leftValue: left.status,
      rightValue: right.status,
      changed: left.status !== right.status,
    },
    {
      label: "readiness",
      leftValue: formatMaybe(left.readiness),
      rightValue: formatMaybe(right.readiness),
      changed: left.readiness !== right.readiness,
    },
    {
      label: "confidence",
      leftValue: formatMaybe(left.confidence),
      rightValue: formatMaybe(right.confidence),
      changed: left.confidence !== right.confidence,
    },
    {
      label: "fallback_used",
      leftValue: String(left.fallbackUsed),
      rightValue: String(right.fallbackUsed),
      changed: left.fallbackUsed !== right.fallbackUsed,
    },
    {
      label: "guardrail_state",
      leftValue: formatMaybe(left.guardrailState),
      rightValue: formatMaybe(right.guardrailState),
      changed: left.guardrailState !== right.guardrailState,
    },
  ];

  const leftByLabel = new Map(left.fields.map((field) => [field.label, field.value]));
  const rightByLabel = new Map(right.fields.map((field) => [field.label, field.value]));
  const labels = new Set([...leftByLabel.keys(), ...rightByLabel.keys()]);

  for (const label of labels) {
    const leftValue = leftByLabel.get(label) ?? "n/a";
    const rightValue = rightByLabel.get(label) ?? "n/a";
    rows.push({
      label,
      leftValue,
      rightValue,
      changed: leftValue !== rightValue,
    });
  }

  return rows;
}
