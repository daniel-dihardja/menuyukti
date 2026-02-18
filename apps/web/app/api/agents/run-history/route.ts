import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma/client";
import { toAgentRunHistoryRecord } from "@/lib/agents/agent-run-history";

function parsePositiveInt(raw: string | null): number | null {
  if (!raw) return null;
  const value = Number(raw);
  if (!Number.isInteger(value) || value <= 0) return null;
  return value;
}

export async function GET(request: NextRequest) {
  const agentId = request.nextUrl.searchParams.get("agentId");
  if (!agentId) {
    return NextResponse.json({ error: "AGENT_ID_REQUIRED" }, { status: 400 });
  }
  const locationId = parsePositiveInt(request.nextUrl.searchParams.get("locationId"));
  const analyticsId = parsePositiveInt(request.nextUrl.searchParams.get("analyticsId"));
  const limit = parsePositiveInt(request.nextUrl.searchParams.get("limit")) ?? 10;

  const rows = await prisma.agentOutput.findMany({
    where: {
      agentId,
      ...(locationId ? { locationId } : {}),
      ...(analyticsId ? { analyticsId } : {}),
    },
    orderBy: { updatedAt: "desc" },
    take: Math.min(limit, 50),
  });

  return NextResponse.json({
    agentId,
    locationId: locationId ?? null,
    analyticsId: analyticsId ?? null,
    runs: rows.map(toAgentRunHistoryRecord),
  });
}
