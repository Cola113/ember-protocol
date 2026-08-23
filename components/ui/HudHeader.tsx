"use client";

import React, { useState, useEffect } from "react";
import { Sparkles, Compass, BookOpen, Ship, Network } from "lucide-react";

interface HudHeaderProps {
  currentView: "opening" | "galaxy" | "ship" | "index" | "survey" | "surface";
  onNavigate: (view: "opening" | "galaxy" | "ship" | "index") => void;
  showInferenceLines: boolean;
  onToggleInference: () => void;
}

export default function HudHeader({
  currentView,
  onNavigate,
  showInferenceLines,
  onToggleInference,
}: HudHeaderProps) {
  const [secondsLeft, setSecondsLeft] = useState(2382); // 39:42

  useEffect(() => {
    const timer = setInterval(() => {
      setSecondsLeft((prev) => (prev > 0 ? prev - 1 : 2400));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60).toString().padStart(2, "0");
    const s = (secs % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  return (
    <header className="absolute top-0 left-0 right-0 h-16 px-8 flex justify-between items-center bg-gradient-to-b from-surface-dark to-transparent border-b border-holo-cyan/15 z-50 pointer-events-auto">
      {/* Left: Vessel Identity */}
      <div className="flex items-center gap-4">
        <div className="font-display font-bold text-lg tracking-widest text-holo-bright">
          EMBER PROTOCOL
        </div>
        <div className="hidden md:inline-flex items-center gap-1.5 px-2.5 py-1 bg-surface border border-holo-border rounded-sm text-xs font-mono text-holo-cyan">
          <span className="w-1.5 h-1.5 rounded-full bg-holo-cyan holo-pulse" />
          <span>ISV THRESHOLD // RECORDER-9 [VESPER]</span>
        </div>
        <div className="hidden lg:inline-flex items-center gap-1.5 px-2.5 py-1 bg-surface border border-holo-amber/30 rounded-sm text-xs font-mono text-holo-amber">
          <span>PARITY BIT: 0x00FF</span>
        </div>
      </div>

      {/* Right: Actions & Timer */}
      <div className="flex items-center gap-3">
        {currentView === "galaxy" && (
          <button
            onClick={onToggleInference}
            className={`px-3 py-1.5 rounded-sm border text-xs font-mono flex items-center gap-2 transition-all duration-200 ${
              showInferenceLines
                ? "bg-holo-amber/20 border-holo-amber text-holo-amber shadow-holo-amber"
                : "bg-surface border-holo-border text-holo-bright hover:border-holo-cyan"
            }`}
          >
            <Network className="w-3.5 h-3.5" />
            <span>INFERENCE [L]</span>
          </button>
        )}

        <button
          onClick={() => onNavigate("galaxy")}
          className={`px-3 py-1.5 rounded-sm border text-xs font-mono flex items-center gap-2 transition-all duration-200 ${
            currentView === "galaxy"
              ? "bg-holo-cyan/20 border-holo-cyan text-holo-cyan shadow-holo-cyan"
              : "bg-surface border-holo-border text-holo-bright hover:border-holo-cyan"
          }`}
        >
          <Compass className="w-3.5 h-3.5" />
          <span>GALAXY MAP</span>
        </button>

        <button
          onClick={() => onNavigate("index")}
          className={`px-3 py-1.5 rounded-sm border text-xs font-mono flex items-center gap-2 transition-all duration-200 ${
            currentView === "index"
              ? "bg-holo-amber/20 border-holo-amber text-holo-amber shadow-holo-amber"
              : "bg-surface border-holo-border text-holo-bright hover:border-holo-amber"
          }`}
        >
          <BookOpen className="w-3.5 h-3.5" />
          <span>INDEX [TAB]</span>
        </button>

        <button
          onClick={() => onNavigate("ship")}
          className={`px-3 py-1.5 rounded-sm border text-xs font-mono flex items-center gap-2 transition-all duration-200 ${
            currentView === "ship"
              ? "bg-holo-cyan/20 border-holo-cyan text-holo-cyan shadow-holo-cyan"
              : "bg-surface border-holo-border text-holo-bright hover:border-holo-cyan"
          }`}
        >
          <Ship className="w-3.5 h-3.5" />
          <span>SHIP DECK</span>
        </button>

        <div className="pl-3 border-l border-holo-cyan/20 text-right font-mono text-xs">
          <div className="text-holo-muted text-[10px]">EMBER CYCLE</div>
          <div className="text-holo-amber font-bold">{formatTime(secondsLeft)}</div>
        </div>
      </div>
    </header>
  );
}
