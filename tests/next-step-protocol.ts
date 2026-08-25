import assert from "node:assert/strict";
import { CANON } from "@/lib/canon";
import {
  deriveNextStepHints,
  NEXT_STEP_PROTOCOL_TABLE,
  GLOBAL_FORBIDDEN_WORDS,
  PLANET_FORBIDDEN_WORDS,
  type NextStepHint
} from "@/lib/curator/next-step";

console.log("=== Running Next-Step Protocol Self-Checks ===");

// 1. Initial State (Game start at Helix-7, 0 propositions, 0 truths)
{
  const hints = deriveNextStepHints([], []);
  assert.equal(hints.length, 1, "Game start should have 1 lead at Helix-7");
  assert.equal(hints[0].planetId, "helix-7");
  assert.equal(hints[0].priority, 1);
  assert.equal(hints[0].status, "unknown");
  assert.match(hints[0].text, /冷启台地/);
  console.log("ok  初始开局推导 Helix-7 冷启台地引导");
}

// 2. Encountered State (T1: 1 proposition collected)
{
  const hints = deriveNextStepHints(["Helix.Beacon.Broadcasting"], []);
  assert.equal(hints.length, 1, "T1 encountered should yield missing antenna lead");
  assert.equal(hints[0].planetId, "helix-7");
  assert.equal(hints[0].priority, 2);
  assert.equal(hints[0].status, "encountered");
  assert.match(hints[0].text, /偶极天线阵列或许有答案/);
  console.log("ok  T1 encountered 状态正确推导偶极天线阵列线索");
}

// 3. Suspected State (T1: both propositions collected)
{
  const hints = deriveNextStepHints(
    ["Helix.Beacon.Broadcasting", "Helix.Signal.Unassigned"],
    []
  );
  assert.equal(hints.length, 1, "T1 suspected should point to INDEX synthesis");
  assert.equal(hints[0].priority, 3);
  assert.equal(hints[0].status, "suspected");
  assert.equal(hints[0].actionType, "index");
  assert.match(hints[0].text, /公证索引台/);
  console.log("ok  T1 suspected 状态高优先级指向公证索引台综合");
}

// 4. Parallel Unlocked State (T1 believed -> Kiln & Glass Orchard unlocked in parallel!)
{
  const hints = deriveNextStepHints(
    ["Helix.Beacon.Broadcasting", "Helix.Signal.Unassigned"],
    ["T1"]
  );
  assert.equal(hints.length, 2, "T1 believed should produce 2 parallel hints for Kiln & Glass Orchard");
  const kilnHint = hints.find((h) => h.planetId === "kiln");
  const orchardHint = hints.find((h) => h.planetId === "glass-orchard");
  assert.ok(kilnHint, "Must contain Kiln hint");
  assert.ok(orchardHint, "Must contain Glass Orchard hint");
  assert.equal(kilnHint.priority, 1);
  assert.equal(orchardHint.priority, 1);
  assert.notEqual(kilnHint.text, orchardHint.text, "Parallel hints must be distinct sentences");
  console.log("ok  窑/果园并列：T1 破译后并排输出两句，不合成一句选边");
}

// 5. Encountered State across companion planets (T2: collected Kiln proposition, missing Orchard)
{
  const hints = deriveNextStepHints(
    ["Helix.Beacon.Broadcasting", "Helix.Signal.Unassigned", "Kiln.Bus.Mutex"],
    ["T1"]
  );
  assert.equal(hints.length, 1);
  assert.equal(hints[0].planetId, "glass-orchard");
  assert.equal(hints[0].priority, 2);
  assert.equal(hints[0].status, "encountered");
  assert.match(hints[0].text, /玻璃果园深坑物镜/);
  console.log("ok  T2 跨星推进：持窑线索精准指引玻璃果园深坑读头");
}

// 6. Suspected State for T2 (both Kiln and Orchard collected)
{
  const hints = deriveNextStepHints(
    ["Helix.Beacon.Broadcasting", "Helix.Signal.Unassigned", "Kiln.Bus.Mutex", "Orchard.ROM.Exhaustion"],
    ["T1"]
  );
  assert.equal(hints.length, 1);
  assert.equal(hints[0].priority, 3);
  assert.equal(hints[0].status, "suspected");
  assert.equal(hints[0].actionType, "index");
  console.log("ok  T2 suspected 跨星命题集齐提示前往 INDEX 综合");
}

// 7. Parallel Unlocked State (T2 believed -> Choir-Well & Needle unlocked in parallel!)
{
  const hints = deriveNextStepHints(
    ["Helix.Beacon.Broadcasting", "Helix.Signal.Unassigned", "Kiln.Bus.Mutex", "Orchard.ROM.Exhaustion"],
    ["T1", "T2"]
  );
  assert.equal(hints.length, 2, "T2 believed should produce 2 parallel hints for Choir-Well & Needle");
  assert.ok(hints.some((h) => h.planetId === "choir-well"));
  assert.ok(hints.some((h) => h.planetId === "needle"));
  console.log("ok  咏井/针并列：T2 破译后并排输出两星探索线索");
}

// 8. Parallel Unlocked State (T3 believed -> Marrow & Ledger unlocked in parallel!)
{
  const hints = deriveNextStepHints(
    [
      "Helix.Beacon.Broadcasting", "Helix.Signal.Unassigned",
      "Kiln.Bus.Mutex", "Orchard.ROM.Exhaustion",
      "Choir.Hymn.IsClock", "Needle.Pointer.Rebased"
    ],
    ["T1", "T2", "T3"]
  );
  assert.equal(hints.length, 2, "T3 believed should produce 2 parallel hints for Marrow & Ledger");
  assert.ok(hints.some((h) => h.planetId === "marrow"));
  assert.ok(hints.some((h) => h.planetId === "ledger"));
  console.log("ok  髓/总账并列：T3 破译后并排输出两星探索线索");
}

// 9. Ending State (All 6 truths believed)
{
  const hints = deriveNextStepHints(
    [],
    ["T1", "T2", "T3", "T4", "T5", "THidden"]
  );
  assert.equal(hints.length, 1);
  assert.equal(hints[0].status, "ending");
  assert.equal(hints[0].priority, 4);
  assert.match(hints[0].text, /全域终局决议协议/);
  console.log("ok  终局态：全真相锚定后提示决议协议");
}

// 10. Bible Lexicon Compliance & Forbidden Word Regression Tests
{
  const allTexts: string[] = [];

  const collectTexts = (obj: any) => {
    if (!obj || typeof obj !== "object") return;
    for (const val of Object.values(obj)) {
      if (typeof val === "string") {
        allTexts.push(val);
      } else if (typeof val === "object") {
        collectTexts(val);
      }
    }
  };

  collectTexts(NEXT_STEP_PROTOCOL_TABLE);

  // Check §2 Global Forbidden Words
  for (const text of allTexts) {
    for (const forbidden of GLOBAL_FORBIDDEN_WORDS) {
      assert.ok(
        !text.includes(forbidden),
        `Surface text violates §2 global forbidden word "${forbidden}": "${text}"`
      );
    }
  }
  console.log(`ok  §2 全局禁词扫描通过 (${GLOBAL_FORBIDDEN_WORDS.length} 禁词 x ${allTexts.length} 协议文本)`);

  // Check §3 Per-Planet Forbidden Words
  for (const [truthKey, truthCfg] of Object.entries(NEXT_STEP_PROTOCOL_TABLE)) {
    let planetId: string | undefined;
    if (truthKey === "T1") planetId = "helix-7";
    else if (truthKey === "T4") planetId = "marrow";
    else if (truthKey === "T5") planetId = "ledger";
    else if (truthKey === "THidden") planetId = "black-interval";

    if (planetId && PLANET_FORBIDDEN_WORDS[planetId]) {
      const texts: string[] = [];
      collectTexts(truthCfg);
      for (const t of texts) {
        for (const forbidden of PLANET_FORBIDDEN_WORDS[planetId]) {
          assert.ok(
            !t.includes(forbidden),
            `Surface text violates §3 ${planetId} forbidden word "${forbidden}": "${t}"`
          );
        }
      }
    }
  }
  console.log("ok  §3 本星专属禁词扫描通过 (全星表无泄漏)");

  // Check no true_compute_role leak in any text
  for (const text of allTexts) {
    for (const planet of CANON.planets) {
      const role = planet.true_compute_role.toLowerCase();
      // Check if text directly contains raw technical parts of true_compute_role
      const forbiddenMachineTokens = [
        "bootstrap", "bios", "rom", "mutex", "power distribution",
        "oscillator", "clock", "checksum", "stack pointer", "tensor",
        "wetware", "hypervisor", "null address", "parity socket"
      ];
      for (const token of forbiddenMachineTokens) {
        assert.ok(
          !text.toLowerCase().includes(token),
          `Machine role token "${token}" leaked in surface text: "${text}"`
        );
      }
    }
  }
  console.log("ok  机器层职能与技术黑话隐蔽测试 (Canon-Leak 闸全绿)");
}

console.log("=== All Next-Step Protocol Self-Checks Passed ===");
