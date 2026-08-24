"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Compass,
  BookOpen,
  Cpu,
  Terminal,
  ShieldCheck,
  Zap,
  Globe,
  Radio,
  FileText,
  ExternalLink,
  ChevronRight,
  Play,
  RotateCcw,
  Sparkles,
  Layers,
  Activity,
  ArrowRight,
} from "lucide-react";

export default function LandingPage() {
  const [typedSlogan, setTypedSlogan] = useState("");
  const fullSlogan = "九颗恒星。一台机器。四百年前的熄灭不是毁灭，而是写回。";

  useEffect(() => {
    let idx = 0;
    const timer = setInterval(() => {
      idx++;
      setTypedSlogan(fullSlogan.slice(0, idx));
      if (idx >= fullSlogan.length) {
        clearInterval(timer);
      }
    }, 45);
    return () => clearInterval(timer);
  }, []);

  const features = [
    {
      icon: Cpu,
      title: "分布式恒星计算机",
      subtitle: "DISTRIBUTED STELLAR COMPUTE",
      desc: "余烬星弧不是天然星系，而是一台宏大的张量计算机。九颗星球分别担任引导、总线、只读光存、时钟基频、内存寻址与生物湿件。",
      color: "#38bdf8",
      borderColor: "border-sky-500/30",
    },
    {
      icon: ShieldCheck,
      title: "奇偶校验位探针 (Vesper)",
      subtitle: "RECORDER-9 PARITY BIT",
      desc: "你并非外部降临的过客，而是第一轮计算留下的第 9 号奇偶校验码。前 8 代探针已在上一周期相继熔断，本次苏醒是终结自催化点火的最后闭环。",
      color: "#f59e0b",
      borderColor: "border-amber-500/30",
    },
    {
      icon: BookOpen,
      title: "全息演绎推理图谱",
      subtitle: "DEDUCTIVE SYNTHESIS GRAPH",
      desc: "告别传统的无脑寻路与任务清单。在地表遗迹提取命题，于公证索引台提出科学假说，通过自然语言推理与知识图谱收敛确证 6 大锚定真相。",
      color: "#10b981",
      borderColor: "border-emerald-500/30",
    },
    {
      icon: Radio,
      title: "Astral Noir 沉浸黑色电影",
      subtitle: "ASTRAL NOIR PHILOSOPHY",
      desc: "冷辉、琥珀警示、CRT 物理扫描线与深邃虚空。体验 3D 可交互星系、残响回溯对话树，并最终在三大哲学结局中抉择宇宙的归宿。",
      color: "#c084fc",
      borderColor: "border-purple-500/30",
    },
  ];

  const resolutionBranches = [
    {
      name: "封存协议 (Seal-Off)",
      badge: "CANONICAL RESOLUTION",
      desc: "熔断自催化能量回路，阻止第二轮点火。星弧保持沉默，守望宁静余烬。",
      color: "text-sky-400",
      borderColor: "border-sky-500/30",
      image: "/ending-sealoff.webp",
    },
    {
      name: "允许写回 (Permission to Overwrite)",
      badge: "TRANSCENDENCE",
      desc: "放弃校验锁定，允许第二轮计算写回底层物理常数，宇宙完成升维重构。",
      color: "text-amber-400",
      borderColor: "border-amber-500/30",
      image: "/ending-overwrite.webp",
    },
    {
      name: "递归继任 (The Night Shift Recurse)",
      badge: "FATE & NEW GAME+",
      desc: "重铸第十具休眠舱，重置 400 年倒计时，作为永远的守夜人守护闭环。",
      color: "text-emerald-400",
      borderColor: "border-emerald-500/30",
      image: "/ending-recurse.webp",
    },
  ];

  return (
    <div className="relative min-h-screen w-full bg-void text-holo-bright font-mono overflow-x-hidden selection:bg-holo-cyan selection:text-void flex flex-col justify-between">
      {/* Background Hero Artwork & Starlight Atmosphere */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        {/* Hero Background Image */}
        <div
          className="absolute inset-0 bg-cover bg-right md:bg-center opacity-40 mix-blend-screen transition-opacity duration-1000 scale-105"
          style={{
            backgroundImage: "url('/hero-bg.png')",
          }}
        />
        {/* Subtle Radial & Linear Darkening Overlays for Max Typography Contrast */}
        <div className="absolute inset-0 bg-gradient-to-b from-void/80 via-void/50 to-void" />
        <div className="absolute inset-0 bg-gradient-to-r from-void via-void/40 to-transparent" />
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] bg-gradient-to-tr from-sky-900/20 via-amber-900/10 to-transparent rounded-full blur-3xl animate-pulse" />
        <div className="absolute top-3/4 left-1/3 w-[500px] h-[500px] bg-gradient-to-br from-emerald-900/10 via-sky-900/15 to-transparent rounded-full blur-3xl" />
        <div className="absolute inset-0 bg-[radial-gradient(#38bdf8_1px,transparent_1px)] [background-size:40px_40px] opacity-10" />
      </div>

      {/* Navigation Header */}
      <header className="relative z-10 w-full border-b border-holo-cyan/15 bg-surface-dark/90 backdrop-blur-md px-6 md:px-12 py-4 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <span className="w-2.5 h-2.5 rounded-full bg-holo-cyan holo-pulse" />
          <div className="font-display font-bold text-base md:text-lg tracking-widest text-holo-bright">
            THE EMBER PROTOCOL
          </div>
          <span className="hidden sm:inline-block text-[11px] px-2 py-0.5 bg-surface border border-holo-border text-holo-cyan rounded">
            余烬协议 v1.0
          </span>
        </div>

        <nav aria-label="落地页主导航" className="flex items-center gap-3 md:gap-5 text-xs font-mono">
          <a
            href="https://github.com/Cola113/ember-protocol/blob/main/DESIGN.md"
            target="_blank"
            rel="noopener noreferrer"
            className="px-3 py-1.5 text-slate-300 hover:text-holo-cyan transition-colors flex items-center gap-1"
          >
            <FileText className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">设计白皮书</span>
            <span className="sm:hidden">DESIGN</span>
            <ExternalLink className="w-3 h-3 text-slate-400" />
          </a>

          <Link
            href="/"
            className="px-4 py-2 bg-gradient-to-r from-holo-cyan/20 to-holo-cyan/10 border border-holo-cyan hover:bg-holo-cyan hover:text-void text-holo-bright rounded-sm font-bold tracking-wider transition-all shadow-holo-cyan flex items-center gap-1.5"
          >
            <span>开始游戏</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </nav>
      </header>

      {/* Main Hero Section */}
      <main className="relative z-10 flex-1 max-w-6xl w-full mx-auto px-6 md:px-12 py-12 md:py-20 flex flex-col justify-center space-y-16">
        {/* Hero Banner */}
        <section className="text-center space-y-6 max-w-4xl mx-auto pt-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-surface border border-holo-cyan/30 text-holo-cyan rounded-sm text-xs font-mono uppercase tracking-widest shadow-sm">
            <Radio className="w-3.5 h-3.5 text-holo-amber animate-pulse" />
            <span>ASTRAL NOIR HARD-SF DEDUCTIVE EXPEDITION</span>
          </div>

          <h1 className="font-display font-bold text-3xl sm:text-5xl md:text-6xl text-holo-bright tracking-wider leading-tight">
            余烬协议
            <span className="block text-xl sm:text-2xl md:text-3xl text-slate-400 font-normal mt-2">
              THE EMBER PROTOCOL
            </span>
          </h1>

          {/* Typewriter Slogan */}
          <div className="min-h-[56px] flex items-center justify-center">
            <div className="p-3.5 md:p-4 bg-surface-dark/90 border-l-4 border-holo-amber rounded-sm max-w-2xl text-sm md:text-base font-mono text-slate-200 tracking-wide shadow-lg">
              <span>{typedSlogan}</span>
              <span className="inline-block w-2 h-4 bg-holo-amber ml-1 animate-pulse align-middle" />
            </div>
          </div>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <Link
              href="/"
              className="w-full sm:w-auto px-8 py-3.5 bg-gradient-to-r from-holo-cyan/30 via-holo-cyan/20 to-surface border border-holo-cyan hover:bg-holo-cyan hover:text-void text-holo-bright font-mono font-bold text-sm tracking-widest uppercase rounded-sm shadow-holo-cyan transition-all duration-200 flex items-center justify-center gap-2 group"
            >
              <Play className="w-4 h-4 text-holo-cyan group-hover:text-void fill-current" />
              <span>进入余烬星弧 (LAUNCH PROTOCOL)</span>
            </Link>

            <a
              href="https://github.com/Cola113/ember-protocol/blob/main/DESIGN.md"
              target="_blank"
              rel="noopener noreferrer"
              className="w-full sm:w-auto px-6 py-3.5 bg-surface border border-slate-700 hover:border-slate-400 text-slate-300 hover:text-white font-mono text-sm tracking-wider uppercase rounded-sm transition-all flex items-center justify-center gap-2"
            >
              <BookOpen className="w-4 h-4 text-slate-400" />
              <span>查阅世界观与设计文档</span>
              <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
            </a>
          </div>
        </section>

        {/* 4 Feature Cards */}
        <section aria-labelledby="features-heading" className="space-y-6">
          <div className="text-center space-y-1">
            <h2 id="features-heading" className="font-display font-bold text-xl md:text-2xl text-holo-bright">
              核心系统与硬核推理机制
            </h2>
            <p className="text-xs font-mono text-slate-400">
              CORE PILLARS // SYSTEM ARCHITECTURE
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {features.map((feat, idx) => {
              const IconComp = feat.icon;
              return (
                <div
                  key={idx}
                  className={`holo-panel p-6 rounded-sm border ${feat.borderColor} space-y-3 transition-all hover:scale-[1.01] hover:shadow-lg`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-9 h-9 rounded-sm flex items-center justify-center shrink-0"
                      style={{ backgroundColor: `${feat.color}22`, color: feat.color }}
                    >
                      <IconComp className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-display font-bold text-sm md:text-base text-holo-bright">
                        {feat.title}
                      </h3>
                      <div className="text-[10px] font-mono text-slate-400 tracking-wider">
                        {feat.subtitle}
                      </div>
                    </div>
                  </div>
                  <p className="text-xs font-mono text-slate-300 leading-relaxed">
                    {feat.desc}
                  </p>
                </div>
              );
            })}
          </div>
        </section>

        {/* Story Narrative & 3 Endings Preview */}
        <section aria-labelledby="endings-heading" className="holo-panel p-8 rounded-sm border border-holo-amber/30 space-y-6">
          <div className="border-b border-holo-cyan/15 pb-4 flex flex-wrap justify-between items-center gap-2">
            <div>
              <div className="text-[10px] font-mono text-holo-amber uppercase tracking-widest font-bold">
                RESOLUTION PROTOCOLS
              </div>
              <h2 id="endings-heading" className="font-display font-bold text-xl text-holo-bright">
                三大哲学决议分支 (P4 终局叙事)
              </h2>
            </div>
            <div className="px-2.5 py-1 bg-surface-dark border border-holo-amber/30 text-holo-amber text-xs font-mono rounded">
              PARITY LOCK: READY
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {resolutionBranches.map((branch, i) => (
              <div
                key={i}
                className={`p-4 bg-surface-dark/90 border ${branch.borderColor} rounded-sm space-y-3 flex flex-col justify-between group hover:border-holo-cyan/50 transition-all hover:scale-[1.01] shadow-md`}
              >
                <div className="space-y-3">
                  <div className="relative aspect-video sm:aspect-square w-full rounded-sm overflow-hidden bg-void border border-slate-800/80">
                    <img
                      src={branch.image}
                      alt={branch.name}
                      loading="lazy"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 opacity-85 group-hover:opacity-100"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-surface-dark via-transparent to-transparent opacity-60 pointer-events-none" />
                  </div>
                  <div className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">
                    {branch.badge}
                  </div>
                  <h3 className={`font-display font-bold text-sm ${branch.color}`}>
                    {branch.name}
                  </h3>
                  <p className="text-xs font-mono text-slate-300 leading-relaxed">
                    {branch.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Bottom Callout Banner */}
        <section className="text-center space-y-4 pt-4">
          <div className="text-xs font-mono text-slate-400 italic">
            “在这片没有活人的星系里，你将证明自己为何存在。”
          </div>
          <div>
            <Link
              href="/"
              className="inline-flex items-center gap-2 px-8 py-3 bg-holo-cyan/20 border border-holo-cyan hover:bg-holo-cyan hover:text-void text-holo-bright font-mono text-xs font-bold tracking-widest uppercase rounded-sm shadow-holo-cyan transition-all"
            >
              <span>立即登舰 · ISV THRESHOLD</span>
              <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="relative z-10 w-full border-t border-holo-cyan/15 bg-surface-dark/95 px-6 md:px-12 py-6 flex flex-col sm:flex-row justify-between items-center gap-4 text-xs font-mono text-slate-400">
        <div>
          <span>余烬协议 // THE EMBER PROTOCOL</span>
          <span className="mx-2">·</span>
          <span>AUTONOMOUS ASTRAL NOIR GAME ENGINE</span>
        </div>
        <div className="flex items-center gap-4 text-slate-400">
          <Link href="/" className="hover:text-holo-cyan transition-colors">
            游戏主页
          </Link>
          <a
            href="https://github.com/Cola113/ember-protocol"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-holo-cyan transition-colors"
          >
            GitHub
          </a>
        </div>
      </footer>
    </div>
  );
}
