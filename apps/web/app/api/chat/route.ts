import { openai } from "@ai-sdk/openai";
import {
  streamText,
  UIMessage,
  convertToModelMessages,
  Output,
} from "ai";
import { z } from "zod";

// Allow streaming responses up to 30 seconds
export const maxDuration = 30;


const intentSchema = z.object({
  intent: z.enum(["generate_monthly_posts", "unknown"]),
});

export async function POST(req: Request) {
  const body = await req.json();
  const messages: UIMessage[] = body.messages ?? [];
  const webSearch: boolean = body.webSearch ?? false;
  const modelId = "gpt-4o-mini";

  const result = streamText({
    model: openai(modelId),
    messages: await convertToModelMessages(messages),
    system: `
You are an intent classifier for a restaurant marketing assistant.

Your task is to determine whether the user wants to generate monthly Instagram posts based on restaurant sales data.

Classify as "generate_monthly_posts" when the user wants to create, generate, draft, or prepare Instagram posts or a monthly Instagram content plan.

Classify as "unknown" for anything else.

Return only the structured output.
`.trim(),
    output: Output.object({
      schema: intentSchema,
    }),
    ...(webSearch && {
      tools: { web_search: openai.tools.webSearch() },
    }),
  });

  return result.toUIMessageStreamResponse({
    sendSources: true,
    sendReasoning: true,
  });
}