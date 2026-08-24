"use client";

import React, { useRef, useState, useMemo, useEffect, Suspense } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls, Html, useTexture } from "@react-three/drei";
import * as THREE from "three";
import { motion, AnimatePresence } from "framer-motion";
import { CANON, PlanetDef, AnchorTruth, getDecodedPlanetIds } from "@/lib/canon";
import {
  Sparkles,
  Cpu,
  CheckCircle2,
  Lock,
  ChevronDown,
  ChevronUp,
  Activity,
  Zap,
} from "lucide-react";

interface GalaxySceneProps {
  onSelectPlanet: (planet: PlanetDef) => void;
  selectedPlanet: PlanetDef | null;
  showInferenceLines: boolean;
  unlockedPlanetIds: string[];
  believedTruthIds?: string[];
  onFocusPlanet?: (planetId: string) => void;
  shockwavePlanets?: string[];
  shockwaveTrigger?: number;
}

// Background Starfield + Floating Astral Dust
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

// Spur Curve: connects visible planets along the cosmic spine with dynamic rewritten carrier flow
function SpurCurve({
  visiblePlanets,
  decodedCount,
}: {
  visiblePlanets: PlanetDef[];
  decodedCount: number;
}) {
  const lineRef = useRef<THREE.Line>(null);
  const matRef = useRef<THREE.LineDashedMaterial | null>(null);

  const lineObj = useMemo(() => {
    if (visiblePlanets.length < 2) return null;

    const points = visiblePlanets.map(
      (p) =>
        new THREE.Vector3(
          p.coordinates.x * 0.8,
          p.coordinates.y * 0.8,
          p.coordinates.z * 0.8
        )
    );

    const curve = new THREE.CatmullRomCurve3(points);
    const pts = curve.getPoints(160);
    const geom = new THREE.BufferGeometry().setFromPoints(pts);

    // Higher truth count energizes the spur line into a brilliant cyan spine
    const isHighEnergy = decodedCount > 0;
    const mat = new THREE.LineDashedMaterial({
      color: isHighEnergy ? 0x38bdf8 : 0x0284c7,
      dashSize: isHighEnergy ? 6 : 4,
      gapSize: isHighEnergy ? 3 : 4,
      opacity: isHighEnergy ? 0.75 : 0.45,
      transparent: true,
      linewidth: 1,
    });
    matRef.current = mat;

    const line = new THREE.Line(geom, mat);
    line.computeLineDistances();
    return line;
  }, [visiblePlanets, decodedCount]);

  useFrame((_, delta) => {
    // Pulse and animate dashed spine to represent carrier bus clock cycles
    if (matRef.current) {
      if (decodedCount > 0) {
        matRef.current.opacity =
          0.65 + Math.sin(Date.now() * 0.003) * 0.15;
      }
    }
  });

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
  return <primitive ref={lineRef} object={lineObj} />;
}

// Inference Lines between unlocked & visible planets: rewritten to carrier cyan when both ends decoded
function InferenceLines({
  visiblePlanets,
  decodedPlanetIds,
}: {
  visiblePlanets: PlanetDef[];
  decodedPlanetIds: Set<string>;
}) {
  const visibleIds = useMemo(
    () => new Set(visiblePlanets.map((p) => p.id)),
    [visiblePlanets]
  );

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
        const isDecodedLink =
          decodedPlanetIds.has(id1) && decodedPlanetIds.has(id2);

        const geom = new THREE.BufferGeometry().setFromPoints([
          new THREE.Vector3(
            p1.coordinates.x * 0.8,
            p1.coordinates.y * 0.8,
            p1.coordinates.z * 0.8
          ),
          new THREE.Vector3(
            p2.coordinates.x * 0.8,
            p2.coordinates.y * 0.8,
            p2.coordinates.z * 0.8
          ),
        ]);

        const mat = new THREE.LineBasicMaterial({
          // Decoded inference lines shine cyan, provisional ones stay amber
          color: isDecodedLink ? 0x38bdf8 : 0xf59e0b,
          opacity: isDecodedLink ? 0.9 : 0.55,
          transparent: true,
        });

        const line = new THREE.Line(geom, mat);
        return { line, isDecodedLink };
      });
  }, [visibleIds, canonicalPairs, decodedPlanetIds]);

  useEffect(() => {
    return () => {
      activeLines.forEach(({ line }) => {
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
      {activeLines.map(({ line }, idx) => (
        <primitive key={idx} object={line} />
      ))}
    </group>
  );
}

// Textures Set
interface TexturesSet {
  gasGiant: THREE.Texture;
  lavaCrust: THREE.Texture;
  iceRock: THREE.Texture;
}

// Visual Node for a Planet with custom materials, textures, rewrite glow, and instant animation feedback
function PlanetNode({
  planet,
  isSelected,
  isDecoded,
  shouldShockwave,
  shockwaveTrigger,
  onSelect,
  textures,
}: {
  planet: PlanetDef;
  isSelected: boolean;
  isDecoded: boolean;
  shouldShockwave?: boolean;
  shockwaveTrigger?: number;
  onSelect: (p: PlanetDef) => void;
  textures?: TexturesSet;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  const materialRef = useRef<THREE.MeshStandardMaterial>(null);
  const ringRef = useRef<THREE.Mesh>(null);
  const secondaryRingRef = useRef<THREE.Mesh>(null);
  const wireframeCageRef = useRef<THREE.Mesh>(null);
  const haloRef = useRef<THREE.Mesh>(null);
  const shockwaveRef = useRef<THREE.Mesh>(null);

  const [hovered, setHovered] = useState(false);

  // Transition and pulse animation refs
  const decodedProgressRef = useRef(isDecoded ? 1.0 : 0.0);
  const wasDecodedRef = useRef(isDecoded);
  const shockwaveTimerRef = useRef(0);

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

  const radius = isBlindSun
    ? 6.8
    : isBlackInterval
    ? 6.2
    : isKiln || isCinder
    ? 6.0
    : 5.4;

  const textureMap = textures
    ? isKiln || isBlindSun
      ? textures.lavaCrust
      : isChoir || isCinder
      ? textures.gasGiant
      : isBlackInterval
      ? undefined
      : textures.iceRock
    : undefined;

  // Trigger rewrite shockwave on explicit gameplay trigger (e.g. on return from TruthUnlockOverlay)
  useEffect(() => {
    if (shouldShockwave && shockwaveTrigger) {
      shockwaveTimerRef.current = 1.3;
    }
  }, [shouldShockwave, shockwaveTrigger]);

  // Also trigger when transitioning to decoded locally
  useEffect(() => {
    if (isDecoded && !wasDecodedRef.current) {
      shockwaveTimerRef.current = 1.3;
    }
    wasDecodedRef.current = isDecoded;
  }, [isDecoded]);

  useFrame(({ clock }, delta) => {
    const t = clock.getElapsedTime();

    // Smooth damp towards decoded state (progress 0 -> 1)
    decodedProgressRef.current = THREE.MathUtils.damp(
      decodedProgressRef.current,
      isDecoded ? 1.0 : 0.0,
      3.2,
      delta
    );
    const decProg = decodedProgressRef.current;

    // 1. Mesh rotation & pulsing
    if (meshRef.current) {
      meshRef.current.rotation.y += delta * (0.35 + decProg * 0.2);
      if (isBlackInterval) {
        meshRef.current.rotation.x += delta * 0.25;
        meshRef.current.rotation.z += delta * 0.15;
      }

      // Heartbeat pulse for Marrow + Subtle carrier shimmer for decoded nodes
      if (isMarrow) {
        const bioPulse = 1.0 + Math.sin(t * 3.6) * 0.07;
        const targetScale = (hovered || isSelected ? 1.3 : 1.0) * bioPulse;
        meshRef.current.scale.set(targetScale, targetScale, targetScale);
      } else {
        const carrierBreath =
          decProg > 0.1 ? 1.0 + Math.sin(t * 2.8) * 0.025 * decProg : 1.0;
        const baseScale = (hovered || isSelected ? 1.25 : 1.0) * carrierBreath;
        meshRef.current.scale.set(baseScale, baseScale, baseScale);
      }
    }

    // 2. Material Emissive Lerp & Carrier Glow Shimmer
    // Adjusted lerp factor to 0.42 to preserve surface texture details while retaining clear Astral Cyan carrier wave
    if (materialRef.current) {
      const baseEmissive = isBlindSun
        ? new THREE.Color("#b45309")
        : isBlackInterval
        ? new THREE.Color("#ffffff")
        : isKiln
        ? new THREE.Color("#ea580c")
        : new THREE.Color(planet.color);

      const decodedEmissive = new THREE.Color("#38bdf8"); // Astral Cyan Carrier wave
      const mixedEmissive = baseEmissive.clone().lerp(decodedEmissive, decProg * 0.42);
      materialRef.current.emissive.copy(mixedEmissive);

      const defaultIntensity = isKiln
        ? 0.7
        : isBlindSun
        ? 0.4
        : isBlackInterval
        ? 0.8
        : isMarrow
        ? 0.45
        : 0.3;

      const decodedBonus = decProg * 0.35 + (decProg > 0.2 ? Math.sin(t * 3.0) * 0.08 : 0);
      const hoverBonus = hovered || isSelected ? 0.6 : 0;
      materialRef.current.emissiveIntensity =
        defaultIntensity + decodedBonus + hoverBonus;
    }

    // 3. Rings rotation & dynamic resonance
    if (ringRef.current) {
      ringRef.current.rotation.z +=
        delta * (isChoir ? 0.4 : 0.2 + decProg * 0.15);
    }
    if (secondaryRingRef.current) {
      secondaryRingRef.current.rotation.z -= delta * (0.25 + decProg * 0.1);
      secondaryRingRef.current.rotation.x += delta * 0.1;
    }
    if (wireframeCageRef.current) {
      wireframeCageRef.current.rotation.y -= delta * 0.35;
      wireframeCageRef.current.rotation.x -= delta * 0.2;
    }

    // 4. Halo expansion & intensity
    if (haloRef.current) {
      const targetHaloScale = isBlindSun
        ? 1.6
        : 1.45 + decProg * 0.25;
      haloRef.current.scale.set(targetHaloScale, targetHaloScale, targetHaloScale);
    }

    // 5. Star Chart Rewrite Shockwave Pulse Ring (Driven directly by useFrame without relying on React render cycles)
    if (shockwaveRef.current) {
      const isPlaying = shockwaveTimerRef.current > 0;
      shockwaveRef.current.visible = isPlaying;

      if (isPlaying) {
        shockwaveTimerRef.current = Math.max(0, shockwaveTimerRef.current - delta);
        const ratio = 1.0 - shockwaveTimerRef.current / 1.3; // 0 -> 1
        const waveScale = 1.2 + ratio * 2.8;
        shockwaveRef.current.scale.set(waveScale, waveScale, waveScale);
        const shockMat = shockwaveRef.current.material as THREE.MeshBasicMaterial;
        if (shockMat) {
          shockMat.opacity = (1.0 - ratio) * 0.85;
        }
      }
    }
  });

  return (
    <group position={pos}>
      {/* 0. Rewrite Shockwave Burst Ring (Visibility and scale driven directly in useFrame) */}
      <mesh
        ref={shockwaveRef}
        rotation={[Math.PI / 2, 0, 0]}
        scale={1.2}
        visible={false}
      >
        <ringGeometry args={[radius * 1.2, radius * 1.35, 48]} />
        <meshBasicMaterial
          color="#38bdf8"
          transparent
          opacity={0.85}
          side={THREE.DoubleSide}
        />
      </mesh>

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
          color={
            isDecoded
              ? "#38bdf8"
              : isBlackInterval
              ? "#ffffff"
              : planet.color
          }
          opacity={
            hovered || isSelected
              ? 0.88
              : isDecoded
              ? 0.65
              : isBlackInterval
              ? 0.5
              : 0.25
          }
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
          <ringGeometry
            args={[radius * 1.32, radius * 1.36, isLedger ? 12 : 36]}
          />
          <meshBasicMaterial
            color={
              isSelected
                ? "#f59e0b"
                : isDecoded
                ? "#38bdf8"
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
            opacity={isSelected ? 0.85 : isDecoded ? 0.65 : hovered ? 0.6 : 0.2}
            transparent
            side={THREE.DoubleSide}
          />
        </mesh>
      )}

      {/* 3. Black Interval Inverted Wireframe Cage */}
      {isBlackInterval && (
        <mesh ref={wireframeCageRef} scale={1.35}>
          <octahedronGeometry args={[radius, 1]} />
          <meshBasicMaterial
            color={isDecoded ? "#38bdf8" : "#ffffff"}
            wireframe
            transparent
            opacity={isDecoded ? 0.75 : 0.4}
          />
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
          ref={materialRef}
          map={textureMap}
          color={
            isBlindSun
              ? "#94a3b8"
              : isMarrow
              ? "#fda4af"
              : isKiln
              ? "#fdba74"
              : isChoir
              ? "#7dd3fc"
              : isCinder
              ? "#f472b6"
              : isBlackInterval
              ? "#f8fafc"
              : planet.color
          }
          roughness={
            isOrchard
              ? 0.05
              : isKiln
              ? 0.75
              : isBlindSun
              ? 0.92
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
              ? 0.25
              : isBlackInterval
              ? 0.9
              : 0.45
          }
          emissive={
            isBlindSun
              ? "#b45309"
              : isBlackInterval
              ? "#ffffff"
              : isKiln
              ? "#ea580c"
              : planet.color
          }
          emissiveIntensity={
            hovered || isSelected
              ? 1.0
              : isKiln
              ? 0.7
              : isBlindSun
              ? 0.4
              : isBlackInterval
              ? 0.8
              : isMarrow
              ? 0.45
              : 0.3
          }
          emissiveMap={isKiln && textures ? textures.lavaCrust : undefined}
        />
      </mesh>

      {/* 5. Atmospheric Halo / Eclipse Corona Rim (Radiates cyan when decoded) */}
      <mesh ref={haloRef} scale={isBlindSun ? 1.6 : 1.45}>
        <sphereGeometry args={[radius, 24, 24]} />
        <meshBasicMaterial
          color={
            isDecoded
              ? "#38bdf8"
              : isBlindSun
              ? "#94a3b8"
              : isBlackInterval
              ? "#ffffff"
              : planet.color
          }
          transparent
          opacity={
            isBlindSun
              ? 0.45
              : isDecoded
              ? 0.42
              : hovered || isSelected
              ? 0.38
              : isBlackInterval
              ? 0.28
              : 0.12
          }
          side={THREE.BackSide}
        />
      </mesh>

      {/* 6. 2D HTML Name Tag with Decoded State Badge */}
      <Html distanceFactor={220} position={[0, radius + 6.2, 0]} center>
        <div
          onClick={(e) => {
            e.stopPropagation();
            onSelect(planet);
          }}
          className={`px-3 py-1.5 rounded border font-mono text-[11px] whitespace-nowrap cursor-pointer transition-all duration-300 select-none shadow-lg ${
            isSelected
              ? "bg-surface border-holo-amber text-holo-amber shadow-holo-amber scale-105"
              : hovered
              ? "bg-surface border-holo-cyan text-holo-cyan shadow-holo-cyan scale-105"
              : isDecoded
              ? "bg-surface/90 border-holo-cyan/80 text-holo-cyan shadow-holo-cyan hover:border-holo-cyan hover:scale-105"
              : isBlackInterval
              ? "bg-surface border-white/60 text-white shadow-md hover:border-white"
              : "bg-surface/85 border-holo-border text-holo-bright hover:border-holo-amber/60"
          }`}
        >
          <div className="flex items-center gap-1.5">
            <span
              className="w-2 h-2 rounded-full animate-pulse"
              style={{
                backgroundColor: isDecoded
                  ? "#38bdf8"
                  : isBlackInterval
                  ? "#ffffff"
                  : planet.color,
                boxShadow: `0 0 8px ${
                  isDecoded
                    ? "#38bdf8"
                    : isBlackInterval
                    ? "#ffffff"
                    : planet.color
                }`,
              }}
            />
            <span className="font-bold">{planet.name}</span>

            {/* Decoded badge vs Unverified status */}
            {isDecoded ? (
              <span className="text-[10px] px-1 py-0.2 bg-holo-cyan/20 border border-holo-cyan/40 text-holo-cyan rounded-sm flex items-center gap-0.5 ml-1">
                <CheckCircle2 className="w-2.5 h-2.5" />
                <span className="hidden sm:inline">已破译</span>
              </span>
            ) : (
              <span className="text-[9px] text-holo-muted/80 ml-0.5">
                [待破译]
              </span>
            )}
          </div>

          {/* Expanded role tooltip on hover or decoded */}
          {isDecoded && (hovered || isSelected) && (
            <div className="text-[9px] text-holo-cyan/90 border-t border-holo-cyan/20 mt-1 pt-0.5 max-w-[160px] truncate">
              {planet.true_compute_role.split("(")[0].trim()}
            </div>
          )}
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
  const prevTargetIdRef = useRef<string | null>(null);
  const isTransitioningRef = useRef(false);

  const desiredTarget = useMemo(() => {
    if (!targetPlanet) return new THREE.Vector3(0, 0, 0);
    return new THREE.Vector3(
      targetPlanet.coordinates.x * 0.8,
      targetPlanet.coordinates.y * 0.8,
      targetPlanet.coordinates.z * 0.8
    );
  }, [targetPlanet]);

  const desiredCamPos = useMemo(() => {
    if (!targetPlanet) return new THREE.Vector3(0, 60, 260);
    return new THREE.Vector3(
      desiredTarget.x + 28,
      desiredTarget.y + 14,
      desiredTarget.z + 38
    );
  }, [targetPlanet, desiredTarget]);

  useEffect(() => {
    const newId = targetPlanet?.id || null;
    if (newId !== prevTargetIdRef.current) {
      prevTargetIdRef.current = newId;
      isTransitioningRef.current = true;
      if (controlsRef.current) {
        controlsRef.current.enabled = false;
      }
    }
  }, [targetPlanet, controlsRef]);

  useFrame((_, delta) => {
    const controls = controlsRef.current;
    if (!controls) return;

    if (isTransitioningRef.current) {
      const speed = Math.min(delta * 4.5, 0.28);
      controls.target.lerp(desiredTarget, speed);
      camera.position.lerp(desiredCamPos, speed);

      const targetDist = controls.target.distanceTo(desiredTarget);
      const camDist = camera.position.distanceTo(desiredCamPos);

      // Once arrived within proximity, snap to exact target, re-enable OrbitControls, and stop writing
      if (targetDist < 0.25 && camDist < 0.6) {
        controls.target.copy(desiredTarget);
        camera.position.copy(desiredCamPos);
        controls.enabled = true;
        isTransitioningRef.current = false;
      }
    }

    if (controls.enabled) {
      controls.update();
    }
  });

  return null;
}

// Textured Planets Group with Astral Noir Textures & Isolated Suspense
function TexturedPlanets({
  visiblePlanets,
  decodedPlanetIds,
  shockwavePlanetIds,
  shockwaveTrigger,
  selectedPlanet,
  onSelectPlanet,
}: {
  visiblePlanets: PlanetDef[];
  decodedPlanetIds: Set<string>;
  shockwavePlanetIds: Set<string>;
  shockwaveTrigger?: number;
  selectedPlanet: PlanetDef | null;
  onSelectPlanet: (planet: PlanetDef) => void;
}) {
  const [gasGiant, lavaCrust, iceRock] = useTexture([
    "/planet-gas-giant.webp",
    "/planet-lava-crust.webp",
    "/planet-ice-rock.webp",
  ]);

  // Configure color space & wrapping for smooth sphere sampling and accurate sRGB gamma
  useEffect(() => {
    [gasGiant, lavaCrust, iceRock].forEach((tex) => {
      if (tex) {
        tex.colorSpace = THREE.SRGBColorSpace;
        tex.wrapS = THREE.RepeatWrapping;
        tex.wrapT = THREE.ClampToEdgeWrapping;
        tex.needsUpdate = true;
      }
    });
  }, [gasGiant, lavaCrust, iceRock]);

  const textures = useMemo<TexturesSet>(
    () => ({
      gasGiant,
      lavaCrust,
      iceRock,
    }),
    [gasGiant, lavaCrust, iceRock]
  );

  return (
    <>
      {visiblePlanets.map((planet) => (
        <PlanetNode
          key={planet.id}
          planet={planet}
          isSelected={selectedPlanet?.id === planet.id}
          isDecoded={decodedPlanetIds.has(planet.id)}
          shouldShockwave={shockwavePlanetIds.has(planet.id)}
          shockwaveTrigger={shockwaveTrigger}
          onSelect={onSelectPlanet}
          textures={textures}
        />
      ))}
    </>
  );
}

// Truth Dashboard (Overlay HUD on Star Chart)
function TruthDashboardOverlay({
  believedTruthIds,
  decodedPlanetCount,
  totalPlanetsCount,
  onSelectTruthPlanet,
}: {
  believedTruthIds: string[];
  decodedPlanetCount: number;
  totalPlanetsCount: number;
  onSelectTruthPlanet?: (planetId: string) => void;
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const totalTruths = CANON.anchorTruths.length;
  const decodedTruthsCount = believedTruthIds.length;
  const progressPercent = Math.round((decodedTruthsCount / totalTruths) * 100);

  return (
    <div className="absolute top-16 sm:top-20 left-2.5 sm:left-6 z-30 pointer-events-auto max-w-[calc(100vw-20px)] sm:max-w-xs">
      <div className="holo-panel rounded-sm border border-holo-cyan/30 p-2.5 sm:p-3.5 shadow-2xl backdrop-blur-md">
        {/* Dashboard Header / Toggle */}
        <div
          onClick={() => setIsExpanded((prev) => !prev)}
          className="flex items-center justify-between cursor-pointer group select-none gap-2"
        >
          <div className="flex items-center gap-2 min-w-0">
            <div
              className={`w-2 h-2 rounded-full ${
                decodedTruthsCount > 0
                  ? "bg-holo-cyan shadow-holo-cyan animate-pulse"
                  : "bg-holo-amber animate-ping"
              }`}
            />
            <span className="font-display font-bold text-xs sm:text-sm text-holo-bright tracking-wider truncate">
              真相仪表盘
            </span>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-holo-cyan/15 text-holo-cyan font-bold border border-holo-cyan/30 shrink-0">
              {decodedTruthsCount}/{totalTruths} TRUTHS
            </span>
          </div>
          <button
            aria-label={isExpanded ? "收起真相仪表盘" : "展开真相仪表盘"}
            className="p-1 hover:text-holo-cyan text-holo-muted transition-colors rounded min-h-[44px] min-w-[44px] flex items-center justify-center shrink-0"
          >
            {isExpanded ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </button>
        </div>

        {/* Mini progress bar (always visible) */}
        <div className="mt-2 w-full bg-surface-dark h-1.5 rounded-full overflow-hidden border border-holo-border/50">
          <div
            className="h-full bg-gradient-to-r from-holo-cyan via-holo-bright to-holo-cyan transition-all duration-700 shadow-holo-cyan"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        {/* Nodes counter */}
        <div className="flex justify-between items-center text-[10px] font-mono text-holo-muted mt-1.5">
          <span>计算节点破译率</span>
          <span className="text-holo-cyan font-bold">
            {decodedPlanetCount} / {totalPlanetsCount} NODES ONLINE
          </span>
        </div>

        {/* Expanded Truth Grid */}
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="mt-3 pt-3 border-t border-holo-cyan/15 space-y-1.5 overflow-hidden"
            >
              <div className="text-[10px] font-mono text-holo-cyan/80 font-bold mb-1 flex items-center gap-1">
                <Sparkles className="w-3 h-3" />
                <span>恒星计算机拓扑解码状态</span>
              </div>

              {CANON.anchorTruths.map((truth) => {
                const isBelieved = believedTruthIds.includes(truth.id);

                return (
                  <div
                    key={truth.id}
                    onClick={() => {
                      // Guard: Only allow clicking and focusing for confirmed/believed truths
                      if (isBelieved && truth.primary_planet && onSelectTruthPlanet) {
                        onSelectTruthPlanet(truth.primary_planet);
                      }
                    }}
                    className={`p-1.5 rounded border text-[11px] font-mono flex items-center justify-between transition-all select-none ${
                      isBelieved
                        ? "bg-holo-cyan/15 border-holo-cyan/50 text-holo-cyan hover:bg-holo-cyan/25 cursor-pointer shadow-sm"
                        : "bg-surface-dark/60 border-holo-border/30 text-holo-muted/60 cursor-not-allowed opacity-70"
                    }`}
                    title={
                      isBelieved
                        ? `【${truth.title}】点击聚焦已破译主节点`
                        : "未破译真相（未接入总线，无法从星图聚焦）"
                    }
                  >
                    <div className="flex items-center gap-1.5 min-w-0">
                      {isBelieved ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-holo-cyan shrink-0" />
                      ) : (
                        <Lock className="w-3.5 h-3.5 text-holo-muted/50 shrink-0" />
                      )}
                      <span className="font-bold truncate">
                        {truth.id} {truth.title.split("/")[0].trim()}
                      </span>
                    </div>

                    <span
                      className={`text-[9px] px-1 py-0.5 rounded font-bold shrink-0 ${
                        isBelieved
                          ? "bg-holo-cyan/20 text-holo-bright"
                          : "bg-surface text-holo-muted/60"
                      }`}
                    >
                      {isBelieved ? "ONLINE" : "LOCKED"}
                    </span>
                  </div>
                );
              })}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

export default function GalaxyScene({
  onSelectPlanet,
  selectedPlanet,
  showInferenceLines,
  unlockedPlanetIds,
  believedTruthIds = [],
  onFocusPlanet,
  shockwavePlanets = [],
  shockwaveTrigger = 0,
}: GalaxySceneProps) {
  const controlsRef = useRef<any>(null);

  // Compute set of decoded planet IDs based on believed truths
  const decodedPlanetIds = useMemo(
    () => new Set(getDecodedPlanetIds(believedTruthIds)),
    [believedTruthIds]
  );

  // Set of planets that should receive a real-time shockwave ripple animation
  const shockwavePlanetIds = useMemo(
    () => new Set(shockwavePlanets),
    [shockwavePlanets]
  );

  // Only render planets that are mapped or explicitly unlocked
  const visiblePlanets = useMemo(
    () =>
      CANON.planets.filter(
        (p) =>
          p.initial_state === "mapped" || unlockedPlanetIds.includes(p.id)
      ),
    [unlockedPlanetIds]
  );

  const handleSelectTruthPlanet = (planetId: string) => {
    // Guard: Only allow focusing planets that are currently unlocked / visible in star chart
    const target = visiblePlanets.find((p) => p.id === planetId);
    if (target) {
      onSelectPlanet(target);
    }
  };

  return (
    <div className="w-full h-full relative cursor-grab active:cursor-grabbing overflow-hidden bg-[#050811]">
      {/* Astral Noir Deep Space Backdrop Layer */}
      <div
        className="absolute inset-0 bg-cover bg-center pointer-events-none transition-opacity duration-1000 z-0 select-none"
        style={{
          backgroundImage: "url('/galaxy-bg.webp')",
          opacity: 0.45,
          filter: "brightness(0.9) contrast(1.15)",
        }}
      />
      {/* Subtle cosmic depth vignette */}
      <div className="absolute inset-0 bg-gradient-to-t from-[#050811] via-transparent to-[#050811]/75 pointer-events-none z-0" />

      {/* Interactive Truth Dashboard HUD */}
      <TruthDashboardOverlay
        believedTruthIds={believedTruthIds}
        decodedPlanetCount={decodedPlanetIds.size}
        totalPlanetsCount={CANON.planets.length}
        onSelectTruthPlanet={handleSelectTruthPlanet}
      />

      <Canvas
        camera={{ position: [0, 60, 260], fov: 50, near: 1, far: 2500 }}
        style={{ background: "transparent" }}
        className="relative z-10"
      >
        <ambientLight intensity={0.65} />
        <pointLight
          position={[120, 180, 120]}
          intensity={2.0}
          color="#e0f2fe"
        />
        <pointLight
          position={[-120, -60, -120]}
          intensity={1.2}
          color="#38bdf8"
        />
        <pointLight
          position={[0, -100, 100]}
          intensity={0.7}
          color="#f59e0b"
        />

        {/* Stable Non-Suspended Core 3D Elements */}
        <CosmicDust />
        <SpurCurve
          visiblePlanets={visiblePlanets}
          decodedCount={believedTruthIds.length}
        />
        {showInferenceLines && (
          <InferenceLines
            visiblePlanets={visiblePlanets}
            decodedPlanetIds={decodedPlanetIds}
          />
        )}

        {/* Isolated Texture Loading Suspense Boundary */}
        <Suspense
          fallback={
            <>
              {visiblePlanets.map((planet) => (
                <PlanetNode
                  key={planet.id}
                  planet={planet}
                  isSelected={selectedPlanet?.id === planet.id}
                  isDecoded={decodedPlanetIds.has(planet.id)}
                  shouldShockwave={shockwavePlanetIds.has(planet.id)}
                  shockwaveTrigger={shockwaveTrigger}
                  onSelect={onSelectPlanet}
                />
              ))}
            </>
          }
        >
          <TexturedPlanets
            visiblePlanets={visiblePlanets}
            decodedPlanetIds={decodedPlanetIds}
            shockwavePlanetIds={shockwavePlanetIds}
            shockwaveTrigger={shockwaveTrigger}
            selectedPlanet={selectedPlanet}
            onSelectPlanet={onSelectPlanet}
          />
        </Suspense>

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

