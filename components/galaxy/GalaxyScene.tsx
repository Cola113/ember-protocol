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
function CosmicDust({ count = 1200 }) {
  const points = useMemo(() => {
    const coords = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const cyan = new THREE.Color("#38bdf8");
    const amber = new THREE.Color("#f59e0b");
    const white = new THREE.Color("#e0f2fe");
    const purple = new THREE.Color("#c084fc");
    const rose = new THREE.Color("#f43f5e");

    for (let i = 0; i < count; i++) {
      coords[i * 3] = (Math.random() - 0.5) * 950;
      coords[i * 3 + 1] = (Math.random() - 0.5) * 650;
      coords[i * 3 + 2] = (Math.random() - 0.5) * 950;

      const rand = Math.random();
      const col =
        rand > 0.8
          ? cyan
          : rand > 0.6
          ? amber
          : rand > 0.45
          ? purple
          : rand > 0.35
          ? rose
          : white;
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
    const pts = curve.getPoints(140);
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
    line.computeLineDistances();
    return line;
  }, [visiblePlanets]);

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

// Inference Lines between unlocked & visible planets only
function InferenceLines({ visiblePlanets }: { visiblePlanets: PlanetDef[] }) {
  const visibleIds = useMemo(() => new Set(visiblePlanets.map((p) => p.id)), [visiblePlanets]);

  const canonicalPairs: [string, string][] = useMemo(
    () => [
      ["helix-7", "kiln"],
      ["kiln", "choir-well"],
      ["kiln", "glass-orchard"],
      ["choir-well", "ledger"],
      ["ledger", "needle"],
      ["ledger", "marrow"],
      ["marrow", "cinder-court"],
      ["marrow", "blind-sun"],
      ["blind-sun", "black-interval"],
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

// Visual Node for a Planet with distinct materials, custom geometry, and tailored animations
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
  const secondaryRingRef = useRef<THREE.Mesh>(null);
  const wireframeCageRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);

  const pos: [number, number, number] = [
    planet.coordinates.x * 0.8,
    planet.coordinates.y * 0.8,
    planet.coordinates.z * 0.8,
  ];

  // Specific Planet Identities
  const isHelix = planet.id === "helix-7";
  const isKiln = planet.id === "kiln";
  const isOrchard = planet.id === "glass-orchard";
  const isChoir = planet.id === "choir-well";
  const isLedger = planet.id === "ledger";
  const isNeedle = planet.id === "needle";
  const isMarrow = planet.id === "marrow";
  const isCinder = planet.id === "cinder-court";
  const isBlindSun = planet.id === "blind-sun";
  const isBlackInterval = planet.id === "black-interval";

  const radius = isBlindSun ? 6.8 : isBlackInterval ? 6.2 : isKiln || isCinder ? 6.0 : 5.4;

  useFrame(({ clock }, delta) => {
    const t = clock.getElapsedTime();

    if (meshRef.current) {
      meshRef.current.rotation.y += delta * 0.4;
      if (isBlackInterval) {
        meshRef.current.rotation.x += delta * 0.25;
        meshRef.current.rotation.z += delta * 0.15;
      }

      // Marrow heartbeat pulse
      if (isMarrow) {
        const bioPulse = 1.0 + Math.sin(t * 3.6) * 0.07;
        const targetScale = (hovered || isSelected ? 1.3 : 1.0) * bioPulse;
        meshRef.current.scale.set(targetScale, targetScale, targetScale);
      }
    }

    if (ringRef.current) {
      ringRef.current.rotation.z += delta * (isChoir ? 0.4 : 0.2);
    }
    if (secondaryRingRef.current) {
      secondaryRingRef.current.rotation.z -= delta * 0.25;
      secondaryRingRef.current.rotation.x += delta * 0.1;
    }
    if (wireframeCageRef.current) {
      wireframeCageRef.current.rotation.y -= delta * 0.35;
      wireframeCageRef.current.rotation.x -= delta * 0.2;
    }
  });

  return (
    <group position={pos}>
      {/* 1. Primary Orbit Ring */}
      <mesh
        ref={ringRef}
        rotation={
          isNeedle
            ? [Math.PI / 1.4, Math.PI / 6, 0]
            : isBlackInterval
            ? [Math.PI / 4, Math.PI / 4, 0]
            : [Math.PI / 2.2, 0, 0]
        }
      >
        <ringGeometry
          args={[
            radius * 1.55,
            radius * (isLedger || isCinder ? 1.72 : 1.64),
            isLedger ? 16 : 48,
          ]}
        />
        <meshBasicMaterial
          color={isBlackInterval ? "#ffffff" : planet.color}
          opacity={hovered || isSelected ? 0.8 : isBlackInterval ? 0.5 : 0.25}
          transparent
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* 2. Secondary Custom Rings (Harmonic waves, Magma halo, or Gear ring) */}
      {(isChoir || isKiln || isOrchard || isLedger || isCinder || isNeedle) && (
        <mesh
          ref={secondaryRingRef}
          rotation={
            isNeedle
              ? [Math.PI / 3, 0, Math.PI / 2]
              : [Math.PI / 3, Math.PI / 4, 0]
          }
        >
          <ringGeometry args={[radius * 1.32, radius * 1.36, isLedger ? 12 : 36]} />
          <meshBasicMaterial
            color={
              isSelected
                ? "#f59e0b"
                : isChoir
                ? "#0284c7"
                : isKiln
                ? "#ea580c"
                : isOrchard
                ? "#6ee7b7"
                : isLedger
                ? "#eab308"
                : isCinder
                ? "#e879f9"
                : "#a5b4fc"
            }
            opacity={isSelected ? 0.85 : hovered ? 0.6 : 0.2}
            transparent
            side={THREE.DoubleSide}
          />
        </mesh>
      )}

      {/* 3. Black Interval Inverted Wireframe Cage */}
      {isBlackInterval && (
        <mesh ref={wireframeCageRef} scale={1.35}>
          <octahedronGeometry args={[radius, 1]} />
          <meshBasicMaterial color="#ffffff" wireframe transparent opacity={0.4} />
        </mesh>
      )}

      {/* 4. Main Planet Core Mesh */}
      <mesh
        ref={meshRef}
        scale={isMarrow ? 1.0 : hovered || isSelected ? 1.3 : 1.0}
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
        {isBlackInterval ? (
          <icosahedronGeometry args={[radius, 0]} />
        ) : isOrchard ? (
          <icosahedronGeometry args={[radius, 2]} />
        ) : (
          <sphereGeometry args={[radius, 36, 36]} />
        )}

        <meshStandardMaterial
          color={
            isBlindSun
              ? "#1e293b"
              : isBlackInterval
              ? "#f8fafc"
              : planet.color
          }
          roughness={
            isOrchard
              ? 0.05
              : isKiln
              ? 0.85
              : isBlindSun
              ? 0.95
              : isBlackInterval
              ? 0.1
              : 0.35
          }
          metalness={
            isOrchard
              ? 0.95
              : isNeedle || isLedger || isHelix
              ? 0.85
              : isKiln || isMarrow
              ? 0.2
              : isBlackInterval
              ? 0.9
              : 0.5
          }
          emissive={
            isBlindSun
              ? "#0f172a"
              : isBlackInterval
              ? "#ffffff"
              : planet.color
          }
          emissiveIntensity={
            hovered || isSelected
              ? 0.9
              : isKiln
              ? 0.6
              : isBlackInterval
              ? 0.8
              : isMarrow
              ? 0.5
              : 0.3
          }
        />
      </mesh>

      {/* 5. Atmospheric Halo / Eclipse Corona Rim */}
      <mesh scale={isBlindSun ? 1.6 : 1.45}>
        <sphereGeometry args={[radius, 24, 24]} />
        <meshBasicMaterial
          color={
            isBlindSun
              ? "#94a3b8"
              : isBlackInterval
              ? "#ffffff"
              : planet.color
          }
          transparent
          opacity={
            isBlindSun
              ? 0.45
              : hovered || isSelected
              ? 0.38
              : isBlackInterval
              ? 0.28
              : 0.12
          }
          side={THREE.BackSide}
        />
      </mesh>

      {/* 6. 2D HTML Name Tag */}
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
              : isBlackInterval
              ? "bg-surface border-white/60 text-white shadow-md hover:border-white"
              : "bg-surface/85 border-holo-border text-holo-bright hover:border-holo-cyan/50"
          }`}
        >
          <div className="flex items-center gap-1.5">
            <span
              className="w-2 h-2 rounded-full animate-pulse"
              style={{
                backgroundColor: isBlackInterval ? "#ffffff" : planet.color,
                boxShadow: `0 0 6px ${isBlackInterval ? "#ffffff" : planet.color}`,
              }}
            />
            <span className="font-bold">{planet.name}</span>
          </div>
        </div>
      </Html>
    </group>
  );
}

// Camera Transition Rig & Orbit Controller
function CameraController({
  targetPlanet,
  controlsRef,
}: {
  targetPlanet: PlanetDef | null;
  controlsRef: React.MutableRefObject<any>;
}) {
  const { camera } = useThree();
  const prevTargetRef = useRef<string | null>(null);
  const isTransitioningRef = useRef(false);

  const planetPos = useMemo(() => {
    if (!targetPlanet) return null;
    return new THREE.Vector3(
      targetPlanet.coordinates.x * 0.8,
      targetPlanet.coordinates.y * 0.8,
      targetPlanet.coordinates.z * 0.8
    );
  }, [targetPlanet]);

  useEffect(() => {
    const newId = targetPlanet?.id || null;
    if (newId !== prevTargetRef.current) {
      prevTargetRef.current = newId;
      isTransitioningRef.current = true;
    }
  }, [targetPlanet]);

  useFrame((_, delta) => {
    const controls = controlsRef.current;
    const speed = Math.min(delta * 3.5, 0.25);

    if (targetPlanet && planetPos) {
      // Planet focus mode: smoothly interpolate target & camera position
      const desiredCamPos = new THREE.Vector3(
        planetPos.x + 28,
        planetPos.y + 14,
        planetPos.z + 38
      );

      if (controls) {
        controls.target.lerp(planetPos, speed);
      }
      camera.position.lerp(desiredCamPos, speed);

      if (camera.position.distanceTo(desiredCamPos) < 0.6) {
        isTransitioningRef.current = false;
      }
    } else {
      // Reset back to galactic origin when deselected
      if (isTransitioningRef.current) {
        const defaultOrigin = new THREE.Vector3(0, 0, 0);
        const defaultCamPos = new THREE.Vector3(0, 60, 260);

        if (controls) {
          controls.target.lerp(defaultOrigin, speed * 0.85);
        }
        camera.position.lerp(defaultCamPos, speed * 0.85);

        if (camera.position.distanceTo(defaultCamPos) < 1.2) {
          isTransitioningRef.current = false;
        }
      }
    }

    if (controls) {
      controls.update();
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
  const controlsRef = useRef<any>(null);

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
        <ambientLight intensity={0.55} />
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

        <CameraController
          targetPlanet={selectedPlanet}
          controlsRef={controlsRef}
        />
        <OrbitControls
          ref={controlsRef}
          enableDamping
          dampingFactor={0.07}
          maxDistance={580}
          minDistance={22}
        />
      </Canvas>
    </div>
  );
}
