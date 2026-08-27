"use client";

import React, { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { YardPartDef, YardSocket } from "@/lib/yard/catalog";
import {
  decayHeat,
  seamEmissiveIntensity,
  seamHeatColor,
  type SeamState,
} from "@/lib/yard/fracture";

const ORB_MAX = 48;
const SPARK_PER_BURST = 18;
const SPARK_MAX = 72;
const SPARK_LIFE = 0.55;
const _color = { r: 1, g: 0.9, b: 0.3 };
const _a = new THREE.Vector3();
const _b = new THREE.Vector3();
const _mid = new THREE.Vector3();
const _quat = new THREE.Quaternion();

export type SparkBurst = {
  origin: THREE.Vector3;
  born: number;
  seed: number;
};

export type FxPart = {
  id: string;
  def: YardPartDef;
  body: { translation: () => { x: number; y: number; z: number }; rotation: () => { x: number; y: number; z: number; w: number } };
};

type WeldFxProps<TPart extends FxPart, TSeam extends SeamState> = {
  partsRef: React.MutableRefObject<Map<string, TPart>>;
  seamsRef: React.MutableRefObject<TSeam[]>;
  sparksRef: React.MutableRefObject<SparkBurst[]>;
};

export default function WeldFx<TPart extends FxPart, TSeam extends SeamState>({
  partsRef,
  seamsRef,
  sparksRef,
}: WeldFxProps<TPart, TSeam>) {
  const orbRefs = useRef<Array<THREE.Mesh | null>>(Array.from({ length: ORB_MAX }, () => null));
  const sparkRef = useRef<THREE.Points>(null);
  const positions = useMemo(() => new Float32Array(SPARK_MAX * 3), []);
  const velocities = useMemo(() => new Float32Array(SPARK_MAX * 3), []);
  const bornAt = useMemo(() => {
    const values = new Float32Array(SPARK_MAX);
    values.fill(-10);
    return values;
  }, []);
  const cursor = useRef(0);

  useFrame((_, dt) => {
    const clamped = Math.min(dt, 0.05);
    decayHeat(seamsRef.current, clamped);
    const parts = partsRef.current;
    const seams = seamsRef.current;
    for (let i = 0; i < ORB_MAX; i++) {
      const mesh = orbRefs.current[i];
      if (!mesh) continue;
      const seam = seams[i];
      if (!seam) {
        mesh.visible = false;
        continue;
      }
      const point = seamWorldPoint(seam, parts);
      if (!point) {
        mesh.visible = false;
        continue;
      }
      mesh.visible = true;
      mesh.position.copy(point);
      const visual = Math.max(seam.damage, seam.heat);
      seamHeatColor(visual, _color);
      const material = mesh.material as THREE.MeshStandardMaterial;
      material.color.setRGB(_color.r, _color.g, _color.b);
      material.emissive.setRGB(_color.r, _color.g, _color.b);
      material.emissiveIntensity = seamEmissiveIntensity(visual);
      const scale = 0.11 + visual * 0.08;
      mesh.scale.setScalar(scale);
    }

    const now = performance.now() / 1000;
    const bursts = sparksRef.current;
    if (bursts.length) {
      for (const burst of bursts) {
        spawnBurst(burst, positions, velocities, bornAt, cursor, now);
      }
      sparksRef.current = [];
    }
    const points = sparkRef.current;
    if (!points) return;
    const attr = points.geometry.getAttribute("position") as THREE.BufferAttribute;
    let alive = 0;
    for (let i = 0; i < SPARK_MAX; i++) {
      const age = now - bornAt[i];
      if (age < 0 || age > SPARK_LIFE) {
        positions[i * 3 + 1] = -40;
        continue;
      }
      alive += 1;
      velocities[i * 3 + 1] -= 9.81 * clamped;
      positions[i * 3] += velocities[i * 3] * clamped;
      positions[i * 3 + 1] += velocities[i * 3 + 1] * clamped;
      positions[i * 3 + 2] += velocities[i * 3 + 2] * clamped;
    }
    attr.needsUpdate = true;
    const material = points.material as THREE.PointsMaterial;
    material.opacity = alive ? 0.95 : 0;
  });

  return (
    <group>
      {Array.from({ length: ORB_MAX }, (_, index) => (
        <mesh
          key={index}
          ref={(node) => {
            orbRefs.current[index] = node;
          }}
          visible={false}
          renderOrder={12}
        >
          <sphereGeometry args={[1, 12, 8]} />
          <meshStandardMaterial color="#67e8f9" emissive="#67e8f9" emissiveIntensity={0.22} metalness={0.2} roughness={0.35} toneMapped={false} />
        </mesh>
      ))}
      <points ref={sparkRef} frustumCulled={false} renderOrder={13}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" count={SPARK_MAX} array={positions} itemSize={3} />
        </bufferGeometry>
        <pointsMaterial color="#ffd7a0" size={0.09} transparent opacity={0} depthWrite={false} sizeAttenuation />
      </points>
    </group>
  );
}

export function seamWorldPoint<T extends FxPart>(seam: SeamState, parts: Map<string, T>): THREE.Vector3 | null {
  if (!writeSocketWorld(parts.get(seam.aId), seam.aSocketId, _a)) return null;
  if (!writeSocketWorld(parts.get(seam.bId), seam.bSocketId, _b)) return null;
  return _mid.addVectors(_a, _b).multiplyScalar(0.5);
}

function writeSocketWorld(part: FxPart | undefined, socketId: string, target: THREE.Vector3): boolean {
  if (!part) return false;
  const socket = part.def.sockets.find((item: YardSocket) => item.id === socketId);
  if (!socket) return false;
  const p = part.body.translation();
  const r = part.body.rotation();
  _quat.set(r.x, r.y, r.z, r.w);
  target.set(...socket.point).applyQuaternion(_quat);
  target.x += p.x;
  target.y += p.y;
  target.z += p.z;
  return true;
}

function spawnBurst(
  burst: SparkBurst,
  positions: Float32Array,
  velocities: Float32Array,
  bornAt: Float32Array,
  cursor: React.MutableRefObject<number>,
  now: number
) {
  for (let i = 0; i < SPARK_PER_BURST; i++) {
    const slot = cursor.current % SPARK_MAX;
    cursor.current += 1;
    const rand = Math.sin(burst.seed * 12.9898 + i * 78.233) * 43758.5453;
    const n = rand - Math.floor(rand);
    const theta = n * Math.PI * 2;
    const phi = (0.2 + (n * 7) % 1) * Math.PI * 0.55;
    const speed = 2.2 + (n * 13) % 3.4;
    positions[slot * 3] = burst.origin.x;
    positions[slot * 3 + 1] = burst.origin.y;
    positions[slot * 3 + 2] = burst.origin.z;
    velocities[slot * 3] = Math.cos(theta) * Math.sin(phi) * speed;
    velocities[slot * 3 + 1] = Math.cos(phi) * speed + 1.4;
    velocities[slot * 3 + 2] = Math.sin(theta) * Math.sin(phi) * speed;
    bornAt[slot] = now;
  }
}
