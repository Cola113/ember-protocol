"use client";

import React, { useState, useEffect } from "react";
import { ArrowRight, FastForward, Terminal, Eye, Sparkles } from "lucide-react";

interface OpeningTerminalProps {
  onComplete: () => void;
}

export default function OpeningTerminal({ onComplete }: OpeningTerminalProps) {
  const logLines = [
    "CORE LOG // REVISION 9.04.12",
    "VESSEL: ISV THRESHOLD (测绘探针 · 门槛号)",
    "OPERATOR IDENTITY: RECORDER-9 [CODENAME: VESPER / 晚星]",
    "STATUS: AWAKENED FROM 400-YEAR SPUR HIBERNATION",
    "CRITICAL DIAGNOSTIC: 61.8% OF ARCHIVAL MEMORY FRAGMENTED",
    "九座世界沉默着——像一封无人拆开的信，仍留着未散的余温",
    "你带着一台旧档案机，与一句不知是谁留下的指令，重新醒来"
  ];

  const [step, setStep] = useState<"terminal" | "viewport">("terminal");
  const [lineIdx, setLineIdx] = useState(0);
  const [charIdx, setCharIdx] = useState(0);
  const [isFast, setIsFast] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (lineIdx < logLines.length) {
      const currentLine = logLines[lineIdx];
      if (charIdx < currentLine.length) {
        const timer = setTimeout(
          () => setCharIdx((prev) => prev + 1),
          isFast ? 3 : 20
        );
        return () => clearTimeout(timer);
      } else {
        const timer = setTimeout(() => {
          setCharIdx(0);
          setLineIdx((prev) => prev + 1);
        }, isFast ? 10 : 120);
        return () => clearTimeout(timer);
      }
    } else {
      setDone(true);
    }
  }, [lineIdx, charIdx, isFast]);

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center p-6 bg-void/90 backdrop-blur-md overflow-hidden pointer-events-auto animate-fadeIn">
      {/* Background Star Ember Dust & Cockpit Viewport Artwork */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center opacity-30 mix-blend-screen scale-105"
          style={{ backgroundImage: "url('/opening-bg.png')" }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-void via-void/80 to-void/60" />
        <div className="absolute top-1/4 left-1/3 w-96 h-96 rounded-full bg-holo-cyan/10 blur-3xl animate-pulse" />
        <div className="absolute bottom-1/3 right-1/4 w-80 h-80 rounded-full bg-holo-amber/10 blur-3xl animate-pulse" style={{ animationDelay: "1s" }} />
      </div>

      {step === "terminal" ? (
        <div className="w-full max-w-3xl holo-panel p-4 sm:p-8 md:p-10 rounded-sm relative z-10">
          <div className="flex justify-between items-center border-b border-holo-cyan/15 pb-3 mb-4 sm:mb-6 text-xs text-holo-muted font-mono tracking-wider">
            <span className="flex items-center gap-2">
              <Terminal className="w-3.5 h-3.5 text-holo-cyan shrink-0" />
              <span className="truncate">ARCHIVAL BOOT // RECORDER-9</span>
            </span>
            <span className="text-holo-cyan shrink-0">SYS_CLK.0x4A12</span>
          </div>

          <div className="min-h-[160px] sm:min-h-[180px] font-mono text-xs sm:text-sm leading-relaxed space-y-2">
            {logLines.slice(0, lineIdx).map((l, i) => (
              <div
                key={i}
                className={
                  l.includes("VESPER")
                    ? "text-holo-cyan font-semibold"
                    : l.includes("CRITICAL")
                    ? "text-holo-red"
                    : l.includes("档案机")
                    ? "text-holo-amber font-semibold"
                    : "text-holo-bright"
                }
              >
                {l}
              </div>
            ))}
            {lineIdx < logLines.length && (
              <div className="text-holo-bright">
                {logLines[lineIdx].slice(0, charIdx)}
                <span className="inline-block w-2 h-4 bg-holo-cyan align-middle ml-1 animate-pulse" />
              </div>
            )}
          </div>

          {done && (
            <div className="mt-6 p-3 sm:p-4 bg-holo-amber/10 border-l-4 border-holo-amber text-holo-amber font-mono text-xs sm:text-sm animate-fadeIn">
              <div className="font-bold tracking-wide">
                RESIDUAL DIRECTIVE: "Record the Spur. Confirm the silence. Do not ignite."
              </div>
              <div className="text-xs text-holo-amber/80 mt-1">
                （记录星弧。确认熄灭。不要点火。）
              </div>
            </div>
          )}

          <div className="mt-6 sm:mt-8 flex flex-wrap justify-between items-center gap-3 pt-4 border-t border-holo-cyan/10">
            <button
              onClick={() => {
                setIsFast(true);
                setLineIdx(logLines.length);
                setDone(true);
              }}
              className="min-h-[44px] text-xs font-mono text-holo-muted hover:text-holo-bright flex items-center gap-1.5 transition-colors px-2"
            >
              <FastForward className="w-3.5 h-3.5" />
              <span>FAST-FORWARD</span>
            </button>

            {done ? (
              <button
                onClick={() => setStep("viewport")}
                className="w-full sm:w-auto min-h-[44px] px-5 sm:px-6 py-2.5 bg-gradient-to-r from-holo-cyan/20 to-surface border border-holo-cyan hover:bg-holo-cyan hover:text-void text-holo-bright font-mono text-xs tracking-widest uppercase flex items-center justify-center gap-2 rounded-sm shadow-holo-cyan transition-all duration-200"
              >
                <Eye className="w-4 h-4" />
                <span>开启舰桥观察窗 (INITIATE VIEWPORT)</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <div className="text-xs text-holo-muted font-mono animate-pulse">
                INITIALIZING HARDWARE NODES...
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Phase 2: Vessel Observation Viewport Cutscene */
        <div className="w-full max-w-4xl holo-panel p-4 sm:p-8 md:p-10 rounded-sm relative z-10 animate-fadeIn">
          <div className="flex justify-between items-center border-b border-holo-cyan/15 pb-3 mb-4 sm:mb-6 text-xs text-holo-muted font-mono tracking-wider">
            <span className="flex items-center gap-2 text-holo-cyan truncate">
              <Eye className="w-4 h-4 shrink-0" />
              <span>ISV THRESHOLD // 舰桥观测窗</span>
            </span>
            <span className="text-holo-amber shrink-0">RECORDER-9 ONLINE</span>
          </div>

          <div className="relative min-h-[280px] md:h-80 w-full bg-surface-dark border border-holo-cyan/30 rounded-sm overflow-hidden flex flex-col items-center justify-center p-4 sm:p-6 text-center">
            {/* Observation Viewport Window Image Background */}
            <div
              className="absolute inset-0 bg-cover bg-center opacity-75"
              style={{ backgroundImage: "url('/opening-bg.png')" }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-void/90 via-void/50 to-void/70" />

            {/* Viewport HUD Crosshairs & telemetry */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-40">
              <div className="w-56 h-56 rounded-full border border-dashed border-holo-cyan animate-spin" style={{ animationDuration: "60s" }} />
              <div className="absolute w-full h-[1px] bg-holo-cyan/30" />
              <div className="absolute h-full w-[1px] bg-holo-cyan/30" />
            </div>

            <div className="relative z-10 max-w-xl space-y-2 sm:space-y-3 bg-surface-dark/80 p-4 sm:p-5 rounded-sm border border-holo-cyan/20 backdrop-blur-sm shadow-xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-holo-amber/15 border border-holo-amber/30 text-holo-amber font-mono text-[11px] sm:text-xs rounded-full">
                <Sparkles className="w-3.5 h-3.5" />
                <span>THE EMBER SPUR (余烬星弧) 首次显现</span>
              </div>
              <h1 className="font-display font-bold text-xl sm:text-2xl md:text-3xl text-holo-bright tracking-widest drop-shadow">
                余烬协议 // EMBER PROTOCOL
              </h1>
              <p className="text-[11px] sm:text-xs font-mono text-slate-200 leading-relaxed drop-shadow">
                四百年的冷却之后，星弧之上九座世界沉默着，没人记得它们为何熄灭。
                而你的旧档案机，刚刚从睡梦中醒来。
              </p>
            </div>
          </div>

          <div className="mt-4 sm:mt-6 flex flex-col sm:flex-row justify-between items-center gap-3">
            <div className="text-xs font-mono text-holo-muted text-center sm:text-left">
              INITIAL SECTOR: <span className="text-holo-cyan font-bold">HELIX-7 (螺旋-7)</span>
            </div>
            <button
              onClick={onComplete}
              className="w-full sm:w-auto min-h-[44px] px-6 sm:px-8 py-3 bg-gradient-to-r from-holo-cyan/30 via-holo-cyan/20 to-surface border border-holo-cyan hover:bg-holo-cyan hover:text-void text-holo-bright font-mono text-xs tracking-widest uppercase flex items-center justify-center gap-2 rounded-sm shadow-holo-cyan transition-all duration-200"
            >
              <span>接入星弧测绘总线 (ENTER GALAXY MAP)</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
