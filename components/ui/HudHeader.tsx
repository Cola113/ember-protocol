"use client";

import React, { useMemo } from "react";
import { Compass, BookOpen, Ship, Network, AlertTriangle, Radio, Sparkles, Navigation } from "lucide-react";
import { deriveNextStepHints, type NextStepHint } from "@/lib/curator/next-step";

interface HudHeaderProps {
  currentView: "opening" | "galaxy" | "ship" | "index" | "survey" | "surface" | "landing_cinematic" | "ending";
  onNavigate: (view: "opening" | "galaxy" | "ship" | "index" | "ending") => void;
  showInferenceLines: boolean;
  onToggleInference: () => void;
  canResolveEnding?: boolean;
  emberCycleSecondsLeft?: number;
  believedTruthsCount?: number;
  totalTruthsCount?: number;
  collectedPropositions?: string[];
  believedTruths?: string[];
}

export default function HudHeader({
  currentView,
  onNavigate,
  showInferenceLines,
  onToggleInference,
  canResolveEnding = false,
  emberCycleSecondsLeft = 2382,
  believedTruthsCount = 0,
  totalTruthsCount = 6,
  collectedPropositions = [],
  believedTruths = [],
}: HudHeaderProps) {
  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60).toString().padStart(2, "0");
    const s = (secs % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  // Derive deterministic fiction-interior next step hints from player state
  const nextStepHints = useMemo<NextStepHint[]>(
    () => deriveNextStepHints(collectedPropositions, believedTruths),
    [collectedPropositions, believedTruths]
  );

  return (
    <header role="banner" className="absolute top-0 left-0 right-0 z-50 pointer-events-auto">
      {/* Top Primary Bar */}
      <div className="h-14 sm:h-16 px-2.5 sm:px-4 md:px-8 flex justify-between items-center bg-gradient-to-b from-surface-dark via-surface-dark/95 to-surface-dark/90 border-b border-holo-cyan/15 backdrop-blur-md">
        {/* Left: Vessel Identity */}
        <div className="flex items-center gap-2 sm:gap-3 md:gap-4 min-w-0">
          <div className="font-display font-bold text-xs sm:text-base md:text-lg tracking-wider sm:tracking-widest text-holo-bright truncate">
            EMBER PROTOCOL
          </div>
          <div className="hidden md:inline-flex items-center gap-1.5 px-2.5 py-1 bg-surface border border-holo-border rounded-sm text-xs font-mono text-holo-cyan">
            <span className="w-1.5 h-1.5 rounded-full bg-holo-cyan holo-pulse" />
            <span>ISV THRESHOLD // RECORDER-9 [VESPER]</span>
          </div>
          <div className="inline-flex items-center gap-1.5 px-2 sm:px-2.5 py-1 bg-surface border border-holo-cyan/30 rounded-sm text-xs font-mono text-holo-cyan shadow-sm">
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                believedTruthsCount > 0 ? "bg-holo-cyan holo-pulse" : "bg-holo-amber"
              }`}
            />
            <span>
              TRUTHS: {believedTruthsCount}/{totalTruthsCount}
            </span>
          </div>
        </div>

        {/* Right: Actions & Timer */}
        <nav aria-label="HUD 导航操作栏" className="flex items-center gap-1.5 sm:gap-2 md:gap-3 shrink-0">
          {/* Full Canon Resolution Trigger Badge */}
          {canResolveEnding && currentView !== "ending" && (
            <button
              onClick={() => onNavigate("ending")}
              className="min-h-[44px] min-w-[44px] justify-center px-2.5 sm:px-3 py-1.5 rounded-sm border border-holo-amber bg-holo-amber/25 hover:bg-holo-amber hover:text-void text-holo-amber text-xs font-mono font-bold flex items-center gap-1.5 shadow-holo-amber animate-pulse transition-all"
              aria-label="执行全域终局决议协议"
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">RESOLUTION READY</span>
              <span className="sm:hidden text-[10px]">RESOLVE</span>
            </button>
          )}

          {currentView === "galaxy" && (
            <button
              onClick={onToggleInference}
              className={`min-h-[44px] min-w-[44px] justify-center px-2.5 sm:px-3 py-1.5 rounded-sm border text-xs font-mono flex items-center gap-1.5 sm:gap-2 transition-all duration-200 ${
                showInferenceLines
                  ? "bg-holo-amber/20 border-holo-amber text-holo-amber shadow-holo-amber"
                  : "bg-surface border-holo-border text-holo-bright hover:border-holo-cyan"
              }`}
              aria-label="切换推理图谱拓扑连线 (快捷键 L)"
              title="推理拓扑 [L]"
            >
              <Network className="w-3.5 h-3.5" />
              <span className="hidden md:inline">INFERENCE [L]</span>
              <span className="md:hidden text-[11px]">[L]</span>
            </button>
          )}

          <button
            onClick={() => onNavigate("galaxy")}
            className={`min-h-[44px] min-w-[44px] justify-center px-2.5 sm:px-3 py-1.5 rounded-sm border text-xs font-mono flex items-center gap-1.5 sm:gap-2 transition-all duration-200 ${
              currentView === "galaxy"
                ? "bg-holo-cyan/20 border-holo-cyan text-holo-cyan shadow-holo-cyan"
                : "bg-surface border-holo-border text-holo-bright hover:border-holo-cyan"
            }`}
            aria-label="打开星系地图 (GALAXY MAP)"
            title="星系地图"
          >
            <Compass className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">GALAXY MAP</span>
          </button>

          <button
            onClick={() => onNavigate("index")}
            className={`min-h-[44px] min-w-[44px] justify-center px-2.5 sm:px-3 py-1.5 rounded-sm border text-xs font-mono flex items-center gap-1.5 sm:gap-2 transition-all duration-200 ${
              currentView === "index"
                ? "bg-holo-amber/20 border-holo-amber text-holo-amber shadow-holo-amber"
                : "bg-surface border-holo-border text-holo-bright hover:border-holo-amber"
            }`}
            aria-label="打开公证索引台"
            title="公证索引台"
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">INDEX</span>
          </button>

          <button
            onClick={() => onNavigate("ship")}
            className={`min-h-[44px] min-w-[44px] justify-center px-2.5 sm:px-3 py-1.5 rounded-sm border text-xs font-mono flex items-center gap-1.5 sm:gap-2 transition-all duration-200 ${
              currentView === "ship"
                ? "bg-holo-cyan/20 border-holo-cyan text-holo-cyan shadow-holo-cyan"
                : "bg-surface border-holo-border text-holo-bright hover:border-holo-cyan"
            }`}
            aria-label="打开舰载总控室 (SHIP DECK)"
            title="舰载总控室"
          >
            <Ship className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">SHIP DECK</span>
          </button>

          <div className="pl-2 sm:pl-3 border-l border-holo-cyan/20 text-right font-mono text-xs hidden sm:block">
            <div className="text-holo-muted text-[10px]">EMBER CYCLE</div>
            <div className="text-holo-amber font-bold">{formatTime(emberCycleSecondsLeft)}</div>
          </div>
        </nav>
      </div>

      {/* Next Step Tactical Protocol Bar (Astral Noir HUD Sub-Bar) */}
      <div
        aria-label="下一步指引"
        className="w-full px-2.5 sm:px-4 md:px-8 py-1.5 bg-void/90 border-b border-holo-cyan/20 backdrop-blur-md flex flex-wrap items-center justify-between gap-2 text-xs font-mono shadow-sm"
      >
        {/* Left Badge: Status Tag */}
        <div className="flex items-center gap-1.5 shrink-0 text-holo-cyan/90 font-bold tracking-wider">
          <Radio className="w-3.5 h-3.5 text-holo-cyan animate-pulse" />
          <span className="text-[11px] sm:text-xs">NEXT STEP // 下一步:</span>
        </div>

        {/* Center / Body: Next Step Hints (Single or Parallel Side-by-Side) */}
        <div className="flex-1 flex flex-wrap items-center gap-2 sm:gap-3 min-w-0">
          {nextStepHints.map((hint) => {
            const isSuspected = hint.status === "suspected";
            const isEnding = hint.status === "ending";
            const isIdle = hint.status === "idle";

            let borderClass = "border-holo-cyan/30 bg-surface/70 text-holo-bright";
            let tagClass = "text-holo-cyan";

            if (isSuspected || isEnding) {
              borderClass = "border-holo-amber/50 bg-holo-amber/15 text-holo-bright shadow-sm";
              tagClass = "text-holo-amber font-bold";
            } else if (isIdle) {
              borderClass = "border-holo-border bg-surface/40 text-holo-muted";
              tagClass = "text-holo-muted";
            }

            return (
              <div
                key={hint.id}
                className={`flex items-center gap-2 px-2.5 py-1 rounded-sm border ${borderClass} text-xs transition-all duration-200 min-w-0 max-w-full`}
              >
                {/* Planet / Target Badge */}
                <span className={`shrink-0 font-bold text-[11px] sm:text-xs ${tagClass}`}>
                  [{hint.planetLabel}
                  {hint.siteLabel && !isSuspected && !isEnding && !isIdle ? ` · ${hint.siteLabel}` : ""}]
                </span>

                {/* Human Sentence */}
                <span className="truncate text-[11px] sm:text-xs tracking-tight">{hint.text}</span>

                {/* Action quick jump if suspected or ending */}
                {isSuspected && (
                  <button
                    onClick={() => onNavigate("index")}
                    className="ml-1 px-2 py-0.5 rounded text-[10px] bg-holo-amber/20 border border-holo-amber/50 text-holo-amber font-bold hover:bg-holo-amber hover:text-void transition-colors shrink-0"
                    title="前往公证索引台进行两槽因果综合"
                  >
                    综合 →
                  </button>
                )}
                {isEnding && (
                  <button
                    onClick={() => onNavigate("ending")}
                    className="ml-1 px-2 py-0.5 rounded text-[10px] bg-holo-amber/30 border border-holo-amber text-holo-amber font-bold hover:bg-holo-amber hover:text-void transition-colors shrink-0 animate-pulse"
                    title="执行全域终局决议协议"
                  >
                    终局决议 →
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </header>
  );
}
