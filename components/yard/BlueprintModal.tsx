"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Copy, Check, Upload, X, Sparkles, Box, Car, RefreshCw } from "lucide-react";
import type { YardBlueprint } from "@/lib/yard/blueprint";
import { YardBlueprintSchema } from "@/lib/yard/blueprint";
import { YARD_PRESETS } from "@/lib/yard/presets";

type BlueprintModalProps = {
  isOpen: boolean;
  onClose: () => void;
  currentBlueprint: YardBlueprint | null;
  onLoadBlueprint: (blueprint: YardBlueprint) => void;
};

export default function BlueprintModal({
  isOpen,
  onClose,
  currentBlueprint,
  onLoadBlueprint,
}: BlueprintModalProps) {
  const [jsonText, setJsonText] = useState("");
  const [copied, setCopied] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleCopyCurrent = () => {
    if (!currentBlueprint) return;
    const str = JSON.stringify(currentBlueprint, null, 2);
    navigator.clipboard.writeText(str).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleImportJson = () => {
    setErrorMsg(null);
    setSuccessMsg(null);
    if (!jsonText.trim()) {
      setErrorMsg("请输入蓝图 JSON");
      return;
    }
    try {
      const parsed = JSON.parse(jsonText);
      const res = YardBlueprintSchema.safeParse(parsed);
      if (!res.success) {
        setErrorMsg(`格式校验错误: ${res.error.issues[0]?.message || "无效结构"}`);
        return;
      }
      onLoadBlueprint(res.data);
      setSuccessMsg("蓝图已成功导入并加载！");
      setTimeout(() => {
        onClose();
        setSuccessMsg(null);
        setJsonText("");
      }, 700);
    } catch {
      setErrorMsg("无效的 JSON 字符串");
    }
  };

  const handleSelectPreset = (presetKey: string) => {
    const p = YARD_PRESETS[presetKey];
    if (!p) return;
    onLoadBlueprint(p.blueprint);
    setSuccessMsg(`已载入模板：${p.name}`);
    setTimeout(() => {
      onClose();
      setSuccessMsg(null);
    }, 600);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-void/80 backdrop-blur-md">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ duration: 0.18 }}
            className="holo-panel relative w-full max-w-xl p-6 text-holo-bright shadow-2xl overflow-hidden font-mono"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-holo-border/40 pb-3">
              <div className="flex items-center gap-2">
                <Sparkles size={16} className="text-holo-cyan" />
                <h3 className="font-display text-sm tracking-[0.16em] uppercase text-holo-cyan">
                  蓝图中心 // BLUEPRINT PROTOCOL
                </h3>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="text-holo-muted hover:text-holo-bright p-1"
                aria-label="关闭"
              >
                <X size={16} />
              </button>
            </div>

            {/* Presets Grid */}
            <div className="mt-4">
              <p className="text-[10px] uppercase tracking-widest text-holo-muted mb-2">
                推荐开局模板 (3 款)
              </p>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => handleSelectPreset("cantilever")}
                  className="flex flex-col items-start p-2.5 rounded bg-void/60 border border-holo-border/30 hover:border-holo-cyan/80 hover:bg-holo-cyan/10 transition-all text-left group"
                >
                  <div className="flex items-center gap-1.5 text-xs text-holo-cyan font-bold">
                    <Box size={13} />
                    <span>基础悬臂</span>
                  </div>
                  <span className="text-[10px] text-holo-muted mt-1 leading-tight group-hover:text-holo-bright">
                    立柱+悬臂板
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => handleSelectPreset("rover")}
                  className="flex flex-col items-start p-2.5 rounded bg-void/60 border border-holo-border/30 hover:border-holo-amber/80 hover:bg-holo-amber/10 transition-all text-left group"
                >
                  <div className="flex items-center gap-1.5 text-xs text-holo-amber font-bold">
                    <Car size={13} />
                    <span>工业小车</span>
                  </div>
                  <span className="text-[10px] text-holo-muted mt-1 leading-tight group-hover:text-holo-bright">
                    底盘+推进喷口
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => handleSelectPreset("spinner")}
                  className="flex flex-col items-start p-2.5 rounded bg-void/60 border border-holo-border/30 hover:border-holo-green/80 hover:bg-holo-green/10 transition-all text-left group"
                >
                  <div className="flex items-center gap-1.5 text-xs text-holo-green font-bold">
                    <RefreshCw size={13} />
                    <span>疯狂转轮</span>
                  </div>
                  <span className="text-[10px] text-holo-muted mt-1 leading-tight group-hover:text-holo-bright">
                    地锚轴+切向推进
                  </span>
                </button>
              </div>
            </div>

            {/* Share / JSON section */}
            <div className="mt-5 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] uppercase tracking-widest text-holo-muted">
                  当前蓝图 JSON 导入 / 导出
                </span>
                <button
                  type="button"
                  onClick={handleCopyCurrent}
                  disabled={!currentBlueprint}
                  className="inline-flex items-center gap-1 text-[11px] text-holo-cyan hover:text-holo-bright disabled:opacity-40"
                >
                  {copied ? <Check size={12} className="text-holo-green" /> : <Copy size={12} />}
                  <span>{copied ? "已复制到剪贴板" : "复制当前蓝图"}</span>
                </button>
              </div>

              <textarea
                value={jsonText}
                onChange={(e) => setJsonText(e.target.value)}
                placeholder="粘贴蓝图 JSON 字符串在此处以导入..."
                rows={4}
                className="w-full rounded bg-void/90 border border-holo-border/40 p-2.5 text-xs text-holo-bright font-mono focus:border-holo-cyan focus:outline-none placeholder:text-holo-muted/50"
              />

              {errorMsg && (
                <p className="text-[11px] text-holo-rose">{errorMsg}</p>
              )}
              {successMsg && (
                <p className="text-[11px] text-holo-green">{successMsg}</p>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-3 py-1.5 text-xs text-holo-muted hover:text-holo-bright border border-transparent"
                >
                  取消
                </button>
                <button
                  type="button"
                  onClick={handleImportJson}
                  className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs uppercase tracking-wider bg-holo-cyan/20 border border-holo-cyan text-holo-cyan hover:bg-holo-cyan hover:text-void transition-colors rounded"
                >
                  <Upload size={13} />
                  <span>导入蓝图</span>
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
