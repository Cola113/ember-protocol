"use client";

import React, { useRef, useState, useMemo } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls, Html } from "@react-three/drei";
import * as THREE from "three";
import { CANON, PlanetDef } from "@/lib/canon";

interface GalaxySceneProps {
  onSelectPlanet: (planet: PlanetDef) => void;
  selectedPlanet: PlanetDef | null;
  showInferenceLines: boolean;
  unlockedPlanetIds: string[];
}

function Starfield({ count = 800 }) {
  const points = useMemo(() => {
    const coords = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const cyan = new THREE.Color("#38bdf8");
    const amber = new THREE.Color("#f59e0b");
    const white = new THREE.Color("#e0f2fe");

    for (let i = 0; i < count; i++) {
      coords[i * 3] = (Math.random() - 0.5) * 800;
      coords[i * 3 + 1] = (Math.random() - 0.5) * 500;
      coords[i * 3 + 2] = (Math.random() - 0.5) * 800;

      const rand = Math.random();
      const col = rand > 0.8 ? cyan : rand > 0.6 ? amber : white;
      colors[i * 3] = col.r;
      colors[i * 3 + 1] = col.g;
      colors[i * 3 + 2] = col.b;
    }
    return { coords, colors };
  }, [count]);

  const pointsRef = useRef<THREE.Points>(null);

  useFrame((_, delta) => {
    if (pointsRef.current) {
      pointsRef.current.rotation.y += delta * 0.015;
    }
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={points.coords.length / 3}
          array={points.coords}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-color"
          count={points.colors.length / 3}
          array={points.colors}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        size={1.8}
        vertexColors
        transparent
        opacity={0.85}
        sizeAttenuation
      />
    </points>
  );
}

function SpurCurve({ visiblePlanets }: { visiblePlanets: PlanetDef[] }) {
  const points = useMemo(() => {
    return visiblePlanets.map(
      (p) => new THREE.Vector3(p.coordinates.x * 0.8, p.coordinates.y * 0.8, p.coordinates.z * 0.8)
    );
  }, [visiblePlanets]);

  const curve = useMemo(() => {
    return new THREE.CatmullRomCurve3(points);
  }, [points]);

  const lineGeometry = useMemo(() => {
    const pts = curve.getPoints(100);
    return new THREE.BufferGeometry().setFromPoints(pts);
  }, [curve]);

  return (
    <primitive object={new THREE.Line(
      lineGeometry,
      new THREE.LineDashedMaterial({
        color: 0x38bdf8,
        dashSize: 4,
        gapSize: 4,
        opacity: 0.35,
        transparent: true,
      })
    )} />
  );
}

function InferenceLines() {
  const lines = useMemo(() => {
    const pairs: [number, number][] = [
      [0, 1], // Helix -> Kiln
      [1, 3], // Kiln -> Choir
      [1, 2], // Kiln -> Orchard
      [3, 4], // Choir -> Ledger
      [4, 6], // Ledger -> Marrow
      [6, 8]  // Marrow -> Blind Sun
    ];

    return pairs.map(([i1, i2]) => {
      const p1 = CANON.planets[i1].coordinates;
      const p2 = CANON.planets[i2].coordinates;
      const geom = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(p1.x * 0.8, p1.y * 0.8, p1.z * 0.8),
        new THREE.Vector3(p2.x * 0.8, p2.y * 0.8, p2.z * 0.8),
      ]);
      return geom;
    });
  }, []);

  return (
    <group>
      {lines.map((geom, idx) => (
        <primitive
          key={idx}
          object={
            new THREE.Line(
              geom,
              new THREE.LineBasicMaterial({
                color: 0xf59e0b,
                opacity: 0.5,
                transparent: true,
                linewidth: 2,
              })
            )
          }
        />
      ))}
    </group>
  );
}

function PlanetNode({
  planet,
  isSelected,
  onSelect,
}: {
  planet: PlanetDef;
  isSelected: boolean;
  onSelect: (p: PlanetDef) => void;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);

  const pos: [number, number, number] = [
    planet.coordinates.x * 0.8,
    planet.coordinates.y * 0.8,
    planet.coordinates.z * 0.8,
  ];

  useFrame((_, delta) => {
    if (meshRef.current) {
      meshRef.current.rotation.y += delta * 0.3;
    }
  });

  const radius = planet.category === "author" ? 5 : 7;

  return (
    <group position={pos}>
      {/* Orbit Ring */}
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <ringGeometry args={[radius * 1.5, radius * 1.55, 32]} />
        <meshBasicMaterial
          color={planet.color}
          opacity={hovered || isSelected ? 0.6 : 0.2}
          transparent
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Main Planet Mesh */}
      <mesh
        ref={meshRef}
        scale={hovered || isSelected ? 1.25 : 1.0}
        onClick={(e) => {
          e.stopPropagation();
          onSelect(planet);
        }}
        onPointerOver={(e) => {
          e.stopPropagation();
          setHovered(true);
        }}
        onPointerOut={() => setHovered(false)}
      >
        <sphereGeometry args={[radius, 32, 32]} />
        <meshStandardMaterial
          color={planet.color}
          roughness={0.4}
          metalness={0.6}
          emissive={planet.color}
          emissiveIntensity={hovered || isSelected ? 0.6 : 0.25}
        />
      </mesh>

      {/* Atmospheric Halo */}
      <mesh scale={1.35}>
        <sphereGeometry args={[radius, 16, 16]} />
        <meshBasicMaterial
          color={planet.color}
          transparent
          opacity={hovered || isSelected ? 0.25 : 0.08}
          side={THREE.BackSide}
        />
      </mesh>

      {/* 2D HTML Billboard Tag */}
      <Html distanceFactor={220} position={[0, radius + 5, 0]}>
        <div
          onClick={(e) => {
            e.stopPropagation();
            onSelect(planet);
          }}
          className={`px-2 py-1 rounded border font-mono text-[11px] whitespace-nowrap cursor-pointer transition-all duration-200 ${
            isSelected
              ? "bg-surface border-holo-amber text-holo-amber shadow-holo-amber"
              : hovered
              ? "bg-surface border-holo-cyan text-holo-cyan shadow-holo-cyan"
              : "bg-surface/80 border-holo-border text-holo-bright"
          }`}
        >
          {planet.name}
        </div>
      </Html>
    </group>
  );
}

function CameraRig({ targetPlanet }: { targetPlanet: PlanetDef | null }) {
  const { camera } = useThree();

  useFrame((_, delta) => {
    if (targetPlanet) {
      const targetPos = new THREE.Vector3(
        targetPlanet.coordinates.x * 0.8 + 25,
        targetPlanet.coordinates.y * 0.8 + 15,
        targetPlanet.coordinates.z * 0.8 + 40
      );
      camera.position.lerp(targetPos, delta * 2.5);
    }
  });

  return null;
}

export default function GalaxyScene({
  onSelectPlanet,
  selectedPlanet,
  showInferenceLines,
  unlockedPlanetIds,
}: GalaxySceneProps) {
  // Only render planets that are mapped or explicitly unlocked;
  // hidden planets (e.g. black-interval) are invisible until unlocked.
  const visiblePlanets = useMemo(
    () =>
      CANON.planets.filter(
        (p) =>
          p.initial_state === "mapped" || unlockedPlanetIds.includes(p.id)
      ),
    [unlockedPlanetIds]
  );

  return (
    <div className="w-full h-full relative cursor-grab active:cursor-grabbing">
      <Canvas
        camera={{ position: [0, 60, 260], fov: 50, near: 1, far: 2000 }}
        style={{ background: "#050811" }}
      >
        <ambientLight intensity={0.4} />
        <pointLight position={[100, 150, 100]} intensity={1.5} color="#e0f2fe" />
        <pointLight position={[-100, -50, -100]} intensity={0.8} color="#38bdf8" />

        <Starfield />
        <SpurCurve visiblePlanets={visiblePlanets} />
        {showInferenceLines && <InferenceLines />}

        {visiblePlanets.map((planet) => (
          <PlanetNode
            key={planet.id}
            planet={planet}
            isSelected={selectedPlanet?.id === planet.id}
            onSelect={onSelectPlanet}
          />
        ))}

        <CameraRig targetPlanet={selectedPlanet} />
        <OrbitControls
          enableDamping
          dampingFactor={0.05}
          maxDistance={600}
          minDistance={20}
        />
      </Canvas>
    </div>
  );
}
