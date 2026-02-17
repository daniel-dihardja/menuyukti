type ModelResolver = {
  modelId: string;
  openaiModel: unknown;
};

export function resolveAiModelConfig(): { apiKey: string; modelId: string } {
  const apiKey = process.env.OPENAI_API_KEY?.trim() ?? "";
  const modelId = process.env.AI_EXPLORER_MODEL?.trim() || "gpt-4.1-mini";
  if (!apiKey) {
    throw new Error(
      "OPENAI_API_KEY is required for autonomous planner. Set it in apps/web/.env.",
    );
  }
  return { apiKey, modelId };
}

export async function loadOpenAiModel(): Promise<ModelResolver> {
  const { apiKey, modelId } = resolveAiModelConfig();

  // Runtime import keeps compile-time stable in offline environments until deps are installed.
  const runtimeImport = Function(
    "moduleName",
    "return import(moduleName)",
  ) as (moduleName: string) => Promise<unknown>;
  const providerModule = (await runtimeImport("@ai-sdk/openai")) as {
    createOpenAI: (options: { apiKey: string }) => (model: string) => unknown;
  };

  const createProvider = providerModule.createOpenAI;
  if (typeof createProvider !== "function") {
    throw new Error("Invalid @ai-sdk/openai module: createOpenAI not found");
  }

  const provider = createProvider({ apiKey });
  const openaiModel = provider(modelId);

  return { modelId, openaiModel };
}
