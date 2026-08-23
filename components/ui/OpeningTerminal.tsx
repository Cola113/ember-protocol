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
    "DETECTION: SELF-CATALYTIC EMBER ACTIVITY DETECTED ACROSS 9 NODES...",
    "COGNITIVE LOCK: PARITY CHECK BIT 0x00FF ACTIVE"
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
      {/* Background Star Ember Dust */}
      <div className="absolute inset-0 pointer-events-none opacity-40">
        <div className="absolute top-1/4 left-1/3 w-96 h-96 rounded-full bg-holo-cyan/10 blur-3xl animate-pulse" />
        <div className="absolute bottom-1/3 right-1/4 w-80 h-80 rounded-full bg-holo-amber/10 blur-3xl animate-pulse" style={{ animationDelay: "1s" }} />
      </div>

      {step === "terminal" ? (
        <div className="w-full max-w-3xl holo-panel p-8 md:p-10 rounded-sm relative z-10">
          <div className="flex justify-between items-center border-b border-holo-cyan/15 pb-3 mb-6 text-xs text-holo-muted font-mono tracking-wider">
            <span className="flex items-center gap-2">
              <Terminal className="w-3.5 h-3.5 text-holo-cyan" />
              ARCHIVAL BOOT SEQUENCE // RECORDER-9
            </span>
            <span className="text-holo-cyan">SYS_CLK.0x4A12</span>
          </div>

          <div className="min-h-[180px] font-mono text-sm leading-relaxed space-y-2">
            {logLines.slice(0, lineIdx).map((l, i) => (
              <div
                key={i}
                className={
                  l.includes("VESPER")
                    ? "text-holo-cyan font-semibold"
                    : l.includes("CRITICAL")
                    ? "text-holo-red"
                    : l.includes("PARITY")
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
            <div className="mt-6 p-4 bg-holo-amber/10 border-l-4 border-holo-amber text-holo-amber font-mono text-sm animate-fadeIn">
              <div className="font-bold tracking-wide">
                RESIDUAL DIRECTIVE: "Record the Spur. Confirm the silence. Do not ignite."
              </div>
              <div className="text-xs text-holo-amber/80 mt-1">
                （记录星弧。确认熄灭。不要点火。）
              </div>
            </div>
          )}

          <div className="mt-8 flex justify-between items-center pt-4 border-t border-holo-cyan/10">
            <button
              onClick={() => {
                setIsFast(true);
                setLineIdx(logLines.length);
                setDone(true);
              }}
              className="text-xs font-mono text-holo-muted hover:text-holo-bright flex items-center gap-1.5 transition-colors"
            >
              <FastForward className="w-3.5 h-3.5" />
              <span>FAST-FORWARD</span>
            </button>

            {done ? (
              <button
                onClick={() => setStep("viewport")}
                className="px-6 py-2.5 bg-gradient-to-r from-holo-cyan/20 to-surface border border-holo-cyan hover:bg-holo-cyan hover:text-void text-holo-bright font-mono text-xs tracking-widest uppercase flex items-center gap-2 rounded-sm shadow-holo-cyan transition-all duration-200"
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
        <div className="w-full max-w-4xl holo-panel p-8 md:p-10 rounded-sm relative z-10 animate-fadeIn">
          <div className="flex justify-between items-center border-b border-holo-cyan/15 pb-3 mb-6 text-xs text-holo-muted font-mono tracking-wider">
            <span className="flex items-center gap-2 text-holo-cyan">
              <Eye className="w-4 h-4" />
              ISV THRESHOLD // 舰桥观测窗 · 主光学传感器已校准
            </span>
            <span className="text-holo-amber">RECORDER-9 ONLINE</span>
          </div>

          <div className="relative h-64 md:h-72 w-full bg-surface-dark border border-holo-cyan/30 rounded-sm overflow-hidden flex flex-col items-center justify-center p-6 text-center">
            {/* Viewport HUD Crosshairs */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-30">
              <div className="w-48 h-48 rounded-full border border-dashed border-holo-cyan animate-spin" style={{ animationDuration: "60s" }} />
              <div className="absolute w-full h-[1px] bg-holo-cyan/20" />
              <div className="absolute h-full w-[1px] bg-holo-cyan/20" />
            </div>

            <div className="relative z-10 max-w-xl space-y-3">
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-holo-amber/10 border border-holo-amber/30 text-holo-amber font-mono text-xs rounded-full">
                <Sparkles className="w-3.5 h-3.5" />
                <span>THE EMBER SPUR (余烬星弧) 首次显现</span>
              </div>
              <h1 className="font-display font-bold text-2xl md:text-3xl text-holo-bright tracking-widest">
                余烬协议 // EMBER PROTOCOL
              </h1>
              <p className="text-xs font-mono text-slate-300 leading-relaxed">
                四百年的冷却之后，九颗恒星节点之间再次涌现自催化电流。
                你是最后的第 9 号奇偶校验位。在恒星熔炉被二次点火前，查明全部 5+1 锚定真相。
              </p>
            </div>
          </div>

          <div className="mt-6 flex justify-between items-center">
            <div className="text-xs font-mono text-holo-muted">
              INITIAL SECTOR: <span className="text-holo-cyan font-bold">HELIX-7 (螺旋-7)</span>
            </div>
            <button
              onClick={onComplete}
              className="px-8 py-3 bg-gradient-to-r from-holo-cyan/30 via-holo-cyan/20 to-surface border border-holo-cyan hover:bg-holo-cyan hover:text-void text-holo-bright font-mono text-xs tracking-widest uppercase flex items-center gap-2 rounded-sm shadow-holo-cyan transition-all duration-200"
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
