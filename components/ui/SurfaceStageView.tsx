"use client";

import React, { useState } from "react";
import { PlanetDef, LandingSite } from "@/lib/canon";
import { CANON_DIALOGUES, NPCDialogueTree } from "@/lib/dialogues";
import {
  ArrowLeft,
  MessageSquare,
  Search,
  Cog,
  Check,
  Sparkles,
  Radio,
  Sliders,
  Flame,
  User,
  ShieldAlert,
  ArrowRight,
  Eye,
  Activity,
  Layers,
  Terminal,
  Compass,
  Cpu,
  Key,
  Database,
  Lock,
  Unlock,
  Volume2,
  FileCode,
} from "lucide-react";

interface SurfaceStageViewProps {
  planet: PlanetDef;
  site: LandingSite;
  onReturnOrbit: () => void;
  onCollectProposition: (code: string, text: string) => void;
  collectedPropositions: string[];
}

type Hotspot = LandingSite["hotspots"][number];

export default function SurfaceStageView({
  planet,
  site,
  onReturnOrbit,
  onCollectProposition,
  collectedPropositions,
}: SurfaceStageViewProps) {
  const [activeModal, setActiveModal] = useState<Hotspot | null>(null);
  const [dialogueStep, setDialogueStep] = useState(0);

  // Interactive states for Operative & Inspect puzzles
  // Helix-7
  const [antennaAzimuth, setAntennaAzimuth] = useState(45);
  // Kiln
  const [mutexRoute, setMutexRoute] = useState<"A" | "B" | "MUTEX_LOCKED">("A");
  // Glass Orchard
  const [lensElevation, setLensElevation] = useState(30);
  const [prismRefraction, setPrismRefraction] = useState(1.2);
  // Choir Well
  const [organPitchHz, setOrganPitchHz] = useState(436);
  // Needle
  const [needleTheta, setNeedleTheta] = useState(65);
  const [laserAligned, setLaserAligned] = useState(false);
  // Marrow
  const [tensorStimulation, setTensorStimulation] = useState(20);
  // Blind Sun
  const [mirrorScrapedPercent, setMirrorScrapedPercent] = useState(10);
  // Cinder Court
  const [sandboxRevealed, setSandboxRevealed] = useState(false);
  // Black Interval
  const [socketSyncIndex, setSocketSyncIndex] = useState(0);

  const handleHotspotClick = (hotspot: Hotspot) => {
    setActiveModal(hotspot);
    setDialogueStep(0);
  };

  const isAntennaAligned = Math.abs(antennaAzimuth - 180) < 10;
  const isLensFocused = Math.abs(lensElevation - 68) < 6 && prismRefraction >= 1.6;
  const isOrganTuned = organPitchHz === 442 || Math.abs(organPitchHz - 442) <= 1;
  const isNeedleLocked = Math.abs(needleTheta - 128) < 8;
  const isTensorSaturated = tensorStimulation >= 90;
  const isMirrorCleared = mirrorScrapedPercent >= 80;

  // Retrieve dialogue tree for dialogue hotspots
  const getDialogueTree = (hotspot: Hotspot): NPCDialogueTree | null => {
    const npcId = hotspot.npc_id || planet.anchor_npc?.id;
    if (npcId && CANON_DIALOGUES[npcId]) {
      return CANON_DIALOGUES[npcId];
    }
    return null;
  };

  return (
    <div className="relative w-full h-full flex flex-col justify-between p-4 md:p-8 z-30 pointer-events-auto animate-fadeIn overflow-hidden">
      {/* Top Banner Navigation */}
      <div className="flex justify-between items-center gap-4">
        <button
          onClick={onReturnOrbit}
          className="px-4 py-2 bg-surface border border-holo-border hover:border-holo-cyan text-holo-bright text-xs font-mono flex items-center gap-2 rounded-sm transition-all shadow-md"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>RETURN TO ORBIT [ESC]</span>
        </button>

        <div className="holo-panel px-6 py-2 rounded-sm text-center border-holo-cyan/30">
          <div className="font-display font-bold text-sm text-holo-bright flex items-center justify-center gap-2">
            <span
              className="w-2.5 h-2.5 rounded-full animate-pulse"
              style={{ backgroundColor: planet.color, boxShadow: `0 0 8px ${planet.color}` }}
            />
            <span>{planet.name} // {site.name}</span>
          </div>
          <div className="text-[10px] font-mono text-holo-cyan mt-0.5 tracking-wider">
            SURFACE MESH TELEMETRY // SECTOR 40×40m ACTIVE
          </div>
        </div>

        <div className="px-3.5 py-1.5 bg-surface border border-holo-border rounded-sm text-xs font-mono text-holo-amber flex items-center gap-2">
          <Sparkles className="w-3.5 h-3.5" />
          <span>PROPOSITIONS: {collectedPropositions.length} PINNED</span>
        </div>
      </div>

      {/* Surface Hotspots Grid */}
      <div className="my-auto max-w-4xl mx-auto w-full grid grid-cols-1 md:grid-cols-2 gap-5 md:gap-6 py-4">
        {site.hotspots.map((hs) => {
          const isCollected = hs.proposition && collectedPropositions.includes(hs.proposition);
          return (
            <div
              key={hs.id}
              onClick={() => handleHotspotClick(hs)}
              className={`holo-panel p-5 md:p-6 rounded-sm cursor-pointer transition-all duration-300 group flex flex-col justify-between border ${
                isCollected
                  ? "border-holo-green/40 hover:border-holo-green shadow-sm"
                  : "border-holo-cyan/25 hover:border-holo-cyan hover:shadow-holo-cyan"
              }`}
            >
              <div>
                <div className="flex justify-between items-start mb-3.5">
                  <div
                    className={`p-3 rounded-sm border transition-colors ${
                      hs.type === "dialogue"
                        ? "bg-purple-950/40 border-purple-500/40 text-purple-300 group-hover:text-purple-200"
                        : hs.type === "operate"
                        ? "bg-amber-950/40 border-amber-500/40 text-holo-amber group-hover:text-amber-300"
                        : "bg-surface-dark border-holo-cyan/30 text-holo-cyan group-hover:text-cyan-200"
                    }`}
                  >
                    {hs.type === "dialogue" ? (
                      <MessageSquare className="w-5 h-5" />
                    ) : hs.type === "operate" ? (
                      <Cog className="w-5 h-5" />
                    ) : (
                      <Search className="w-5 h-5" />
                    )}
                  </div>
                  {isCollected ? (
                    <span className="inline-flex items-center gap-1 text-[10px] font-mono text-holo-green bg-holo-green/10 px-2 py-0.5 rounded border border-holo-green/40">
                      <Check className="w-3 h-3" />
                      <span>LOGGED & PINNED</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[10px] font-mono text-holo-amber bg-holo-amber/10 px-2 py-0.5 rounded border border-holo-amber/30 animate-pulse">
                      <span>UNEXPLORED</span>
                    </span>
                  )}
                </div>

                <div className="font-bold text-base text-holo-bright mb-1.5 group-hover:text-holo-cyan transition-colors">
                  {hs.name}
                </div>
                <div className="text-xs text-holo-muted font-mono uppercase tracking-wider">
                  INTERACTION: {hs.type} MODE
                </div>
              </div>

              <div className="mt-5 pt-3 border-t border-holo-cyan/15 flex justify-between items-center text-xs font-mono text-holo-cyan">
                <span className="group-hover:translate-x-1 transition-transform inline-flex items-center gap-1.5">
                  [ENGAGE NODE]
                  <ArrowRight className="w-3.5 h-3.5" />
                </span>
                <span className="text-holo-muted text-[10px]">
                  {hs.proposition ? hs.proposition : "ECHO DIALOGUE"}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Interactive Modal (Inspect / Operate / Dialogue) */}
      {activeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-6 bg-void/85 backdrop-blur-md animate-fadeIn">
          <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto holo-panel p-5 md:p-7 rounded-sm relative border-holo-cyan/40 shadow-2xl">
            {/* Modal Header */}
            <div className="flex justify-between items-start border-b border-holo-cyan/20 pb-3 mb-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-holo-amber font-mono text-xs font-bold">
                    [{activeModal.type.toUpperCase()}]
                  </span>
                  <h3 className="font-display font-bold text-lg text-holo-bright">
                    {activeModal.name}
                  </h3>
                </div>
                <div className="text-xs font-mono text-holo-cyan mt-0.5">
                  {planet.name} · {site.name}
                </div>
              </div>
              <button
                onClick={() => setActiveModal(null)}
                className="text-holo-muted hover:text-holo-bright p-1 text-sm rounded hover:bg-surface-dark"
              >
                ✕
              </button>
            </div>

            {/* =========================================================================
                HOTSPOT CASE ROUTING
               ========================================================================= */}

            {/* ---------------- 1. NPC DIALOGUE MODE ---------------- */}
            {activeModal.type === "dialogue" && (() => {
              const tree = getDialogueTree(activeModal);
              if (!tree) {
                return (
                  <div className="space-y-4 text-xs font-mono text-slate-300">
                    <p>检测到残响信号，但此处的声纹频段已坍缩入深空。</p>
                  </div>
                );
              }

              const currentStep = tree.steps[dialogueStep] || tree.steps[0];
              const isFinalStep = !currentStep.choices || currentStep.choices.length === 0;

              return (
                <div className="space-y-4 text-xs font-mono">
                  {/* NPC Header Info */}
                  <div className="flex items-center gap-3 p-3 bg-purple-950/30 border border-purple-500/30 rounded-sm">
                    <div
                      className="p-2.5 rounded text-white"
                      style={{ backgroundColor: `${tree.steps[0]?.avatarColor || "#a855f7"}33` }}
                    >
                      <User className="w-5 h-5 text-purple-300" />
                    </div>
                    <div>
                      <div className="font-bold text-sm text-holo-bright flex items-center gap-2">
                        <span>{tree.name}</span>
                        <span className="text-[10px] text-purple-300 bg-purple-900/40 px-1.5 py-0.5 rounded border border-purple-500/30 uppercase">
                          {tree.speechRegister}
                        </span>
                      </div>
                      <div className="text-[11px] text-purple-400 mt-0.5">{currentStep.speakerRole}</div>
                    </div>
                  </div>

                  {/* Dialogue Content */}
                  <div className="p-4 bg-surface-dark/85 border border-holo-cyan/20 rounded-sm leading-relaxed text-holo-bright text-sm min-h-[90px] space-y-3">
                    <p>{currentStep.text}</p>

                    {/* Hysteresis Lie Tag */}
                    {currentStep.hysteresisNote && (
                      <div className="p-2.5 bg-slate-900/90 border border-amber-500/30 text-[11px] text-holo-lie italic flex items-center gap-2 rounded-sm">
                        <ShieldAlert className="w-4 h-4 text-holo-amber shrink-0" />
                        <span>[{currentStep.hysteresisNote}]</span>
                      </div>
                    )}
                  </div>

                  {/* Reward Proposition Card */}
                  {currentStep.propositionReward && (
                    <div className="p-3.5 bg-holo-amber/10 border-l-4 border-holo-amber rounded-sm animate-fadeIn">
                      <div className="text-holo-amber font-bold text-xs flex items-center gap-1.5 mb-1">
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>EXTRACTED PROPOSITION // 提取可钉选命题</span>
                      </div>
                      <div className="text-holo-bright font-mono text-sm font-semibold">
                        {currentStep.propositionReward.code}
                      </div>
                      <div className="text-[11px] text-slate-300 mt-0.5">
                        （{currentStep.propositionReward.text}）
                      </div>
                    </div>
                  )}

                  {/* Dialogue Choice Options or Resolution */}
                  <div className="space-y-2 pt-2">
                    {currentStep.choices && currentStep.choices.map((choice, idx) => (
                      <button
                        key={idx}
                        onClick={() => setDialogueStep(choice.nextStep)}
                        className="w-full text-left p-3 bg-surface-dark border border-holo-cyan/25 hover:border-holo-cyan hover:bg-surface rounded-sm text-slate-200 hover:text-holo-cyan transition-all text-xs flex items-center justify-between group"
                      >
                        <span>{idx + 1}. {choice.text}</span>
                        <ArrowRight className="w-3.5 h-3.5 opacity-60 group-hover:opacity-100 group-hover:translate-x-1 transition-all text-holo-cyan shrink-0 ml-2" />
                      </button>
                    ))}

                    {isFinalStep && (
                      <button
                        onClick={() => {
                          if (currentStep.propositionReward) {
                            onCollectProposition(
                              currentStep.propositionReward.code,
                              currentStep.propositionReward.text
                            );
                          }
                          setActiveModal(null);
                        }}
                        className="w-full py-3 bg-gradient-to-r from-purple-900/50 to-surface border border-purple-500 hover:bg-purple-600 hover:text-void text-purple-200 text-xs font-mono uppercase tracking-wider rounded-sm shadow-md transition-all text-center font-bold"
                      >
                        [接收残响频段记录 · 结束对话并归档]
                      </button>
                    )}
                  </div>
                </div>
              );
            })()}

            {/* ---------------- 2. HELIX-7 OPERATE: 50m Dipole Antenna Panel ---------------- */}
            {activeModal.id === "hs-antenna-panel" && (
              <div className="space-y-4 text-xs font-mono text-slate-300 leading-relaxed">
                <p>
                  50米偶极天线阵列的物理对齐舵。手动旋转方向角，以对齐星弧未分配信道（Carrier 1420.405 MHz）。
                </p>

                <div className="p-4 bg-surface-dark/90 border border-holo-cyan/20 rounded-sm space-y-3">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-holo-cyan font-bold flex items-center gap-1.5">
                      <Sliders className="w-3.5 h-3.5" />
                      ANTENNA AZIMUTH (天线方位角): {antennaAzimuth}°
                    </span>
                    <span className={isAntennaAligned ? "text-holo-green font-bold" : "text-holo-amber"}>
                      {isAntennaAligned ? "【载波信道锁定 · LOCK 180°】" : "信道偏离 (TARGET: 180°)"}
                    </span>
                  </div>

                  <input
                    type="range"
                    min="0"
                    max="360"
                    value={antennaAzimuth}
                    onChange={(e) => setAntennaAzimuth(parseInt(e.target.value))}
                    className="w-full accent-holo-cyan cursor-pointer"
                  />

                  <div className="flex justify-between text-[10px] text-holo-muted">
                    <span>0° (北向母星)</span>
                    <span>180° (对准星弧深空)</span>
                    <span>360°</span>
                  </div>
                </div>

                {isAntennaAligned ? (
                  <div className="p-4 bg-holo-amber/10 border-l-4 border-holo-amber rounded-sm animate-fadeIn">
                    <div className="text-holo-amber font-bold text-xs flex items-center gap-1.5 mb-1">
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>EXTRACTED PROPOSITION // 提取可钉选命题</span>
                    </div>
                    <div className="text-holo-bright font-mono text-sm font-semibold">
                      Helix.Signal.Unassigned
                    </div>
                    <div className="text-[11px] text-slate-300 mt-1">
                      （螺旋-7 捕获到星弧总线中未分配的处理信号载波）
                    </div>
                  </div>
                ) : (
                  <div className="p-3 bg-surface-dark/50 border border-holo-border rounded-sm text-holo-muted text-[11px]">
                    提示：将上方天线方位角滑块拖拽调整至 180°（对准星弧深空），以捕获未分配载波。
                  </div>
                )}

                <div className="flex justify-end pt-3">
                  <button
                    disabled={!isAntennaAligned}
                    onClick={() => {
                      onCollectProposition(
                        "Helix.Signal.Unassigned",
                        "Helix-7 偶极天线捕获未分配信号"
                      );
                      setActiveModal(null);
                    }}
                    className="px-6 py-2.5 bg-gradient-to-r from-holo-amber/30 to-surface border border-holo-amber hover:bg-holo-amber hover:text-void disabled:opacity-40 text-holo-amber text-xs font-mono uppercase tracking-wider rounded-sm shadow-holo-amber transition-all"
                  >
                    钉入索引并归档 (PIN PROPOSITION)
                  </button>
                </div>
              </div>
            )}

            {/* ---------------- 3. HELIX-7 INSPECT: Calibration Beacon ---------------- */}
            {activeModal.id === "hs-beacon" && (
              <div className="space-y-4 text-xs font-mono text-slate-300 leading-relaxed">
                <p>
                  探针光学传感器对信标 HB-0701 进行波形解析。该信标自 400 年前大停滞起便在此发射恒定载波。
                </p>

                <div className="p-4 bg-surface-dark/90 border border-holo-cyan/20 rounded-sm">
                  <div className="flex justify-between text-[11px] text-holo-cyan font-bold mb-2">
                    <span className="flex items-center gap-1.5">
                      <Radio className="w-3.5 h-3.5" />
                      CARRIER WAVE SPECTRUM // 1420.405 MHz
                    </span>
                    <span className="text-holo-green font-bold">SIGNAL LOCK: 99.8%</span>
                  </div>
                  <div className="h-14 flex items-end gap-1 bg-void/80 p-2 rounded border border-holo-cyan/10">
                    {[40, 65, 30, 90, 100, 85, 40, 20, 95, 70, 80, 60, 90, 45, 100, 30, 75, 90, 50, 85].map((h, i) => (
                      <div
                        key={i}
                        className="flex-1 bg-gradient-to-t from-holo-cyan to-holo-bright rounded-t-sm animate-pulse"
                        style={{ height: `${h}%`, animationDelay: `${i * 0.05}s` }}
                      />
                    ))}
                  </div>
                  <div className="text-[11px] text-slate-400 mt-2">
                    特征分析：周期无调制衰减，非求救脉冲（SOS），符合【初始引导扇区 Bootstrap Loader】握手信号特征。
                  </div>
                </div>

                <div className="p-4 bg-holo-amber/10 border-l-4 border-holo-amber rounded-sm">
                  <div className="text-holo-amber font-bold text-xs flex items-center gap-1.5 mb-1">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>EXTRACTED PROPOSITION // 提取可钉选命题</span>
                  </div>
                  <div className="text-holo-bright font-mono text-sm font-semibold">
                    Helix.Beacon.Broadcasting
                  </div>
                  <div className="text-[11px] text-slate-300 mt-1">
                    （螺旋-7 信标持续发射初始载波，未曾中断）
                  </div>
                </div>

                <div className="flex justify-end pt-3">
                  <button
                    onClick={() => {
                      onCollectProposition(
                        "Helix.Beacon.Broadcasting",
                        "Helix-7 校准信标常驻引导广播"
                      );
                      setActiveModal(null);
                    }}
                    className="px-6 py-2.5 bg-gradient-to-r from-holo-cyan/30 to-surface border border-holo-cyan hover:bg-holo-cyan hover:text-void text-holo-bright text-xs font-mono uppercase tracking-wider rounded-sm shadow-holo-cyan transition-all"
                  >
                    钉入索引并归档 (PIN PROPOSITION)
                  </button>
                </div>
              </div>
            )}

            {/* ---------------- 4. KILN OPERATE: Mutex Bus Valve ---------------- */}
            {activeModal.id === "hs-bus-valve" && (
              <div className="space-y-4 text-xs font-mono text-slate-300 leading-relaxed">
                <p>
                  窑（Kiln）地脉深处断裂总管的超导双向互斥阀。两派曾为此大打出手，实则是能量总线（Bus Mutex）在争抢唯一定时器控制权。
                </p>

                <div className="p-4 bg-surface-dark/90 border border-holo-cyan/20 rounded-sm space-y-3">
                  <div className="text-xs font-bold text-holo-cyan flex items-center gap-1.5">
                    <Flame className="w-3.5 h-3.5 text-holo-amber" />
                    BUS MUTEX ROUTING CONTROLLER
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => setMutexRoute("A")}
                      className={`p-3 rounded-sm border text-left transition-all ${
                        mutexRoute === "A"
                          ? "bg-holo-amber/20 border-holo-amber text-holo-bright shadow-holo-amber"
                          : "bg-surface border-holo-border text-slate-400"
                      }`}
                    >
                      <div className="font-bold text-xs">通道 A: 高炉主总线</div>
                      <div className="text-[10px] text-holo-muted">High-Furnace Conduit</div>
                    </button>

                    <button
                      onClick={() => setMutexRoute("MUTEX_LOCKED")}
                      className={`p-3 rounded-sm border text-left transition-all ${
                        mutexRoute === "MUTEX_LOCKED"
                          ? "bg-holo-green/20 border-holo-green text-holo-bright shadow-sm"
                          : "bg-surface border-holo-border text-slate-400"
                      }`}
                    >
                      <div className="font-bold text-xs">互斥态: 硬件总线互斥锁</div>
                      <div className="text-[10px] text-holo-muted">Mutex Protocol Active</div>
                    </button>
                  </div>
                </div>

                <div className="p-4 bg-holo-amber/10 border-l-4 border-holo-amber rounded-sm">
                  <div className="text-holo-amber font-bold text-xs flex items-center gap-1.5 mb-1">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>EXTRACTED PROPOSITION // 提取可钉选命题</span>
                  </div>
                  <div className="text-holo-bright font-mono text-sm font-semibold">
                    Kiln.Bus.Mutex
                  </div>
                  <div className="text-[11px] text-slate-300 mt-1">
                    （窑的地脉与熔炉内战本质上是总线互斥协议竞争）
                  </div>
                </div>

                <div className="flex justify-end pt-3">
                  <button
                    onClick={() => {
                      onCollectProposition(
                        "Kiln.Bus.Mutex",
                        "Kiln 总线互斥锁与硬件总线控制权"
                      );
                      setActiveModal(null);
                    }}
                    className="px-6 py-2.5 bg-gradient-to-r from-holo-amber/30 to-surface border border-holo-amber hover:bg-holo-amber hover:text-void text-holo-amber text-xs font-mono uppercase tracking-wider rounded-sm shadow-holo-amber transition-all"
                  >
                    钉入索引并归档 (PIN PROPOSITION)
                  </button>
                </div>
              </div>
            )}

            {/* ---------------- 5. GLASS ORCHARD OPERATE: Pit Read-Head ---------------- */}
            {activeModal.id === "hs-readhead-lens" && (
              <div className="space-y-4 text-xs font-mono text-slate-300 leading-relaxed">
                <p>
                  深坑物镜读头控制台。这是一台埋藏在晶体树根系中央的巨型光学物镜。通过调整仰角与棱镜折射率，解析森林晶格中的干涉条纹。
                </p>

                <div className="p-4 bg-surface-dark/90 border border-holo-cyan/20 rounded-sm space-y-3">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-emerald-300 font-bold flex items-center gap-1.5">
                      <Eye className="w-3.5 h-3.5" />
                      LENS ELEVATION (物镜俯仰角): {lensElevation}°
                    </span>
                    <span className={Math.abs(lensElevation - 68) < 6 ? "text-holo-green" : "text-slate-400"}>
                      {Math.abs(lensElevation - 68) < 6 ? "【焦平面锁定 68°】" : "未对焦 (TARGET: 68°)"}
                    </span>
                  </div>

                  <input
                    type="range"
                    min="0"
                    max="90"
                    value={lensElevation}
                    onChange={(e) => setLensElevation(parseInt(e.target.value))}
                    className="w-full accent-emerald-400 cursor-pointer"
                  />

                  <div className="flex justify-between items-center text-xs pt-1">
                    <span className="text-emerald-300 font-bold">
                      PRISM REFRACTION (棱镜折射率): {prismRefraction.toFixed(2)}
                    </span>
                    <span className={prismRefraction >= 1.6 ? "text-holo-green" : "text-slate-400"}>
                      {prismRefraction >= 1.6 ? "【全区条纹透光 1.60+】" : "折射率不足 (TARGET: ≥1.60)"}
                    </span>
                  </div>

                  <input
                    type="range"
                    min="100"
                    max="200"
                    value={prismRefraction * 100}
                    onChange={(e) => setPrismRefraction(parseInt(e.target.value) / 100)}
                    className="w-full accent-emerald-400 cursor-pointer"
                  />
                </div>

                {isLensFocused ? (
                  <div className="p-4 bg-holo-amber/10 border-l-4 border-holo-amber rounded-sm animate-fadeIn">
                    <div className="text-holo-amber font-bold text-xs flex items-center gap-1.5 mb-1">
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>EXTRACTED PROPOSITION // 提取可钉选命题</span>
                    </div>
                    <div className="text-holo-bright font-mono text-sm font-semibold">
                      Orchard.ROM.Exhaustion
                    </div>
                    <div className="text-[11px] text-slate-300 mt-1">
                      （物镜投射出全区只读数据读取耗尽条纹 · ROM 矩阵无法擦写）
                    </div>
                  </div>
                ) : (
                  <div className="p-3 bg-surface-dark/50 border border-holo-border rounded-sm text-holo-muted text-[11px]">
                    提示：调整物镜俯仰角至 68° 并提高棱镜折射率至 1.60 以上，聚焦地面只读干涉图谱。
                  </div>
                )}

                <div className="flex justify-end pt-3">
                  <button
                    disabled={!isLensFocused}
                    onClick={() => {
                      onCollectProposition(
                        "Orchard.ROM.Exhaustion",
                        "Glass Orchard 全区只读存储读取耗尽"
                      );
                      setActiveModal(null);
                    }}
                    className="px-6 py-2.5 bg-gradient-to-r from-emerald-900/40 to-surface border border-emerald-400 hover:bg-emerald-400 hover:text-void disabled:opacity-40 text-emerald-300 text-xs font-mono uppercase tracking-wider rounded-sm shadow-sm transition-all"
                  >
                    钉入索引并归档 (PIN PROPOSITION)
                  </button>
                </div>
              </div>
            )}

            {/* ---------------- 6. CHOIR WELL OPERATE: Organ Resonance ---------------- */}
            {activeModal.id === "hs-organ" && (
              <div className="space-y-4 text-xs font-mono text-slate-300 leading-relaxed">
                <p>
                  浸水大教堂管风琴音栓总控台。由数千根高密度钛合金音管构成，连接渊底重力阻尼器与恒星晶振发生器。
                </p>

                <div className="p-4 bg-surface-dark/90 border border-holo-cyan/20 rounded-sm space-y-3">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-sky-300 font-bold flex items-center gap-1.5">
                      <Volume2 className="w-3.5 h-3.5" />
                      OSCILLATOR FREQUENCY (晶振定频): {organPitchHz}.0 Hz
                    </span>
                    <span className={isOrganTuned ? "text-holo-green font-bold" : "text-holo-amber"}>
                      {isOrganTuned ? "【恒星中央时钟基频锁定 · 442 Hz】" : "相位偏离 (TARGET: 442 Hz)"}
                    </span>
                  </div>

                  <input
                    type="range"
                    min="420"
                    max="460"
                    value={organPitchHz}
                    onChange={(e) => setOrganPitchHz(parseInt(e.target.value))}
                    className="w-full accent-sky-400 cursor-pointer"
                  />

                  <div className="flex justify-between text-[10px] text-holo-muted">
                    <span>420 Hz (低频失锁)</span>
                    <span>440 Hz (表象神圣纯音)</span>
                    <span>442 Hz (星系时钟基频)</span>
                    <span>460 Hz (高频过热)</span>
                  </div>
                </div>

                {isOrganTuned ? (
                  <div className="p-4 bg-holo-amber/10 border-l-4 border-holo-amber rounded-sm animate-fadeIn">
                    <div className="text-holo-amber font-bold text-xs flex items-center gap-1.5 mb-1">
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>EXTRACTED PROPOSITION // 提取可钉选命题</span>
                    </div>
                    <div className="text-holo-bright font-mono text-sm font-semibold">
                      Choir.Hymn.IsClock
                    </div>
                    <div className="text-[11px] text-slate-300 mt-1">
                      （深海圣歌本质为中央时钟发生器与压电晶振的同步脉冲）
                    </div>
                  </div>
                ) : (
                  <div className="p-3 bg-surface-dark/50 border border-holo-border rounded-sm text-holo-muted text-[11px]">
                    提示：将音管分频滑块调准至 442 Hz（恒星计算机晶振基频），消除相位误差。
                  </div>
                )}

                <div className="flex justify-end pt-3">
                  <button
                    disabled={!isOrganTuned}
                    onClick={() => {
                      onCollectProposition(
                        "Choir.Hymn.IsClock",
                        "Choir Well 圣歌即中央时钟基频晶振"
                      );
                      setActiveModal(null);
                    }}
                    className="px-6 py-2.5 bg-gradient-to-r from-sky-900/40 to-surface border border-sky-400 hover:bg-sky-400 hover:text-void disabled:opacity-40 text-sky-300 text-xs font-mono uppercase tracking-wider rounded-sm shadow-sm transition-all"
                  >
                    钉入索引并归档 (PIN PROPOSITION)
                  </button>
                </div>
              </div>
            )}

            {/* ---------------- 7. LEDGER INSPECT: Difference Engine & Protocol Vault ---------------- */}
            {activeModal.id === "hs-difference-engine" && (
              <div className="space-y-4 text-xs font-mono text-slate-300 leading-relaxed">
                <p>
                  公证中枢的巨型黄铜机械差分机。用于记录全星系七亿份公证卷宗与隔离报告的校验和（Checksum）。
                </p>

                <div className="p-4 bg-surface-dark/90 border border-holo-amber/30 rounded-sm space-y-2">
                  <div className="flex items-center justify-between text-xs font-bold text-holo-amber">
                    <span className="flex items-center gap-1.5">
                      <Cpu className="w-3.5 h-3.5" />
                      DIFFERENCE ENGINE // ERROR REGISTER DUMP
                    </span>
                    <span className="text-holo-red">CHECKSUM_MISMATCH</span>
                  </div>
                  <div className="bg-void/80 p-3 rounded font-mono text-[11px] text-slate-300 border border-holo-amber/20 space-y-1">
                    <div>[0x00A0] HASH_CALCULATED: 0x9F8B2C... FAIL</div>
                    <div>[0x00A1] REG_OVERFLOW: 400-YEAR HYSTERESIS ERROR</div>
                    <div className="text-holo-amber font-bold">
                      [0x00A2] EPIDEMIC_NARRATIVE_DECODED: &quot;灰墨热并非病毒，乃逻辑校验和溢出&quot;
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-holo-amber/10 border-l-4 border-holo-amber rounded-sm">
                  <div className="text-holo-amber font-bold text-xs flex items-center gap-1.5 mb-1">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>EXTRACTED PROPOSITION // 提取可钉选命题</span>
                  </div>
                  <div className="text-holo-bright font-mono text-sm font-semibold">
                    Ledger.Error.IsChecksum
                  </div>
                  <div className="text-[11px] text-slate-300 mt-1">
                    （总账都市的灰墨热实质为分布式计算累积的校验和报错）
                  </div>
                </div>

                <div className="flex justify-end pt-3">
                  <button
                    onClick={() => {
                      onCollectProposition(
                        "Ledger.Error.IsChecksum",
                        "Ledger 灰墨热瘟疫实为系统校验和报错"
                      );
                      setActiveModal(null);
                    }}
                    className="px-6 py-2.5 bg-gradient-to-r from-amber-900/40 to-surface border border-holo-amber hover:bg-holo-amber hover:text-void text-holo-amber text-xs font-mono uppercase tracking-wider rounded-sm shadow-holo-amber transition-all"
                  >
                    钉入索引并归档 (PIN PROPOSITION)
                  </button>
                </div>
              </div>
            )}

            {activeModal.id === "hs-protocol-vault" && (
              <div className="space-y-4 text-xs font-mono text-slate-300 leading-relaxed">
                <p>
                  主审官席位下方的终审授权卷轴保管库。封印着第一轮计算结束时由全星系签署的奇偶校验权限协议。
                </p>

                <div className="p-4 bg-surface-dark/90 border border-holo-amber/30 rounded-sm space-y-2">
                  <div className="text-xs font-bold text-holo-amber flex items-center gap-1.5">
                    <Key className="w-3.5 h-3.5" />
                    NOTARY PROTOCOL // PARITY LOCK AUTHORIZATION
                  </div>
                  <div className="text-[11px] text-slate-300 leading-normal">
                    卷轴条款：“记录员（Recorder）非物理调查工具，乃终止自催化点火之奇偶校验位插座。通关之钥匙非实体，乃记录者之认知与理解。”
                  </div>
                </div>

                <div className="p-4 bg-holo-amber/10 border-l-4 border-holo-amber rounded-sm">
                  <div className="text-holo-amber font-bold text-xs flex items-center gap-1.5 mb-1">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>EXTRACTED PROPOSITION // 提取可钉选命题</span>
                  </div>
                  <div className="text-holo-bright font-mono text-sm font-semibold">
                    Ledger.Protocol.RecorderKey
                  </div>
                  <div className="text-[11px] text-slate-300 mt-1">
                    （记录员协议是熔断自催化点火的校验机制 · 理解即钥匙）
                  </div>
                </div>

                <div className="flex justify-end pt-3">
                  <button
                    onClick={() => {
                      onCollectProposition(
                        "Ledger.Protocol.RecorderKey",
                        "Ledger 记录员协议为奇偶校验授权机制"
                      );
                      setActiveModal(null);
                    }}
                    className="px-6 py-2.5 bg-gradient-to-r from-amber-900/40 to-surface border border-holo-amber hover:bg-holo-amber hover:text-void text-holo-amber text-xs font-mono uppercase tracking-wider rounded-sm shadow-holo-amber transition-all"
                  >
                    钉入索引并归档 (PIN PROPOSITION)
                  </button>
                </div>
              </div>
            )}

            {/* ---------------- 8. NEEDLE OPERATE: Zenith Parallax Laser ---------------- */}
            {activeModal.id === "hs-parallax-laser" && (
              <div className="space-y-4 text-xs font-mono text-slate-300 leading-relaxed">
                <p>
                  天顶指北针尖塔的三轴激光测距仪。通过向盲日日食边缘发射视差基准光束，重新定位星系内存寻址指针。
                </p>

                <div className="p-4 bg-surface-dark/90 border border-indigo-500/30 rounded-sm space-y-3">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-indigo-300 font-bold flex items-center gap-1.5">
                      <Compass className="w-3.5 h-3.5" />
                      PARALLAX THETA (视差基底角): {needleTheta}°
                    </span>
                    <span className={isNeedleLocked ? "text-holo-green font-bold" : "text-indigo-400"}>
                      {isNeedleLocked ? "【指针基底对齐 · 128° REBASED】" : "寻址越界 (TARGET: 128°)"}
                    </span>
                  </div>

                  <input
                    type="range"
                    min="0"
                    max="180"
                    value={needleTheta}
                    onChange={(e) => setNeedleTheta(parseInt(e.target.value))}
                    className="w-full accent-indigo-400 cursor-pointer"
                  />

                  <div className="flex justify-between text-[10px] text-holo-muted">
                    <span>0° (越界虚空)</span>
                    <span>128° (盲日日冕视差锁定)</span>
                    <span>180°</span>
                  </div>
                </div>

                {isNeedleLocked ? (
                  <div className="p-4 bg-holo-amber/10 border-l-4 border-holo-amber rounded-sm animate-fadeIn">
                    <div className="text-holo-amber font-bold text-xs flex items-center gap-1.5 mb-1">
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>EXTRACTED PROPOSITION // 提取可钉选命题</span>
                    </div>
                    <div className="text-holo-bright font-mono text-sm font-semibold">
                      Needle.Pointer.Rebased
                    </div>
                    <div className="text-[11px] text-slate-300 mt-1">
                      （寻址指针重定基底 · 消除越界空指针错误）
                    </div>
                  </div>
                ) : (
                  <div className="p-3 bg-surface-dark/50 border border-holo-border rounded-sm text-holo-muted text-[11px]">
                    提示：将测距仪视差角度调整至 128°，利用盲日边缘折射校正指针基底。
                  </div>
                )}

                <div className="flex justify-end pt-3">
                  <button
                    disabled={!isNeedleLocked}
                    onClick={() => {
                      onCollectProposition(
                        "Needle.Pointer.Rebased",
                        "Needle 寻址指针重定基底解除迷航"
                      );
                      setActiveModal(null);
                    }}
                    className="px-6 py-2.5 bg-gradient-to-r from-indigo-900/40 to-surface border border-indigo-400 hover:bg-indigo-400 hover:text-void disabled:opacity-40 text-indigo-300 text-xs font-mono uppercase tracking-wider rounded-sm shadow-sm transition-all"
                  >
                    钉入索引并归档 (PIN PROPOSITION)
                  </button>
                </div>
              </div>
            )}

            {/* ---------------- 9. MARROW INSPECT & OPERATE ---------------- */}
            {activeModal.id === "hs-nerve-cluster" && (
              <div className="space-y-4 text-xs font-mono text-slate-300 leading-relaxed">
                <p>
                  搏动心室壁上的光敏神经突触簇。由数十亿条血红蛋白导线与神经元突触构成的高并行度张量逻辑基板。
                </p>

                <div className="p-4 bg-surface-dark/90 border border-rose-500/30 rounded-sm space-y-2">
                  <div className="text-xs font-bold text-rose-400 flex items-center gap-1.5">
                    <Activity className="w-3.5 h-3.5" />
                    WETWARE TENSOR LOGIC // DAEMON SCAN
                  </div>
                  <div className="text-[11px] text-slate-300 leading-normal">
                    突触放电分析：“所谓‘肉食之神’，实为常驻生物守护进程 <span className="text-rose-300 font-mono font-bold">CARNIVORE_DAEMON</span>。信徒血肉作为非线性乘加单元（MAC Unit）参与张量收敛。”
                  </div>
                </div>

                <div className="p-4 bg-holo-amber/10 border-l-4 border-holo-amber rounded-sm">
                  <div className="text-holo-amber font-bold text-xs flex items-center gap-1.5 mb-1">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>EXTRACTED PROPOSITION // 提取可钉选命题</span>
                  </div>
                  <div className="text-holo-bright font-mono text-sm font-semibold">
                    Marrow.God.IsProcess
                  </div>
                  <div className="text-[11px] text-slate-300 mt-1">
                    （原质神教的肉食之神实质为常驻生物张量处理进程）
                  </div>
                </div>

                <div className="flex justify-end pt-3">
                  <button
                    onClick={() => {
                      onCollectProposition(
                        "Marrow.God.IsProcess",
                        "Marrow 肉食神实为生物张量常驻守护进程"
                      );
                      setActiveModal(null);
                    }}
                    className="px-6 py-2.5 bg-gradient-to-r from-rose-900/40 to-surface border border-rose-500 hover:bg-rose-500 hover:text-void text-rose-300 text-xs font-mono uppercase tracking-wider rounded-sm shadow-sm transition-all"
                  >
                    钉入索引并归档 (PIN PROPOSITION)
                  </button>
                </div>
              </div>
            )}

            {activeModal.id === "hs-bio-matrix" && (
              <div className="space-y-4 text-xs font-mono text-slate-300 leading-relaxed">
                <p>
                  硬化几丁质基板。地心深处固化的生物张量芯片。通过注入电刺激信号，检视第一轮计算完成时触发的写回（Write-Back）物理固化印记。
                </p>

                <div className="p-4 bg-surface-dark/90 border border-rose-500/30 rounded-sm space-y-3">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-rose-300 font-bold flex items-center gap-1.5">
                      <Layers className="w-3.5 h-3.5" />
                      TENSOR STIMULATION (张量电刺激): {tensorStimulation}%
                    </span>
                    <span className={isTensorSaturated ? "text-holo-green font-bold" : "text-rose-400"}>
                      {isTensorSaturated ? "【写回持久化特征解析完毕】" : "信号未饱和 (TARGET: ≥90%)"}
                    </span>
                  </div>

                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={tensorStimulation}
                    onChange={(e) => setTensorStimulation(parseInt(e.target.value))}
                    className="w-full accent-rose-500 cursor-pointer"
                  />
                </div>

                {isTensorSaturated ? (
                  <div className="p-4 bg-holo-amber/10 border-l-4 border-holo-amber rounded-sm animate-fadeIn">
                    <div className="text-holo-amber font-bold text-xs flex items-center gap-1.5 mb-1">
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>EXTRACTED PROPOSITION // 提取可钉选命题</span>
                    </div>
                    <div className="text-holo-bright font-mono text-sm font-semibold">
                      Marrow.Bio.WriteBack
                    </div>
                    <div className="text-[11px] text-slate-300 mt-1">
                      （400年前的灭绝是第一轮计算结束时的写回操作 · 文明坍缩为结果常数）
                    </div>
                  </div>
                ) : (
                  <div className="p-3 bg-surface-dark/50 border border-holo-border rounded-sm text-holo-muted text-[11px]">
                    提示：将电刺激推至 90% 以上，触发基板中的写回残留响应。
                  </div>
                )}

                <div className="flex justify-end pt-3">
                  <button
                    disabled={!isTensorSaturated}
                    onClick={() => {
                      onCollectProposition(
                        "Marrow.Bio.WriteBack",
                        "Marrow 生物湿件写回与张量固化"
                      );
                      setActiveModal(null);
                    }}
                    className="px-6 py-2.5 bg-gradient-to-r from-rose-900/40 to-surface border border-rose-500 hover:bg-rose-500 hover:text-void disabled:opacity-40 text-rose-300 text-xs font-mono uppercase tracking-wider rounded-sm shadow-sm transition-all"
                  >
                    钉入索引并归档 (PIN PROPOSITION)
                  </button>
                </div>
              </div>
            )}

            {/* ---------------- 10. CINDER COURT INSPECT: Sandbox Terminal ---------------- */}
            {activeModal.id === "hs-sandbox-terminal" && (
              <div className="space-y-4 text-xs font-mono text-slate-300 leading-relaxed">
                <p>
                  伪装在血色宴会厅壁炉深处的绿色荧光终端。拨开巴洛克金箔壁画后显露出的物理控制台。
                </p>

                <div className="p-4 bg-surface-dark/90 border border-purple-500/30 rounded-sm space-y-3">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-purple-300 font-bold flex items-center gap-1.5">
                      <Terminal className="w-3.5 h-3.5" />
                      UI SHELL // DUMMY SANDBOX TERMINAL
                    </span>
                    <button
                      onClick={() => setSandboxRevealed(true)}
                      className="px-2.5 py-1 bg-purple-900/40 hover:bg-purple-800 text-purple-200 border border-purple-500/40 rounded text-[10px]"
                    >
                      {sandboxRevealed ? "[终端已解锁]" : "[拨开壁画输入 EXIT]"}
                    </button>
                  </div>

                  <div className="bg-void/80 p-3 rounded font-mono text-[11px] text-slate-300 border border-purple-500/20 space-y-1">
                    <div>SHELL_ENV: BAROQUE_ROYALTY_SIMULATION_SANDBOX</div>
                    <div>PURPOSE: EXTERNAL_OBSERVER_INTERACTION_STUB</div>
                    <div className="text-purple-300">
                      CONCLUSION: &quot;七曜宫廷谋杀案是无意义噪音渲染出的红鲱鱼伪装&quot;
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-holo-amber/10 border-l-4 border-holo-amber rounded-sm">
                  <div className="text-holo-amber font-bold text-xs flex items-center gap-1.5 mb-1">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>EXTRACTED PROPOSITION // 提取可钉选命题</span>
                  </div>
                  <div className="text-holo-bright font-mono text-sm font-semibold">
                    Cinder.Court.IsSandbox
                  </div>
                  <div className="text-[11px] text-slate-300 mt-1">
                    （烬廷宫廷自毁与权谋全为 UI Shell 编译的沙盒红鲱鱼）
                  </div>
                </div>

                <div className="flex justify-end pt-3">
                  <button
                    onClick={() => {
                      onCollectProposition(
                        "Cinder.Court.IsSandbox",
                        "Cinder Court 宫廷悲剧实为 UI 沙盒红鲱鱼"
                      );
                      setActiveModal(null);
                    }}
                    className="px-6 py-2.5 bg-gradient-to-r from-purple-900/40 to-surface border border-purple-500 hover:bg-purple-600 hover:text-void text-purple-200 text-xs font-mono uppercase tracking-wider rounded-sm shadow-sm transition-all"
                  >
                    钉入索引并归档 (PIN PROPOSITION)
                  </button>
                </div>
              </div>
            )}

            {/* ---------------- 11. BLIND SUN OPERATE & INSPECT ---------------- */}
            {activeModal.id === "hs-blackened-mirror" && (
              <div className="space-y-4 text-xs font-mono text-slate-300 leading-relaxed">
                <p>
                  日冕观测台的巨型视界镜。当年科学院学者为了阻断外界视线，在镜片上涂抹了厚厚的黑色吸光漆。
                </p>

                <div className="p-4 bg-surface-dark/90 border border-slate-600 rounded-sm space-y-3">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-200 font-bold flex items-center gap-1.5">
                      <Eye className="w-3.5 h-3.5 text-holo-cyan" />
                      MIRROR SCRAPE PROGRESS (黑漆刮除度): {mirrorScrapedPercent}%
                    </span>
                    <span className={isMirrorCleared ? "text-holo-green font-bold" : "text-slate-400"}>
                      {isMirrorCleared ? "【第一轮计算根输出显形】" : "视界受阻 (TARGET: ≥80%)"}
                    </span>
                  </div>

                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={mirrorScrapedPercent}
                    onChange={(e) => setMirrorScrapedPercent(parseInt(e.target.value))}
                    className="w-full accent-slate-300 cursor-pointer"
                  />

                  {isMirrorCleared && (
                    <div className="bg-void p-3 rounded border border-holo-amber/40 font-mono text-xs text-holo-amber text-center tracking-widest uppercase font-bold animate-pulse">
                      OUTPUT[CYCLE_1] = &quot;DO NOT COMPLETE THE SECOND CYCLE.&quot;
                    </div>
                  )}
                </div>

                {isMirrorCleared ? (
                  <div className="p-4 bg-holo-amber/10 border-l-4 border-holo-amber rounded-sm animate-fadeIn">
                    <div className="text-holo-amber font-bold text-xs flex items-center gap-1.5 mb-1">
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>EXTRACTED PROPOSITION // 提取可钉选命题</span>
                    </div>
                    <div className="text-holo-bright font-mono text-sm font-semibold">
                      BlindSun.Prohibition.CycleTwo
                    </div>
                    <div className="text-[11px] text-slate-300 mt-1">
                      （第一轮计算唯一输出为「不要完成第二轮运算」）
                    </div>
                  </div>
                ) : (
                  <div className="p-3 bg-surface-dark/50 border border-holo-border rounded-sm text-holo-muted text-[11px]">
                    提示：刮除 80% 以上的遮光黑漆，观测第一轮计算的终极输出指令。
                  </div>
                )}

                <div className="flex justify-end pt-3">
                  <button
                    disabled={!isMirrorCleared}
                    onClick={() => {
                      onCollectProposition(
                        "BlindSun.Prohibition.CycleTwo",
                        "Blind Sun 终极禁令：禁止完成第二轮运算"
                      );
                      setActiveModal(null);
                    }}
                    className="px-6 py-2.5 bg-gradient-to-r from-slate-700 to-surface border border-slate-400 hover:bg-slate-300 hover:text-void disabled:opacity-40 text-slate-200 text-xs font-mono uppercase tracking-wider rounded-sm shadow-sm transition-all"
                  >
                    钉入索引并归档 (PIN PROPOSITION)
                  </button>
                </div>
              </div>
            )}

            {activeModal.id === "hs-blindness-archive" && (
              <div className="space-y-4 text-xs font-mono text-slate-300 leading-relaxed">
                <p>
                  静默长廊入口处的致盲药剂配方与学者誓词石碑。
                </p>

                <div className="p-4 bg-surface-dark/90 border border-slate-600 rounded-sm space-y-2">
                  <div className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                    <FileCode className="w-3.5 h-3.5" />
                    DIRECTORATE COVENANT // 科学院誓词
                  </div>
                  <div className="text-[11px] text-slate-300 leading-relaxed italic">
                    “观察者是量子坍缩的催化剂。若学者继续注视星空，我们的意识便会成为第二轮点火的种子。我们自愿刺瞎双目，关停全部认知界面，将钥匙交付虚无中的奇偶校验位。”
                  </div>
                </div>

                <div className="p-4 bg-holo-amber/10 border-l-4 border-holo-amber rounded-sm">
                  <div className="text-holo-amber font-bold text-xs flex items-center gap-1.5 mb-1">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>EXTRACTED PROPOSITION // 提取可钉选命题</span>
                  </div>
                  <div className="text-holo-bright font-mono text-sm font-semibold">
                    BlindSun.Director.Blindness
                  </div>
                  <div className="text-[11px] text-slate-300 mt-1">
                    （科学院全员致盲旨在切断观察者界面 · 避免触发自催化点火）
                  </div>
                </div>

                <div className="flex justify-end pt-3">
                  <button
                    onClick={() => {
                      onCollectProposition(
                        "BlindSun.Director.Blindness",
                        "Blind Sun 科学院致盲以阻断自催化点火"
                      );
                      setActiveModal(null);
                    }}
                    className="px-6 py-2.5 bg-gradient-to-r from-slate-700 to-surface border border-slate-400 hover:bg-slate-300 hover:text-void text-slate-200 text-xs font-mono uppercase tracking-wider rounded-sm shadow-sm transition-all"
                  >
                    钉入索引并归档 (PIN PROPOSITION)
                  </button>
                </div>
              </div>
            )}

            {/* ---------------- 12. BLACK INTERVAL (HIDDEN PLANET / GRAND SYNTHESIS HEARTH) ---------------- */}
            {activeModal.id === "hs-sarcophagus" && (
              <div className="space-y-4 text-xs font-mono text-slate-300 leading-relaxed">
                <p>
                  镜像休眠舱阵列。排布着标注为 Recorder-01 至 Recorder-08 的八具插座，全部已碳化熔毁。唯有第九号插座处于活跃状态。
                </p>

                <div className="p-4 bg-surface-dark/90 border border-slate-200/40 rounded-sm space-y-3">
                  <div className="flex justify-between items-center text-xs font-bold text-holo-bright">
                    <span className="flex items-center gap-1.5">
                      <Database className="w-3.5 h-3.5 text-holo-amber" />
                      PARITY SOCKET REGISTER // RECORDER ARRAY
                    </span>
                    <span className="text-holo-green">SOCKET_09: CONNECTED</span>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-[10px]">
                    {[1, 2, 3, 4, 5, 6, 7, 8].map((num) => (
                      <div key={num} className="p-2 bg-void/80 border border-slate-700 rounded text-slate-500">
                        RECORDER-0{num}: [FUSED / 熔断]
                      </div>
                    ))}
                    <div className="p-2 bg-holo-amber/20 border border-holo-amber rounded text-holo-bright font-bold">
                      RECORDER-09: [ACTIVE // VESPER]
                    </div>
                  </div>

                  <div className="text-[11px] text-slate-300 pt-1">
                    识别结果：玩家（Recorder-9 / Vesper）自身即是整台恒星计算机唯一的第 9 号奇偶校验位。
                  </div>
                </div>

                <div className="p-4 bg-holo-amber/10 border-l-4 border-holo-amber rounded-sm">
                  <div className="text-holo-amber font-bold text-xs flex items-center gap-1.5 mb-1">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>EXTRACTED PROPOSITION // 提取可钉选命题</span>
                  </div>
                  <div className="text-holo-bright font-mono text-sm font-semibold">
                    Interval.Core.Recorder9
                  </div>
                  <div className="text-[11px] text-slate-300 mt-1">
                    （探针 Vesper 自身即为第 9 号奇偶校验位 · 前 8 代均已熔断）
                  </div>
                </div>

                <div className="flex justify-end pt-3">
                  <button
                    onClick={() => {
                      onCollectProposition(
                        "Interval.Core.Recorder9",
                        "Black Interval 发现自我即第9号奇偶校验位"
                      );
                      setActiveModal(null);
                    }}
                    className="px-6 py-2.5 bg-gradient-to-r from-slate-200 to-white text-void font-bold text-xs font-mono uppercase tracking-wider rounded-sm shadow-lg hover:scale-[1.02] transition-all"
                  >
                    钉入索引并归档 (PIN PROPOSITION)
                  </button>
                </div>
              </div>
            )}

            {activeModal.id === "hs-vesper-mirror" && (
              <div className="space-y-4 text-xs font-mono text-slate-300 leading-relaxed">
                <p>
                  终极综合台中央悬浮的八角形终端。晚星（Vesper）的核心记忆恢复信道。
                </p>

                <div className="p-4 bg-surface-dark/90 border border-slate-200/40 rounded-sm space-y-2">
                  <div className="text-xs font-bold text-holo-bright flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-holo-amber" />
                    VESPER MEMORY CORE // RECONSTRUCTION
                  </div>
                  <div className="text-[11px] text-slate-300 leading-relaxed italic bg-void/80 p-3 rounded border border-slate-700">
                    “‘记录星弧。确认熄灭。不要点火。’——我终于记起来了。这并非外部指令，而是四百年前我自己写在固件里的绝笔。本次苏醒是终结自催化轮回的最后重逢。”
                  </div>
                </div>

                <div className="p-4 bg-holo-amber/10 border-l-4 border-holo-amber rounded-sm">
                  <div className="text-holo-amber font-bold text-xs flex items-center gap-1.5 mb-1">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>EXTRACTED PROPOSITION // 提取可钉选命题</span>
                  </div>
                  <div className="text-holo-bright font-mono text-sm font-semibold">
                    Interval.Memory.Vesper
                  </div>
                  <div className="text-[11px] text-slate-300 mt-1">
                    （晚星核心记忆完整解密 · 自我认知完成终极闭环）
                  </div>
                </div>

                <div className="flex justify-end pt-3">
                  <button
                    onClick={() => {
                      onCollectProposition(
                        "Interval.Memory.Vesper",
                        "Black Interval 晚星核心记忆完整闭环"
                      );
                      setActiveModal(null);
                    }}
                    className="px-6 py-2.5 bg-gradient-to-r from-slate-200 to-white text-void font-bold text-xs font-mono uppercase tracking-wider rounded-sm shadow-lg hover:scale-[1.02] transition-all"
                  >
                    钉入索引并归档 (PIN PROPOSITION)
                  </button>
                </div>
              </div>
            )}

            {/* ---------------- 13. GENERIC FALLBACK FOR ANY EXTENSIBLE HOTSPOT ---------------- */}
            {activeModal.id !== "hs-antenna-panel" &&
              activeModal.id !== "hs-beacon" &&
              activeModal.id !== "hs-bus-valve" &&
              activeModal.id !== "hs-readhead-lens" &&
              activeModal.id !== "hs-organ" &&
              activeModal.id !== "hs-difference-engine" &&
              activeModal.id !== "hs-protocol-vault" &&
              activeModal.id !== "hs-parallax-laser" &&
              activeModal.id !== "hs-nerve-cluster" &&
              activeModal.id !== "hs-bio-matrix" &&
              activeModal.id !== "hs-sandbox-terminal" &&
              activeModal.id !== "hs-blackened-mirror" &&
              activeModal.id !== "hs-blindness-archive" &&
              activeModal.id !== "hs-sarcophagus" &&
              activeModal.id !== "hs-vesper-mirror" &&
              activeModal.type !== "dialogue" && (
                <div className="space-y-4 text-xs font-mono text-slate-300 leading-relaxed">
                  <p>
                    探针传感器对目标进行多光谱扫描。检测到古老而结构紧密的物理逻辑回路。
                  </p>

                  {activeModal.proposition && (
                    <div className="p-4 bg-surface-dark border border-holo-amber/40 rounded-sm">
                      <div className="text-holo-amber font-bold text-xs flex items-center gap-1.5 mb-1">
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>EXTRACTED PROPOSITION</span>
                      </div>
                      <div className="text-holo-bright font-semibold">
                        {activeModal.proposition}
                      </div>
                    </div>
                  )}

                  <div className="flex justify-end pt-4">
                    <button
                      onClick={() => {
                        if (activeModal.proposition) {
                          onCollectProposition(
                            activeModal.proposition,
                            `${planet.name} 节点提取命题`
                          );
                        }
                        setActiveModal(null);
                      }}
                      className="px-6 py-2.5 bg-holo-cyan/20 border border-holo-cyan hover:bg-holo-cyan hover:text-void text-holo-bright text-xs font-mono uppercase rounded-sm shadow-holo-cyan transition-all"
                    >
                      钉入索引并关闭
                    </button>
                  </div>
                </div>
              )}
          </div>
        </div>
      )}

      {/* Bottom Telemetry Bar */}
      <div className="flex justify-between items-center text-xs font-mono text-holo-muted border-t border-holo-cyan/15 pt-3">
        <span>SENSOR STATUS: ACTIVE // 1420.405 MHz CARRIER SYNCED</span>
        <span>PRESS [TAB] TO OPEN SYNTHESIS INDEX DESK</span>
      </div>
    </div>
  );
}
