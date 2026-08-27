"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import YardHud, { type YardMode } from "@/components/yard/YardHud";
import BlueprintModal from "@/components/yard/BlueprintModal";
import {
  readYardBlueprint,
  writeYardBlueprint,
  type YardBlueprint,
} from "@/lib/yard/blueprint";
import { YARD_PRESETS } from "@/lib/yard/presets";
import { yardSound } from "@/lib/yard/audio";
import type { YardActions, YardImpulseEvent } from "@/components/yard/YardScene";

const YardScene = dynamic(() => import("@/components/yard/YardScene"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center bg-void text-holo-cyan font-mono text-xs">
      <span className="w-2 h-2 rounded-full bg-holo-cyan holo-pulse mr-2" />
      <span>INITIALIZING YARD CINEMATIC CORE...</span>
    </div>
  ),
});

export default function YardPage() {
  const [mode, setMode] = useState<YardMode>("build");
  const [heldLabel, setHeldLabel] = useState<string | null>(null);
  const [snapLabel, setSnapLabel] = useState<string | null>(null);
  const [jointCount, setJointCount] = useState(0);
  const [impulse, setImpulse] = useState<YardImpulseEvent | null>(null);
  const [physicsReady, setPhysicsReady] = useState(false);
  const [blueprintModalOpen, setBlueprintModalOpen] = useState(false);
  const [currentBlueprint, setCurrentBlueprint] = useState<YardBlueprint | null>(null);
  const [muted, setMuted] = useState(false);
  const fpsRef = useRef<HTMLSpanElement>(null);
  const actionsRef = useRef<YardActions | null>(null);
  const initialLoadedRef = useRef(false);

  const onBlueprintDirty = useCallback(() => {
    if (actionsRef.current) {
      const bp = actionsRef.current.getBlueprint();
      if (bp) {
        setCurrentBlueprint(bp);
        writeYardBlueprint("auto", bp);
      }
    }
  }, []);

  const onImpulse = useCallback((event: YardImpulseEvent) => {
    setImpulse(event);
    window.setTimeout(() => setImpulse(null), 2600);
  }, []);

  const handleLoadBlueprint = useCallback((blueprint: YardBlueprint) => {
    if (!actionsRef.current) return;
    actionsRef.current.loadBlueprint(blueprint);
    setCurrentBlueprint(blueprint);
    writeYardBlueprint("auto", blueprint);
  }, []);

  // First-load starter blueprint injection (Cantilever)
  useEffect(() => {
    if (!physicsReady || initialLoadedRef.current || !actionsRef.current) return;
    initialLoadedRef.current = true;
    const existing = readYardBlueprint("auto");
    if (existing && existing.joints.length > 0) {
      actionsRef.current.loadBlueprint(existing);
      setCurrentBlueprint(existing);
    } else {
      actionsRef.current.loadBlueprint(YARD_PRESETS.cantilever.blueprint);
      setCurrentBlueprint(YARD_PRESETS.cantilever.blueprint);
    }
  }, [physicsReady]);

  // Unlock AudioContext on first user interaction
  useEffect(() => {
    const unlock = () => {
      yardSound.init();
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
    };
    window.addEventListener("pointerdown", unlock);
    window.addEventListener("keydown", unlock);
    return () => {
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
    };
  }, []);

  // Keyboard Shortcuts
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.tagName === "SELECT")) return;

      if (event.code === "Digit1") {
        event.preventDefault();
        actionsRef.current?.resetHammer("light");
        return;
      }
      if (event.code === "Digit2") {
        event.preventDefault();
        actionsRef.current?.resetHammer("medium");
        return;
      }
      if (event.code === "Digit3") {
        event.preventDefault();
        actionsRef.current?.resetHammer("heavy");
        return;
      }
      if (event.code === "KeyZ") {
        event.preventDefault();
        actionsRef.current?.undo();
        return;
      }
      if (event.code === "KeyE") {
        event.preventDefault();
        if (actionsRef.current) {
          setCurrentBlueprint(actionsRef.current.getBlueprint());
        }
        setBlueprintModalOpen((prev) => !prev);
        return;
      }
      if (event.code === "Space") {
        event.preventDefault();
        // If holding with snap ready in build mode -> weld
        if (snapLabel && mode === "build") {
          actionsRef.current?.weld();
        } else {
          setMode((prev) => (prev === "build" ? "simulate" : "build"));
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [mode, snapLabel]);

  return (
    <main role="main" aria-label="余烬坞物理沙盒" className="relative w-screen h-screen overflow-hidden bg-void">
      <YardScene
        paused={mode === "build"}
        actionsRef={actionsRef}
        fpsNodeRef={fpsRef}
        onHoldChange={setHeldLabel}
        onSnapChange={setSnapLabel}
        onJointCount={setJointCount}
        onBlueprintDirty={onBlueprintDirty}
        onImpulse={onImpulse}
        onReleaseRequest={() => setMode("simulate")}
        onPhysicsReady={() => setPhysicsReady(true)}
      />

      <YardHud
        mode={mode}
        onModeChange={setMode}
        heldLabel={heldLabel}
        snapLabel={snapLabel}
        jointCount={jointCount}
        impulse={impulse}
        fpsRef={fpsRef}
        physicsReady={physicsReady}
        canUndo={jointCount > 0}
        muted={muted}
        onToggleMute={() => setMuted((m) => !m)}
        onOpenBlueprintModal={() => {
          if (actionsRef.current) {
            setCurrentBlueprint(actionsRef.current.getBlueprint());
          }
          setBlueprintModalOpen(true);
        }}
        onWeld={() => actionsRef.current?.weld()}
        onUndo={() => actionsRef.current?.undo()}
        onRelease={() => {
          actionsRef.current?.release();
          setMode("simulate");
        }}
        onDrop={() => actionsRef.current?.drop()}
        onHammerPreset={(preset) => actionsRef.current?.resetHammer(preset)}
      />

      <BlueprintModal
        isOpen={blueprintModalOpen}
        onClose={() => setBlueprintModalOpen(false)}
        currentBlueprint={currentBlueprint}
        onLoadBlueprint={handleLoadBlueprint}
      />
    </main>
  );
}
