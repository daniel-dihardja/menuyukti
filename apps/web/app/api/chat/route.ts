import { openai } from "@ai-sdk/openai";
import { streamText, UIMessage, convertToModelMessages } from "ai";

// Allow streaming responses up to 30 seconds
export const maxDuration = 30;

function resolveOpenAIModelId(rawModel: string): string {
  if (rawModel.startsWith("openai:")) return rawModel.slice(7);
  if (rawModel.includes("/") || rawModel.includes("perplexity"))
    return "gpt-4o";
  return rawModel;
}

export async function POST(req: Request) {
  const body = await req.json();
  const messages: UIMessage[] = body.messages ?? [];
  const rawModel: string = body.model ?? "openai:gpt-4o";
  const webSearch: boolean = body.webSearch ?? false;
  const modelId = resolveOpenAIModelId(rawModel);

  const result = streamText({
    model: openai(modelId),
    messages: await convertToModelMessages(messages),
    system:
      "You are a helpful assistant that can answer questions and help with tasks",
    ...(webSearch && {
      tools: { web_search: openai.tools.webSearch() },
    }),
  });

  // send sources and reasoning back to the client
  return result.toUIMessageStreamResponse({
    sendSources: true,
    sendReasoning: true,
  });
}