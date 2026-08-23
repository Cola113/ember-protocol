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
