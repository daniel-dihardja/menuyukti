import type { UIMessage } from "ai";

// Allow streaming responses up to 30 seconds
export const maxDuration = 30;

function getLastUserMessageText(messages: UIMessage[]): string | null {
  for (let i = messages.length - 1; i >= 0; i--) {
    const msg = messages[i];
    if (msg.role !== "user") continue;
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

export async function POST(req: Request) {
  const agentsUrl = process.env.AGENTS_URL;
  if (!agentsUrl?.trim()) {
    return new Response(
      JSON.stringify({ error: "AGENTS_URL is not configured" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }

  let body: { messages?: UIMessage[] };
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const messages: UIMessage[] = body.messages ?? [];
  const userText = getLastUserMessageText(messages);
  if (!userText) {
    return new Response(
      JSON.stringify({ error: "No user message found in request" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  const baseUrl = agentsUrl.replace(/\/$/, "");
  let agentRes: Response;
  try {
    agentRes = await fetch(`${baseUrl}/invoke/stream`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: userText }),
      signal: req.signal,
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to reach agents service";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 502, headers: { "Content-Type": "application/json" } }
    );
  }

  if (!agentRes.ok) {
    const text = await agentRes.text();
    return new Response(
      JSON.stringify({
        error: `Agents service error (${agentRes.status}): ${text || agentRes.statusText}`,
      }),
      {
        status: 502,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  const messageId = crypto.randomUUID();
  const textPartId = crypto.randomUUID();
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      controller.enqueue(
        encoder.encode(sseLine({ type: "start", messageId }))
      );
      controller.enqueue(
        encoder.encode(sseLine({ type: "text-start", id: textPartId }))
      );

      const reader = agentRes.body?.getReader();
      if (!reader) {
        controller.enqueue(
          encoder.encode(sseLine({ type: "text-end", id: textPartId }))
        );
        controller.enqueue(encoder.encode(sseLine({ type: "finish" })));
        controller.enqueue(encoder.encode(sseLine("[DONE]" as const)));
        controller.close();
        return;
      }

      const decoder = new TextDecoder();
      let buffer = "";
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n\n");
          buffer = lines.pop() ?? "";
          for (const line of lines) {
            const match = line.match(/^data: (.+)$/m);
            if (!match) continue;
            const payload = match[1].trim();
            if (payload === "[DONE]") {
              continue;
            }
            try {
              const data = JSON.parse(payload) as {
                delta?: string;
                error?: string;
              };
              if (data.error) {
                controller.enqueue(
                  encoder.encode(
                    sseLine({ type: "error", errorText: data.error })
                  )
                );
                break;
              }
              if (typeof data.delta === "string" && data.delta) {
                controller.enqueue(
                  encoder.encode(
                    sseLine({
                      type: "text-delta",
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

      controller.enqueue(
        encoder.encode(sseLine({ type: "text-end", id: textPartId }))
      );
      controller.enqueue(encoder.encode(sseLine({ type: "finish" })));
      controller.enqueue(encoder.encode(sseLine("[DONE]" as const)));
      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-store",
      "x-vercel-ai-ui-message-stream": "v1",
    },
  });
}
