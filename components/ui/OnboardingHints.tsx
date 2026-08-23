"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Compass,
  BookOpen,
  Network,
  Sparkles,
  X,
  ChevronRight,
} from "lucide-react";

const ONBOARDING_STORAGE_KEY = "ember_protocol_onboarding_acknowledged_v1";

interface OnboardingHintItem {
  id: string;
  title: string;
  badge: string;
  description: string;
  shortcut?: string;
  icon: React.ElementType;
}

const HINT_STEPS: OnboardingHintItem[] = [
  {
    id: "survey_planets",
    title: "天体测绘与轨道降落",
    badge: "STEP 01 // 航天遥测",
    description: "点击星系中的任意天体即可检视其表象文明档案并执行轨道降落，调查地表遗迹与残响。",
    shortcut: "鼠标点击星球",
    icon: Compass,
  },
  {
    id: "synthesis_index",
    title: "公证索引与演绎推理",
    badge: "STEP 02 // 逻辑收敛",
    description: "收集命题后，点击右上角【INDEX】按钮展开公证索引台。钉选命题并陈述假说，收敛确证 6 大锚定真相。",
    shortcut: "右上角 [INDEX]",
    icon: BookOpen,
  },
  {
    id: "inference_lines",
    title: "推理图谱与舰桥管理",
    badge: "STEP 03 // 架构拓扑",
    description: "按 [L] 可切换星系计算机推理拓扑网络；点击右上角 SHIP DECK 可进入舰桥管理 3 个多档位本地归档。",
    shortcut: "快捷键 [L]",
    icon: Network,
  },
];

interface OnboardingHintsProps {
  currentView: string;
}

export default function OnboardingHints({ currentView }: OnboardingHintsProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [autoProgress, setAutoProgress] = useState(0);

  useEffect(() => {
    // Only show during galaxy view and when not previously acknowledged
    if (typeof window === "undefined") return;
    const isAcknowledged = localStorage.getItem(ONBOARDING_STORAGE_KEY);
    if (!isAcknowledged && (currentView === "galaxy" || currentView === "survey")) {
      const timer = setTimeout(() => {
        setIsVisible(true);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [currentView]);

  // Auto-progress timer for active hint (4 seconds per step)
  useEffect(() => {
    if (!isVisible) return;
    setAutoProgress(0);

    const interval = setInterval(() => {
      setAutoProgress((prev) => {
        if (prev >= 100) {
          if (currentStepIndex < HINT_STEPS.length - 1) {
            setCurrentStepIndex((curr) => curr + 1);
            return 0;
          } else {
            handleDismiss();
            return 100;
          }
        }
        return prev + 2.5; // ~4 seconds total
      });
    }, 100);

    return () => clearInterval(interval);
  }, [isVisible, currentStepIndex]);

  const handleDismiss = () => {
    setIsVisible(false);
    if (typeof window !== "undefined") {
      localStorage.setItem(ONBOARDING_STORAGE_KEY, "true");
    }
  };

  const handleNext = () => {
    if (currentStepIndex < HINT_STEPS.length - 1) {
      setCurrentStepIndex((prev) => prev + 1);
      setAutoProgress(0);
    } else {
      handleDismiss();
    }
  };

  const currentHint = HINT_STEPS[currentStepIndex];
  if (!currentHint || !isVisible) return null;

  const IconComponent = currentHint.icon;

  return (
    <AnimatePresence>
      <motion.aside
        initial={{ opacity: 0, y: 30, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 30, scale: 0.95 }}
        transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
        role="complementary"
        aria-label="新手操作引导提示"
        aria-live="polite"
        className="fixed bottom-6 inset-x-4 sm:inset-x-auto sm:bottom-8 sm:left-8 z-40 sm:max-w-sm w-auto sm:w-full holo-panel p-4 rounded-sm border-holo-cyan/50 shadow-holo-cyan pointer-events-auto"
      >
        {/* Progress Bar Header */}
        <div className="w-full h-1 bg-surface-dark rounded-full overflow-hidden mb-3">
          <div
            className="h-full bg-holo-cyan transition-all duration-100 ease-linear"
            style={{ width: `${autoProgress}%` }}
          />
        </div>

        {/* Header Badge & Dismiss Button */}
        <div className="flex justify-between items-center mb-2">
          <div className="flex items-center gap-1.5 text-[10px] font-mono text-holo-cyan font-bold tracking-widest uppercase">
            <Sparkles className="w-3.5 h-3.5 text-holo-amber" />
            <span>{currentHint.badge}</span>
            <span className="text-slate-400">
              ({currentStepIndex + 1}/{HINT_STEPS.length})
            </span>
          </div>

          <button
            onClick={handleDismiss}
            className="p-1 text-slate-400 hover:text-holo-cyan hover:bg-surface-dark rounded transition-colors"
            aria-label="关闭新手引导提示"
            title="关闭引导 (不再提示)"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex items-start gap-3 my-2">
          <div className="w-8 h-8 rounded-sm bg-holo-cyan/15 border border-holo-cyan/40 flex items-center justify-center text-holo-cyan shrink-0 mt-0.5">
            <IconComponent className="w-4 h-4" />
          </div>
          <div>
            <h4 className="font-display font-bold text-xs text-holo-bright">
              {currentHint.title}
            </h4>
            <p className="text-[11px] font-mono text-slate-300 mt-1 leading-relaxed">
              {currentHint.description}
            </p>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="mt-3 pt-2.5 border-t border-holo-cyan/15 flex justify-between items-center text-[10px] font-mono">
          {currentHint.shortcut ? (
            <span className="px-2 py-0.5 bg-void/80 border border-holo-border text-holo-amber rounded">
              {currentHint.shortcut}
            </span>
          ) : (
            <span />
          )}

          <div className="flex items-center gap-2">
            <button
              onClick={handleDismiss}
              className="text-slate-400 hover:text-slate-200 px-2 py-1 transition-colors"
            >
              跳过
            </button>
            <button
              onClick={handleNext}
              className="px-3 py-1 bg-holo-cyan/20 border border-holo-cyan hover:bg-holo-cyan hover:text-void text-holo-bright rounded transition-all flex items-center gap-1 font-bold"
            >
              <span>{currentStepIndex < HINT_STEPS.length - 1 ? "下一步" : "已知晓"}</span>
              <ChevronRight className="w-3 h-3" />
            </button>
          </div>
        </div>
      </motion.aside>
    </AnimatePresence>
  );
}
