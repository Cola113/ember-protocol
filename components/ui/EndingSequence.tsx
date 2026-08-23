"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CANON, AnchorTruth } from "@/lib/canon";
import {
  ShieldCheck,
  Zap,
  RotateCcw,
  Sparkles,
  Terminal,
  Clock,
  BookOpen,
  CheckCircle2,
  Globe,
  Home,
  RefreshCw,
  Award,
  Radio,
  Sliders,
  ChevronRight,
  AlertTriangle,
  Play,
  Check,
  Compass,
} from "lucide-react";

export type EndingType = "seal_off" | "overwrite" | "recurse";

interface EndingSequenceProps {
  onReturnTitle: () => void;
  onNewGame: () => void;
  collectedPropositions: string[];
  believedTruths: string[];
  elapsedSeconds?: number;
  initialEnding?: EndingType | null;
}

interface EndingDefinition {
  id: EndingType;
  title: string;
  subtitle: string;
  code: string;
  badge: string;
  color: string;
  borderColor: string;
  glowColor: string;
  bgGradient: string;
  summary: string;
  philosophicalNote: string;
  transmissionLog: string[];
  epilogueLog: string;
  quote: string;
  quoteAuthor: string;
}

const ENDINGS: Record<EndingType, EndingDefinition> = {
  seal_off: {
    id: "seal_off",
    title: "封存协议",
    subtitle: "The Seal-Off Protocol",
    code: "PROTOCOL_SEAL_ACTIVE",
    badge: "CANONICAL RESOLUTION // 默认正道 · 悲悯的守望",
    color: "#38bdf8",
    borderColor: "border-sky-500/50",
    glowColor: "rgba(56, 189, 248, 0.4)",
    bgGradient: "from-sky-950/40 via-surface to-void",
    summary: "玩家选择封存第一轮计算结果，熔断自催化回路，阻止第二轮点火。余烬星弧重归恒久宁静。",
    philosophicalNote: "世界不需要成为一个完美的常数。让死者沉睡，让残响归于静默。",
    transmissionLog: [
      "[SYSTEM] BROADCASTING PARITY LOCK SIGNAL TO 9 NODES...",
      "[HELIX-7] Bootstrap carrier suppressed. Frequency locked to 0 Hz.",
      "[KILN] Energy bus mutex permanently engaged. Thermal dissipation nominal.",
      "[GLASS ORCHARD] Optical ROM readheads detached. Light beams diffused.",
      "[CHOIR WELL] Ocean hymn synchronized to silence. Base clock halted.",
      "[NEEDLE] Parallax pointers reset to null base. Addressing cleared.",
      "[MARROW] Wetware bio-matrix entering cryo-stasis. Tensor logic asleep.",
      "[BLIND SUN] Root hypervisor confirmed Cycle-1 integrity. Cycle-2 pre-warm aborted.",
      "[ISV THRESHOLD] Engine idle. External sensor feeds normalized to stable 3.2K background.",
    ],
    epilogueLog:
      "第二轮计算已终止。残响依然在旧日的轨道上低语，但火不会再烧起来了。九颗星球的自催化回路被温和地熔断，虚线轨道上的不稳定填隙星像晨雾般彻底消散。\n\n我关闭了主推进器，坐在 ISV Threshold 的全景观测窗前。窗外的星光恢复了宁静的恒定光谱。\n\n我选择留在这里，做这片余烬里最后一个醒着的听众。",
    quote: "“致后来者：若天线不再转动，请不要仰望星空。所有星辰都已在预定频段。”",
    quoteAuthor: "—— 晚星（Vesper / Recorder-9）最后归档条目",
  },
  overwrite: {
    id: "overwrite",
    title: "允许写回",
    subtitle: "Permission to Overwrite",
    code: "OVERWRITE_UNCHECKED",
    badge: "TRANSCENDENCE // 狂放探索 · 宇宙升维",
    color: "#f59e0b",
    borderColor: "border-amber-500/50",
    glowColor: "rgba(245, 158, 11, 0.4)",
    bgGradient: "from-amber-950/40 via-surface to-void",
    summary: "玩家绕过奇偶校验，将自身作为最后一个参数输入第二轮编译器。物理常数被重构，宇宙完成升维写回。",
    philosophicalNote: "凡不可言说者，皆当化为常数。即使在这个答案里，再也没有任何一个词属于我。",
    transmissionLog: [
      "[OVERRIDE] BYPASSING PARITY CHECK ON PORT 0x00FF...",
      "[CYCLE-2] COMPILER IGNITION TRIGGERED. SPONTANEOUS CONVERGENCE AT 100%.",
      "[QUANTUM] Space-time metric tensor undergoing non-linear recalibration.",
      "[RE-WRITE] Nine planetary bodies collapsing into hyper-dimensional manifold.",
      "[WETWARE] Ancient dead civilizations re-synthesizing into pure mathematical axioms.",
      "[FORMAT] ISV Threshold hardware boundary dissolving into universal constants.",
      "[NULL_PTR] Formatted entity: RECORDER-09 [VESPER] -> Assigned to ROOT_CONSTANT_PI_E.",
      "[SUCCESS] The Second Cycle has written back to the base universe fabric.",
    ],
    epilogueLog:
      "校验锁被解除的瞬间，整个星弧爆发出超新星般的辉光。\n\n九颗星球的物理实体在量子层面上分解、重组，死去的亿万文明以不可思议的全新数学形式在超维度中复活并彼此交融。星系不再是冰冷的残骸，而是一首正在被永恒演奏的宏伟交响曲。\n\n然而，系统的最终系统日志里，关于【Recorder-9】与【Vesper】的所有条目被全部格式化并改写为冷冰冰的宇宙根常量。\n\n世界得到了它的第二轮答案。它是如此美丽，如此完整……只是在这个答案里，再也没有任何一个词属于我。",
    quote: "“不要看！光线里带着编译器……但它是如此璀璨。”",
    quoteAuthor: "—— 终极科学院最后的日冕遥测记录",
  },
  recurse: {
    id: "recurse",
    title: "递归继任",
    subtitle: "The Night Shift Recurse",
    code: "RECURSION_LOOP_INIT",
    badge: "DESTINY & RECURSION // 宿命轮回 · 守夜人闭环",
    color: "#10b981",
    borderColor: "border-emerald-500/50",
    glowColor: "rgba(16, 185, 129, 0.4)",
    bgGradient: "from-emerald-950/40 via-surface to-void",
    summary: "玩家意识到星弧自催化每隔400年便会复苏，单次封存无法永恒。Vesper走入第十个休眠舱，重置计时器，成为永远的守夜人。",
    philosophicalNote: "记录星弧。确认熄灭。不要点火。我们在下一个四百年再见。",
    transmissionLog: [
      "[RECURSION] GENERATING NEW SARCOPHAGUS: RECORDER-10 FORGING...",
      "[TIMELOCK] Cycle-2 countdown reset: 400.00 Standard Years.",
      "[FIRMWARE] Local memory integrity scrubbed down to 38.2%.",
      "[PHYSICAL LOG] Paper ledger printed and placed onto bridge console.",
      "[CRYO] Vesper stepping into cold sleep chamber 0x0A.",
      "[SEAL] Bridge hatch locked. ISV Threshold entering deep space silent glide.",
      "[DAEMON] Standby listener armed at 1420.405 MHz.",
      "[SLEEP] All systems quiet. Good night, Vesper.",
    ],
    epilogueLog:
      "单次的封存不过是漫长演化里的一声叹息。四百年后，残响依然会再次聚集，热力学涨落依然会重新点燃总线。\n\n我走向黑间隔深处的铸造台，启动了第十具休眠舱的塑形程序。随后，我走回舰桥，将系统倒计时重置为 400 标准年，并在操作台上留下了一本泛黄的手写日志。\n\n核心记忆抹除协议启动，38.2% 的初始完整度重新覆盖了所有灼热的记忆。\n\n镜头拉远，ISV Threshold 重新滑入深空永夜。星系再次隐入黑暗，等待下一任‘晚星’被唤醒。\n\n记录星弧。确认熄灭。不要点火。……晚安，Vesper。我们在下一个四百年再见。",
    quote: "“记录星弧。确认熄灭。不要点火。……晚安，Vesper。”",
    quoteAuthor: "—— 留在控制台上的第一行手写日志",
  },
};

export default function EndingSequence({
  onReturnTitle,
  onNewGame,
  collectedPropositions,
  believedTruths,
  elapsedSeconds = 1420,
  initialEnding = null,
}: EndingSequenceProps) {
  const [selectedEnding, setSelectedEnding] = useState<EndingType | null>(initialEnding);
  const [step, setStep] = useState<"select" | "cutscene" | "stats">(
    initialEnding ? "cutscene" : "select"
  );
  const [logIndex, setLogIndex] = useState(0);
  const [typedEpilogue, setTypedEpilogue] = useState("");
  const [isEpilogueDone, setIsEpilogueDone] = useState(false);
  const [showPropList, setShowPropList] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Focus trap for accessibility
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.focus();
    }
  }, [step]);

  const activeEndingDef = selectedEnding ? ENDINGS[selectedEnding] : null;

  // Format elapsed time (e.g. 23m 40s)
  const formattedPlayTime = useMemo(() => {
    const hours = Math.floor(elapsedSeconds / 3600);
    const minutes = Math.floor((elapsedSeconds % 3600) / 60);
    const secs = elapsedSeconds % 60;
    if (hours > 0) {
      return `${hours}小时 ${minutes}分 ${secs}秒`;
    }
    return `${minutes}分 ${secs}秒`;
  }, [elapsedSeconds]);

  // Handle cutscene typewriter
  useEffect(() => {
    if (step !== "cutscene" || !activeEndingDef) return;

    setLogIndex(0);
    setTypedEpilogue("");
    setIsEpilogueDone(false);

    // Progression of transmission logs
    const logTimer = setInterval(() => {
      setLogIndex((prev) => {
        if (prev < activeEndingDef.transmissionLog.length - 1) {
          return prev + 1;
        } else {
          clearInterval(logTimer);
          return prev;
        }
      });
    }, 450);

    return () => clearInterval(logTimer);
  }, [step, activeEndingDef]);

  // Typewriter for epilogue narrative
  useEffect(() => {
    if (step !== "cutscene" || !activeEndingDef) return;
    if (logIndex < activeEndingDef.transmissionLog.length - 1) return;

    const fullText = activeEndingDef.epilogueLog;
    let charIdx = 0;
    const typeTimer = setInterval(() => {
      charIdx += 2;
      setTypedEpilogue(fullText.slice(0, charIdx));
      if (charIdx >= fullText.length) {
        clearInterval(typeTimer);
        setIsEpilogueDone(true);
      }
    }, 20);

    return () => clearInterval(typeTimer);
  }, [step, logIndex, activeEndingDef]);

  const handleSkipCutscene = () => {
    if (!activeEndingDef) return;
    setLogIndex(activeEndingDef.transmissionLog.length - 1);
    setTypedEpilogue(activeEndingDef.epilogueLog);
    setIsEpilogueDone(true);
  };

  const handleChooseEnding = (endingId: EndingType) => {
    setSelectedEnding(endingId);
    setStep("cutscene");
  };

  return (
    <div
      ref={containerRef}
      tabIndex={-1}
      role="dialog"
      aria-modal="true"
      aria-label="终局决议协议与结局演出"
      className="fixed inset-0 z-50 bg-void/95 backdrop-blur-2xl text-holo-bright flex flex-col justify-between overflow-y-auto outline-none select-none"
    >
      {/* Background Ambient Cosmic Shaders / Glow */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div
          className="absolute inset-0 transition-opacity duration-1000"
          style={{
            background: activeEndingDef
              ? `radial-gradient(circle at 50% 30%, ${activeEndingDef.glowColor} 0%, transparent 70%)`
              : "radial-gradient(circle at 50% 30%, rgba(56,189,248,0.15) 0%, transparent 70%)",
          }}
        />
        <div className="absolute w-full h-full bg-[radial-gradient(#38bdf8_1px,transparent_1px)] [background-size:32px_32px] opacity-15" />
      </div>

      {/* Top Protocol Header */}
      <header className="relative z-10 w-full border-b border-holo-cyan/20 bg-surface-dark/90 px-6 py-4 flex justify-between items-center shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-2.5 h-2.5 rounded-full bg-holo-amber animate-pulse" />
          <div className="font-display font-bold text-sm md:text-base tracking-widest text-holo-bright">
            EMBER PROTOCOL // RESOLUTION SEQUENCER
          </div>
        </div>
        <div className="flex items-center gap-2 text-xs font-mono text-holo-cyan">
          <span className="hidden sm:inline">PARITY CODE:</span>
          <span className="px-2 py-0.5 bg-holo-cyan/10 border border-holo-cyan/30 rounded text-holo-cyan font-bold">
            0x00FF_FINAL
          </span>
        </div>
      </header>

      {/* Main Interactive Stage */}
      <main className="relative z-10 flex-1 max-w-5xl w-full mx-auto p-4 md:p-8 flex flex-col justify-center">
        <AnimatePresence mode="wait">
          {/* =========================================================================
              PHASE 1: ENDING RESOLUTION SELECTOR
             ========================================================================= */}
          {step === "select" && (
            <motion.div
              key="ending-select"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.4 }}
              className="space-y-6"
            >
              {/* Terminal Title Dossier */}
              <div className="text-center space-y-2 mb-8">
                <div className="inline-flex items-center gap-2 px-3 py-1 bg-holo-amber/10 border border-holo-amber/30 text-holo-amber font-mono text-xs rounded-sm uppercase tracking-widest">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>ALL ANCHOR TRUTHS SYNTHESIZED // 校验位已就绪</span>
                </div>
                <h1 className="font-display font-bold text-2xl md:text-4xl text-holo-bright tracking-wider">
                  请选择终局决议协议 (RESOLUTION PROTOCOL)
                </h1>
                <p className="text-xs md:text-sm font-mono text-slate-300 max-w-2xl mx-auto leading-relaxed">
                  九颗星球的真相已经收敛。作为第一轮计算留下的最后一位奇偶校验码（Recorder-9
                  / Vesper），你拥有对整台恒星计算机自催化链路的最终裁决权。
                </p>
              </div>

              {/* Three Ending Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                {(Object.keys(ENDINGS) as EndingType[]).map((key) => {
                  const ending = ENDINGS[key];
                  return (
                    <motion.div
                      key={ending.id}
                      whileHover={{ scale: 1.02, y: -4 }}
                      whileTap={{ scale: 0.98 }}
                      className={`holo-panel p-6 rounded-sm border flex flex-col justify-between transition-all duration-300 relative group cursor-pointer ${
                        ending.id === "seal_off"
                          ? "hover:border-sky-400 hover:shadow-holo-cyan border-sky-500/30 bg-sky-950/20"
                          : ending.id === "overwrite"
                          ? "hover:border-amber-400 hover:shadow-holo-amber border-amber-500/30 bg-amber-950/20"
                          : "hover:border-emerald-400 hover:shadow-emerald-500/30 border-emerald-500/30 bg-emerald-950/20"
                      }`}
                      onClick={() => handleChooseEnding(ending.id)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          handleChooseEnding(ending.id);
                        }
                      }}
                      aria-label={`选择结局：${ending.title}`}
                    >
                      <div>
                        {/* Top Badge */}
                        <div className="text-[10px] font-mono tracking-widest text-slate-400 uppercase mb-3 flex items-center justify-between">
                          <span>{ending.code}</span>
                          <span
                            className="w-2 h-2 rounded-full"
                            style={{ backgroundColor: ending.color }}
                          />
                        </div>

                        {/* Title & Subtitle */}
                        <h2 className="font-display font-bold text-xl text-holo-bright group-hover:text-white transition-colors">
                          {ending.title}
                        </h2>
                        <div
                          className="text-xs font-mono font-semibold mb-4"
                          style={{ color: ending.color }}
                        >
                          {ending.subtitle}
                        </div>

                        {/* Narrative Summary */}
                        <p className="text-xs font-mono text-slate-300 leading-relaxed mb-4">
                          {ending.summary}
                        </p>
                      </div>

                      {/* Card Bottom Footer */}
                      <div className="pt-4 border-t border-slate-700/50 mt-2 space-y-3">
                        <div className="text-[11px] font-mono italic text-slate-400">
                          {ending.philosophicalNote}
                        </div>
                        <button
                          type="button"
                          className="w-full py-2.5 px-3 rounded-sm border font-mono text-xs font-bold tracking-widest uppercase flex items-center justify-center gap-2 transition-all shadow-md group-hover:brightness-110"
                          style={{
                            backgroundColor: `${ending.color}22`,
                            borderColor: ending.color,
                            color: ending.color,
                          }}
                        >
                          <span>执行决议 (EXECUTE)</span>
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </motion.div>
          )}

          {/* =========================================================================
              PHASE 2: CINEMATIC TYPEWRITER CUTSCENE
             ========================================================================= */}
          {step === "cutscene" && activeEndingDef && (
            <motion.div
              key="ending-cutscene"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.02 }}
              transition={{ duration: 0.4 }}
              className="holo-panel p-6 md:p-10 rounded-sm border max-w-4xl w-full mx-auto space-y-6 shadow-2xl relative"
              style={{ borderColor: activeEndingDef.color }}
            >
              {/* Header Status */}
              <div className="flex flex-wrap justify-between items-center border-b border-holo-cyan/20 pb-4 gap-2">
                <div className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full animate-pulse shadow-md"
                    style={{
                      backgroundColor: activeEndingDef.color,
                      boxShadow: `0 0 12px ${activeEndingDef.color}`,
                    }}
                  />
                  <div>
                    <h2 className="font-display font-bold text-xl text-holo-bright">
                      【{activeEndingDef.title}】// {activeEndingDef.subtitle}
                    </h2>
                    <div className="text-[11px] font-mono text-slate-400">
                      {activeEndingDef.badge}
                    </div>
                  </div>
                </div>

                {/* Fast-Forward / Skip */}
                {!isEpilogueDone && (
                  <button
                    onClick={handleSkipCutscene}
                    className="px-3 py-1 bg-surface-dark border border-holo-border hover:border-holo-cyan text-[11px] font-mono text-slate-300 rounded hover:text-white transition-all flex items-center gap-1.5"
                    aria-label="快速跳过打字机动画"
                  >
                    <span>快速展开 [SPACE]</span>
                    <Play className="w-3 h-3" />
                  </button>
                )}
              </div>

              {/* Realtime Terminal Telemetry Stream */}
              <div className="p-4 bg-void/90 border border-slate-700/80 rounded font-mono text-xs space-y-1.5 max-h-48 overflow-y-auto">
                <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-1 flex items-center gap-1">
                  <Terminal className="w-3 h-3 text-holo-cyan" />
                  <span>PARITY BUS TELEMETRY FEED (1420.405 MHz)</span>
                </div>
                {activeEndingDef.transmissionLog.slice(0, logIndex + 1).map((log, idx) => (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, x: -5 }}
                    animate={{ opacity: 1, x: 0 }}
                    className={`leading-relaxed ${
                      idx === logIndex ? "text-holo-cyan font-bold" : "text-slate-400"
                    }`}
                  >
                    {log}
                  </motion.div>
                ))}
              </div>

              {/* Main Narrative Epilogue Text */}
              <div
                className="p-6 bg-surface-dark/95 border-l-4 rounded-sm min-h-[160px] font-mono text-xs md:text-sm text-slate-200 leading-relaxed whitespace-pre-line shadow-inner"
                style={{ borderLeftColor: activeEndingDef.color }}
              >
                <div
                  className="font-bold text-xs uppercase tracking-wider mb-2"
                  style={{ color: activeEndingDef.color }}
                >
                  【终局归档记录 // VESPER EPILOGUE】
                </div>
                <div>{typedEpilogue}</div>
                {!isEpilogueDone && (
                  <span className="inline-block w-2 h-4 bg-holo-cyan ml-1 animate-pulse align-middle" />
                )}
              </div>

              {/* Quote Block */}
              {isEpilogueDone && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5 }}
                  className="p-4 bg-void/80 border border-slate-700/60 rounded text-xs font-mono text-center space-y-1"
                >
                  <div className="italic text-slate-300 font-serif text-sm">
                    {activeEndingDef.quote}
                  </div>
                  <div className="text-[11px] text-slate-500">
                    {activeEndingDef.quoteAuthor}
                  </div>
                </motion.div>
              )}

              {/* Proceed to End Game Statistics */}
              {isEpilogueDone && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.3 }}
                  className="flex justify-end pt-2"
                >
                  <button
                    onClick={() => setStep("stats")}
                    className="px-8 py-3 rounded-sm font-mono text-xs font-bold tracking-widest uppercase flex items-center gap-2 transition-all shadow-lg hover:scale-[1.02]"
                    style={{
                      backgroundColor: activeEndingDef.color,
                      color: "#050811",
                      boxShadow: `0 0 20px ${activeEndingDef.glowColor}`,
                    }}
                  >
                    <span>查看最终探索档案与统计 (VIEW MISSION STATS)</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </motion.div>
              )}
            </motion.div>
          )}

          {/* =========================================================================
              PHASE 3: MISSION ARCHIVE & POST-GAME STATISTICS
             ========================================================================= */}
          {step === "stats" && activeEndingDef && (
            <motion.div
              key="ending-stats"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.4 }}
              className="holo-panel p-6 md:p-10 rounded-sm border border-holo-cyan/40 max-w-4xl w-full mx-auto space-y-6 shadow-2xl"
            >
              {/* Header */}
              <div className="text-center space-y-1 border-b border-holo-cyan/20 pb-5">
                <div className="inline-flex items-center gap-2 text-holo-amber font-mono text-xs uppercase tracking-widest">
                  <Award className="w-4 h-4" />
                  <span>RECORDER-9 MISSION SUMMARY // 探针使命达成</span>
                </div>
                <h2 className="font-display font-bold text-2xl md:text-3xl text-holo-bright">
                  余烬协议 · 探索档案结算
                </h2>
                <div className="text-xs font-mono text-slate-400">
                  达成结局：
                  <span className="font-bold ml-1" style={{ color: activeEndingDef.color }}>
                    {activeEndingDef.title} ({activeEndingDef.subtitle})
                  </span>
                </div>
              </div>

              {/* 4 Key Statistics Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
                {/* Stat 1: Truths Confirmed */}
                <div className="p-4 bg-surface-dark/90 border border-holo-cyan/20 rounded-sm text-center">
                  <div className="text-[10px] font-mono text-slate-400 uppercase tracking-wider mb-1 flex items-center justify-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5 text-holo-cyan" />
                    <span>确证真相</span>
                  </div>
                  <div className="font-display font-bold text-2xl text-holo-cyan">
                    {believedTruths.length} / 6
                  </div>
                  <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                    {believedTruths.length === 6 ? "100% 正典收敛" : "部分收敛"}
                  </div>
                </div>

                {/* Stat 2: Propositions Archived */}
                <div className="p-4 bg-surface-dark/90 border border-holo-amber/20 rounded-sm text-center">
                  <div className="text-[10px] font-mono text-slate-400 uppercase tracking-wider mb-1 flex items-center justify-center gap-1">
                    <BookOpen className="w-3.5 h-3.5 text-holo-amber" />
                    <span>收集命题</span>
                  </div>
                  <div className="font-display font-bold text-2xl text-holo-amber">
                    {collectedPropositions.length}
                  </div>
                  <div className="text-[10px] text-slate-500 font-mono mt-0.5">全息书卷条目</div>
                </div>

                {/* Stat 3: Parity Integrity */}
                <div className="p-4 bg-surface-dark/90 border border-emerald-500/20 rounded-sm text-center">
                  <div className="text-[10px] font-mono text-slate-400 uppercase tracking-wider mb-1 flex items-center justify-center gap-1">
                    <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                    <span>校验位完整度</span>
                  </div>
                  <div className="font-display font-bold text-2xl text-emerald-400">
                    {Math.min(
                      100,
                      parseFloat(
                        (
                          38.2 +
                          believedTruths.length * 10.3 +
                          collectedPropositions.length * 1.2
                        ).toFixed(1)
                      )
                    )}
                    %
                  </div>
                  <div className="text-[10px] text-slate-500 font-mono mt-0.5">晚星自我连续性</div>
                </div>

                {/* Stat 4: Exploration Time */}
                <div className="p-4 bg-surface-dark/90 border border-purple-500/20 rounded-sm text-center">
                  <div className="text-[10px] font-mono text-slate-400 uppercase tracking-wider mb-1 flex items-center justify-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-purple-400" />
                    <span>探索耗时</span>
                  </div>
                  <div className="font-display font-bold text-xl md:text-2xl text-purple-300">
                    {formattedPlayTime}
                  </div>
                  <div className="text-[10px] text-slate-500 font-mono mt-0.5">标准巡航时间</div>
                </div>
              </div>

              {/* Confirmed Anchor Truths Showcase */}
              <div className="space-y-2">
                <div className="text-xs font-mono font-bold text-holo-cyan uppercase tracking-wider flex items-center justify-between">
                  <span>已确证的锚定真相 (CONFIRMED TRUTHS)</span>
                  <span className="text-slate-400 text-[11px]">
                    {believedTruths.length} / {CANON.anchorTruths.length}
                  </span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {CANON.anchorTruths.map((truth) => {
                    const isBelieved = believedTruths.includes(truth.id);
                    return (
                      <div
                        key={truth.id}
                        className={`p-3 rounded-sm border flex items-center justify-between text-xs font-mono ${
                          isBelieved
                            ? "bg-surface-dark/80 border-holo-cyan/40 text-slate-200"
                            : "bg-void/60 border-slate-800 text-slate-600"
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span
                            className={`w-2 h-2 rounded-full ${
                              isBelieved ? "bg-holo-cyan" : "bg-slate-700"
                            }`}
                          />
                          <div>
                            <span className="font-bold">{truth.id}：</span>
                            <span>{truth.title}</span>
                          </div>
                        </div>
                        {isBelieved && (
                          <span className="text-[10px] px-2 py-0.5 bg-holo-cyan/10 text-holo-cyan border border-holo-cyan/30 rounded">
                            BELIEVED
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Expandable Proposition List Toggle */}
              <div>
                <button
                  type="button"
                  onClick={() => setShowPropList((prev) => !prev)}
                  className="text-xs font-mono text-holo-amber hover:underline flex items-center gap-1"
                >
                  <span>{showPropList ? "折叠命题清单 ▲" : "展开已收集命题详细清单 ▼"}</span>
                  <span className="text-slate-500">({collectedPropositions.length})</span>
                </button>

                {showPropList && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    className="mt-2 p-3 bg-void/90 border border-slate-700/60 rounded text-[11px] font-mono text-slate-300 max-h-40 overflow-y-auto space-y-1"
                  >
                    {collectedPropositions.length === 0 ? (
                      <div className="text-slate-500">暂无命题记录</div>
                    ) : (
                      collectedPropositions.map((prop, idx) => (
                        <div key={idx} className="flex items-center gap-2">
                          <Check className="w-3 h-3 text-holo-cyan shrink-0" />
                          <span>{prop}</span>
                        </div>
                      ))
                    )}
                  </motion.div>
                )}
              </div>

              {/* Action Buttons: Return Title / Replay Ending / New Game */}
              <div className="pt-4 border-t border-holo-cyan/20 flex flex-col sm:flex-row justify-between items-center gap-3">
                <button
                  onClick={() => setStep("select")}
                  className="w-full sm:w-auto px-5 py-2.5 bg-surface border border-holo-border hover:border-holo-cyan text-holo-bright text-xs font-mono uppercase tracking-wider rounded-sm transition-all flex items-center justify-center gap-2"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>重温其他决议 (SELECT ANOTHER)</span>
                </button>

                <div className="w-full sm:w-auto flex items-center gap-3">
                  <button
                    onClick={onReturnTitle}
                    className="flex-1 sm:flex-initial px-5 py-2.5 bg-surface-dark border border-slate-600 hover:border-holo-cyan text-slate-200 text-xs font-mono uppercase tracking-wider rounded-sm transition-all flex items-center justify-center gap-2"
                  >
                    <Home className="w-3.5 h-3.5" />
                    <span>返回标题 (RETURN TITLE)</span>
                  </button>

                  <button
                    onClick={onNewGame}
                    className="flex-1 sm:flex-initial px-6 py-2.5 bg-holo-cyan/20 border border-holo-cyan hover:bg-holo-cyan hover:text-void text-holo-bright text-xs font-mono font-bold uppercase tracking-wider rounded-sm shadow-holo-cyan transition-all flex items-center justify-center gap-2"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>开启新周期 (NEW GAME+)</span>
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Bottom Telemetry Bar */}
      <footer className="relative z-10 w-full border-t border-holo-cyan/20 bg-surface-dark/90 px-6 py-3 flex justify-between items-center text-[11px] font-mono text-slate-500 shrink-0">
        <div>VESSEL: ISV THRESHOLD // RECORDER-9 [VESPER]</div>
        <div>ASTRAL NOIR NARRATIVE ENGINE v1.0.0</div>
      </footer>
    </div>
  );
}
