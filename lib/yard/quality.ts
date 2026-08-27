export const QUALITY_TIERS = ["high", "medium", "low"] as const;
export type QualityTier = (typeof QUALITY_TIERS)[number];

export type QualitySettings = {
  id: QualityTier;
  label: string;
  dprCap: number;
  shadows: boolean;
  post: boolean;
  pbr: boolean;
  contactShadows: boolean;
  environment: boolean;
  thrusterFx: boolean;
};

/**
 * Runtime quality ladder for iGPU / 150-body stress.
 * Scope cut order (photo → 0g → nozzle FX → PBR maps) is encoded here.
 * Weld + release are never gated.
 */
export const QUALITY: Record<QualityTier, QualitySettings> = {
  high: {
    id: "high",
    label: "高",
    dprCap: 1.5,
    shadows: true,
    post: true,
    pbr: true,
    contactShadows: true,
    environment: true,
    thrusterFx: true,
  },
  medium: {
    id: "medium",
    label: "中",
    dprCap: 1,
    shadows: false,
    post: true,
    pbr: true,
    contactShadows: false,
    environment: true,
    thrusterFx: false,
  },
  low: {
    id: "low",
    label: "低",
    dprCap: 0.85,
    shadows: false,
    post: false,
    pbr: false,
    contactShadows: false,
    environment: false,
    thrusterFx: false,
  },
};

export const QUALITY_PROBE_SECONDS = 3;
export const QUALITY_FPS_MEDIUM_BELOW = 36;
export const QUALITY_FPS_LOW_BELOW = 24;

export function nextLowerTier(tier: QualityTier): QualityTier {
  if (tier === "high") return "medium";
  return "low";
}

export function suggestTierFromFps(fps: number, current: QualityTier): QualityTier {
  if (!(fps > 0) || !Number.isFinite(fps)) return current;
  if (fps < QUALITY_FPS_LOW_BELOW) return "low";
  if (fps < QUALITY_FPS_MEDIUM_BELOW && current === "high") return "medium";
  return current;
}
