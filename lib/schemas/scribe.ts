import { z } from "zod";
import { ContractErrorSchema, ContractVersionSchema, modelUnavailable, validationError } from "./common";

export const SCRIBE_TEMPERATURE = 0.7 as const;

export const ScribeGenerateInputSchema = z.object({
  planetId: z.string().min(1),
  landingSiteId: z.string().min(1)
}).strict();
export type ScribeGenerateInput = z.infer<typeof ScribeGenerateInputSchema>;

export const ScribeNpcCardSchema = z.object({
  npc_id: z.string().min(1),
  name: z.string().min(1),
  role: z.string().min(1),
  disposition: z.string().min(1),
  tells: z.array(z.string().min(1)).max(8)
}).strict();

export const DossierSchema = z.object({
  planet_id: z.string().min(1),
  landing_site_id: z.string().min(1),
  title: z.string().min(1),
  summary: z.string().min(1).max(3000),
  today_event: z.object({
    title: z.string().min(1),
    description: z.string().min(1).max(2000)
  }).strict(),
  environment: z.object({
    description: z.string().min(1).max(3000),
    hazards: z.array(z.string().min(1)).max(12),
    phenomena: z.array(z.string().min(1)).max(12)
  }).strict(),
  local_npcs: z.array(ScribeNpcCardSchema).max(8),
  archive_fill_notes: z.string().min(1).max(1000)
}).strict();
export type Dossier = z.infer<typeof DossierSchema>;

export const ScribeGenerateResponseSchema = z.discriminatedUnion("status", [
  z.object({
    contract_version: ContractVersionSchema,
    status: z.literal("generated"),
    cached: z.literal(false),
    dossier: DossierSchema
  }).strict(),
  z.object({
    contract_version: ContractVersionSchema,
    status: z.literal("cache_hit"),
    cached: z.literal(true),
    dossier: DossierSchema
  }).strict()
]);
export type ScribeGenerateResponse = z.infer<typeof ScribeGenerateResponseSchema>;

export const ScribeDegradationSchema = z.object({
  contract_version: ContractVersionSchema,
  status: z.literal("degraded"),
  error: ContractErrorSchema,
  dossier: DossierSchema
}).strict();

const SCRIBE_FALLBACK: Dossier = {
  planet_id: "unknown",
  landing_site_id: "unknown",
  title: "档案暂缺",
  summary: "该地点的档案尚未完成对齐。",
  today_event: { title: "无可靠事件记录", description: "请返回探针后重试。" },
  environment: { description: "环境读数不可用。", hazards: [], phenomena: [] },
  local_npcs: [],
  archive_fill_notes: "模型不可用时仅提供模板，不得补写主线事实。"
};

export function parseDossier(value: unknown): Dossier | null {
  const parsed = DossierSchema.safeParse(value);
  return parsed.success ? parsed.data : null;
}

export function scribeDegradedResponse(message = "Scribe 模型不可用，已使用模板档案。", ids?: Partial<Pick<Dossier, "planet_id" | "landing_site_id">>): ScribeDegradationSchemaType {
  const dossier = { ...SCRIBE_FALLBACK, ...ids };
  return {
    contract_version: "v1",
    status: "degraded",
    error: modelUnavailable(message, dossier.summary),
    dossier
  };
}

export type ScribeDegradationSchemaType = z.infer<typeof ScribeDegradationSchema>;

export function validateScribeInput(value: unknown) {
  const parsed = ScribeGenerateInputSchema.safeParse(value);
  return parsed.success ? parsed : { success: false as const, error: validationError("Scribe 请求参数不符合 v1 合同。") };
}
