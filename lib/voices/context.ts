import { CANON_READ, getCanonContext } from "@/lib/canon";
import type { VoicesCanonContext } from "@/lib/schemas/voices";
import type { Constitution } from "@/lib/schemas/constitution";
import type { PlayerState } from "@/lib/storage/stores";

export interface VoicesPlayerSnapshot {
  collectedPropositions: string[];
  believedTruths: string[];
  completedHotspotIds: string[];
  truthStates: PlayerState["truthStates"];
}

export function playerSnapshotFromState(state: PlayerState | null): VoicesPlayerSnapshot {
  return {
    collectedPropositions: state?.collectedPropositions ?? [],
    believedTruths: state?.believedTruths ?? [],
    completedHotspotIds: state?.completedHotspotIds ?? [],
    truthStates: state?.truthStates ?? {}
  };
}

/**
 * Server-side VoicesCanonContext. Client truth_ids / known_facts / insight_gates are discarded.
 * truth_ids are only believed truths (player-known). Prompt builders must still use getCanonContext
 * and must not inject true_facts or forbidden_claims.
 */
export function computeVoicesCanonContext(
  planetId: string,
  player: VoicesPlayerSnapshot,
  constitution: Readonly<Constitution>
): VoicesCanonContext {
  const knownFacts = unique(player.collectedPropositions.filter((id) => CANON_READ.isRegisteredProposition(id)));
  const truthIds = unique(player.believedTruths.filter((id) => CANON_READ.getAnchorTruth(id)));
  const unlockedInsights = new Set<string>();
  for (const truthId of truthIds) {
    const truth = CANON_READ.getAnchorTruth(truthId);
    for (const insightId of truth?.unlocked_insights ?? []) unlockedInsights.add(insightId);
  }
  const insightGates = unique(
    constitution.insight_gates
      .filter((gate) => {
        if (unlockedInsights.has(gate.insight_id)) return true;
        return gate.unlocks_clue_ids.some((clueId) => knownFacts.includes(clueId));
      })
      .map((gate) => gate.insight_id)
  );
  return {
    planet_id: planetId,
    truth_ids: truthIds,
    known_facts: knownFacts,
    insight_gates: insightGates
  };
}

export function promptSafePlanetFace(planetId: string) {
  return getCanonContext(planetId);
}

function unique(values: string[]): string[] {
  return Array.from(new Set(values.filter((value) => value.length > 0)));
}
