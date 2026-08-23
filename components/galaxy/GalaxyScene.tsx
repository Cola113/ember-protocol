"use client";

import React, { useRef, useState, useMemo, useEffect } from "react";
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

// Background Starfield + Ember Spur Floating Dust
function CosmicDust({ count = 1000 }) {
  const points = useMemo(() => {
    const coords = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const cyan = new THREE.Color("#38bdf8");
    const amber = new THREE.Color("#f59e0b");
    const white = new THREE.Color("#e0f2fe");
    const purple = new THREE.Color("#c084fc");

    for (let i = 0; i < count; i++) {
      coords[i * 3] = (Math.random() - 0.5) * 900;
      coords[i * 3 + 1] = (Math.random() - 0.5) * 600;
      coords[i * 3 + 2] = (Math.random() - 0.5) * 900;

      const rand = Math.random();
      const col = rand > 0.75 ? cyan : rand > 0.55 ? amber : rand > 0.45 ? purple : white;
      colors[i * 3] = col.r;
      colors[i * 3 + 1] = col.g;
      colors[i * 3 + 2] = col.b;
    }
    return { coords, colors };
  }, [count]);

  const pointsRef = useRef<THREE.Points>(null);

  useFrame((_, delta) => {
    if (pointsRef.current) {
      pointsRef.current.rotation.y += delta * 0.012;
      pointsRef.current.rotation.x += delta * 0.004;
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
        size={2.0}
        vertexColors
        transparent
        opacity={0.88}
        sizeAttenuation
      />
    </points>
  );
}

// Spur Curve: connects visible planets along the cosmic spine
function SpurCurve({ visiblePlanets }: { visiblePlanets: PlanetDef[] }) {
  const lineObj = useMemo(() => {
    if (visiblePlanets.length < 2) return null;

    const points = visiblePlanets.map(
      (p) => new THREE.Vector3(p.coordinates.x * 0.8, p.coordinates.y * 0.8, p.coordinates.z * 0.8)
    );

    const curve = new THREE.CatmullRomCurve3(points);
    const pts = curve.getPoints(120);
    const geom = new THREE.BufferGeometry().setFromPoints(pts);

    const mat = new THREE.LineDashedMaterial({
      color: 0x38bdf8,
      dashSize: 5,
      gapSize: 4,
      opacity: 0.45,
      transparent: true,
      linewidth: 1,
    });

    const line = new THREE.Line(geom, mat);
    line.computeLineDistances(); // pi item 2 fix
    return line;
  }, [visiblePlanets]);

  // Clean up WebGL resources when unmounting or changing (pi item 3 fix)
  useEffect(() => {
    return () => {
      if (lineObj) {
        lineObj.geometry.dispose();
        if (Array.isArray(lineObj.material)) {
          lineObj.material.forEach((m) => m.dispose());
        } else {
          lineObj.material.dispose();
        }
      }
    };
  }, [lineObj]);

  if (!lineObj) return null;
  return <primitive object={lineObj} />;
}

// Inference Lines between unlocked & visible planets only (pi item 4 fix)
function InferenceLines({ visiblePlanets }: { visiblePlanets: PlanetDef[] }) {
  const visibleIds = useMemo(() => new Set(visiblePlanets.map((p) => p.id)), [visiblePlanets]);

  const canonicalPairs: [string, string][] = useMemo(
    () => [
      ["helix-7", "kiln"],
      ["kiln", "choir-well"],
      ["kiln", "glass-orchard"],
      ["choir-well", "ledger"],
      ["ledger", "marrow"],
      ["marrow", "blind-sun"],
      ["ledger", "black-interval"],
    ],
    []
  );

  const activeLines = useMemo(() => {
    const planetsMap = new Map(CANON.planets.map((p) => [p.id, p]));

    return canonicalPairs
      .filter(([id1, id2]) => visibleIds.has(id1) && visibleIds.has(id2))
      .map(([id1, id2]) => {
        const p1 = planetsMap.get(id1)!;
        const p2 = planetsMap.get(id2)!;

        const geom = new THREE.BufferGeometry().setFromPoints([
          new THREE.Vector3(p1.coordinates.x * 0.8, p1.coordinates.y * 0.8, p1.coordinates.z * 0.8),
          new THREE.Vector3(p2.coordinates.x * 0.8, p2.coordinates.y * 0.8, p2.coordinates.z * 0.8),
        ]);

        const mat = new THREE.LineBasicMaterial({
          color: 0xf59e0b,
          opacity: 0.65,
          transparent: true,
        });

        const line = new THREE.Line(geom, mat);
        return line;
      });
  }, [visibleIds, canonicalPairs]);

  // Proper disposal
  useEffect(() => {
    return () => {
      activeLines.forEach((line) => {
        line.geometry.dispose();
        if (Array.isArray(line.material)) {
          line.material.forEach((m) => m.dispose());
        } else {
          line.material.dispose();
        }
      });
    };
  }, [activeLines]);

  return (
    <group>
      {activeLines.map((line, idx) => (
        <primitive key={idx} object={line} />
      ))}
    </group>
  );
}

// Visual Node for a Planet with distinct materials and orbital animations
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
  const ringRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);

  const pos: [number, number, number] = [
    planet.coordinates.x * 0.8,
    planet.coordinates.y * 0.8,
    planet.coordinates.z * 0.8,
  ];

  useFrame((_, delta) => {
    if (meshRef.current) {
      meshRef.current.rotation.y += delta * 0.4;
    }
    if (ringRef.current) {
      ringRef.current.rotation.z += delta * 0.2;
    }
  });

  const radius = planet.category === "author" ? 5.5 : 7.5;

  // Custom visual nuances per planet
  const isMagma = planet.id === "kiln";
  const isCrystal = planet.id === "glass-orchard" || planet.id === "helix-7";

  return (
    <group position={pos}>
      {/* Interactive Orbit Ring */}
      <mesh ref={ringRef} rotation={[Math.PI / 2.2, 0, 0]}>
        <ringGeometry args={[radius * 1.6, radius * 1.68, 48]} />
        <meshBasicMaterial
          color={planet.color}
          opacity={hovered || isSelected ? 0.75 : 0.22}
          transparent
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Secondary Inner Dash Ring */}
      <mesh rotation={[Math.PI / 3, Math.PI / 4, 0]}>
        <ringGeometry args={[radius * 1.35, radius * 1.38, 32]} />
        <meshBasicMaterial
          color={isSelected ? "#f59e0b" : "#38bdf8"}
          opacity={isSelected ? 0.8 : hovered ? 0.4 : 0.1}
          transparent
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Main Planet Sphere */}
      <mesh
        ref={meshRef}
        scale={hovered || isSelected ? 1.3 : 1.0}
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
        <sphereGeometry args={[radius, 36, 36]} />
        <meshStandardMaterial
          color={planet.color}
          roughness={isCrystal ? 0.1 : isMagma ? 0.8 : 0.4}
          metalness={isCrystal ? 0.9 : isMagma ? 0.2 : 0.6}
          emissive={planet.color}
          emissiveIntensity={hovered || isSelected ? 0.85 : isMagma ? 0.55 : 0.35}
        />
      </mesh>

      {/* Atmospheric Halo Glow */}
      <mesh scale={1.45}>
        <sphereGeometry args={[radius, 24, 24]} />
        <meshBasicMaterial
          color={planet.color}
          transparent
          opacity={hovered || isSelected ? 0.35 : 0.12}
          side={THREE.BackSide}
        />
      </mesh>

      {/* 2D HTML Tag */}
      <Html distanceFactor={220} position={[0, radius + 6, 0]} center>
        <div
          onClick={(e) => {
            e.stopPropagation();
            onSelect(planet);
          }}
          className={`px-3 py-1.5 rounded border font-mono text-[11px] whitespace-nowrap cursor-pointer transition-all duration-200 select-none shadow-lg ${
            isSelected
              ? "bg-surface border-holo-amber text-holo-amber shadow-holo-amber scale-105"
              : hovered
              ? "bg-surface border-holo-cyan text-holo-cyan shadow-holo-cyan scale-105"
              : "bg-surface/85 border-holo-border text-holo-bright hover:border-holo-cyan/50"
          }`}
        >
          <div className="flex items-center gap-1.5">
            <span
              className="w-2 h-2 rounded-full animate-pulse"
              style={{ backgroundColor: planet.color }}
            />
            <span className="font-bold">{planet.name}</span>
          </div>
        </div>
      </Html>
    </group>
  );
}

// Camera Transition Rig
function CameraRig({ targetPlanet }: { targetPlanet: PlanetDef | null }) {
  const { camera } = useThree();

  useFrame((_, delta) => {
    if (targetPlanet) {
      const targetPos = new THREE.Vector3(
        targetPlanet.coordinates.x * 0.8 + 28,
        targetPlanet.coordinates.y * 0.8 + 16,
        targetPlanet.coordinates.z * 0.8 + 42
      );
      camera.position.lerp(targetPos, delta * 3.0);
    } else {
      const defaultPos = new THREE.Vector3(0, 60, 260);
      camera.position.lerp(defaultPos, delta * 2.0);
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
  // Only render planets that are mapped or explicitly unlocked
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
        camera={{ position: [0, 60, 260], fov: 50, near: 1, far: 2500 }}
        style={{ background: "#050811" }}
      >
        <ambientLight intensity={0.5} />
        <pointLight position={[120, 180, 120]} intensity={1.8} color="#e0f2fe" />
        <pointLight position={[-120, -60, -120]} intensity={1.0} color="#38bdf8" />
        <pointLight position={[0, -100, 100]} intensity={0.6} color="#f59e0b" />

        <CosmicDust />
        <SpurCurve visiblePlanets={visiblePlanets} />
        {showInferenceLines && <InferenceLines visiblePlanets={visiblePlanets} />}

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
          dampingFactor={0.06}
          maxDistance={700}
          minDistance={18}
        />
      </Canvas>
    </div>
  );
}
