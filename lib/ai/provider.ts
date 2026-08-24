/**
 * T2 AI SDK wiring. No Voices / Scribe / Curator business logic.
 *
 * - Reads GEMINI_API_KEY / AI_SDK_PROVIDER (and aliases) from env
 * - Wraps `generateObject` / `streamText` from `ai`
 * - No key, timeout, or HTTP failure → contract `model_unavailable`
 * - Ping: GET /api/ai/ping
 */

import { generateObject, streamText, APICallError, type LanguageModelV1 } from "ai";
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

export function readAiConfig(env: NodeJS.ProcessEnv = process.env): AiRuntimeConfig {
  const provider = inferProvider(env);
  const apiKey = keyForProvider(env, provider);
  const modelId =
    readEnv(env, ["AI_SDK_MODEL", "GEMINI_MODEL", "OPENAI_MODEL"]) ?? DEFAULT_MODELS[provider];
  const baseUrl =
    readEnv(env, ["AI_SDK_BASE_URL", "GEMINI_API_BASE", "OPENAI_BASE_URL", "XAI_BASE_URL"]) ??
    DEFAULT_BASE_URLS[provider];
  return {
    provider,
    modelId,
    apiKey,
    configured: Boolean(apiKey),
    baseUrl
  };
}

export function redactSecrets(text: string): string {
  return text
    .replace(/key=[^&\s]+/gi, "key=REDACTED")
    .replace(/Bearer\s+\S+/gi, "Bearer REDACTED")
    .replace(/x-goog-api-key["']?\s*[:=]\s*["']?[^"'\s]+/gi, "x-goog-api-key=REDACTED");
}

const UNAVAILABLE_FALLBACK = "模型不可用，已按合同降级。";

export function mapAiSdkError(error: unknown): DegradedContractError {
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
