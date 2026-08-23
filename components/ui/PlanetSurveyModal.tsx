"use client";

import React, { useState } from "react";
import { PlanetDef, LandingSite } from "@/lib/canon";
import { X, ArrowDown, Radio, Activity } from "lucide-react";

interface PlanetSurveyModalProps {
  planet: PlanetDef;
  onClose: () => void;
  onLand: (planet: PlanetDef, site: LandingSite) => void;
}

export default function PlanetSurveyModal({
  planet,
  onClose,
  onLand,
}: PlanetSurveyModalProps) {
  const [selectedSite, setSelectedSite] = useState<LandingSite>(
    planet.landing_sites[0] || { id: "default", name: "Orbital Beacon", hotspots: [] }
  );

  return (
    <div className="absolute top-20 right-8 bottom-16 w-full max-w-md holo-panel p-6 rounded-sm z-40 flex flex-col pointer-events-auto animate-fadeIn">
      {/* Header */}
      <div className="flex justify-between items-start border-b border-holo-cyan/15 pb-3 mb-4">
        <div>
          <div className="font-display font-bold text-lg text-holo-bright">
            {planet.name}
          </div>
          <div className="text-xs font-mono text-holo-cyan mt-0.5">
            {planet.true_compute_role}
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-1 hover:text-holo-cyan text-holo-muted transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Dossier Content Stream */}
      <div className="flex-1 overflow-y-auto space-y-4 pr-1 text-xs font-mono text-slate-300 leading-relaxed mb-4">
        <div className="p-3 bg-surface-dark/60 border border-holo-cyan/10 rounded-sm">
          <div className="text-holo-amber font-bold flex items-center gap-1.5 mb-1">
            <Radio className="w-3.5 h-3.5" />
            <span>表象文明与史料</span>
          </div>
          <p>{planet.apparent_civilization}</p>
        </div>

        <div className="p-3 bg-surface-dark/60 border border-holo-cyan/10 rounded-sm">
          <div className="text-holo-muted font-bold flex items-center gap-1.5 mb-1">
            <Activity className="w-3.5 h-3.5" />
            <span>深信的灭绝假象</span>
          </div>
          <p>{planet.believed_extinction}</p>
        </div>

        {planet.anchor_npc && (
          <div className="p-3 bg-surface-dark/60 border border-purple-500/20 rounded-sm">
            <div className="text-purple-400 font-bold mb-1">
              侦测到残响签名: {planet.anchor_npc.name}
            </div>
            <p className="text-slate-400">{planet.anchor_npc.personality}</p>
          </div>
        )}

        {/* Landing Sites Selector */}
        <div className="mt-4">
          <div className="text-[11px] text-holo-muted font-bold uppercase tracking-wider mb-2">
            LANDING ZONES // 可选着陆热区 ({planet.landing_sites.length})
          </div>
          <div className="space-y-2">
            {planet.landing_sites.map((site) => (
              <div
                key={site.id}
                onClick={() => setSelectedSite(site)}
                className={`p-3 rounded-sm border cursor-pointer transition-all duration-200 ${
                  selectedSite.id === site.id
                    ? "bg-holo-cyan/15 border-holo-cyan text-holo-bright shadow-holo-cyan"
                    : "bg-surface-dark/40 border-holo-border text-holo-muted hover:border-holo-cyan/50"
                }`}
              >
                <div className="font-bold text-xs">{site.name}</div>
                <div className="text-[10px] text-slate-400 mt-0.5">
                  HOTSPOTS: {site.hotspots.map((h) => h.name).join(" · ")}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Actions */}
      <button
        onClick={() => onLand(planet, selectedSite)}
        className="w-full py-3 bg-gradient-to-r from-holo-amber/20 to-surface border border-holo-amber hover:bg-holo-amber hover:text-void text-holo-amber font-mono text-xs tracking-widest uppercase flex items-center justify-center gap-2 rounded-sm shadow-holo-amber transition-all duration-200"
      >
        <ArrowDown className="w-4 h-4" />
        <span>执行大气层俯冲降落</span>
      </button>
    </div>
  );
}
