"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import YardHud, { type YardMode } from "@/components/yard/YardHud";

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
  const [physicsReady, setPhysicsReady] = useState(false);
  const fpsRef = useRef<HTMLSpanElement>(null);

  const onHoldChange = useCallback((label: string | null) => {
    setHeldLabel(label);
  }, []);

  const onPhysicsReady = useCallback(() => {
    setPhysicsReady(true);
  }, []);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.code !== "Space" && event.code !== "KeyB" && event.code !== "KeyV") {
        return;
      }
      const target = event.target as HTMLElement | null;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA")) {
        return;
      }
      event.preventDefault();
      if (event.code === "Space" || event.code === "KeyV") {
        setMode((prev) => (prev === "build" ? "simulate" : "build"));
      } else if (event.code === "KeyB") {
        setMode("build");
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <main
      role="main"
      aria-label="余烬坞物理沙盒"
      className="relative w-screen h-screen overflow-hidden bg-void"
    >
      <YardScene
        paused={mode === "build"}
        fpsNodeRef={fpsRef}
        onHoldChange={onHoldChange}
        onPhysicsReady={onPhysicsReady}
      />
      <YardHud
        mode={mode}
        onModeChange={setMode}
        heldLabel={heldLabel}
        fpsRef={fpsRef}
        physicsReady={physicsReady}
      />
    </main>
  );
}
