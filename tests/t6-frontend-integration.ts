import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { CANON, CANON_READ } from "../lib/canon";
import { CANON_DIALOGUES } from "../lib/dialogues";
import {
  clientVoicesChat,
  clientScribeGenerate,
  clientCuratorSynthesize,
  ClientChatMessage
} from "../lib/api-client";
import {
  VoicesOutputSchema,
  VoicesResultSchema,
  VoicesHardRejectSchema,
  validateVoicesInput,
  VOICES_GENERIC_FALLBACK
} from "../lib/schemas/voices";
import {
  DossierSchema,
  ScribeGenerateResponseSchema,
  scribeDegradedResponse
} from "../lib/schemas/scribe";
import {
  CuratorResponseSchema,
  SynthesisResultSchema,
  curatorDegradedResult,
  hardGateResult
} from "../lib/schemas/curator";

// Load golden test fixtures
const FIXTURES_DIR = join(process.cwd(), "tests", "fixtures");

function loadFixture(filename: string) {
  return JSON.parse(readFileSync(join(FIXTURES_DIR, filename), "utf-8"));
}

async function runT6IntegrationTests() {
  console.log("=================================================");
  console.log("  T6 FRONTEND INTEGRATION & CONTRACT SUITE");
  console.log("=================================================\n");

  let passedAssertions = 0;

  // 1. Gold Fixture Validation
  console.log("--- 1. Validating Golden Fixtures Against Zod Schemas ---");
  const voicesValid = loadFixture("p2-voices-valid.json");
  const voicesParsed = VoicesOutputSchema.safeParse(voicesValid);
  assert.equal(voicesParsed.success, true, "p2-voices-valid.json must conform to VoicesOutputSchema");
  passedAssertions++;

  const dossierValid = loadFixture("p2-dossier-valid.json");
  const dossierParsed = DossierSchema.safeParse(dossierValid);
  assert.equal(dossierParsed.success, true, "p2-dossier-valid.json must conform to DossierSchema");
  passedAssertions++;

  const synthesisValid = loadFixture("p2-synthesis.json");
  assert.equal(SynthesisResultSchema.safeParse(synthesisValid.passed).success, true, "synthesis.passed must parse");
  assert.equal(SynthesisResultSchema.safeParse(synthesisValid.partial).success, true, "synthesis.partial must parse");
  assert.equal(SynthesisResultSchema.safeParse(synthesisValid.failed).success, true, "synthesis.failed must parse");
  assert.equal(CuratorResponseSchema.safeParse(synthesisValid.hard_gate_rejected).success, true, "synthesis.hard_gate_rejected must parse");
  passedAssertions += 4;

  const degradedValid = loadFixture("p2-degraded-responses.json");
  assert.equal(ScribeGenerateResponseSchema.safeParse(degradedValid.scribe).success, true, "degraded scribe must parse");
  assert.equal(CuratorResponseSchema.safeParse(degradedValid.curator).success, true, "degraded curator must parse");
  passedAssertions += 2;
  console.log("  [PASS] All golden fixtures match v1.1 schemas.\n");

  // 2. Voices Frontend API Client Tests
  console.log("--- 2. Testing Voices Client & Fallback Degradation ---");
  {
    // Test offline / fetch failure fallback for Tarkis
    const fallbackTarkis = await clientVoicesChat({
      npcId: "npc-tarkis",
      messages: [{ role: "user", content: "信标从何而来？" }],
      planetId: "helix-7",
      slot: "auto"
    });
    assert.equal(fallbackTarkis.ok, false);
    assert.equal(fallbackTarkis.degraded, true);
    assert.ok(fallbackTarkis.output.say.length > 0, "Fallback output must have dialogue text");
    assert.ok(fallbackTarkis.source === "fallback_tree" || fallbackTarkis.source === "generic_fallback");
    passedAssertions += 2;

    // Test unknown NPC fallback
    const fallbackUnknown = await clientVoicesChat({
      npcId: "npc-nonexistent",
      messages: [{ role: "user", content: "Hello" }],
      planetId: "helix-7",
      slot: "auto"
    });
    assert.equal(fallbackUnknown.degraded, true);
    assert.equal(fallbackUnknown.output.say, VOICES_GENERIC_FALLBACK.say);
    passedAssertions += 2;
  }
  console.log("  [PASS] Voices client offline fallback and generic fallback verified.\n");

  // 3. Scribe Frontend API Client Tests
  console.log("--- 3. Testing Scribe Client & Offline Dossier Fallback ---");
  {
    const scribeRes = await clientScribeGenerate({
      planetId: "helix-7",
      landingSiteId: "site-helix-coldboot"
    });
    assert.equal(scribeRes.degraded, true, "Offline scribe generate must report degraded");
    assert.ok(scribeRes.dossier, "Dossier must be returned even when offline/degraded");
    assert.ok(scribeRes.dossier.title.length > 0, "Dossier title must exist");
    assert.ok(scribeRes.dossier.summary.length > 0, "Dossier summary must exist");
    passedAssertions += 4;
  }
  console.log("  [PASS] Scribe client offline fallback template verified.\n");

  // 4. Curator Frontend API Client Tests & Hard Gate Protection
  console.log("--- 4. Testing Curator Client, Hard Gates & Deterministic Scoring ---");
  {
    // Test hard gate missing proposition rejection
    const hardGateRes = await clientCuratorSynthesize({
      truthId: "T1",
      hypothesisText: "信标由古文明建造。",
      pinnedPropositions: [], // Missing required propositions
      slot: "auto"
    });
    assert.equal(hardGateRes.ok, false, "Missing props must fail synthesis");
    assert.equal(hardGateRes.verdict, "failed");
    assert.equal(hardGateRes.status, "rejected");
    assert.ok(
      hardGateRes.missingRequiredPropositions && hardGateRes.missingRequiredPropositions.length > 0,
      "Missing required propositions list must be provided"
    );
    passedAssertions += 4;

    // Test valid proposition set with keywords matching heuristic
    const anchorT1 = CANON_READ.getAnchorTruth("T1");
    assert.ok(anchorT1, "T1 must exist in canon");
    const passedRes = await clientCuratorSynthesize({
      truthId: "T1",
      hypothesisText: "信标是引导扇区的握手载波，400年未收到应答因此持续广播。",
      pinnedPropositions: anchorT1.required_propositions,
      slot: "auto"
    });
    assert.equal(passedRes.verdict, "passed");
    assert.ok(passedRes.coverage > 0.8, "Coverage score must be high");
    assert.ok(passedRes.correctness > 0.8, "Correctness score must be high");
    passedAssertions += 4;
  }
  console.log("  [PASS] Curator hard gate rejection and canonical keyword synthesis verified.\n");

  // 5. Canon Read and Dialogue Consistency
  console.log("--- 5. Verifying Dialogue Trees and Anchor Truths ---");
  {
    for (const truth of CANON.anchorTruths) {
      assert.ok(truth.id, "Truth must have id");
      assert.ok(truth.required_propositions.length > 0, `Truth ${truth.id} must have required propositions`);
      passedAssertions++;
    }

    assert.ok(CANON_DIALOGUES["npc-tarkis"], "npc-tarkis dialogue tree must exist");
    assert.ok(CANON_DIALOGUES["npc-selene"], "npc-selene dialogue tree must exist");
    assert.ok(CANON_DIALOGUES["npc-orpheus"], "npc-orpheus dialogue tree must exist");
    passedAssertions += 3;
  }
  console.log("  [PASS] Canon dialogue trees and anchor truths consistency checked.\n");

  console.log("=================================================");
  console.log(`  ALL ${passedAssertions} T6 FRONTEND INTEGRATION ASSERTIONS PASSED`);
  console.log("=================================================");
}

runT6IntegrationTests().catch((err) => {
  console.error("T6 Integration Test Suite Failed:", err);
  process.exit(1);
});
