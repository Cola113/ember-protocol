"use client";

import React, { useState } from "react";
import { Compass, BookOpen, Terminal, Shield, ArrowRight } from "lucide-react";

interface ShipInteriorViewProps {
  onNavigateGalaxy: () => void;
  onNavigateIndex: () => void;
  believedTruthsCount: number;
}

export default function ShipInteriorView({
  onNavigateGalaxy,
  onNavigateIndex,
  believedTruthsCount,
}: ShipInteriorViewProps) {
  const [activeStation, setActiveStation] = useState<"nav" | "hearth" | "logs" | "cryo">("nav");

  return (
    <div className="relative w-full h-full flex flex-col justify-between p-8 z-30 pointer-events-auto">
      {/* Top Banner */}
      <div className="flex justify-between items-center">
        <div className="font-display font-bold text-base text-holo-bright">
          ISV THRESHOLD // 探针舰桥主甲板
        </div>
        <div className="text-xs font-mono text-holo-amber">
          PARITY LOCK: STANDBY
        </div>
      </div>

      {/* Main Grid: Stations List & Terminal Output */}
      <div className="my-auto max-w-5xl mx-auto w-full grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left Stations */}
        <div className="holo-panel p-5 rounded-sm flex flex-col gap-3">
          <div className="text-xs font-mono font-bold text-holo-cyan border-b border-holo-cyan/15 pb-2 mb-1">
            舰桥操作节点 (4 STATIONS)
          </div>

          <button
            onClick={() => setActiveStation("nav")}
            className={`p-3.5 rounded-sm border text-left text-xs font-mono transition-all flex items-center gap-3 ${
              activeStation === "nav"
                ? "bg-holo-cyan/20 border-holo-cyan text-holo-cyan shadow-holo-cyan"
                : "bg-surface-dark border-holo-border text-slate-300 hover:border-holo-cyan/50"
            }`}
          >
            <Compass className="w-4 h-4" />
            <div>
              <div className="font-bold">01. 星图导航坞</div>
              <div className="text-[10px] text-holo-muted">Ember Spur 3D Topology</div>
            </div>
          </button>

          <button
            onClick={() => setActiveStation("hearth")}
            className={`p-3.5 rounded-sm border text-left text-xs font-mono transition-all flex items-center gap-3 ${
              activeStation === "hearth"
                ? "bg-holo-amber/20 border-holo-amber text-holo-amber shadow-holo-amber"
                : "bg-surface-dark border-holo-border text-slate-300 hover:border-holo-amber/50"
            }`}
          >
            <BookOpen className="w-4 h-4" />
            <div>
              <div className="font-bold">02. 综合索引台</div>
              <div className="text-[10px] text-holo-muted">Proposition Matrix</div>
            </div>
          </button>

          <button
            onClick={() => setActiveStation("logs")}
            className={`p-3.5 rounded-sm border text-left text-xs font-mono transition-all flex items-center gap-3 ${
              activeStation === "logs"
                ? "bg-holo-cyan/20 border-holo-cyan text-holo-cyan shadow-holo-cyan"
                : "bg-surface-dark border-holo-border text-slate-300 hover:border-holo-cyan/50"
            }`}
          >
            <Terminal className="w-4 h-4" />
            <div>
              <div className="font-bold">03. 历代日志终端</div>
              <div className="text-[10px] text-holo-muted">Recorder 01-09 Archive</div>
            </div>
          </button>

          <button
            onClick={() => setActiveStation("cryo")}
            className={`p-3.5 rounded-sm border text-left text-xs font-mono transition-all flex items-center gap-3 ${
              activeStation === "cryo"
                ? "bg-holo-cyan/20 border-holo-cyan text-holo-cyan shadow-holo-cyan"
                : "bg-surface-dark border-holo-border text-slate-300 hover:border-holo-cyan/50"
            }`}
          >
            <Shield className="w-4 h-4" />
            <div>
              <div className="font-bold">04. 休眠舱诊断</div>
              <div className="text-[10px] text-holo-muted">Vesper Core Sarcophagus</div>
            </div>
          </button>
        </div>

        {/* Right Station Details (2 cols span) */}
        <div className="md:col-span-2 holo-panel p-6 rounded-sm flex flex-col justify-between">
          <div>
            <div className="border-b border-holo-cyan/15 pb-3 mb-4">
              <div className="font-display font-bold text-base text-holo-bright">
                {activeStation === "nav" && "01. 星图导航坞 // NAVIGATION DOCK"}
                {activeStation === "hearth" && "02. 综合索引台 // SYNTHESIS HEARTH"}
                {activeStation === "logs" && "03. 历代日志终端 // ARCHIVAL LOG ARCHIVE"}
                {activeStation === "cryo" && "04. 休眠舱诊断 // CRYO SARCOPHAGUS"}
              </div>
              <div className="text-xs font-mono text-holo-cyan mt-0.5">
                ISV THRESHOLD PRIMARY SUBSYSTEM
              </div>
            </div>

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
                    - 核心记忆完整度：{(38.2 + believedTruthsCount * 10.3).toFixed(1)}%<br />
                    - 倒计时时钟：与星弧自催化能量涨落同步<br />
                    - 状态：每确证一条锚定真相，核心记忆将逐步复苏。
                  </p>
                </>
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
          </div>
        </div>
      </div>

      <div className="text-center text-xs font-mono text-holo-muted">
        VESSEL SYSTEMS: ALL ONLINE // USE TOP HUD OR STATIONS TO JUMP
      </div>
    </div>
  );
}
