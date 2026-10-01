export type AiProvider = "gemini" | "openai" | "none";

export function getAiConfig() {
  const geminiKey = process.env.GEMINI_API_KEY?.trim();
  const openAiKey = process.env.OPENAI_API_KEY?.trim();

  if (geminiKey) {
    return {
      provider: "gemini" as AiProvider,
      apiKey: geminiKey,
      model: process.env.GEMINI_MODEL?.trim() || "gemini-3.5-flash",
      enabled: true,
    };
  }

  if (openAiKey) {
    return {
      provider: "openai" as AiProvider,
      apiKey: openAiKey,
      model: process.env.OPENAI_MODEL?.trim() || "gpt-4o-mini",
      enabled: true,
    };
  }

  return {
    provider: "none" as AiProvider,
    apiKey: undefined,
    model: "",
    enabled: false,
  };
}

export function isAiEnabled(): boolean {
  return getAiConfig().enabled;
}
