"use client";

import React, { useState } from "react";
import { PlanetDef, LandingSite } from "@/lib/canon";
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
  ArrowRight
} from "lucide-react";

interface SurfaceStageViewProps {
  planet: PlanetDef;
  site: LandingSite;
  onReturnOrbit: () => void;
  onCollectProposition: (code: string, text: string) => void;
  collectedPropositions: string[];
}

export default function SurfaceStageView({
  planet,
  site,
  onReturnOrbit,
  onCollectProposition,
  collectedPropositions,
}: SurfaceStageViewProps) {
  const [activeModal, setActiveModal] = useState<any | null>(null);
  const [dialogueStep, setDialogueStep] = useState(0);

  // Mini-interactive states for puzzles/operations
  const [antennaAzimuth, setAntennaAzimuth] = useState(45);
  const [mutexRoute, setMutexRoute] = useState<"A" | "B" | "MUTEX_LOCKED">("A");
  const [beaconCalibrated, setBeaconCalibrated] = useState(false);

  const handleHotspotClick = (hotspot: any) => {
    setActiveModal(hotspot);
    setDialogueStep(0);
  };

  const isAntennaAligned = Math.abs(antennaAzimuth - 180) < 10;

  return (
    <div className="relative w-full h-full flex flex-col justify-between p-6 md:p-8 z-30 pointer-events-auto animate-fadeIn">
      {/* Top Banner Navigation */}
      <div className="flex justify-between items-center gap-4">
        <button
          onClick={onReturnOrbit}
          className="px-4 py-2 bg-surface border border-holo-border hover:border-holo-cyan text-holo-bright text-xs font-mono flex items-center gap-2 rounded-sm transition-all shadow-md"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>RETURN TO ORBIT [ESC]</span>
        </button>

        <div className="holo-panel px-6 py-2.5 rounded-sm text-center border-holo-cyan/30">
          <div className="font-display font-bold text-sm text-holo-bright flex items-center justify-center gap-2">
            <span
              className="w-2.5 h-2.5 rounded-full animate-pulse"
              style={{ backgroundColor: planet.color }}
            />
            <span>{planet.name} // {site.name}</span>
          </div>
          <div className="text-[10px] font-mono text-holo-cyan mt-0.5">
            SURFACE VIRTUAL STAGE (40×40m MESH TELEMETRY)
          </div>
        </div>

        <div className="px-3.5 py-1.5 bg-surface border border-holo-border rounded-sm text-xs font-mono text-holo-amber flex items-center gap-2">
          <Sparkles className="w-3.5 h-3.5" />
          <span>PROPOSITIONS: {collectedPropositions.length} PINNED</span>
        </div>
      </div>

      {/* Surface Hotspots Grid */}
      <div className="my-auto max-w-4xl mx-auto w-full grid grid-cols-1 md:grid-cols-2 gap-6">
        {site.hotspots.map((hs) => {
          const isCollected = hs.proposition && collectedPropositions.includes(hs.proposition);
          return (
            <div
              key={hs.id}
              onClick={() => handleHotspotClick(hs)}
              className={`holo-panel p-6 rounded-sm cursor-pointer transition-all duration-300 group flex flex-col justify-between border ${
                isCollected
                  ? "border-holo-green/40 hover:border-holo-green shadow-sm"
                  : "border-holo-cyan/25 hover:border-holo-cyan hover:shadow-holo-cyan"
              }`}
            >
              <div>
                <div className="flex justify-between items-start mb-4">
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
                <div className="text-xs text-holo-muted font-mono capitalize">
                  INTERACTION MODE: {hs.type.toUpperCase()}
                </div>
              </div>

              <div className="mt-6 pt-3 border-t border-holo-cyan/15 flex justify-between items-center text-xs font-mono text-holo-cyan">
                <span className="group-hover:translate-x-1 transition-transform inline-flex items-center gap-1.5">
                  [ENGAGE NODE]
                  <ArrowRight className="w-3.5 h-3.5" />
                </span>
                <span className="text-holo-muted text-[10px]">40×40m SECTOR</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Interactive Modal (Inspect / Operate / Dialogue) */}
      {activeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-void/85 backdrop-blur-md animate-fadeIn">
          <div className="w-full max-w-2xl holo-panel p-6 md:p-8 rounded-sm relative border-holo-cyan/40 shadow-2xl">
            {/* Modal Header */}
            <div className="flex justify-between items-start border-b border-holo-cyan/20 pb-3 mb-5">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-holo-amber font-mono text-xs">[{activeModal.type.toUpperCase()}]</span>
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

            {/* CASE 1: Helix-7 Beacon Inspect */}
            {activeModal.id === "hs-beacon" && (
              <div className="space-y-4 text-xs font-mono text-slate-300 leading-relaxed">
                <p>
                  探针光学传感器对信标 HB-0701 进行波形解析。该信标自 400 年前大停滞起便在此发射恒定载波。
                </p>

                {/* Spectral Waveform Simulated Box */}
                <div className="p-4 bg-surface-dark/90 border border-holo-cyan/20 rounded-sm">
                  <div className="flex justify-between text-[11px] text-holo-cyan font-bold mb-2">
                    <span className="flex items-center gap-1.5">
                      <Radio className="w-3.5 h-3.5" />
                      CARRIER WAVE SPECTRUM // 1420.405 MHz
                    </span>
                    <span className="text-holo-green">SIGNAL LOCK: 99.8%</span>
                  </div>
                  {/* Visualizer bars */}
                  <div className="h-14 flex items-end gap-1.5 bg-void/80 p-2 rounded border border-holo-cyan/10">
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

                {/* Extracted Proposition */}
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

            {/* CASE 2: Helix-7 Antenna Panel Operation */}
            {activeModal.id === "hs-antenna-panel" && (
              <div className="space-y-4 text-xs font-mono text-slate-300 leading-relaxed">
                <p>
                  50米偶极天线阵列的物理对齐舵。手动旋转方向角，以对齐星弧未分配信道（Carrier 1420.405 MHz）。
                </p>

                {/* Slider / Dial Controls */}
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

            {/* CASE 3: Kiln Mutex Bus Valve Operation */}
            {activeModal.id === "hs-bus-valve" && (
              <div className="space-y-4 text-xs font-mono text-slate-300 leading-relaxed">
                <p>
                  窑（Kiln）地脉深处断裂总管的超导双向互斥阀。两派曾为此大打出手，实则是能量总线（Bus Mutex）在争抢唯一定时器控制权。
                </p>

                {/* Mutex Valve Switcher */}
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

            {/* CASE 4: Tarkis Dialogue (Helix-7) */}
            {activeModal.id === "hs-tarkis" && (
              <div className="space-y-4 text-xs font-mono">
                <div className="flex items-center gap-3 p-3 bg-purple-950/30 border border-purple-500/30 rounded-sm">
                  <div className="p-2 bg-purple-900/50 rounded text-purple-300">
                    <User className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="font-bold text-sm text-holo-bright">Surveyor-01 塔基 (Tarkis)</div>
                    <div className="text-[10px] text-purple-400">初级测绘员残响 · 手持泛黄的交接清单</div>
                  </div>
                </div>

                {/* Dialogue Content */}
                <div className="p-4 bg-surface-dark/80 border border-holo-cyan/20 rounded-sm leading-relaxed text-holo-bright text-sm min-h-[100px]">
                  {dialogueStep === 0 && (
                    <p>
                      “我的交接班记录上写得很清楚，距第三舰队的巡逻艇到达还有十二分钟。信标只是在……只是在做常规的开机预热。”
                    </p>
                  )}
                  {dialogueStep === 1 && (
                    <div>
                      <p>
                        “胡说！我昨晚还听到了 Kiln 传来的熔炉广播！他们说新的超导铜管已经铺设完毕，今天全星系都要通电！你仔细听……那不是回音，那是他们在说话！”
                      </p>
                      <div className="mt-3 p-2 bg-slate-900/80 border border-slate-700 text-[11px] text-holo-lie italic flex items-center gap-1.5">
                        <ShieldAlert className="w-3.5 h-3.5 text-holo-amber" />
                        <span>[ECHO_HYSTERESIS // 磁滞推演中 · 对方在用记忆填补四百年的虚无]</span>
                      </div>
                    </div>
                  )}
                  {dialogueStep === 2 && (
                    <p>
                      “……如果他们真的不在了，那我这四百年来到底是在等谁换班？记录者，拿走这个频率吧。别让天线停下，至少让它觉得，还有人在听。”
                    </p>
                  )}
                </div>

                {/* Dialogue Options */}
                <div className="space-y-2 pt-2">
                  {dialogueStep === 0 && (
                    <button
                      onClick={() => setDialogueStep(1)}
                      className="w-full text-left p-3 bg-surface-dark border border-holo-cyan/25 hover:border-holo-cyan rounded-sm text-slate-300 hover:text-holo-cyan transition-all text-xs"
                    >
                      1. “舰队不会来了。星系已经沉默了四百年。”
                    </button>
                  )}
                  {dialogueStep === 1 && (
                    <button
                      onClick={() => setDialogueStep(2)}
                      className="w-full text-left p-3 bg-surface-dark border border-holo-cyan/25 hover:border-holo-cyan rounded-sm text-slate-300 hover:text-holo-cyan transition-all text-xs"
                    >
                      1. “那是死者的磁滞回声。把频率交给我吧。”
                    </button>
                  )}
                  {dialogueStep === 2 && (
                    <button
                      onClick={() => {
                        onCollectProposition(
                          "Helix.Beacon.Broadcasting",
                          "Tarkis 残响交接的信标广播信道"
                        );
                        setActiveModal(null);
                      }}
                      className="w-full py-3 bg-gradient-to-r from-purple-900/40 to-surface border border-purple-500 hover:bg-purple-600 hover:text-void text-purple-300 text-xs font-mono uppercase tracking-wider rounded-sm shadow-sm transition-all text-center"
                    >
                      [接收 Tarkis 的频率记录 · 结束对话]
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* CASE 5: Vulkan Dialogue (Kiln) */}
            {activeModal.id === "hs-vulkan" && (
              <div className="space-y-4 text-xs font-mono">
                <div className="flex items-center gap-3 p-3 bg-amber-950/30 border border-amber-500/30 rounded-sm">
                  <div className="p-2 bg-amber-900/50 rounded text-amber-300">
                    <User className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="font-bold text-sm text-holo-bright">Forge-Master 沃坎 (Vulkan)</div>
                    <div className="text-[10px] text-amber-400">老锻造师残响 · 手持重型气动铆枪</div>
                  </div>
                </div>

                <div className="p-4 bg-surface-dark/80 border border-holo-cyan/20 rounded-sm leading-relaxed text-holo-bright text-sm min-h-[100px]">
                  {dialogueStep === 0 && (
                    <p>
                      “站住！你是地脉派派来的密探？！别碰我的总线阀门！这九座高炉是同盟的生命线，哪怕烧干地核，我们也绝不交出电源母线的控制权！”
                    </p>
                  )}
                  {dialogueStep === 1 && (
                    <div>
                      <p>
                        “什么计算机？！什么总线？！这里是熔火同盟的锻造厂！我们在造能飞出星弧的无尽引擎！只要……只要下一炉铜水出炉……”
                      </p>
                      <div className="mt-3 p-2 bg-slate-900/80 border border-slate-700 text-[11px] text-holo-lie italic flex items-center gap-1.5">
                        <ShieldAlert className="w-3.5 h-3.5 text-holo-amber" />
                        <span>[ECHO_HYSTERESIS // 磁滞推演中 · 锻炉早在四百年前已经冷却固化]</span>
                      </div>
                    </div>
                  )}
                  {dialogueStep === 2 && (
                    <p>
                      “……炉火已经凉了？难怪……无论我怎么拉风箱，手心都是冷的。记录员，把总线互斥锁合上吧。别让电流把这里烧成死灰。”
                    </p>
                  )}
                </div>

                <div className="space-y-2 pt-2">
                  {dialogueStep === 0 && (
                    <button
                      onClick={() => setDialogueStep(1)}
                      className="w-full text-left p-3 bg-surface-dark border border-holo-cyan/25 hover:border-holo-cyan rounded-sm text-slate-300 hover:text-holo-cyan transition-all text-xs"
                    >
                      1. “战争早已结束了，沃坎。这里不是兵工厂，是恒星计算机的电源总线。”
                    </button>
                  )}
                  {dialogueStep === 1 && (
                    <button
                      onClick={() => setDialogueStep(2)}
                      className="w-full text-left p-3 bg-surface-dark border border-holo-cyan/25 hover:border-holo-cyan rounded-sm text-slate-300 hover:text-holo-cyan transition-all text-xs"
                    >
                      1. “摸摸你的炉膛，沃坎。没有火，只有残响。”
                    </button>
                  )}
                  {dialogueStep === 2 && (
                    <button
                      onClick={() => {
                        onCollectProposition(
                          "Kiln.Bus.Mutex",
                          "沃坎交接的电源总线互斥命题"
                        );
                        setActiveModal(null);
                      }}
                      className="w-full py-3 bg-gradient-to-r from-amber-900/40 to-surface border border-holo-amber hover:bg-holo-amber hover:text-void text-holo-amber text-xs font-mono uppercase tracking-wider rounded-sm shadow-holo-amber transition-all text-center"
                    >
                      [锁定总线权限 · 结束对话]
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Fallback for any other hotspots */}
            {activeModal.id !== "hs-beacon" &&
              activeModal.id !== "hs-antenna-panel" &&
              activeModal.id !== "hs-bus-valve" &&
              activeModal.id !== "hs-tarkis" &&
              activeModal.id !== "hs-vulkan" && (
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
