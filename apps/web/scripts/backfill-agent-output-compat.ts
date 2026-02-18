import { prisma } from "@/lib/prisma/client";

type BackfillMode = "dry-run" | "write";

function resolveMode(): BackfillMode {
  return process.env.AGENT_OUTPUT_BACKFILL_WRITE === "1" ? "write" : "dry-run";
}

type Row = {
  id: number;
  outputs: unknown;
  contractVersion: string;
  runStatus: string | null;
  outputEnvelopeJson: unknown;
};

async function run() {
  const mode = resolveMode();
  const rows = await prisma.agentOutput.findMany({
    select: {
      id: true,
      outputs: true,
      contractVersion: true,
      runStatus: true,
      outputEnvelopeJson: true,
    },
    orderBy: { id: "asc" },
  });

  console.log(`[agent-output-backfill] mode=${mode} rows=${rows.length}`);

  let updated = 0;
  for (const row of rows) {
    const needsContractVersion = !row.contractVersion || row.contractVersion.trim().length === 0;
    const needsEnvelope = row.outputEnvelopeJson == null;
    if (!needsContractVersion && !needsEnvelope) continue;

    const runStatus = row.runStatus?.trim() || (row.outputs == null ? "failed" : "succeeded");
    const envelope = {
      contractVersion: "v1",
      run: {
        status: runStatus,
      },
      outputs: row.outputs,
    };

    if (mode === "dry-run") {
      console.log(
        `[agent-output-backfill] dry-run id=${row.id} update_contract=${needsContractVersion} update_envelope=${needsEnvelope}`,
      );
      continue;
    }

    await prisma.agentOutput.update({
      where: { id: row.id },
      data: {
        contractVersion: "v1",
        outputEnvelopeJson: envelope,
      },
    });
    updated += 1;
  }

  console.log(`[agent-output-backfill] completed mode=${mode} updated=${updated}`);
}

run()
  .catch((error) => {
    console.error("[agent-output-backfill] failed:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
