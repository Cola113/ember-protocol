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
import { Grid, OrbitControls } from "@react-three/drei";
import {
  CylinderCollider,
  Physics,
  RigidBody,
  type RapierRigidBody,
  useRapier,
} from "@react-three/rapier";
import type { ImpulseJoint } from "@dimforge/rapier3d-compat";
import * as THREE from "three";
import {
  ALL_YARD_PARTS,
  YARD,
  type YardPartDef,
  type YardSocket,
} from "@/lib/yard/catalog";
import type { YardBlueprint, YardBlueprintJoint } from "@/lib/yard/blueprint";

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

const GROUND_ANCHOR_DEF: YardPartDef = {
  id: "ground-anchor",
  catalogId: "ground-anchor",
  label: "地锚",
  shape: "cuboid",
  size: [1.8, 0.2, 1.8],
  color: "#22d3ee",
  spawn: [0, 0.1, 0],
  density: 1,
  restitution: 0.1,
  sockets: [{ id: "top", point: [0, 0.1, 0], normal: [0, 1, 0] }],
};

export type YardImpulseEvent = { impulse: number; partId: string; otherId: string; jointId: string };

export type YardActions = {
  weld: () => void;
  undo: () => void;
  release: () => void;
  getBlueprint: () => YardBlueprint | null;
  loadBlueprint: (blueprint: YardBlueprint) => void;
};

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

type ContactForceData = {
  other: { rigidBody?: RapierRigidBody };
  totalForceMagnitude: number;
};

type YardApi = {
  grab: (part: PartRecord, hitY: number) => void;
  drop: () => void;
  isHolding: () => boolean;
  registerPart: (part: PartRecord) => void;
  unregisterPart: (id: string) => void;
  handleContactForce: (partId: string, payload: ContactForceData) => void;
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
      gl={{ antialias: true, powerPreference: "high-performance", alpha: false }}
      camera={{ position: [11, 8.5, 21], fov: 50, near: 0.1, far: 220 }}
      style={{ background: "#050811" }}
      onPointerMissed={() => dropRef.current()}
    >
      <color attach="background" args={["#050811"]} />
      <hemisphereLight args={["#94a3b8", "#0b1220", 0.42]} />
      <ambientLight intensity={0.22} />
      <directionalLight
        position={[14, 22, 12]}
        intensity={1.35}
        castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-camera-left={-24}
        shadow-camera-right={24}
        shadow-camera-top={20}
        shadow-camera-bottom={-20}
        shadow-camera-near={1}
        shadow-camera-far={70}
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
            {ALL_YARD_PARTS.map((part) => <YardPart key={part.id} def={part} />)}
          </GrabController>
          <ReadyBeacon onReady={onPhysicsReady} />
        </Physics>
      </Suspense>
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
  const jointsRef = useRef<Array<YardBlueprintJoint & { handle: ImpulseJoint }>>([]);
  const candidateRef = useRef<SnapCandidate | null>(null);
  const ghostRef = useRef<GhostState>({
    visible: false,
    def: null,
    position: new THREE.Vector3(),
    quaternion: new THREE.Quaternion(),
    anchor: new THREE.Vector3(),
  });
  const lastSnapKeyRef = useRef<string | null>(null);
  const lastImpactAtRef = useRef(0);
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
  }, [controls, drop, gl, onHoldChangeRef]);

  const registerPart = useCallback((part: PartRecord) => partsRef.current.set(part.id, part), []);
  const unregisterPart = useCallback((id: string) => partsRef.current.delete(id), []);

  const handleContactForce = useCallback((partId: string, payload: ContactForceData) => {
    if (pausedRef.current || partId !== "drop-cube" || payload.totalForceMagnitude < 20 || !payload.other.rigidBody) return;
    const other = payload.other.rigidBody;
    const otherId = Array.from(partsRef.current.values()).find((part) => part.body === other)?.id;
    if (!otherId) return;
    const seam = jointsRef.current.find((joint) => joint.aId === otherId || joint.bId === otherId);
    if (!seam) return;
    const now = performance.now();
    if (now - lastImpactAtRef.current < 180) return;
    lastImpactAtRef.current = now;
    onImpulseRef.current({
      impulse: payload.totalForceMagnitude / 60,
      partId,
      otherId,
      jointId: `${seam.aId}:${seam.aSocketId}--${seam.bId}:${seam.bSocketId}`,
    });
  }, [onImpulseRef, pausedRef]);

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
    return world.createImpulseJoint(data, a.body, b.body, true);
  }, [rapier, world]);

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
    const handle = createJoint(joint);
    if (!handle) return;
    setDynamic(held);
    heldRef.current = null;
    candidateRef.current = null;
    ghostRef.current.visible = false;
    lastSnapKeyRef.current = null;
    if (controls) controls.enabled = true;
    gl.domElement.style.cursor = "auto";
    onHoldChangeRef.current(null);
    onSnapChangeRef.current(null);
    jointsRef.current.push({ ...joint, handle });
    onJointCountRef.current(jointsRef.current.length);
    onBlueprintDirtyRef.current();
  }, [controls, createJoint, gl, onBlueprintDirtyRef, onHoldChangeRef, onJointCountRef, onSnapChangeRef, setDynamic]);

  const undo = useCallback(() => {
    if (!pausedRef.current) return;
    const last = jointsRef.current.pop();
    if (!last) return;
    world.removeImpulseJoint(last.handle, true);
    onJointCountRef.current(jointsRef.current.length);
    onBlueprintDirtyRef.current();
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
    joints: jointsRef.current.map(({ handle: _handle, ...joint }) => joint),
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
      const handle = createJoint(joint);
      if (handle) jointsRef.current.push({ ...joint, handle });
    });
    onJointCountRef.current(jointsRef.current.length);
    onBlueprintDirtyRef.current();
  }, [clearHeld, createJoint, onBlueprintDirtyRef, onJointCountRef, setDynamic, setPose, world]);

  useEffect(() => {
    dropRef.current = drop;
    actionsRef.current = { weld, undo, release, getBlueprint, loadBlueprint };
    return () => {
      dropRef.current = () => {};
      if (actionsRef.current?.getBlueprint === getBlueprint) actionsRef.current = null;
    };
  }, [actionsRef, drop, dropRef, getBlueprint, loadBlueprint, release, undo, weld]);

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
    handleContactForce,
  }), [drop, grab, handleContactForce, registerPart, unregisterPart]);

  return (
    <YardApiContext.Provider value={api}>
      {children}
      <SnapGhost stateRef={ghostRef} />
    </YardApiContext.Provider>
  );
}

function findSnapCandidate(
  held: Held,
  parts: Map<string, PartRecord>,
  joints: Array<YardBlueprintJoint & { handle: ImpulseJoint }>
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
        <meshBasicMaterial color="#fef08a" transparent opacity={0.26} depthWrite={false} />
      </mesh>
      <mesh ref={cylinderRef}>
        <cylinderGeometry args={[0.5, 0.5, 1, 16]} />
        <meshBasicMaterial color="#fef08a" transparent opacity={0.26} depthWrite={false} />
      </mesh>
      <mesh ref={markerRef}>
        <sphereGeometry args={[0.16, 12, 8]} />
        <meshBasicMaterial color="#fde047" transparent opacity={0.8} depthWrite={false} />
      </mesh>
    </group>
  );
}

function DockAnchor() {
  const api = useContext(YardApiContext);
  const bodyRef = useRef<RapierRigidBody>(null);
  const meshRef = useRef<THREE.Mesh>(null);
  useEffect(() => {
    const object = meshRef.current?.parent;
    if (!api || !bodyRef.current || !object) return;
    api.registerPart({ id: GROUND_ANCHOR_DEF.id, def: GROUND_ANCHOR_DEF, body: bodyRef.current, object, fixed: true });
    return () => api.unregisterPart(GROUND_ANCHOR_DEF.id);
  }, [api]);
  return (
    <RigidBody ref={bodyRef} type="fixed" position={GROUND_ANCHOR_DEF.spawn} colliders="cuboid">
      <mesh ref={meshRef} receiveShadow>
        <boxGeometry args={GROUND_ANCHOR_DEF.size} />
        <meshStandardMaterial color={GROUND_ANCHOR_DEF.color} emissive={GROUND_ANCHOR_DEF.color} emissiveIntensity={0.15} metalness={0.4} roughness={0.5} />
      </mesh>
      <SocketMarker socket={GROUND_ANCHOR_DEF.sockets[0]} />
    </RigidBody>
  );
}

function DockHull({ onBackgroundPointer }: { onBackgroundPointer: React.MutableRefObject<() => void> }) {
  const onBg = (event: { stopPropagation: () => void }) => {
    event.stopPropagation();
    onBackgroundPointer.current();
  };
  const wallMat = { metalness: 0.35, roughness: 0.72 };
  const halfW = YARD.width / 2;
  const halfD = YARD.depth / 2;
  const h = YARD.height;
  return (
    <group>
      <RigidBody type="fixed" colliders="cuboid" restitution={0.42} restitutionCombineRule={RESTITUTION_MAX} friction={0.88}>
        <mesh position={[0, -0.25, 0]} receiveShadow onPointerDown={onBg}><boxGeometry args={[YARD.width, 0.5, YARD.depth]} /><meshStandardMaterial color="#1a2740" {...wallMat} /></mesh>
      </RigidBody>
      <RigidBody type="fixed" colliders="cuboid" friction={0.7}><mesh position={[0, h / 2, -halfD - 0.25]} receiveShadow onPointerDown={onBg}><boxGeometry args={[YARD.width, h, 0.5]} /><meshStandardMaterial color="#152033" {...wallMat} /></mesh></RigidBody>
      <RigidBody type="fixed" colliders="cuboid" friction={0.7}><mesh position={[-halfW - 0.25, h / 2, 0]} receiveShadow onPointerDown={onBg}><boxGeometry args={[0.5, h, YARD.depth]} /><meshStandardMaterial color="#121c30" {...wallMat} /></mesh></RigidBody>
      <RigidBody type="fixed" colliders="cuboid" friction={0.7}><mesh position={[halfW + 0.25, h / 2, 0]} receiveShadow onPointerDown={onBg}><boxGeometry args={[0.5, h, YARD.depth]} /><meshStandardMaterial color="#121c30" {...wallMat} /></mesh></RigidBody>
      <RigidBody type="fixed" colliders="cuboid" friction={0.6}><mesh position={[0, h + 0.2, 0]} receiveShadow onPointerDown={onBg}><boxGeometry args={[YARD.width, 0.4, YARD.depth]} /><meshStandardMaterial color="#0d1524" {...wallMat} /></mesh></RigidBody>
      <RigidBody type="fixed" colliders="cuboid"><mesh position={[0, h - 0.4, halfD]} onPointerDown={onBg}><boxGeometry args={[YARD.width, 0.8, 0.35]} /><meshStandardMaterial color="#1e3a5f" emissive="#38bdf8" emissiveIntensity={0.12} {...wallMat} /></mesh></RigidBody>
      <RigidBody type="fixed" colliders="cuboid"><mesh position={[-halfW + 0.3, h / 2, halfD]} onPointerDown={onBg}><boxGeometry args={[0.6, h, 0.35]} /><meshStandardMaterial color="#1e3a5f" {...wallMat} /></mesh></RigidBody>
      <RigidBody type="fixed" colliders="cuboid"><mesh position={[halfW - 0.3, h / 2, halfD]} onPointerDown={onBg}><boxGeometry args={[0.6, h, 0.35]} /><meshStandardMaterial color="#1e3a5f" {...wallMat} /></mesh></RigidBody>
      <RigidBody type="fixed" colliders="cuboid" friction={0.85}><mesh position={[-17.2, 1.12, 0]} receiveShadow onPointerDown={onBg}><boxGeometry args={[1.8, 0.14, 14]} /><meshStandardMaterial color="#24344f" {...wallMat} /></mesh></RigidBody>
      <Grid position={[0, 0.02, 0]} args={[YARD.width, YARD.depth]} cellSize={1} cellThickness={0.55} cellColor="#1e3a5f" sectionSize={5} sectionThickness={1.05} sectionColor="#38bdf8" fadeDistance={52} fadeStrength={1.1} infiniteGrid={false} />
    </group>
  );
}

function YardPart({ def }: { def: YardPartDef }) {
  const api = useContext(YardApiContext);
  const bodyRef = useRef<RapierRigidBody>(null);
  const meshRef = useRef<THREE.Mesh>(null);
  const { gl } = useThree();
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
  const onContactForce = (payload: ContactForceData) => api?.handleContactForce(def.id, payload);
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
      onContactForce={onContactForce}
    >
      {isCylinder ? <CylinderCollider args={[height / 2, radius]} rotation={cylRotation} density={def.density} restitution={def.restitution} restitutionCombineRule={RESTITUTION_MAX} friction={0.62} /> : null}
      <mesh ref={meshRef} castShadow receiveShadow onPointerDown={onDown} onPointerOver={() => { if (!api?.isHolding()) gl.domElement.style.cursor = "grab"; }} onPointerOut={() => { if (!api?.isHolding()) gl.domElement.style.cursor = "auto"; }} rotation={cylRotation}>
        {isCylinder ? <cylinderGeometry args={[radius, radius, height, 16]} /> : <boxGeometry args={def.size} />}
        <meshStandardMaterial color={def.color} metalness={0.38} roughness={0.46} emissive={def.color} emissiveIntensity={0.08} />
      </mesh>
      {def.sockets.map((socket) => <SocketMarker key={socket.id} socket={socket} />)}
    </RigidBody>
  );
}

function SocketMarker({ socket }: { socket: YardSocket }) {
  return <mesh position={socket.point}><sphereGeometry args={[0.045, 8, 6]} /><meshBasicMaterial color="#fde047" transparent opacity={0.5} /></mesh>;
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
  return <points><bufferGeometry><bufferAttribute attach="attributes-position" count={positions.length / 3} array={positions} itemSize={3} /></bufferGeometry><pointsMaterial size={0.38} color="#e0f2fe" sizeAttenuation transparent opacity={0.82} depthWrite={false} /></points>;
}
