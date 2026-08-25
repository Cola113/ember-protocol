"use client";

import React, { useMemo } from "react";
import { Compass, BookOpen, Layers, GitBranch, Sparkles, Radio } from "lucide-react";
import { deriveNextStepHints, buildIdleHint, type NextStepHint } from "@/lib/curator/next-step";

export interface HudHeaderProps {
  currentView: string;
  onNavigate: (view: "galaxy" | "index" | "ship" | "ending") => void;
  emberCycleSecondsLeft: number;
  believedTruthsCount: number;
  totalTruthsCount: number;
  showInferenceLines?: boolean;
  onToggleInference?: () => void;
  canResolveEnding?: boolean;
  collectedPropositions?: readonly string[];
  believedTruths?: readonly string[];
}

export function HudHeader({
  currentView,
  onNavigate,
  emberCycleSecondsLeft,
  believedTruthsCount,
  totalTruthsCount,
  showInferenceLines = true,
  onToggleInference,
  canResolveEnding = false,
  collectedPropositions = [],
  believedTruths = []
}: HudHeaderProps) {
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const isEndingReady = canResolveEnding || (believedTruthsCount >= totalTruthsCount && totalTruthsCount > 0);

  // Derive next-step hints deterministically from player's current evidence state
  const rawHints = useMemo(
    () => deriveNextStepHints(collectedPropositions, believedTruths),
    [collectedPropositions, believedTruths]
  );

  // When rawHints is empty (e.g. all truths decoded / cruising), fall back to canonical idle hint
  const nextStepHints = rawHints.length > 0 ? rawHints : [buildIdleHint()];
  const displayedHints = nextStepHints.slice(0, 2);
  const overflowCount = Math.max(0, nextStepHints.length - 2);

  return (
    <header role="banner" className="absolute top-0 left-0 right-0 z-40 pointer-events-auto">
      {/* Top Primary Bar (h-14 sm:h-16) */}
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

        {/* Right: Primary Navigation Controls */}
        <nav aria-label="主要导航" className="flex items-center gap-1 sm:gap-2 md:gap-3">
          <button
            onClick={() => onNavigate("galaxy")}
            className={`px-2.5 sm:px-3.5 py-1.5 rounded-sm text-xs font-mono flex items-center gap-1.5 transition-all duration-150 ${
              currentView === "galaxy"
                ? "bg-holo-cyan/20 border border-holo-cyan text-holo-bright shadow-holo-cyan"
                : "bg-surface border border-holo-border text-holo-muted hover:text-holo-cyan hover:border-holo-cyan/50"
            }`}
          >
            <Compass className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-holo-cyan" />
            <span className="hidden sm:inline">STAR CHART</span>
          </button>

          <button
            onClick={() => onNavigate("index")}
            className={`px-2.5 sm:px-3.5 py-1.5 rounded-sm text-xs font-mono flex items-center gap-1.5 transition-all duration-150 ${
              currentView === "index"
                ? "bg-holo-cyan/20 border border-holo-cyan text-holo-bright shadow-holo-cyan"
                : "bg-surface border border-holo-border text-holo-muted hover:text-holo-cyan hover:border-holo-cyan/50"
            }`}
          >
            <Layers className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-holo-cyan" />
            <span className="hidden sm:inline">INDEX</span>
          </button>

          {/* Inference Lines Toggle Button (Restored) */}
          {onToggleInference && (
            <button
              onClick={onToggleInference}
              className={`px-2 sm:px-3 py-1.5 rounded-sm text-xs font-mono flex items-center gap-1.5 transition-all duration-150 ${
                showInferenceLines
                  ? "bg-holo-cyan/20 border border-holo-cyan text-holo-bright shadow-holo-cyan"
                  : "bg-surface border border-holo-border text-holo-muted hover:text-holo-cyan hover:border-holo-cyan/50"
              }`}
              title={showInferenceLines ? "隐藏星图因果推理拓扑连线" : "显示星图因果推理拓扑连线"}
            >
              <GitBranch className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-holo-cyan" />
              <span className="hidden sm:inline">INFERENCE</span>
            </button>
          )}

          <button
            onClick={() => onNavigate("ship")}
            className={`px-2.5 sm:px-3.5 py-1.5 rounded-sm text-xs font-mono flex items-center gap-1.5 transition-all duration-150 ${
              currentView === "ship"
                ? "bg-holo-cyan/20 border border-holo-cyan text-holo-bright shadow-holo-cyan"
                : "bg-surface border border-holo-border text-holo-muted hover:text-holo-cyan hover:border-holo-cyan/50"
            }`}
          >
            <BookOpen className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-holo-cyan" />
            <span className="hidden sm:inline">SHIP DECK</span>
          </button>

          {isEndingReady && (
            <button
              onClick={() => onNavigate("ending")}
              className={`px-2.5 sm:px-3.5 py-1.5 rounded-sm text-xs font-mono flex items-center gap-1.5 transition-all duration-150 ${
                currentView === "ending"
                  ? "bg-holo-amber/30 border border-holo-amber text-holo-amber shadow-holo-amber font-bold"
                  : "bg-holo-amber/15 border border-holo-amber/60 text-holo-amber hover:bg-holo-amber/25 animate-pulse font-bold"
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-holo-amber" />
              <span>ENDING</span>
            </button>
          )}

          <div className="pl-2 sm:pl-3 border-l border-holo-cyan/20 text-right font-mono text-xs hidden sm:block">
            <div className="text-holo-muted text-[10px]">EMBER CYCLE</div>
            <div className="text-holo-amber font-bold">{formatTime(emberCycleSecondsLeft)}</div>
          </div>
        </nav>
      </div>

      {/* Next Step Tactical Protocol Bar (Astral Noir HUD Sub-Bar, h-9 sm:h-10 strictly single-line) */}
      <div
        aria-label="下一步指引"
        className="w-full h-9 sm:h-10 px-2.5 sm:px-4 md:px-8 py-1 bg-void/90 border-b border-holo-cyan/20 backdrop-blur-md flex items-center justify-between gap-2 text-xs font-mono shadow-sm overflow-hidden"
      >
        {/* Left Badge: Status Tag */}
        <div className="flex items-center gap-1.5 shrink-0 text-holo-cyan/90 font-bold tracking-wider">
          <Radio className="w-3.5 h-3.5 text-holo-cyan animate-pulse shrink-0" />
          <span className="text-[11px] sm:text-xs whitespace-nowrap">NEXT STEP // 下一步:</span>
        </div>

        {/* Center / Body: Next Step Hints (Bounded to at most 2 side-by-side single-line cards) */}
        <div className="flex-1 flex items-center gap-2 sm:gap-3 min-w-0 overflow-hidden">
          {displayedHints.map((hint) => {
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
                className={`flex-1 flex items-center gap-1.5 sm:gap-2 px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-sm border ${borderClass} text-xs transition-all duration-200 min-w-0 overflow-hidden`}
              >
                {/* Planet / Target Badge */}
                <span className={`shrink-0 font-bold text-[10px] sm:text-xs whitespace-nowrap ${tagClass}`}>
                  [{hint.planetLabel}
                  {hint.siteLabel && !isSuspected && !isEnding && !isIdle ? ` · ${hint.siteLabel}` : ""}]
                </span>

                {/* Human Sentence */}
                <span className="truncate text-[10px] sm:text-xs tracking-tight">{hint.text}</span>

                {/* Action quick jump if suspected */}
                {isSuspected && (
                  <button
                    onClick={() => onNavigate("index")}
                    className="ml-auto px-1.5 py-0.5 rounded text-[10px] bg-holo-amber/20 border border-holo-amber/50 text-holo-amber font-bold hover:bg-holo-amber hover:text-void transition-colors shrink-0 whitespace-nowrap"
                    title="前往公证索引台进行两槽因果综合"
                  >
                    综合 →
                  </button>
                )}
              </div>
            );
          })}

          {/* Overflow Indicator if more than 2 parallel leads exist */}
          {overflowCount > 0 && (
            <span
              className="shrink-0 px-1.5 py-0.5 rounded text-[10px] font-mono bg-holo-cyan/15 border border-holo-cyan/40 text-holo-cyan whitespace-nowrap"
              title={`另有 ${overflowCount} 个星系探索线索可用`}
            >
              +{overflowCount} 更多
            </span>
          )}
        </div>
      </div>
    </header>
  );
}

export default HudHeader;
