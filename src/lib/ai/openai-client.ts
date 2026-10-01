import { getAiConfig } from "@/lib/ai/config";
import {
  analyzeImagesWithGemini,
  createGeminiChatCompletion,
} from "@/lib/ai/gemini-client";

const OPENAI_API_URL = "https://api.openai.com/v1/chat/completions";

type ChatMessage = {
  role: "system" | "user" | "assistant";
  content:
    | string
    | Array<
        | { type: "text"; text: string }
        | { type: "image_url"; image_url: { url: string; detail?: "low" | "high" | "auto" } }
      >;
};

export async function createChatCompletion(options: {
  messages: ChatMessage[];
  json?: boolean;
  maxTokens?: number;
  temperature?: number;
}): Promise<string> {
  const config = getAiConfig();
  if (!config.enabled || !config.apiKey) {
    throw new Error(
      "AI is not configured. Add GEMINI_API_KEY (recommended) or OPENAI_API_KEY to your environment."
    );
  }

  if (config.provider === "gemini") {
    // Simplify messages to string content for text chat completion
    const textMessages = options.messages.map((m) => ({
      role: m.role,
      content: typeof m.content === "string" ? m.content : JSON.stringify(m.content),
    }));
    return createGeminiChatCompletion({
      apiKey: config.apiKey,
      model: config.model,
      messages: textMessages,
      json: options.json,
      temperature: options.temperature,
    });
  }

  const response = await fetch(OPENAI_API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: config.model,
      messages: options.messages,
      max_tokens: options.maxTokens ?? 900,
      temperature: options.temperature ?? 0.2,
      ...(options.json ? { response_format: { type: "json_object" } } : {}),
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`OpenAI request failed (${response.status}): ${body.slice(0, 240)}`);
  }

  const data = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };

  const content = data.choices?.[0]?.message?.content?.trim();
  if (!content) {
    throw new Error("OpenAI returned an empty response");
  }

  return content;
}

export async function analyzeImagesWithText(options: {
  systemPrompt: string;
  userPrompt: string;
  images: Array<{ base64: string; mimeType: string }>;
  json?: boolean;
  maxTokens?: number;
}): Promise<string> {
  const config = getAiConfig();
  if (!config.enabled || !config.apiKey) {
    throw new Error(
      "AI is not configured. Add GEMINI_API_KEY (recommended) or OPENAI_API_KEY to your environment."
    );
  }

  if (config.provider === "gemini") {
    return analyzeImagesWithGemini({
      apiKey: config.apiKey,
      model: config.model,
      systemPrompt: options.systemPrompt,
      userPrompt: options.userPrompt,
      images: options.images,
    });
  }

  const content: ChatMessage["content"] = [
    { type: "text", text: options.userPrompt },
    ...options.images.map((image) => ({
      type: "image_url" as const,
      image_url: {
        url: `data:${image.mimeType};base64,${image.base64}`,
        detail: "high" as const,
      },
    })),
  ];

  return createChatCompletion({
    json: options.json,
    maxTokens: options.maxTokens ?? 900,
    messages: [
      { role: "system", content: options.systemPrompt },
      { role: "user", content },
    ],
  });
}

export async function analyzeImageWithText(options: {
  systemPrompt: string;
  userPrompt: string;
  imageBase64: string;
  mimeType: string;
  json?: boolean;
}): Promise<string> {
  return analyzeImagesWithText({
    systemPrompt: options.systemPrompt,
    userPrompt: options.userPrompt,
    images: [{ base64: options.imageBase64, mimeType: options.mimeType }],
    json: options.json,
  });
}
