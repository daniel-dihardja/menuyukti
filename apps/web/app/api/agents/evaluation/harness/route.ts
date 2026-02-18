import { NextRequest, NextResponse } from "next/server";

function parseMode(raw: string | null): "mock" | "live" {
  return raw === "live" ? "live" : "mock";
}

function parseAgents(raw: string | null): string[] {
  if (!raw) return [];
  return raw
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
}

export async function GET(request: NextRequest) {
  const mode = parseMode(request.nextUrl.searchParams.get("mode"));
  const agents = parseAgents(request.nextUrl.searchParams.get("agents"));
  const failFast = request.nextUrl.searchParams.get("failFast") === "1";
  const agentsApiUrl = (process.env.AGENTS_API_URL ?? "http://127.0.0.1:8001").replace(/\/+$/g, "");

  const upstream = await fetch(`${agentsApiUrl}/agents/evaluation/harness`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      contract_version: "v1",
      mode,
      agents,
      fail_fast: failFast,
    }),
  });

  const body = (await upstream.json().catch(() => ({}))) as Record<string, unknown>;
  if (!upstream.ok) {
    return NextResponse.json(
      {
        error: "AGENTS_EVALUATION_HARNESS_FAILED",
        upstreamStatus: upstream.status,
        details: body,
      },
      { status: 502 },
    );
  }

  return NextResponse.json(body);
}
