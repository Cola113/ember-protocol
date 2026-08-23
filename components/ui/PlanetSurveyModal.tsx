"use client";

import React, { useState } from "react";
import { PlanetDef, LandingSite } from "@/lib/canon";
import { X, ArrowDown, Radio, Activity, Cpu, User, MapPin, CheckCircle2 } from "lucide-react";

interface PlanetSurveyModalProps {
  planet: PlanetDef;
  onClose: () => void;
  onLand: (planet: PlanetDef, site: LandingSite) => void;
  collectedPropositions: string[];
  completedHotspotIds?: string[];
}

export default function PlanetSurveyModal({
  planet,
  onClose,
  onLand,
  collectedPropositions,
  completedHotspotIds = [],
}: PlanetSurveyModalProps) {
  const [selectedSite, setSelectedSite] = useState<LandingSite>(
    planet.landing_sites[0] || { id: "default", name: "Orbital Beacon", hotspots: [] }
  );

  return (
    <div className="absolute top-20 right-8 bottom-16 w-full max-w-md holo-panel p-6 rounded-sm z-40 flex flex-col pointer-events-auto animate-fadeIn border-holo-cyan/40 shadow-2xl">
      {/* Header */}
      <div className="flex justify-between items-start border-b border-holo-cyan/15 pb-3 mb-4">
        <div>
          <div className="flex items-center gap-2">
            <span
              className="w-3 h-3 rounded-full animate-pulse"
              style={{ backgroundColor: planet.color, boxShadow: `0 0 8px ${planet.color}` }}
            />
            <h2 className="font-display font-bold text-lg text-holo-bright">
              {planet.name}
            </h2>
          </div>
          <div className="text-xs font-mono text-holo-cyan mt-1 flex items-center gap-1.5">
            <Cpu className="w-3.5 h-3.5" />
            <span>{planet.true_compute_role}</span>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-1 hover:text-holo-cyan text-holo-muted transition-colors rounded hover:bg-surface-dark"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Dossier Content Stream */}
      <div className="flex-1 overflow-y-auto space-y-3.5 pr-1 text-xs font-mono text-slate-300 leading-relaxed mb-4">
        {/* Apparent Civilization */}
        <div className="p-3 bg-surface-dark/70 border border-holo-cyan/15 rounded-sm">
          <div className="text-holo-amber font-bold flex items-center gap-1.5 mb-1 text-[11px] tracking-wide">
            <Radio className="w-3.5 h-3.5 text-holo-amber" />
            <span>表象文明与历史记录 (SURFACE APPARENT RECORD)</span>
          </div>
          <p className="text-slate-300">{planet.apparent_civilization}</p>
        </div>

        {/* Believed Extinction Illusion */}
        <div className="p-3 bg-surface-dark/70 border border-holo-cyan/15 rounded-sm">
          <div className="text-holo-muted font-bold flex items-center gap-1.5 mb-1 text-[11px] tracking-wide">
            <Activity className="w-3.5 h-3.5 text-holo-red" />
            <span>深信的灭绝假象 (EXTINCTION NARRATIVE)</span>
          </div>
          <p className="text-slate-300">{planet.believed_extinction}</p>
        </div>

        {/* Anchor NPC / Echo Signature */}
        {planet.anchor_npc && (
          <div className="p-3 bg-surface-dark/70 border border-purple-500/30 rounded-sm">
            <div className="text-purple-300 font-bold flex items-center gap-1.5 mb-1 text-[11px]">
              <User className="w-3.5 h-3.5 text-purple-400" />
              <span>侦测到锚定残响: {planet.anchor_npc.name}</span>
            </div>
            <div className="text-[11px] text-slate-400">
              【身份】：{planet.anchor_npc.role}
            </div>
            <p className="text-slate-300 mt-1">{planet.anchor_npc.personality}</p>
          </div>
        )}

        {/* Landing Sites Selector */}
        <div className="pt-2">
          <div className="text-[11px] text-holo-cyan font-bold uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5" />
            <span>LANDING ZONES // 可选着陆热区 ({planet.landing_sites.length})</span>
          </div>
          <div className="space-y-2">
            {planet.landing_sites.map((site) => {
              const isSiteFullyExplored =
                site.hotspots.length > 0 &&
                site.hotspots.every(
                  (h) =>
                    completedHotspotIds.includes(h.id) ||
                    (h.proposition && collectedPropositions.includes(h.proposition))
                );

              return (
                <div
                  key={site.id}
                  onClick={() => setSelectedSite(site)}
                  className={`p-3 rounded-sm border cursor-pointer transition-all duration-200 ${
                    selectedSite.id === site.id
                      ? "bg-holo-cyan/20 border-holo-cyan text-holo-bright shadow-holo-cyan"
                      : "bg-surface-dark/50 border-holo-border text-slate-300 hover:border-holo-cyan/50"
                  }`}
                >
                  <div className="flex justify-between items-center">
                    <div className="font-bold text-xs text-holo-bright">{site.name}</div>
                    {isSiteFullyExplored && (
                      <span className="inline-flex items-center gap-1 text-[10px] text-holo-green bg-holo-green/10 px-1.5 py-0.5 rounded border border-holo-green/30">
                        <CheckCircle2 className="w-3 h-3" />
                        <span>COMPLETED</span>
                      </span>
                    )}
                  </div>
                  <div className="text-[10px] text-holo-muted mt-1">
                    热点分布: {site.hotspots.map((h) => h.name).join(" · ")}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Landing Action Button */}
      <button
        onClick={() => onLand(planet, selectedSite)}
        className="w-full py-3 bg-gradient-to-r from-holo-amber/30 via-holo-amber/20 to-surface border border-holo-amber hover:bg-holo-amber hover:text-void text-holo-amber font-mono text-xs tracking-widest uppercase flex items-center justify-center gap-2 rounded-sm shadow-holo-amber transition-all duration-200"
      >
        <ArrowDown className="w-4 h-4" />
        <span>执行大气层俯冲降落 (INITIATE DESCENT)</span>
      </button>
    </div>
  );
}
