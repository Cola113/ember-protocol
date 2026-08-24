import { z } from "zod";
import { CANON_READ } from "@/lib/canon";
import { canonViolation, ContractVersionSchema, DegradedContractErrorSchema, validationError } from "./common";

export const VOICES_TEMPERATURE = 0.8 as const;

export const VoiceMessageSchema = z.object({
  role: z.enum(["system", "user", "assistant", "tool"]),
  content: z.string().min(1).max(12000)
}).strict();

export const PlayerLogEntrySchema = z.object({
  id: z.string().min(1),
  text: z.string().min(1),
  insight_id: z.string().min(1).optional(),
  truth_id: z.string().min(1).optional(),
  confidence: z.enum(["unknown", "suspected", "confirmed"]).default("unknown")
}).strict();

export const VoicesCanonContextSchema = z.object({
  planet_id: z.string().min(1),
  truth_ids: z.array(z.string().min(1)).default([]),
  known_facts: z.array(z.string().min(1)).default([]),
  insight_gates: z.array(z.string().min(1)).default([])
}).strict();
export type VoicesCanonContext = z.infer<typeof VoicesCanonContextSchema>;

export const VoicesChatInputSchema = z.object({
  messages: z.array(VoiceMessageSchema).min(1).max(100),
  npcId: z.string().min(1),
  canonContext: VoicesCanonContextSchema,
  playerLog: z.array(PlayerLogEntrySchema).max(200)
}).strict();
export type VoicesChatInput = z.infer<typeof VoicesChatInputSchema>;

export const VoicesOutputSchema = z.object({
  say: z.string().min(1).max(4000),
  mood: z.string().min(1).max(64),
  offer_insight_id: z.string().min(1).nullable(),
  relationship_delta: z.number().int().min(-2).max(2),
  lie: z.boolean()
}).strict();
export type VoicesOutput = z.infer<typeof VoicesOutputSchema>;

export const ConsultCanonInputSchema = z.object({ query: z.string().min(1).max(500) }).strict();
export const RecallPlayerLogInputSchema = z.object({ topic: z.string().min(1).max(200) }).strict();
export const OfferClueInputSchema = z.object({ clue_id: z.string().min(1) }).strict();

export const VoicesToolCallSchema = z.discriminatedUnion("tool", [
  z.object({ tool: z.literal("consult_canon"), input: ConsultCanonInputSchema }).strict(),
  z.object({ tool: z.literal("recall_player_log"), input: RecallPlayerLogInputSchema }).strict(),
  z.object({ tool: z.literal("offer_clue"), input: OfferClueInputSchema }).strict()
]);
export type VoicesToolCall = z.infer<typeof VoicesToolCallSchema>;

export const VoicesDegradationSchema = z.object({
  contract_version: ContractVersionSchema,
  ok: z.literal(false),
  degraded: z.literal(true),
  error: DegradedContractErrorSchema,
  fallback: VoicesOutputSchema
}).strict();

export const VoicesResultSchema = z.discriminatedUnion("ok", [
  z.object({ contract_version: ContractVersionSchema, ok: z.literal(true), degraded: z.literal(false), output: VoicesOutputSchema }).strict(),
  VoicesDegradationSchema
]);
export type VoicesResult = z.infer<typeof VoicesResultSchema>;

const VOICES_FALLBACK: VoicesOutput = {
  say: "记录员，请稍候。残响正在重新对齐档案。",
  mood: "neutral-melancholy",
  offer_insight_id: null,
  relationship_delta: 0,
  lie: false
};

export function parseVoicesOutput(value: unknown): VoicesResult {
  const parsed = VoicesOutputSchema.safeParse(value);
  if (parsed.success && (parsed.data.offer_insight_id === null || CANON_READ.isRegisteredInsight(parsed.data.offer_insight_id))) {
    return { contract_version: "v1.1", ok: true, degraded: false, output: parsed.data };
  }

  const isUnregisteredInsight = parsed.success && parsed.data.offer_insight_id !== null;
  return {
    contract_version: "v1.1",
    ok: false,
    degraded: true,
    error: {
      error: isUnregisteredInsight ? "canon_violation" : "validation_error",
      message: isUnregisteredInsight
        ? "Voices 模型交付了未登记的 insight_id，已丢弃并回退保底句。"
        : "Voices 模型输出未通过 schema 校验，已丢弃并回退保底句。",
      retryable: false,
      degraded: true,
      fallback: VOICES_FALLBACK.say
    },
    fallback: VOICES_FALLBACK
  };
}

export function validateVoicesInput(value: unknown) {
  const parsed = VoicesChatInputSchema.safeParse(value);
  if (!parsed.success) return { success: false as const, error: validationError("Voices 请求参数不符合 v1.1 合同。") };
  if (!CANON_READ.getNpc(parsed.data.npcId)) {
    return { success: false as const, error: canonViolation(`未知 npcId：${parsed.data.npcId}`) };
  }
  return parsed;
}

/** Replace all client-supplied canon claims with the server-computed context. */
export function prepareVoicesRequest(value: unknown, serverCanonContext: VoicesCanonContext) {
  const parsed = validateVoicesInput(value);
  if (!parsed.success) return parsed;
  const serverContext = VoicesCanonContextSchema.safeParse(serverCanonContext);
  if (!serverContext.success) {
    return { success: false as const, error: validationError("服务端重算的 canonContext 不符合 v1.1 合同。") };
  }
  return {
    success: true as const,
    data: { ...parsed.data, canonContext: serverContext.data }
  };
}
