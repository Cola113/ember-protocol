import { CANON_READ } from "@/lib/canon";

export interface BelievedTruthContext {
  truthId: string;
  code: string;
  title: string;
  cue: string;
}

/**
 * Convert server-owned believed IDs into the small context surface Voices can
 * inject. Unknown/client-invented IDs are silently excluded.
 */
export function believedTruthContext(believedTruthIds: readonly string[]): BelievedTruthContext[] {
  return believedTruthIds
    .map((truthId) => CANON_READ.getAnchorTruth(truthId))
    .filter((truth): truth is NonNullable<typeof truth> => Boolean(truth))
    .map((truth) => ({
      truthId: truth.id,
      code: truth.code,
      title: truth.title,
      cue: `记录员已理解「${truth.title}」；后续对话使用“你已知道”的语气，不把它当作新发现。`
    }));
}

/** Prompt-safe text for the NPC layer. */
export function buildBelievedTruthInjection(believedTruthIds: readonly string[]): string {
  const contexts = believedTruthContext(believedTruthIds);
  if (contexts.length === 0) return "当前没有已确证的锚定真相。";
  return contexts
    .map((context) => `- ${context.code} / ${context.title}：${context.cue}`)
    .join("\n");
}
