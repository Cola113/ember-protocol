"use client";

import React, { useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { CANON, AnchorTruth } from "@/lib/canon";
import { Sparkles, Globe, ShieldCheck, ArrowRight, Activity, AlertTriangle } from "lucide-react";

interface TruthUnlockOverlayProps {
  truth: AnchorTruth;
  onProceed: () => void;
  canResolveEnding?: boolean;
}

export default function TruthUnlockOverlay({
  truth,
  onProceed,
  canResolveEnding = false,
}: TruthUnlockOverlayProps) {
  const onProceedRef = useRef(onProceed);
  onProceedRef.current = onProceed;
  const buttonRef = useRef<HTMLButtonElement>(null);

  const isHiddenTruth = truth.id === "THidden";
  const shouldDirectToEnding = isHiddenTruth && canResolveEnding;

  const unlockedPlanetDefs = CANON.planets.filter((p) =>
    truth.unlocked_planets.includes(p.id)
  );

  const previousActiveElement = useRef<HTMLElement | null>(null);

  useEffect(() => {
    previousActiveElement.current = document.activeElement as HTMLElement | null;
    // Auto-focus proceed button for keyboard accessibility
    buttonRef.current?.focus();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onProceedRef.current();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      previousActiveElement.current?.focus();
    };
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 1.05 }}
      transition={{ duration: 0.4 }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="truth-unlock-title"
      className="fixed inset-0 z-50 bg-void/90 backdrop-blur-xl flex flex-col items-center justify-center p-6 overflow-hidden pointer-events-auto"
    >
      {/* Holographic Radial Burst Effect */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="w-[800px] h-[800px] rounded-full bg-gradient-to-r from-holo-amber/20 via-holo-cyan/10 to-transparent blur-3xl animate-pulse" />
        <div
          className="absolute w-[500px] h-[500px] rounded-full border border-holo-amber/40 animate-ping"
          style={{ animationDuration: "3s" }}
        />
        <div
          className="absolute w-[700px] h-[700px] rounded-full border border-holo-cyan/20 animate-spin"
          style={{ animationDuration: "40s" }}
        />
      </div>

      <div className="relative z-10 max-w-2xl w-full holo-panel p-8 md:p-10 rounded-sm border-holo-amber/60 shadow-holo-amber">
        {/* Top Header Badge */}
        <div className="flex justify-between items-center border-b border-holo-cyan/20 pb-4 mb-6">
          <div className="flex items-center gap-2 text-holo-amber font-mono font-bold text-xs tracking-widest uppercase">
            <Sparkles className="w-4 h-4 animate-spin" />
            <span>
              {isHiddenTruth
                ? "HIDDEN TRUTH INTEGRATION // 终极自我认知闭环"
                : "ANCHOR TRUTH BELIEVED // 锚定真相确证"}
            </span>
          </div>
          <div className="px-2.5 py-0.5 bg-holo-green/20 border border-holo-green text-holo-green font-mono text-[11px] rounded-sm flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>STATE: BELIEVED</span>
          </div>
        </div>

        {/* Truth Title & Code */}
        <div className="mb-4">
          <div className="text-xs font-mono text-holo-cyan tracking-wider">
            {truth.id} // {truth.code}
          </div>
          <h2
            id="truth-unlock-title"
            className="font-display font-bold text-2xl md:text-3xl text-holo-bright mt-1"
          >
            {truth.title}
          </h2>
        </div>

        {/* Truth Narrative Summary */}
        <div className="p-4 bg-surface-dark/90 border-l-4 border-holo-amber text-xs md:text-sm font-mono text-slate-200 leading-relaxed mb-6">
          <div className="font-bold text-holo-amber mb-1">【正典认知写回】</div>
          <p>{truth.summary}</p>
        </div>

        {/* Unlocked Planets Grid (if any) */}
        {unlockedPlanetDefs.length > 0 && (
          <div className="mb-6">
            <div className="text-xs font-mono text-holo-cyan font-bold uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <Globe className="w-4 h-4" />
              <span>星图拓展 // 新计算节点已解锁 ({unlockedPlanetDefs.length})</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {unlockedPlanetDefs.map((planet) => (
                <div
                  key={planet.id}
                  className="p-3.5 bg-surface-dark/80 border border-holo-cyan/30 rounded-sm flex items-center gap-3"
                >
                  <div
                    className="w-3.5 h-3.5 rounded-full animate-pulse shadow-sm"
                    style={{
                      backgroundColor: planet.color,
                      boxShadow: `0 0 10px ${planet.color}`,
                    }}
                  />
                  <div>
                    <div className="font-bold text-xs text-holo-bright">{planet.name}</div>
                    <div className="text-[10px] text-holo-cyan font-mono">
                      {planet.true_compute_role}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Parity Bit Memory Progression */}
        <div className="flex items-center justify-between p-3 bg-holo-cyan/5 border border-holo-cyan/20 rounded-sm text-xs font-mono mb-8">
          <div className="flex items-center gap-2 text-holo-bright">
            <Activity className="w-4 h-4 text-holo-cyan" />
            <span>RECORDER-9 核心记忆校验完整度：</span>
          </div>
          <div className="text-holo-amber font-bold">
            {shouldDirectToEnding ? (
              <span className="text-holo-green text-sm">100.0% (全域收敛)</span>
            ) : (
              <>
                38.2% → <span className="text-holo-green text-sm">48.5%</span> (+10.3%)
              </>
            )}
          </div>
        </div>

        {/* Action Button */}
        <button
          ref={buttonRef}
          onClick={onProceed}
          className="w-full py-3.5 bg-gradient-to-r from-holo-amber/30 via-holo-amber/20 to-surface border border-holo-amber hover:bg-holo-amber hover:text-void text-holo-amber font-mono text-xs font-bold tracking-widest uppercase flex items-center justify-center gap-2 rounded-sm shadow-holo-amber transition-all duration-200 outline-none focus:ring-2 focus:ring-holo-amber"
        >
          {shouldDirectToEnding ? (
            <>
              <span>启动全域终局决议 (PROCEED TO RESOLUTION PROTOCOL)</span>
              <AlertTriangle className="w-4 h-4" />
            </>
          ) : (
            <>
              <span>接入新解锁星区 · 返回星系拓扑 (PROCEED TO GALAXY MAP)</span>
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      </div>
    </motion.div>
  );
}
