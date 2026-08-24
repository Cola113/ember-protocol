import type {
  LanguageModelV1,
  LanguageModelV1CallOptions,
  LanguageModelV1FinishReason,
  LanguageModelV1FunctionToolCall,
  LanguageModelV1StreamPart
} from "@ai-sdk/provider";
import {
  parseGeminiToolCalls,
  parseOpenAIToolCalls,
  promptSystemText,
  regularToolChoice,
  regularTools,
  toGeminiContents,
  toGeminiToolConfig,
  toGeminiToolDeclarations,
  toOpenAIMessages,
  toOpenAIToolChoice,
  toOpenAITools
} from "@/lib/ai/convert-prompt";

const DEFAULT_TIMEOUT_MS = 20_000;

export interface HttpLanguageModelOptions {
  provider: string;
  modelId: string;
  apiKey: string;
  baseUrl: string;
  timeoutMs?: number;
}

function wantsJson(options: LanguageModelV1CallOptions): boolean {
  return (
    options.mode?.type === "object-json" ||
    options.mode?.type === "object-tool" ||
    options.responseFormat?.type === "json"
  );
}

function mapFinishReason(
  reason: string | undefined,
  toolCalls: LanguageModelV1FunctionToolCall[]
): LanguageModelV1FinishReason {
  if (toolCalls.length > 0) return "tool-calls";
  switch ((reason ?? "").toUpperCase()) {
    case "STOP":
      return "stop";
    case "MAX_TOKENS":
    case "LENGTH":
      return "length";
    case "SAFETY":
    case "CONTENT_FILTER":
      return "content-filter";
    case "TOOL_CALLS":
    case "FUNCTION_CALL":
      return "tool-calls";
    default:
      return "stop";
  }
}

function streamFromGenerate(
  text: string | undefined,
  toolCalls: LanguageModelV1FunctionToolCall[] | undefined,
  finishReason: LanguageModelV1FinishReason,
  usage: { promptTokens: number; completionTokens: number }
): ReadableStream<LanguageModelV1StreamPart> {
  return new ReadableStream<LanguageModelV1StreamPart>({
    start(controller) {
      if (text) {
        controller.enqueue({ type: "text-delta", textDelta: text });
      }
      for (const call of toolCalls ?? []) {
        controller.enqueue({ type: "tool-call", ...call });
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
 * Gemini generateContent adapter.
 * T2: doStream still replays doGenerate (not token SSE). T4 adds native function calls.
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
      const tools = regularTools(call);
      const jsonMode = wantsJson(call) && tools.length === 0;
      const generationConfig: Record<string, unknown> = {
        temperature: call.temperature,
        maxOutputTokens: call.maxTokens
      };
      if (jsonMode) generationConfig.responseMimeType = "application/json";

      const payload: Record<string, unknown> = {
        contents: toGeminiContents(call.prompt),
        generationConfig
      };
      const system = promptSystemText(call.prompt);
      if (system) payload.systemInstruction = { parts: [{ text: system }] };
      if (tools.length > 0) {
        payload.tools = [toGeminiToolDeclarations(tools)];
        const toolConfig = toGeminiToolConfig(regularToolChoice(call));
        if (toolConfig) payload.toolConfig = toolConfig;
      }

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
        candidates?: {
          content?: { parts?: Array<{ text?: string; functionCall?: { name?: string; args?: unknown } }> };
          finishReason?: string;
        }[];
        usageMetadata?: { promptTokenCount?: number; candidatesTokenCount?: number };
      };
      const candidate = envelope?.candidates?.[0];
      const parsed = parseGeminiToolCalls(candidate?.content?.parts);
      const usage = {
        promptTokens: envelope?.usageMetadata?.promptTokenCount ?? 0,
        completionTokens: envelope?.usageMetadata?.candidatesTokenCount ?? 0
      };

      return {
        text: parsed.text,
        toolCalls: parsed.toolCalls.length > 0 ? parsed.toolCalls : undefined,
        finishReason: mapFinishReason(candidate?.finishReason, parsed.toolCalls),
        usage,
        rawCall: { rawPrompt: payload, rawSettings: { provider: options.provider, model: options.modelId } }
      };
    },
    async doStream(call) {
      const generated = await model.doGenerate(call);
      return {
        stream: streamFromGenerate(generated.text, generated.toolCalls, generated.finishReason, generated.usage),
        rawCall: generated.rawCall
      };
    }
  };

  return model;
}

/**
 * OpenAI-compatible Chat Completions (OpenAI + xAI).
 * T2: doStream still replays doGenerate. T4 adds tools / tool_calls.
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
      const tools = regularTools(call);
      const jsonMode = wantsJson(call) && tools.length === 0;
      const payload: Record<string, unknown> = {
        model: options.modelId,
        messages: toOpenAIMessages(call.prompt),
        temperature: call.temperature,
        max_tokens: call.maxTokens,
        stream: false
      };
      if (jsonMode) {
        payload.response_format = { type: "json_object" };
      }
      if (tools.length > 0) {
        payload.tools = toOpenAITools(tools);
        const toolChoice = toOpenAIToolChoice(regularToolChoice(call));
        if (toolChoice) payload.tool_choice = toolChoice;
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
        choices?: {
          message?: {
            content?: string | null;
            tool_calls?: Array<{ id?: string; function?: { name?: string; arguments?: string } }>;
          };
          finish_reason?: string;
        }[];
        usage?: { prompt_tokens?: number; completion_tokens?: number };
      };
      const choice = envelope?.choices?.[0];
      const parsed = parseOpenAIToolCalls(choice?.message);
      const usage = {
        promptTokens: envelope?.usage?.prompt_tokens ?? 0,
        completionTokens: envelope?.usage?.completion_tokens ?? 0
      };

      return {
        text: parsed.text,
        toolCalls: parsed.toolCalls.length > 0 ? parsed.toolCalls : undefined,
        finishReason: mapFinishReason(choice?.finish_reason, parsed.toolCalls),
        usage,
        rawCall: { rawPrompt: payload, rawSettings: { provider: options.provider, model: options.modelId } }
      };
    },
    async doStream(call) {
      const generated = await model.doGenerate(call);
      return {
        stream: streamFromGenerate(generated.text, generated.toolCalls, generated.finishReason, generated.usage),
        rawCall: generated.rawCall
      };
    }
  };

  return model;
}
