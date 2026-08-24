import { generateStructured, type AiResult } from "@/lib/ai/provider";
import { CANON_READ, type AnchorTruth } from "@/lib/canon";
import { getDataStore, type DataStore } from "@/lib/datastore";
import { SLOT_IDS, type SlotId } from "@/lib/save-system";
import {
  CuratorSynthesizeInputSchema,
  CURATOR_TEMPERATURE,
  SynthesisResultSchema,
  curatorDegradedResult,
  hardGateResult,
  type CuratorResponse,
  type SynthesisResult
} from "@/lib/schemas/curator";
import { canonViolation, validationError, type ContractError } from "@/lib/schemas/common";
import type { PlayerState } from "@/lib/storage/stores";
import { isSynthesisPassed, statusForPropositions } from "./state";

export interface CuratorGenerateRequest {
  truth: Readonly<AnchorTruth>;
  hypothesisText: string;
  pinnedPropositions: readonly string[];
  playerState: PlayerState | null;
  abortSignal?: AbortSignal;
}

export type CuratorGenerateFn = (
  request: CuratorGenerateRequest
) => Promise<AiResult<SynthesisResult>>;

export interface RunCuratorOptions {
  store?: DataStore;
  slotId?: SlotId;
  generate?: CuratorGenerateFn;
  abortSignal?: AbortSignal;
}

export interface CuratorRunResult {
  response: CuratorResponse | CuratorErrorResponse;
  httpStatus: number;
}

/** Minimal error envelope for request/canon failures outside the frozen score union. */
export interface CuratorErrorResponse {
  contract_version: "v1.1";
  status: "rejected";
  degraded: false;
  truth_id: string;
  error: ContractError;
}

export async function runCuratorSynthesis(
  raw: unknown,
  options: RunCuratorOptions = {}
): Promise<CuratorRunResult> {
  const parsed = CuratorSynthesizeInputSchema.safeParse(raw);
  if (!parsed.success) {
    return rejectedResponse(
      "unknown",
      validationError("Curator 请求参数不符合 v1.1 合同。"),
      400
    );
  }

  const input = parsed.data;
  const truth = CANON_READ.getAnchorTruth(input.truthId);
  if (!truth) {
    return rejectedResponse(
      input.truthId,
      canonViolation(`未登记的锚定真相：${input.truthId}。`),
      400
    );
  }

  const store = options.store ?? getDataStore();
  const slotId = options.slotId ?? "auto";
  const current = await store.playerState.load(slotId);
  const knownPropositions = current?.collectedPropositions ?? [];
  const invalidPinned = input.pinnedPropositions.filter((proposition) => !CANON_READ.isRegisteredProposition(proposition));
  if (invalidPinned.length > 0) {
    return hardGateReject(
      truth.id,
      invalidPinned,
      `硬门拒绝：包含未登记命题 ${invalidPinned.join(", ")}，不得进入 LLM 评分。`
    );
  }

  const currentStatus = current?.truthStates[input.truthId] ?? "unknown";
  if (currentStatus === "believed") {
    const response: CuratorResponse = {
      contract_version: "v1.1",
      status: "scored",
      degraded: false,
      truth_id: input.truthId,
      result: {
        verdict: "passed",
        coverage: 1,
        correctness: 1,
        coherence: 1,
        feedback: "该真相已确证；服务端保持 believed，不重复调用模型。"
      }
    };
    await recordAttempt(store, slotId, input, response.result, false);
    return { response, httpStatus: 200 };
  }

  const effectivePinned = unique([...knownPropositions, ...input.pinnedPropositions]);
  const missing = truth.required_propositions.filter((proposition) => !effectivePinned.includes(proposition));
  if (missing.length > 0) {
    await persistProgress(store, slotId, input.pinnedPropositions, truth, effectivePinned);
    return {
      response: hardGateResult(truth.id, truth.required_propositions, effectivePinned)!,
      httpStatus: 200
    };
  }

  const progressed = await persistProgress(store, slotId, input.pinnedPropositions, truth, effectivePinned);
  const playerState = progressed ?? await store.playerState.load(slotId);
  const generate = options.generate ?? defaultCuratorGenerate;
  const generated = await generate({
    truth,
    hypothesisText: input.hypothesisText,
    pinnedPropositions: effectivePinned,
    playerState,
    abortSignal: options.abortSignal
  });

  if (!generated.ok) {
    const degraded = curatorDegradedFromError(truth.id, generated.error);
    await recordAttempt(store, slotId, input, degraded.result, true);
    return { response: degraded, httpStatus: 200 };
  }

  const parsedResult = SynthesisResultSchema.safeParse(generated.data);
  if (!parsedResult.success) {
    const degraded = curatorDegradedFromError(
      truth.id,
      validationError("Curator 模型输出未通过 schema 校验，已丢弃。")
    );
    await recordAttempt(store, slotId, input, degraded.result, true);
    return { response: degraded, httpStatus: 200 };
  }

  const result = normalizeResult(parsedResult.data);
  if (isSynthesisPassed(result)) {
    const marked = await store.playerState.markBelieved(slotId, truth.id);
    if (!marked.ok) {
      const degraded = curatorDegradedFromError(truth.id, marked.error);
      await recordAttempt(store, slotId, input, degraded.result, true);
      return { response: degraded, httpStatus: 200 };
    }
  }
  await recordAttempt(store, slotId, input, result, false);

  return {
    response: {
      contract_version: "v1.1",
      status: "scored",
      degraded: false,
      truth_id: truth.id,
      result
    },
    httpStatus: 200
  };
}

export function parseCuratorSlot(value: string | null | undefined): { ok: true; slotId: SlotId } | { ok: false; error: ContractError } {
  const raw = (value ?? "").trim() || "auto";
  if ((SLOT_IDS as readonly string[]).includes(raw)) return { ok: true, slotId: raw as SlotId };
  return { ok: false, error: validationError(`未知存档槽：${raw}`) };
}

export function curatorSlotFromRequest(request: Request) {
  const url = new URL(request.url);
  return parseCuratorSlot(url.searchParams.get("slot") || request.headers.get("x-ember-slot"));
}

function defaultCuratorGenerate(request: CuratorGenerateRequest): Promise<AiResult<SynthesisResult>> {
  return generateStructured({
    schema: SynthesisResultSchema,
    temperature: CURATOR_TEMPERATURE,
    prompt: buildCuratorPrompt(request),
    system: "你是余烬协议 Curator。只对玩家假说评分，不创造新的正典事实。返回严格 JSON。",
    abortSignal: request.abortSignal
  });
}

function buildCuratorPrompt(request: CuratorGenerateRequest): string {
  const { truth } = request;
  return [
    "请对以下综合假说按覆盖度、正确性、连贯性评分。",
    `锚定真相：${truth.id} / ${truth.title}`,
    `正典摘要：${truth.summary}`,
    `必要命题（服务器已确认）：${truth.required_propositions.join(", ")}`,
    `评分线索（仅用于判断是否表达了核心含义）：${truth.keywords.join(", ")}`,
    `玩家已钉命题：${request.pinnedPropositions.join(", ")}`,
    `玩家假说：\n<hypothesis>${request.hypothesisText}</hypothesis>`,
    "verdict 必须是 passed、partial 或 failed；三个分数均为 0 到 1。feedback 用温和、可行动的中文指出缺失或冲突。"
  ].join("\n");
}

function normalizeResult(result: SynthesisResult): SynthesisResult {
  if (result.verdict === "passed" && !isSynthesisPassed(result)) {
    return {
      ...result,
      verdict: "partial",
      feedback: `${result.feedback} 评分未达到确证阈值，暂保留为 suspected。`.slice(0, 4000)
    };
  }
  return result;
}

function curatorDegradedFromError(truthId: string, error: ContractError) {
  if (error.error === "model_unavailable") return curatorDegradedResult(truthId, error.message);
  const fallback = curatorDegradedResult(truthId, error.message);
  return {
    ...fallback,
    error: {
      ...fallback.error,
      error: error.error,
      message: error.message,
      retryable: error.retryable,
      degraded: true as const
    }
  };
}

function hardGateReject(truthId: string, missing: readonly string[], message: string): CuratorRunResult {
  return {
    response: {
      contract_version: "v1.1",
      status: "rejected",
      degraded: false,
      truth_id: truthId,
      error: {
        ...canonViolation(message),
        degraded: false
      },
      missing_required_propositions: [...missing],
      result: {
        verdict: "failed",
        coverage: 0,
        correctness: 0,
        coherence: 0,
        feedback: message
      }
    },
    httpStatus: 200
  };
}

function rejectedResponse(truthId: string, error: ContractError, httpStatus: number): CuratorRunResult {
  return {
    response: { contract_version: "v1.1", status: "rejected", degraded: false, truth_id: truthId, error },
    httpStatus
  };
}

async function persistProgress(
  store: DataStore,
  slotId: SlotId,
  pinned: readonly string[],
  truth: AnchorTruth,
  effectivePinned: readonly string[]
): Promise<PlayerState | null> {
  for (const proposition of pinned) await store.playerState.addProposition(slotId, proposition);
  const current = await store.playerState.load(slotId);
  const currentStatus = current?.truthStates[truth.id] ?? "unknown";
  const nextStatus = statusForPropositions(truth, effectivePinned, currentStatus);
  if (nextStatus !== currentStatus && nextStatus !== "believed") {
    const updated = await store.playerState.setTruthStatus(slotId, truth.id, nextStatus);
    return updated.ok ? updated.data : current;
  }
  return current;
}

async function recordAttempt(
  store: DataStore,
  slotId: SlotId,
  input: { truthId: string; hypothesisText: string; pinnedPropositions: string[] },
  result: SynthesisResult,
  degraded: boolean
): Promise<void> {
  await store.synthesisAttempts.record({
    slotId,
    truthId: input.truthId,
    hypothesisText: input.hypothesisText,
    pinnedPropositions: input.pinnedPropositions,
    result,
    degraded
  });
}

function unique(values: readonly string[]): string[] {
  return Array.from(new Set(values.filter((value) => value.trim().length > 0)));
}
