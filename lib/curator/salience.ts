import { CANON_READ } from "@/lib/canon";
import type { PlayerState, TruthStatus } from "@/lib/storage/stores";

export interface TruthSalience {
  truthId: string;
  status: TruthStatus;
  /** Normalized probability signal for callers that want a 0..1 value. */
  score: number;
  /** Multiplicative weight for clue/hotspot selection. */
  weight: number;
  connected: boolean;
}

export interface SalienceMap {
  readonly [truthId: string]: TruthSalience;
}

const SALIENCE_BY_STATUS: Record<TruthStatus, Pick<TruthSalience, "score" | "weight">> = {
  unknown: { score: 0.15, weight: 1 },
  encountered: { score: 0.7, weight: 1.8 },
  suspected: { score: 0.85, weight: 2.2 },
  believed: { score: 0.2, weight: 0.55 }
};

/**
 * Return an immutable salience signal for one truth. Salience only reads
 * player state and Canon; it never mutates either object or rewrites truth
 * content.
 */
export function salienceForTruth(
  truthId: string,
  status: TruthStatus = "unknown"
): TruthSalience {
  const values = SALIENCE_BY_STATUS[status];
  return Object.freeze({
    truthId,
    status,
    score: values.score,
    weight: values.weight,
    connected: status === "believed"
  });
}

/** Build salience signals for every registered anchor truth. */
export function salienceForPlayerState(
  state: Pick<PlayerState, "truthStates"> | null | undefined
): SalienceMap {
  const map: Record<string, TruthSalience> = {};
  for (const truth of CANON_READ.listAnchorTruths()) {
    map[truth.id] = salienceForTruth(truth.id, state?.truthStates[truth.id] ?? "unknown");
  }
  return Object.freeze(map) as SalienceMap;
}

/** Stable alias for UI and Voices callers. */
export const getSalience = salienceForPlayerState;

/** Read-only helper for a single truth using a player snapshot. */
export function getTruthSalience(
  truthId: string,
  state: Pick<PlayerState, "truthStates"> | null | undefined
): TruthSalience {
  return salienceForTruth(truthId, state?.truthStates[truthId] ?? "unknown");
}
