"use client";

import React from "react";
import { RigidBody } from "@react-three/rapier";
import { useYardTextures } from "@/components/yard/useYardTextures";
import { YARD } from "@/lib/yard/catalog";

/**
 * D5 dock-door trial ground: one ramp, one rock, one crashed ship
 * within 150m of the +Z viewport opening.
 */
export default function DockTrial({ pbr }: { pbr: boolean }) {
  const textures = useYardTextures();
  const wall = pbr ? textures.wall : {};
  const floor = pbr ? textures.floor : {};
  const iron = pbr ? textures.castIron : {};
  const halfD = YARD.depth / 2;

  return (
    <group>
      {/* 150m exterior apron beyond the open door */}
      <RigidBody type="fixed" colliders="cuboid" friction={0.92} restitution={0.08}>
        <mesh position={[0, -0.25, halfD + 75]} receiveShadow>
          <boxGeometry args={[48, 0.5, 150]} />
          <meshStandardMaterial color="#1e293b" metalness={0.35} roughness={0.82} {...floor} />
        </mesh>
      </RigidBody>

      {/* Folded dock-door ramp */}
      <RigidBody type="fixed" colliders="cuboid" friction={0.98} rotation={[-0.16, 0, 0]} position={[0, 0.55, halfD + 6.5]}>
        <mesh receiveShadow castShadow>
          <boxGeometry args={[11.5, 0.22, 14]} />
          <meshStandardMaterial color="#334155" metalness={0.72} roughness={0.38} {...floor} />
        </mesh>
      </RigidBody>
      <RigidBody type="fixed" colliders="cuboid" position={[0, 0.18, halfD + 0.4]}>
        <mesh receiveShadow>
          <boxGeometry args={[12, 0.16, 1.2]} />
          <meshStandardMaterial color="#0369a1" metalness={0.55} roughness={0.4} emissive="#0284c7" emissiveIntensity={0.15} />
        </mesh>
      </RigidBody>

      {/* Rock ~42m out */}
      <RigidBody type="fixed" colliders="cuboid" friction={0.95} position={[7.4, 0.55, 42]} rotation={[0.12, 0.4, -0.08]}>
        <mesh castShadow receiveShadow>
          <boxGeometry args={[3.2, 1.4, 2.4]} />
          <meshStandardMaterial color="#64748b" metalness={0.12} roughness={0.92} {...wall} />
        </mesh>
      </RigidBody>
      <RigidBody type="fixed" colliders="cuboid" friction={0.95} position={[8.6, 1.35, 41.2]} rotation={[-0.2, 0.15, 0.1]}>
        <mesh castShadow>
          <boxGeometry args={[1.6, 1.5, 1.3]} />
          <meshStandardMaterial color="#475569" metalness={0.1} roughness={0.95} {...wall} />
        </mesh>
      </RigidBody>
      <RigidBody type="fixed" colliders="cuboid" friction={0.95} position={[6.2, 1.1, 43.1]} rotation={[0.3, -0.2, 0]}>
        <mesh castShadow>
          <boxGeometry args={[1.4, 1.1, 1.8]} />
          <meshStandardMaterial color="#334155" metalness={0.14} roughness={0.9} {...wall} />
        </mesh>
      </RigidBody>

      {/* Crashed ship hull ~68m out. Salvage thruster sits on the deck. */}
      <RigidBody type="fixed" colliders="cuboid" friction={0.8} position={[-3.2, 0.55, 68]} rotation={[0.08, 0.35, -0.18]}>
        <mesh castShadow receiveShadow>
          <boxGeometry args={[3.6, 0.7, 9.5]} />
          <meshStandardMaterial color="#1e3a5f" metalness={0.7} roughness={0.45} {...iron} />
        </mesh>
      </RigidBody>
      <RigidBody type="fixed" colliders="cuboid" friction={0.8} position={[-1.4, 1.35, 65.5]} rotation={[0.4, 0.5, 0.2]}>
        <mesh castShadow>
          <boxGeometry args={[1.2, 0.35, 4.2]} />
          <meshStandardMaterial color="#0f172a" metalness={0.65} roughness={0.5} />
        </mesh>
      </RigidBody>
      <RigidBody type="fixed" colliders="cuboid" friction={0.8} position={[-5.4, 1.1, 70.4]} rotation={[-0.35, -0.2, 0.45]}>
        <mesh castShadow>
          <boxGeometry args={[0.9, 0.28, 3.4]} />
          <meshStandardMaterial color="#334155" metalness={0.6} roughness={0.48} />
        </mesh>
      </RigidBody>
      <RigidBody type="fixed" colliders="cuboid" position={[-3.1, 0.95, 63.6]} rotation={[0.2, 0.1, 0]}>
        <mesh castShadow>
          <boxGeometry args={[1.5, 0.9, 1.5]} />
          <meshStandardMaterial color="#7c2d12" metalness={0.4} roughness={0.6} emissive="#9a3412" emissiveIntensity={0.12} />
        </mesh>
      </RigidBody>
    </group>
  );
}
