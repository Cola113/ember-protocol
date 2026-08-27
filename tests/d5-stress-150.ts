/**
 * Headless Rapier 150-body chain-bomb: no NaN, no floor fall-through, cascade breaks.
 * Run: npx tsx tests/d5-stress-150.ts
 */
import RAPIER from "@dimforge/rapier3d-compat";
import {
  applyImpact,
  impactImpulse,
  pickStriker,
  relativeSpeed,
  resolveBreakImpulse,
  seamId,
  shouldIgnoreImpact,
  type SeamState,
} from "@/lib/yard/fracture";
import { STRESS_CRATE_TEMPLATE } from "@/lib/yard/catalog";
import { MAX_LIVE_JOINTS, STRESS_PART_COUNT, buildStressLayout } from "@/lib/yard/stress";

const DT = 1 / 60;
const STEPS = 300;
const MIN_IMPACT_SPEED = 1.25;
const DEEP_OVERLAP = 0.16;
const FLOOR_Y = 0;

type Vec = { x: number; y: number; z: number };

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function isFiniteVec(v: Vec): boolean {
  return Number.isFinite(v.x) && Number.isFinite(v.y) && Number.isFinite(v.z);
}

async function main() {
  await RAPIER.init();
  const layout = buildStressLayout();
  assert(layout.parts.length === STRESS_PART_COUNT, "layout must be 150");
  assert(layout.joints.length <= MAX_LIVE_JOINTS, "joint budget");

  const world = new RAPIER.World({ x: 0, y: -9.81, z: 0 });
  world.integrationParameters.dt = DT;
  const queue = new RAPIER.EventQueue(true);

  const ground = world.createRigidBody(RAPIER.RigidBodyDesc.fixed().setTranslation(0, -0.25, 0));
  world.createCollider(RAPIER.ColliderDesc.cuboid(20, 0.25, 15).setFriction(0.88).setRestitution(0.05), ground);

  const hx = STRESS_CRATE_TEMPLATE.size[0] / 2;
  const bodies = new Map<string, RAPIER.RigidBody>();
  const colliderToPart = new Map<number, string>();

  for (const part of layout.parts) {
    const body = world.createRigidBody(
      RAPIER.RigidBodyDesc.dynamic().setTranslation(part.spawn[0], part.spawn[1], part.spawn[2])
    );
    const collider = world.createCollider(
      RAPIER.ColliderDesc.cuboid(hx, hx, hx)
        .setDensity(part.density)
        .setFriction(0.7)
        .setRestitution(part.restitution)
        .setActiveEvents(RAPIER.ActiveEvents.COLLISION_EVENTS),
      body
    );
    bodies.set(part.id, body);
    colliderToPart.set(collider.handle, part.id);
  }

  type LiveSeam = SeamState & { handle: RAPIER.ImpulseJoint };
  const seams: LiveSeam[] = [];
  for (const joint of layout.joints) {
    const a = bodies.get(joint.aId);
    const b = bodies.get(joint.bId);
    if (!a || !b) continue;
    const data = RAPIER.JointData.fixed(
      { x: 0, y: -hx, z: 0 },
      { x: 0, y: 0, z: 0, w: 1 },
      { x: 0, y: hx, z: 0 },
      { x: 0, y: 0, z: 0, w: 1 }
    );
    const handle = world.createImpulseJoint(data, a, b, true);
    handle.setContactsEnabled(false);
    seams.push({
      ...joint,
      handle,
      kind: "socket-weld",
      breakImpulse: resolveBreakImpulse(
        { id: "a", ...STRESS_CRATE_TEMPLATE },
        { id: "b", ...STRESS_CRATE_TEMPLATE },
        "socket-weld"
      ),
      damage: 0,
      heat: 0,
    });
  }

  const hammerPos = layout.parts[4]?.spawn ?? [0, 8, 0];
  const hammer = world.createRigidBody(
    RAPIER.RigidBodyDesc.dynamic().setTranslation(hammerPos[0], 8.4, hammerPos[2]).setCcdEnabled(true)
  );
  const hammerCollider = world.createCollider(
    RAPIER.ColliderDesc.cuboid(0.35, 0.35, 0.35).setDensity(5).setFriction(0.62).setRestitution(0.12).setActiveEvents(
      RAPIER.ActiveEvents.COLLISION_EVENTS
    ),
    hammer
  );
  colliderToPart.set(hammerCollider.handle, "drop-cube");
  bodies.set("drop-cube", hammer);

  const prevVel = new Map<string, Vec>();
  const lastHit = new Map<string, number>();
  let nanFrames = 0;
  let fallen = 0;
  let brokenTotal = 0;
  let maxSpeed = 0;
  const stepMs: number[] = [];
  const t0 = performance.now();

  for (let i = 0; i < STEPS; i++) {
    for (const [id, body] of Array.from(bodies.entries())) {
      const v = body.linvel();
      prevVel.set(id, { x: v.x, y: v.y, z: v.z });
    }
    const s0 = performance.now();
    world.step(queue);
    stepMs.push(performance.now() - s0);

    queue.drainCollisionEvents((ca, cb, started) => {
      if (!started) return;
      const aId = colliderToPart.get(ca);
      const bId = colliderToPart.get(cb);
      if (!aId || !bId) return;
      const victims = [aId, bId].filter((id) => seams.some((seam) => seam.aId === id || seam.bId === id));
      if (victims.length === 0) return;
      const va = prevVel.get(aId) ?? { x: 0, y: 0, z: 0 };
      const vb = prevVel.get(bId) ?? { x: 0, y: 0, z: 0 };
      const speed = relativeSpeed(va, vb);
      if (shouldIgnoreImpact(speed) || speed < MIN_IMPACT_SPEED) return;
      const pair = `${aId}|${bId}`;
      const last = lastHit.get(pair) ?? -999;
      if (i - last < 6) return;
      lastHit.set(pair, i);
      const bodyA = bodies.get(aId)!;
      const bodyB = bodies.get(bId)!;
      const sa = Math.hypot(va.x, va.y, va.z);
      const sb = Math.hypot(vb.x, vb.y, vb.z);
      const striker = pickStriker(bodyA, bodyB, sa, sb);
      const impulse = impactImpulse(striker.mass(), speed);
      for (const victimId of victims) {
        const result = applyImpact(seams, victimId, impulse);
        if (result.brokenIds.length === 0) continue;
        for (const id of result.brokenIds) {
          const seam = seams.find((item) => seamId(item) === id);
          if (!seam) continue;
          world.removeImpulseJoint(seam.handle, true);
          brokenTotal += 1;
        }
        for (let s = seams.length - 1; s >= 0; s--) {
          if (result.brokenIds.includes(seamId(seams[s]))) seams.splice(s, 1);
        }
      }
    });

    for (const body of Array.from(bodies.values())) {
      const t = body.translation();
      const v = body.linvel();
      if (!isFiniteVec(t) || !isFiniteVec(v)) nanFrames += 1;
      else maxSpeed = Math.max(maxSpeed, Math.hypot(v.x, v.y, v.z));
      if (t.y < FLOOR_Y - 1) fallen += 1;
    }
  }

  const elapsed = performance.now() - t0;
  const ids = Array.from(bodies.keys()).filter((id) => id !== "drop-cube");
  let deepOverlaps = 0;
  for (let i = 0; i < ids.length; i++) {
    const a = bodies.get(ids[i])!.translation();
    for (let j = i + 1; j < ids.length; j++) {
      const b = bodies.get(ids[j])!.translation();
      const dist = Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
      if (dist < DEEP_OVERLAP) deepOverlaps += 1;
    }
  }

  stepMs.sort((a, b) => a - b);
  const p50 = stepMs[Math.floor(stepMs.length * 0.5)] ?? 0;
  const p95 = stepMs[Math.floor(stepMs.length * 0.95)] ?? 0;
  const remaining = seams.length;
  const report = {
    parts: layout.parts.length,
    jointsStart: layout.joints.length,
    jointsLeft: remaining,
    broken: brokenTotal,
    nanFrames,
    fallen,
    deepOverlaps,
    maxSpeed: +maxSpeed.toFixed(3),
    stepMsP50: +p50.toFixed(3),
    stepMsP95: +p95.toFixed(3),
    wallMs: +elapsed.toFixed(1),
    bodies: layout.parts.length + 2,
  };
  console.log(JSON.stringify(report, null, 2));

  world.free();
  queue.free();

  assert(nanFrames === 0, `NaN in ${nanFrames} body-frames`);
  assert(fallen === 0, `${fallen} bodies fell through the floor`);
  assert(deepOverlaps < 8, `too many concentric overlaps: ${deepOverlaps}`);
  assert(brokenTotal >= 1, "chain-bomb must break at least one weld");
  assert(maxSpeed > 4, `expected energetic cascade, maxSpeed=${maxSpeed}`);
  console.log("d5-stress-150 ok");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
