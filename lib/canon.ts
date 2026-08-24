import canonData from "@/docs/canon-ledger.json";

export interface AnchorTruth {
  id: string;
  code: string;
  title: string;
  summary: string;
  primary_planet: string;
  required_propositions: string[];
  keywords: string[];
  unlocked_insights: string[];
  unlocked_planets: string[];
}

export interface LandingSite {
  id: string;
  name: string;
  hotspots: {
    id: string;
    name: string;
    type: "inspect" | "operate" | "dialogue";
    proposition?: string;
    npc_id?: string;
  }[];
}

export interface AnchorNPC {
  id: string;
  name: string;
  role: string;
  personality: string;
  taboos: string[];
  speech_register: string;
}

export interface PlanetDef {
  id: string;
  name: string;
  color: string;
  coordinates: { x: number; y: number; z: number };
  category: string;
  apparent_civilization: string;
  believed_extinction: string;
  true_compute_role: string;
  initial_state: string;
  landing_sites: LandingSite[];
  anchor_npc: AnchorNPC | null;
}

export const CANON = {
  version: canonData.version,
  spurName: canonData.spur_name,
  vessel: canonData.vessel,
  recorder: canonData.recorder,
  anchorTruths: canonData.anchor_truths as AnchorTruth[],
  planets: canonData.planets as PlanetDef[]
};

/**
 * Calculates which planets are in a "Decoded" (已破译) state based on believed truth IDs.
 * A planet is decoded when its associated truth is confirmed (primary, proposition host, or unlocked).
 */
export function getDecodedPlanetIds(believedTruthIds: string[]): string[] {
  if (!believedTruthIds || believedTruthIds.length === 0) return [];
  const decoded = new Set<string>();

  for (const truthId of believedTruthIds) {
    const truth = CANON.anchorTruths.find((t) => t.id === truthId);
    if (!truth) continue;

    // 1. Primary planet for this truth
    if (truth.primary_planet) {
      decoded.add(truth.primary_planet);
    }

    // 2. Planets hosting propositions required by this truth
    for (const prop of truth.required_propositions) {
      for (const p of CANON.planets) {
        if (p.landing_sites.some((s) => s.hotspots.some((h) => h.proposition === prop))) {
          decoded.add(p.id);
        }
      }
    }

    // 3. Planets explicitly unlocked/revealed by this truth
    for (const pId of truth.unlocked_planets) {
      decoded.add(pId);
    }
  }

  return Array.from(decoded);
}

/**
 * Returns which truth (if any) was responsible for decoding a specific planet.
 */
export function getPlanetDecodedTruth(planetId: string, believedTruthIds: string[]): AnchorTruth | undefined {
  if (!believedTruthIds || believedTruthIds.length === 0) return undefined;
  for (const truthId of believedTruthIds) {
    const truth = CANON.anchorTruths.find((t) => t.id === truthId);
    if (!truth) continue;
    if (truth.primary_planet === planetId || truth.unlocked_planets.includes(planetId)) {
      return truth;
    }
    for (const prop of truth.required_propositions) {
      const p = CANON.planets.find((pl) => pl.id === planetId);
      if (p && p.landing_sites.some((s) => s.hotspots.some((h) => h.proposition === prop))) {
        return truth;
      }
    }
  }
  return undefined;
}

