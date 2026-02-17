import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { PlaywrightAdapter } from "./adapter";
import {
  findingsReportSchema,
  missionSchema,
  type Finding,
  type Mission,
  type MissionAction,
} from "./contracts";
import { writeReportArtifacts } from "./reporter";

type CliOptions = {
  missionPath: string;
  headless: boolean;
  retries: number;
};

function parseArgs(argv: string[]): CliOptions {
  const missionPathArg = argv.find((arg) => arg.startsWith("--mission="));
  const missionPath = missionPathArg?.split("=")[1] ?? "";
  if (!missionPath) {
    throw new Error("Missing --mission=<path> argument");
  }

  const headlessArg = argv.find((arg) => arg.startsWith("--headless="));
  const headless = headlessArg ? headlessArg.split("=")[1] !== "false" : true;

  const retriesArg = argv.find((arg) => arg.startsWith("--retries="));
  const retries = retriesArg ? Number(retriesArg.split("=")[1]) : 1;

  return {
    missionPath,
    headless,
    retries: Number.isFinite(retries) ? Math.max(0, retries) : 1,
  };
}

function isActionDestructive(action: MissionAction): boolean {
  if (action.type === "click") {
    const selector = action.selector.toLowerCase();
    return selector.includes("delete") || selector.includes("remove") || selector.includes("destroy");
  }
  return false;
}

function assertAllowedDomain(baseUrl: string, allowedDomains: string[]) {
  const hostname = new URL(baseUrl).hostname;
  if (!allowedDomains.includes(hostname)) {
    throw new Error(`Mission baseUrl host "${hostname}" is not in allowlist`);
  }
}

function loadMission(missionPath: string): Mission {
  const absolutePath = path.resolve(process.cwd(), missionPath);
  const raw = fs.readFileSync(absolutePath, "utf8");
  const parsed = JSON.parse(raw) as unknown;
  return missionSchema.parse(parsed);
}

async function run() {
  const options = parseArgs(process.argv.slice(2));
  const mission = loadMission(options.missionPath);
  assertAllowedDomain(mission.baseUrl, mission.guardrails.allowedDomains);

  const runId = `ai-explorer-${new Date().toISOString().replace(/[:.]/g, "-")}-${randomUUID().slice(0, 8)}`;
  const artifactsDir = path.resolve(process.cwd(), "e2e-artifacts", "ai-explorer", runId);
  fs.mkdirSync(artifactsDir, { recursive: true });
  fs.writeFileSync(path.join(artifactsDir, "mission.json"), JSON.stringify(mission, null, 2));

  const adapter = new PlaywrightAdapter({
    runId,
    artifactsDir,
    stepTimeoutMs: mission.guardrails.stepTimeoutMs,
    retries: options.retries,
    headless: options.headless,
  });
  await adapter.init();

  const actionLog: Array<{
    scenarioId: string;
    action: MissionAction;
    ok: boolean;
    durationMs: number;
    screenshotPath?: string;
    error?: string;
    startedAt: string;
    endedAt: string;
  }> = [];
  const findings: Finding[] = [];
  let stepCount = 0;
  const startedAt = Date.now();

  try {
    for (const scenario of mission.scenarios) {
      for (const action of scenario.actions) {
        stepCount += 1;
        if (stepCount > mission.guardrails.maxSteps) {
          throw new Error(`Step limit exceeded (${mission.guardrails.maxSteps})`);
        }
        if (Date.now() - startedAt > mission.guardrails.maxDurationMs) {
          throw new Error(`Run duration exceeded (${mission.guardrails.maxDurationMs}ms)`);
        }
        if (!mission.guardrails.allowDestructiveActions && isActionDestructive(action)) {
          throw new Error(`Blocked destructive action: ${JSON.stringify(action)}`);
        }

        const result = await adapter.execute(action);
        actionLog.push({
          scenarioId: scenario.id,
          action,
          ok: result.ok,
          durationMs: result.durationMs,
          screenshotPath: result.screenshotPath,
          error: result.error,
          startedAt: result.startedAt,
          endedAt: result.endedAt,
        });

        if (!result.ok) {
          findings.push({
            id: `${scenario.id}-step-${stepCount}`,
            missionId: mission.id,
            scenarioId: scenario.id,
            severity: "high",
            title: `Action failed in scenario "${scenario.name}"`,
            summary: result.error ?? "Unknown action failure",
            route: scenario.route,
            reproducibleSteps: [
              `Open ${scenario.route}`,
              `Execute action: ${JSON.stringify(action)}`,
              `Observe failure: ${result.error ?? "unknown"}`,
            ],
            evidence: {
              screenshots: result.screenshotPath ? [result.screenshotPath] : [],
              consoleErrors: [],
              networkErrors: [],
            },
            confidence: 0.85,
            suggestedFix: "Validate selector stability and route readiness before executing action.",
          });
        }
      }
    }
  } finally {
    const { videoPath } = await adapter.close();
    const signals = adapter.getSignals();

    if (signals.consoleErrors.length > 0 || signals.networkErrors.length > 0) {
      findings.push({
        id: "runtime-signals",
        missionId: mission.id,
        scenarioId: mission.scenarios[0]?.id ?? "unknown",
        severity: "medium",
        title: "Runtime errors detected during mission",
        summary: "Console and/or network errors were captured while executing scenarios.",
        route: mission.scenarios[0]?.route ?? mission.baseUrl,
        reproducibleSteps: [
          "Run mission with identical mission file and seed data",
          "Open generated console/network logs from artifact bundle",
        ],
        evidence: {
          screenshots: [],
          consoleErrors: signals.consoleErrors,
          networkErrors: signals.networkErrors,
        },
        confidence: 0.7,
        suggestedFix: "Investigate first failing response and associated page console error.",
      });
    }

    const bySeverity = {
      critical: findings.filter((item) => item.severity === "critical").length,
      high: findings.filter((item) => item.severity === "high").length,
      medium: findings.filter((item) => item.severity === "medium").length,
      low: findings.filter((item) => item.severity === "low").length,
      info: findings.filter((item) => item.severity === "info").length,
    };

    const report = findingsReportSchema.parse({
      schemaVersion: "v1",
      runId,
      generatedAt: new Date().toISOString(),
      mission: {
        id: mission.id,
        title: mission.title,
      },
      findings,
      summary: {
        total: findings.length,
        bySeverity,
      },
    });

    fs.writeFileSync(path.join(artifactsDir, "action-log.json"), JSON.stringify(actionLog, null, 2));
    const reportPaths = writeReportArtifacts(artifactsDir, report);

    if (videoPath) {
      fs.writeFileSync(path.join(artifactsDir, "video-path.txt"), `${videoPath}\n`);
    }

    console.log(`[ai-explorer] runId: ${runId}`);
    console.log(`[ai-explorer] mission: ${options.missionPath}`);
    console.log(`[ai-explorer] findings: ${reportPaths.jsonPath}`);
    console.log(`[ai-explorer] summary: ${reportPaths.markdownPath}`);
    console.log(`[ai-explorer] action-log: ${path.join(artifactsDir, "action-log.json")}`);
    console.log(`[ai-explorer] video: ${videoPath ?? "<not-recorded>"}`);
  }
}

run().catch((error) => {
  console.error("[ai-explorer] mission failed:", error);
  process.exit(1);
});
