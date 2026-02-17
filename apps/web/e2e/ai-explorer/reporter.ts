import fs from "node:fs";
import path from "node:path";
import type { FindingsReport } from "./contracts";

const SEVERITY_ORDER: Array<keyof FindingsReport["summary"]["bySeverity"]> = [
  "critical",
  "high",
  "medium",
  "low",
  "info",
];

function escapeMarkdown(value: string): string {
  return value.replace(/\|/g, "\\|");
}

export function renderMarkdownSummary(report: FindingsReport): string {
  const lines: string[] = [];
  lines.push(`# AI Explorer Findings Summary`);
  lines.push("");
  lines.push(`- Run ID: \`${report.runId}\``);
  lines.push(`- Mission: \`${report.mission.id}\` (${report.mission.title})`);
  lines.push(`- Generated At: ${report.generatedAt}`);
  lines.push(`- Total Findings: ${report.summary.total}`);
  lines.push("");
  lines.push("## Severity Breakdown");
  lines.push("");
  lines.push("| Severity | Count |");
  lines.push("|---|---:|");
  for (const severity of SEVERITY_ORDER) {
    lines.push(`| ${severity} | ${report.summary.bySeverity[severity]} |`);
  }
  lines.push("");

  const grouped = new Map<string, FindingsReport["findings"]>();
  for (const finding of report.findings) {
    const key = finding.severity;
    const existing = grouped.get(key) ?? [];
    existing.push(finding);
    grouped.set(key, existing);
  }

  for (const severity of SEVERITY_ORDER) {
    const findings = grouped.get(severity) ?? [];
    if (findings.length === 0) continue;

    lines.push(`## ${severity.toUpperCase()} Findings`);
    lines.push("");
    for (const finding of findings) {
      lines.push(`### ${escapeMarkdown(finding.title)}`);
      lines.push("");
      lines.push(`- Route: \`${finding.route}\``);
      lines.push(`- Confidence: ${finding.confidence}`);
      lines.push(`- Summary: ${finding.summary}`);
      if (finding.suggestedFix) {
        lines.push(`- Suggested Fix: ${finding.suggestedFix}`);
      }
      lines.push(`- Repro Steps:`);
      for (const step of finding.reproducibleSteps) {
        lines.push(`  - ${step}`);
      }
      if (finding.evidence.screenshots.length > 0) {
        lines.push(`- Screenshots:`);
        for (const item of finding.evidence.screenshots) {
          lines.push(`  - \`${item}\``);
        }
      }
      if (finding.evidence.consoleErrors.length > 0) {
        lines.push(`- Console Errors:`);
        for (const item of finding.evidence.consoleErrors) {
          lines.push(`  - ${item}`);
        }
      }
      if (finding.evidence.networkErrors.length > 0) {
        lines.push(`- Network Errors:`);
        for (const item of finding.evidence.networkErrors) {
          lines.push(`  - ${item}`);
        }
      }
      lines.push("");
    }
  }

  return lines.join("\n");
}

export function writeReportArtifacts(artifactsDir: string, report: FindingsReport): {
  markdownPath: string;
  jsonPath: string;
} {
  const jsonPath = path.join(artifactsDir, "findings.json");
  const markdownPath = path.join(artifactsDir, "findings-summary.md");
  fs.writeFileSync(jsonPath, JSON.stringify(report, null, 2));
  fs.writeFileSync(markdownPath, renderMarkdownSummary(report));
  return { markdownPath, jsonPath };
}
