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
} from "@react-three/rapier";
import * as THREE from "three";
import {
  ALL_YARD_PARTS,
  YARD,
  type YardPartDef,
} from "@/lib/yard/catalog";

/** Rapier RigidBodyType: Dynamic = 0, KinematicPositionBased = 2 */
const BODY_DYNAMIC = 0;
const BODY_KINEMATIC_POS = 2;
const RESTITUTION_MAX = 3;

const HOLD_MIN_Y = 0.2;
const HOLD_MAX_Y = YARD.height - 0.8;
const HOLD_LIMIT_X = YARD.width / 2 - 0.8;
const HOLD_LIMIT_Z = YARD.depth / 2 - 0.8;

type Held = {
  id: string;
  label: string;
  body: RapierRigidBody;
  object: THREE.Object3D;
  holdY: number;
};

type GrabApi = {
  grab: (held: Omit<Held, "holdY">, hitY: number) => void;
  drop: () => void;
  isHolding: () => boolean;
};

const GrabApiContext = createContext<GrabApi | null>(null);

const _up = new THREE.Vector3(0, 1, 0);
const _hit = new THREE.Vector3();
const _plane = new THREE.Plane();
const _raycaster = new THREE.Raycaster();
const _zero = { x: 0, y: 0, z: 0 };

type YardSceneProps = {
  paused: boolean;
  fpsNodeRef: React.RefObject<HTMLSpanElement>;
  onHoldChange: (label: string | null) => void;
  onPhysicsReady: () => void;
};

export default function YardScene({
  paused,
  fpsNodeRef,
  onHoldChange,
  onPhysicsReady,
}: YardSceneProps) {
  const pausedRef = useRef(paused);
  pausedRef.current = paused;
  const onHoldChangeRef = useRef(onHoldChange);
  onHoldChangeRef.current = onHoldChange;
  const dropRef = useRef<() => void>(() => {});

  return (
    <Canvas
      shadows
      dpr={[1, 1.5]}
      gl={{
        antialias: true,
        powerPreference: "high-performance",
        alpha: false,
      }}
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
        <Physics
          gravity={[0, -9.81, 0]}
          timeStep={1 / 60}
          paused={paused}
          interpolate
          colliders="cuboid"
        >
          <GrabController
            pausedRef={pausedRef}
            onHoldChangeRef={onHoldChangeRef}
            dropRef={dropRef}
          >
            <DockHull onBackgroundPointer={dropRef} />
            {ALL_YARD_PARTS.map((part) => (
              <YardPart key={part.id} def={part} />
            ))}
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
  useEffect(() => {
    onReady();
  }, [onReady]);
  return null;
}

function FpsSampler({ nodeRef }: { nodeRef: React.RefObject<HTMLSpanElement> }) {
  const acc = useRef(0);
  const frames = useRef(0);
  useFrame((_, dt) => {
    acc.current += dt;
    frames.current += 1;
    if (acc.current < 1) return;
    const fps = Math.round(frames.current / acc.current);
    if (nodeRef.current) nodeRef.current.textContent = String(fps);
    acc.current = 0;
    frames.current = 0;
  });
  return null;
}

function GrabController({
  pausedRef,
  onHoldChangeRef,
  dropRef,
  children,
}: {
  pausedRef: React.MutableRefObject<boolean>;
  onHoldChangeRef: React.MutableRefObject<(label: string | null) => void>;
  dropRef: React.MutableRefObject<() => void>;
  children: React.ReactNode;
}) {
  const heldRef = useRef<Held | null>(null);
  const { camera, pointer, gl } = useThree();
  const controls = useThree((s) => s.controls) as { enabled?: boolean } | null;

  const drop = useCallback(() => {
    const held = heldRef.current;
    if (!held) return;
    held.body.setBodyType(BODY_DYNAMIC, true);
    held.body.lockRotations(false, true);
    held.body.setLinvel(_zero, true);
    held.body.setAngvel(_zero, true);
    held.body.wakeUp();
    heldRef.current = null;
    if (controls) controls.enabled = true;
    gl.domElement.style.cursor = "auto";
    onHoldChangeRef.current(null);
  }, [controls, gl, onHoldChangeRef]);

  const grab = useCallback(
    (next: Omit<Held, "holdY">, hitY: number) => {
      if (heldRef.current) {
        drop();
        return;
      }
      next.body.wakeUp();
      next.body.setBodyType(BODY_KINEMATIC_POS, true);
      next.body.lockRotations(true, true);
      next.body.setLinvel(_zero, true);
      next.body.setAngvel(_zero, true);
      heldRef.current = {
        ...next,
        holdY: THREE.MathUtils.clamp(hitY, HOLD_MIN_Y, HOLD_MAX_Y),
      };
      if (controls) controls.enabled = false;
      gl.domElement.style.cursor = "grabbing";
      onHoldChangeRef.current(next.label);
    },
    [controls, drop, gl, onHoldChangeRef]
  );

  useEffect(() => {
    dropRef.current = drop;
  }, [drop, dropRef]);

  useEffect(() => {
    const el = gl.domElement;
    const onWheel = (event: WheelEvent) => {
      const held = heldRef.current;
      if (!held) return;
      event.preventDefault();
      held.holdY = THREE.MathUtils.clamp(
        held.holdY - Math.sign(event.deltaY) * 0.28,
        HOLD_MIN_Y,
        HOLD_MAX_Y
      );
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
    const x = THREE.MathUtils.clamp(_hit.x, -HOLD_LIMIT_X, HOLD_LIMIT_X);
    const y = held.holdY;
    const z = THREE.MathUtils.clamp(_hit.z, -HOLD_LIMIT_Z, HOLD_LIMIT_Z);
    held.body.setTranslation({ x, y, z }, true);
    if (!pausedRef.current) {
      held.body.setNextKinematicTranslation({ x, y, z });
    }
    held.object.position.set(x, y, z);
  });

  const api = useMemo<GrabApi>(
    () => ({
      grab,
      drop,
      isHolding: () => heldRef.current !== null,
    }),
    [grab, drop]
  );

  return <GrabApiContext.Provider value={api}>{children}</GrabApiContext.Provider>;
}

function DockHull({
  onBackgroundPointer,
}: {
  onBackgroundPointer: React.MutableRefObject<() => void>;
}) {
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
      <RigidBody
        type="fixed"
        colliders="cuboid"
        restitution={0.42}
        restitutionCombineRule={RESTITUTION_MAX}
        friction={0.88}
      >
        <mesh
          position={[0, -0.25, 0]}
          receiveShadow
          onPointerDown={onBg}
        >
          <boxGeometry args={[YARD.width, 0.5, YARD.depth]} />
          <meshStandardMaterial color="#1a2740" {...wallMat} />
        </mesh>
      </RigidBody>

      <RigidBody type="fixed" colliders="cuboid" friction={0.7}>
        <mesh position={[0, h / 2, -halfD - 0.25]} receiveShadow onPointerDown={onBg}>
          <boxGeometry args={[YARD.width, h, 0.5]} />
          <meshStandardMaterial color="#152033" {...wallMat} />
        </mesh>
      </RigidBody>
      <RigidBody type="fixed" colliders="cuboid" friction={0.7}>
        <mesh position={[-halfW - 0.25, h / 2, 0]} receiveShadow onPointerDown={onBg}>
          <boxGeometry args={[0.5, h, YARD.depth]} />
          <meshStandardMaterial color="#121c30" {...wallMat} />
        </mesh>
      </RigidBody>
      <RigidBody type="fixed" colliders="cuboid" friction={0.7}>
        <mesh position={[halfW + 0.25, h / 2, 0]} receiveShadow onPointerDown={onBg}>
          <boxGeometry args={[0.5, h, YARD.depth]} />
          <meshStandardMaterial color="#121c30" {...wallMat} />
        </mesh>
      </RigidBody>
      <RigidBody type="fixed" colliders="cuboid" friction={0.6}>
        <mesh position={[0, h + 0.2, 0]} receiveShadow onPointerDown={onBg}>
          <boxGeometry args={[YARD.width, 0.4, YARD.depth]} />
          <meshStandardMaterial color="#0d1524" {...wallMat} />
        </mesh>
      </RigidBody>

      <RigidBody type="fixed" colliders="cuboid">
        <mesh position={[0, h - 0.4, halfD]} onPointerDown={onBg}>
          <boxGeometry args={[YARD.width, 0.8, 0.35]} />
          <meshStandardMaterial
            color="#1e3a5f"
            emissive="#38bdf8"
            emissiveIntensity={0.12}
            {...wallMat}
          />
        </mesh>
      </RigidBody>
      <RigidBody type="fixed" colliders="cuboid">
        <mesh position={[-halfW + 0.3, h / 2, halfD]} onPointerDown={onBg}>
          <boxGeometry args={[0.6, h, 0.35]} />
          <meshStandardMaterial color="#1e3a5f" {...wallMat} />
        </mesh>
      </RigidBody>
      <RigidBody type="fixed" colliders="cuboid">
        <mesh position={[halfW - 0.3, h / 2, halfD]} onPointerDown={onBg}>
          <boxGeometry args={[0.6, h, 0.35]} />
          <meshStandardMaterial color="#1e3a5f" {...wallMat} />
        </mesh>
      </RigidBody>

      <RigidBody type="fixed" colliders="cuboid" friction={0.85}>
        <mesh position={[-17.2, 1.12, 0]} receiveShadow onPointerDown={onBg}>
          <boxGeometry args={[1.8, 0.14, 14]} />
          <meshStandardMaterial color="#24344f" {...wallMat} />
        </mesh>
      </RigidBody>

      <Grid
        position={[0, 0.02, 0]}
        args={[YARD.width, YARD.depth]}
        cellSize={1}
        cellThickness={0.55}
        cellColor="#1e3a5f"
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

function YardPart({ def }: { def: YardPartDef }) {
  const api = useContext(GrabApiContext);
  const bodyRef = useRef<RapierRigidBody>(null);
  const { gl } = useThree();
  const isCylinder = def.shape === "cylinder";
  const radius = def.size[0];
  const height = def.size[1];
  const alongX = Boolean(def.cylinderAlongX);
  const cylRotation: [number, number, number] = alongX ? [0, 0, Math.PI / 2] : [0, 0, 0];

  const onDown = (event: {
    stopPropagation: () => void;
    object: THREE.Object3D;
    point: THREE.Vector3;
  }) => {
    event.stopPropagation();
    const body = bodyRef.current;
    if (!body || !api) return;
    const object = event.object.parent ?? event.object;
    api.grab({ id: def.id, label: def.label, body, object }, event.point.y);
  };

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
        castShadow
        receiveShadow
        rotation={cylRotation}
        onPointerDown={onDown}
        onPointerOver={() => {
          if (!api?.isHolding()) gl.domElement.style.cursor = "grab";
        }}
        onPointerOut={() => {
          if (!api?.isHolding()) gl.domElement.style.cursor = "auto";
        }}
      >
        {isCylinder ? (
          <cylinderGeometry args={[radius, radius, height, 16]} />
        ) : (
          <boxGeometry args={def.size} />
        )}
        <meshStandardMaterial
          color={def.color}
          metalness={0.38}
          roughness={0.46}
          emissive={def.color}
          emissiveIntensity={0.08}
        />
      </mesh>
    </RigidBody>
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
        <bufferAttribute
          attach="attributes-position"
          count={positions.length / 3}
          array={positions}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.38}
        color="#e0f2fe"
        sizeAttenuation
        transparent
        opacity={0.82}
        depthWrite={false}
      />
    </points>
  );
}
