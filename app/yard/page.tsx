"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import YardHud, { type YardMode } from "@/components/yard/YardHud";
import {
  readYardBlueprint,
  writeYardBlueprint,
  type YardBlueprintSlot,
} from "@/lib/yard/blueprint";
import type { YardActions, YardImpulseEvent } from "@/components/yard/YardScene";

const YardScene = dynamic(() => import("@/components/yard/YardScene"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center bg-void text-holo-cyan font-mono text-xs">
      <span className="w-2 h-2 rounded-full bg-holo-cyan holo-pulse mr-2" />
      <span>INITIALIZING YARD PHYSICS CORE...</span>
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
  const [blueprintStatus, setBlueprintStatus] = useState<string | null>(null);
  const [slot, setSlot] = useState<YardBlueprintSlot>("slot1");
  const [blueprintRevision, setBlueprintRevision] = useState(0);
  const fpsRef = useRef<HTMLSpanElement>(null);
  const actionsRef = useRef<YardActions | null>(null);

  const onBlueprintDirty = useCallback(() => setBlueprintRevision((value) => value + 1), []);
  const onImpulse = useCallback((event: YardImpulseEvent) => {
    setImpulse(event);
    window.setTimeout(() => setImpulse(null), 2600);
  }, []);
  const saveSlot = useCallback((target: YardBlueprintSlot) => {
    const blueprint = actionsRef.current?.getBlueprint();
    if (!blueprint) return;
    writeYardBlueprint(target, blueprint);
    setBlueprintStatus(target === "auto" ? "自动蓝图已存" : `${target.replace("slot", "槽 ")} 已存`);
  }, []);
  const loadSlot = useCallback((target: YardBlueprintSlot) => {
    const blueprint = readYardBlueprint(target);
    if (!blueprint || !actionsRef.current) {
      setBlueprintStatus("槽位为空");
      return;
    }
    actionsRef.current.loadBlueprint(blueprint);
    setBlueprintStatus(`${target.replace("slot", "槽 ")} 已读回`);
  }, []);

  useEffect(() => {
    if (!physicsReady) return;
    const timer = window.setTimeout(() => saveSlot("auto"), 30000);
    return () => window.clearTimeout(timer);
  }, [blueprintRevision, physicsReady, saveSlot]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.code !== "Space" && event.code !== "KeyB" && event.code !== "KeyV") return;
      const target = event.target as HTMLElement | null;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA")) return;
      event.preventDefault();
      if (event.code === "Space" || event.code === "KeyV") {
        setMode((prev) => (prev === "build" ? "simulate" : "build"));
      } else {
        setMode("build");
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

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
        selectedSlot={slot}
        blueprintStatus={blueprintStatus}
        onSlotChange={setSlot}
        onWeld={() => actionsRef.current?.weld()}
        onUndo={() => actionsRef.current?.undo()}
        onRelease={() => actionsRef.current?.release()}
        onSave={() => saveSlot(slot)}
        onLoad={() => loadSlot(slot)}
      />
    </main>
  );
}
