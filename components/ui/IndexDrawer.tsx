"use client";

import React, { useState } from "react";
import { CANON, AnchorTruth } from "@/lib/canon";
import {
  ArrowLeft,
  Sparkles,
  CheckCircle,
  HelpCircle,
  Send,
  AlertCircle,
  Pin,
  FileText,
  Lightbulb,
  Check,
  ShieldCheck,
  Lock
} from "lucide-react";

interface IndexDrawerProps {
  onClose: () => void;
  collectedPropositions: string[];
  believedTruths: string[];
  onTruthBelieved: (truthId: string) => void;
}

interface EvalResult {
  truth_id?: string;
  verdict: "believed" | "suspected" | "partial";
  coverage_score: number;
  consistency_score: number;
  feedback: string;
  memory_recovered_delta?: number;
}

export default function IndexDrawer({
  onClose,
  collectedPropositions,
  believedTruths,
  onTruthBelieved,
}: IndexDrawerProps) {
  const [selectedTruth, setSelectedTruth] = useState<AnchorTruth>(CANON.anchorTruths[0]);
  const [hypothesis, setHypothesis] = useState("");
  const [evalResult, setEvalResult] = useState<EvalResult | null>(null);
  const [loading, setLoading] = useState(false);

  // Derive truth state machine: unknown | encountered | suspected | believed
  const getTruthStatus = (truth: AnchorTruth): "unknown" | "encountered" | "suspected" | "believed" => {
    if (believedTruths.includes(truth.id)) return "believed";
    const matchedCount = truth.required_propositions.filter((p) =>
      collectedPropositions.includes(p)
    ).length;
    if (matchedCount === truth.required_propositions.length && matchedCount > 0) {
      return "suspected";
    }
    if (matchedCount > 0) {
      return "encountered";
    }
    return "unknown";
  };

  const missingProps = selectedTruth.required_propositions.filter(
    (p) => !collectedPropositions.includes(p)
  );
  const hasAllRequiredProps = missingProps.length === 0;
  const isAlreadyBelieved = believedTruths.includes(selectedTruth.id);

  const handleSynthesize = async () => {
    if (!hypothesis.trim() || !hasAllRequiredProps) return;
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
      const data: EvalResult = await res.json();
      setEvalResult(data);
      if (data.verdict === "believed") {
        onTruthBelieved(selectedTruth.id);
      }
    } catch (e) {
      // Local robust canonical heuristic fallback with strict proposition guard
      if (!hasAllRequiredProps) {
        setEvalResult({
          truth_id: selectedTruth.id,
          verdict: "partial",
          coverage_score: 0.2,
          consistency_score: 0.4,
          feedback: `前置命题未集齐：必须先在相关星球收集全部必要命题（缺少：${missingProps.join(", ")}）。`,
          memory_recovered_delta: 0,
        });
        return;
      }

      const requiredKeywords = selectedTruth.keywords || [];
      const textLower = hypothesis.toLowerCase();
      const matchedKeywords = requiredKeywords.filter((kw) =>
        textLower.includes(kw.toLowerCase())
      );

      const isPass = matchedKeywords.length >= 1;

      const result: EvalResult = {
        truth_id: selectedTruth.id,
        verdict: isPass ? "believed" : "partial",
        coverage_score: isPass ? 0.95 : 0.45,
        consistency_score: isPass ? 0.98 : 0.6,
        feedback: isPass
          ? `Curator 评估通过：假说准确反映了正典事实【${selectedTruth.title}】。已确证为 BELIEVED。`
          : `假说推论尚未完全收敛，缺少核心关键推论（如：${requiredKeywords.slice(0, 3).join(", ")}）。请进一步完善。`,
        memory_recovered_delta: isPass ? 0.103 : 0,
      };

      setEvalResult(result);
      if (result.verdict === "believed") {
        onTruthBelieved(selectedTruth.id);
      }
    } finally {
      setLoading(false);
    }
  };

  const insertProp = (prop: string) => {
    setHypothesis((prev) => (prev ? `${prev} [${prop}]` : `[${prop}]`));
  };

  const loadDraftHypothesis = () => {
    if (selectedTruth.id === "T1") {
      setHypothesis(
        "Helix-7 上的信标并非母星求救信号，而是整台恒星计算机初始引导扇区的常驻握手载波与引导程序（Bootstrap Loader）。"
      );
    } else if (selectedTruth.id === "T2") {
      setHypothesis(
        "余烬星弧九颗星球构成分布式恒星计算机。窑（Kiln）担任能量总线互斥锁，玻璃果园（Glass Orchard）担任只读光存储矩阵（ROM）。"
      );
    } else if (selectedTruth.id === "T3") {
      setHypothesis(
        "咏井（Choir Well）圣歌为恒星计算机提供中央晶振时钟基频脉冲，针（Needle）尖塔阵列负责全域内存寻址与堆栈指针重定基底。"
      );
    } else if (selectedTruth.id === "T4") {
      setHypothesis(
        "400年前的灭绝是第一轮计算结束时的写回（Write-Back）操作。髓（Marrow）的生物湿件处理器与文明被坍缩编译为结果常数与残响。"
      );
    } else if (selectedTruth.id === "T5") {
      setHypothesis(
        "总账（Ledger）的错误日志与公证授权证实，记录员协议是中断第二轮点火的奇偶校验位机制，理解与认知即为停机钥匙。"
      );
    } else if (selectedTruth.id === "THidden") {
      setHypothesis(
        "晚星（Vesper）探针自己就是第9号奇偶校验位（Recorder-9）。前8代探针相继熔断，本次苏醒是终结自催化轮回的自我认知重逢。"
      );
    } else {
      setHypothesis(
        `针对【${selectedTruth.title}】的综合假说：通过 [${selectedTruth.required_propositions.join(
          ", "
        )}] 推演，证实其真正的计算角色与常数化事实。`
      );
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-void/95 backdrop-blur-xl flex flex-col p-6 md:p-8 animate-fadeIn pointer-events-auto">
      {/* Top Bar */}
      <div className="flex justify-between items-center border-b border-holo-cyan/20 pb-4 mb-6">
        <button
          onClick={onClose}
          className="px-4 py-2 bg-surface border border-holo-border hover:border-holo-cyan text-holo-bright text-xs font-mono flex items-center gap-2 rounded-sm transition-all shadow-md"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>RETURN TO VIEW [ESC]</span>
        </button>

        <div className="text-center">
          <div className="font-display font-bold text-base tracking-widest text-holo-bright flex items-center justify-center gap-2">
            <FileText className="w-4 h-4 text-holo-amber" />
            <span>SYNTHESIS DESK // 综合命题台</span>
          </div>
          <div className="text-xs font-mono text-holo-cyan mt-0.5">
            5+1 ANCHOR TRUTHS COGNITION MATRIX
          </div>
        </div>

        <div className="px-3 py-1 bg-surface border border-holo-border text-xs font-mono text-holo-amber flex items-center gap-2 rounded-sm">
          <ShieldCheck className="w-3.5 h-3.5 text-holo-amber" />
          <span>BELIEVED: {believedTruths.length} / 6</span>
        </div>
      </div>

      {/* 3-Column Layout */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 flex-1 overflow-hidden">
        {/* Col 1: Proposition Shelf */}
        <div className="holo-panel p-5 rounded-sm flex flex-col overflow-hidden border-holo-cyan/25">
          <div className="flex justify-between items-center border-b border-holo-cyan/15 pb-2.5 mb-3 text-xs font-mono font-bold text-holo-cyan">
            <span className="flex items-center gap-1.5">
              <Pin className="w-3.5 h-3.5" />
              已归档命题库 (PINNED SHELF)
            </span>
            <span className="text-holo-bright font-normal">{collectedPropositions.length} PINS</span>
          </div>

          <div className="flex-1 overflow-y-auto space-y-2.5 pr-1">
            {collectedPropositions.length === 0 ? (
              <div className="text-xs font-mono text-holo-muted p-6 text-center border border-dashed border-holo-cyan/15 rounded-sm my-auto">
                <p className="mb-2">尚未从星球探索中提取命题。</p>
                <p className="text-[11px] text-slate-500">
                  前往 Helix-7 冷启台地与偶极天线阵列调查以归档线索。
                </p>
              </div>
            ) : (
              collectedPropositions.map((p, idx) => (
                <div
                  key={idx}
                  onClick={() => insertProp(p)}
                  className="p-3 bg-surface-dark/80 border border-holo-cyan/20 hover:border-holo-cyan hover:shadow-holo-cyan rounded-sm cursor-pointer transition-all text-xs font-mono group"
                >
                  <div className="flex justify-between items-start mb-1">
                    <span className="font-bold text-holo-cyan group-hover:text-holo-amber transition-colors">
                      {p}
                    </span>
                    <Pin className="w-3 h-3 text-holo-muted group-hover:text-holo-cyan" />
                  </div>
                  <div className="text-[10px] text-holo-muted">点击直接插入综合假说框</div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Col 2: 5+1 Anchor Truths State Machine */}
        <div className="holo-panel p-5 rounded-sm flex flex-col overflow-hidden border-holo-cyan/25">
          <div className="flex justify-between items-center border-b border-holo-cyan/15 pb-2.5 mb-3 text-xs font-mono font-bold text-holo-amber">
            <span>5+1 锚定真相状态机</span>
            <span className="text-holo-bright font-normal">{believedTruths.length} / 6 BELIEVED</span>
          </div>

          <div className="flex-1 overflow-y-auto space-y-3 pr-1">
            {CANON.anchorTruths.map((t) => {
              const status = getTruthStatus(t);
              const isSelected = selectedTruth.id === t.id;

              return (
                <div
                  key={t.id}
                  onClick={() => {
                    setSelectedTruth(t);
                    setEvalResult(null);
                  }}
                  className={`p-3.5 rounded-sm border cursor-pointer transition-all ${
                    isSelected
                      ? "bg-holo-amber/15 border-holo-amber shadow-holo-amber"
                      : status === "believed"
                      ? "bg-holo-green/10 border-holo-green/50 text-holo-bright"
                      : status === "suspected"
                      ? "bg-holo-cyan/10 border-holo-cyan/40 text-holo-bright"
                      : "bg-surface-dark/60 border-holo-border text-slate-400 hover:border-holo-cyan/30"
                  }`}
                >
                  <div className="flex justify-between items-center mb-1.5">
                    <span className="font-bold text-xs text-holo-bright">
                      {t.id}. {t.title}
                    </span>
                    <span
                      className={`text-[9px] px-2 py-0.5 rounded font-mono font-bold uppercase ${
                        status === "believed"
                          ? "bg-holo-green/20 text-holo-green border border-holo-green/40"
                          : status === "suspected"
                          ? "bg-holo-cyan/20 text-holo-cyan border border-holo-cyan/40"
                          : status === "encountered"
                          ? "bg-holo-amber/20 text-holo-amber border border-holo-amber/40"
                          : "bg-surface text-holo-muted border border-holo-border"
                      }`}
                    >
                      {status}
                    </span>
                  </div>

                  <p className="text-[11px] text-slate-300 line-clamp-2 leading-relaxed mb-2">
                    {t.summary}
                  </p>

                  {/* Required propositions mini badges */}
                  <div className="flex flex-wrap gap-1 pt-1 border-t border-holo-cyan/10">
                    {t.required_propositions.map((req) => {
                      const has = collectedPropositions.includes(req);
                      return (
                        <span
                          key={req}
                          className={`text-[9px] px-1.5 py-0.5 rounded font-mono flex items-center gap-1 ${
                            has
                              ? "bg-holo-green/15 text-holo-green border border-holo-green/30"
                              : "bg-surface-dark text-slate-500 border border-slate-800"
                          }`}
                        >
                          {has ? <Check className="w-2.5 h-2.5" /> : "○"}
                          {req.split(".")[1] || req}
                        </span>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Col 3: Synthesis Input & AI Evaluator */}
        <div className="holo-panel p-5 rounded-sm flex flex-col overflow-hidden border-holo-cyan/25">
          <div className="flex justify-between items-center border-b border-holo-cyan/15 pb-2.5 mb-3 text-xs font-mono font-bold text-holo-bright">
            <span>综合假说陈述 // {selectedTruth.id}</span>
            <span className="text-holo-cyan text-[10px]">CURATOR HYPOTHESIS ENGINE</span>
          </div>

          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="flex justify-between items-center text-[11px] font-mono text-holo-muted mb-2">
              <span>陈述你对该真相的理解：</span>
              <button
                onClick={loadDraftHypothesis}
                disabled={!hasAllRequiredProps}
                className="text-[10px] text-holo-cyan hover:text-holo-amber disabled:opacity-30 disabled:hover:text-holo-cyan flex items-center gap-1 underline transition-colors"
              >
                <Lightbulb className="w-3 h-3" />
                <span>快速载入推论范例</span>
              </button>
            </div>

            <textarea
              value={hypothesis}
              onChange={(e) => setHypothesis(e.target.value)}
              placeholder={
                hasAllRequiredProps
                  ? "例如：Helix-7 的信标并非求救信号，而是整台恒星计算机初始引导扇区的常驻握手载波与引导程序..."
                  : `前置命题未集齐：还需收集 ${missingProps.length} 个必要命题 (${missingProps.join(", ")}) 才能开启综合推演。`
              }
              disabled={!hasAllRequiredProps && !isAlreadyBelieved}
              className="w-full h-32 bg-surface-dark/90 border border-holo-cyan/20 focus:border-holo-amber disabled:opacity-40 p-3 text-xs font-mono text-holo-bright rounded-sm outline-none resize-none leading-relaxed transition-colors mb-2"
            />

            {/* Required propositions status warning */}
            {!hasAllRequiredProps && !isAlreadyBelieved && (
              <div className="p-2.5 bg-holo-amber/10 border border-holo-amber/30 rounded-sm text-[11px] font-mono text-holo-amber flex items-center gap-2 mb-2">
                <Lock className="w-3.5 h-3.5 shrink-0" />
                <span>
                  未满足前置条件：需收集全部 {selectedTruth.required_propositions.length} 个必要命题（缺少 {missingProps.length} 个）
                </span>
              </div>
            )}

            <button
              onClick={handleSynthesize}
              disabled={loading || !hypothesis.trim() || !hasAllRequiredProps}
              className="w-full py-2.5 bg-gradient-to-r from-holo-amber/30 via-holo-amber/20 to-surface border border-holo-amber hover:bg-holo-amber hover:text-void disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-holo-amber text-holo-amber text-xs font-mono uppercase tracking-wider rounded-sm shadow-holo-amber flex items-center justify-center gap-2 transition-all mb-3"
            >
              {loading ? (
                <span>EVALUATING HYPOTHESIS...</span>
              ) : !hasAllRequiredProps ? (
                <>
                  <Lock className="w-3.5 h-3.5" />
                  <span>需要先收集 {missingProps.length} 个前置命题</span>
                </>
              ) : (
                <>
                  <Send className="w-3.5 h-3.5" />
                  <span>提交综合假说 (EXECUTE SYNTHESIS)</span>
                </>
              )}
            </button>

            {/* Evaluator Output Display */}
            <div className="flex-1 p-3.5 bg-surface-dark/95 border border-holo-cyan/20 rounded-sm overflow-y-auto text-xs font-mono leading-relaxed">
              {evalResult ? (
                <div>
                  <div
                    className={`flex items-center gap-2 font-bold mb-2 ${
                      evalResult.verdict === "believed" ? "text-holo-green" : "text-holo-amber"
                    }`}
                  >
                    {evalResult.verdict === "believed" ? (
                      <CheckCircle className="w-4 h-4" />
                    ) : (
                      <AlertCircle className="w-4 h-4" />
                    )}
                    <span>SYNTHESIS VERDICT: {evalResult.verdict.toUpperCase()}</span>
                  </div>
                  <div className="text-slate-300 mb-2">{evalResult.feedback}</div>
                  <div className="flex gap-4 pt-2 border-t border-holo-cyan/10 text-[11px] text-holo-cyan">
                    <span>COVERAGE: {(evalResult.coverage_score * 100).toFixed(0)}%</span>
                    <span>CONSISTENCY: {(evalResult.consistency_score * 100).toFixed(0)}%</span>
                  </div>
                </div>
              ) : (
                <div className="text-holo-muted flex items-center gap-2 my-auto">
                  <HelpCircle className="w-4 h-4 text-holo-cyan" />
                  <span>
                    {hasAllRequiredProps
                      ? "必要前置命题已集齐。请在上方陈述你对该真相的理解并提交评估。"
                      : `请先在相关星球探索收集所需的前置命题（缺少：${missingProps.join(", ")}）。`}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
