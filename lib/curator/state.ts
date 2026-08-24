import type { AnchorTruth } from "@/lib/canon";
import type { TruthStatus } from "@/lib/storage/stores";

/** Monotonic order for the server-side truth state machine. */
export const TRUTH_STATUS_RANK: Record<TruthStatus, number> = {
  unknown: 0,
  encountered: 1,
  suspected: 2,
  believed: 3
};

export const SYNTHESIS_PASS_THRESHOLDS = Object.freeze({
  coverage: 0.75,
  correctness: 0.75,
  coherence: 0.6
});

/**
 * Derive the next non-believed state from the propositions known by the
 * player. A truth can only become suspected after every required proposition
 * is present; Curator scoring is the only transition into believed.
 */
export function statusForPropositions(
  truth: Pick<AnchorTruth, "required_propositions">,
  propositions: readonly string[],
  current: TruthStatus = "unknown"
): TruthStatus {
  if (current === "believed") return "believed";

  const propositionSet = new Set(propositions);
  const matched = truth.required_propositions.filter((proposition) => propositionSet.has(proposition)).length;
  const derived: TruthStatus = matched === 0
    ? "unknown"
    : matched === truth.required_propositions.length
      ? "suspected"
      : "encountered";

  // Sidecar state is monotonic too. This preserves a suspected truth if an
  // older client sends a stale proposition snapshot.
  return TRUTH_STATUS_RANK[derived] >= TRUTH_STATUS_RANK[current] ? derived : current;
}

export function isSynthesisPassed(result: {
  verdict: "passed" | "partial" | "failed";
  coverage: number;
  correctness: number;
  coherence: number;
}): boolean {
  return result.verdict === "passed"
    && result.coverage >= SYNTHESIS_PASS_THRESHOLDS.coverage
    && result.correctness >= SYNTHESIS_PASS_THRESHOLDS.correctness
    && result.coherence >= SYNTHESIS_PASS_THRESHOLDS.coherence;
}
