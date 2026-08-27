import { z } from "zod";

const Vec3 = z.tuple([z.number(), z.number(), z.number()]);
const Quat = z.tuple([z.number(), z.number(), z.number(), z.number()]);

export const YardBlueprintPartSchema = z.object({
  instanceId: z.string().min(1),
  catalogId: z.string().min(1),
  position: Vec3,
  rotation: Quat,
});

export const YardBlueprintJointSchema = z.object({
  aId: z.string().min(1),
  aSocketId: z.string().min(1),
  bId: z.string().min(1),
  bSocketId: z.string().min(1),
  anchor: Vec3,
  /** Cumulative damage in [0, 1). Broken joints are omitted, not stored at 1. */
  damage: z.number().min(0).lt(1).optional(),
});

export const YardBlueprintSchema = z
  .object({
    version: z.literal(1),
    savedAt: z.number().int().nonnegative(),
    parts: z.array(YardBlueprintPartSchema).max(48),
    joints: z.array(YardBlueprintJointSchema).max(48),
  })
  .superRefine((blueprint, ctx) => {
    const ids = new Set<string>();
    blueprint.parts.forEach((part, index) => {
      if (ids.has(part.instanceId)) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["parts", index, "instanceId"], message: "duplicate instanceId" });
      }
      ids.add(part.instanceId);
    });
    const usedSockets = new Set<string>();
    blueprint.joints.forEach((joint, index) => {
      if (!ids.has(joint.aId)) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["joints", index, "aId"], message: "unknown joint endpoint" });
      if (!ids.has(joint.bId)) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["joints", index, "bId"], message: "unknown joint endpoint" });
      if (joint.aId === joint.bId) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["joints", index], message: "self joint is not allowed" });
      for (const key of [`${joint.aId}:${joint.aSocketId}`, `${joint.bId}:${joint.bSocketId}`]) {
        if (usedSockets.has(key)) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["joints", index], message: "socket already welded" });
        usedSockets.add(key);
      }
    });
  });

export type YardBlueprint = z.infer<typeof YardBlueprintSchema>;
export type YardBlueprintPart = z.infer<typeof YardBlueprintPartSchema>;
export type YardBlueprintJoint = z.infer<typeof YardBlueprintJointSchema>;

export const YARD_BLUEPRINT_KEYS = {
  auto: "ember_yard_construct_auto",
  slot1: "ember_yard_construct_slot_1",
  slot2: "ember_yard_construct_slot_2",
  slot3: "ember_yard_construct_slot_3",
} as const;

export type YardBlueprintSlot = keyof typeof YARD_BLUEPRINT_KEYS;

export function readYardBlueprint(slot: YardBlueprintSlot): YardBlueprint | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(YARD_BLUEPRINT_KEYS[slot]);
  if (!raw) return null;
  try {
    const parsed = YardBlueprintSchema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

export function writeYardBlueprint(slot: YardBlueprintSlot, blueprint: YardBlueprint): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(YARD_BLUEPRINT_KEYS[slot], JSON.stringify(blueprint));
}
