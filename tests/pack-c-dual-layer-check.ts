import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { CANON_DIALOGUES, NPCDialogueTree } from "../lib/dialogues";
import {
  GLOBAL_FORBIDDEN_WORDS,
  PLANET_FORBIDDEN_WORDS,
} from "../lib/curator/next-step";

console.log("=== Running Pack C Dual-Layer & T4/THidden Claims Self-Check ===");

const ledger = JSON.parse(readFileSync(join(process.cwd(), "docs", "canon-ledger.json"), "utf-8"));

// 1. T4 and THidden Claims Validation
console.log("--- 1. Validating T4 & THidden Claims ---");
const t4 = ledger.anchor_truths.find((t: any) => t.id === "T4");
const tHidden = ledger.anchor_truths.find((t: any) => t.id === "THidden");

assert.ok(t4, "T4 must exist");
assert.ok(tHidden, "THidden must exist");

for (const t of [t4, tHidden]) {
  console.log(`Checking ${t.id} (${t.title}):`);
  console.log(`  surface_claim: "${t.surface_claim}" (len: ${t.surface_claim.length})`);
  console.log(`  foil_claim:    "${t.foil_claim}" (len: ${t.foil_claim.length})`);
  console.log(`  half_claim:    "${t.half_claim}" (len: ${t.half_claim.length})`);

  for (const field of ["surface_claim", "foil_claim", "half_claim"]) {
    const claim = t[field];
    assert.ok(claim && claim.length > 0, `${t.id} ${field} must not be empty`);
    assert.ok(
      claim.length >= 8 && claim.length <= 16,
      `${t.id} ${field} length must be 8-16 chars, got ${claim.length}: "${claim}"`
    );

    // Global forbidden check
    for (const word of GLOBAL_FORBIDDEN_WORDS) {
      assert.ok(
        !claim.includes(word),
        `${t.id} ${field} contains global forbidden word "${word}": "${claim}"`
      );
    }

    // Planet forbidden check
    const planetWords = PLANET_FORBIDDEN_WORDS[t.primary_planet] || [];
    for (const word of planetWords) {
      assert.ok(
        !claim.includes(word),
        `${t.id} ${field} contains planet forbidden word "${word}": "${claim}"`
      );
    }
  }
}
console.log("  [PASS] T4 & THidden all 6 claims satisfy length (8-16) and zero forbidden words.\n");

// 2. Pack C Dialogues Surface Layer Forbidden Words Check
console.log("--- 2. Validating Pack C Dialogues (Moira, Julian, Nova) ---");
const packCNpcs = [
  { id: "npc-moira", planet: "marrow" },
  { id: "npc-julian", planet: "cinder-court" },
  { id: "npc-nova", planet: "blind-sun" }
];

function getDialogueSpokenContent(tree: NPCDialogueTree): string {
  return tree.steps
    .map((s) => [
      s.text,
      s.speakerRole,
      s.hysteresisNote || "",
      ...(s.choices?.map((c) => c.text) || []),
    ])
    .flat()
    .join(" ");
}

for (const { id, planet } of packCNpcs) {
  const tree = CANON_DIALOGUES[id];
  assert.ok(tree, `Tree for ${id} must exist`);
  const planetWords = PLANET_FORBIDDEN_WORDS[planet] || [];

  for (let i = 0; i < tree.steps.length; i++) {
    const step = tree.steps[i];
    const textsToCheck = [step.text, ...(step.choices?.map(c => c.text) || [])];

    for (const text of textsToCheck) {
      // Check global forbidden words
      for (const word of GLOBAL_FORBIDDEN_WORDS) {
        assert.ok(
          !text.includes(word),
          `[FAIL] ${id} step ${i} contains global forbidden word "${word}": "${text}"`
        );
      }
      // Check planet forbidden words
      for (const word of planetWords) {
        assert.ok(
          !text.includes(word),
          `[FAIL] ${id} step ${i} contains planet forbidden word "${word}": "${text}"`
        );
      }
    }

    if (step.propositionReward) {
      const rewardCode = step.propositionReward.code;
      const rewardText = step.propositionReward.text;
      const expectedText = ledger.proposition_labels[rewardCode];
      console.log(`  Checking propositionReward ${rewardCode}: "${rewardText}" vs ledger: "${expectedText}"`);
      assert.strictEqual(
        rewardText,
        expectedText,
        `Reward text for ${rewardCode} should match proposition_labels in canon-ledger.json`
      );
    }
  }
  console.log(`  [PASS] ${id} (${planet}) dialogues are 100% clean of forbidden words.`);
}
console.log();

// 3. Codex Gate Semantic Leak Checks (P0-1, P0-2, P0-3, P0-4)
console.log("--- 3. Validating Codex Gate Semantic Leak Rules (P0-1 ~ P0-4) ---");

// P0-1: Marrow / T4 semantic leaks
const moiraSpoken = getDialogueSpokenContent(CANON_DIALOGUES["npc-moira"]);
const marrowLeaks = ["并未消亡", "并联", "印刻进地骨", "没有神只有"];
for (const leak of marrowLeaks) {
  assert.ok(
    !moiraSpoken.includes(leak),
    `[P0-1 LEAK] Moira spoken dialogue contains semantic leak: "${leak}"`
  );
}

// P0-2: Cinder Court / Julian leaks
const julianSpoken = getDialogueSpokenContent(CANON_DIALOGUES["npc-julian"]);
const julianLeaks = ["编造", "掩盖", "戏台", "提线木偶", "假象", "虚构"];
for (const leak of julianLeaks) {
  assert.ok(
    !julianSpoken.includes(leak),
    `[P0-2 LEAK] Julian spoken dialogue contains semantic leak: "${leak}"`
  );
}

// P0-3: Blind Sun / Nova leaks
const novaSpoken = getDialogueSpokenContent(CANON_DIALOGUES["npc-nova"]);
const novaLeaks = ["DO NOT COMPLETE THE SECOND CYCLE", "烧尽宇宙", "吞噬物理法则"];
for (const leak of novaLeaks) {
  assert.ok(
    !novaSpoken.includes(leak),
    `[P0-3 LEAK] Nova spoken dialogue contains semantic leak: "${leak}"`
  );
}

// P0-4: SurfaceStageView code scans
const stageViewSource = readFileSync(
  join(process.cwd(), "components", "ui", "SurfaceStageView.tsx"),
  "utf-8"
);

// P0-1 in StageView
assert.ok(!stageViewSource.includes("全星系的信徒并未消亡"), "[P0-1 LEAK in SurfaceStageView]");
assert.ok(!stageViewSource.includes("印刻进地骨"), "[P0-1 LEAK in SurfaceStageView]");

// P0-2 in StageView
assert.ok(!stageViewSource.includes("掩盖在帷幕之后"), "[P0-2 LEAK in SurfaceStageView]");

// P0-3 in StageView
assert.ok(!stageViewSource.includes("OUTPUT[CYCLE_1]"), "[P0-3 LEAK in SurfaceStageView]");

// P0-4 in StageView
// Verify Recorder-01..08 is not in surface modal (outside isDecoded)
const sarcophagusBlock = stageViewSource.slice(
  stageViewSource.indexOf('activeModal.id === "hs-sarcophagus"'),
  stageViewSource.indexOf('activeModal.id === "hs-vesper-mirror"')
);
const surfaceSarcophagus = sarcophagusBlock.split("{isDecoded &&")[0];
assert.ok(!surfaceSarcophagus.includes("RECORDER-0"), "[P0-4 LEAK] Surface sarcophagus contains RECORDER-0X");
assert.ok(!surfaceSarcophagus.includes("SOCKET_09"), "[P0-4 LEAK] Surface sarcophagus contains SOCKET_09");
assert.ok(!surfaceSarcophagus.includes("熔断"), "[P0-4 LEAK] Surface sarcophagus contains 熔断");

// Verify hotspot cards render human proposition labels
assert.ok(stageViewSource.includes("CANON.proposition_labels"), "[P0-4] Hotspot cards must use proposition_labels");

console.log("--- 5. Validating Round 2 Codex Gate Residual Leak Fixes ---");

// Check 5.1: next-step.ts HUD hint leak
const nextStepSource = readFileSync(join(process.cwd(), "lib", "curator", "next-step.ts"), "utf-8");
const protocolTablePart = nextStepSource.slice(nextStepSource.indexOf("NEXT_STEP_PROTOCOL_TABLE"));
assert.ok(!protocolTablePart.includes("并联"), "[Round 2 FAIL] NEXT_STEP_PROTOCOL_TABLE contains 并联 in HUD hint");
console.log("  [PASS] next-step.ts protocol table has zero '并联' in HUD hints.");

// Check 5.2: canon-ledger.json hotspot names
for (const planet of ledger.planets) {
  for (const site of planet.landing_sites) {
    for (const hs of site.hotspots) {
      assert.ok(
        !/Recorder-0\d/i.test(hs.name),
        `[Round 2 FAIL] canon-ledger hotspot "${hs.id}" has raw recorder name: "${hs.name}"`
      );
    }
  }
}
console.log("  [PASS] canon-ledger.json hotspots contain zero 'Recorder-0X' names.");

// Check 5.3: SurfaceStageView modal proposition boxes do not display raw IDs in surface view
const rawPropositionCodes = [
  "Marrow.God.IsProcess",
  "Marrow.Bio.WriteBack",
  "Cinder.Court.IsSandbox",
  "BlindSun.Prohibition.CycleTwo",
  "BlindSun.Director.Blindness",
  "Interval.Core.Recorder9",
  "Interval.Memory.Vesper",
  "Helix.Signal.Unassigned",
  "Helix.Beacon.Broadcasting",
  "Kiln.Bus.Mutex",
  "Orchard.ROM.Exhaustion",
  "Choir.Hymn.IsClock",
  "Ledger.Error.IsChecksum",
  "Ledger.Protocol.RecorderKey",
  "Needle.Pointer.Rebased"
];

// Check that inside the extracted proposition boxes, raw code strings are not hardcoded
for (const code of rawPropositionCodes) {
  // Modal surface block shouldn't have raw code string in text-sm / font-mono without being a map lookup
  assert.ok(
    !stageViewSource.includes(`<div className="text-holo-bright font-mono text-sm font-semibold">\n                      ${code}`),
    `[Round 2 FAIL] SurfaceStageView modal contains hardcoded raw proposition ID in surface view: ${code}`
  );
}
console.log("  [PASS] SurfaceStageView modals render human proposition labels instead of raw proposition IDs.");

// Check 5.4: ShipInteriorView logs gate and cryo identity
const shipInteriorSource = readFileSync(
  join(process.cwd(), "components", "ui", "ShipInteriorView.tsx"),
  "utf-8"
);
assert.ok(
  shipInteriorSource.includes("isDecoded || believedTruthsCount >= 5"),
  "[Round 2 FAIL] ShipInteriorView does not gate logs behind isDecoded / truths count"
);
assert.ok(
  shipInteriorSource.includes("【历代记录员日志 // 加密信道】"),
  "[Round 2 FAIL] ShipInteriorView missing encrypted channel fallback"
);
console.log("  [PASS] ShipInteriorView logs and cryo stations are properly gated and generalized.\n");

// 6. Round 3 Codex Gate Checks: Toast Copy & Voices Prompts Scrub
console.log("--- 6. Validating Round 3 Codex Gate Checks (P0-5 & P0-6) ---");

// Check 6.1: app/page.tsx toast copy scrub
const pageSource = readFileSync(join(process.cwd(), "app", "page.tsx"), "utf-8");
assert.ok(!pageSource.includes("计算节点已并联接入总线"), "[Round 3 FAIL] app/page.tsx contains un-gated machine toast");
assert.ok(!pageSource.includes("并联"), "[Round 3 FAIL] app/page.tsx contains '并联'");
console.log("  [PASS] app/page.tsx toast copy is 100% clean of machine words and '并联'.");

// Check 6.2: lib/voices/prompts.ts scrub
const promptsSource = readFileSync(join(process.cwd(), "lib", "voices", "prompts.ts"), "utf-8");
assert.ok(!promptsSource.includes("并联"), "[Round 3 FAIL] lib/voices/prompts.ts contains '并联'");
console.log("  [PASS] lib/voices/prompts.ts is 100% clean of '并联'.");

// Check 6.3: docs/canon-ledger.json Moira scrub & taboos
const moiraEntry = ledger.constitutions["marrow"]?.npc_roster?.find((npc: any) => npc.npc_id === "npc-moira");
assert.ok(moiraEntry, "Moira must exist in marrow constitution");
assert.ok(!moiraEntry.personality.includes("并联"), "[Round 3 FAIL] Moira personality contains '并联'");
assert.ok(moiraEntry.taboos.includes("并联"), "[Round 3 FAIL] Moira taboos must include '并联'");
console.log("  [PASS] docs/canon-ledger.json Moira personality is scrubbed and taboos include '并联'.");

// Check 6.4: lib/voices/pipeline.ts taboos check
const pipelineSource = readFileSync(join(process.cwd(), "lib", "voices", "pipeline.ts"), "utf-8");
assert.ok(pipelineSource.includes("violatesTaboos"), "[Round 3 FAIL] pipeline.ts must check taboos");
console.log("  [PASS] lib/voices/pipeline.ts checks NPC taboos.\n");

console.log("=== All Pack C Dual-Layer & Claims Checks (Rounds 1-3) Passed Successfully! ===");


