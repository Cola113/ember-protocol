"use client";

import React from "react";
import Link from "next/link";
import {
  ArrowLeft,
  FolderOpen,
  Hammer,
  MousePointer2,
  Pause,
  Play,
  Save,
  Undo2,
} from "lucide-react";
import type { YardImpulseEvent } from "@/components/yard/YardScene";
import type { YardBlueprintSlot } from "@/lib/yard/blueprint";

export type YardMode = "build" | "simulate";

type YardHudProps = {
  mode: YardMode;
  onModeChange: (mode: YardMode) => void;
  heldLabel: string | null;
  snapLabel: string | null;
  jointCount: number;
  impulse: YardImpulseEvent | null;
  fpsRef: React.RefObject<HTMLSpanElement>;
  physicsReady: boolean;
  canUndo: boolean;
  selectedSlot: YardBlueprintSlot;
  blueprintStatus: string | null;
  onSlotChange: (slot: YardBlueprintSlot) => void;
  onWeld: () => void;
  onUndo: () => void;
  onRelease: () => void;
  onSave: () => void;
  onLoad: () => void;
};

const stop = (event: React.MouseEvent) => event.stopPropagation();

export default function YardHud({
  mode,
  onModeChange,
  heldLabel,
  snapLabel,
  jointCount,
  impulse,
  fpsRef,
  physicsReady,
  canUndo,
  selectedSlot,
  blueprintStatus,
  onSlotChange,
  onWeld,
  onUndo,
  onRelease,
  onSave,
  onLoad,
}: YardHudProps) {
  const simulating = mode === "simulate";
  return (
    <div className="pointer-events-none absolute inset-0 z-20 font-mono text-holo-bright">
      <header className="pointer-events-auto absolute left-4 top-4 right-4 flex items-start justify-between gap-4">
        <div className="holo-panel px-4 py-3 max-w-md">
          <p className="font-display text-sm tracking-[0.18em] text-holo-cyan">余烬坞 // EMBER YARD</p>
          <p className="mt-1 text-[10px] uppercase tracking-widest text-holo-muted">D2 assembly · 40×30×16m · Rapier 1.5.0</p>
          <p className="mt-2 text-[11px] text-holo-muted leading-relaxed">拖近插座看幽灵预览，点焊上固定；释放落锤，观察结构受力。</p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <Link href="/" onClick={stop} className="holo-panel pointer-events-auto inline-flex items-center gap-2 px-3 py-2 text-[11px] text-holo-cyan hover:text-holo-bright"><ArrowLeft size={12} />星图 /</Link>
          <div className="holo-panel px-3 py-2 text-[10px] uppercase tracking-widest text-holo-muted">fps <span ref={fpsRef} className="text-holo-cyan">--</span><span className="mx-2 text-holo-border">/</span>wasm <span className={physicsReady ? "text-holo-green" : "text-holo-amber"}>{physicsReady ? "online" : "loading"}</span></div>
        </div>
      </header>

      <div className="pointer-events-auto absolute left-4 bottom-4 flex max-w-[calc(100vw-2rem)] flex-col gap-2">
        <div className="holo-panel flex flex-wrap items-center gap-1 p-1">
          <button type="button" onClick={(event) => { stop(event); onModeChange("build"); }} className={`inline-flex items-center gap-2 px-3 py-2 text-xs tracking-widest uppercase ${!simulating ? "bg-holo-amber/20 text-holo-amber" : "text-holo-muted hover:text-holo-bright"}`} aria-pressed={!simulating}><Pause size={13} />Build</button>
          <button type="button" onClick={(event) => { stop(event); onModeChange("simulate"); }} className={`inline-flex items-center gap-2 px-3 py-2 text-xs tracking-widest uppercase ${simulating ? "bg-holo-green/20 text-holo-green" : "text-holo-muted hover:text-holo-bright"}`} aria-pressed={simulating}><Play size={13} />Simulate</button>
          <button type="button" onClick={(event) => { stop(event); onWeld(); }} disabled={!snapLabel || simulating} title="焊上当前吸附件" className="inline-flex items-center gap-2 px-3 py-2 text-xs tracking-widest uppercase text-holo-cyan enabled:hover:bg-holo-cyan/15 disabled:cursor-not-allowed disabled:opacity-35"><Hammer size={13} />焊上</button>
          <button type="button" onClick={(event) => { stop(event); onUndo(); }} disabled={!canUndo || simulating} title="撤销最后一焊" className="inline-flex items-center gap-2 px-3 py-2 text-xs tracking-widest uppercase text-holo-muted enabled:hover:text-holo-bright disabled:cursor-not-allowed disabled:opacity-35"><Undo2 size={13} />撤销</button>
          <button type="button" onClick={(event) => { stop(event); onRelease(); }} disabled={simulating} title="释放整结构与落锤" className="inline-flex items-center gap-2 px-3 py-2 text-xs tracking-widest uppercase text-holo-amber enabled:hover:bg-holo-amber/15 disabled:cursor-not-allowed disabled:opacity-35"><Play size={13} />释放</button>
          <span className="px-2 text-[10px] text-holo-muted">焊缝 {jointCount}</span>
        </div>

        <div className="holo-panel flex flex-wrap items-center gap-2 px-3 py-2 text-[11px] text-holo-muted">
          <MousePointer2 size={12} className="text-holo-cyan" />
          <span>{snapLabel ? <><span className="text-holo-amber">{snapLabel}</span></> : heldLabel ? <>抓取中 <span className="text-holo-cyan">{heldLabel}</span></> : simulating ? "重力开 · 落锤冲量监听中" : "物理暂停 · 拖近黄色插座"}</span>
          {impulse ? <span className="text-holo-rose">冲量 {impulse.impulse.toFixed(1)} · {impulse.otherId}</span> : null}
        </div>

        <div className="holo-panel flex flex-wrap items-center gap-2 px-3 py-2 text-[10px] uppercase tracking-widest text-holo-muted">
          <span>蓝图</span>
          <select value={selectedSlot} onChange={(event) => onSlotChange(event.target.value as YardBlueprintSlot)} onClick={stop} className="bg-transparent text-holo-cyan outline-none"><option value="slot1">槽 1</option><option value="slot2">槽 2</option><option value="slot3">槽 3</option></select>
          <button type="button" onClick={(event) => { stop(event); onSave(); }} title="保存蓝图" className="inline-flex items-center gap-1 text-holo-cyan hover:text-holo-bright"><Save size={13} />存</button>
          <button type="button" onClick={(event) => { stop(event); onLoad(); }} disabled={!physicsReady || Boolean(heldLabel)} title="读回蓝图" className="inline-flex items-center gap-1 text-holo-cyan hover:text-holo-bright disabled:cursor-not-allowed disabled:opacity-35"><FolderOpen size={13} />读</button>
          {blueprintStatus ? <span className="text-holo-green">{blueprintStatus}</span> : null}
        </div>
      </div>
    </div>
  );
}
