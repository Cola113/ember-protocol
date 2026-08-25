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
  Check,
  ShieldCheck,
  Lock,
  Network,
  Cpu,
  Zap,
  Sparkles,
  RefreshCw
} from "lucide-react";
import { clientCuratorSynthesize } from "@/lib/api-client";

interface IndexDrawerProps {
  onClose: () => void;
  collectedPropositions: string[];
  believedTruths: string[];
  onTruthBelieved: (truthId: string) => void;
}

interface EvalResult {
  truth_id?: string;
  verdict: "passed" | "partial" | "failed" | "believed" | "suspected";
  coverage_score: number;
  consistency_score: number;
  coherence_score?: number;
  feedback: string;
  missing_required_propositions?: string[];
  degraded?: boolean;
  status?: string;
  memory_recovered_delta?: number;
}

const CONNECTIVES = ["因为", "所以", "不是", "而是", "并非"] as const;

export default function IndexDrawer({
  onClose,
  collectedPropositions,
  believedTruths,
  onTruthBelieved,
}: IndexDrawerProps) {
  const [tabMode, setTabMode] = useState<"synthesis" | "graph">("synthesis");
  const [selectedTruth, setSelectedTruth] = useState<AnchorTruth>(CANON.anchorTruths[0]);
  const [slotA, setSlotA] = useState("");
  const [slotB, setSlotB] = useState("");
  const [connective, setConnective] = useState<string>("并非");
  const [hypothesis, setHypothesis] = useState("");
  const [evalResult, setEvalResult] = useState<EvalResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [draggedProp, setDraggedProp] = useState<string | null>(null);
  const [pinnedFlashProp, setPinnedFlashProp] = useState<string | null>(null);
  const [activeSlotTarget, setActiveSlotTarget] = useState<"A" | "B">("A");

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

  // Auto-assemble hypothesis when slots or connective change
  const assembleHypothesis = (a: string, conn: string, b: string) => {
    const parts = [a.trim(), conn, b.trim()].filter(Boolean);
    return parts.join(" ");
  };

  const handleSlotAChange = (val: string) => {
    setSlotA(val);
    setHypothesis(assembleHypothesis(val, connective, slotB));
  };

  const handleSlotBChange = (val: string) => {
    setSlotB(val);
    setHypothesis(assembleHypothesis(slotA, connective, val));
  };

  const handleConnectiveChange = (conn: string) => {
    setConnective(conn);
    setHypothesis(assembleHypothesis(slotA, conn, slotB));
  };

  const insertPropToSlot = (prop: string, targetSlot: "A" | "B") => {
    const label = CANON.proposition_labels[prop] || prop;
    setPinnedFlashProp(prop);
    setTimeout(() => setPinnedFlashProp(null), 600);
    if (targetSlot === "A") {
      handleSlotAChange(label);
      setActiveSlotTarget("B");
    } else {
      handleSlotBChange(label);
    }
  };

  const handlePropClickFromShelf = (prop: string) => {
    const label = CANON.proposition_labels[prop] || prop;
    setPinnedFlashProp(prop);
    setTimeout(() => setPinnedFlashProp(null), 600);
    if (!slotA) {
      handleSlotAChange(label);
      setActiveSlotTarget("B");
    } else if (!slotB) {
      handleSlotBChange(label);
    } else {
      insertPropToSlot(prop, activeSlotTarget);
    }
  };

  // Check resonance against anchor truth claims (surface / foil / half)
  const claimResonance = React.useMemo(() => {
    const targetText = hypothesis || assembleHypothesis(slotA, connective, slotB);
    if (!targetText || targetText.trim().length < 4) return null;
    const clean = targetText.replace(/[\s,，.。!！?？\[\]]/g, "");

    for (const truth of CANON.anchorTruths) {
      const claims = [
        { type: "surface" as const, claim: truth.surface_claim },
        { type: "foil" as const, claim: truth.foil_claim },
        { type: "half" as const, claim: truth.half_claim }
      ];
      for (const { type, claim } of claims) {
        if (!claim) continue;
        const cleanClaim = claim.replace(/[\s,，.。!！?？]/g, "");
        if (clean.includes(cleanClaim) || cleanClaim.includes(clean)) {
          return { truth, type, claim };
        }
        // Check 4-character n-gram overlap
        let matchCount = 0;
        for (let i = 0; i <= cleanClaim.length - 4; i++) {
          const sub = cleanClaim.slice(i, i + 4);
          if (clean.includes(sub)) {
            matchCount++;
          }
        }
        if (matchCount >= 2) {
          return { truth, type, claim };
        }
      }
    }
    return null;
  }, [hypothesis, slotA, connective, slotB]);

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
    const finalHypothesis = hypothesis.trim() || assembleHypothesis(slotA, connective, slotB).trim();
    if (!finalHypothesis || !hasAllRequiredProps) return;
    setLoading(true);

    try {
      const res = await clientCuratorSynthesize({
        truthId: selectedTruth.id,
        hypothesisText: finalHypothesis,
        pinnedPropositions: collectedPropositions,
        slot: "auto"
      });

      setEvalResult({
        truth_id: selectedTruth.id,
        verdict: res.verdict,
        coverage_score: res.coverage,
        consistency_score: res.correctness,
        coherence_score: res.coherence,
        feedback: res.feedback,
        missing_required_propositions: res.missingRequiredPropositions,
        degraded: res.degraded,
        status: res.status
      });

      if (
        res.ok === true &&
        res.status === "scored" &&
        res.degraded === false &&
        res.verdict === "passed"
      ) {
        onTruthBelieved(selectedTruth.id);
      }
    } catch {
      setEvalResult({
        truth_id: selectedTruth.id,
        verdict: "partial",
        coverage_score: 0.4,
        consistency_score: 0.5,
        feedback: "公证管线连接异常，请重试。",
        degraded: true
      });
    } finally {
      setLoading(false);
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
      className="fixed inset-0 z-50 bg-void/95 backdrop-blur-xl flex flex-col p-3 sm:p-5 md:p-8 pointer-events-auto outline-none"
    >
      {/* Top Bar */}
      <div className="flex flex-wrap sm:flex-nowrap justify-between items-center border-b border-holo-cyan/20 pb-3 sm:pb-4 mb-3 sm:mb-5 gap-2 shrink-0">
        <button
          onClick={onClose}
          className="min-h-[44px] px-3 sm:px-4 py-2 bg-surface border border-holo-border hover:border-holo-cyan text-holo-bright text-xs font-mono flex items-center gap-1.5 sm:gap-2 rounded-sm transition-all shadow-md shrink-0"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">RETURN [ESC]</span>
          <span className="sm:hidden">[ESC]</span>
        </button>

        {/* Center View Mode Switcher */}
        <div className="flex items-center gap-1 sm:gap-2 p-1 bg-surface-dark border border-holo-cyan/30 rounded-sm">
          <button
            onClick={() => setTabMode("synthesis")}
            className={`min-h-[44px] px-2.5 sm:px-3.5 py-1.5 rounded-sm text-[11px] sm:text-xs font-mono flex items-center gap-1.5 sm:gap-2 transition-all ${
              tabMode === "synthesis"
                ? "bg-holo-amber/20 border border-holo-amber text-holo-amber shadow-holo-amber font-bold"
                : "text-slate-400 hover:text-holo-bright"
            }`}
          >
            <FileText className="w-3.5 h-3.5 shrink-0" />
            <span className="hidden sm:inline">命题综合台 (SYNTHESIS)</span>
            <span className="sm:hidden">SYNTHESIS</span>
          </button>
          <button
            onClick={() => setTabMode("graph")}
            className={`min-h-[44px] px-2.5 sm:px-3.5 py-1.5 rounded-sm text-[11px] sm:text-xs font-mono flex items-center gap-1.5 sm:gap-2 transition-all ${
              tabMode === "graph"
                ? "bg-holo-cyan/20 border border-holo-cyan text-holo-cyan shadow-holo-cyan font-bold"
                : "text-slate-400 hover:text-holo-bright"
            }`}
          >
            <Network className="w-3.5 h-3.5 shrink-0" />
            <span className="hidden sm:inline">推理图谱拓扑 (GRAPH)</span>
            <span className="sm:hidden">GRAPH</span>
          </button>
        </div>

        <div className="px-2.5 sm:px-3.5 py-1.5 bg-surface border border-holo-border text-[11px] sm:text-xs font-mono text-holo-amber flex items-center gap-1.5 sm:gap-2 rounded-sm shadow-sm shrink-0">
          <ShieldCheck className="w-3.5 h-3.5 text-holo-amber shrink-0" />
          <span>BELIEVED: {believedTruths.length} / 6</span>
        </div>
      </div>

      {/* Mode 1: Synthesis 3-Column Workspace */}
      {tabMode === "synthesis" ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 flex-1 overflow-y-auto md:overflow-hidden pb-4 md:pb-0">
          {/* Col 1: Proposition Shelf (Draggable & Clickable) */}
          <div className="holo-panel p-4 sm:p-5 rounded-sm flex flex-col min-h-[260px] md:min-h-0 md:overflow-hidden border-holo-cyan/25">
            <div className="flex justify-between items-center border-b border-holo-cyan/15 pb-2.5 mb-3 text-xs font-mono font-bold text-holo-cyan">
              <span className="flex items-center gap-1.5">
                <Pin className="w-3.5 h-3.5" />
                已归档命题库 (PINNED SHELF)
              </span>
              <span className="text-holo-bright font-normal">{collectedPropositions.length} PINS</span>
            </div>

            <div className="text-[11px] text-holo-muted mb-2 font-mono">
              点击卡片填入两槽，或拖拽至槽位输入：
            </div>

            <div className="flex-1 overflow-y-auto space-y-2.5 pr-1">
              {collectedPropositions.length === 0 ? (
                <div className="text-xs font-mono text-holo-muted p-6 text-center border border-dashed border-holo-cyan/15 rounded-sm my-auto">
                  <p className="mb-2">尚未从星球探索中提取命题。</p>
                  <p className="text-[11px] text-slate-400">
                    前往各星球冷启台地、锻炉、圣歌或遗迹调查以归档线索。
                  </p>
                </div>
              ) : (
                collectedPropositions.map((p, idx) => {
                  const isFlash = pinnedFlashProp === p;
                  const label = CANON.proposition_labels[p] || p;

                  return (
                    <motion.div
                      key={idx}
                      draggable
                      onDragStart={(e: any) => {
                        setDraggedProp(p);
                        if (e.dataTransfer) {
                          e.dataTransfer.setData("text/plain", label);
                        }
                      }}
                      onDragEnd={() => setDraggedProp(null)}
                      whileHover={{ scale: 1.01 }}
                      whileTap={{ scale: 0.99 }}
                      onClick={() => handlePropClickFromShelf(p)}
                      className={`p-2.5 sm:p-3 rounded-sm cursor-pointer transition-all text-xs font-mono group border ${
                        isFlash
                          ? "bg-holo-amber/30 border-holo-amber shadow-holo-amber scale-102"
                          : "bg-surface-dark/80 border-holo-cyan/20 hover:border-holo-cyan hover:shadow-holo-cyan"
                      }`}
                    >
                      <div className="flex justify-between items-start mb-1 gap-1">
                        <span className="font-bold text-holo-cyan group-hover:text-holo-amber transition-colors leading-snug">
                          {label}
                        </span>
                        <Pin className="w-3 h-3 text-holo-muted group-hover:text-holo-cyan shrink-0 mt-0.5" />
                      </div>
                      <div className="text-[10px] text-holo-muted flex items-center justify-between pt-1 border-t border-holo-cyan/10">
                        <span className="font-mono text-[9px] text-slate-400 truncate max-w-[140px]">{p}</span>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              insertPropToSlot(p, "A");
                            }}
                            className="px-1.5 py-0.5 rounded bg-surface hover:bg-holo-cyan/20 text-[9px] text-holo-cyan border border-holo-cyan/30 transition-colors"
                          >
                            + 槽 A
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              insertPropToSlot(p, "B");
                            }}
                            className="px-1.5 py-0.5 rounded bg-surface hover:bg-holo-cyan/20 text-[9px] text-holo-cyan border border-holo-cyan/30 transition-colors"
                          >
                            + 槽 B
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  );
                })
              )}
            </div>
          </div>

          {/* Col 2: 5+1 Anchor Truths State Machine */}
          <div className="holo-panel p-4 sm:p-5 rounded-sm flex flex-col min-h-[260px] md:min-h-0 md:overflow-hidden border-holo-cyan/25">
            <div className="flex justify-between items-center border-b border-holo-cyan/15 pb-2.5 mb-3 text-xs font-mono font-bold text-holo-amber">
              <span>5+1 锚定真相认知状态机</span>
              <span className="text-holo-bright font-normal">{believedTruths.length} / 6 BELIEVED</span>
            </div>

            <div className="flex-1 overflow-y-auto space-y-3 pr-1">
              {CANON.anchorTruths.map((t) => {
                const status = getTruthStatus(t);
                const isSelected = selectedTruth.id === t.id;

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
                                : "bg-surface-dark text-slate-400 border border-slate-800"
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

          {/* Col 3: Two-Slot Causal Synthesis & AI Evaluator */}
          <div className="holo-panel p-4 sm:p-5 rounded-sm flex flex-col min-h-[300px] md:min-h-0 md:overflow-hidden border-holo-cyan/25">
            <div className="flex justify-between items-center border-b border-holo-cyan/15 pb-2.5 mb-3 text-xs font-mono font-bold text-holo-bright">
              <span>两槽因果综合推演 // {selectedTruth.id}</span>
              <span className="text-holo-cyan text-[10px]">CURATOR ENGINE</span>
            </div>

            <div className="flex-1 flex flex-col overflow-y-auto pr-1">
              {/* Slot A Container */}
              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  const data = e.dataTransfer.getData("text/plain");
                  if (data) handleSlotAChange(data);
                }}
                className={`p-2.5 rounded-sm border mb-2 transition-all ${
                  activeSlotTarget === "A"
                    ? "bg-surface-dark/95 border-holo-cyan/50 shadow-sm"
                    : "bg-surface-dark/70 border-holo-border"
                }`}
              >
                <div className="flex justify-between items-center mb-1.5">
                  <label className="text-[11px] font-mono font-bold text-holo-cyan flex items-center gap-1.5 cursor-pointer">
                    <span className="w-4 h-4 rounded-full bg-holo-cyan/20 text-holo-cyan flex items-center justify-center text-[10px] font-bold">
                      A
                    </span>
                    <span>观察槽位 A (人话观察)</span>
                  </label>
                  {slotA && (
                    <button
                      type="button"
                      onClick={() => handleSlotAChange("")}
                      className="text-[10px] text-slate-400 hover:text-holo-amber font-mono"
                    >
                      清空
                    </button>
                  )}
                </div>
                <input
                  type="text"
                  value={slotA}
                  onFocus={() => setActiveSlotTarget("A")}
                  onChange={(e) => handleSlotAChange(e.target.value)}
                  placeholder="点击左侧或下方命题填入观察 A..."
                  disabled={!hasAllRequiredProps && !isAlreadyBelieved}
                  className="w-full bg-void/70 border border-holo-cyan/20 focus:border-holo-cyan rounded-sm px-2.5 py-1.5 text-xs font-mono text-holo-bright outline-none transition-all mb-1.5 disabled:opacity-40"
                />
                {collectedPropositions.length > 0 && (
                  <div className="flex flex-wrap gap-1 max-h-16 overflow-y-auto pt-1">
                    {collectedPropositions.map((p) => {
                      const label = CANON.proposition_labels[p] || p;
                      const isSelected = slotA === label;
                      return (
                        <button
                          key={p}
                          type="button"
                          onClick={() => handleSlotAChange(label)}
                          className={`text-[9px] px-1.5 py-0.5 rounded font-mono text-left truncate max-w-[200px] transition-all ${
                            isSelected
                              ? "bg-holo-cyan/30 text-holo-cyan border border-holo-cyan font-bold"
                              : "bg-surface text-slate-300 border border-holo-border hover:border-holo-cyan/50 hover:text-holo-bright"
                          }`}
                          title={label}
                        >
                          + {label}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Connective Selector */}
              <div className="flex items-center justify-between bg-surface-dark/80 px-3 py-1.5 rounded-sm border border-holo-cyan/20 mb-2">
                <span className="text-[10px] font-mono text-holo-muted">因果连接词:</span>
                <div className="flex items-center gap-1">
                  {CONNECTIVES.map((conn) => {
                    const isSelected = connective === conn;
                    return (
                      <button
                        key={conn}
                        type="button"
                        onClick={() => handleConnectiveChange(conn)}
                        className={`px-2 py-0.5 rounded text-[11px] font-mono font-bold transition-all ${
                          isSelected
                            ? "bg-holo-amber/25 text-holo-amber border border-holo-amber shadow-holo-amber"
                            : "bg-surface text-slate-400 border border-holo-border hover:border-holo-cyan hover:text-holo-bright"
                        }`}
                      >
                        {conn}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Slot B Container */}
              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  const data = e.dataTransfer.getData("text/plain");
                  if (data) handleSlotBChange(data);
                }}
                className={`p-2.5 rounded-sm border mb-2 transition-all ${
                  activeSlotTarget === "B"
                    ? "bg-surface-dark/95 border-holo-cyan/50 shadow-sm"
                    : "bg-surface-dark/70 border-holo-border"
                }`}
              >
                <div className="flex justify-between items-center mb-1.5">
                  <label className="text-[11px] font-mono font-bold text-holo-cyan flex items-center gap-1.5 cursor-pointer">
                    <span className="w-4 h-4 rounded-full bg-holo-cyan/20 text-holo-cyan flex items-center justify-center text-[10px] font-bold">
                      B
                    </span>
                    <span>观察槽位 B (人话观察)</span>
                  </label>
                  {slotB && (
                    <button
                      type="button"
                      onClick={() => handleSlotBChange("")}
                      className="text-[10px] text-slate-400 hover:text-holo-amber font-mono"
                    >
                      清空
                    </button>
                  )}
                </div>
                <input
                  type="text"
                  value={slotB}
                  onFocus={() => setActiveSlotTarget("B")}
                  onChange={(e) => handleSlotBChange(e.target.value)}
                  placeholder="点击左侧或下方命题填入观察 B..."
                  disabled={!hasAllRequiredProps && !isAlreadyBelieved}
                  className="w-full bg-void/70 border border-holo-cyan/20 focus:border-holo-cyan rounded-sm px-2.5 py-1.5 text-xs font-mono text-holo-bright outline-none transition-all mb-1.5 disabled:opacity-40"
                />
                {collectedPropositions.length > 0 && (
                  <div className="flex flex-wrap gap-1 max-h-16 overflow-y-auto pt-1">
                    {collectedPropositions.map((p) => {
                      const label = CANON.proposition_labels[p] || p;
                      const isSelected = slotB === label;
                      return (
                        <button
                          key={p}
                          type="button"
                          onClick={() => handleSlotBChange(label)}
                          className={`text-[9px] px-1.5 py-0.5 rounded font-mono text-left truncate max-w-[200px] transition-all ${
                            isSelected
                              ? "bg-holo-cyan/30 text-holo-cyan border border-holo-cyan font-bold"
                              : "bg-surface text-slate-300 border border-holo-border hover:border-holo-cyan/50 hover:text-holo-bright"
                          }`}
                          title={label}
                        >
                          + {label}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Assembled Hypothesis Preview (Editable) */}
              <div className="mb-2">
                <div className="flex justify-between items-center text-[11px] font-mono text-holo-muted mb-1">
                  <span className="flex items-center gap-1">
                    <FileText className="w-3 h-3 text-holo-amber" />
                    <span>拼装假说预览 (可直接微调编辑)：</span>
                  </span>
                  {(slotA || slotB) && (
                    <button
                      type="button"
                      onClick={() => {
                        setHypothesis(assembleHypothesis(slotA, connective, slotB));
                      }}
                      className="text-[10px] text-holo-cyan hover:text-holo-amber flex items-center gap-1 transition-colors"
                    >
                      <RefreshCw className="w-2.5 h-2.5" />
                      <span>对齐两槽</span>
                    </button>
                  )}
                </div>
                <textarea
                  value={hypothesis}
                  onChange={(e) => setHypothesis(e.target.value)}
                  placeholder={
                    hasAllRequiredProps
                      ? "选择上方槽位命题与因果连接词，或在此微调假说陈述..."
                      : `前置命题未集齐：还需收集 ${missingProps.length} 个必要命题 (${missingProps.join(", ")}) 才能开启综合推演。`
                  }
                  disabled={!hasAllRequiredProps && !isAlreadyBelieved}
                  className="w-full h-16 sm:h-20 bg-surface-dark/95 border border-holo-cyan/20 focus:border-holo-amber p-2 text-xs font-mono text-holo-bright rounded-sm outline-none resize-none leading-relaxed transition-all disabled:opacity-40"
                />
              </div>

              {/* Claim Resonance Hint (Optional Bonus) */}
              {claimResonance && (
                <div className="p-2 bg-holo-cyan/10 border border-holo-cyan/30 rounded-sm text-[11px] font-mono text-holo-cyan flex items-center gap-1.5 mb-2">
                  <Sparkles className="w-3.5 h-3.5 text-holo-cyan shrink-0" />
                  <span>
                    {claimResonance.type === "surface"
                      ? `✦ 观测共振：你的综合与【${claimResonance.truth.title.split("/")[0].trim()}】的观测记录吻合`
                      : claimResonance.type === "foil"
                      ? `✦ 线索回响：该推论触及【${claimResonance.truth.title.split("/")[0].trim()}】的表层传闻`
                      : `✦ 局部印证：该推论与【${claimResonance.truth.title.split("/")[0].trim()}】的局部线索吻合`}
                  </span>
                </div>
              )}

              {/* Required propositions status warning */}
              {!hasAllRequiredProps && !isAlreadyBelieved && (
                <div className="p-2.5 bg-holo-amber/10 border border-holo-amber/30 rounded-sm text-[11px] font-mono text-holo-amber flex items-center gap-2 mb-2">
                  <Lock className="w-3.5 h-3.5 shrink-0" />
                  <span>
                    未满足前置条件：需收集全部 {selectedTruth.required_propositions.length} 个必要命题（缺少 {missingProps.length} 个）
                  </span>
                </div>
              )}

              {/* Synthesis Submit Button */}
              <button
                onClick={handleSynthesize}
                disabled={loading || !hypothesis.trim() || !hasAllRequiredProps}
                className="w-full min-h-[44px] py-2.5 bg-gradient-to-r from-holo-amber/30 via-holo-amber/20 to-surface border border-holo-amber hover:bg-holo-amber hover:text-void disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-holo-amber text-holo-amber text-xs font-mono uppercase tracking-wider rounded-sm shadow-holo-amber flex items-center justify-center gap-2 transition-all mb-3 font-bold"
              >
                {loading ? (
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full border-2 border-holo-amber border-t-transparent animate-spin" />
                    <span>CURATOR 正在评估因果假说矩阵...</span>
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

              {/* Evaluator Output Display */}
              <div className="flex-1 min-h-[100px] p-3.5 bg-surface-dark/95 border border-holo-cyan/20 rounded-sm overflow-y-auto text-xs font-mono leading-relaxed relative">
                {loading && (
                  <div className="absolute inset-0 bg-void/80 flex flex-col items-center justify-center gap-2 p-4 text-center">
                    <div className="w-16 h-16 rounded-full border border-holo-cyan/40 border-t-holo-cyan animate-spin" />
                    <span className="text-[11px] text-holo-cyan animate-pulse">正在进行语义匹配与正典因果图比对...</span>
                  </div>
                )}

                {evalResult ? (
                  <div>
                    <div
                      className={`flex flex-wrap items-center justify-between gap-2 font-bold mb-2 ${
                        evalResult.verdict === "passed" || evalResult.verdict === "believed"
                          ? "text-holo-green"
                          : evalResult.status === "rejected" || evalResult.verdict === "failed"
                          ? "text-holo-red"
                          : "text-holo-amber"
                      }`}
                    >
                      <div className="flex items-center gap-1.5">
                        {evalResult.verdict === "passed" || evalResult.verdict === "believed" ? (
                          <CheckCircle className="w-4 h-4 text-holo-green" />
                        ) : (
                          <AlertCircle className="w-4 h-4" />
                        )}
                        <span>
                          SYNTHESIS VERDICT:{" "}
                          {evalResult.verdict === "passed" || evalResult.verdict === "believed"
                            ? "PASSED (BELIEVED)"
                            : evalResult.status === "rejected"
                            ? "REJECTED (HARD GATE)"
                            : evalResult.verdict === "failed"
                            ? "FAILED"
                            : "PARTIAL (SUSPECTED)"}
                        </span>
                      </div>
                      {evalResult.degraded && (
                        <span className="text-[9px] px-1.5 py-0.5 rounded font-mono bg-holo-amber/20 text-holo-amber border border-holo-amber/40">
                          CURATOR DEGRADED
                        </span>
                      )}
                    </div>

                    <div className="text-slate-300 mb-2">{evalResult.feedback}</div>

                    {evalResult.missing_required_propositions && evalResult.missing_required_propositions.length > 0 && (
                      <div className="p-2 bg-red-950/40 border border-red-500/30 rounded mb-2 space-y-1">
                        <div className="text-[11px] text-red-300 font-bold">缺失硬门必要命题：</div>
                        <div className="flex flex-wrap gap-1">
                          {evalResult.missing_required_propositions.map((p) => (
                            <span key={p} className="text-[10px] px-1.5 py-0.5 bg-red-900/60 text-red-200 rounded font-mono">
                              ✗ {p}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="flex flex-wrap gap-3 sm:gap-4 pt-2 border-t border-holo-cyan/10 text-[11px] text-holo-cyan">
                      <span>COVERAGE: {(evalResult.coverage_score * 100).toFixed(0)}%</span>
                      <span>CORRECTNESS: {(evalResult.consistency_score * 100).toFixed(0)}%</span>
                      {evalResult.coherence_score !== undefined && (
                        <span>COHERENCE: {(evalResult.coherence_score * 100).toFixed(0)}%</span>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="text-holo-muted flex items-center gap-2 my-auto">
                    <HelpCircle className="w-4 h-4 text-holo-cyan shrink-0" />
                    <span>
                      {hasAllRequiredProps
                        ? "必要前置命题已集齐。请在上方两槽拼装因果推论并提交评估。"
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
        <div className="holo-panel p-4 sm:p-6 rounded-sm flex-1 flex flex-col overflow-y-auto md:overflow-hidden border-holo-cyan/30">
          <div className="flex flex-wrap sm:flex-nowrap justify-between items-center border-b border-holo-cyan/20 pb-3 mb-4 gap-2 shrink-0">
            <div className="flex items-center gap-2 text-xs font-mono text-holo-cyan font-bold">
              <Network className="w-4 h-4 shrink-0" />
              <span>5+1 ANCHOR TRUTHS INFERENCE TOPOLOGY // 推理图谱拓扑连线</span>
            </div>
            <div className="text-[10px] sm:text-xs font-mono text-holo-muted">
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
                        <Cpu className={`w-3.5 h-3.5 ${isBelieved ? "text-holo-amber" : isSuspected ? "text-holo-cyan" : "text-slate-400"}`} />
                        <span>{t.id}. {t.title}</span>
                      </div>
                      <span className={`text-[9px] px-2 py-0.5 rounded font-mono uppercase font-bold ${
                        isBelieved
                          ? "bg-holo-green/20 text-holo-green border border-holo-green/40"
                          : isSuspected
                          ? "bg-holo-cyan/20 text-holo-cyan border border-holo-cyan/40"
                          : "bg-surface text-slate-400 border border-slate-800"
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
