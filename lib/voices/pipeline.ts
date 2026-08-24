import type { CoreMessage } from "ai";
import { generateModelText } from "@/lib/ai/provider";
import { violatesForbiddenClaims } from "@/lib/canon";
import { getDataStore, type DataStore } from "@/lib/datastore";
import { SLOT_IDS, type SlotId } from "@/lib/save-system";
import { validationError, type ContractError } from "@/lib/schemas/common";
import {
  parseVoicesOutput,
  prepareVoicesRequest,
  validateVoicesInput,
  voicesHardReject,
  VOICES_TEMPERATURE,
  type VoicesChatInput,
  type VoicesChatResponse,
  type VoicesOutput,
  type VoicesResult
} from "@/lib/schemas/voices";
import type { NpcMemory } from "@/lib/storage/stores";
import { computeVoicesCanonContext, playerSnapshotFromState } from "./context";
import { dialogueFallbackOutput } from "./fallback";
import { buildVoicesSystemPrompt } from "./prompts";
import { npcMayOfferInsight, resolveVoicesSubject, type VoicesSubject } from "./subject";
import { createVoicesTools, type VoicesToolContext } from "./tools";

const VOICES_MAX_STEPS = 4;

export interface VoicesGenerateRequest {
  system: string;
  messages: CoreMessage[];
  tools: ReturnType<typeof createVoicesTools>;
}

export type VoicesGenerateFn = (
  request: VoicesGenerateRequest
) => Promise<{ ok: true; data: { text: string } } | { ok: false; error: ContractError }>;

export interface RunVoicesChatOptions {
  store?: DataStore;
  slotId?: SlotId;
  now?: number;
  generate?: VoicesGenerateFn;
  resolveSubject?: typeof resolveVoicesSubject;
}

/**
 * Voices transport is one-shot JSON (contract allows).
 * T2 adapters still replay doGenerate as a single delta, so HTTP SSE would be fake streaming.
 * Real token deltas + tool streaming belong in T6.
 */
export async function runVoicesChat(
  raw: unknown,
  options: RunVoicesChatOptions = {}
): Promise<VoicesChatResponse> {
  const store = options.store ?? getDataStore();
  const slotId = options.slotId ?? "auto";
  const now = options.now ?? Date.now();
  const resolveSubject = options.resolveSubject ?? resolveVoicesSubject;

  const parsedInput = validateVoicesInput(raw);
  if (!parsedInput.success) return voicesHardReject(parsedInput.error);

  const subjectResult = resolveSubject(parsedInput.data.npcId);
  if (!subjectResult.ok) return voicesHardReject(subjectResult.error);
  const subject = subjectResult.subject;

  const playerState = await store.playerState.load(slotId);
  const player = playerSnapshotFromState(playerState);
  const memory = await store.npcCache.get(slotId, subject.npcId);
  const serverCanonContext = computeVoicesCanonContext(subject.planetId, player, subject.constitution);

  const prepared = prepareVoicesRequest(raw, serverCanonContext);
  if (!prepared.success) return voicesHardReject(prepared.error);
  const request = prepared.data;
  const lastUserText = lastUserContent(request.messages);

  const toolContext: VoicesToolContext = { subject, player, memory };
  const tools = createVoicesTools(toolContext);
  const generate = options.generate ?? defaultVoicesGenerate;
  const generated = await generate({
    system: buildVoicesSystemPrompt({ subject, canonContext: request.canonContext, memory }),
    messages: toCoreMessages(memory, request),
    tools
  });

  const result = generated.ok
    ? finalizeModelText(generated.data.text, subject, memory, lastUserText)
    : degradeFromModelError(generated.error, subject.npcId, memory, lastUserText);

  const output = result.ok ? result.output : result.fallback;
  await persistTurns(store, slotId, subject, memory, lastUserText, output, now);
  return result;
}

export function parseVoicesSlot(value: string | null | undefined): { ok: true; slotId: SlotId } | { ok: false; error: ContractError } {
  const raw = (value ?? "").trim() || "auto";
  if ((SLOT_IDS as readonly string[]).includes(raw)) {
    return { ok: true, slotId: raw as SlotId };
  }
  return { ok: false, error: validationError(`未知存档槽：${raw}`) };
}

export function slotFromRequest(request: Request) {
  const url = new URL(request.url);
  return parseVoicesSlot(url.searchParams.get("slot") || request.headers.get("x-ember-slot"));
}

export function extractJsonObject(text: string): unknown {
  const trimmed = text.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = (fenced ? fenced[1] : trimmed).trim();
  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");
  if (start < 0 || end <= start) {
    throw new Error("模型输出不含 JSON 对象。");
  }
  return JSON.parse(candidate.slice(start, end + 1)) as unknown;
}

function defaultVoicesGenerate(request: VoicesGenerateRequest) {
  return generateModelText({
    system: request.system,
    messages: request.messages,
    tools: request.tools,
    maxSteps: VOICES_MAX_STEPS,
    temperature: VOICES_TEMPERATURE
  });
}

function finalizeModelText(
  text: string,
  subject: VoicesSubject,
  memory: NpcMemory | null,
  lastUserText: string
): VoicesResult {
  let raw: unknown;
  try {
    raw = extractJsonObject(text);
  } catch {
    return remapDegraded(
      parseVoicesOutput(undefined),
      subject.npcId,
      memory,
      lastUserText
    );
  }

  const parsed = parseVoicesOutput(raw);
  if (!parsed.ok) {
    return remapDegraded(parsed, subject.npcId, memory, lastUserText);
  }

  const insightId = parsed.output.offer_insight_id;
  if (insightId && !npcMayOfferInsight(subject, insightId)) {
    return degradeWithDialogue(
      subject.npcId,
      memory,
      lastUserText,
      {
        error: "canon_violation",
        message: "Voices 模型交付了不属于该 NPC 的 insight_id，已丢弃并回退保底句。",
        retryable: false,
        degraded: true
      }
    );
  }

  if (violatesForbiddenClaims(subject.constitution, parsed.output.say)) {
    return degradeWithDialogue(
      subject.npcId,
      memory,
      lastUserText,
      {
        error: "canon_violation",
        message: "Voices 模型输出触碰禁言，已丢弃并回退保底句。",
        retryable: false,
        degraded: true
      }
    );
  }

  return parsed;
}

function degradeFromModelError(
  error: ContractError,
  npcId: string,
  memory: NpcMemory | null,
  lastUserText: string
): VoicesResult {
  if (error.error === "model_unavailable") {
    return degradeWithDialogue(npcId, memory, lastUserText, error);
  }
  return degradeWithDialogue(npcId, memory, lastUserText, {
    error: error.error === "canon_violation" ? "canon_violation" : "validation_error",
    message: error.message,
    retryable: false,
    degraded: true
  });
}

function remapDegraded(
  result: VoicesResult,
  npcId: string,
  memory: NpcMemory | null,
  lastUserText: string
): VoicesResult {
  if (result.ok) return result;
  return degradeWithDialogue(npcId, memory, lastUserText, result.error);
}

function degradeWithDialogue(
  npcId: string,
  memory: NpcMemory | null,
  lastUserText: string,
  error: ContractError
): VoicesResult {
  const fallback = dialogueFallbackOutput(npcId, memory, lastUserText);
  const message =
    error.error === "model_unavailable"
      ? error.message
      : error.message;
  return {
    contract_version: "v1.1",
    ok: false,
    degraded: true,
    error: {
      error: error.error === "cache_hit" ? "validation_error" : error.error,
      message,
      retryable: error.error === "model_unavailable",
      degraded: true,
      fallback: fallback.say
    },
    fallback
  };
}

function toCoreMessages(memory: NpcMemory | null, request: VoicesChatInput): CoreMessage[] {
  const messages: CoreMessage[] = [];
  const seen = new Set<string>();
  const push = (role: "user" | "assistant", content: string) => {
    const key = `${role}:${content}`;
    if (!content.trim() || seen.has(key)) return;
    seen.add(key);
    messages.push({ role, content });
  };
  for (const turn of memory?.turns.slice(-12) ?? []) {
    push(turn.role, turn.content);
  }
  for (const message of request.messages) {
    if (message.role === "user" || message.role === "assistant") {
      push(message.role, message.content);
    }
  }
  if (!messages.some((message) => message.role === "user")) {
    messages.push({ role: "user", content: lastUserContent(request.messages) || "……" });
  }
  return messages;
}

function lastUserContent(messages: VoicesChatInput["messages"]): string {
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    if (messages[index]?.role === "user") return messages[index].content;
  }
  return messages[0]?.content ?? "";
}

async function persistTurns(
  store: DataStore,
  slotId: SlotId,
  subject: VoicesSubject,
  memory: NpcMemory | null,
  lastUserText: string,
  output: VoicesOutput,
  now: number
): Promise<void> {
  const relationship = clampInt((memory?.relationship ?? 0) + output.relationship_delta, -100, 100);
  const notes = output.offer_insight_id
    ? [...(memory?.notes ?? []), `offered:${output.offer_insight_id}`].slice(-20)
    : memory?.notes;
  if (lastUserText.trim()) {
    await store.npcCache.appendTurn(
      slotId,
      subject.npcId,
      { role: "user", content: lastUserText, at: now },
      { planet_id: subject.planetId }
    );
  }
  await store.npcCache.appendTurn(
    slotId,
    subject.npcId,
    { role: "assistant", content: output.say, at: now + 1, lie: output.lie },
    {
      planet_id: subject.planetId,
      relationship,
      last_mood: output.mood,
      notes
    }
  );
}

function clampInt(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(max, Math.max(min, Math.trunc(value)));
}
