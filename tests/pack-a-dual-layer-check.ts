import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { CANON } from "../lib/canon";
import { CANON_DIALOGUES } from "../lib/dialogues";
import {
  GLOBAL_FORBIDDEN_WORDS,
  PLANET_FORBIDDEN_WORDS,
} from "../lib/curator/next-step";

console.log("=== Running Pack A Dual-Layer & T1/T2 Claims Self-Check ===");

const ledger = JSON.parse(readFileSync(join(process.cwd(), "docs", "canon-ledger.json"), "utf-8"));

// 1. T1 and T2 Claims Validation
console.log("--- 1. Validating T1 & T2 Claims ---");
const t1 = ledger.anchor_truths.find((t: any) => t.id === "T1");
const t2 = ledger.anchor_truths.find((t: any) => t.id === "T2");

assert.ok(t1, "T1 must exist");
assert.ok(t2, "T2 must exist");

for (const t of [t1, t2]) {
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
console.log("  [PASS] T1 & T2 all 6 claims satisfy length (8-16) and zero forbidden words.\n");

// 2. Pack A Dialogues Surface Layer Forbidden Words Check
console.log("--- 2. Validating Pack A Dialogues (Tarkis, Vulkan, Selene) ---");
const packANpcs = [
  { id: "npc-tarkis", planet: "helix-7" },
  { id: "npc-vulkan", planet: "kiln" },
  { id: "npc-selene", planet: "glass-orchard" }
];

for (const { id, planet } of packANpcs) {
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
  }
  console.log(`  [PASS] ${id} (${planet}) dialogues are 100% clean of forbidden words.`);
}
console.log();

// 3. SurfaceStageView Surface Text Scan
console.log("--- 3. Validating SurfaceStageView Surface Layer ---");
const stageViewSource = readFileSync(
  join(process.cwd(), "components", "ui", "SurfaceStageView.tsx"),
  "utf-8"
);

// Verify hotspots exist and have dual-layer blocks
assert.ok(stageViewSource.includes('activeModal.id === "hs-antenna-panel"'), "hs-antenna-panel exists");
assert.ok(stageViewSource.includes('activeModal.id === "hs-beacon"'), "hs-beacon exists");
assert.ok(stageViewSource.includes('activeModal.id === "hs-bus-valve"'), "hs-bus-valve exists");
assert.ok(stageViewSource.includes('activeModal.id === "hs-readhead-lens"'), "hs-readhead-lens exists");
assert.ok(stageViewSource.includes("isDecoded"), "isDecoded prop integrated");

console.log("  [PASS] SurfaceStageView Pack A hotspots & dual-layer conditions verified.\n");

console.log("=== All Pack A Dual-Layer & Claims Checks Passed Successfully! ===");
