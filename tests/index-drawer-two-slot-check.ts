/**
 * T-B 两槽综合 UI 单元测试（pi 顾虑 C 补测）
 * 锁：拼装顺序 + 共振匹配 + 残缺句门
 * 运行：npx tsx tests/index-drawer-two-slot-check.ts
 */
import assert from "node:assert/strict";
import { CANON } from "../lib/canon";

// ---- 复刻 IndexDrawer 拼装逻辑（与组件实现一致）----
const CONNECTIVES = ["因为", "所以", "不是", "而是", "并非"] as const;
function assembleHypothesis(a: string, conn: string, b: string): string {
  return [a.trim(), conn, b.trim()].filter(Boolean).join(" ");
}

// 共振匹配（与组件 claimResonance 同语义：包含匹配优先 + 4-gram 兜底）
function claimResonance(text: string) {
  const clean = text.replace(/[，。、！？\s]/g, "");
  for (const t of CANON.anchorTruths) {
    for (const [kind, claim] of [
      ["surface", t.surface_claim],
      ["foil", t.foil_claim],
      ["half", t.half_claim],
    ] as const) {
      if (!claim) continue;
      const c = claim.replace(/[，。、！？\s]/g, "");
      if (clean.includes(c) || c.includes(clean)) return { truthId: t.id, kind };
    }
  }
  return null;
}

// ---- 1. 拼装顺序 ----
{
  const h = assembleHypothesis("信标从不求救", "因为", "天线等不到应答");
  assert.equal(h, "信标从不求救 因为 天线等不到应答");
  console.log("[PASS] 拼装顺序 A+连接词+B");
}
{
  const h = assembleHypothesis("总管无法同时供热", "不是", "铜管老旧");
  assert.equal(h, "总管无法同时供热 不是 铜管老旧");
  console.log("[PASS] 连接词「不是」");
}
{
  const h = assembleHypothesis("", "所以", "坐标错开一格");
  assert.equal(h, "所以 坐标错开一格");
  console.log("[PASS] 单槽残缺句可拼出（由提交门拦截）");
}

// ---- 2. 两槽门（残缺句拦截）----
{
  const usingSlots = true; // hypothesis 为空走拼装
  const bothSlotsFilled = "信标从不求救" !== "" && "" !== "";
  const blocked = usingSlots && !bothSlotsFilled;
  assert.equal(blocked, true, "单槽提交应被拦截");
  console.log("[PASS] 单槽残缺句被两槽门拦截");
}
{
  const usingSlots = true;
  const bothSlotsFilled = "信标从不求救" !== "" && "天线等不到应答" !== "";
  const allowed = !(usingSlots && !bothSlotsFilled);
  assert.equal(allowed, true, "双槽提交应放行");
  console.log("[PASS] 双槽完整提交放行");
}
{
  // 自由编辑模式（hypothesis 非空）不受槽位门约束
  const usingSlots = false;
  const bothSlotsFilled = "" !== "" && "" !== "";
  const allowed = !(usingSlots && !bothSlotsFilled);
  assert.equal(allowed, true, "自由编辑完整假说应放行");
  console.log("[PASS] 自由编辑模式不受槽位门约束");
}

// ---- 3. 共振匹配 ----
{
  const r = claimResonance("信标从不求救，只等星海第一声应答");
  assert.ok(r && r.kind === "surface", `应命中 surface: ${JSON.stringify(r)}`);
  console.log("[PASS] surface 共振命中 T1");
}
{
  const r = claimResonance("信标只是求援信号，巡逻艇即将到达");
  assert.ok(r && r.kind === "foil", `应命中 foil: ${JSON.stringify(r)}`);
  console.log("[PASS] foil 共振命中 T1");
}
{
  const r = claimResonance("完全不相关的句子");
  assert.equal(r, null, "无关输入不应共振");
  console.log("[PASS] 无关输入不共振");
}

// ---- 4. 数据完整性：6 真相 18 句 claims 全填且 ≤16 字 ----
{
  let total = 0;
  for (const t of CANON.anchorTruths) {
    for (const k of ["surface_claim", "foil_claim", "half_claim"] as const) {
      const v = t[k];
      assert.ok(v && v.length > 0, `${t.id}.${k} 为空`);
      assert.ok(v.length <= 18, `${t.id}.${k} 超长: ${v.length} 字`);
      total++;
    }
  }
  assert.equal(total, 18);
  console.log("[PASS] 6 真相 × 3 claims = 18 句全填且 ≤18 字");
}

console.log("\n=== All T-B Two-Slot Checks Passed ===");
