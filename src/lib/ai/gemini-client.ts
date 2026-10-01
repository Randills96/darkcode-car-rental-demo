const FALLBACK_MODELS = [
  "gemini-3.5-flash",
  "gemini-3.8-flash",
  "gemini-3.1-flash-lite",
  "gemini-flash-lite-latest",
];

export async function analyzeImagesWithGemini(options: {
  apiKey: string;
  systemPrompt: string;
  userPrompt: string;
  images: Array<{ base64: string; mimeType: string }>;
  model?: string;
}): Promise<string> {
  const model = options.model || FALLBACK_MODELS[0];
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(options.apiKey)}`;

  const userParts: Array<
    | { text: string }
    | { inlineData: { mimeType: string; data: string } }
  > = [];

  for (const img of options.images) {
    userParts.push({
      inlineData: {
        mimeType: img.mimeType || "image/jpeg",
        data: img.base64,
      },
    });
  }

  userParts.push({ text: options.userPrompt });

  const body: Record<string, unknown> = {
    contents: [
      {
        role: "user",
        parts: userParts,
      },
    ],
    generationConfig: {
      responseMimeType: "application/json",
      temperature: 0.1,
    },
  };

  if (options.systemPrompt.trim()) {
    body.systemInstruction = {
      parts: [{ text: options.systemPrompt }],
    };
  }

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorText = await response.text();
    // Try the next fallback model in the list
    const currentIndex = FALLBACK_MODELS.indexOf(model);
    const nextModel = currentIndex >= 0 && currentIndex < FALLBACK_MODELS.length - 1
      ? FALLBACK_MODELS[currentIndex + 1]
      : null;

    if (nextModel) {
      console.warn(`Gemini model ${model} failed (${response.status}), falling back to ${nextModel}...`);
      return analyzeImagesWithGemini({ ...options, model: nextModel });
    }
    throw new Error(`Gemini API error (${response.status}): ${errorText.slice(0, 300)}`);
  }

  const data = (await response.json()) as {
    candidates?: Array<{
      content?: {
        parts?: Array<{ text?: string }>;
      };
    }>;
  };

  let text = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
  if (!text) {
    throw new Error("Gemini returned an empty response");
  }

  // Strip markdown code fences if present (e.g. ```json ... ```)
  if (text.startsWith("```")) {
    text = text.replace(/^```(?:json)?\s*\n?/, "").replace(/\n?```\s*$/, "").trim();
  }

  return text;
}

export async function createGeminiChatCompletion(options: {
  apiKey: string;
  model?: string;
  messages: Array<{
    role: "system" | "user" | "assistant";
    content: string;
  }>;
  json?: boolean;
  temperature?: number;
}): Promise<string> {
  const model = options.model || FALLBACK_MODELS[0];
  const url = "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions";

  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${options.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages: options.messages,
      temperature: options.temperature ?? 0.2,
      ...(options.json ? { response_format: { type: "json_object" } } : {}),
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    const currentIndex = FALLBACK_MODELS.indexOf(model);
    const nextModel = currentIndex >= 0 && currentIndex < FALLBACK_MODELS.length - 1
      ? FALLBACK_MODELS[currentIndex + 1]
      : null;

    if (nextModel) {
      console.warn(`Gemini chat model ${model} failed (${response.status}), falling back to ${nextModel}...`);
      return createGeminiChatCompletion({ ...options, model: nextModel });
    }
    throw new Error(`Gemini Chat error (${response.status}): ${errorText.slice(0, 300)}`);
  }

  const data = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };

  const content = data.choices?.[0]?.message?.content?.trim();
  if (!content) {
    throw new Error("Gemini returned an empty response");
  }

  return content;
}
