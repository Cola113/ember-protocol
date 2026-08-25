import canonData from "@/docs/canon-ledger.json";
import type { Constitution } from "@/lib/schemas/constitution";
import { canonViolation } from "@/lib/schemas/common";

export interface AnchorTruth {
  id: string;
  code: string;
  title: string;
  summary: string;
  surface_claim?: string;
  foil_claim?: string;
  half_claim?: string;
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

export interface CanonLedgerData {
  version: string;
  spur_name: string;
  vessel: string;
  recorder: {
    model: string;
    codename: string;
    role: string;
    initial_memory_integrity: number;
    residual_directive: string;
  };
  anchor_truths: AnchorTruth[];
  proposition_labels?: Record<string, string>;
  planets: PlanetDef[];
  /** The only constitution mount: docs/canon-ledger.json -> constitutions[planet_id]. */
  constitutions: Record<string, Constitution>;
}

export const CANON = {
  version: canonData.version,
  spurName: canonData.spur_name,
  vessel: canonData.vessel,
  recorder: canonData.recorder,
  anchorTruths: canonData.anchor_truths as AnchorTruth[],
  planets: canonData.planets as PlanetDef[],
  constitutions: (canonData as CanonLedgerData).constitutions
};

/**
 * Read-only query surface for Voices, Scribe and Curator.
 * There are deliberately no write/update methods: only T1 may publish canon.
 */
export interface CanonReadApi {
  readonly version: string;
  listAnchorTruths(): readonly AnchorTruth[];
  getPlanet(planetId: string): Readonly<PlanetDef> | undefined;
  getLandingSite(planetId: string, landingSiteId: string): Readonly<LandingSite> | undefined;
  getAnchorTruth(truthId: string): Readonly<AnchorTruth> | undefined;
  getNpc(npcId: string): Readonly<AnchorNPC> | undefined;
  getConstitution(planetId: string): Readonly<Constitution> | undefined;
  isRegisteredProposition(propositionId: string): boolean;
  isRegisteredInsight(insightId: string): boolean;
}

export const CANON_READ: CanonReadApi = Object.freeze({
  version: CANON.version,
  listAnchorTruths: () => CANON.anchorTruths.slice(),
  getPlanet: (planetId: string) => CANON.planets.find((planet) => planet.id === planetId),
  getLandingSite: (planetId: string, landingSiteId: string) =>
    CANON.planets.find((planet) => planet.id === planetId)?.landing_sites.find((site) => site.id === landingSiteId),
  getAnchorTruth: (truthId: string) => CANON.anchorTruths.find((truth) => truth.id === truthId),
  getNpc: (npcId: string) => CANON.planets.find((planet) => planet.anchor_npc?.id === npcId)?.anchor_npc ?? undefined,
  getConstitution: (planetId: string) => CANON.constitutions[planetId],
  isRegisteredProposition: (propositionId: string) => CANON.planets.some((planet) =>
    planet.landing_sites.some((site) => site.hotspots.some((hotspot) => hotspot.proposition === propositionId))
  ),
  isRegisteredInsight: (insightId: string) => CANON.anchorTruths.some((truth) => truth.unlocked_insights.includes(insightId))
});

export type RequiredConstitutionResult =
  | { ok: true; constitution: Readonly<Constitution> }
  | { ok: false; error: ReturnType<typeof canonViolation> };

/** T3/T4 must reject generation or dialogue when the T1 constitution is absent. */
export function requireConstitution(planetId: string): RequiredConstitutionResult {
  const constitution = CANON_READ.getConstitution(planetId);
  if (constitution) return { ok: true, constitution };
  return {
    ok: false,
    error: canonViolation(`缺少星球 ${planetId} 的冻结宪章；拒绝生成或对话，不得裸生成。`)
  };
}

/** Server-side output guard; forbidden claims are never injected into prompt context. */
export function violatesForbiddenClaims(
  planetOrConstitution: string | Pick<Constitution, "forbidden_claims"> | undefined,
  text: string
): boolean {
  const constitution = typeof planetOrConstitution === "string"
    ? CANON_READ.getConstitution(planetOrConstitution)
    : planetOrConstitution;
  if (!constitution) return false;
  const normalizedText = text.toLocaleLowerCase();
  return constitution.forbidden_claims.some((claim) => {
    const normalizedClaim = claim.trim().toLocaleLowerCase();
    return normalizedClaim.length > 0 && normalizedText.includes(normalizedClaim);
  });
}

export function getCanonContext(planetId: string) {
  const planet = CANON_READ.getPlanet(planetId);
  // Prompt-safe context intentionally omits true_compute_role, truth IDs,
  // true_facts and forbidden_claims. Those remain server-side validation data.
  return Object.freeze({
    planet_id: planetId,
    display_name: planet?.name,
    category: planet?.category,
    apparent_civilization: planet?.apparent_civilization,
    initial_state: planet?.initial_state
  });
}

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

