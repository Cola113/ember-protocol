/**
 * Pack B 双层合规测试（T-G 回归 G1-G3 补测）
 * 覆盖：咏井/针/总账 NPC（Orpheus/Ayla/Valentine）step.text/choices/hysteresisNote/reward
 *      + 收集 toast 与 proposition_labels 对齐 + 寄存器块/导航站扫描
 * 运行：npx tsx tests/pack-b-dual-layer-check.ts
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { CANON } from "../lib/canon";
import { CANON_DIALOGUES } from "../lib/dialogues";

// ---- 禁词表（与 next-step.ts 对齐）----
const GLOBAL_FORBIDDEN: string[] = [
  "引导扇区", "握手载波", "总线", "ROM", "压电晶振", "时钟基频", "寻址",
  "堆栈指针", "张量", "生物湿件", "写回", "写回操作", "常数化", "常数",
  "熔断", "校验位", "沙盒", "代码", "程序", "Hypervisor", "并联",
  "CHECKSUM", "Checksum", "BOOTSTRAP", "OSCILLATOR", "PARITY",
];
const PLANET_FORBIDDEN: Record<string, string[]> = {
  "choir-well": ["中央时钟", "时钟", "基频时钟", "晶振", "相位差"],
  "needle": ["内存寻址", "指针基底", "重定基底", "地址", "越界", "堆栈"],
  "ledger": ["校验和", "错误日志", "异常中断", "崩溃转储", "哈希"],
};

function collectDialogueTexts(): { texts: string[]; npc: string }[] {
  const out: { texts: string[]; npc: string }[] = [];
  for (const [npcId, tree] of Object.entries(CANON_DIALOGUES)) {
    const texts: string[] = [];
    const walk = (node: any) => {
      if (!node) return;
      if (Array.isArray(node)) {
        for (const n of node) walk(n);
        return;
      }
      if (node.text) texts.push(String(node.text));
      if (node.hysteresisNote) texts.push(String(node.hysteresisNote));
      if (node.choices) for (const c of node.choices) {
        if (c.text) texts.push(String(c.text));
        if (c.reaction) texts.push(String(c.reaction));
      }
      if (node.propositionReward?.text) texts.push(String(node.propositionReward.text));
      for (const c of node.choices || []) walk(c);
    };
    walk(tree.steps);
    out.push({ texts, npc: npcId });
  }
  return out;
}

// ---- 1. 包 B 三 NPC 禁词扫描（含 hysteresisNote）----
{
  const all = collectDialogueTexts();
  const packB = all.filter((t) => ["npc-orpheus", "npc-ayla", "npc-valentine"].includes(t.npc));
  assert.ok(packB.length === 3, `包 B 应有 3 个 NPC 树，实际 ${packB.length}`);
  let scanned = 0;
  for (const { npc, texts } of packB) {
    for (const t of texts) {
      scanned++;
      for (const w of GLOBAL_FORBIDDEN) {
        assert.ok(!t.includes(w), `[${npc}] 全局禁词 "${w}" 命中: ${t.slice(0, 60)}`);
      }
    }
  }
  // 分星禁词（按树归属）
  const planetMap: Record<string, string[]> = {
    "npc-orpheus": PLANET_FORBIDDEN["choir-well"],
    "npc-ayla": PLANET_FORBIDDEN["needle"],
    "npc-valentine": PLANET_FORBIDDEN["ledger"],
  };
  for (const { npc, texts } of packB) {
    for (const t of texts) {
      for (const w of planetMap[npc] || []) {
        assert.ok(!t.includes(w), `[${npc}] 本星禁词 "${w}" 命中: ${t.slice(0, 60)}`);
      }
    }
  }
  assert.ok(scanned >= 40, `包 B 扫描文本量异常: ${scanned}`);
  console.log(`[PASS] 包 B 禁词扫描 ${scanned} 条文本（含 hysteresisNote/reward/choices）0 命中`);
}

// ---- 2. 收集 toast 与 proposition_labels 对齐 ----
{
  const ssv = readFileSync("components/ui/SurfaceStageView.tsx", "utf-8");
  const labels = CANON.proposition_labels || {};
  // 检查所有 handleCollectReward 第二参：若对应命题有 label，必须等于 label
  const re = /handleCollectReward\(\s*"([^"]+)",\s*"([^"]+)"/g;
  let m: RegExpExecArray | null;
  let checked = 0;
  while ((m = re.exec(ssv)) !== null) {
    const [_, code, text] = m;
    if (labels[code]) {
      assert.equal(text, labels[code], `收集文案与 label 不一致: ${code} → "${text}" vs "${labels[code]}"`);
      checked++;
    }
  }
  assert.ok(checked >= 10, `应至少检查 10 处收集调用，实际 ${checked}`);
  console.log(`[PASS] ${checked} 处收集 toast 与 proposition_labels 完全对齐`);
}

// ---- 3. 寄存器块 / 导航站扫描（G3）----
{
  const ssv = readFileSync("components/ui/SurfaceStageView.tsx", "utf-8");
  // 差分机寄存器块必须被 isDecoded 门控
  const dumpIdx = ssv.indexOf("DIFFERENCE ENGINE // ERROR REGISTER DUMP");
  assert.ok(dumpIdx > 0, "寄存器块存在");
  const beforeDump = ssv.slice(Math.max(0, dumpIdx - 800), dumpIdx);
  assert.ok(beforeDump.includes("isDecoded &&"), "寄存器块未包 isDecoded 门控（B1 回归）");
  console.log("[PASS] 差分机寄存器块 isDecoded 门控在位");

  const ship = readFileSync("components/ui/ShipInteriorView.tsx", "utf-8");
  for (const w of ["引导扇区", "互斥", "只读光", "总线回路", "握手"]) {
    assert.ok(!ship.includes(w), `ShipInteriorView 残留禁词 "${w}"（B4 回归）`);
  }
  console.log("[PASS] ShipInteriorView 导航站无机器词");
}

// ---- 4. claims 定标：18 句全 ≤16 字 ----
{
  let total = 0;
  for (const t of CANON.anchorTruths) {
    for (const k of ["surface_claim", "foil_claim", "half_claim"] as const) {
      const v = t[k];
      assert.ok(v && v.length > 0, `${t.id}.${k} 为空`);
      assert.ok(v.length <= 16, `${t.id}.${k} 超 16 字: ${v.length} 字 — ${v}`);
      total++;
    }
  }
  assert.equal(total, 18);
  console.log("[PASS] 18 句 claims 全 ≤16 字（N4 定标）");
}

// ---- 5. 声明级剧透：包 B surface 无 T3/T5 结论 ----
{
  const all = collectDialogueTexts();
  const packB = all.filter((t) => ["npc-orpheus", "npc-ayla", "npc-valentine"].includes(t.npc));
  const spoilerPatterns = [
    "时钟脉冲", "中央时钟", "校验和", "错误日志", "寻址", "Rebase", "REBASED",
    "灰墨热并非", "并非病毒", "写回", "常数化",
  ];
  for (const { npc, texts } of packB) {
    for (const t of texts) {
      for (const p of spoilerPatterns) {
        assert.ok(!t.includes(p), `[${npc}] 声明级剧透 "${p}": ${t.slice(0, 60)}`);
      }
    }
  }
  console.log("[PASS] 包 B 声明级剧透扫描 0 命中");
}

console.log("\n=== All Pack B Dual-Layer Checks Passed ===");
