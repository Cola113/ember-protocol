/**
 * T2 AI SDK wiring. No Voices / Scribe / Curator business logic.
 *
 * - Reads GEMINI_API_KEY / AI_SDK_PROVIDER (and aliases) from env
 * - Wraps `generateObject` / `generateText` / `streamText` from `ai`
 * - No key, timeout, or HTTP failure → contract `model_unavailable`
 * - Ping: GET /api/ai/ping
 * - T4: generateModelText supports tools (adapters parse native function calls).
 *   streamText remains a single-delta replay — not a token SSE.
 */

import {
  generateObject,
  generateText,
  streamText,
  APICallError,
  JSONParseError,
  NoObjectGeneratedError,
  TypeValidationError,
  InvalidResponseDataError,
  type CoreMessage,
  type CoreTool,
  type LanguageModelV1
} from "ai";
import { z } from "zod";
import {
  modelUnavailable,
  validationError,
  type ContractError,
  type DegradedContractError
} from "@/lib/schemas/common";
import { createGoogleLanguageModel, createOpenAICompatibleLanguageModel } from "@/lib/ai/models";

export type AiProviderId = "google" | "openai" | "xai" | "anthropic";

export type AiResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: ContractError };

export interface AiRuntimeConfig {
  provider: AiProviderId;
  modelId: string;
  apiKey: string | null;
  configured: boolean;
  baseUrl: string;
}

const PROVIDER_ALIASES: Record<string, AiProviderId> = {
  google: "google",
  gemini: "google",
  openai: "openai",
  xai: "xai",
  grok: "xai",
  anthropic: "anthropic",
  claude: "anthropic"
};

const DEFAULT_MODELS: Record<AiProviderId, string> = {
  google: "gemini-2.0-flash",
  openai: "gpt-4o-mini",
  xai: "grok-2",
  anthropic: "claude-3-5-sonnet-latest"
};

const DEFAULT_BASE_URLS: Record<AiProviderId, string> = {
  google: "https://generativelanguage.googleapis.com/v1beta",
  openai: "https://api.openai.com/v1",
  xai: "https://api.x.ai/v1",
  anthropic: "https://api.anthropic.com/v1"
};

const PingSchema = z.object({
  ping: z.literal("pong")
});

function readEnv(env: NodeJS.ProcessEnv, names: string[]): string | null {
  for (const name of names) {
    const value = env[name]?.trim();
    if (value) return value;
  }
  return null;
}

function keyForProvider(env: NodeJS.ProcessEnv, provider: AiProviderId): string | null {
  switch (provider) {
    case "google":
      return readEnv(env, ["GEMINI_API_KEY", "GOOGLE_GENERATIVE_AI_API_KEY", "GOOGLE_API_KEY"]);
    case "openai":
      return readEnv(env, ["OPENAI_API_KEY"]);
    case "xai":
      return readEnv(env, ["XAI_API_KEY"]);
    case "anthropic":
      return readEnv(env, ["ANTHROPIC_API_KEY"]);
  }
}

function inferProvider(env: NodeJS.ProcessEnv): AiProviderId {
  const requested = env.AI_SDK_PROVIDER?.trim().toLowerCase();
  if (requested && PROVIDER_ALIASES[requested]) return PROVIDER_ALIASES[requested];
  const order: AiProviderId[] = ["google", "openai", "xai", "anthropic"];
  return order.find((provider) => keyForProvider(env, provider)) ?? "google";
}

function modelIdForProvider(env: NodeJS.ProcessEnv, provider: AiProviderId): string {
  const generic = readEnv(env, ["AI_SDK_MODEL"]);
  if (generic) return generic;
  switch (provider) {
    case "google":
      return readEnv(env, ["GEMINI_MODEL"]) ?? DEFAULT_MODELS.google;
    case "openai":
      return readEnv(env, ["OPENAI_MODEL"]) ?? DEFAULT_MODELS.openai;
    case "xai":
      return readEnv(env, ["XAI_MODEL"]) ?? DEFAULT_MODELS.xai;
    case "anthropic":
      return readEnv(env, ["ANTHROPIC_MODEL"]) ?? DEFAULT_MODELS.anthropic;
  }
}

function baseUrlForProvider(env: NodeJS.ProcessEnv, provider: AiProviderId): string {
  const generic = readEnv(env, ["AI_SDK_BASE_URL"]);
  if (generic) return generic;
  switch (provider) {
    case "google":
      return readEnv(env, ["GEMINI_API_BASE"]) ?? DEFAULT_BASE_URLS.google;
    case "openai":
      return readEnv(env, ["OPENAI_BASE_URL"]) ?? DEFAULT_BASE_URLS.openai;
    case "xai":
      return readEnv(env, ["XAI_BASE_URL"]) ?? DEFAULT_BASE_URLS.xai;
    case "anthropic":
      return readEnv(env, ["ANTHROPIC_BASE_URL"]) ?? DEFAULT_BASE_URLS.anthropic;
  }
}

export function readAiConfig(env: NodeJS.ProcessEnv = process.env): AiRuntimeConfig {
  const provider = inferProvider(env);
  const apiKey = keyForProvider(env, provider);
  return {
    provider,
    modelId: modelIdForProvider(env, provider),
    apiKey,
    configured: Boolean(apiKey),
    baseUrl: baseUrlForProvider(env, provider)
  };
}

export function redactSecrets(text: string): string {
  return text
    .replace(/key=[^&\s]+/gi, "key=REDACTED")
    .replace(/Bearer\s+\S+/gi, "Bearer REDACTED")
    .replace(/x-goog-api-key["']?\s*[:=]\s*["']?[^"'\s]+/gi, "x-goog-api-key=REDACTED");
}

const UNAVAILABLE_FALLBACK = "模型不可用，已按合同降级。";

const SCHEMA_ERROR_NAMES = new Set([
  "AI_NoObjectGeneratedError",
  "NoObjectGeneratedError",
  "AI_JSONParseError",
  "JSONParseError",
  "AI_TypeValidationError",
  "TypeValidationError",
  "AI_InvalidResponseDataError",
  "InvalidResponseDataError"
]);

function isObjectGenerationError(error: unknown): boolean {
  if (NoObjectGeneratedError.isInstance(error)) return true;
  if (JSONParseError.isInstance(error)) return true;
  if (TypeValidationError.isInstance(error)) return true;
  if (InvalidResponseDataError.isInstance(error)) return true;
  if (error instanceof Error && SCHEMA_ERROR_NAMES.has(error.name)) return true;
  if (error instanceof Error && error.cause) return isObjectGenerationError(error.cause);
  return false;
}

/** Schema / JSON / Zod failures are validation_error; transport/key/timeout are model_unavailable. */
export function mapAiSdkError(error: unknown): ContractError {
  if (isObjectGenerationError(error)) {
    const message = error instanceof Error && error.message.trim().length > 0
      ? error.message
      : "模型输出未通过 schema 校验，已丢弃。";
    return validationError(redactSecrets(message));
  }
  if (error instanceof Error && (error.name === "AbortError" || error.name === "TimeoutError")) {
    return modelUnavailable("模型调用超时。", UNAVAILABLE_FALLBACK);
  }
  if (APICallError.isInstance(error)) {
    return modelUnavailable(redactSecrets(error.message || "模型 HTTP 调用失败。"), UNAVAILABLE_FALLBACK);
  }
  if (error instanceof Error && error.message.trim().length > 0) {
    return modelUnavailable(redactSecrets(error.message), UNAVAILABLE_FALLBACK);
  }
  return modelUnavailable("模型不可用。", UNAVAILABLE_FALLBACK);
}

export function missingKeyError(config: AiRuntimeConfig): DegradedContractError {
  return modelUnavailable(
    `未配置 ${config.provider} 的 API key（GEMINI_API_KEY / AI_SDK_PROVIDER）。`,
    UNAVAILABLE_FALLBACK
  );
}

export function resolveLanguageModel(
  env: NodeJS.ProcessEnv = process.env
): AiResult<LanguageModelV1> & { config: AiRuntimeConfig } {
  const config = readAiConfig(env);
  if (!config.configured || !config.apiKey) {
    return { ok: false, error: missingKeyError(config), config };
  }
  if (config.provider === "anthropic") {
    return {
      ok: false,
      error: modelUnavailable(
        "T2 接线未覆盖 Anthropic Messages API；改用 google / openai / xai，或等后续任务补 adapter。",
        UNAVAILABLE_FALLBACK
      ),
      config
    };
  }
  if (config.provider === "google") {
    return {
      ok: true,
      data: createGoogleLanguageModel({
        provider: "google",
        modelId: config.modelId,
        apiKey: config.apiKey,
        baseUrl: config.baseUrl
      }),
      config
    };
  }
  return {
    ok: true,
    data: createOpenAICompatibleLanguageModel({
      provider: config.provider,
      modelId: config.modelId,
      apiKey: config.apiKey,
      baseUrl: config.baseUrl
    }),
    config
  };
}

export async function generateStructured<OBJECT>(options: {
  schema: z.ZodType<OBJECT>;
  prompt: string;
  system?: string;
  temperature?: number;
  abortSignal?: AbortSignal;
}): Promise<AiResult<OBJECT>> {
  if (!options.prompt.trim()) {
    return { ok: false, error: validationError("generateObject 需要非空 prompt。") };
  }
  const resolved = resolveLanguageModel();
  if (!resolved.ok) return { ok: false, error: resolved.error };
  try {
    const result = await generateObject({
      model: resolved.data,
      schema: options.schema,
      prompt: options.prompt,
      system: options.system,
      temperature: options.temperature,
      abortSignal: options.abortSignal,
      maxRetries: 0
    });
    return { ok: true, data: result.object };
  } catch (error) {
    return { ok: false, error: mapAiSdkError(error) };
  }
}

export async function streamModelText(options: {
  prompt: string;
  system?: string;
  temperature?: number;
  abortSignal?: AbortSignal;
}): Promise<AiResult<{ text: string }>> {
  if (!options.prompt.trim()) {
    return { ok: false, error: validationError("streamText 需要非空 prompt。") };
  }
  const resolved = resolveLanguageModel();
  if (!resolved.ok) return { ok: false, error: resolved.error };
  try {
    const result = await streamText({
      model: resolved.data,
      prompt: options.prompt,
      system: options.system,
      temperature: options.temperature,
      abortSignal: options.abortSignal,
      maxRetries: 0
    });
    const text = await result.text;
    return { ok: true, data: { text } };
  } catch (error) {
    return { ok: false, error: mapAiSdkError(error) };
  }
}

/**
 * One-shot generateText with optional tools. Used by Voices (T4).
 * Does not fake SSE: the HTTP route still returns a complete JSON envelope.
 */
export async function generateModelText(options: {
  prompt?: string;
  messages?: CoreMessage[];
  system?: string;
  tools?: Record<string, CoreTool>;
  maxSteps?: number;
  temperature?: number;
  abortSignal?: AbortSignal;
}): Promise<AiResult<{ text: string }>> {
  const hasPrompt = Boolean(options.prompt?.trim());
  const hasMessages = Boolean(options.messages && options.messages.length > 0);
  if (hasPrompt === hasMessages) {
    return { ok: false, error: validationError("generateText 需要非空 prompt 或 messages（互斥）。") };
  }
  const resolved = resolveLanguageModel();
  if (!resolved.ok) return { ok: false, error: resolved.error };
  try {
    const result = await generateText({
      model: resolved.data,
      system: options.system,
      ...(hasMessages ? { messages: options.messages } : { prompt: options.prompt }),
      tools: options.tools,
      maxSteps: options.maxSteps ?? 1,
      temperature: options.temperature,
      abortSignal: options.abortSignal,
      maxRetries: 0
    });
    return { ok: true, data: { text: result.text } };
  } catch (error) {
    return { ok: false, error: mapAiSdkError(error) };
  }
}

export async function pingAi(): Promise<
  AiResult<{ provider: AiProviderId; modelId: string; ping: "pong" }>
> {
  const generated = await generateStructured({
    schema: PingSchema,
    prompt: 'Return JSON {"ping":"pong"} with no other keys or commentary.',
    temperature: 0
  });
  if (!generated.ok) return generated;
  const config = readAiConfig();
  return {
    ok: true,
    data: {
      provider: config.provider,
      modelId: config.modelId,
      ping: generated.data.ping
    }
  };
}
