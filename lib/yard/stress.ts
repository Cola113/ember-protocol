import type { YardBlueprintJoint } from "./blueprint";
import { STRESS_CRATE_TEMPLATE, type YardPartDef } from "./catalog";

/** Tech nail for live play. Stress mode is allowed to exceed this with quality cuts. */
export const MAX_LIVE_DYNAMIC = 48;
export const MAX_LIVE_JOINTS = 64;
export const STRESS_PART_COUNT = 150;

export const STRESS_COLS = 6;
export const STRESS_ROWS = 5;
export const STRESS_LEVELS = 5;
export const STRESS_SPACING = 0.62;
export const STRESS_ORIGIN: [number, number, number] = [-5.4, 0.26, -6.2];

export type StressLayout = {
  parts: YardPartDef[];
  joints: YardBlueprintJoint[];
};

export function isStressPartId(id: string): boolean {
  return id.startsWith("stress-");
}

export function padStressId(index: number): string {
  return `stress-${String(index).padStart(3, "0")}`;
}

/**
 * Repeat a 6×5×5 crate template to fill 150 parts.
 * Vertical welds fill the 64-joint budget from the bottom of each tower up
 * so a hammer strike can cascade without welding the whole field.
 */
export function buildStressLayout(count = STRESS_PART_COUNT): StressLayout {
  const parts: YardPartDef[] = [];
  const joints: YardBlueprintJoint[] = [];
  const [ox, oy, oz] = STRESS_ORIGIN;
  const sizeY = STRESS_CRATE_TEMPLATE.size[1];
  const colors = ["#94a3b8", "#64748b", "#7dd3fc", "#fb7185", "#fbbf24"];

  for (let row = 0; row < STRESS_ROWS; row++) {
    for (let col = 0; col < STRESS_COLS; col++) {
      for (let level = 0; level < STRESS_LEVELS; level++) {
        const index = (row * STRESS_COLS + col) * STRESS_LEVELS + level;
        if (index >= count) {
          return { parts, joints };
        }
        const x = ox + col * STRESS_SPACING;
        const y = oy + level * sizeY;
        const z = oz + row * STRESS_SPACING;
        const id = padStressId(index);
        parts.push({
          ...STRESS_CRATE_TEMPLATE,
          id,
          color: colors[level % colors.length],
          spawn: [x, y, z],
        });

        if (level === 0 || joints.length >= MAX_LIVE_JOINTS) continue;
        const belowId = padStressId(index - 1);
        const below = parts.find((part) => part.id === belowId);
        if (!below) continue;
        const sameColumn = Math.abs(below.spawn[0] - x) < 1e-6 && Math.abs(below.spawn[2] - z) < 1e-6;
        if (!sameColumn) continue;
        const seamY = y - sizeY / 2;
        joints.push({
          aId: id,
          aSocketId: "base",
          bId: belowId,
          bSocketId: "top",
          anchor: [x, seamY, z],
        });
      }
    }
  }

  return { parts, joints };
}

export function stressLayoutStats(layout: StressLayout = buildStressLayout()): {
  parts: number;
  joints: number;
  towers: number;
  uniqueIds: number;
} {
  return {
    parts: layout.parts.length,
    joints: layout.joints.length,
    towers: STRESS_COLS * STRESS_ROWS,
    uniqueIds: new Set(layout.parts.map((part) => part.id)).size,
  };
}
