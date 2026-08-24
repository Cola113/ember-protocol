import { z } from "zod";
import { DegradedContractErrorSchema, ContractVersionSchema } from "./common";

export const ConstitutionNpcSchema = z.object({
  npc_id: z.string().min(1),
  display_name: z.string().min(1),
  role: z.string().min(1),
  personality: z.string().min(1),
  taboos: z.array(z.string().min(1)),
  speech_register: z.string().min(1),
  registered_insight_ids: z.array(z.string().min(1)).default([])
}).strict();

export const InsightGateSchema = z.object({
  insight_id: z.string().min(1),
  response_mode: z.enum(["warmer", "guarded", "hostile", "revealing"]),
  unlocks_clue_ids: z.array(z.string().min(1)).default([])
}).strict();

export const ArchiveFillPolicySchema = z.object({
  allow_local_events: z.boolean(),
  allow_environment_descriptions: z.boolean(),
  allow_shallow_npc_cards: z.boolean(),
  forbidden_outputs: z.array(z.string().min(1))
}).strict();

export const ConstitutionSchema = z.object({
  planet_id: z.string().min(1),
  display_name: z.string().min(1),
  era_voice: z.string().min(1),
  vocabulary: z.array(z.string().min(1)),
  taboos: z.array(z.string().min(1)),
  true_facts: z.array(z.string().min(1)),
  believed_facts: z.array(z.string().min(1)),
  forbidden_claims: z.array(z.string().min(1)),
  npc_roster: z.array(ConstitutionNpcSchema),
  insight_gates: z.array(InsightGateSchema),
  speech_register: z.string().min(1),
  archive_fill_policy: ArchiveFillPolicySchema
}).strict();
export type Constitution = z.infer<typeof ConstitutionSchema>;

export const ConstitutionDegradationSchema = z.object({
  contract_version: ContractVersionSchema,
  ok: z.literal(false),
  error: DegradedContractErrorSchema,
  action: z.enum(["reject_and_use_persisted_constitution", "reject_request"])
}).strict();

export function validateConstitution(value: unknown) {
  const parsed = ConstitutionSchema.safeParse(value);
  if (parsed.success) return { contract_version: "v1.1" as const, ok: true as const, constitution: parsed.data };
  return {
    contract_version: "v1.1" as const,
    ok: false as const,
    error: {
      error: "canon_violation" as const,
      message: "宪章未通过 schema 校验或包含越权字段。服务器丢弃该产物。",
      retryable: false,
      degraded: true
    },
    action: "reject_and_use_persisted_constitution" as const
  };
}
