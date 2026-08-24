import type {
  LanguageModelV1,
  LanguageModelV1CallOptions,
  LanguageModelV1FinishReason,
  LanguageModelV1Prompt,
  LanguageModelV1StreamPart
} from "@ai-sdk/provider";

const DEFAULT_TIMEOUT_MS = 20_000;

export interface HttpLanguageModelOptions {
  provider: string;
  modelId: string;
  apiKey: string;
  baseUrl: string;
  timeoutMs?: number;
}

function promptToTextMessages(
  prompt: LanguageModelV1Prompt
): { role: "system" | "user" | "assistant"; content: string }[] {
  const messages: { role: "system" | "user" | "assistant"; content: string }[] = [];
  for (const message of prompt) {
    if (message.role === "system") {
      messages.push({ role: "system", content: message.content });
      continue;
    }
    if (message.role === "user") {
      const content = message.content
        .map((part) => (part.type === "text" ? part.text : ""))
        .join("");
      messages.push({ role: "user", content: content || " " });
      continue;
    }
    if (message.role === "assistant") {
      const content = message.content
        .map((part) => (part.type === "text" ? part.text : ""))
        .join("");
      if (content) messages.push({ role: "assistant", content });
    }
  }
  if (!messages.some((message) => message.role === "user")) {
    messages.push({ role: "user", content: "Follow the instructions and reply." });
  }
  return messages;
}

function wantsJson(options: LanguageModelV1CallOptions): boolean {
  return (
    options.mode?.type === "object-json" ||
    options.mode?.type === "object-tool" ||
    options.responseFormat?.type === "json"
  );
}

function mapFinishReason(reason: string | undefined): LanguageModelV1FinishReason {
  switch ((reason ?? "").toUpperCase()) {
    case "STOP":
      return "stop";
    case "MAX_TOKENS":
    case "LENGTH":
      return "length";
    case "SAFETY":
    case "CONTENT_FILTER":
      return "content-filter";
    default:
      return "stop";
  }
}

function textStreamFromGenerate(
  text: string | undefined,
  finishReason: LanguageModelV1FinishReason,
  usage: { promptTokens: number; completionTokens: number }
): ReadableStream<LanguageModelV1StreamPart> {
  return new ReadableStream<LanguageModelV1StreamPart>({
    start(controller) {
      if (text) {
        controller.enqueue({ type: "text-delta", textDelta: text });
      }
      controller.enqueue({ type: "finish", finishReason, usage });
      controller.close();
    }
  });
}

async function readHttpJson(
  url: string,
  init: Omit<RequestInit, "signal">,
  timeoutMs: number,
  abortSignal?: AbortSignal
): Promise<{ status: number; body: unknown }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const onParentAbort = () => controller.abort();
  abortSignal?.addEventListener("abort", onParentAbort);
  try {
    const response = await fetch(url, { ...init, signal: controller.signal });
    const body: unknown = await response.json().catch(() => null);
    return { status: response.status, body };
  } finally {
    clearTimeout(timer);
    abortSignal?.removeEventListener("abort", onParentAbort);
  }
}

export function extractHttpErrorMessage(status: number, body: unknown): string {
  const record = body && typeof body === "object" ? (body as Record<string, unknown>) : null;
  const nested = record?.error;
  if (nested && typeof nested === "object" && nested !== null && "message" in nested) {
    const message = (nested as { message?: unknown }).message;
    if (typeof message === "string" && message.length > 0) return message;
  }
  if (typeof record?.message === "string" && record.message.length > 0) return record.message;
  return `模型 HTTP ${status}`;
}

/**
 * Gemini generateContent adapter. T2 skeleton: doStream replays doGenerate as one delta.
 * Auth goes in `x-goog-api-key` so the URL never contains the key.
 */
export function createGoogleLanguageModel(options: HttpLanguageModelOptions): LanguageModelV1 {
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const modelPath = options.modelId.startsWith("models/")
    ? options.modelId
    : `models/${options.modelId}`;
  const endpoint = `${options.baseUrl.replace(/\/$/, "")}/${modelPath}:generateContent`;

  const model: LanguageModelV1 = {
    specificationVersion: "v1",
    provider: options.provider,
    modelId: options.modelId,
    defaultObjectGenerationMode: "json",
    supportsStructuredOutputs: false,
    async doGenerate(call) {
      const messages = promptToTextMessages(call.prompt);
      const system = messages
        .filter((message) => message.role === "system")
        .map((message) => message.content)
        .join("\n");
      const contents = messages
        .filter((message) => message.role !== "system")
        .map((message) => ({
          role: message.role === "assistant" ? "model" : "user",
          parts: [{ text: message.content }]
        }));

      const generationConfig: Record<string, unknown> = {
        temperature: call.temperature,
        maxOutputTokens: call.maxTokens
      };
      if (wantsJson(call)) generationConfig.responseMimeType = "application/json";

      const payload: Record<string, unknown> = { contents, generationConfig };
      if (system) payload.systemInstruction = { parts: [{ text: system }] };

      const { status, body } = await readHttpJson(
        endpoint,
        {
          method: "POST",
          headers: {
            "content-type": "application/json",
            "x-goog-api-key": options.apiKey
          },
          body: JSON.stringify(payload)
        },
        timeoutMs,
        call.abortSignal
      );

      if (status >= 400) {
        throw new Error(extractHttpErrorMessage(status, body));
      }

      const envelope = body as {
        candidates?: { content?: { parts?: { text?: string }[] }; finishReason?: string }[];
        usageMetadata?: { promptTokenCount?: number; candidatesTokenCount?: number };
      };
      const candidate = envelope?.candidates?.[0];
      const text = candidate?.content?.parts?.map((part) => part.text ?? "").join("") ?? "";
      const usage = {
        promptTokens: envelope?.usageMetadata?.promptTokenCount ?? 0,
        completionTokens: envelope?.usageMetadata?.candidatesTokenCount ?? 0
      };

      return {
        text,
        finishReason: mapFinishReason(candidate?.finishReason),
        usage,
        rawCall: { rawPrompt: payload, rawSettings: { provider: options.provider, model: options.modelId } }
      };
    },
    async doStream(call) {
      const generated = await model.doGenerate(call);
      return {
        stream: textStreamFromGenerate(generated.text, generated.finishReason, generated.usage),
        rawCall: generated.rawCall
      };
    }
  };

  return model;
}

/**
 * OpenAI-compatible Chat Completions (OpenAI + xAI). Streaming is replayed as one delta.
 */
export function createOpenAICompatibleLanguageModel(options: HttpLanguageModelOptions): LanguageModelV1 {
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const endpoint = `${options.baseUrl.replace(/\/$/, "")}/chat/completions`;

  const model: LanguageModelV1 = {
    specificationVersion: "v1",
    provider: options.provider,
    modelId: options.modelId,
    defaultObjectGenerationMode: "json",
    supportsStructuredOutputs: false,
    async doGenerate(call) {
      const messages = promptToTextMessages(call.prompt);
      const payload: Record<string, unknown> = {
        model: options.modelId,
        messages,
        temperature: call.temperature,
        max_tokens: call.maxTokens,
        stream: false
      };
      if (wantsJson(call)) {
        payload.response_format = { type: "json_object" };
      }

      const { status, body } = await readHttpJson(
        endpoint,
        {
          method: "POST",
          headers: {
            "content-type": "application/json",
            authorization: `Bearer ${options.apiKey}`
          },
          body: JSON.stringify(payload)
        },
        timeoutMs,
        call.abortSignal
      );

      if (status >= 400) {
        throw new Error(extractHttpErrorMessage(status, body));
      }

      const envelope = body as {
        choices?: { message?: { content?: string | null }; finish_reason?: string }[];
        usage?: { prompt_tokens?: number; completion_tokens?: number };
      };
      const choice = envelope?.choices?.[0];
      const text = choice?.message?.content ?? "";
      const usage = {
        promptTokens: envelope?.usage?.prompt_tokens ?? 0,
        completionTokens: envelope?.usage?.completion_tokens ?? 0
      };

      return {
        text,
        finishReason: mapFinishReason(choice?.finish_reason),
        usage,
        rawCall: { rawPrompt: payload, rawSettings: { provider: options.provider, model: options.modelId } }
      };
    },
    async doStream(call) {
      const generated = await model.doGenerate(call);
      return {
        stream: textStreamFromGenerate(generated.text, generated.finishReason, generated.usage),
        rawCall: generated.rawCall
      };
    }
  };

  return model;
}
