import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";
import { findingsReportSchema, type FindingsReport } from "./contracts";

type CliOptions = {
  findingsPath: string;
  enable: boolean;
};

type SafeFixCategory = "ui_layout" | "copy_tooltip" | "null_guard" | "unknown";

function parseArgs(argv: string[]): CliOptions {
  const findingsPathArg = argv.find((arg) => arg.startsWith("--findings="));
  const findingsPath = findingsPathArg?.split("=")[1] ?? "";
  if (!findingsPath) {
    throw new Error("Missing --findings=<path> argument");
  }
  const enableArg = argv.find((arg) => arg.startsWith("--enable="));
  const enable = enableArg?.split("=")[1] === "true";
  return { findingsPath, enable };
}

function detectSafeCategory(reportItem: FindingsReport["findings"][number]): SafeFixCategory {
  const title = reportItem.title.toLowerCase();
  const summary = reportItem.summary.toLowerCase();
  if (title.includes("overflow") || summary.includes("overflow")) return "ui_layout";
  if (title.includes("tooltip") || summary.includes("tooltip") || summary.includes("copy")) return "copy_tooltip";
  if (title.includes("undefined") || summary.includes("null") || summary.includes("cannot read properties")) {
    return "null_guard";
  }
  return "unknown";
}

function runValidationCommands(): Array<{ command: string; ok: boolean; output: string }> {
  const commands = ["pnpm -C apps/web typecheck", "pnpm -C apps/web test --run"];
  const results: Array<{ command: string; ok: boolean; output: string }> = [];
  for (const command of commands) {
    try {
      const output = execSync(command, { encoding: "utf8", stdio: "pipe" });
      results.push({ command, ok: true, output });
    } catch (error) {
      const output =
        error instanceof Error && "stdout" in error
          ? String((error as { stdout?: string; stderr?: string }).stdout ?? "") +
            String((error as { stdout?: string; stderr?: string }).stderr ?? "")
          : String(error);
      results.push({ command, ok: false, output });
    }
  }
  return results;
}

function renderAutoFixPlan(
  report: FindingsReport,
  candidates: Array<FindingsReport["findings"][number] & { category: SafeFixCategory }>,
  validations: Array<{ command: string; ok: boolean; output: string }>,
): string {
  const lines: string[] = [];
  lines.push("# AI Explorer Auto-Fix Plan");
  lines.push("");
  lines.push(`- Mission: \`${report.mission.id}\``);
  lines.push(`- Findings considered: ${report.findings.length}`);
  lines.push(`- Safe candidates: ${candidates.length}`);
  lines.push("");
  lines.push("## Candidate Fixes");
  lines.push("");
  if (candidates.length === 0) {
    lines.push("- No safe candidates detected.");
  } else {
    for (const candidate of candidates) {
      lines.push(`- [${candidate.severity}] ${candidate.title}`);
      lines.push(`  - Category: ${candidate.category}`);
      lines.push(`  - Route: \`${candidate.route}\``);
      lines.push(`  - Suggested fix: ${candidate.suggestedFix ?? "N/A"}`);
    }
  }
  lines.push("");
  lines.push("## Validation Results");
  lines.push("");
  for (const validation of validations) {
    lines.push(`- ${validation.ok ? "PASS" : "FAIL"} \`${validation.command}\``);
  }
  return lines.join("\n");
}

function loadReport(findingsPath: string): FindingsReport {
  const absolutePath = path.resolve(process.cwd(), findingsPath);
  const raw = fs.readFileSync(absolutePath, "utf8");
  return findingsReportSchema.parse(JSON.parse(raw) as unknown);
}

async function run() {
  const options = parseArgs(process.argv.slice(2));
  if (!options.enable) {
    throw new Error("Auto-fix mode is disabled. Re-run with --enable=true");
  }

  const report = loadReport(options.findingsPath);
  const candidates = report.findings
    .map((item) => ({ ...item, category: detectSafeCategory(item) }))
    .filter((item) => item.category !== "unknown");

  const validations = runValidationCommands();
  const outDir = path.resolve(path.dirname(options.findingsPath));
  const planPath = path.join(outDir, "autofix-plan.md");
  const payloadPath = path.join(outDir, "autofix-plan.json");

  const planMarkdown = renderAutoFixPlan(report, candidates, validations);
  fs.writeFileSync(planPath, planMarkdown);
  fs.writeFileSync(
    payloadPath,
    JSON.stringify(
      {
        missionId: report.mission.id,
        runId: report.runId,
        candidates,
        validations,
      },
      null,
      2,
    ),
  );

  console.log(`[ai-explorer] autofix-plan: ${planPath}`);
  console.log(`[ai-explorer] autofix-payload: ${payloadPath}`);
}

run().catch((error) => {
  console.error("[ai-explorer] auto-fix failed:", error);
  process.exit(1);
});
