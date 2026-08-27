"use client";

import React, {
  Suspense,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
} from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { ContactShadows, Environment, Grid, OrbitControls } from "@react-three/drei";
import { EffectComposer, Bloom, SMAA, Vignette } from "@react-three/postprocessing";
import {
  CylinderCollider,
  Physics,
  RigidBody,
  useBeforePhysicsStep,
  type CollisionEnterPayload,
  type RapierRigidBody,
  useRapier,
} from "@react-three/rapier";
import type { ImpulseJoint } from "@dimforge/rapier3d-compat";
import * as THREE from "three";
import {
  ALL_YARD_PARTS,
  GROUND_ANCHOR,
  YARD,
  type YardPartDef,
  type YardSocket,
} from "@/lib/yard/catalog";
import type { YardBlueprint, YardBlueprintJoint } from "@/lib/yard/blueprint";
import {
  HAMMER_PRESETS,
  IMPACT_CHATTER_MS,
  applyImpact,
  impactImpulse,
  pickStriker,
  relativeSpeed,
  resolveBreakImpulse,
  resolveJointKind,
  seamId,
  shouldIgnoreImpact,
  type HammerPresetId,
  type SeamState,
} from "@/lib/yard/fracture";
import WeldFx, { seamWorldPoint, type SparkBurst } from "@/components/yard/WeldFx";
import ThrusterFx from "@/components/yard/ThrusterFx";
import { useYardTextures } from "@/components/yard/useYardTextures";
import { yardSound } from "@/lib/yard/audio";

const BODY_FIXED = 1;
const BODY_DYNAMIC = 0;
const BODY_KINEMATIC_POS = 2;
const RESTITUTION_MAX = 3;
const SNAP_GRID = 0.25;
const SNAP_DISTANCE = 1.35;
const SNAP_ALIGNMENT = -0.86;
const HOLD_MIN_Y = 0.2;
const HOLD_MAX_Y = YARD.height - 0.8;
const HOLD_LIMIT_X = YARD.width / 2 - 0.8;
const HOLD_LIMIT_Z = YARD.depth / 2 - 0.8;
const _up = new THREE.Vector3(0, 1, 0);
const _hit = new THREE.Vector3();
const _plane = new THREE.Plane();
const _raycaster = new THREE.Raycaster();
const _zero = { x: 0, y: 0, z: 0 };

export type YardImpulseEvent = {
  impulse: number;
  partId: string;
  otherId: string;
  jointId: string;
  damage: number;
  breakImpulse: number;
  broken: boolean;
  sharedAcross: number;
};

export type YardActions = {
  weld: () => void;
  undo: () => void;
  release: () => void;
  drop: () => void;
  resetHammer: (preset: HammerPresetId) => void;
  getBlueprint: () => YardBlueprint | null;
  loadBlueprint: (blueprint: YardBlueprint) => void;
};

type RuntimeJoint = YardBlueprintJoint & SeamState & { handle: ImpulseJoint };

type YardSceneProps = {
  paused: boolean;
  fpsNodeRef: React.RefObject<HTMLSpanElement>;
  actionsRef: React.MutableRefObject<YardActions | null>;
  onHoldChange: (label: string | null) => void;
  onSnapChange: (label: string | null) => void;
  onJointCount: (count: number) => void;
  onBlueprintDirty: () => void;
  onImpulse: (event: YardImpulseEvent) => void;
  onReleaseRequest: () => void;
  onPhysicsReady: () => void;
};

type PartRecord = {
  id: string;
  def: YardPartDef;
  body: RapierRigidBody;
  object: THREE.Object3D;
  fixed?: boolean;
};

type Held = PartRecord & { holdY: number };

type SnapCandidate = {
  aId: string;
  aSocketId: string;
  bId: string;
  bSocketId: string;
  position: THREE.Vector3;
  quaternion: THREE.Quaternion;
  anchor: THREE.Vector3;
};

type GhostState = {
  visible: boolean;
  def: YardPartDef | null;
  position: THREE.Vector3;
  quaternion: THREE.Quaternion;
  anchor: THREE.Vector3;
};

type YardApi = {
  grab: (part: PartRecord, hitY: number) => void;
  drop: () => void;
  isHolding: () => boolean;
  registerPart: (part: PartRecord) => void;
  unregisterPart: (id: string) => void;
  handleCollisionEnter: (partId: string, payload: CollisionEnterPayload) => void;
};

const YardApiContext = createContext<YardApi | null>(null);

export default function YardScene(props: YardSceneProps) {
  const {
    paused,
    fpsNodeRef,
    actionsRef,
    onHoldChange,
    onSnapChange,
    onJointCount,
    onBlueprintDirty,
    onImpulse,
    onReleaseRequest,
    onPhysicsReady,
  } = props;
  const pausedRef = useRef(paused);
  pausedRef.current = paused;
  const onHoldChangeRef = useRef(onHoldChange);
  const onSnapChangeRef = useRef(onSnapChange);
  const onJointCountRef = useRef(onJointCount);
  const onBlueprintDirtyRef = useRef(onBlueprintDirty);
  const onImpulseRef = useRef(onImpulse);
  const onReleaseRequestRef = useRef(onReleaseRequest);
  onHoldChangeRef.current = onHoldChange;
  onSnapChangeRef.current = onSnapChange;
  onJointCountRef.current = onJointCount;
  onBlueprintDirtyRef.current = onBlueprintDirty;
  onImpulseRef.current = onImpulse;
  onReleaseRequestRef.current = onReleaseRequest;
  const dropRef = useRef<() => void>(() => {});

  return (
    <Canvas
      shadows
      dpr={[1, 1.5]}
      gl={{
        antialias: false,
        powerPreference: "high-performance",
        alpha: false,
        toneMapping: THREE.ACESFilmicToneMapping,
        toneMappingExposure: 1.15,
      }}
      camera={{ position: [11, 8.5, 21], fov: 48, near: 0.1, far: 220 }}
      style={{ background: "#050811" }}
      onPointerMissed={() => dropRef.current()}
    >
      <color attach="background" args={["#050811"]} />

      {/* Cinematic IBL Environment */}
      <Environment preset="warehouse" />

      {/* Primary Sun Slit Light */}
      <directionalLight
        position={[14, 22, 12]}
        intensity={1.8}
        castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-bias={-0.0001}
        shadow-camera-left={-24}
        shadow-camera-right={24}
        shadow-camera-top={20}
        shadow-camera-bottom={-20}
        shadow-camera-near={1}
        shadow-camera-far={70}
      />

      {/* Cool Industrial Fill & Rim Lights */}
      <ambientLight intensity={0.25} color="#94a3b8" />
      <directionalLight position={[-16, 12, -10]} intensity={0.6} color="#38bdf8" />
      <pointLight position={[0, 14, 0]} intensity={0.5} distance={30} color="#f8fafc" />

      {/* Soft Contact Shadows on Floor */}
      <ContactShadows
        position={[0, 0.01, 0]}
        opacity={0.65}
        scale={40}
        blur={1.6}
        far={4}
        resolution={1024}
        color="#020617"
      />

      <ExteriorStars />

      <Suspense fallback={null}>
        <Physics gravity={[0, -9.81, 0]} timeStep={1 / 60} paused={paused} interpolate colliders="cuboid">
          <GrabController
            paused={paused}
            pausedRef={pausedRef}
            actionsRef={actionsRef}
            onHoldChangeRef={onHoldChangeRef}
            onSnapChangeRef={onSnapChangeRef}
            onJointCountRef={onJointCountRef}
            onBlueprintDirtyRef={onBlueprintDirtyRef}
            onImpulseRef={onImpulseRef}
            onReleaseRequestRef={onReleaseRequestRef}
            dropRef={dropRef}
          >
            <DockHull onBackgroundPointer={dropRef} />
            <DockAnchor />
            {ALL_YARD_PARTS.map((part) => (
              <YardPart key={part.id} def={part} simulating={!paused} />
            ))}
          </GrabController>
          <ReadyBeacon onReady={onPhysicsReady} />
        </Physics>
      </Suspense>

      {/* Restrained Cinematic Postprocessing */}
      <EffectComposer multisampling={0} enableNormalPass={false}>
        <SMAA />
        <Bloom
          luminanceThreshold={0.88}
          luminanceSmoothing={0.25}
          intensity={0.65}
          mipmapBlur
        />
        <Vignette eskil={false} offset={0.22} darkness={0.82} />
      </EffectComposer>

      <OrbitControls
        makeDefault
        enableDamping
        dampingFactor={0.08}
        minDistance={6}
        maxDistance={48}
        minPolarAngle={0.12}
        maxPolarAngle={Math.PI / 2 - 0.06}
        target={[0, 4.2, 0]}
      />
      <FpsSampler nodeRef={fpsNodeRef} />
    </Canvas>
  );
}

function ReadyBeacon({ onReady }: { onReady: () => void }) {
  useEffect(() => onReady(), [onReady]);
  return null;
}

function FpsSampler({ nodeRef }: { nodeRef: React.RefObject<HTMLSpanElement> }) {
  const acc = useRef(0);
  const frames = useRef(0);
  useFrame((_, dt) => {
    acc.current += dt;
    frames.current += 1;
    if (acc.current < 1) return;
    if (nodeRef.current) nodeRef.current.textContent = String(Math.round(frames.current / acc.current));
    acc.current = 0;
    frames.current = 0;
  });
  return null;
}

function GrabController({
  paused,
  pausedRef,
  actionsRef,
  onHoldChangeRef,
  onSnapChangeRef,
  onJointCountRef,
  onBlueprintDirtyRef,
  onImpulseRef,
  onReleaseRequestRef,
  dropRef,
  children,
}: {
  paused: boolean;
  pausedRef: React.MutableRefObject<boolean>;
  actionsRef: React.MutableRefObject<YardActions | null>;
  onHoldChangeRef: React.MutableRefObject<(label: string | null) => void>;
  onSnapChangeRef: React.MutableRefObject<(label: string | null) => void>;
  onJointCountRef: React.MutableRefObject<(count: number) => void>;
  onBlueprintDirtyRef: React.MutableRefObject<() => void>;
  onImpulseRef: React.MutableRefObject<(event: YardImpulseEvent) => void>;
  onReleaseRequestRef: React.MutableRefObject<() => void>;
  dropRef: React.MutableRefObject<() => void>;
  children: React.ReactNode;
}) {
  const heldRef = useRef<Held | null>(null);
  const partsRef = useRef(new Map<string, PartRecord>());
  const jointsRef = useRef<RuntimeJoint[]>([]);
  const candidateRef = useRef<SnapCandidate | null>(null);
  const ghostRef = useRef<GhostState>({
    visible: false,
    def: null,
    position: new THREE.Vector3(),
    quaternion: new THREE.Quaternion(),
    anchor: new THREE.Vector3(),
  });
  const lastSnapKeyRef = useRef<string | null>(null);
  const prevVelRef = useRef(new Map<string, { x: number; y: number; z: number }>());
  const lastHitRef = useRef(new Map<string, number>());
  const sparksRef = useRef<SparkBurst[]>([]);
  const { camera, pointer, gl } = useThree();
  const controls = useThree((s) => s.controls) as { enabled?: boolean } | null;
  const { rapier, world } = useRapier();

  const setPose = useCallback((part: PartRecord, position: THREE.Vector3, quaternion: THREE.Quaternion) => {
    part.body.setTranslation(position, true);
    part.body.setRotation({ x: quaternion.x, y: quaternion.y, z: quaternion.z, w: quaternion.w }, true);
    part.object.position.copy(position);
    part.object.quaternion.copy(quaternion);
  }, []);

  const setDynamic = useCallback((part: PartRecord) => {
    if (part.fixed) return;
    part.body.setBodyType(BODY_DYNAMIC, true);
    part.body.lockRotations(false, true);
    part.body.setLinvel(_zero, true);
    part.body.setAngvel(_zero, true);
    part.body.wakeUp();
  }, []);

  const clearHeld = useCallback(() => {
    const held = heldRef.current;
    if (!held) return;
    setDynamic(held);
    heldRef.current = null;
    candidateRef.current = null;
    ghostRef.current.visible = false;
    lastSnapKeyRef.current = null;
    if (controls) controls.enabled = true;
    gl.domElement.style.cursor = "auto";
    onHoldChangeRef.current(null);
    onSnapChangeRef.current(null);
    yardSound.playGrab(false);
  }, [controls, gl, onHoldChangeRef, onSnapChangeRef, setDynamic]);

  const drop = useCallback(() => {
    if (!heldRef.current) return;
    clearHeld();
    onBlueprintDirtyRef.current();
  }, [clearHeld, onBlueprintDirtyRef]);

  const grab = useCallback((next: PartRecord, hitY: number) => {
    if (heldRef.current) {
      drop();
      return;
    }
    if (jointsRef.current.some((joint) => joint.aId === next.id || joint.bId === next.id)) return;
    next.body.wakeUp();
    next.body.setBodyType(BODY_KINEMATIC_POS, true);
    next.body.lockRotations(true, true);
    next.body.setLinvel(_zero, true);
    next.body.setAngvel(_zero, true);
    heldRef.current = { ...next, holdY: THREE.MathUtils.clamp(hitY, HOLD_MIN_Y, HOLD_MAX_Y) };
    if (controls) controls.enabled = false;
    gl.domElement.style.cursor = "grabbing";
    onHoldChangeRef.current(next.def.label);
    yardSound.playGrab(true);
  }, [controls, drop, gl, onHoldChangeRef]);

  const registerPart = useCallback((part: PartRecord) => partsRef.current.set(part.id, part), []);
  const unregisterPart = useCallback((id: string) => partsRef.current.delete(id), []);

  const wakeLoose = useCallback((part: PartRecord | undefined) => {
    if (!part || part.fixed) return;
    part.body.setBodyType(BODY_DYNAMIC, true);
    part.body.lockRotations(false, true);
    part.body.wakeUp();
  }, []);

  const handleCollisionEnter = useCallback((partId: string, payload: CollisionEnterPayload) => {
    if (pausedRef.current) return;
    const otherBody = payload.other.rigidBody;
    if (!otherBody) return;
    const tagged = (payload.other.rigidBodyObject?.userData as { yardPartId?: string } | undefined)?.yardPartId;
    const otherId = tagged ?? Array.from(partsRef.current.values()).find((part) => part.body === otherBody)?.id;
    if (!otherId) return;

    const rest = { x: 0, y: 0, z: 0 };
    const va = prevVelRef.current.get(partId) ?? rest;
    const vb = prevVelRef.current.get(otherId) ?? rest;
    const speed = relativeSpeed(va, vb);

    // Audio Impact ping
    if (speed > 1.0) {
      yardSound.playImpact(speed, partId === "drop-cube" || otherId === "drop-cube");
    }

    if (!jointsRef.current.some((joint) => joint.aId === partId || joint.bId === partId)) return;
    const now = performance.now();
    const pairKey = `${partId}|${otherId}`;
    const last = lastHitRef.current.get(pairKey) ?? 0;
    if (now - last < IMPACT_CHATTER_MS) return;
    if (shouldIgnoreImpact(speed)) return;
    const self = partsRef.current.get(partId);
    const other = partsRef.current.get(otherId);
    if (!self || !other) return;
    lastHitRef.current.set(pairKey, now);
    const striker = pickStriker(self, other, Math.hypot(va.x, va.y, va.z), Math.hypot(vb.x, vb.y, vb.z));
    const impulse = impactImpulse(striker.body.mass(), speed);
    if (impulse <= 0) return;
    const result = applyImpact(jointsRef.current, partId, impulse);
    if (result.shares.length === 0) return;
    const hottest = result.shares.reduce((best, share) => (share.damage >= best.damage ? share : best));
    const broken = result.brokenIds.length
      ? jointsRef.current.filter((joint) => result.brokenIds.includes(seamId(joint)))
      : [];
    for (const seam of broken) {
      const point = seamWorldPoint(seam, partsRef.current);
      if (point) sparksRef.current.push({ origin: point.clone(), born: now / 1000, seed: now + seam.breakImpulse });
      world.removeImpulseJoint(seam.handle, true);
      wakeLoose(partsRef.current.get(seam.aId));
      wakeLoose(partsRef.current.get(seam.bId));
    }
    if (broken.length) {
      jointsRef.current = jointsRef.current.filter((joint) => !result.brokenIds.includes(seamId(joint)));
      onJointCountRef.current(jointsRef.current.length);
      onBlueprintDirtyRef.current();
      yardSound.playFracture(impulse);
    }
    const live = jointsRef.current.find((joint) => seamId(joint) === hottest.seamId) ?? broken[0];
    onImpulseRef.current({
      impulse,
      partId,
      otherId,
      jointId: hottest.seamId,
      damage: hottest.damage,
      breakImpulse: live?.breakImpulse ?? 0,
      broken: result.brokenIds.length > 0,
      sharedAcross: result.sharedAcross,
    });
  }, [onBlueprintDirtyRef, onImpulseRef, onJointCountRef, pausedRef, wakeLoose, world]);

  const createJoint = useCallback((joint: YardBlueprintJoint): ImpulseJoint | null => {
    const a = partsRef.current.get(joint.aId);
    const b = partsRef.current.get(joint.bId);
    if (!a || !b) return null;
    const anchor = new THREE.Vector3(...joint.anchor);
    const at = a.body.translation();
    const bt = b.body.translation();
    const ar = a.body.rotation();
    const br = b.body.rotation();
    const aQ = new THREE.Quaternion(ar.x, ar.y, ar.z, ar.w);
    const bQ = new THREE.Quaternion(br.x, br.y, br.z, br.w);
    const aLocal = anchor.clone().sub(new THREE.Vector3(at.x, at.y, at.z)).applyQuaternion(aQ.clone().invert());
    const bLocal = anchor.clone().sub(new THREE.Vector3(bt.x, bt.y, bt.z)).applyQuaternion(bQ.clone().invert());
    const worldFrame = aQ.clone();
    const aFrame = aQ.clone().invert().multiply(worldFrame);
    const bFrame = bQ.clone().invert().multiply(worldFrame);
    const data = rapier.JointData.fixed(
      { x: aLocal.x, y: aLocal.y, z: aLocal.z },
      { x: aFrame.x, y: aFrame.y, z: aFrame.z, w: aFrame.w },
      { x: bLocal.x, y: bLocal.y, z: bLocal.z },
      { x: bFrame.x, y: bFrame.y, z: bFrame.z, w: bFrame.w }
    );
    const created = world.createImpulseJoint(data, a.body, b.body, true);
    created.setContactsEnabled(false);
    return created;
  }, [rapier, world]);

  const attachJoint = useCallback((joint: YardBlueprintJoint, damage = 0): boolean => {
    const a = partsRef.current.get(joint.aId);
    const b = partsRef.current.get(joint.bId);
    if (!a || !b) return false;
    const handle = createJoint(joint);
    if (!handle) return false;
    const kind = resolveJointKind(a.def, b.def);
    const seeded = Math.min(0.999, Math.max(0, damage));
    jointsRef.current.push({
      ...joint,
      handle,
      kind,
      breakImpulse: resolveBreakImpulse(a.def, b.def, kind),
      damage: seeded,
      heat: seeded,
    });
    return true;
  }, [createJoint]);

  const weld = useCallback(() => {
    if (!pausedRef.current) return;
    const held = heldRef.current;
    const candidate = candidateRef.current;
    if (!held || !candidate || candidate.aId !== held.id) return;
    const joint: YardBlueprintJoint = {
      aId: candidate.aId,
      aSocketId: candidate.aSocketId,
      bId: candidate.bId,
      bSocketId: candidate.bSocketId,
      anchor: [candidate.anchor.x, candidate.anchor.y, candidate.anchor.z],
    };
    if (!attachJoint(joint)) return;
    setDynamic(held);
    heldRef.current = null;
    candidateRef.current = null;
    ghostRef.current.visible = false;
    lastSnapKeyRef.current = null;
    if (controls) controls.enabled = true;
    gl.domElement.style.cursor = "auto";
    onHoldChangeRef.current(null);
    onSnapChangeRef.current(null);
    onJointCountRef.current(jointsRef.current.length);
    onBlueprintDirtyRef.current();
    yardSound.playWeld();
  }, [attachJoint, controls, gl, onBlueprintDirtyRef, onHoldChangeRef, onJointCountRef, onSnapChangeRef, setDynamic]);

  const undo = useCallback(() => {
    if (!pausedRef.current) return;
    const last = jointsRef.current.pop();
    if (!last) return;
    world.removeImpulseJoint(last.handle, true);
    onJointCountRef.current(jointsRef.current.length);
    onBlueprintDirtyRef.current();
    yardSound.playGrab(false);
  }, [onBlueprintDirtyRef, onJointCountRef, world]);

  const release = useCallback(() => {
    if (heldRef.current) clearHeld();
    partsRef.current.forEach(setDynamic);
    onReleaseRequestRef.current();
    onBlueprintDirtyRef.current();
  }, [clearHeld, onBlueprintDirtyRef, onReleaseRequestRef, setDynamic]);

  const getBlueprint = useCallback((): YardBlueprint | null => ({
    version: 1,
    savedAt: Date.now(),
    parts: Array.from(partsRef.current.values()).map((part) => {
      const p = part.body.translation();
      const q = part.body.rotation();
      return {
        instanceId: part.id,
        catalogId: part.def.catalogId ?? part.def.id,
        position: [p.x, p.y, p.z],
        rotation: [q.x, q.y, q.z, q.w],
      };
    }),
    joints: jointsRef.current.map((joint) => ({
      aId: joint.aId,
      aSocketId: joint.aSocketId,
      bId: joint.bId,
      bSocketId: joint.bSocketId,
      anchor: joint.anchor,
      ...(joint.damage > 0 ? { damage: joint.damage } : {}),
    })),
  }), []);

  const loadBlueprint = useCallback((blueprint: YardBlueprint) => {
    clearHeld();
    candidateRef.current = null;
    ghostRef.current.visible = false;
    lastSnapKeyRef.current = null;
    jointsRef.current.forEach((joint) => world.removeImpulseJoint(joint.handle, true));
    jointsRef.current = [];
    const savedById = new Map(blueprint.parts.map((part) => [part.instanceId, part]));
    partsRef.current.forEach((part) => {
      if (part.fixed) return;
      const saved = savedById.get(part.id);
      if (saved) return;
      setPose(part, new THREE.Vector3(...part.def.spawn), new THREE.Quaternion());
      setDynamic(part);
    });
    blueprint.parts.forEach((saved) => {
      const part = partsRef.current.get(saved.instanceId);
      if (!part) return;
      setPose(part, new THREE.Vector3(...saved.position), new THREE.Quaternion(...saved.rotation));
      if (part.fixed) part.body.setBodyType(BODY_FIXED, true);
      else setDynamic(part);
    });
    blueprint.joints.forEach((joint) => {
      attachJoint(joint, joint.damage ?? 0);
    });
    onJointCountRef.current(jointsRef.current.length);
    onBlueprintDirtyRef.current();
  }, [attachJoint, clearHeld, onBlueprintDirtyRef, onJointCountRef, setDynamic, setPose, world]);

  const resetHammer = useCallback((presetId: HammerPresetId) => {
    const part = partsRef.current.get("drop-cube");
    if (!part) return;
    if (heldRef.current?.id === "drop-cube") clearHeld();
    const preset = HAMMER_PRESETS[presetId];
    const collider = part.body.collider(0);
    if (collider) collider.setDensity(preset.density);
    setPose(part, new THREE.Vector3(0, preset.height, 0), new THREE.Quaternion());
    part.body.setLinvel(_zero, true);
    part.body.setAngvel(_zero, true);
    wakeLoose(part);
    onBlueprintDirtyRef.current();
    yardSound.playImpact(preset.height, true);
  }, [clearHeld, onBlueprintDirtyRef, setPose, wakeLoose]);

  useEffect(() => {
    dropRef.current = drop;
    actionsRef.current = { weld, undo, release, drop, resetHammer, getBlueprint, loadBlueprint };
    return () => {
      dropRef.current = () => {};
      if (actionsRef.current?.getBlueprint === getBlueprint) actionsRef.current = null;
    };
  }, [actionsRef, drop, dropRef, getBlueprint, loadBlueprint, release, resetHammer, undo, weld]);

  useBeforePhysicsStep(() => {
    if (pausedRef.current) return;
    partsRef.current.forEach((part, id) => {
      const velocity = part.body.linvel();
      prevVelRef.current.set(id, { x: velocity.x, y: velocity.y, z: velocity.z });
    });
  });

  useEffect(() => {
    if (!paused) drop();
  }, [drop, paused]);

  useEffect(() => {
    const el = gl.domElement;
    const onWheel = (event: WheelEvent) => {
      const held = heldRef.current;
      if (!held) return;
      event.preventDefault();
      held.holdY = THREE.MathUtils.clamp(held.holdY - Math.sign(event.deltaY) * 0.28, HOLD_MIN_Y, HOLD_MAX_Y);
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [gl]);

  useFrame(() => {
    const held = heldRef.current;
    if (!held) return;
    _plane.setFromNormalAndCoplanarPoint(_up, _hit.set(0, held.holdY, 0));
    _raycaster.setFromCamera(pointer, camera);
    if (!_raycaster.ray.intersectPlane(_plane, _hit)) return;
    const freePosition = new THREE.Vector3(
      THREE.MathUtils.clamp(_hit.x, -HOLD_LIMIT_X, HOLD_LIMIT_X),
      held.holdY,
      THREE.MathUtils.clamp(_hit.z, -HOLD_LIMIT_Z, HOLD_LIMIT_Z)
    );
    setPose(held, freePosition, new THREE.Quaternion().copy(held.object.quaternion));
    if (!pausedRef.current) {
      held.body.setNextKinematicTranslation({ x: freePosition.x, y: freePosition.y, z: freePosition.z });
      const nextRotation = held.body.rotation();
      held.body.setNextKinematicRotation(nextRotation);
    }
    const candidate = findSnapCandidate(held, partsRef.current, jointsRef.current);
    candidateRef.current = candidate;
    if (candidate) {
      setPose(held, candidate.position, candidate.quaternion);
      if (!pausedRef.current) {
        held.body.setNextKinematicTranslation({ x: candidate.position.x, y: candidate.position.y, z: candidate.position.z });
        held.body.setNextKinematicRotation({ x: candidate.quaternion.x, y: candidate.quaternion.y, z: candidate.quaternion.z, w: candidate.quaternion.w });
      }
      ghostRef.current.visible = true;
      ghostRef.current.def = held.def;
      ghostRef.current.position.copy(candidate.position);
      ghostRef.current.quaternion.copy(candidate.quaternion);
      ghostRef.current.anchor.copy(candidate.anchor);
      const key = `${candidate.aId}:${candidate.aSocketId}:${candidate.bId}:${candidate.bSocketId}`;
      if (lastSnapKeyRef.current !== key) {
        lastSnapKeyRef.current = key;
        onSnapChangeRef.current(`${partsRef.current.get(candidate.bId)?.def.label ?? "插座"} · 可焊`);
        yardSound.playSnap();
      }
    } else {
      ghostRef.current.visible = false;
      if (lastSnapKeyRef.current !== null) {
        lastSnapKeyRef.current = null;
        onSnapChangeRef.current(null);
      }
    }
  });

  const api = useMemo<YardApi>(() => ({
    grab,
    drop,
    isHolding: () => heldRef.current !== null,
    registerPart,
    unregisterPart,
    handleCollisionEnter,
  }), [drop, grab, handleCollisionEnter, registerPart, unregisterPart]);

  return (
    <YardApiContext.Provider value={api}>
      {children}
      <SnapGhost stateRef={ghostRef} />
      <WeldFx partsRef={partsRef} seamsRef={jointsRef} sparksRef={sparksRef} />
    </YardApiContext.Provider>
  );
}

function findSnapCandidate(
  held: Held,
  parts: Map<string, PartRecord>,
  joints: RuntimeJoint[]
): SnapCandidate | null {
  let best: SnapCandidate | null = null;
  let bestDistance = SNAP_DISTANCE;
  const occupied = new Set(joints.flatMap((joint) => [`${joint.aId}:${joint.aSocketId}`, `${joint.bId}:${joint.bSocketId}`]));
  const hp = held.body.translation();
  const hr = held.body.rotation();
  const hq = new THREE.Quaternion(hr.x, hr.y, hr.z, hr.w);
  for (const target of Array.from(parts.values())) {
    if (target.id === held.id) continue;
    const tp = target.body.translation();
    const tr = target.body.rotation();
    const tq = new THREE.Quaternion(tr.x, tr.y, tr.z, tr.w);
    for (const hs of held.def.sockets) {
      const hPoint = new THREE.Vector3(...hs.point).applyQuaternion(hq).add(new THREE.Vector3(hp.x, hp.y, hp.z));
      const hNormal = new THREE.Vector3(...hs.normal).applyQuaternion(hq).normalize();
      for (const ts of target.def.sockets) {
        if (occupied.has(`${target.id}:${ts.id}`) || occupied.has(`${held.id}:${hs.id}`)) continue;
        const tPoint = new THREE.Vector3(...ts.point).applyQuaternion(tq).add(new THREE.Vector3(tp.x, tp.y, tp.z));
        const tNormal = new THREE.Vector3(...ts.normal).applyQuaternion(tq).normalize();
        const distance = hPoint.distanceTo(tPoint);
        if (distance > bestDistance || hNormal.dot(tNormal) > SNAP_ALIGNMENT) continue;
        const desiredQ = new THREE.Quaternion().setFromUnitVectors(hNormal, tNormal.clone().negate()).multiply(hq).normalize();
        const anchor = tPoint.clone().divideScalar(SNAP_GRID).round().multiplyScalar(SNAP_GRID);
        const desiredPosition = anchor.clone().sub(new THREE.Vector3(...hs.point).applyQuaternion(desiredQ));
        best = {
          aId: held.id,
          aSocketId: hs.id,
          bId: target.id,
          bSocketId: ts.id,
          position: desiredPosition,
          quaternion: desiredQ,
          anchor,
        };
        bestDistance = distance;
      }
    }
  }
  return best;
}

function SnapGhost({ stateRef }: { stateRef: React.MutableRefObject<GhostState> }) {
  const groupRef = useRef<THREE.Group>(null);
  const boxRef = useRef<THREE.Mesh>(null);
  const cylinderRef = useRef<THREE.Mesh>(null);
  const markerRef = useRef<THREE.Mesh>(null);
  useFrame(() => {
    const group = groupRef.current;
    const box = boxRef.current;
    const cylinder = cylinderRef.current;
    const marker = markerRef.current;
    if (!group || !box || !cylinder || !marker) return;
    const state = stateRef.current;
    group.visible = state.visible;
    marker.visible = state.visible;
    if (!state.visible || !state.def) return;
    group.position.copy(state.position);
    group.quaternion.copy(state.quaternion);
    marker.position.copy(state.anchor).sub(state.position).applyQuaternion(state.quaternion.clone().invert());
    box.visible = state.def.shape === "cuboid";
    cylinder.visible = state.def.shape === "cylinder";
    box.scale.set(...state.def.size);
    cylinder.scale.set(state.def.size[0] * 2, state.def.size[1], state.def.size[0] * 2);
    cylinder.rotation.set(0, 0, state.def.cylinderAlongX ? Math.PI / 2 : 0);
  });
  return (
    <group ref={groupRef} renderOrder={10}>
      <mesh ref={boxRef}>
        <boxGeometry args={[1, 1, 1]} />
        <meshBasicMaterial color="#38bdf8" transparent opacity={0.35} depthWrite={false} />
      </mesh>
      <mesh ref={cylinderRef}>
        <cylinderGeometry args={[0.5, 0.5, 1, 16]} />
        <meshBasicMaterial color="#38bdf8" transparent opacity={0.35} depthWrite={false} />
      </mesh>
      <mesh ref={markerRef}>
        <sphereGeometry args={[0.16, 12, 8]} />
        <meshBasicMaterial color="#67e8f9" transparent opacity={0.9} depthWrite={false} />
      </mesh>
    </group>
  );
}

function DockAnchor() {
  const api = useContext(YardApiContext);
  const bodyRef = useRef<RapierRigidBody>(null);
  const meshRef = useRef<THREE.Mesh>(null);
  const textures = useYardTextures();

  useEffect(() => {
    const object = meshRef.current?.parent;
    if (!api || !bodyRef.current || !object) return;
    api.registerPart({ id: GROUND_ANCHOR.id, def: GROUND_ANCHOR, body: bodyRef.current, object, fixed: true });
    return () => api.unregisterPart(GROUND_ANCHOR.id);
  }, [api]);

  const onCollisionEnter = (payload: CollisionEnterPayload) => api?.handleCollisionEnter(GROUND_ANCHOR.id, payload);

  return (
    <RigidBody
      ref={bodyRef}
      type="fixed"
      position={GROUND_ANCHOR.spawn}
      colliders="cuboid"
      userData={{ yardPartId: GROUND_ANCHOR.id }}
      onCollisionEnter={onCollisionEnter}
    >
      <mesh ref={meshRef} receiveShadow castShadow>
        <boxGeometry args={GROUND_ANCHOR.size} />
        <meshPhysicalMaterial
          color="#0e7490"
          metalness={0.8}
          roughness={0.35}
          clearcoat={0.3}
          clearcoatRoughness={0.2}
          emissive="#22d3ee"
          emissiveIntensity={0.25}
          {...textures.floor}
        />
      </mesh>
      <SocketMarker socket={GROUND_ANCHOR.sockets[0]} />
    </RigidBody>
  );
}

function DockHull({ onBackgroundPointer }: { onBackgroundPointer: React.MutableRefObject<() => void> }) {
  const textures = useYardTextures();
  const onBg = (event: { stopPropagation: () => void }) => {
    event.stopPropagation();
    onBackgroundPointer.current();
  };
  const halfW = YARD.width / 2;
  const halfD = YARD.depth / 2;
  const h = YARD.height;

  return (
    <group>
      {/* Heavy Steel Tread Dock Floor (IBL Eating MeshPhysicalMaterial) */}
      <RigidBody type="fixed" colliders="cuboid" restitution={0.42} restitutionCombineRule={RESTITUTION_MAX} friction={0.88}>
        <mesh position={[0, -0.25, 0]} receiveShadow onPointerDown={onBg}>
          <boxGeometry args={[YARD.width, 0.5, YARD.depth]} />
          <meshPhysicalMaterial
            color="#334155"
            metalness={0.85}
            roughness={0.42}
            clearcoat={0.2}
            clearcoatRoughness={0.35}
            reflectivity={0.9}
            {...textures.floor}
          />
        </mesh>
      </RigidBody>

      {/* Dock Walls & Ceiling with Dirty Concrete PBR */}
      <RigidBody type="fixed" colliders="cuboid" friction={0.7}>
        <mesh position={[0, h / 2, -halfD - 0.25]} receiveShadow onPointerDown={onBg}>
          <boxGeometry args={[YARD.width, h, 0.5]} />
          <meshStandardMaterial color="#1e293b" metalness={0.25} roughness={0.85} {...textures.wall} />
        </mesh>
      </RigidBody>
      <RigidBody type="fixed" colliders="cuboid" friction={0.7}>
        <mesh position={[-halfW - 0.25, h / 2, 0]} receiveShadow onPointerDown={onBg}>
          <boxGeometry args={[0.5, h, YARD.depth]} />
          <meshStandardMaterial color="#1e293b" metalness={0.25} roughness={0.85} {...textures.wall} />
        </mesh>
      </RigidBody>
      <RigidBody type="fixed" colliders="cuboid" friction={0.7}>
        <mesh position={[halfW + 0.25, h / 2, 0]} receiveShadow onPointerDown={onBg}>
          <boxGeometry args={[0.5, h, YARD.depth]} />
          <meshStandardMaterial color="#1e293b" metalness={0.25} roughness={0.85} {...textures.wall} />
        </mesh>
      </RigidBody>
      <RigidBody type="fixed" colliders="cuboid" friction={0.6}>
        <mesh position={[0, h + 0.2, 0]} receiveShadow onPointerDown={onBg}>
          <boxGeometry args={[YARD.width, 0.4, YARD.depth]} />
          <meshStandardMaterial color="#0f172a" metalness={0.3} roughness={0.9} {...textures.wall} />
        </mesh>
      </RigidBody>

      {/* Viewport Frame Opening */}
      <RigidBody type="fixed" colliders="cuboid">
        <mesh position={[0, h - 0.4, halfD]} onPointerDown={onBg}>
          <boxGeometry args={[YARD.width, 0.8, 0.35]} />
          <meshPhysicalMaterial color="#0369a1" emissive="#0284c7" emissiveIntensity={0.2} metalness={0.65} roughness={0.3} />
        </mesh>
      </RigidBody>
      <RigidBody type="fixed" colliders="cuboid">
        <mesh position={[-halfW + 0.3, h / 2, halfD]} onPointerDown={onBg}>
          <boxGeometry args={[0.6, h, 0.35]} />
          <meshPhysicalMaterial color="#0369a1" emissive="#0284c7" emissiveIntensity={0.2} metalness={0.65} roughness={0.3} />
        </mesh>
      </RigidBody>
      <RigidBody type="fixed" colliders="cuboid">
        <mesh position={[halfW - 0.3, h / 2, halfD]} onPointerDown={onBg}>
          <boxGeometry args={[0.6, h, 0.35]} />
          <meshPhysicalMaterial color="#0369a1" emissive="#0284c7" emissiveIntensity={0.2} metalness={0.65} roughness={0.3} />
        </mesh>
      </RigidBody>

      {/* Parts Rack Platform */}
      <RigidBody type="fixed" colliders="cuboid" friction={0.85}>
        <mesh position={[-17.2, 1.12, 0]} receiveShadow onPointerDown={onBg}>
          <boxGeometry args={[1.8, 0.14, 14]} />
          <meshPhysicalMaterial color="#1e293b" metalness={0.7} roughness={0.4} clearcoat={0.2} {...textures.floor} />
        </mesh>
      </RigidBody>

      {/* Holographic Tactical Floor Grid */}
      <Grid
        position={[0, 0.02, 0]}
        args={[YARD.width, YARD.depth]}
        cellSize={1}
        cellThickness={0.55}
        cellColor="#0284c7"
        sectionSize={5}
        sectionThickness={1.05}
        sectionColor="#38bdf8"
        fadeDistance={52}
        fadeStrength={1.1}
        infiniteGrid={false}
      />
    </group>
  );
}

function YardPart({ def, simulating }: { def: YardPartDef; simulating: boolean }) {
  const api = useContext(YardApiContext);
  const bodyRef = useRef<RapierRigidBody>(null);
  const meshRef = useRef<THREE.Mesh>(null);
  const { gl } = useThree();
  const textures = useYardTextures();
  const isCylinder = def.shape === "cylinder";
  const radius = def.size[0];
  const height = def.size[1];
  const cylRotation: [number, number, number] = def.cylinderAlongX ? [0, 0, Math.PI / 2] : [0, 0, 0];

  useEffect(() => {
    const object = meshRef.current?.parent;
    if (!api || !bodyRef.current || !object) return;
    const record: PartRecord = { id: def.id, def, body: bodyRef.current, object };
    api.registerPart(record);
    return () => api.unregisterPart(def.id);
  }, [api, def]);

  const onDown = (event: { stopPropagation: () => void; point: THREE.Vector3 }) => {
    event.stopPropagation();
    const object = meshRef.current?.parent;
    if (bodyRef.current && object && api) api.grab({ id: def.id, def, body: bodyRef.current, object }, event.point.y);
  };

  const onCollisionEnter = (payload: CollisionEnterPayload) => api?.handleCollisionEnter(def.id, payload);

  const materialProps = useMemo(() => {
    switch (def.material) {
      case "light-alloy":
        return {
          color: "#93c5fd",
          metalness: 0.9,
          roughness: 0.35,
          clearcoat: 0.25,
          clearcoatRoughness: 0.2,
          ...textures.scratchedSteel,
        };
      case "sheet-steel":
        return {
          color: "#f59e0b",
          metalness: 0.35,
          roughness: 0.45,
          clearcoat: 0.4,
          clearcoatRoughness: 0.3,
          ...textures.paintedMetal,
        };
      case "structural-steel":
        return {
          color: "#14b8a6",
          metalness: 0.65,
          roughness: 0.4,
          clearcoat: 0.2,
          ...textures.paintedMetal,
        };
      case "cast-iron":
        return {
          color: def.id === "drop-cube" ? "#f1f5f9" : "#e11d48",
          metalness: 0.92,
          roughness: 0.72,
          clearcoat: 0.1,
          ...textures.castIron,
        };
      case "pin-alloy":
        return {
          color: "#c084fc",
          metalness: 0.75,
          roughness: 0.3,
          clearcoat: 0.5,
          ...textures.rubber,
        };
      case "ceramic":
        return {
          color: "#ea580c",
          metalness: 0.45,
          roughness: 0.35,
          clearcoat: 0.6,
          emissive: "#ea580c",
          emissiveIntensity: 0.35,
          ...textures.scratchedSteel,
        };
      default:
        return {
          color: def.color,
          metalness: 0.5,
          roughness: 0.5,
        };
    }
  }, [def.color, def.id, def.material, textures]);

  const isNozzle = def.id === "nozzle" || def.catalogId === "nozzle";

  return (
    <RigidBody
      ref={bodyRef}
      type="dynamic"
      position={def.spawn}
      colliders={isCylinder ? false : "cuboid"}
      density={def.density}
      restitution={def.restitution}
      restitutionCombineRule={RESTITUTION_MAX}
      friction={0.62}
      linearDamping={0.12}
      angularDamping={0.18}
      ccd={def.id === "drop-cube"}
      userData={{ yardPartId: def.id }}
      onCollisionEnter={onCollisionEnter}
    >
      {isCylinder ? (
        <CylinderCollider
          args={[height / 2, radius]}
          rotation={cylRotation}
          density={def.density}
          restitution={def.restitution}
          restitutionCombineRule={RESTITUTION_MAX}
          friction={0.62}
        />
      ) : null}

      <mesh
        ref={meshRef}
        castShadow
        receiveShadow
        onPointerDown={onDown}
        onPointerOver={() => {
          if (!api?.isHolding()) gl.domElement.style.cursor = "grab";
        }}
        onPointerOut={() => {
          if (!api?.isHolding()) gl.domElement.style.cursor = "auto";
        }}
        rotation={cylRotation}
      >
        {isCylinder ? <cylinderGeometry args={[radius, radius, height, 20]} /> : <boxGeometry args={def.size} />}
        <meshPhysicalMaterial {...materialProps} />
      </mesh>

      {/* Thruster Jet Flame FX */}
      {isNozzle && <ThrusterFx active={simulating} nozzleBodyRef={bodyRef} />}

      {def.sockets.map((socket) => (
        <SocketMarker key={socket.id} socket={socket} />
      ))}
    </RigidBody>
  );
}

function SocketMarker({ socket }: { socket: YardSocket }) {
  return (
    <mesh position={socket.point}>
      <sphereGeometry args={[0.045, 8, 6]} />
      <meshBasicMaterial color="#38bdf8" transparent opacity={0.6} />
    </mesh>
  );
}

function ExteriorStars({ count = 900 }: { count?: number }) {
  const positions = useMemo(() => {
    const coords = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const r = 70 + Math.random() * 50;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      coords[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      coords[i * 3 + 1] = r * Math.cos(phi);
      coords[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);
    }
    return coords;
  }, [count]);

  return (
    <points>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" count={positions.length / 3} array={positions} itemSize={3} />
      </bufferGeometry>
      <pointsMaterial size={0.38} color="#e0f2fe" sizeAttenuation transparent opacity={0.82} depthWrite={false} />
    </points>
  );
}
