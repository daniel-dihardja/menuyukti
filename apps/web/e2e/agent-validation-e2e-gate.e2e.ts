import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";

function runNodeScript(args: string[], env: NodeJS.ProcessEnv): Promise<{ code: number }> {
  return new Promise((resolve, reject) => {
    const child = spawn("node", args, {
      cwd: process.cwd(),
      env,
      stdio: "inherit",
    });
    child.on("error", reject);
    child.on("exit", (code) => resolve({ code: code ?? -1 }));
  });
}

async function run() {
  const reportPath = path.resolve(
    process.cwd(),
    "e2e-artifacts",
    "runner-reports",
    "release-validation-gate-latest.json",
  );

  const passRun = await runNodeScript(
    ["--import", "tsx", "scripts/run-release-validation-gate.ts", "--dry-run"],
    { ...process.env, E2E_GATE_DRY_RUN: "1" },
  );
  assert.equal(passRun.code, 0, "dry-run gate should pass");

  assert.ok(fs.existsSync(reportPath), "release gate report should exist after pass run");
  const passReport = JSON.parse(fs.readFileSync(reportPath, "utf8")) as {
    status: string;
    phases: Array<{ id: string; steps: Array<{ id: string; status: string }> }>;
  };
  assert.equal(passReport.status, "passed", "pass run should produce passed gate status");
  assert.ok(passReport.phases.some((phase) => phase.id === "agents-integration"));
  assert.ok(passReport.phases.some((phase) => phase.id === "web-e2e"));

  const failRun = await runNodeScript(
    ["--import", "tsx", "scripts/run-release-validation-gate.ts", "--dry-run"],
    { ...process.env, E2E_GATE_DRY_RUN: "1", E2E_GATE_SIMULATE_FAILURE: "web-e2e" },
  );
  assert.notEqual(failRun.code, 0, "simulated failure gate should fail");

  const failReport = JSON.parse(fs.readFileSync(reportPath, "utf8")) as {
    status: string;
    failedSteps: Array<{ phaseId: string }>;
  };
  assert.equal(failReport.status, "failed", "failure run should produce failed gate status");
  assert.ok(
    failReport.failedSteps.some((step) => step.phaseId === "web-e2e"),
    "failed report should include web-e2e failure",
  );

  console.log("[e2e] agent-validation-e2e-gate: passed");
}

run().catch((error) => {
  console.error("[e2e] agent-validation-e2e-gate: failed", error);
  process.exit(1);
});
