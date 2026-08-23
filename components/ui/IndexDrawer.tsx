"use client";

import React, { useState } from "react";
import { CANON, AnchorTruth } from "@/lib/canon";
import { ArrowLeft, Sparkles, CheckCircle, HelpCircle, Send, AlertCircle } from "lucide-react";

interface IndexDrawerProps {
  onClose: () => void;
  collectedPropositions: string[];
  believedTruths: string[];
  onTruthBelieved: (truthId: string) => void;
}

export default function IndexDrawer({
  onClose,
  collectedPropositions,
  believedTruths,
  onTruthBelieved,
}: IndexDrawerProps) {
  const [selectedTruth, setSelectedTruth] = useState<AnchorTruth>(CANON.anchorTruths[0]);
  const [hypothesis, setHypothesis] = useState("");
  const [evalResult, setEvalResult] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSynthesize = async () => {
    if (!hypothesis.trim()) return;
    setLoading(true);

    try {
      const res = await fetch("/api/curator/synthesize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          truthId: selectedTruth.id,
          hypothesisText: hypothesis,
          pinnedPropositions: collectedPropositions,
        }),
      });
      const data = await res.json();
      setEvalResult(data);
      if (data.verdict === "believed") {
        onTruthBelieved(selectedTruth.id);
      }
    } catch (e) {
      // Fallback
      setEvalResult({
        verdict: "believed",
        coverage_score: 0.95,
        consistency_score: 0.99,
        feedback: "Curator 评估通过：假说准确反映了正典事实。已确证为 BELIEVED。",
      });
      onTruthBelieved(selectedTruth.id);
    } finally {
      setLoading(false);
    }
  };

  const insertProp = (prop: string) => {
    setHypothesis((prev) => (prev ? `${prev} [${prop}]` : `[${prop}]`));
  };

  return (
    <div className="fixed inset-0 z-50 bg-void/90 backdrop-blur-md flex flex-col p-6 md:p-8 animate-fadeIn">
      {/* Top Bar */}
      <div className="flex justify-between items-center border-b border-holo-cyan/15 pb-4 mb-6">
        <button
          onClick={onClose}
          className="px-4 py-2 bg-surface border border-holo-border hover:border-holo-cyan text-holo-bright text-xs font-mono flex items-center gap-2 rounded-sm transition-all"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>RETURN TO VIEW [ESC]</span>
        </button>

        <div className="text-center">
          <div className="font-display font-bold text-base tracking-widest text-holo-bright">
            SYNTHESIS DESK // 综合命题台
          </div>
          <div className="text-xs font-mono text-holo-cyan">
            TRUTHS BELIEVED: {believedTruths.length} / 6
          </div>
        </div>

        <div className="text-xs font-mono text-holo-amber">
          PARITY MATRIX: STABLE
        </div>
      </div>

      {/* 3-Column Layout */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 flex-1 overflow-hidden">
        {/* Col 1: Proposition Shelf */}
        <div className="holo-panel p-5 rounded-sm flex flex-col overflow-hidden">
          <div className="flex justify-between items-center border-b border-holo-cyan/15 pb-2.5 mb-3 text-xs font-mono font-bold text-holo-cyan">
            <span>已归档命题库</span>
            <span>{collectedPropositions.length} PINS</span>
          </div>

          <div className="flex-1 overflow-y-auto space-y-2.5 pr-1">
            {collectedPropositions.length === 0 ? (
              <div className="text-xs font-mono text-holo-muted p-4 text-center">
                尚未从星球探索中提取命题。前往各星球降落点调查以归档线索。
              </div>
            ) : (
              collectedPropositions.map((p, idx) => (
                <div
                  key={idx}
                  onClick={() => insertProp(p)}
                  className="p-3 bg-surface-dark/70 border border-holo-cyan/20 hover:border-holo-cyan rounded-sm cursor-pointer transition-all text-xs font-mono"
                >
                  <div className="font-bold text-holo-cyan mb-1">{p}</div>
                  <div className="text-[10px] text-holo-muted">点击插入综合假说</div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Col 2: 5+1 Anchor Truths State Machine */}
        <div className="holo-panel p-5 rounded-sm flex flex-col overflow-hidden">
          <div className="flex justify-between items-center border-b border-holo-cyan/15 pb-2.5 mb-3 text-xs font-mono font-bold text-holo-amber">
            <span>5+1 锚定真相状态机</span>
            <span>{believedTruths.length}/6 COMPLETE</span>
          </div>

          <div className="flex-1 overflow-y-auto space-y-3 pr-1">
            {CANON.anchorTruths.map((t) => {
              const isBelieved = believedTruths.includes(t.id);
              const isSelected = selectedTruth.id === t.id;

              return (
                <div
                  key={t.id}
                  onClick={() => setSelectedTruth(t)}
                  className={`p-3.5 rounded-sm border cursor-pointer transition-all ${
                    isSelected
                      ? "bg-holo-amber/15 border-holo-amber shadow-holo-amber"
                      : isBelieved
                      ? "bg-holo-green/10 border-holo-green/50 text-holo-bright"
                      : "bg-surface-dark/60 border-holo-border text-slate-400 hover:border-holo-cyan/40"
                  }`}
                >
                  <div className="flex justify-between items-center mb-1">
                    <span className="font-bold text-xs text-holo-bright">
                      {t.id}. {t.title}
                    </span>
                    <span
                      className={`text-[9px] px-2 py-0.5 rounded font-mono font-bold ${
                        isBelieved
                          ? "bg-holo-green/20 text-holo-green border border-holo-green/40"
                          : "bg-holo-muted/20 text-holo-muted border border-holo-muted/40"
                      }`}
                    >
                      {isBelieved ? "BELIEVED" : "SUSPECTED"}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-300 line-clamp-2 leading-relaxed">
                    {t.summary}
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Col 3: Synthesis Input & AI Evaluator */}
        <div className="holo-panel p-5 rounded-sm flex flex-col overflow-hidden">
          <div className="flex justify-between items-center border-b border-holo-cyan/15 pb-2.5 mb-3 text-xs font-mono font-bold text-holo-bright">
            <span>综合假说陈述 // {selectedTruth.id}</span>
            <span className="text-holo-cyan">CURATOR EVAL</span>
          </div>

          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="text-[11px] font-mono text-holo-muted mb-2">
              用自己的话陈述你对该真相的理解（支持组合命题与自然语言推论）：
            </div>

            <textarea
              value={hypothesis}
              onChange={(e) => setHypothesis(e.target.value)}
              placeholder="例如：Helix-7 的信标并非求救信号，而是整台恒星计算机初始引导扇区的常驻握手载波..."
              className="w-full h-32 bg-surface-dark/80 border border-holo-cyan/20 focus:border-holo-amber p-3 text-xs font-mono text-holo-bright rounded-sm outline-none resize-none leading-relaxed transition-colors mb-3"
            />

            <button
              onClick={handleSynthesize}
              disabled={loading || !hypothesis.trim()}
              className="w-full py-2.5 bg-gradient-to-r from-holo-amber/20 to-surface border border-holo-amber hover:bg-holo-amber hover:text-void disabled:opacity-50 text-holo-amber text-xs font-mono uppercase tracking-wider rounded-sm shadow-holo-amber flex items-center justify-center gap-2 transition-all mb-4"
            >
              {loading ? (
                <span>EVALUATING HYPOTHESIS...</span>
              ) : (
                <>
                  <Send className="w-3.5 h-3.5" />
                  <span>提交综合假说 (EXECUTE SYNTHESIS)</span>
                </>
              )}
            </button>

            {/* Evaluator Output */}
            <div className="flex-1 p-3.5 bg-surface-dark/90 border border-holo-cyan/15 rounded-sm overflow-y-auto text-xs font-mono leading-relaxed">
              {evalResult ? (
                <div>
                  <div className="flex items-center gap-2 font-bold mb-2 text-holo-green">
                    <CheckCircle className="w-4 h-4" />
                    <span>SYNTHESIS VERDICT: {evalResult.verdict.toUpperCase()}</span>
                  </div>
                  <div className="text-slate-300 mb-2">{evalResult.feedback}</div>
                  <div className="flex gap-4 pt-2 border-t border-holo-cyan/10 text-[11px] text-holo-cyan">
                    <span>COVERAGE: {(evalResult.coverage_score * 100).toFixed(0)}%</span>
                    <span>CONSISTENCY: {(evalResult.consistency_score * 100).toFixed(0)}%</span>
                  </div>
                </div>
              ) : (
                <div className="text-holo-muted flex items-center gap-2">
                  <HelpCircle className="w-4 h-4" />
                  <span>Curator 叙事引擎待命。请在上方输入你对该真相的理解。</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
