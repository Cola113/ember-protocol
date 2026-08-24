import canonLedger from "../docs/canon-ledger.json";
import { ConstitutionSchema, validateConstitution } from "../lib/schemas/constitution";
import { requireConstitution } from "../lib/canon";

const expectedPlanetIds = [
  "helix-7",
  "kiln",
  "glass-orchard",
  "choir-well",
  "ledger",
  "needle",
  "marrow",
  "cinder-court",
  "blind-sun"
];

console.log("=== Validating Constitutions in canon-ledger.json ===");

const constitutions = (canonLedger as any).constitutions;
if (!constitutions || typeof constitutions !== "object") {
  console.error("FAIL: constitutions field missing or not an object");
  process.exit(1);
}

let passCount = 0;

for (const planetId of expectedPlanetIds) {
  const constitution = constitutions[planetId];
  if (!constitution) {
    console.error(`FAIL: Missing constitution for planet '${planetId}'`);
    process.exit(1);
  }

  // 1. Zod schema parse
  const parseResult = ConstitutionSchema.safeParse(constitution);
  if (!parseResult.success) {
    console.error(`FAIL: Schema validation failed for '${planetId}':`, parseResult.error.issues);
    process.exit(1);
  }

  // 2. validateConstitution helper
  const validationHelper = validateConstitution(constitution);
  if (!validationHelper.ok) {
    console.error(`FAIL: validateConstitution returned not ok for '${planetId}':`, validationHelper);
    process.exit(1);
  }

  // 3. requireConstitution helper from lib/canon
  const reqResult = requireConstitution(planetId);
  if (!reqResult.ok) {
    console.error(`FAIL: requireConstitution failed for '${planetId}'`);
    process.exit(1);
  }

  // 4. Substring check: forbidden_claims must not be substrings of true_facts or believed_facts or vocabulary
  for (const claim of constitution.forbidden_claims) {
    const claimLower = claim.toLowerCase().trim();
    for (const tf of constitution.true_facts) {
      if (tf.toLowerCase().includes(claimLower)) {
        console.error(`FAIL: forbidden_claim '${claim}' found in true_facts of '${planetId}': '${tf}'`);
        process.exit(1);
      }
    }
    for (const bf of constitution.believed_facts) {
      if (bf.toLowerCase().includes(claimLower)) {
        console.error(`FAIL: forbidden_claim '${claim}' found in believed_facts of '${planetId}': '${bf}'`);
        process.exit(1);
      }
    }
    for (const voc of constitution.vocabulary) {
      if (voc.toLowerCase().includes(claimLower)) {
        console.error(`FAIL: forbidden_claim '${claim}' found in vocabulary of '${planetId}': '${voc}'`);
        process.exit(1);
      }
    }
  }

  // 5. Check anchor NPC alignment & deep field consistency
  const planetDef = canonLedger.planets.find((p: any) => p.id === planetId);
  if (planetDef && planetDef.anchor_npc) {
    const anchorInRoster = constitution.npc_roster.find((npc: any) => npc.npc_id === planetDef.anchor_npc.id);
    if (!anchorInRoster) {
      console.error(`FAIL: Anchor NPC '${planetDef.anchor_npc.id}' not found in npc_roster for '${planetId}'`);
      process.exit(1);
    }

    // Check taboos consistency between planets[].anchor_npc and constitution.npc_roster
    const canonTaboos = JSON.stringify([...planetDef.anchor_npc.taboos].sort());
    const rosterTaboos = JSON.stringify([...anchorInRoster.taboos].sort());
    if (canonTaboos !== rosterTaboos) {
      console.error(`FAIL: Taboos mismatch for '${planetDef.anchor_npc.id}' in '${planetId}': canon=${canonTaboos} vs roster=${rosterTaboos}`);
      process.exit(1);
    }

    // Check speech_register consistency
    if (planetDef.anchor_npc.speech_register !== anchorInRoster.speech_register) {
      console.error(`FAIL: Speech register mismatch for '${planetDef.anchor_npc.id}' in '${planetId}': canon=${planetDef.anchor_npc.speech_register} vs roster=${anchorInRoster.speech_register}`);
      process.exit(1);
    }
  }

  console.log(`[PASS] ${planetId} -> ${constitution.display_name} (NPCs: ${constitution.npc_roster.length}, Insights: ${constitution.insight_gates.length})`);
  passCount++;
}

console.log(`\nALL ${passCount}/${expectedPlanetIds.length} PLANET CONSTITUTIONS PASSED VALIDATION!`);
