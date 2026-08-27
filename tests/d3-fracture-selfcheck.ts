/**
 * D3 fracture numerical contract.
 * Run: npx tsx tests/d3-fracture-selfcheck.ts
 */
import { YardBlueprintSchema } from "@/lib/yard/blueprint";
import { ALL_YARD_PARTS, DROP_CUBE, GROUND_ANCHOR, RACK_PARTS } from "@/lib/yard/catalog";
import {
  HAMMER_PRESETS,
  WARN_RATIO,
  applyImpact,
  impactImpulse,
  partBreakImpulse,
  pickStriker,
  relativeSpeed,
  resolveBreakImpulse,
  resolveJointKind,
  seamId,
  shouldIgnoreImpact,
  type SeamState,
} from "@/lib/yard/fracture";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function almost(actual: number, expected: number, eps = 1e-6): void {
  assert(Math.abs(actual - expected) <= eps, `expected ${expected}, got ${actual}`);
}

function seam(partial: Partial<SeamState> & Pick<SeamState, "aId" | "bId" | "breakImpulse">): SeamState {
  return {
    aSocketId: "port",
    bSocketId: "starboard",
    damage: 0,
    heat: 0,
    kind: "socket-weld",
    ...partial,
  };
}

const checks: string[] = [];

const beam = RACK_PARTS.find((part) => part.id === "beam")!;
const plate = RACK_PARTS.find((part) => part.id === "plate")!;
const chassis = RACK_PARTS.find((part) => part.id === "chassis")!;
const hinge = RACK_PARTS.find((part) => part.id === "hinge")!;
const counterweight = RACK_PARTS.find((part) => part.id === "counterweight")!;

const plateT = resolveBreakImpulse(plate, beam);
const hingeT = resolveBreakImpulse(hinge, plate);
const chassisT = resolveBreakImpulse(chassis, GROUND_ANCHOR);
assert(plateT > 0 && hingeT > 0 && chassisT > 0, "thresholds must be positive");
assert(hingeT < plateT && plateT < chassisT, `materials must separate: hinge ${hingeT} < plate ${plateT} < chassis ${chassisT}`);
checks.push(`material ladder hinge ${hingeT} < plate ${plateT} < chassis ${chassisT}`);

assert(resolveJointKind(plate, GROUND_ANCHOR) === "ground-anchor", "plate-to-anchor is ground-anchor");
assert(resolveJointKind(hinge, plate) === "pin-fit", "hinge-to-plate is pin-fit");
assert(resolveJointKind(plate, beam) === "socket-weld", "plate-to-beam is socket-weld");
const kinds = [
  resolveBreakImpulse(plate, beam, "socket-weld"),
  resolveBreakImpulse(plate, GROUND_ANCHOR, "ground-anchor"),
  resolveBreakImpulse(hinge, plate, "pin-fit"),
];
assert(new Set(kinds.map((value) => value.toFixed(1))).size === 3, `connection kinds must separate: ${kinds.join(", ")}`);
checks.push(`joint kinds ${kinds.join(" / ")}`);

const lightMv = impactImpulse(DROP_CUBE.size[0] ** 3 * HAMMER_PRESETS.light.density, Math.sqrt(2 * 9.81 * (HAMMER_PRESETS.light.height - 0.59)));
const mediumMv = impactImpulse(DROP_CUBE.size[0] ** 3 * HAMMER_PRESETS.medium.density, Math.sqrt(2 * 9.81 * (HAMMER_PRESETS.medium.height - 0.59)));
const heavyMv = impactImpulse(DROP_CUBE.size[0] ** 3 * HAMMER_PRESETS.heavy.density, Math.sqrt(2 * 9.81 * (HAMMER_PRESETS.heavy.height - 0.59)));
assert(lightMv < mediumMv && mediumMv < heavyMv, "hammer presets must scale");

const lightSeam = seam({ aId: "beam", bId: "plate", breakImpulse: plateT });
const lightHit = applyImpact([lightSeam], "beam", lightMv);
assert(!lightHit.brokenIds.length && lightSeam.damage < WARN_RATIO, `light tap must not warn/break (${lightSeam.damage})`);
checks.push(`light ${lightMv.toFixed(2)} / ${plateT} → ${(lightSeam.damage * 100).toFixed(0)}%`);

const mediumSeam = seam({ aId: "beam", bId: "plate", breakImpulse: plateT });
const mediumHit = applyImpact([mediumSeam], "beam", mediumMv);
assert(!mediumHit.brokenIds.length, "medium must not break plate-beam");
assert(mediumSeam.damage >= WARN_RATIO, `medium should warn (${mediumSeam.damage})`);
checks.push(`medium ${mediumMv.toFixed(2)} / ${plateT} → ${(mediumSeam.damage * 100).toFixed(0)}%`);

const unbraced = seam({ aId: "beam", aSocketId: "port", bId: "plate", bSocketId: "right", breakImpulse: resolveBreakImpulse(beam, plate) });
const unbracedHit = applyImpact([unbraced], "beam", heavyMv);
assert(unbracedHit.brokenIds.length === 1, `unbraced heavy must break, damage=${unbraced.damage}`);
checks.push(`unbraced heavy ${heavyMv.toFixed(2)} / ${unbraced.breakImpulse} → break`);

const braceA = seam({ aId: "beam", aSocketId: "port", bId: "plate", bSocketId: "right", breakImpulse: resolveBreakImpulse(beam, plate) });
const braceB = seam({ aId: "beam", aSocketId: "starboard", bId: "ground-anchor", bSocketId: "top", breakImpulse: resolveBreakImpulse(beam, GROUND_ANCHOR) });
const bracedHit = applyImpact([braceA, braceB], "beam", heavyMv);
assert(bracedHit.sharedAcross === 2, "brace shares across two incident welds");
assert(bracedHit.brokenIds.length === 0, `braced heavy must hold, damages=${braceA.damage.toFixed(2)},${braceB.damage.toFixed(2)}`);
assert(braceA.damage < 1 && braceB.damage < 1, "neither braced weld reaches 1");
checks.push(`braced heavy share ${bracedHit.shares[0].share.toFixed(2)} → hold`);

const hingeSeam = seam({ aId: "hinge", bId: "plate", breakImpulse: hingeT });
const plateSeam = seam({ aId: "plate", bId: "beam", breakImpulse: resolveBreakImpulse(plate, beam) });
const chassisSeam = seam({ aId: "chassis", bId: "ground-anchor", breakImpulse: chassisT });
applyImpact([hingeSeam], "hinge", mediumMv);
applyImpact([plateSeam], "plate", mediumMv);
applyImpact([chassisSeam], "chassis", mediumMv);
assert(hingeSeam.damage >= 1, "medium breaks pin-fit hinge");
assert(plateSeam.damage < 1 && plateSeam.damage > chassisSeam.damage, "medium: plate more damaged than chassis, neither necessarily break");
assert(chassisSeam.damage < WARN_RATIO, `medium chassis stays cool (${chassisSeam.damage})`);
checks.push(`same medium: hinge ${hingeSeam.damage.toFixed(2)} / plate ${plateSeam.damage.toFixed(2)} / chassis ${chassisSeam.damage.toFixed(2)}`);

const fatigue = seam({ aId: "plate", bId: "beam", breakImpulse: 10 });
applyImpact([fatigue], "plate", 4);
applyImpact([fatigue], "plate", 4);
applyImpact([fatigue], "plate", 4);
assert(fatigue.damage >= 1, "three sub-threshold hits accumulate to a break");
checks.push("fatigue: 4+4+4 / 10 → break");

assert(shouldIgnoreImpact(1.2), "rest/settle speed ignored");
assert(!shouldIgnoreImpact(1.26), "live impact speed counted");
almost(relativeSpeed({ x: 0, y: -6, z: 0 }, { x: 0, y: 0, z: 0 }), 6);
assert(pickStriker("beam", "drop-cube", 0.4, 11.4) === "drop-cube", "faster hammer is striker");
assert(pickStriker("beam", "drop-cube", 4, 1) === "beam", "faster victim debris is striker");
assert(pickStriker("beam", "drop-cube", 3, 3) === "beam", "tie keeps victim");
const liveHeavy = impactImpulse(DROP_CUBE.size[0] ** 3 * HAMMER_PRESETS.heavy.density, Math.sqrt(2 * 9.81 * (HAMMER_PRESETS.heavy.height - 0.59)));
assert(liveHeavy > resolveBreakImpulse(beam, plate), "hammer mass path, not victim mass, exceeds plate-beam threshold");
checks.push("rest filter + relative speed + striker pick");

const saved = YardBlueprintSchema.parse({
  version: 1,
  savedAt: 1,
  parts: [
    { instanceId: "plate", catalogId: "plate", position: [0, 1, 0], rotation: [0, 0, 0, 1] },
    { instanceId: "beam", catalogId: "beam", position: [0, 1, 1], rotation: [0, 0, 0, 1] },
  ],
  joints: [
    { aId: "plate", aSocketId: "right", bId: "beam", bSocketId: "port", anchor: [0, 1, 0.5], damage: 0.4 },
  ],
});
assert(saved.joints[0].damage === 0.4, "blueprint keeps residual damage");
assert(YardBlueprintSchema.safeParse({
  version: 1,
  savedAt: 1,
  parts: saved.parts,
  joints: [{ ...saved.joints[0], damage: 1 }],
}).success === false, "broken joints cannot be persisted at damage=1");
assert(YardBlueprintSchema.safeParse({
  version: 1,
  savedAt: 1,
  parts: saved.parts,
  joints: [{ aId: "plate", aSocketId: "right", bId: "beam", bSocketId: "port", anchor: [0, 1, 0.5] }],
}).success, "legacy joints without damage still load");
checks.push("blueprint damage persistence + broken omitted");

assert(ALL_YARD_PARTS.every((part) => partBreakImpulse(part) > 0), "every stock part has a threshold");
assert(partBreakImpulse(counterweight) > partBreakImpulse(plate), "cast cube stronger than sheet");
assert(DROP_CUBE.density === HAMMER_PRESETS.heavy.density, "default drop-cube is the heavy hammer");
checks.push("catalog thresholds present");

console.log(`d3-fracture-selfcheck ok (${checks.length})`);
for (const line of checks) console.log(`- ${line}`);
