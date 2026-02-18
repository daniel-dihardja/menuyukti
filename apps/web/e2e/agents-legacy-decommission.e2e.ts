import { ensureApiReachable } from "./_helpers/data-setup";

const baseUrl = process.env.E2E_BASE_URL ?? "http://127.0.0.1:3000";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

async function run() {
  await ensureApiReachable(baseUrl);

  const audienceGet = await fetch(`${baseUrl}/api/agents/audience?analyticsId=1`);
  assert(
    audienceGet.status === 404,
    `[agents-legacy-decommission] expected 404 for audience GET, got ${audienceGet.status}`,
  );

  const audiencePost = await fetch(`${baseUrl}/api/agents/audience`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ analyticsId: 1 }),
  });
  assert(
    audiencePost.status === 404,
    `[agents-legacy-decommission] expected 404 for audience POST, got ${audiencePost.status}`,
  );

  const toneGet = await fetch(`${baseUrl}/api/agents/tone?analyticsId=1`);
  assert(
    toneGet.status === 404,
    `[agents-legacy-decommission] expected 404 for tone GET, got ${toneGet.status}`,
  );

  const tonePost = await fetch(`${baseUrl}/api/agents/tone`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ analyticsId: 1 }),
  });
  assert(
    tonePost.status === 404,
    `[agents-legacy-decommission] expected 404 for tone POST, got ${tonePost.status}`,
  );

  console.log("[e2e] agents-legacy-decommission: passed");
}

run().catch((error) => {
  console.error("[e2e] agents-legacy-decommission: failed", error);
  process.exit(1);
});
