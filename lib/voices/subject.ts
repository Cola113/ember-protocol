import { CANON, CANON_READ, requireConstitution, type RequiredConstitutionResult } from "@/lib/canon";
import { canonViolation } from "@/lib/schemas/common";
import type { Constitution } from "@/lib/schemas/constitution";
import type { AnchorNPC } from "@/lib/canon";

export interface VoicesSubject {
  npcId: string;
  planetId: string;
  npc: Readonly<AnchorNPC>;
  roster: Constitution["npc_roster"][number];
  constitution: Readonly<Constitution>;
}

export type VoicesSubjectResult =
  | { ok: true; subject: VoicesSubject }
  | { ok: false; error: ReturnType<typeof canonViolation> };

export function planetIdForNpc(npcId: string): string | undefined {
  const fromPlanet = CANON.planets.find((planet) => planet.anchor_npc?.id === npcId)?.id;
  if (fromPlanet) return fromPlanet;
  for (const [planetId, constitution] of Object.entries(CANON.constitutions)) {
    if (constitution.npc_roster.some((npc) => npc.npc_id === npcId)) return planetId;
  }
  return undefined;
}

export function resolveVoicesSubject(npcId: string): VoicesSubjectResult {
  const npc = CANON_READ.getNpc(npcId);
  if (!npc) {
    return { ok: false, error: canonViolation(`未知 npcId：${npcId}`) };
  }
  const planetId = planetIdForNpc(npcId);
  if (!planetId) {
    return { ok: false, error: canonViolation(`npcId ${npcId} 未挂载到任何星球。`) };
  }
  const constitutionGate: RequiredConstitutionResult = requireConstitution(planetId);
  if (!constitutionGate.ok) return constitutionGate;
  const roster = constitutionGate.constitution.npc_roster.find((entry) => entry.npc_id === npcId);
  if (!roster) {
    return {
      ok: false,
      error: canonViolation(`星球 ${planetId} 的宪章 npc_roster 未登记 ${npcId}。`)
    };
  }
  return {
    ok: true,
    subject: {
      npcId,
      planetId,
      npc,
      roster,
      constitution: constitutionGate.constitution
    }
  };
}

export function npcMayOfferInsight(subject: VoicesSubject, insightId: string): boolean {
  if (subject.roster.registered_insight_ids.includes(insightId)) return true;
  return subject.constitution.insight_gates.some((gate) => gate.insight_id === insightId);
}
