"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CANON, AnchorTruth } from "@/lib/canon";
import {
  ArrowLeft,
  CheckCircle,
  HelpCircle,
  Send,
  AlertCircle,
  Pin,
  FileText,
  Lightbulb,
  Check,
  ShieldCheck,
  Lock,
  Network,
  Layers,
  Cpu,
  Zap,
  Info
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
  const [tabMode, setTabMode] = useState<"synthesis" | "graph">("synthesis");
  const [selectedTruth, setSelectedTruth] = useState<AnchorTruth>(CANON.anchorTruths[0]);
  const [hypothesis, setHypothesis] = useState("");
  const [evalResult, setEvalResult] = useState<EvalResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [draggedProp, setDraggedProp] = useState<string | null>(null);
  const [pinnedFlashProp, setPinnedFlashProp] = useState<string | null>(null);

  const containerRef = React.useRef<HTMLDivElement>(null);
  const previousActiveElement = React.useRef<HTMLElement | null>(null);

  // Store active element on mount and restore on unmount
  React.useEffect(() => {
    previousActiveElement.current = document.activeElement as HTMLElement | null;
    containerRef.current?.focus();
    return () => {
      previousActiveElement.current?.focus();
    };
  }, []);

  // Trap focus within the dialog modal
  React.useEffect(() => {
    const handleTab = (e: KeyboardEvent) => {
      if (e.key !== "Tab" || !containerRef.current) return;
      const focusableElements = containerRef.current.querySelectorAll<HTMLElement>(
        'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
      );
      if (focusableElements.length === 0) return;
      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];

      if (e.shiftKey) {
        if (document.activeElement === firstElement || document.activeElement === containerRef.current) {
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

  const getStatusLevel = (status: "unknown" | "encountered" | "suspected" | "believed") => {
    switch (status) {
      case "unknown": return 0;
      case "encountered": return 1;
      case "suspected": return 2;
      case "believed": return 3;
    }
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
    setPinnedFlashProp(prop);
    setTimeout(() => setPinnedFlashProp(null), 600);
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
    <motion.div
      ref={containerRef}
      tabIndex={-1}
      role="dialog"
      aria-modal="true"
      aria-label="公证索引台与演绎推理图谱"
      initial={{ opacity: 0, scale: 0.98, y: 10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.98, y: 10 }}
      transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
      className="fixed inset-0 z-50 bg-void/95 backdrop-blur-xl flex flex-col p-5 md:p-8 pointer-events-auto outline-none"
    >
      {/* Top Bar */}
      <div className="flex justify-between items-center border-b border-holo-cyan/20 pb-4 mb-5">
        <button
          onClick={onClose}
          className="px-4 py-2 bg-surface border border-holo-border hover:border-holo-cyan text-holo-bright text-xs font-mono flex items-center gap-2 rounded-sm transition-all shadow-md"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>RETURN TO VIEW [ESC]</span>
        </button>

        {/* Center View Mode Switcher */}
        <div className="flex items-center gap-2 p-1 bg-surface-dark border border-holo-cyan/30 rounded-sm">
          <button
            onClick={() => setTabMode("synthesis")}
            className={`px-3.5 py-1.5 rounded-sm text-xs font-mono flex items-center gap-2 transition-all ${
              tabMode === "synthesis"
                ? "bg-holo-amber/20 border border-holo-amber text-holo-amber shadow-holo-amber font-bold"
                : "text-slate-400 hover:text-holo-bright"
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>命题综合台 (SYNTHESIS)</span>
          </button>
          <button
            onClick={() => setTabMode("graph")}
            className={`px-3.5 py-1.5 rounded-sm text-xs font-mono flex items-center gap-2 transition-all ${
              tabMode === "graph"
                ? "bg-holo-cyan/20 border border-holo-cyan text-holo-cyan shadow-holo-cyan font-bold"
                : "text-slate-400 hover:text-holo-bright"
            }`}
          >
            <Network className="w-3.5 h-3.5" />
            <span>推理图谱拓扑 (GRAPH MATRIX)</span>
          </button>
        </div>

        <div className="px-3.5 py-1.5 bg-surface border border-holo-border text-xs font-mono text-holo-amber flex items-center gap-2 rounded-sm shadow-sm">
          <ShieldCheck className="w-3.5 h-3.5 text-holo-amber" />
          <span>BELIEVED: {believedTruths.length} / 6</span>
        </div>
      </div>

      {/* Mode 1: Synthesis 3-Column Workspace */}
      {tabMode === "synthesis" ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 flex-1 overflow-hidden">
          {/* Col 1: Proposition Shelf (Draggable & Clickable) */}
          <div className="holo-panel p-5 rounded-sm flex flex-col overflow-hidden border-holo-cyan/25">
            <div className="flex justify-between items-center border-b border-holo-cyan/15 pb-2.5 mb-3 text-xs font-mono font-bold text-holo-cyan">
              <span className="flex items-center gap-1.5">
                <Pin className="w-3.5 h-3.5" />
                已归档命题库 (PINNED SHELF)
              </span>
              <span className="text-holo-bright font-normal">{collectedPropositions.length} PINS</span>
            </div>

            <div className="text-[11px] text-holo-muted mb-2 font-mono">
              支持点击直接钉选，或拖拽卡片至假说输入框：
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
                collectedPropositions.map((p, idx) => {
                  const isFlash = pinnedFlashProp === p;
                  return (
                    <motion.div
                      key={idx}
                      draggable
                      onDragStart={(e: any) => {
                        setDraggedProp(p);
                        if (e.dataTransfer) {
                          e.dataTransfer.setData("text/plain", `[${p}]`);
                        }
                      }}
                      onDragEnd={() => setDraggedProp(null)}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => insertProp(p)}
                      className={`p-3 rounded-sm cursor-grab active:cursor-grabbing transition-all text-xs font-mono group border ${
                        isFlash
                          ? "bg-holo-amber/30 border-holo-amber shadow-holo-amber scale-105"
                          : "bg-surface-dark/80 border-holo-cyan/20 hover:border-holo-cyan hover:shadow-holo-cyan"
                      }`}
                    >
                      <div className="flex justify-between items-start mb-1">
                        <span className="font-bold text-holo-cyan group-hover:text-holo-amber transition-colors">
                          {p}
                        </span>
                        <Pin className="w-3 h-3 text-holo-muted group-hover:text-holo-cyan" />
                      </div>
                      <div className="text-[10px] text-holo-muted flex items-center justify-between">
                        <span>点击钉选 / 拖拽归档</span>
                        <span className="text-[9px] text-holo-cyan/60 uppercase">PINNED</span>
                      </div>
                    </motion.div>
                  );
                })
              )}
            </div>
          </div>

          {/* Col 2: 5+1 Anchor Truths State Machine */}
          <div className="holo-panel p-5 rounded-sm flex flex-col overflow-hidden border-holo-cyan/25">
            <div className="flex justify-between items-center border-b border-holo-cyan/15 pb-2.5 mb-3 text-xs font-mono font-bold text-holo-amber">
              <span>5+1 锚定真相认知状态机</span>
              <span className="text-holo-bright font-normal">{believedTruths.length} / 6 BELIEVED</span>
            </div>

            <div className="flex-1 overflow-y-auto space-y-3 pr-1">
              {CANON.anchorTruths.map((t) => {
                const status = getTruthStatus(t);
                const isSelected = selectedTruth.id === t.id;
                const statusLvl = getStatusLevel(status);

                return (
                  <motion.div
                    key={t.id}
                    whileHover={{ x: 2 }}
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
                        : status === "encountered"
                        ? "bg-amber-950/20 border-amber-500/30 text-slate-300"
                        : "bg-surface-dark/60 border-holo-border text-slate-400 hover:border-holo-cyan/30"
                    }`}
                  >
                    <div className="flex justify-between items-center mb-1.5">
                      <span className="font-bold text-xs text-holo-bright">
                        {t.id}. {t.title}
                      </span>
                      <span
                        className={`text-[9px] px-2 py-0.5 rounded font-mono font-bold uppercase transition-all ${
                          status === "believed"
                            ? "bg-holo-green/20 text-holo-green border border-holo-green/40 shadow-sm"
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

                    {/* 4-Stage Mini Progress Gauge */}
                    <div className="w-full h-1 bg-surface-dark rounded-full overflow-hidden mb-2 border border-holo-cyan/15">
                      <div
                        className={`h-full transition-all duration-500 ${
                          status === "believed"
                            ? "w-full bg-holo-green"
                            : status === "suspected"
                            ? "w-3/4 bg-holo-cyan"
                            : status === "encountered"
                            ? "w-1/2 bg-holo-amber"
                            : "w-1/6 bg-slate-700"
                        }`}
                      />
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
                  </motion.div>
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

              {/* Textarea with Drag & Drop Receptor */}
              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  const data = e.dataTransfer.getData("text/plain");
                  if (data) {
                    setHypothesis((prev) => (prev ? `${prev} ${data}` : data));
                  }
                }}
                className="relative"
              >
                <textarea
                  value={hypothesis}
                  onChange={(e) => setHypothesis(e.target.value)}
                  placeholder={
                    hasAllRequiredProps
                      ? "在此输入或拖拽命题... 例如：Helix-7 的信标并非求救信号，而是整台恒星计算机初始引导扇区的常驻握手载波与引导程序..."
                      : `前置命题未集齐：还需收集 ${missingProps.length} 个必要命题 (${missingProps.join(", ")}) 才能开启综合推演。`
                  }
                  disabled={!hasAllRequiredProps && !isAlreadyBelieved}
                  className={`w-full h-32 bg-surface-dark/90 border disabled:opacity-40 p-3 text-xs font-mono text-holo-bright rounded-sm outline-none resize-none leading-relaxed transition-all mb-2 ${
                    draggedProp
                      ? "border-holo-cyan shadow-holo-cyan bg-holo-cyan/10"
                      : "border-holo-cyan/20 focus:border-holo-amber"
                  }`}
                />
              </div>

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
                className="w-full py-2.5 bg-gradient-to-r from-holo-amber/30 via-holo-amber/20 to-surface border border-holo-amber hover:bg-holo-amber hover:text-void disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-holo-amber text-holo-amber text-xs font-mono uppercase tracking-wider rounded-sm shadow-holo-amber flex items-center justify-center gap-2 transition-all mb-3 font-bold"
              >
                {loading ? (
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full border-2 border-holo-amber border-t-transparent animate-spin" />
                    <span>CURATOR 正在评估假说矩阵...</span>
                  </div>
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

              {/* Evaluator Output Display with Astral Noir animations */}
              <div className="flex-1 p-3.5 bg-surface-dark/95 border border-holo-cyan/20 rounded-sm overflow-y-auto text-xs font-mono leading-relaxed relative">
                {loading && (
                  <div className="absolute inset-0 bg-void/80 flex flex-col items-center justify-center gap-2 p-4 text-center">
                    <div className="w-16 h-16 rounded-full border border-holo-cyan/40 border-t-holo-cyan animate-spin" />
                    <span className="text-[11px] text-holo-cyan animate-pulse">正在进行语义嵌入校验与正典因果图比对...</span>
                  </div>
                )}

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
                    <HelpCircle className="w-4 h-4 text-holo-cyan shrink-0" />
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
      ) : (
        /* Mode 2: Interactive Inference Graph Topology */
        <div className="holo-panel p-6 rounded-sm flex-1 flex flex-col overflow-hidden border-holo-cyan/30">
          <div className="flex justify-between items-center border-b border-holo-cyan/20 pb-3 mb-4">
            <div className="flex items-center gap-2 text-xs font-mono text-holo-cyan font-bold">
              <Network className="w-4 h-4" />
              <span>5+1 ANCHOR TRUTHS INFERENCE TOPOLOGY // 推理图谱拓扑连线</span>
            </div>
            <div className="text-xs font-mono text-holo-muted">
              金色 = 已确证真相 · 天青 = 已收集命题 · 虚线 = 待推演因果
            </div>
          </div>

          {/* Graph Visual Canvas */}
          <div className="flex-1 bg-surface-dark/95 border border-holo-cyan/20 rounded-sm p-4 relative overflow-y-auto">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {CANON.anchorTruths.map((t) => {
                const status = getTruthStatus(t);
                const isBelieved = status === "believed";
                const isSuspected = status === "suspected";

                return (
                  <div
                    key={t.id}
                    onClick={() => {
                      setSelectedTruth(t);
                      setTabMode("synthesis");
                    }}
                    className={`p-4 rounded-sm border transition-all cursor-pointer ${
                      isBelieved
                        ? "bg-holo-amber/15 border-holo-amber shadow-holo-amber"
                        : isSuspected
                        ? "bg-holo-cyan/15 border-holo-cyan shadow-holo-cyan"
                        : "bg-surface-dark/70 border-holo-border hover:border-holo-cyan/40"
                    }`}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div className="font-bold text-xs text-holo-bright flex items-center gap-1.5">
                        <Cpu className={`w-3.5 h-3.5 ${isBelieved ? "text-holo-amber" : isSuspected ? "text-holo-cyan" : "text-slate-500"}`} />
                        <span>{t.id}. {t.title}</span>
                      </div>
                      <span className={`text-[9px] px-2 py-0.5 rounded font-mono uppercase font-bold ${
                        isBelieved
                          ? "bg-holo-green/20 text-holo-green border border-holo-green/40"
                          : isSuspected
                          ? "bg-holo-cyan/20 text-holo-cyan border border-holo-cyan/40"
                          : "bg-surface text-slate-500 border border-slate-800"
                      }`}>
                        {status}
                      </span>
                    </div>

                    <p className="text-[11px] text-slate-300 line-clamp-2 mb-3">
                      {t.summary}
                    </p>

                    <div className="text-[10px] font-mono text-holo-muted mb-1.5 flex items-center gap-1">
                      <Zap className="w-3 h-3 text-holo-amber" />
                      <span>前置支撑命题链：</span>
                    </div>

                    <div className="space-y-1">
                      {t.required_propositions.map((p) => {
                        const isCollected = collectedPropositions.includes(p);
                        return (
                          <div
                            key={p}
                            className={`px-2 py-1 rounded text-[10px] font-mono flex justify-between items-center ${
                              isCollected
                                ? "bg-holo-cyan/10 text-holo-cyan border border-holo-cyan/30"
                                : "bg-surface text-slate-600 border border-slate-800"
                            }`}
                          >
                            <span>{p}</span>
                            <span>{isCollected ? "✓ 已归档" : "○ 未探索"}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="mt-3 flex justify-between items-center text-xs font-mono text-holo-muted pt-2 border-t border-holo-cyan/15">
            <span>点击任意真相卡片可直接切换至综合假说面板进行推演</span>
            <span className="text-holo-cyan">RECORDER-9 INFERENCE ENGINE</span>
          </div>
        </div>
      )}
    </motion.div>
  );
}
