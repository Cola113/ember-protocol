import assert from "node:assert/strict";
import { CANON } from "@/lib/canon";
import {
  deriveNextStepHints,
  getUnlockedPlanetIds,
  buildIdleHint,
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
  assert.equal(hints[0].salienceWeight, 1.0);
  assert.equal(hints[0].status, "unknown");
  assert.match(hints[0].text, /冷启台地/);
  console.log("ok  初始开局推导 Helix-7 冷启台地引导 (salience 权重 1.0)");
}

// 2. Encountered State (T1: 1 proposition collected)
{
  const hints = deriveNextStepHints(["Helix.Beacon.Broadcasting"], []);
  assert.equal(hints.length, 1, "T1 encountered should yield missing antenna lead");
  assert.equal(hints[0].planetId, "helix-7");
  assert.equal(hints[0].priority, 2);
  assert.equal(hints[0].salienceWeight, 1.8);
  assert.equal(hints[0].status, "encountered");
  assert.match(hints[0].text, /偶极天线阵列或许有答案/);
  console.log("ok  T1 encountered 状态正确推导偶极天线阵列线索 (salience 权重 1.8)");
}

// 3. Suspected State (T1: both propositions collected)
{
  const hints = deriveNextStepHints(
    ["Helix.Beacon.Broadcasting", "Helix.Signal.Unassigned"],
    []
  );
  assert.equal(hints.length, 1, "T1 suspected should point to INDEX synthesis");
  assert.equal(hints[0].priority, 3);
  assert.equal(hints[0].salienceWeight, 2.2);
  assert.equal(hints[0].status, "suspected");
  assert.equal(hints[0].actionType, "index");
  assert.match(hints[0].text, /公证索引台/);
  console.log("ok  T1 suspected 状态高优先级指向公证索引台综合 (salience 权重 2.2)");
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
  assert.equal(kilnHint.salienceWeight, 1.0);
  assert.equal(orchardHint.salienceWeight, 1.0);
  assert.notEqual(kilnHint.text, orchardHint.text, "Parallel hints must be distinct sentences");
  console.log("ok  窑/果园并列：T1 破译后并排输出两句，不合成一句选边 (salience 权重 1.0)");
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
  assert.equal(hints[0].salienceWeight, 1.8);
  assert.equal(hints[0].status, "encountered");
  assert.match(hints[0].text, /玻璃果园深坑物镜/);
  console.log("ok  T2 跨星推进：持窑线索精准指引玻璃果园深坑读头 (salience 权重 1.8)");
}

// 6. Suspected State for T2 (both Kiln and Orchard collected)
{
  const hints = deriveNextStepHints(
    ["Helix.Beacon.Broadcasting", "Helix.Signal.Unassigned", "Kiln.Bus.Mutex", "Orchard.ROM.Exhaustion"],
    ["T1"]
  );
  assert.equal(hints.length, 1);
  assert.equal(hints[0].priority, 3);
  assert.equal(hints[0].salienceWeight, 2.2);
  assert.equal(hints[0].status, "suspected");
  assert.equal(hints[0].actionType, "index");
  console.log("ok  T2 suspected 跨星命题集齐提示前往 INDEX 综合 (salience 权重 2.2)");
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
  console.log("ok  咏井/针并列：T2 破译后并排输出两星探索线索 (salience 权重 1.0)");
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
  console.log("ok  髓/总账并列：T3 破译后并排输出两星探索线索 (salience 权重 1.0)");
}

// 9. Canon Unlock Graph: T4 believed -> Cinder Court (烬廷 Red Herring) unlocked in parallel with T5
{
  const unlocked = getUnlockedPlanetIds(["T1", "T2", "T3", "T4"]);
  assert.ok(unlocked.has("cinder-court"), "T4 must unlock cinder-court");

  const hints = deriveNextStepHints(
    [
      "Helix.Beacon.Broadcasting", "Helix.Signal.Unassigned",
      "Kiln.Bus.Mutex", "Orchard.ROM.Exhaustion",
      "Choir.Hymn.IsClock", "Needle.Pointer.Rebased",
      "Marrow.God.IsProcess", "Marrow.Bio.WriteBack"
    ],
    ["T1", "T2", "T3", "T4"]
  );
  assert.ok(hints.length >= 2, "Should include T5 ledger lead + cinder-court red herring lead");
  const cinderHint = hints.find((h) => h.planetId === "cinder-court");
  const ledgerHint = hints.find((h) => h.planetId === "ledger");
  assert.ok(cinderHint, "Must contain Cinder Court hint");
  assert.ok(ledgerHint, "Must contain Ledger hint");
  assert.match(cinderHint.text, /血色宴会厅/);
  console.log("ok  Canon 解锁图：T4 破译后完整派生烬廷 (Cinder Court) 探索线索");
}

// 10. Canon Unlock Graph: T5 believed -> Blind Sun & Black Interval unlocked in parallel
{
  const unlocked = getUnlockedPlanetIds(["T1", "T2", "T3", "T4", "T5"]);
  assert.ok(unlocked.has("blind-sun"), "T5 must unlock blind-sun");
  assert.ok(unlocked.has("black-interval"), "T5 must unlock black-interval");

  const hints = deriveNextStepHints(
    [
      "Helix.Beacon.Broadcasting", "Helix.Signal.Unassigned",
      "Kiln.Bus.Mutex", "Orchard.ROM.Exhaustion",
      "Choir.Hymn.IsClock", "Needle.Pointer.Rebased",
      "Marrow.God.IsProcess", "Marrow.Bio.WriteBack",
      "Ledger.Error.IsChecksum", "Ledger.Protocol.RecorderKey"
    ],
    ["T1", "T2", "T3", "T4", "T5"]
  );
  assert.ok(hints.length >= 2, "Should include Blind Sun and Black Interval hints in parallel");
  assert.ok(hints.some((h) => h.planetId === "blind-sun"), "Must contain Blind Sun hint");
  assert.ok(hints.some((h) => h.planetId === "black-interval"), "Must contain Black Interval hint");
  console.log("ok  Canon 解锁图：T5 破译后完整派生盲日 (Blind Sun) 与黑间隔并列线索");
}

// 11. Natural Idle & Empty State (Natural invocation without forceIdle when all truths believed)
{
  const hints = deriveNextStepHints(
    [],
    ["T1", "T2", "T3", "T4", "T5", "THidden"]
  );
  assert.equal(hints.length, 0, "When all truths are believed, deriveNextStepHints naturally returns empty array []");
  console.log("ok  终局巡航态：全真相破译后推导函数自然返回空数组 []");

  // Verify HUD level consumption
  const renderedHints = hints.length > 0 ? hints : [buildIdleHint()];
  assert.equal(renderedHints.length, 1);
  assert.equal(renderedHints[0].status, "idle");
  assert.equal(renderedHints[0].priority, 0);
  assert.equal(renderedHints[0].salienceWeight, 0);
  assert.match(renderedHints[0].text, /当前星域无待解悬念/);
  console.log("ok  HUD 空态自然渲染：推导空数组在自然调用链下正确呈现巡航文案 (priority 0)");
}

// 12. Explicit Idle Option Verification
{
  const forcedHints = deriveNextStepHints([], [], { forceIdle: true });
  assert.equal(forcedHints.length, 0);
  console.log("ok  显式空态选项：forceIdle 正确输出空数组 []");
}

// 13. Bible Lexicon Compliance & Forbidden Word Regression Tests
{
  const extractTexts = (target: any): string[] => {
    const list: string[] = [];
    const walk = (node: any) => {
      if (!node || typeof node !== "object") return;
      for (const val of Object.values(node)) {
        if (typeof val === "string") {
          list.push(val);
        } else if (typeof val === "object") {
          walk(val);
        }
      }
    };
    walk(target);
    return list;
  };

  const allTexts = extractTexts(NEXT_STEP_PROTOCOL_TABLE);
  assert.ok(allTexts.length > 20, `Protocol table should contain ample texts (found ${allTexts.length})`);

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

  // Check §3 Per-Planet Forbidden Words with complete planet mappings
  const truthPlanetMapping: Record<string, string[]> = {
    T1: ["helix-7"],
    T2: ["kiln", "glass-orchard"],
    T3: ["choir-well", "needle"],
    T4: ["marrow"],
    T5: ["ledger"],
    cinder_court: ["cinder-court"],
    blind_sun: ["blind-sun"],
    THidden: ["black-interval"]
  };

  let planetScanCount = 0;
  let planetStringsScanned = 0;

  for (const [truthKey, truthCfg] of Object.entries(NEXT_STEP_PROTOCOL_TABLE)) {
    const planetIds = truthPlanetMapping[truthKey];
    if (planetIds && planetIds.length > 0) {
      const texts = extractTexts(truthCfg);
      assert.ok(texts.length > 0, `Truth ${truthKey} must have texts to scan`);
      for (const t of texts) {
        planetStringsScanned++;
        for (const planetId of planetIds) {
          const forbiddenList = PLANET_FORBIDDEN_WORDS[planetId];
          assert.ok(forbiddenList && forbiddenList.length > 0, `Planet ${planetId} must have forbidden words list`);
          for (const forbidden of forbiddenList) {
            planetScanCount++;
            assert.ok(
              !t.includes(forbidden),
              `Surface text violates §3 ${planetId} forbidden word "${forbidden}": "${t}"`
            );
          }
        }
      }
    }
  }

  assert.ok(planetScanCount > 0, "Planet-specific forbidden word scans must execute and count > 0");
  assert.ok(planetStringsScanned >= 15, "Must scan all planet-specific strings");
  console.log(`ok  §3 本星专属禁词扫描通过 (真实执行 ${planetScanCount} 次分星禁词匹配，涵盖 ${planetStringsScanned} 句分星文本)`);

  // Check no true_compute_role leak in any text
  for (const text of allTexts) {
    for (const planet of CANON.planets) {
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
