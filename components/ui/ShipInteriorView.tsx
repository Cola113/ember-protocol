"use client";

import React, { useState, useEffect } from "react";
import {
  Compass,
  BookOpen,
  Terminal,
  Shield,
  Save,
  ArrowRight,
  CheckCircle2,
  Trash2,
  RefreshCw,
  Clock,
  Sparkles,
  ShieldCheck,
  AlertTriangle
} from "lucide-react";
import {
  SaveSlotData,
  SlotId,
  SLOT_IDS,
  getAllSaveSlots,
  saveGame,
  loadGame,
  deleteSaveGame,
  calculateMemoryIntegrity
} from "@/lib/save-system";

interface ShipInteriorViewProps {
  onNavigateGalaxy: () => void;
  onNavigateIndex: () => void;
  believedTruthsCount: number;
  collectedPropositions: string[];
  believedTruths: string[];
  completedHotspotIds: string[];
  onLoadSave: (data: SaveSlotData) => void;
  onNewGame: () => void;
}

export default function ShipInteriorView({
  onNavigateGalaxy,
  onNavigateIndex,
  believedTruthsCount,
  collectedPropositions,
  believedTruths,
  completedHotspotIds,
  onLoadSave,
  onNewGame,
}: ShipInteriorViewProps) {
  const [activeStation, setActiveStation] = useState<
    "nav" | "hearth" | "logs" | "cryo" | "archive"
  >("nav");

  // Save system state
  const [saveSlots, setSaveSlots] = useState<Record<SlotId, SaveSlotData | null>>({
    slot_1: null,
    slot_2: null,
    slot_3: null,
    auto: null,
  });
  const [selectedSlotId, setSelectedSlotId] = useState<SlotId>("slot_1");
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [showConfirmNewGame, setShowConfirmNewGame] = useState(false);

  const refreshSlots = () => {
    setSaveSlots(getAllSaveSlots());
  };

  useEffect(() => {
    refreshSlots();
  }, []);

  const handleSaveToSlot = (slotId: SlotId) => {
    const slotNames: Record<SlotId, string> = {
      slot_1: "存档槽位 01 // ALPHA",
      slot_2: "存档槽位 02 // BETA",
      slot_3: "存档槽位 03 // GAMMA",
      auto: "自动归档 // AUTOSAVE",
    };

    saveGame(slotId, slotNames[slotId], {
      collectedPropositions,
      believedTruths,
      completedHotspotIds,
      currentSector: "HELIX-7 SPUR",
    });

    refreshSlots();
    setStatusMessage(`【${slotNames[slotId]}】已成功写入 ISV 晶体存储介质！`);
    setTimeout(() => setStatusMessage(null), 3500);
  };

  const handleLoadSlot = (slotId: SlotId) => {
    const data = loadGame(slotId);
    if (!data) return;
    onLoadSave(data);
    setStatusMessage(`【${data.name}】已成功载入！探针记忆与星图拓扑已同步。`);
    setTimeout(() => setStatusMessage(null), 3500);
  };

  const handleDeleteSlot = (slotId: SlotId) => {
    deleteSaveGame(slotId);
    refreshSlots();
    setStatusMessage(`槽位 ${slotId} 记录已抹除。`);
    setTimeout(() => setStatusMessage(null), 3000);
  };

  const selectedSlotData = saveSlots[selectedSlotId];
  const currentIntegrity = calculateMemoryIntegrity(
    believedTruths.length,
    collectedPropositions.length
  );

  return (
    <div className="relative w-full h-full flex flex-col justify-between p-6 md:p-8 z-30 pointer-events-auto overflow-y-auto">
      {/* Top Banner */}
      <div className="flex justify-between items-center">
        <div className="font-display font-bold text-base text-holo-bright">
          ISV THRESHOLD // 探针舰桥主甲板
        </div>
        <div className="text-xs font-mono text-holo-amber flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-holo-amber animate-ping" />
          <span>PARITY LOCK: 0x00FF STANDBY</span>
        </div>
      </div>

      {/* Main Grid: Stations List & Terminal Output */}
      <div className="my-auto max-w-5xl mx-auto w-full grid grid-cols-1 md:grid-cols-3 gap-6 py-4">
        {/* Left Stations */}
        <div className="holo-panel p-4 md:p-5 rounded-sm flex flex-col gap-2.5">
          <div className="text-xs font-mono font-bold text-holo-cyan border-b border-holo-cyan/15 pb-2 mb-1 flex justify-between items-center">
            <span>舰桥操作节点 (5 STATIONS)</span>
            <span className="text-[10px] text-holo-muted">DECK A</span>
          </div>

          <button
            onClick={() => setActiveStation("nav")}
            className={`p-3 rounded-sm border text-left text-xs font-mono transition-all flex items-center gap-3 ${
              activeStation === "nav"
                ? "bg-holo-cyan/20 border-holo-cyan text-holo-cyan shadow-holo-cyan"
                : "bg-surface-dark border-holo-border text-slate-300 hover:border-holo-cyan/50"
            }`}
          >
            <Compass className="w-4 h-4 shrink-0" />
            <div>
              <div className="font-bold">01. 星图导航坞</div>
              <div className="text-[10px] text-holo-muted">Ember Spur 3D Topology</div>
            </div>
          </button>

          <button
            onClick={() => setActiveStation("hearth")}
            className={`p-3 rounded-sm border text-left text-xs font-mono transition-all flex items-center gap-3 ${
              activeStation === "hearth"
                ? "bg-holo-amber/20 border-holo-amber text-holo-amber shadow-holo-amber"
                : "bg-surface-dark border-holo-border text-slate-300 hover:border-holo-amber/50"
            }`}
          >
            <BookOpen className="w-4 h-4 shrink-0" />
            <div>
              <div className="font-bold">02. 综合索引台</div>
              <div className="text-[10px] text-holo-muted">Proposition Matrix</div>
            </div>
          </button>

          <button
            onClick={() => setActiveStation("logs")}
            className={`p-3 rounded-sm border text-left text-xs font-mono transition-all flex items-center gap-3 ${
              activeStation === "logs"
                ? "bg-holo-cyan/20 border-holo-cyan text-holo-cyan shadow-holo-cyan"
                : "bg-surface-dark border-holo-border text-slate-300 hover:border-holo-cyan/50"
            }`}
          >
            <Terminal className="w-4 h-4 shrink-0" />
            <div>
              <div className="font-bold">03. 历代日志终端</div>
              <div className="text-[10px] text-holo-muted">Recorder 01-09 Archive</div>
            </div>
          </button>

          <button
            onClick={() => setActiveStation("cryo")}
            className={`p-3 rounded-sm border text-left text-xs font-mono transition-all flex items-center gap-3 ${
              activeStation === "cryo"
                ? "bg-holo-cyan/20 border-holo-cyan text-holo-cyan shadow-holo-cyan"
                : "bg-surface-dark border-holo-border text-slate-300 hover:border-holo-cyan/50"
            }`}
          >
            <Shield className="w-4 h-4 shrink-0" />
            <div>
              <div className="font-bold">04. 休眠舱诊断</div>
              <div className="text-[10px] text-holo-muted">Vesper Core Sarcophagus</div>
            </div>
          </button>

          <button
            onClick={() => setActiveStation("archive")}
            className={`p-3 rounded-sm border text-left text-xs font-mono transition-all flex items-center gap-3 ${
              activeStation === "archive"
                ? "bg-holo-green/20 border-holo-green text-holo-green shadow-sm"
                : "bg-surface-dark border-holo-border text-slate-300 hover:border-holo-green/50"
            }`}
          >
            <Save className="w-4 h-4 shrink-0" />
            <div>
              <div className="font-bold">05. 记忆归档终端</div>
              <div className="text-[10px] text-holo-muted">Archival Chronicler / Save</div>
            </div>
          </button>
        </div>

        {/* Right Station Details (2 cols span) */}
        <div className="md:col-span-2 holo-panel p-6 rounded-sm flex flex-col justify-between">
          <div>
            <div className="border-b border-holo-cyan/15 pb-3 mb-4 flex justify-between items-center">
              <div>
                <div className="font-display font-bold text-base text-holo-bright">
                  {activeStation === "nav" && "01. 星图导航坞 // NAVIGATION DOCK"}
                  {activeStation === "hearth" && "02. 综合索引台 // SYNTHESIS HEARTH"}
                  {activeStation === "logs" && "03. 历代日志终端 // ARCHIVAL LOG ARCHIVE"}
                  {activeStation === "cryo" && "04. 休眠舱诊断 // CRYO SARCOPHAGUS"}
                  {activeStation === "archive" && "05. 记忆归档终端 // ARCHIVAL CHRONICLER"}
                </div>
                <div className="text-xs font-mono text-holo-cyan mt-0.5">
                  ISV THRESHOLD PRIMARY SUBSYSTEM
                </div>
              </div>

              {activeStation === "archive" && (
                <button
                  onClick={() => setShowConfirmNewGame(true)}
                  className="px-2.5 py-1 bg-red-950/40 border border-red-500/40 hover:bg-red-900/60 text-red-300 font-mono text-[11px] rounded-sm flex items-center gap-1.5 transition-colors"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>NEW GAME // 重置</span>
                </button>
              )}
            </div>

            {/* Status Message Feedback */}
            {statusMessage && (
              <div className="mb-4 p-3 bg-holo-green/15 border border-holo-green/40 text-holo-green font-mono text-xs rounded-sm animate-fadeIn flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{statusMessage}</span>
              </div>
            )}

            <div className="text-xs font-mono text-slate-300 leading-relaxed space-y-3">
              {activeStation === "nav" && (
                <>
                  <p>
                    测绘探针 *ISV Threshold* 已校准至余烬星弧（Ember Spur）坐标系。
                    当前可探测到 9 颗作者星球与多条跨星总线回路。
                  </p>
                  <p className="text-holo-cyan">
                    - 螺旋-7 (Helix-7)：已完成引导扇区握手<br />
                    - 窑 (Kiln)：侦测到高能互斥热核信号<br />
                    - 玻璃果园 (Glass Orchard)：侦测到只读光干涉条纹
                  </p>
                </>
              )}

              {activeStation === "hearth" && (
                <>
                  <p>
                    半实体全息书卷正持续同步你从各星球调查收集到的命题。
                    你可在此使用自然语言向 Curator 叙事引擎陈述你对 5+1 锚定真相的综合假说。
                  </p>
                  <p className="text-holo-amber">
                    当前已确证真相：{believedTruthsCount} / 6
                  </p>
                </>
              )}

              {activeStation === "logs" && (
                <>
                  <p className="text-holo-muted">
                    [RECORDER-01]: "星系开始冷却。第一轮计算收敛于 0x00FF。" [熔断]<br />
                    [RECORDER-04]: "我们在髓发现了活体湿件。神不是创造者，神是常驻进程。" [熔断]<br />
                    [RECORDER-08]: "我终于明白了为什么不能回头……不要点火。" [熔断]<br />
                    [RECORDER-09 / VESPER]: "核心记忆损坏 62%。执行余烬协议。" [当前运行中]
                  </p>
                </>
              )}

              {activeStation === "cryo" && (
                <>
                  <p>
                    - 身份代号：Recorder-9 [Parity Check Bit]<br />
                    - 核心记忆完整度：{currentIntegrity}%<br />
                    - 倒计时时钟：与星弧自催化能量涨落同步<br />
                    - 状态：每确证一条锚定真相与命题，核心记忆将逐步复苏。
                  </p>
                </>
              )}

              {/* Station 05: Archival Chronicler / Save & Load */}
              {activeStation === "archive" && (
                <div className="space-y-4">
                  {/* Current Active Run Telemetry */}
                  <div className="p-3 bg-surface-dark border border-holo-cyan/20 rounded-sm flex justify-between items-center text-[11px]">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-3.5 h-3.5 text-holo-amber" />
                      <span className="text-holo-bright">当前运行会话：</span>
                      <span className="text-holo-cyan">{collectedPropositions.length} 命题</span>
                      <span className="text-holo-muted">·</span>
                      <span className="text-holo-amber">{believedTruths.length} / 6 锚定真相</span>
                    </div>
                    <div className="text-holo-green font-bold">
                      记忆完整度: {currentIntegrity}%
                    </div>
                  </div>

                  {/* Slots Grid */}
                  <div className="grid grid-cols-2 gap-2.5">
                    {SLOT_IDS.map((slotId) => {
                      const data = saveSlots[slotId];
                      const isSelected = selectedSlotId === slotId;
                      const isAuto = slotId === "auto";

                      return (
                        <div
                          key={slotId}
                          onClick={() => setSelectedSlotId(slotId)}
                          className={`p-3 rounded-sm border cursor-pointer transition-all ${
                            isSelected
                              ? "bg-holo-green/15 border-holo-green text-holo-bright shadow-sm"
                              : data
                              ? "bg-surface-dark/90 border-holo-cyan/20 text-slate-300 hover:border-holo-cyan/50"
                              : "bg-surface-dark/40 border-slate-800 text-slate-500 hover:border-slate-700"
                          }`}
                        >
                          <div className="flex justify-between items-center mb-1">
                            <span className="font-bold text-xs">
                              {isAuto ? "自动存档 (AUTO)" : `存档槽位 ${slotId.replace("slot_", "0")}`}
                            </span>
                            {data && (
                              <span className="text-[10px] text-holo-green bg-holo-green/10 px-1 rounded">
                                {data.memoryIntegrity}%
                              </span>
                            )}
                          </div>

                          {data ? (
                            <div className="space-y-0.5 text-[10px] text-holo-muted">
                              <div className="flex items-center gap-1 text-slate-400">
                                <Clock className="w-2.5 h-2.5" />
                                <span>{new Date(data.timestamp).toLocaleString("zh-CN", { hour12: false })}</span>
                              </div>
                              <div>真相: {data.believedTruths.length}/6 · 命题: {data.collectedPropositions.length}</div>
                            </div>
                          ) : (
                            <div className="text-[10px] text-slate-600 italic">
                              [空存储晶格 · 空白]
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Selected Slot Detailed Panel & Actions */}
                  <div className="p-3.5 bg-surface-dark/90 border border-holo-cyan/25 rounded-sm flex flex-col gap-3">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-bold text-holo-cyan">
                        当前选中：{selectedSlotId === "auto" ? "自动存档 (AUTOSAVE)" : `槽位 ${selectedSlotId.toUpperCase()}`}
                      </span>
                      {selectedSlotData && (
                        <button
                          onClick={() => handleDeleteSlot(selectedSlotId)}
                          className="text-red-400 hover:text-red-300 flex items-center gap-1 text-[11px] transition-colors"
                        >
                          <Trash2 className="w-3 h-3" />
                          <span>删除</span>
                        </button>
                      )}
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={() => handleSaveToSlot(selectedSlotId)}
                        className="flex-1 py-2 bg-holo-cyan/20 border border-holo-cyan hover:bg-holo-cyan hover:text-void text-holo-bright text-xs font-mono uppercase tracking-wider rounded-sm flex items-center justify-center gap-2 transition-all"
                      >
                        <Save className="w-3.5 h-3.5" />
                        <span>写入此槽位 (SAVE)</span>
                      </button>

                      <button
                        onClick={() => handleLoadSlot(selectedSlotId)}
                        disabled={!selectedSlotData}
                        className="flex-1 py-2 bg-holo-green/20 border border-holo-green hover:bg-holo-green hover:text-void disabled:opacity-30 disabled:hover:bg-holo-green/20 disabled:hover:text-holo-green text-holo-green text-xs font-mono uppercase tracking-wider rounded-sm flex items-center justify-center gap-2 transition-all"
                      >
                        <ShieldCheck className="w-3.5 h-3.5" />
                        <span>读取此槽位 (LOAD)</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="pt-6 border-t border-holo-cyan/10">
            {activeStation === "nav" && (
              <button
                onClick={onNavigateGalaxy}
                className="w-full py-3 bg-gradient-to-r from-holo-cyan/20 to-surface border border-holo-cyan hover:bg-holo-cyan hover:text-void text-holo-bright text-xs font-mono uppercase tracking-widest rounded-sm shadow-holo-cyan flex items-center justify-center gap-2 transition-all"
              >
                <span>接入 3D 星系视图</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            )}

            {activeStation === "hearth" && (
              <button
                onClick={onNavigateIndex}
                className="w-full py-3 bg-gradient-to-r from-holo-amber/20 to-surface border border-holo-amber hover:bg-holo-amber hover:text-void text-holo-amber text-xs font-mono uppercase tracking-widest rounded-sm shadow-holo-amber flex items-center justify-center gap-2 transition-all"
              >
                <span>打开综合索引面板</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            )}

            {activeStation === "logs" && (
              <button
                onClick={() => setActiveStation("archive")}
                className="w-full py-3 bg-gradient-to-r from-holo-cyan/20 to-surface border border-holo-cyan hover:bg-holo-cyan hover:text-void text-holo-bright text-xs font-mono uppercase tracking-widest rounded-sm shadow-holo-cyan flex items-center justify-center gap-2 transition-all"
              >
                <span>前往记忆归档台 (SAVE/LOAD)</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            )}

            {activeStation === "cryo" && (
              <button
                onClick={onNavigateIndex}
                className="w-full py-3 bg-gradient-to-r from-holo-cyan/20 to-surface border border-holo-cyan hover:bg-holo-cyan hover:text-void text-holo-bright text-xs font-mono uppercase tracking-widest rounded-sm shadow-holo-cyan flex items-center justify-center gap-2 transition-all"
              >
                <span>前往综合索引矩阵校验认知</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Confirmation Modal for New Game */}
      {showConfirmNewGame && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-void/80 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-md holo-panel p-6 rounded-sm border-red-500/50 shadow-2xl space-y-4">
            <div className="flex items-center gap-2 text-red-400 font-bold text-sm">
              <AlertTriangle className="w-5 h-5" />
              <span>确认重置并开启新游戏？</span>
            </div>
            <p className="text-xs font-mono text-slate-300 leading-relaxed">
              重置将清除当前运行中的所有未存档探索进度（已收集命题、已确证真相与热点完成度），并将探针初始化回 Helix-7 引导起点。
            </p>
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setShowConfirmNewGame(false)}
                className="flex-1 py-2 bg-surface border border-holo-border hover:border-holo-cyan text-slate-300 font-mono text-xs rounded-sm transition-all"
              >
                取消
              </button>
              <button
                onClick={() => {
                  setShowConfirmNewGame(false);
                  onNewGame();
                  setStatusMessage("已初始化新游戏会话。");
                  setTimeout(() => setStatusMessage(null), 3000);
                }}
                className="flex-1 py-2 bg-red-950/60 border border-red-500 hover:bg-red-600 hover:text-void text-red-200 font-mono text-xs rounded-sm transition-all font-bold"
              >
                确认重置 (RESET)
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="text-center text-xs font-mono text-holo-muted">
        VESSEL SYSTEMS: ALL ONLINE // USE TOP HUD OR STATIONS TO JUMP
      </div>
    </div>
  );
}
