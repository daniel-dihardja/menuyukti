import { NextResponse } from "next/server";
import type { UIMessage } from "ai";
import { getAgentsBaseUrl } from "@/lib/config";
import { chatRequestBodySchema } from "./schema";

// Allow streaming responses up to 30 seconds
export const maxDuration = 30;

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
  DATA_PLANNING: "data-planning",
  DATA_ACTIVITY: "data-activity",
} as const;

const SSE_DONE = "[DONE]" as const;

interface PostSlot {
  scheduled_date: string;
  theme: "holiday" | "promotion" | "engagement";
  focus_item: string | null;
  caption_seed: string;
}

interface CampaignBrief {
  campaign_theme: string;
  tone: string;
  target_audience: string;
  posting_cadence: string;
  post_slots: PostSlot[];
}

/** Chunk shape from the agents service SSE stream */
interface AgentSSEChunk {
  delta?: string;
  error?: string;
  planning?: {
    dateStart: string;
    dateEnd: string;
    nationalHolidays?: string | null;
    locationSummary?: string | null;
    campaignBrief?: CampaignBrief | null;
  };
  activity?: {
    step: string;
    status: "running" | "done" | "reflecting" | "reflect_pass" | "reflect_revise";
    label: string;
    detail?: string;
  };
}

async function parseAgentSSEAndForward(
  reader: ReadableStreamDefaultReader<Uint8Array>,
  controller: ReadableStreamDefaultController<Uint8Array>,
  textPartId: string,
  encoder: TextEncoder
): Promise<void> {
  const decoder = new TextDecoder();
  let buffer = "";
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n\n");
      const remainder = lines.pop();
      buffer = remainder !== undefined ? remainder : "";
      for (const line of lines) {
        const match = line.match(/^data: (.+)$/m);
        const payload = match?.[1]?.trim();
        if (!payload) continue;
        if (payload === SSE_DONE) continue;
        try {
          const data = JSON.parse(payload) as AgentSSEChunk;
          if (data.error) {
            controller.enqueue(
              encoder.encode(
                sseLine({ type: SSE_EVENT.ERROR, errorText: data.error })
              )
            );
            return;
          }
          if (data.activity) {
            controller.enqueue(
              encoder.encode(
                sseLine({ type: SSE_EVENT.DATA_ACTIVITY, data: data.activity })
              )
            );
          }
          if (data.planning) {
            controller.enqueue(
              encoder.encode(
                sseLine({
                  type: SSE_EVENT.DATA_PLANNING,
                  data: {
                    dateStart: data.planning.dateStart,
                    dateEnd: data.planning.dateEnd,
                    nationalHolidays: data.planning.nationalHolidays ?? null,
                    locationSummary: data.planning.locationSummary ?? null,
                    campaignBrief: data.planning.campaignBrief ?? null,
                  },
                })
              )
            );
          }
          if (typeof data.delta === "string" && data.delta) {
            controller.enqueue(
              encoder.encode(
                sseLine({
                  type: SSE_EVENT.TEXT_DELTA,
                  id: textPartId,
                  delta: data.delta,
                })
              )
            );
          }
        } catch {
          // ignore malformed JSON
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
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
    const message = parsed.error.issues
      .map((i) => i.message)
      .join("; ") || "Invalid request body";
    return jsonError(message, 400);
  }

  const messages = parsed.data.messages as UIMessage[];
  const userText = getLastUserMessageText(messages);
  if (!userText) {
    return jsonError("No user message found in request", 400);
  }

  let agentRes: Response;
  try {
    agentRes = await fetch(`${baseUrl}/invoke/stream`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: userText,
        thread_id: parsed.data.threadId ?? crypto.randomUUID(),
        analytics_id: parsed.data.analyticsId ?? null,
        location_id: parsed.data.locationId ?? null,
        date_start: parsed.data.dateStart ?? null,
        date_end: parsed.data.dateEnd ?? null,
      }),
      signal: req.signal,
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to reach agents service";
    return jsonError(message, 502);
  }

  if (!agentRes.ok) {
    const text = await agentRes.text();
    return jsonError(
      `Agents service error (${agentRes.status}): ${text || agentRes.statusText}`,
      502
    );
  }

  const messageId = crypto.randomUUID();
  const textPartId = crypto.randomUUID();
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      controller.enqueue(
        encoder.encode(sseLine({ type: SSE_EVENT.START, messageId }))
      );
      controller.enqueue(
        encoder.encode(sseLine({ type: SSE_EVENT.TEXT_START, id: textPartId }))
      );

      const reader = agentRes.body?.getReader();
      if (!reader) {
        controller.enqueue(
          encoder.encode(sseLine({ type: SSE_EVENT.TEXT_END, id: textPartId }))
        );
        controller.enqueue(encoder.encode(sseLine({ type: SSE_EVENT.FINISH })));
        controller.enqueue(encoder.encode(sseLine(SSE_DONE)));
        controller.close();
        return;
      }

      await parseAgentSSEAndForward(reader, controller, textPartId, encoder);

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
