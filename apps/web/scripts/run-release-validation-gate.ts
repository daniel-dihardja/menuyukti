import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";

type GateCommand = {
  id: string;
  command: string;
  args: string[];
};

type GatePhase = {
  id: string;
  description: string;
  blocking: boolean;
  commands?: GateCommand[];
  suites?: string[];
};

type GateManifest = {
  version: string;
  phases: GatePhase[];
};

type StepResult = {
  id: string;
  type: "command" | "suite";
  status: "passed" | "failed" | "skipped";
  startedAt: string;
  finishedAt: string;
  durationMs: number;
  exitCode: number;
  logPath: string;
  error?: string;
};

type PhaseResult = {
  id: string;
  blocking: boolean;
  status: "passed" | "failed" | "skipped";
  steps: StepResult[];
};

type GateReport = {
  generatedAt: string;
  mode: "live" | "dry-run";
  manifestVersion: string;
  manifestPath: string;
  status: "passed" | "failed";
  phases: PhaseResult[];
  failedSteps: Array<{ phaseId: string; stepId: string; error?: string }>;
};

const webRoot = process.cwd();
const repoRoot = path.resolve(webRoot, "..", "..");
const artifactsRoot = path.resolve(webRoot, "e2e-artifacts");
const reportDir = path.resolve(artifactsRoot, "runner-reports");
const logDir = path.resolve(artifactsRoot, "gate-logs");
const manifestPath = path.resolve(webRoot, "e2e", "mandatory-suites.json");

function loadManifest(): GateManifest {
  if (!fs.existsSync(manifestPath)) {
    throw new Error(`[e2e:gate] missing manifest: ${manifestPath}`);
  }

  const raw = fs.readFileSync(manifestPath, "utf8");
  const parsed = JSON.parse(raw) as GateManifest;
  if (!parsed.version || !Array.isArray(parsed.phases) || parsed.phases.length === 0) {
    throw new Error("[e2e:gate] invalid manifest structure");
  }
  return parsed;
}

function ensureArtifactsDirs() {
  fs.mkdirSync(reportDir, { recursive: true });
  fs.mkdirSync(logDir, { recursive: true });
}

function nowIso(): string {
  return new Date().toISOString();
}

function sanitizeToken(value: string): string {
  return value.replace(/[^a-zA-Z0-9._-]/g, "-");
}

function runLiveStep(step: GateCommand, phaseId: string, env: NodeJS.ProcessEnv): Promise<StepResult> {
  const startedAt = nowIso();
  const startedMs = Date.now();
  const logPath = path.resolve(logDir, `${sanitizeToken(phaseId)}__${sanitizeToken(step.id)}.log`);
  const stream = fs.createWriteStream(logPath, { flags: "w" });
  stream.write(`[${startedAt}] running: ${step.command} ${step.args.join(" ")}\n`);

  return new Promise((resolve, reject) => {
    const child = spawn(step.command, step.args, {
      cwd: repoRoot,
      env,
      stdio: ["ignore", "pipe", "pipe"],
    });

    child.stdout?.pipe(stream);
    child.stderr?.pipe(stream);
    child.on("error", (error) => {
      stream.write(`[${nowIso()}] error: ${String(error)}\n`);
      stream.end();
      reject(error);
    });

    child.on("exit", (code) => {
      const finishedAt = nowIso();
      const result: StepResult = {
        id: step.id,
        type: step.command === "pnpm" ? "suite" : "command",
        status: code === 0 ? "passed" : "failed",
        startedAt,
        finishedAt,
        durationMs: Date.now() - startedMs,
        exitCode: code ?? -1,
        logPath,
        error: code === 0 ? undefined : `${step.command} ${step.args.join(" ")} failed with exit ${code ?? "null"}`,
      };
      stream.write(`[${finishedAt}] exited: ${code ?? "null"}\n`);
      stream.end();
      resolve(result);
    });
  });
}

async function runDryStep(step: GateCommand, phaseId: string, simulatedFailure: string | undefined): Promise<StepResult> {
  const startedAt = nowIso();
  const startedMs = Date.now();
  const logPath = path.resolve(logDir, `${sanitizeToken(phaseId)}__${sanitizeToken(step.id)}.log`);
  const shouldFail = simulatedFailure === step.id || simulatedFailure === phaseId || simulatedFailure === "all";
  const status: StepResult["status"] = shouldFail ? "failed" : "passed";
  const finishedAt = nowIso();
  const message = shouldFail
    ? `[${finishedAt}] simulated failure for ${step.id}\n`
    : `[${finishedAt}] dry-run pass for ${step.id}\n`;
  fs.writeFileSync(logPath, message, "utf8");

  return {
    id: step.id,
    type: step.command === "pnpm" ? "suite" : "command",
    status,
    startedAt,
    finishedAt,
    durationMs: Date.now() - startedMs,
    exitCode: shouldFail ? 1 : 0,
    logPath,
    error: shouldFail ? `simulated failure for ${step.id}` : undefined,
  };
}

function buildSteps(phase: GatePhase): GateCommand[] {
  const steps: GateCommand[] = [];
  for (const command of phase.commands ?? []) {
    steps.push(command);
  }
  for (const suite of phase.suites ?? []) {
    steps.push({
      id: suite,
      command: "pnpm",
      args: ["-C", "apps/web", "run", suite],
    });
  }
  return steps;
}

function writeReport(report: GateReport) {
  const timestamp = report.generatedAt.replace(/[:.]/g, "-");
  const reportPath = path.resolve(reportDir, `release-validation-gate-${timestamp}.json`);
  const latestPath = path.resolve(reportDir, "release-validation-gate-latest.json");
  fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  fs.writeFileSync(latestPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  console.log(`[e2e:gate] report: ${reportPath}`);
  console.log(`[e2e:gate] latest: ${latestPath}`);
}

async function run() {
  ensureArtifactsDirs();
  const manifest = loadManifest();
  const dryRun = process.argv.includes("--dry-run") || process.env.E2E_GATE_DRY_RUN === "1";
  const simulatedFailure = process.env.E2E_GATE_SIMULATE_FAILURE;
  const env = {
    ...process.env,
    E2E_MANAGE_SERVICES: process.env.E2E_MANAGE_SERVICES ?? "1",
  };

  const phaseResults: PhaseResult[] = [];
  const failedSteps: Array<{ phaseId: string; stepId: string; error?: string }> = [];

  for (const phase of manifest.phases) {
    const steps = buildSteps(phase);
    const stepResults: StepResult[] = [];
    let phaseFailed = false;

    for (const step of steps) {
      let result: StepResult;
      if (dryRun) {
        result = await runDryStep(step, phase.id, simulatedFailure);
      } else {
        result = await runLiveStep(step, phase.id, env);
      }

      stepResults.push(result);
      if (result.status === "failed") {
        phaseFailed = true;
        failedSteps.push({ phaseId: phase.id, stepId: step.id, error: result.error });
        if (phase.blocking) {
          break;
        }
      }
    }

    phaseResults.push({
      id: phase.id,
      blocking: phase.blocking,
      status: phaseFailed ? "failed" : "passed",
      steps: stepResults,
    });

    if (phaseFailed && phase.blocking) {
      break;
    }
  }

  const report: GateReport = {
    generatedAt: nowIso(),
    mode: dryRun ? "dry-run" : "live",
    manifestVersion: manifest.version,
    manifestPath,
    status: failedSteps.length > 0 ? "failed" : "passed",
    phases: phaseResults,
    failedSteps,
  };

  writeReport(report);
  if (report.status === "failed") {
    console.error("[e2e:gate] release validation gate failed");
    process.exit(1);
  }
  console.log("[e2e:gate] release validation gate passed");
}

run().catch((error) => {
  console.error("[e2e:gate] failed:", error);
  process.exit(1);
});
