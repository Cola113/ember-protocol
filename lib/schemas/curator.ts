import { z } from "zod";
import { ContractVersionSchema, DegradedContractErrorSchema, modelUnavailable, validationError } from "./common";

export const CURATOR_TEMPERATURE = 0.2 as const;

export const CuratorSynthesizeInputSchema = z.object({
  truthId: z.string().min(1),
  hypothesisText: z.string().min(1).max(10000),
  pinnedPropositions: z.array(z.string().min(1)).max(100)
}).strict();
export type CuratorSynthesizeInput = z.infer<typeof CuratorSynthesizeInputSchema>;

export const SynthesisResultSchema = z.object({
  verdict: z.enum(["passed", "partial", "failed"]),
  coverage: z.number().min(0).max(1),
  correctness: z.number().min(0).max(1),
  coherence: z.number().min(0).max(1),
  feedback: z.string().min(1).max(4000)
}).strict();
export type SynthesisResult = z.infer<typeof SynthesisResultSchema>;

export const CuratorScoredResponseSchema = z.object({
  contract_version: ContractVersionSchema,
  status: z.literal("scored"),
  degraded: z.literal(false),
  truth_id: z.string().min(1),
  result: SynthesisResultSchema
}).strict();

export const CuratorHardGateResponseSchema = z.object({
  contract_version: ContractVersionSchema,
  status: z.literal("rejected"),
  degraded: z.literal(false),
  truth_id: z.string().min(1),
  error: z.object({
    error: z.literal("canon_violation"),
    message: z.string().min(1),
    retryable: z.literal(false),
    degraded: z.literal(false)
  }).strict(),
  missing_required_propositions: z.array(z.string().min(1)).min(1),
  result: SynthesisResultSchema
}).strict();

export const CuratorDegradationSchema = z.object({
  contract_version: ContractVersionSchema,
  status: z.literal("degraded"),
  degraded: z.literal(true),
  truth_id: z.string().min(1),
  error: DegradedContractErrorSchema,
  result: SynthesisResultSchema
}).strict();

export const CuratorResponseSchema = z.discriminatedUnion("status", [
  CuratorScoredResponseSchema,
  CuratorHardGateResponseSchema,
  CuratorDegradationSchema
]);
export type CuratorResponse = z.infer<typeof CuratorResponseSchema>;

export function missingRequiredPropositions(required: readonly string[], pinned: readonly string[]): string[] {
  const pinnedSet = new Set(pinned);
  return required.filter((proposition) => !pinnedSet.has(proposition));
}

export function hardGateResult(truthId: string, required: readonly string[], pinned: readonly string[]): CuratorResponse | null {
  const missing = missingRequiredPropositions(required, pinned);
  if (missing.length === 0) return null;
  return {
    contract_version: "v1.1",
    status: "rejected",
    degraded: false,
    truth_id: truthId,
    error: {
      error: "canon_violation",
      message: `硬门拒绝：缺少必要命题 ${missing.join(", ")}。`,
      retryable: false,
      degraded: false
    },
    missing_required_propositions: missing,
    result: {
      verdict: "failed",
      coverage: 0,
      correctness: 0,
      coherence: 0,
      feedback: `硬门拒绝：缺少必要命题 ${missing.join(", ")}，不得进入 LLM 评分，也不得标记为 believed。`
    }
  };
}

export function curatorDegradedResult(truthId: string, message = "Curator 模型不可用，已使用确定性降级评分。"): CuratorDegradationSchemaType {
  return {
    contract_version: "v1.1",
    status: "degraded",
    degraded: true,
    truth_id: truthId,
    error: modelUnavailable(message, "请补齐命题后重试。"),
    result: { verdict: "partial", coverage: 0, correctness: 0, coherence: 0, feedback: "模型不可用，保留为 suspected。" }
  };
}

export type CuratorDegradationSchemaType = z.infer<typeof CuratorDegradationSchema>;

export function validateCuratorInput(value: unknown) {
  const parsed = CuratorSynthesizeInputSchema.safeParse(value);
  return parsed.success ? parsed : { success: false as const, error: validationError("Curator 请求参数不符合 v1.1 合同。") };
}
