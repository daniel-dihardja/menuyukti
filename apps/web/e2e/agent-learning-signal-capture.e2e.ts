import { ensureApiReachable, ensureE2eData } from "./_helpers/data-setup";

const baseUrl = process.env.E2E_BASE_URL ?? "http://127.0.0.1:3000";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

async function postEvent(payload: Record<string, unknown>) {
  const response = await fetch(`${baseUrl}/api/agents/learning/events`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
  });
  const body = (await response.json().catch(() => ({}))) as {
    event?: {
      linkageKey?: string;
      signalType?: string;
      eligibleForLearning?: boolean;
      eligibilityReasons?: string[];
    };
    error?: string;
  };
  return { status: response.status, body };
}

async function run() {
  await ensureE2eData({ testId: "agent-learning-signal-capture", defaultPolicy: "reuse" });
  await ensureApiReachable(baseUrl);

  const recommendationId = `rec-learn-${Date.now()}`;
  const common = {
    locationId: 1,
    analyticsId: 1,
    persona: "analyst",
    sourceAgentId: "menu-profit-intelligence",
    recommendationId,
  };

  const issued = await postEvent({
    ...common,
    signalType: "recommendation_issued",
  });
  assert(issued.status === 200, `issued event failed status=${issued.status}`);
  assert(
    issued.body.event?.linkageKey === `loc:1:an:1:rec:${recommendationId}`,
    "issued linkage key mismatch",
  );
  assert(issued.body.event?.eligibleForLearning === false, "issued should be non-eligible");

  const decision = await postEvent({
    ...common,
    signalType: "user_decision",
    decisionState: "accepted",
  });
  assert(decision.status === 200, `decision event failed status=${decision.status}`);

  const execution = await postEvent({
    ...common,
    signalType: "execution_status",
    executionState: "published",
  });
  assert(execution.status === 200, `execution event failed status=${execution.status}`);

  const outcome = await postEvent({
    ...common,
    signalType: "outcome_delta",
    outcomeDeltaRevenue: 180,
    outcomeDeltaQty: 22,
    outcomeConfidence: "high",
    sampleSize: 16,
  });
  assert(outcome.status === 200, `outcome event failed status=${outcome.status}`);
  assert(outcome.body.event?.eligibleForLearning === true, "strong outcome should be eligible");

  const allResponse = await fetch(
    `${baseUrl}/api/agents/learning/events?locationId=1&analyticsId=1&limit=20`,
  );
  assert(allResponse.ok, `list learning events failed status=${allResponse.status}`);
  const allBody = (await allResponse.json()) as {
    events?: Array<{ recommendationId?: string; linkageKey?: string }>;
  };
  const linked = (allBody.events ?? []).filter((event) => event.recommendationId === recommendationId);
  assert(linked.length >= 4, "expected 4 learning signals for same recommendation");
  assert(
    linked.every((event) => event.linkageKey === `loc:1:an:1:rec:${recommendationId}`),
    "linkage key should be deterministic across signal chain",
  );

  const eligibleResponse = await fetch(
    `${baseUrl}/api/agents/learning/events?locationId=1&analyticsId=1&eligibleOnly=true&limit=20`,
  );
  assert(eligibleResponse.ok, `eligible list failed status=${eligibleResponse.status}`);
  const eligibleBody = (await eligibleResponse.json()) as {
    events?: Array<{ recommendationId?: string; signalType?: string; eligibleForLearning?: boolean }>;
  };
  const eligibleForRecommendation = (eligibleBody.events ?? []).filter(
    (event) => event.recommendationId === recommendationId,
  );
  assert(
    eligibleForRecommendation.some(
      (event) => event.signalType === "outcome_delta" && event.eligibleForLearning === true,
    ),
    "eligible list should include outcome_delta for recommendation",
  );

  console.log("[e2e] agent-learning-signal-capture: passed");
}

run().catch((error) => {
  console.error("[e2e] agent-learning-signal-capture: failed", error);
  process.exit(1);
});
