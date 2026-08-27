"use client";

import React, { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { RapierRigidBody } from "@react-three/rapier";
import { yardSound } from "@/lib/yard/audio";

type ThrusterFxProps = {
  active: boolean;
  nozzleBodyRef: React.RefObject<RapierRigidBody>;
};

export default function ThrusterFx({ active, nozzleBodyRef }: ThrusterFxProps) {
  const flameMeshRef = useRef<THREE.Mesh>(null);
  const coreMeshRef = useRef<THREE.Mesh>(null);
  const lightRef = useRef<THREE.PointLight>(null);

  useFrame((_, dt) => {
    const flame = flameMeshRef.current;
    const core = coreMeshRef.current;
    const light = lightRef.current;
    const body = nozzleBodyRef.current;

    if (!active || !body) {
      if (flame) flame.visible = false;
      if (core) core.visible = false;
      if (light) light.intensity = 0;
      yardSound.setThruster(false, 0);
      return;
    }

    if (flame) flame.visible = true;
    if (core) core.visible = true;

    const vel = body.linvel();
    const speed = Math.hypot(vel.x, vel.y, vel.z);

    // Audio modulation
    yardSound.setThruster(true, speed);

    // Flame flicker
    const time = performance.now() / 1000;
    const noise = Math.sin(time * 38) * 0.15 + Math.cos(time * 62) * 0.1;
    const scaleY = 1.0 + Math.min(2.5, speed * 0.18) + noise;
    const scaleXZ = 0.85 + Math.sin(time * 24) * 0.1;

    if (flame) {
      flame.scale.set(scaleXZ, scaleY, scaleXZ);
    }
    if (core) {
      core.scale.set(scaleXZ * 0.6, scaleY * 0.8, scaleXZ * 0.6);
    }
    if (light) {
      light.intensity = 1.4 + Math.sin(time * 30) * 0.4 + Math.min(2.0, speed * 0.2);
    }
  });

  return (
    <group position={[0, -0.32, 0]} rotation={[Math.PI, 0, 0]}>
      {/* Outer Cyan / Amber Plasma Plume */}
      <mesh ref={flameMeshRef} visible={false}>
        <coneGeometry args={[0.18, 0.9, 12, 1, true]} />
        <meshBasicMaterial
          color="#38bdf8"
          transparent
          opacity={0.75}
          side={THREE.DoubleSide}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>

      {/* Inner White-Hot Core */}
      <mesh ref={coreMeshRef} visible={false}>
        <coneGeometry args={[0.09, 0.6, 10, 1, true]} />
        <meshBasicMaterial
          color="#ffffff"
          transparent
          opacity={0.92}
          side={THREE.DoubleSide}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>

      {/* Dynamic Thruster Light */}
      <pointLight
        ref={lightRef}
        color="#38bdf8"
        intensity={0}
        distance={7.5}
        decay={2}
      />
    </group>
  );
}
