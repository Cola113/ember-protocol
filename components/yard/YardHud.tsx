"use client";

import React from "react";
import Link from "next/link";
import { Pause, Play, MousePointer2, ArrowLeft } from "lucide-react";

export type YardMode = "build" | "simulate";

type YardHudProps = {
  mode: YardMode;
  onModeChange: (mode: YardMode) => void;
  heldLabel: string | null;
  fpsRef: React.RefObject<HTMLSpanElement>;
  physicsReady: boolean;
};

export default function YardHud({
  mode,
  onModeChange,
  heldLabel,
  fpsRef,
  physicsReady,
}: YardHudProps) {
  const simulating = mode === "simulate";

  return (
    <div className="pointer-events-none absolute inset-0 z-20 font-mono text-holo-bright">
      <header className="pointer-events-auto absolute left-4 top-4 right-4 flex items-start justify-between gap-4">
        <div className="holo-panel px-4 py-3 max-w-md">
          <p className="font-display text-sm tracking-[0.18em] text-holo-cyan">
            余烬坞 // EMBER YARD
          </p>
          <p className="mt-1 text-[10px] uppercase tracking-widest text-holo-muted">
            D1 graybox · 40×30×16m · Rapier 1.5.0
          </p>
          <p className="mt-2 text-[11px] text-holo-muted leading-relaxed">
            点击零件抓取（kinematic 跟随光标，滚轮改高度）。再点放下。
            Build 暂停装配，Simulate 开重力。空格切换。
          </p>
        </div>

        <div className="flex flex-col items-end gap-2">
          <Link
            href="/"
            className="holo-panel pointer-events-auto inline-flex items-center gap-2 px-3 py-2 text-[11px] text-holo-cyan hover:text-holo-bright"
          >
            <ArrowLeft size={12} />
            星图 /
          </Link>
          <div className="holo-panel px-3 py-2 text-[10px] uppercase tracking-widest text-holo-muted">
            fps{" "}
            <span ref={fpsRef} className="text-holo-cyan">
              --
            </span>
            <span className="mx-2 text-holo-border">/</span>
            wasm{" "}
            <span className={physicsReady ? "text-holo-green" : "text-holo-amber"}>
              {physicsReady ? "online" : "loading"}
            </span>
          </div>
        </div>
      </header>

      <div className="pointer-events-auto absolute left-4 bottom-4 flex flex-col gap-2">
        <div className="holo-panel flex overflow-hidden">
          <button
            type="button"
            onClick={() => onModeChange("build")}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs tracking-widest uppercase ${
              !simulating
                ? "bg-holo-amber/20 text-holo-amber"
                : "text-holo-muted hover:text-holo-bright"
            }`}
            aria-pressed={!simulating}
          >
            <Pause size={13} />
            Build
          </button>
          <button
            type="button"
            onClick={() => onModeChange("simulate")}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs tracking-widest uppercase ${
              simulating
                ? "bg-holo-green/20 text-holo-green"
                : "text-holo-muted hover:text-holo-bright"
            }`}
            aria-pressed={simulating}
          >
            <Play size={13} />
            Simulate
          </button>
        </div>
        <div className="holo-panel px-3 py-2 text-[11px] text-holo-muted flex items-center gap-2">
          <MousePointer2 size={12} className="text-holo-cyan" />
          {heldLabel ? (
            <span>
              抓取中 <span className="text-holo-cyan">{heldLabel}</span>
            </span>
          ) : simulating ? (
            <span>重力开 · 点零件抓取，点空处放下</span>
          ) : (
            <span>物理暂停 · 装配后切 Simulate 看落地</span>
          )}
        </div>
      </div>
    </div>
  );
}
