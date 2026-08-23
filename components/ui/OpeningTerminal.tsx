"use client";

import React, { useState, useEffect } from "react";
import { ArrowRight, FastForward } from "lucide-react";

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
    "DETECTION: SELF-CATALYTIC EMBER ACTIVITY DETECTED ACROSS 9 NODES..."
  ];

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
          isFast ? 4 : 22
        );
        return () => clearTimeout(timer);
      } else {
        const timer = setTimeout(() => {
          setCharIdx(0);
          setLineIdx((prev) => prev + 1);
        }, isFast ? 15 : 150);
        return () => clearTimeout(timer);
      }
    } else {
      setDone(true);
    }
  }, [lineIdx, charIdx, isFast]);

  return (
    <div className="absolute inset-0 z-40 flex items-center justify-center p-6 bg-void/85 backdrop-blur-md">
      <div className="w-full max-w-3xl holo-panel p-8 md:p-10 rounded-sm relative">
        <div className="flex justify-between items-center border-b border-holo-cyan/15 pb-3 mb-6 text-xs text-holo-muted font-mono tracking-wider">
          <span>ARCHIVAL BOOT SEQUENCE // RECORDER-9</span>
          <span className="text-holo-cyan">SYS_CLK.0x4A12</span>
        </div>

        <div className="min-h-[160px] font-mono text-sm leading-relaxed space-y-2">
          {logLines.slice(0, lineIdx).map((l, i) => (
            <div
              key={i}
              className={
                l.includes("VESPER")
                  ? "text-holo-cyan font-semibold"
                  : l.includes("CRITICAL")
                  ? "text-holo-red"
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
            onClick={() => setIsFast(true)}
            className="text-xs font-mono text-holo-muted hover:text-holo-bright flex items-center gap-1.5 transition-colors"
          >
            <FastForward className="w-3.5 h-3.5" />
            <span>FAST-FORWARD</span>
          </button>

          {done ? (
            <button
              onClick={onComplete}
              className="px-6 py-2.5 bg-gradient-to-r from-holo-cyan/20 to-surface border border-holo-cyan hover:bg-holo-cyan hover:text-void text-holo-bright font-mono text-xs tracking-widest uppercase flex items-center gap-2 rounded-sm shadow-holo-cyan transition-all duration-200"
            >
              <span>接入星弧测绘总线</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <div className="text-xs text-holo-muted font-mono animate-pulse">
              INITIALIZING HARDWARE NODES...
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
