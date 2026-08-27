import type { YardMaterialId, YardPartDef, YardPartShape } from "@/lib/yard/catalog";

export const PHYSICS_DT = 1 / 60;
export const WARN_RATIO = 0.75;
export const BREAK_RATIO = 1;
export const MIN_IMPACT_SPEED = 1.25;
export const IMPACT_CHATTER_MS = 90;
export const HEAT_DECAY_SECONDS = 1.35;
export const SIZE_REF_VOLUME = 0.08;
export const SIZE_FACTOR_MIN = 0.72;
export const SIZE_FACTOR_MAX = 1.35;

/**
 * D3 numerical contract (readable, not FEM).
 *
 * damage += impactImpulse / breakImpulse
 * damage >= 1 → removeImpulseJoint
 *
 * impactImpulse is the striker's pre-step mass * relative speed (m|v|).
 * Rapier contactForce F·dt does not scale with hammer mass/height on
 * jointed bodies (see tests/d3-rapier-impulse-probe.ts) and is not used.
 */
export type { YardMaterialId };

export type YardJointKind = "socket-weld" | "ground-anchor" | "pin-fit";

export type YardMaterial = {
  id: YardMaterialId;
  label: string;
  /** Impulse (kg·m/s) that breaks a reference-volume socket weld of this material. */
  baseBreakImpulse: number;
};

export const YARD_MATERIALS: Record<YardMaterialId, YardMaterial> = {
  "pin-alloy": { id: "pin-alloy", label: "销合金", baseBreakImpulse: 7.5 },
  "light-alloy": { id: "light-alloy", label: "轻合金", baseBreakImpulse: 12 },
  "sheet-steel": { id: "sheet-steel", label: "薄钢", baseBreakImpulse: 14 },
  "structural-steel": { id: "structural-steel", label: "结构钢", baseBreakImpulse: 18 },
  "cast-iron": { id: "cast-iron", label: "铸铁", baseBreakImpulse: 26 },
  ceramic: { id: "ceramic", label: "陶瓷", baseBreakImpulse: 16 },
  bedrock: { id: "bedrock", label: "坞锚", baseBreakImpulse: 40 },
};

export const JOINT_KIND_FACTOR: Record<YardJointKind, number> = {
  "socket-weld": 1,
  "ground-anchor": 1.28,
  "pin-fit": 0.82,
};

export const HAMMER_PRESETS = {
  light: { id: "light" as const, label: "轻碰", height: 2.4, density: 1.6 },
  medium: { id: "medium" as const, label: "中撞", height: 4.8, density: 3 },
  heavy: { id: "heavy" as const, label: "重击", height: 7.2, density: 5 },
};

export type HammerPresetId = keyof typeof HAMMER_PRESETS;

export type SeamLike = {
  aId: string;
  aSocketId: string;
  bId: string;
  bSocketId: string;
};

export type SeamState = SeamLike & {
  breakImpulse: number;
  damage: number;
  heat: number;
  kind: YardJointKind;
};

export type ImpactShare = {
  seamId: string;
  share: number;
  damage: number;
  heat: number;
  broken: boolean;
  warned: boolean;
};

export type ImpactResult = {
  victimId: string;
  impulse: number;
  sharedAcross: number;
  shares: ImpactShare[];
  brokenIds: string[];
};

export function seamId(seam: SeamLike): string {
  return `${seam.aId}:${seam.aSocketId}--${seam.bId}:${seam.bSocketId}`;
}

export function partVolume(def: { shape: YardPartShape; size: [number, number, number] }): number {
  if (def.shape === "cylinder") return Math.PI * def.size[0] * def.size[0] * def.size[1];
  return def.size[0] * def.size[1] * def.size[2];
}

export function sizeFactor(def: { shape: YardPartShape; size: [number, number, number] }): number {
  const ratio = partVolume(def) / SIZE_REF_VOLUME;
  const cubed = Math.cbrt(Math.max(ratio, 0));
  return Math.min(SIZE_FACTOR_MAX, Math.max(SIZE_FACTOR_MIN, cubed));
}

export function partBreakImpulse(def: Pick<YardPartDef, "shape" | "size" | "material" | "breakImpulse">): number {
  if (typeof def.breakImpulse === "number" && Number.isFinite(def.breakImpulse) && def.breakImpulse > 0) {
    return def.breakImpulse;
  }
  return round1(YARD_MATERIALS[def.material].baseBreakImpulse * sizeFactor(def));
}

export function resolveJointKind(
  a: Pick<YardPartDef, "id" | "material">,
  b: Pick<YardPartDef, "id" | "material">
): YardJointKind {
  if (a.id === "ground-anchor" || b.id === "ground-anchor") return "ground-anchor";
  if (a.material === "pin-alloy" || b.material === "pin-alloy") return "pin-fit";
  return "socket-weld";
}

export function resolveBreakImpulse(
  a: Pick<YardPartDef, "id" | "shape" | "size" | "material" | "breakImpulse">,
  b: Pick<YardPartDef, "id" | "shape" | "size" | "material" | "breakImpulse">,
  kind: YardJointKind = resolveJointKind(a, b)
): number {
  const weaker = Math.min(partBreakImpulse(a), partBreakImpulse(b));
  return round1(weaker * JOINT_KIND_FACTOR[kind]);
}

export function relativeSpeed(
  a: { x: number; y: number; z: number },
  b: { x: number; y: number; z: number }
): number {
  return Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
}

export function impactImpulse(strikerMass: number, speed: number): number {
  if (!(strikerMass > 0) || !(speed > 0)) return 0;
  return strikerMass * speed;
}

/** Faster body is the striker. Ties keep the first argument (the welded victim). */
export function pickStriker<T>(victim: T, other: T, victimSpeed: number, otherSpeed: number): T {
  return otherSpeed > victimSpeed ? other : victim;
}

export function shouldIgnoreImpact(speed: number): boolean {
  return speed < MIN_IMPACT_SPEED;
}

export function incidentSeams<T extends SeamLike>(seams: T[], partId: string): T[] {
  return seams.filter((seam) => seam.aId === partId || seam.bId === partId);
}

/**
 * Split the hit equally across welds attached to the struck body.
 * A diagonal brace is a second incident weld — same blow, half damage, no FEM.
 */
export function applyImpact(seams: SeamState[], victimId: string, impulse: number): ImpactResult {
  const incident = incidentSeams(seams, victimId);
  if (incident.length === 0 || impulse <= 0) {
    return { victimId, impulse, sharedAcross: 0, shares: [], brokenIds: [] };
  }
  const share = impulse / incident.length;
  const shares: ImpactShare[] = [];
  const brokenIds: string[] = [];
  for (const seam of incident) {
    const threshold = Math.max(seam.breakImpulse, 1e-6);
    seam.damage += share / threshold;
    const flash = Math.min(1, seam.damage + 0.08);
    seam.heat = Math.max(seam.heat, flash);
    const id = seamId(seam);
    const broken = seam.damage >= BREAK_RATIO;
    if (broken) {
      seam.damage = 1;
      seam.heat = 1;
      brokenIds.push(id);
    }
    shares.push({
      seamId: id,
      share,
      damage: seam.damage,
      heat: seam.heat,
      broken,
      warned: seam.damage >= WARN_RATIO,
    });
  }
  return { victimId, impulse, sharedAcross: incident.length, shares, brokenIds };
}

export function decayHeat(seams: Array<Pick<SeamState, "damage" | "heat">>, dt: number): void {
  if (!(dt > 0)) return;
  const step = dt / HEAT_DECAY_SECONDS;
  for (const seam of seams) {
    const floor = Math.min(1, Math.max(0, seam.damage));
    seam.heat = Math.max(floor, seam.heat - step);
  }
}

/** cyan healthy → yellow → orange-red at 75% → red at break */
export function seamHeatColor(visual: number, out: { r: number; g: number; b: number }): void {
  const t = Math.min(1, Math.max(0, visual));
  if (t < 0.4) {
    lerpColor(0x67e8f9, 0xfde047, t / 0.4, out);
    return;
  }
  if (t < WARN_RATIO) {
    lerpColor(0xfde047, 0xf97316, (t - 0.4) / (WARN_RATIO - 0.4), out);
    return;
  }
  lerpColor(0xf97316, 0xef4444, (t - WARN_RATIO) / (1 - WARN_RATIO), out);
}

export function seamEmissiveIntensity(visual: number): number {
  const t = Math.min(1, Math.max(0, visual));
  return 0.22 + t * 2.4;
}

function lerpColor(a: number, b: number, t: number, out: { r: number; g: number; b: number }): void {
  const u = Math.min(1, Math.max(0, t));
  const ar = (a >> 16) & 255;
  const ag = (a >> 8) & 255;
  const ab = a & 255;
  const br = (b >> 16) & 255;
  const bg = (b >> 8) & 255;
  const bb = b & 255;
  out.r = (ar + (br - ar) * u) / 255;
  out.g = (ag + (bg - ag) * u) / 255;
  out.b = (ab + (bb - ab) * u) / 255;
}

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}
