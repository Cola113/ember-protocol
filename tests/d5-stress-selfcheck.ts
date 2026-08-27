/**
 * D5 generator + quality-ladder contract.
 * Run: npx tsx tests/d5-stress-selfcheck.ts
 */
import { SALVAGE_THRUSTER, STRESS_CRATE_TEMPLATE, YARD } from "@/lib/yard/catalog";
import { QUALITY, nextLowerTier, suggestTierFromFps } from "@/lib/yard/quality";
import {
  MAX_LIVE_JOINTS,
  STRESS_PART_COUNT,
  buildStressLayout,
  isStressPartId,
  padStressId,
  stressLayoutStats,
} from "@/lib/yard/stress";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

const checks: string[] = [];
const layout = buildStressLayout();
const stats = stressLayoutStats(layout);

assert(layout.parts.length === STRESS_PART_COUNT, `expected ${STRESS_PART_COUNT} parts, got ${layout.parts.length}`);
assert(stats.uniqueIds === STRESS_PART_COUNT, "stress ids must be unique");
assert(layout.joints.length <= MAX_LIVE_JOINTS, `joints ${layout.joints.length} exceed budget ${MAX_LIVE_JOINTS}`);
assert(layout.joints.length === MAX_LIVE_JOINTS, `fill joint budget, got ${layout.joints.length}`);
assert(layout.parts[0].id === padStressId(0) && layout.parts[149].id === padStressId(149), "ids are zero-padded");
assert(layout.parts.every((part) => isStressPartId(part.id)), "all generated ids use stress- prefix");
assert(
  layout.parts.every((part) => part.catalogId === STRESS_CRATE_TEMPLATE.catalogId),
  "stress parts share crate catalog"
);

const xs = layout.parts.map((part) => part.spawn[0]);
const zs = layout.parts.map((part) => part.spawn[2]);
assert(Math.min(...xs) > -YARD.width / 2 + 1, "stress field stays inside dock X");
assert(Math.max(...xs) < YARD.width / 2 - 1, "stress field stays inside dock X+");
assert(Math.min(...zs) > -YARD.depth / 2 + 1, "stress field stays inside dock Z");
assert(Math.max(...zs) < YARD.depth / 2 - 1, "stress field stays inside dock Z+ (leave the door clear)");
checks.push(`layout ${stats.parts} parts / ${stats.joints} joints / ${stats.towers} towers`);

const endpoints = new Set<string>();
for (const joint of layout.joints) {
  const a = layout.parts.find((part) => part.id === joint.aId);
  const b = layout.parts.find((part) => part.id === joint.bId);
  assert(a && b, `joint ${joint.aId}--${joint.bId} missing endpoint`);
  const keyA = `${joint.aId}:${joint.aSocketId}`;
  const keyB = `${joint.bId}:${joint.bSocketId}`;
  assert(!endpoints.has(keyA) && !endpoints.has(keyB), `duplicate socket ${keyA} / ${keyB}`);
  endpoints.add(keyA);
  endpoints.add(keyB);
  assert(Math.abs(a.spawn[0] - b.spawn[0]) < 1e-6 && Math.abs(a.spawn[2] - b.spawn[2]) < 1e-6, "welds are vertical");
}
checks.push("joints unique sockets and vertical");

assert(QUALITY.high.dprCap === 1.5, "high dpr stays on the tech nail");
assert(QUALITY.high.pbr && QUALITY.low.pbr === false, "low tier cuts PBR maps");
assert(QUALITY.low.thrusterFx === false && QUALITY.medium.thrusterFx === false, "nozzle FX is in the cut order");
assert(QUALITY.low.post === false, "low tier cuts postprocessing");
assert(nextLowerTier("high") === "medium" && nextLowerTier("medium") === "low" && nextLowerTier("low") === "low", "ladder clamps at low");
assert(suggestTierFromFps(60, "high") === "high", "60fps stays high");
assert(suggestTierFromFps(30, "high") === "medium", "30fps drops high → medium");
assert(suggestTierFromFps(18, "medium") === "low", "18fps drops to low");
assert(suggestTierFromFps(18, "high") === "low", "very low fps skips medium");
checks.push("quality ladder photo/FX/PBR, never weld/release");

assert(SALVAGE_THRUSTER.id === "salvage-thruster", "salvage thruster catalog id");
assert(SALVAGE_THRUSTER.size[0] > 0.3 && SALVAGE_THRUSTER.size[1] > 1, "salvage thruster is the large special part");
assert(SALVAGE_THRUSTER.spawn[2] > YARD.depth / 2, "salvage sits outside the dock door");
assert(SALVAGE_THRUSTER.sockets.length === 2, "salvage can be welded by either end");
checks.push(`salvage ${SALVAGE_THRUSTER.label} at z=${SALVAGE_THRUSTER.spawn[2]}`);

console.log(`d5-stress-selfcheck ok (${checks.length})`);
for (const line of checks) console.log(`- ${line}`);
