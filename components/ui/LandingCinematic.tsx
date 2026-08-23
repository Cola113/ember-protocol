"use client";

import React, { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { PlanetDef, LandingSite } from "@/lib/canon";
import { Radio, Zap, ShieldAlert, FastForward, CheckCircle2 } from "lucide-react";

interface LandingCinematicProps {
  planet: PlanetDef;
  site: LandingSite;
  onComplete: () => void;
}

export default function LandingCinematic({
  planet,
  site,
  onComplete,
}: LandingCinematicProps) {
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  const [phase, setPhase] = useState<number>(0);
  const [altitude, setAltitude] = useState<number>(180);
  const [heat, setHeat] = useState<number>(240);

  useEffect(() => {
    // Altitude descent loop
    const altInterval = setInterval(() => {
      setAltitude((prev) => {
        if (prev <= 0) return 0;
        const step = prev > 50 ? 4 : prev > 10 ? 2 : 0.5;
        return Math.max(0, parseFloat((prev - step).toFixed(1)));
      });
    }, 50);

    // Phase progression
    const t1 = setTimeout(() => setPhase(1), 1200); // Atmospheric burn
    const t2 = setTimeout(() => setPhase(2), 2600); // Radar locking & thruster burn
    const t3 = setTimeout(() => setPhase(3), 4200); // Touchdown
    const t4 = setTimeout(() => onCompleteRef.current(), 5400); // Auto complete

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === " " || e.key === "Escape" || e.key === "Enter") {
        onCompleteRef.current();
      }
    };
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      clearInterval(altInterval);
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  useEffect(() => {
    if (phase === 1) {
      setHeat(1850);
    } else if (phase === 2) {
      setHeat(720);
    } else if (phase === 3) {
      setHeat(80);
    }
  }, [phase]);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 1.02 }}
      transition={{ duration: 0.4 }}
      className="fixed inset-0 z-50 bg-void flex flex-col justify-between p-8 overflow-hidden pointer-events-auto"
    >
      {/* Background Plasma Shimmer & Holographic Grid */}
      <div
        className={`absolute inset-0 transition-opacity duration-700 pointer-events-none ${
          phase === 1
            ? "bg-gradient-to-b from-holo-amber/15 via-red-950/20 to-void opacity-100"
            : phase === 2
            ? "bg-gradient-to-b from-holo-cyan/10 via-slate-900/40 to-void opacity-90"
            : "bg-void/90 opacity-100"
        }`}
      />

      {/* Atmospheric Entry Shockwaves */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none overflow-hidden">
        <div
          className={`w-[600px] h-[600px] rounded-full border border-holo-cyan/30 transition-transform duration-1000 ${
            phase === 1
              ? "scale-150 border-holo-amber/50 animate-ping"
              : phase === 2
              ? "scale-125 border-holo-cyan/40 animate-pulse"
              : "scale-100 border-holo-cyan/20"
          }`}
        />
        <div className="absolute w-[400px] h-[400px] rounded-full border border-holo-cyan/20 animate-spin" style={{ animationDuration: "20s" }} />
      </div>

      {/* Top Telemetry Header */}
      <div className="relative z-10 flex justify-between items-center border-b border-holo-cyan/20 pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-surface-dark border border-holo-cyan/40 rounded-sm text-holo-cyan animate-pulse">
            <Radio className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs font-mono text-holo-muted">DESCENT VECTOR INITIATED</div>
            <div className="font-display font-bold text-lg tracking-wider text-holo-bright">
              {planet.name} // {site.name}
            </div>
          </div>
        </div>

        <button
          onClick={onComplete}
          className="px-4 py-2 bg-surface border border-holo-border hover:border-holo-cyan text-holo-muted hover:text-holo-bright font-mono text-xs flex items-center gap-2 rounded-sm transition-all"
        >
          <FastForward className="w-3.5 h-3.5" />
          <span>SKIP SEQUENCE [SPACE]</span>
        </button>
      </div>

      {/* Center Flight Computer Radar */}
      <div className="relative z-10 my-auto max-w-2xl mx-auto w-full holo-panel p-8 rounded-sm">
        <div className="flex justify-between items-center text-xs font-mono border-b border-holo-cyan/15 pb-3 mb-6">
          <span className="text-holo-cyan font-bold flex items-center gap-2">
            <Zap className="w-3.5 h-3.5" />
            TELEMETRY FLIGHT COMPUTER
          </span>
          <span className="text-holo-amber">STATUS: {phase === 0 ? "DE-ORBIT BURN" : phase === 1 ? "IONIZATION ENTRY" : phase === 2 ? "TERRAIN PULL-UP" : "TOUCHDOWN CONFIRMED"}</span>
        </div>

        {/* Dynamic Telemetry Stats Grid */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="p-3 bg-surface-dark/80 border border-holo-cyan/15 rounded-sm">
            <div className="text-[10px] text-holo-muted font-mono">ALTITUDE (km)</div>
            <div className="text-2xl font-mono font-bold text-holo-bright mt-1">
              {altitude.toFixed(1)} <span className="text-xs font-normal text-holo-cyan">km</span>
            </div>
          </div>

          <div className="p-3 bg-surface-dark/80 border border-holo-cyan/15 rounded-sm">
            <div className="text-[10px] text-holo-muted font-mono">HEAT SHIELD (°C)</div>
            <div className={`text-2xl font-mono font-bold mt-1 ${heat > 1000 ? "text-holo-amber animate-pulse" : "text-holo-bright"}`}>
              {heat} <span className="text-xs font-normal text-holo-muted">°C</span>
            </div>
          </div>

          <div className="p-3 bg-surface-dark/80 border border-holo-cyan/15 rounded-sm">
            <div className="text-[10px] text-holo-muted font-mono">ATMOSPHERE DENSITY</div>
            <div className="text-2xl font-mono font-bold text-holo-cyan mt-1">
              {phase === 0 ? "0.02" : phase === 1 ? "1.45" : "1.82"} <span className="text-xs font-normal text-holo-muted">bar</span>
            </div>
          </div>
        </div>

        {/* Phase Log Terminal */}
        <div className="space-y-2 font-mono text-xs bg-surface-dark/95 p-4 rounded-sm border border-holo-cyan/20">
          <div className="text-holo-cyan flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-holo-cyan animate-ping" />
            [T-{altitude > 0 ? (altitude * 0.1).toFixed(1) : "0.0"}s] ISV THRESHOLD 测绘探针进入亚轨道切入角...
          </div>
          {phase >= 1 && (
            <div className="text-holo-amber flex items-center gap-2">
              <ShieldAlert className="w-3.5 h-3.5 text-holo-amber" />
              大气等离子体电离层摩擦：偏转护盾已张开，吸收热通量 98.4%
            </div>
          )}
          {phase >= 2 && (
            <div className="text-holo-bright flex items-center gap-2">
              <Radio className="w-3.5 h-3.5 text-holo-cyan" />
              地形多普勒雷达锁定目标着陆场：【{site.name}】—— 反推制动矢量喷管点火
            </div>
          )}
          {phase >= 3 && (
            <div className="text-holo-green flex items-center gap-2 font-bold">
              <CheckCircle2 className="w-3.5 h-3.5 text-holo-green" />
              着陆架接触地表岩层。探针气闸泄压，展开 40×40m 地表虚拟戏台。
            </div>
          )}
        </div>

        {/* Altitude Progress Bar */}
        <div className="mt-6">
          <div className="flex justify-between text-[10px] font-mono text-holo-muted mb-1">
            <span>ORBIT (180 km)</span>
            <span>ENTRY (60 km)</span>
            <span>SURFACE (0 km)</span>
          </div>
          <div className="w-full h-2 bg-surface-dark border border-holo-cyan/30 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-holo-amber via-holo-cyan to-holo-green transition-all duration-100 ease-out"
              style={{ width: `${Math.min(100, Math.max(0, ((180 - altitude) / 180) * 100))}%` }}
            />
          </div>
        </div>
      </div>

      {/* Bottom Status */}
      <div className="relative z-10 flex justify-between items-center text-xs font-mono text-holo-muted border-t border-holo-cyan/15 pt-4">
        <span>VESPER AUTONOMOUS DESCENT ENGINE v9.4</span>
        <span className="text-holo-cyan">TARGET GRAVITY: {planet.category === "author" ? "0.88g" : "1.12g"}</span>
      </div>
    </motion.div>
  );
}
