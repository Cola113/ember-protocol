"use client";

import React, { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { PlanetDef, LandingSite } from "@/lib/canon";
import { X, ArrowDown, Radio, Activity, Cpu, User, MapPin, CheckCircle2, Sparkles, Compass, AlertTriangle } from "lucide-react";
import { clientScribeGenerate, ClientScribeResult } from "@/lib/api-client";

interface PlanetSurveyModalProps {
  planet: PlanetDef;
  onClose: () => void;
  onLand: (planet: PlanetDef, site: LandingSite) => void;
  collectedPropositions: string[];
  completedHotspotIds?: string[];
  isDecoded?: boolean;
}

export default function PlanetSurveyModal({
  planet,
  onClose,
  onLand,
  collectedPropositions,
  completedHotspotIds = [],
  isDecoded = false,
}: PlanetSurveyModalProps) {
  const [selectedSite, setSelectedSite] = useState<LandingSite>(
    planet.landing_sites[0] || { id: "default", name: "Orbital Beacon", hotspots: [] }
  );
  const [dossierResult, setDossierResult] = useState<ClientScribeResult | null>(null);
  const [isDossierLoading, setIsDossierLoading] = useState(false);

  const modalRef = useRef<HTMLDivElement>(null);
  const previousActiveElement = useRef<HTMLElement | null>(null);

  useEffect(() => {
    previousActiveElement.current = document.activeElement as HTMLElement | null;
    modalRef.current?.focus();
    return () => {
      previousActiveElement.current?.focus();
    };
  }, []);

  // Fetch Scribe dossier whenever planet or selectedSite changes
  useEffect(() => {
    let isCancelled = false;
    if (!selectedSite || !selectedSite.id) return;

    setIsDossierLoading(true);
    clientScribeGenerate({
      planetId: planet.id,
      landingSiteId: selectedSite.id,
    })
      .then((res) => {
        if (!isCancelled) {
          setDossierResult(res);
          setIsDossierLoading(false);
        }
      })
      .catch(() => {
        if (!isCancelled) {
          setIsDossierLoading(false);
        }
      });

    return () => {
      isCancelled = true;
    };
  }, [planet.id, selectedSite.id]);

  useEffect(() => {
    const handleTab = (e: KeyboardEvent) => {
      if (e.key !== "Tab" || !modalRef.current) return;
      const focusableElements = modalRef.current.querySelectorAll<HTMLElement>(
        'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
      );
      if (focusableElements.length === 0) return;
      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];

      if (e.shiftKey) {
        if (document.activeElement === firstElement || document.activeElement === modalRef.current) {
          e.preventDefault();
          lastElement.focus();
        }
      } else {
        if (document.activeElement === lastElement) {
          e.preventDefault();
          firstElement.focus();
        }
      }
    };
    window.addEventListener("keydown", handleTab);
    return () => window.removeEventListener("keydown", handleTab);
  }, []);

  return (
    <motion.div
      ref={modalRef}
      tabIndex={-1}
      role="dialog"
      aria-modal="true"
      aria-labelledby="planet-survey-title"
      initial={{ opacity: 0, x: 50, scale: 0.98 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 50, scale: 0.98 }}
      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
      className="absolute top-28 inset-x-3 bottom-4 sm:top-32 sm:bottom-16 sm:inset-x-auto sm:right-8 sm:w-full sm:max-w-md holo-panel p-4 sm:p-6 rounded-sm z-50 flex flex-col pointer-events-auto border-holo-cyan/40 shadow-2xl outline-none"
    >
      {/* Header */}
      <div className="flex justify-between items-start border-b border-holo-cyan/15 pb-3 mb-3 sm:mb-4">
        <div>
          <div className="flex items-center gap-2">
            <span
              className="w-3 h-3 rounded-full animate-pulse"
              style={{ backgroundColor: isDecoded ? "#38bdf8" : planet.color, boxShadow: `0 0 8px ${isDecoded ? "#38bdf8" : planet.color}` }}
            />
            <h2 id="planet-survey-title" className="font-display font-bold text-base sm:text-lg text-holo-bright">
              {planet.name}
            </h2>
            {isDecoded ? (
              <span className="text-[10px] px-1.5 py-0.5 bg-holo-cyan/20 border border-holo-cyan/50 text-holo-cyan font-mono rounded-sm flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" />
                <span>已破译</span>
              </span>
            ) : (
              <span className="text-[10px] px-1.5 py-0.5 bg-holo-amber/15 border border-holo-amber/40 text-holo-amber font-mono rounded-sm">
                待破译
              </span>
            )}
          </div>
          <div className="text-xs font-mono text-holo-cyan mt-1 flex items-center gap-1.5">
            <Cpu className="w-3.5 h-3.5" />
            <span>{isDecoded ? planet.true_compute_role : "计算职能：[待确证] 需公证相关真相"}</span>
          </div>
        </div>

        <button
          onClick={onClose}
          aria-label="关闭星球遥测检视窗口"
          className="p-1.5 hover:text-holo-cyan text-holo-muted transition-colors rounded hover:bg-surface-dark min-h-[44px] min-w-[44px] flex items-center justify-center"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Dossier Content Stream */}
      <div className="flex-1 overflow-y-auto space-y-3 pr-1 text-xs font-mono text-slate-300 leading-relaxed mb-3 sm:mb-4">
        {/* Scribe Generated Dossier Section */}
        {isDossierLoading ? (
          <div className="p-3 bg-surface-dark/90 border border-holo-cyan/30 rounded-sm flex items-center gap-2 text-holo-cyan text-xs font-mono animate-pulse">
            <span className="w-2.5 h-2.5 rounded-full border border-holo-cyan border-t-transparent animate-spin" />
            <span>SCRIBE // 正在扫描并重构【{selectedSite.name}】地方志档案...</span>
          </div>
        ) : dossierResult && dossierResult.dossier ? (
          <div className="p-3 bg-surface-dark/85 border border-holo-cyan/30 rounded-sm space-y-2">
            <div className="flex items-center justify-between">
              <div className="text-holo-cyan font-bold flex items-center gap-1.5 text-[11px] tracking-wide">
                <Compass className="w-3.5 h-3.5 text-holo-cyan" />
                <span>{dossierResult.dossier.title || "地方志档案"}</span>
              </div>
              {dossierResult.status === "generated" && (
                <span className="text-[9px] px-1.5 py-0.2 bg-holo-cyan/20 border border-holo-cyan/50 text-holo-cyan rounded-sm">
                  SCRIBE GENERATED
                </span>
              )}
              {dossierResult.status === "cache_hit" && (
                <span className="text-[9px] px-1.5 py-0.2 bg-holo-green/20 border border-holo-green/50 text-holo-green rounded-sm">
                  CACHE HIT
                </span>
              )}
              {dossierResult.degraded && (
                <span className="text-[9px] px-1.5 py-0.2 bg-holo-amber/20 border border-holo-amber/50 text-holo-amber rounded-sm">
                  DEGRADED TEMPLATE
                </span>
              )}
            </div>
            <p className="text-slate-300 text-[11px]">{dossierResult.dossier.summary}</p>

            {/* Today's Event */}
            {dossierResult.dossier.today_event && (
              <div className="p-2 bg-void/50 border border-holo-cyan/15 rounded text-[11px]">
                <div className="text-holo-amber font-semibold flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-holo-amber" />
                  <span>今日事件：{dossierResult.dossier.today_event.title}</span>
                </div>
                <p className="text-slate-400 mt-0.5">{dossierResult.dossier.today_event.description}</p>
              </div>
            )}

            {/* Environment Phenomena & Hazards */}
            {dossierResult.dossier.environment && (
              <div className="space-y-1 text-[10px]">
                <div className="text-slate-400">{dossierResult.dossier.environment.description}</div>
                {dossierResult.dossier.environment.hazards && dossierResult.dossier.environment.hazards.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1">
                    {dossierResult.dossier.environment.hazards.map((h, i) => (
                      <span key={i} className="px-1.5 py-0.5 bg-red-950/40 text-red-300 border border-red-500/30 rounded">
                        ⚠ {h}
                      </span>
                    ))}
                  </div>
                )}
                {dossierResult.dossier.environment.phenomena && dossierResult.dossier.environment.phenomena.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1">
                    {dossierResult.dossier.environment.phenomena.map((ph, i) => (
                      <span key={i} className="px-1.5 py-0.5 bg-cyan-950/40 text-holo-cyan border border-holo-cyan/30 rounded">
                        ✦ {ph}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        ) : null}

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
                  role="button"
                  tabIndex={0}
                  aria-label={`选择降落点：${site.name}`}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      setSelectedSite(site);
                    }
                  }}
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
        className="w-full min-h-[44px] py-3 bg-gradient-to-r from-holo-amber/30 via-holo-amber/20 to-surface border border-holo-amber hover:bg-holo-amber hover:text-void text-holo-amber font-mono text-xs font-bold tracking-widest uppercase flex items-center justify-center gap-2 rounded-sm shadow-holo-amber transition-all duration-200"
      >
        <ArrowDown className="w-4 h-4" />
        <span>执行大气层俯冲降落 (INITIATE DESCENT)</span>
      </button>
    </motion.div>
  );
}
