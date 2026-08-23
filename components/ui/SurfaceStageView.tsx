"use client";

import React, { useState } from "react";
import { PlanetDef, LandingSite } from "@/lib/canon";
import { ArrowLeft, MessageSquare, Search, Cog, Check, Sparkles } from "lucide-react";

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

  const handleHotspotClick = (hotspot: any) => {
    setActiveModal(hotspot);
    setDialogueStep(0);
  };

  return (
    <div className="relative w-full h-full flex flex-col justify-between p-8 z-30 pointer-events-auto">
      {/* Top Banner */}
      <div className="flex justify-between items-center">
        <button
          onClick={onReturnOrbit}
          className="px-4 py-2 bg-surface border border-holo-border hover:border-holo-cyan text-holo-bright text-xs font-mono flex items-center gap-2 rounded-sm transition-all"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>RETURN TO ORBIT</span>
        </button>

        <div className="holo-panel px-4 py-2 rounded-sm text-center">
          <div className="font-display font-bold text-sm text-holo-bright">
            {planet.name} // {site.name}
          </div>
          <div className="text-[10px] font-mono text-holo-cyan">
            SURFACE VIGNETTE (40×40m VIRTUAL STAGE)
          </div>
        </div>

        <div className="text-xs font-mono text-holo-muted">
          COLLECTED: {collectedPropositions.length} PROPOSITIONS
        </div>
      </div>

      {/* Surface Hotspots Grid / Interactive Nodes */}
      <div className="my-auto max-w-4xl mx-auto w-full grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {site.hotspots.map((hs) => {
          const isCollected = hs.proposition && collectedPropositions.includes(hs.proposition);
          return (
            <div
              key={hs.id}
              onClick={() => handleHotspotClick(hs)}
              className="holo-panel p-6 rounded-sm cursor-pointer hover:border-holo-cyan hover:shadow-holo-cyan transition-all duration-300 group flex flex-col justify-between"
            >
              <div>
                <div className="flex justify-between items-start mb-3">
                  <div className="p-2 bg-surface-dark border border-holo-cyan/20 rounded-sm text-holo-cyan group-hover:text-holo-amber transition-colors">
                    {hs.type === "dialogue" ? (
                      <MessageSquare className="w-5 h-5" />
                    ) : hs.type === "operate" ? (
                      <Cog className="w-5 h-5" />
                    ) : (
                      <Search className="w-5 h-5" />
                    )}
                  </div>
                  {isCollected && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-mono text-holo-green bg-holo-green/10 px-2 py-0.5 rounded border border-holo-green/30">
                      <Check className="w-3 h-3" />
                      <span>LOGGED</span>
                    </span>
                  )}
                </div>

                <div className="font-bold text-sm text-holo-bright mb-1 group-hover:text-holo-cyan transition-colors">
                  {hs.name}
                </div>
                <div className="text-xs text-holo-muted font-mono capitalize">
                  TYPE: {hs.type}
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-holo-cyan/10 flex justify-between items-center text-[11px] font-mono text-holo-cyan">
                <span>[CLICK TO ENGAGE]</span>
                <span>→</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Hotspot Modal / Inspect / Dialogue Box */}
      {activeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-void/80 backdrop-blur-sm">
          <div className="w-full max-w-xl holo-panel p-6 md:p-8 rounded-sm animate-fadeIn">
            <div className="flex justify-between items-start border-b border-holo-cyan/15 pb-3 mb-4">
              <div>
                <div className="font-display font-bold text-base text-holo-bright">
                  {activeModal.name}
                </div>
                <div className="text-xs font-mono text-holo-cyan mt-0.5">
                  HOTSPOT INTERACTION // {activeModal.type.toUpperCase()}
                </div>
              </div>
              <button
                onClick={() => setActiveModal(null)}
                className="text-holo-muted hover:text-holo-bright text-sm"
              >
                ✕
              </button>
            </div>

            {/* Inspect / Operate Mode */}
            {activeModal.type !== "dialogue" ? (
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
                    <div className="text-[11px] text-slate-400 mt-1">
                      已提取为可钉选命题，可在综合索引台中用于验证真相或解锁机关。
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
            ) : (
              /* Dialogue Mode */
              <div className="space-y-4 text-xs font-mono">
                <div className="p-4 bg-surface-dark/70 border border-holo-cyan/20 rounded-sm leading-relaxed text-holo-bright text-sm">
                  {dialogueStep === 0 && (
                    <p>
                      “我的交接班记录上写得很清楚，距第三舰队的巡逻艇到达还有十二分钟。信标只是在……只是在做常规的开机预热。”
                    </p>
                  )}
                  {dialogueStep === 1 && (
                    <p>
                      “胡说！我昨晚还听到了 Kiln 传来的熔炉广播！他们说新的超导铜管已经铺设完毕，今天全星系都要通电！你仔细听……那不是回音，那是他们在说话！”
                      <span className="block mt-2 text-xs italic text-holo-lie">
                        [ECHO_HYSTERESIS // 磁滞推演中 · 对方可能在圆谎]
                      </span>
                    </p>
                  )}
                  {dialogueStep === 2 && (
                    <p>
                      “……如果他们真的不在了，那我这四百年来到底是在等谁换班？记录者，拿走这个频率吧。别让天线停下，至少让它觉得，还有人在听。”
                    </p>
                  )}
                </div>

                <div className="space-y-2 pt-2">
                  {dialogueStep === 0 && (
                    <button
                      onClick={() => setDialogueStep(1)}
                      className="w-full text-left p-2.5 bg-surface-dark border border-holo-cyan/20 hover:border-holo-cyan rounded-sm text-slate-300 hover:text-holo-cyan transition-all text-xs"
                    >
                      1. “舰队不会来了。星系已经沉默了四百年。”
                    </button>
                  )}
                  {dialogueStep === 1 && (
                    <button
                      onClick={() => setDialogueStep(2)}
                      className="w-full text-left p-2.5 bg-surface-dark border border-holo-cyan/20 hover:border-holo-cyan rounded-sm text-slate-300 hover:text-holo-cyan transition-all text-xs"
                    >
                      1. “那是死者的磁滞回声。把频率交给我吧。”
                    </button>
                  )}
                  {dialogueStep === 2 && (
                    <button
                      onClick={() => {
                        if (activeModal.proposition) {
                          onCollectProposition(
                            activeModal.proposition,
                            `${planet.name} 残响对话交付线索`
                          );
                        }
                        setActiveModal(null);
                      }}
                      className="w-full py-2.5 bg-holo-amber/20 border border-holo-amber hover:bg-holo-amber hover:text-void text-holo-amber text-xs font-mono uppercase rounded-sm shadow-holo-amber transition-all text-center"
                    >
                      [获得线索 · 结束对话]
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Bottom Hint */}
      <div className="text-center text-xs font-mono text-holo-muted">
        CLICK VIRTUAL HOTSPOTS TO INVESTIGATE OR CHAT // PRESS [TAB] FOR INDEX DESK
      </div>
    </div>
  );
}
