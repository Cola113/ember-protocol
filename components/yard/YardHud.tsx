"use client";

import React from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Hammer,
  Hand,
  Play,
  RotateCcw,
  Sparkles,
  Volume2,
  VolumeX,
  Layers,
} from "lucide-react";
import type { YardImpulseEvent } from "@/components/yard/YardScene";
import type { HammerPresetId } from "@/lib/yard/fracture";
import { HAMMER_PRESETS, WARN_RATIO } from "@/lib/yard/fracture";
import { QUALITY, type QualityTier } from "@/lib/yard/quality";

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
  muted: boolean;
  onToggleMute: () => void;
  onOpenBlueprintModal: () => void;
  onWeld: () => void;
  onUndo: () => void;
  onRelease: () => void;
  onDrop: () => void;
  onHammerPreset: (preset: HammerPresetId) => void;
  qualityTier: QualityTier;
  stressCount: number;
  onToggleStress: () => void;
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
  muted,
  onToggleMute,
  onOpenBlueprintModal,
  onWeld,
  onUndo,
  onRelease,
  onDrop,
  onHammerPreset,
  qualityTier,
  stressCount,
  onToggleStress,
}: YardHudProps) {
  const simulating = mode === "simulate";

  return (
    <div className="pointer-events-none absolute inset-0 z-20 font-mono text-holo-bright select-none">
      {/* Top Bar */}
      <header className="pointer-events-auto absolute left-4 top-4 right-4 flex items-center justify-between gap-4">
        <div className="holo-panel flex items-center gap-3 px-3 py-2">
          <Link
            href="/"
            onClick={stop}
            className="inline-flex items-center gap-1.5 text-xs font-display tracking-widest text-holo-cyan hover:text-holo-bright transition-colors"
          >
            <ArrowLeft size={13} />
            <span>余烬坞 // YARD</span>
          </Link>
          <span className="text-holo-border">|</span>
          <span className="text-[11px] text-holo-muted uppercase tracking-wider">
            D5 DELIVER
          </span>
        </div>

        {/* Right Info & Audio */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={(e) => {
              stop(e);
              onToggleStress();
            }}
            className={`holo-panel pointer-events-auto inline-flex items-center gap-1.5 px-3 py-2 text-xs transition-all ${
              stressCount > 0
                ? "text-holo-rose hover:bg-holo-rose/15"
                : "text-holo-amber hover:bg-holo-amber/15"
            }`}
            title={stressCount > 0 ? "清除 150 零件压测场" : "铺 150 零件连环炸（T）"}
          >
            <span>{stressCount > 0 ? `清场 ${stressCount}` : "压测 150"}</span>
          </button>

          <button
            type="button"
            onClick={(e) => {
              stop(e);
              onOpenBlueprintModal();
            }}
            className="holo-panel pointer-events-auto inline-flex items-center gap-1.5 px-3 py-2 text-xs text-holo-cyan hover:bg-holo-cyan/15 transition-all"
            title="蓝图模板与分享"
          >
            <Layers size={13} />
            <span>蓝图</span>
          </button>

          <button
            type="button"
            onClick={(e) => {
              stop(e);
              onToggleMute();
            }}
            className="holo-panel pointer-events-auto p-2 text-holo-cyan hover:text-holo-bright"
            title={muted ? "开启音效" : "静音"}
            aria-label={muted ? "开启音效" : "静音"}
          >
            {muted ? <VolumeX size={14} className="text-holo-rose" /> : <Volume2 size={14} />}
          </button>

          <div className="holo-panel px-3 py-2 text-[10px] uppercase tracking-widest text-holo-muted">
            FPS <span ref={fpsRef} className="text-holo-cyan">--</span>
            <span className="mx-2 text-holo-border">/</span>
            档 <span className="text-holo-cyan">{QUALITY[qualityTier].label}</span>
            <span className="mx-2 text-holo-border">/</span>
            WASM <span className={physicsReady ? "text-holo-green" : "text-holo-amber"}>{physicsReady ? "OK" : "..."}</span>
          </div>
        </div>
      </header>

      {/* Bottom Main Action Bar */}
      <div className="pointer-events-auto absolute left-4 bottom-4 flex max-w-[calc(100vw-2rem)] flex-col gap-2">
        {/* Core 4-Word Minimal Action Bar: 抓 / 焊 / 释放 / 放 */}
        <div className="holo-panel flex flex-wrap items-center gap-1 p-1.5">
          {/* 抓 (Status indicator / grab cue) */}
          <div
            className={`inline-flex items-center gap-1.5 px-3 py-2 rounded text-xs tracking-wider uppercase font-bold transition-all ${
              heldLabel
                ? "bg-holo-cyan/25 text-holo-cyan border border-holo-cyan/60"
                : "bg-void/40 text-holo-muted border border-transparent"
            }`}
          >
            <Hand size={14} />
            <span>抓 {heldLabel ? `· ${heldLabel}` : ""}</span>
          </div>

          {/* 焊 */}
          <button
            type="button"
            onClick={(event) => {
              stop(event);
              onWeld();
            }}
            disabled={!snapLabel || simulating}
            title="吸附就绪时焊合 (快捷键: 空格)"
            className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded text-xs tracking-wider uppercase font-bold transition-all ${
              snapLabel && !simulating
                ? "bg-holo-cyan text-void shadow-lg shadow-holo-cyan/30 animate-pulse hover:bg-white"
                : "text-holo-cyan hover:bg-holo-cyan/15 disabled:cursor-not-allowed disabled:opacity-30"
            }`}
          >
            <Hammer size={14} />
            <span>焊</span>
          </button>

          {/* 释放 (Simulate) */}
          <button
            type="button"
            onClick={(event) => {
              stop(event);
              if (simulating) onModeChange("build");
              else onRelease();
            }}
            title={simulating ? "暂停模拟并固定 (快捷键: 空格)" : "开重力释放物理模拟 (快捷键: 空格)"}
            className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded text-xs tracking-wider uppercase font-bold transition-all ${
              simulating
                ? "bg-holo-green text-void shadow-lg shadow-holo-green/30 hover:bg-white"
                : "bg-holo-amber/20 text-holo-amber border border-holo-amber/40 hover:bg-holo-amber/30"
            }`}
          >
            <Play size={14} />
            <span>{simulating ? "暂停" : "释放"}</span>
          </button>

          {/* 放 (Drop held part) */}
          <button
            type="button"
            onClick={(event) => {
              stop(event);
              onDrop();
            }}
            disabled={!heldLabel}
            title="放下当前抓取的零件"
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded text-xs tracking-wider uppercase text-holo-muted hover:text-holo-bright disabled:cursor-not-allowed disabled:opacity-30 transition-all"
          >
            <RotateCcw size={13} />
            <span>放</span>
          </button>

          <span className="mx-1 h-4 w-px bg-holo-border/50" />

          {/* Undo */}
          <button
            type="button"
            onClick={(event) => {
              stop(event);
              onUndo();
            }}
            disabled={!canUndo || simulating}
            title="撤销最后一焊 (快捷键: Z)"
            className="inline-flex items-center gap-1 px-2.5 py-2 rounded text-xs tracking-wider text-holo-muted enabled:hover:text-holo-bright disabled:cursor-not-allowed disabled:opacity-30"
          >
            <span>撤销 ({jointCount})</span>
          </button>

          <span className="mx-1 h-4 w-px bg-holo-border/50" />

          {/* Hammer Presets: 1/2/3 */}
          <div className="flex items-center gap-1">
            {(Object.keys(HAMMER_PRESETS) as HammerPresetId[]).map((preset, idx) => (
              <button
                key={preset}
                type="button"
                onClick={(event) => {
                  stop(event);
                  onHammerPreset(preset);
                }}
                title={`${HAMMER_PRESETS[preset].label} · 快捷键 ${idx + 1}`}
                className="inline-flex items-center px-2 py-1.5 rounded text-[11px] tracking-wider text-holo-amber hover:bg-holo-amber/15 border border-holo-amber/30"
              >
                [{idx + 1}] {HAMMER_PRESETS[preset].label}
              </button>
            ))}
          </div>
        </div>

        {/* Single-line Status Bar & Thermal Legend (< 1 line rule) */}
        <div className="holo-panel flex flex-wrap items-center justify-between gap-3 px-3 py-1.5 text-[11px]">
          {/* Left Context Cues */}
          <div className="flex items-center gap-2">
            <Sparkles size={12} className="text-holo-cyan" />
            <span>
              {snapLabel ? (
                <span className="text-holo-cyan font-bold animate-pulse">
                  {snapLabel} · 按空格或点击[焊]
                </span>
              ) : heldLabel ? (
                <span className="text-holo-cyan">
                  抓取中 · 拖近黄色插座 / 滚轮升降
                </span>
              ) : simulating ? (
                <span className="text-holo-green">物理运行中 · 焊点受击热区监听</span>
              ) : (
                <span className="text-holo-muted">物理暂停 · 点击零件抓取 · 坞门已开，门外坡/岩/坠船</span>
              )}
            </span>

            {/* Impact feedback */}
            {impulse && (
              <span
                className={`ml-2 px-1.5 py-0.5 rounded text-[10px] uppercase font-bold ${
                  impulse.broken
                    ? "bg-holo-rose/20 text-holo-rose border border-holo-rose/40"
                    : impulse.damage >= WARN_RATIO
                    ? "bg-holo-amber/20 text-holo-amber border border-holo-amber/40"
                    : "bg-holo-cyan/20 text-holo-cyan"
                }`}
              >
                {impulse.broken ? "断裂!" : "受击"}{" "}
                {impulse.impulse.toFixed(1)} N·s ({(impulse.damage * 100).toFixed(0)}%)
              </span>
            )}
          </div>

          {/* Right: Thermal Legend */}
          <div className="flex items-center gap-3 text-[10px] text-holo-muted uppercase tracking-wider">
            <span>热区:</span>
            <span className="flex items-center gap-1 text-holo-cyan">
              <span className="w-1.5 h-1.5 rounded-full bg-holo-cyan" />
              稳
            </span>
            <span className="flex items-center gap-1 text-holo-amber">
              <span className="w-1.5 h-1.5 rounded-full bg-holo-amber" />
              压
            </span>
            <span className="flex items-center gap-1 text-orange-500">
              <span className="w-1.5 h-1.5 rounded-full bg-orange-500" />
              险
            </span>
            <span className="flex items-center gap-1 text-holo-rose">
              <span className="w-1.5 h-1.5 rounded-full bg-holo-rose" />
              断
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
