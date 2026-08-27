/**
 * Headless Rapier probe: drop-hammer contact impulse onto a grounded plate.
 * Run: npx tsx tests/d3-rapier-impulse-probe.ts
 */
import RAPIER from "@dimforge/rapier3d-compat";

const DT = 1 / 60;

type Preset = { name: string; height: number; density: number; size: number };

const PRESETS: Preset[] = [
  { name: "light", height: 2.4, density: 1.6, size: 0.7 },
  { name: "medium", height: 4.8, density: 3.0, size: 0.7 },
  { name: "heavy", height: 7.2, density: 5.0, size: 0.7 },
  { name: "d2-default", height: 7.2, density: 3.0, size: 0.7 },
];

type Variant = { ccd: boolean; restitution: number; target: "jointed" | "fixed" };

const VARIANTS: Variant[] = [
  { ccd: true, restitution: 0.62, target: "jointed" },
  { ccd: false, restitution: 0.62, target: "jointed" },
  { ccd: true, restitution: 0.05, target: "jointed" },
  { ccd: true, restitution: 0.62, target: "fixed" },
];

async function main() {
  await RAPIER.init();
  for (const variant of VARIANTS) {
    for (const preset of PRESETS) {
      const result = runDrop(preset, variant);
      const theoretical = preset.density * preset.size ** 3 * Math.sqrt(2 * 9.81 * Math.max(0.05, preset.height - 0.59));
      console.log(
        JSON.stringify({
          variant,
          name: preset.name,
          mass: +(preset.density * preset.size ** 3).toFixed(4),
          contacts: result.contacts,
          collisions: result.collisions,
          maxForce: +result.maxForce.toFixed(2),
          sumForceDt: +result.sumForceDt.toFixed(3),
          firstMv: +result.firstMv.toFixed(3),
          maxMv: +result.maxMv.toFixed(3),
          theoreticalMv: +theoretical.toFixed(3),
          forceOverMv: theoretical > 0 ? +(result.sumForceDt / theoretical).toFixed(3) : null,
          firstMvOverTheory: theoretical > 0 ? +(result.firstMv / theoretical).toFixed(3) : null,
        })
      );
    }
  }
}

function runDrop(preset: Preset, variant: Variant) {
  const world = new RAPIER.World({ x: 0, y: -9.81, z: 0 });
  world.integrationParameters.dt = DT;
  const queue = new RAPIER.EventQueue(true);

  const ground = world.createRigidBody(RAPIER.RigidBodyDesc.fixed().setTranslation(0, 0.1, 0));
  world.createCollider(RAPIER.ColliderDesc.cuboid(0.9, 0.1, 0.9).setDensity(1).setFriction(0.88).setRestitution(0.1), ground);

  let plate: RAPIER.RigidBody;
  if (variant.target === "fixed") {
    plate = world.createRigidBody(RAPIER.RigidBodyDesc.fixed().setTranslation(0, 0.24, 0));
  } else {
    plate = world.createRigidBody(RAPIER.RigidBodyDesc.dynamic().setTranslation(0, 0.24, 0));
  }
  world.createCollider(
    RAPIER.ColliderDesc.cuboid(0.5, 0.04, 0.5)
      .setDensity(1)
      .setFriction(0.62)
      .setRestitution(0.18)
      .setActiveEvents(RAPIER.ActiveEvents.COLLISION_EVENTS | RAPIER.ActiveEvents.CONTACT_FORCE_EVENTS)
      .setContactForceEventThreshold(0),
    plate
  );
  if (variant.target === "jointed") {
    const joint = RAPIER.JointData.fixed(
      { x: 0, y: 0.1, z: 0 },
      { x: 0, y: 0, z: 0, w: 1 },
      { x: 0, y: -0.04, z: 0 },
      { x: 0, y: 0, z: 0, w: 1 }
    );
    const handle = world.createImpulseJoint(joint, ground, plate, true);
    handle.setContactsEnabled(false);
  }

  const hammer = world.createRigidBody(
    RAPIER.RigidBodyDesc.dynamic().setTranslation(0, preset.height, 0).setCcdEnabled(variant.ccd)
  );
  world.createCollider(
    RAPIER.ColliderDesc.cuboid(preset.size / 2, preset.size / 2, preset.size / 2)
      .setDensity(preset.density)
      .setFriction(0.62)
      .setRestitution(variant.restitution)
      .setActiveEvents(RAPIER.ActiveEvents.COLLISION_EVENTS | RAPIER.ActiveEvents.CONTACT_FORCE_EVENTS)
      .setContactForceEventThreshold(0),
    hammer
  );

  const hammerCollider = hammer.collider(0);
  const plateCollider = plate.collider(0);
  const mass = hammer.mass();
  let contacts = 0;
  let collisions = 0;
  let maxForce = 0;
  let sumForceDt = 0;
  let firstMv = 0;
  let maxMv = 0;
  let firstHitFrame = -1;
  let prevV = { x: 0, y: 0, z: 0 };

  for (let i = 0; i < 600; i++) {
    const lv = hammer.linvel();
    prevV = { x: lv.x, y: lv.y, z: lv.z };
    world.step(queue);
    queue.drainCollisionEvents((a, b, started) => {
      const involves =
        (a === hammerCollider.handle && b === plateCollider.handle) ||
        (b === hammerCollider.handle && a === plateCollider.handle);
      if (!involves || !started) return;
      collisions += 1;
      const speed = Math.hypot(prevV.x, prevV.y, prevV.z);
      const mv = mass * speed;
      if (firstMv === 0) firstMv = mv;
      maxMv = Math.max(maxMv, mv);
      if (firstHitFrame < 0) firstHitFrame = i;
    });
    queue.drainContactForceEvents((event) => {
      const a = event.collider1();
      const b = event.collider2();
      const involves =
        (a === hammerCollider.handle && b === plateCollider.handle) ||
        (b === hammerCollider.handle && a === plateCollider.handle);
      if (!involves) return;
      const force = event.totalForceMagnitude();
      contacts += 1;
      maxForce = Math.max(maxForce, force);
      sumForceDt += force * DT;
      if (firstHitFrame < 0) firstHitFrame = i;
    });
    if (firstHitFrame >= 0 && i - firstHitFrame > 45) break;
  }

  world.free();
  queue.free();
  return { contacts, collisions, maxForce, sumForceDt, firstMv, maxMv };
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
