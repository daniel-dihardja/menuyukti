import { NextResponse } from "next/server";
import type { UIMessage } from "ai";
import { getAgentsBaseUrl } from "@/lib/config";
import { chatRequestBodySchema } from "./schema";

// Batch agent invoke is fast; keep headroom for slow networks / cold starts.
export const maxDuration = 120;

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

function getLastUserMessageText(messages: UIMessage[]): string | null {
  for (let i = messages.length - 1; i >= 0; i--) {
    const msg = messages[i];
    if (!msg || msg.role !== "user") continue;
    const text =
      msg.parts
        ?.filter(
          (p): p is { type: "text"; text: string } => p.type === "text"
        )
        .map((p) => p.text)
        .join("") ?? "";
    if (text.trim()) return text;
  }
  return null;
}

function sseLine(data: object | "[DONE]"): string {
  return `data: ${data === "[DONE]" ? "[DONE]" : JSON.stringify(data)}\n\n`;
}

const SSE_EVENT = {
  START: "start",
  TEXT_START: "text-start",
  TEXT_DELTA: "text-delta",
  TEXT_END: "text-end",
  FINISH: "finish",
  ERROR: "error",
} as const;

const SSE_DONE = "[DONE]" as const;

/** JSON body from gentic-agents POST /invoke */
interface AgentInvokeResponse {
  ok: boolean;
  output?: string;
  intent?: string;
  error?: string;
}

export async function POST(req: Request) {
  const baseUrl = getAgentsBaseUrl();
  if (!baseUrl) {
    return jsonError("AGENTS_URL is not configured", 500);
  }

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return jsonError("Invalid JSON body", 400);
  }

  const parsed = chatRequestBodySchema.safeParse(json);
  if (!parsed.success) {
    const message =
      parsed.error.issues.map((i) => i.message).join("; ") ||
      "Invalid request body";
    return jsonError(message, 400);
  }

  const messages = parsed.data.messages as UIMessage[];
  const userText = getLastUserMessageText(messages);
  if (!userText) {
    return jsonError("No user message found in request", 400);
  }

  let agentRes: Response;
  try {
    agentRes = await fetch(`${baseUrl}/invoke`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: userText,
        thread_id: parsed.data.threadId ?? crypto.randomUUID(),
        analytics_id: parsed.data.analyticsId ?? null,
        location_id: parsed.data.locationId ?? null,
        date_start: parsed.data.dateStart ?? null,
        date_end: parsed.data.dateEnd ?? null,
        national_holidays: parsed.data.nationalHolidays ?? null,
        location_profile: parsed.data.locationProfile ?? null,
      }),
      signal: req.signal,
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to reach agents service";
    return jsonError(message, 502);
  }

  const raw = await agentRes.text();
  let body: AgentInvokeResponse;
  try {
    body = JSON.parse(raw) as AgentInvokeResponse;
  } catch {
    return jsonError(
      `Agents service error (${agentRes.status}): ${raw || agentRes.statusText}`,
      agentRes.ok ? 502 : agentRes.status
    );
  }

  if (!agentRes.ok || !body.ok) {
    const errMsg =
      body.error?.trim() || `Agents service error (${agentRes.status})`;
    return jsonError(errMsg, agentRes.ok ? 502 : agentRes.status);
  }

  const output = body.output ?? "";
  const messageId = crypto.randomUUID();
  const textPartId = crypto.randomUUID();
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      controller.enqueue(
        encoder.encode(sseLine({ type: SSE_EVENT.START, messageId }))
      );
      controller.enqueue(
        encoder.encode(sseLine({ type: SSE_EVENT.TEXT_START, id: textPartId }))
      );
      if (output) {
        controller.enqueue(
          encoder.encode(
            sseLine({
              type: SSE_EVENT.TEXT_DELTA,
              id: textPartId,
              delta: output,
            })
          )
        );
      }
      controller.enqueue(
        encoder.encode(sseLine({ type: SSE_EVENT.TEXT_END, id: textPartId }))
      );
      controller.enqueue(
        encoder.encode(sseLine({ type: SSE_EVENT.FINISH }))
      );
      controller.enqueue(encoder.encode(sseLine(SSE_DONE)));
      controller.close();
    },
  });

  return new NextResponse(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-store",
      "x-vercel-ai-ui-message-stream": "v1",
    },
  });
}
