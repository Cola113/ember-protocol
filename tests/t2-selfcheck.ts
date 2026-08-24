import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { JSONParseError, NoObjectGeneratedError, TypeValidationError } from "ai";
import { mapAiSdkError, pingAi, readAiConfig } from "@/lib/ai/provider";
import {
  cacheHitResponse,
  createMemoryDataStore,
  isDossierCacheable,
  isGeneratedDossierCacheable,
  MemoryKv
} from "@/lib/datastore";
import { scribeDegradedResponse, type ScribeGenerateResponse } from "@/lib/schemas/scribe";
import { createKvBackend } from "@/lib/storage/backend";

const here = dirname(fileURLToPath(import.meta.url));

function loadJson(name: string): unknown {
  return JSON.parse(readFileSync(join(here, "fixtures", name), "utf8"));
}

function assert(condition: unknown, message: string): void {
  if (!condition) throw new Error(message);
}

export async function runT2Selfcheck(): Promise<{ ok: true; checks: string[] }> {
  const checks: string[] = [];
  const store = createMemoryDataStore();
  const validDossier = loadJson("p2-dossier-valid.json") as {
    planet_id: string;
    landing_site_id: string;
    title: string;
  };
  const degradedFixture = (loadJson("p2-degraded-responses.json") as { scribe: unknown }).scribe;

  assert(isGeneratedDossierCacheable(degradedFixture) === false, "degraded fixture must not be cacheable");
  assert(isDossierCacheable(degradedFixture) === false, "isDossierCacheable alias rejects degraded");
  assert(isGeneratedDossierCacheable(validDossier) === false, "bare dossier is not a generated envelope");
  checks.push("degraded fixture cacheable:false");

  const template = scribeDegradedResponse("selfcheck", {
    planet_id: validDossier.planet_id,
    landing_site_id: validDossier.landing_site_id
  });
  const rejected = await store.dossierCache.putGenerated(
    validDossier.planet_id,
    validDossier.landing_site_id,
    template
  );
  assert(rejected.ok === false && rejected.error.error === "validation_error", "template put is validation_error");
  assert((await store.dossierCache.get(validDossier.planet_id, validDossier.landing_site_id)) === null, "template not stored");
  checks.push("template dossier refused by dossier_cache");

  const rawRejected = await store.dossierCache.putGenerated(
    validDossier.planet_id,
    validDossier.landing_site_id,
    validDossier as unknown as ScribeGenerateResponse
  );
  assert(rawRejected.ok === false && rawRejected.error.error === "validation_error", "bare dossier put is validation_error");
  assert((await store.dossierCache.get(validDossier.planet_id, validDossier.landing_site_id)) === null, "bare dossier not stored");
  checks.push("bare dossier refused by dossier_cache");

  const generated = {
    contract_version: "v1.1" as const,
    status: "generated" as const,
    cached: false as const,
    dossier: validDossier as typeof template.dossier
  };
  assert(isGeneratedDossierCacheable(generated), "generated envelope is cacheable");
  const stored = await store.dossierCache.putGenerated(
    validDossier.planet_id,
    validDossier.landing_site_id,
    generated
  );
  assert(stored.ok && stored.data.stored && !stored.data.alreadyPresent, "first generated put stores");
  const hit = await store.dossierCache.get(validDossier.planet_id, validDossier.landing_site_id);
  assert(hit?.planet_id === validDossier.planet_id, "get returns cached dossier");
  const second = await store.dossierCache.putGenerated(
    validDossier.planet_id,
    validDossier.landing_site_id,
    generated
  );
  assert(second.ok && second.data.alreadyPresent, "write-once does not overwrite");
  const envelope = cacheHitResponse(hit!);
  assert(envelope.status === "cache_hit" && envelope.cached === true, "cache_hit envelope");
  checks.push("generated dossier write-once + cache_hit helper");

  const raceSite = "site-t2-putifabsent";
  const raceA = {
    ...generated,
    dossier: { ...generated.dossier, landing_site_id: raceSite, title: "A-first" }
  };
  const raceB = {
    ...generated,
    dossier: { ...generated.dossier, landing_site_id: raceSite, title: "B-second" }
  };
  const [firstRace, secondRace] = await Promise.all([
    store.dossierCache.putGenerated(validDossier.planet_id, raceSite, raceA),
    store.dossierCache.putGenerated(validDossier.planet_id, raceSite, raceB)
  ]);
  const winners = [firstRace, secondRace].filter((result) => result.ok && result.data.stored);
  const held = [firstRace, secondRace].filter((result) => result.ok && result.data.alreadyPresent);
  assert(winners.length === 1 && held.length === 1, "putIfAbsent admits exactly one concurrent writer");
  const raced = await store.dossierCache.get(validDossier.planet_id, raceSite);
  const winner = winners[0];
  assert(winner && winner.ok && raced?.title === winner.data.dossier.title, "loser does not overwrite winner");
  assert(raced?.title === "A-first" || raced?.title === "B-second", "stored title is one of the racers");
  checks.push("putIfAbsent atomic under concurrent putGenerated");

  const kv = new MemoryKv();
  const inserted = await kv.putIfAbsent("k", "v1");
  const skipped = await kv.putIfAbsent("k", "v2");
  assert(inserted === true && skipped === false && (await kv.get("k")) === "v1", "MemoryKv putIfAbsent does not overwrite");
  const ls = createKvBackend("localStorage");
  if (ls.kind === "memory") {
    checks.push("putIfAbsent backend primitive (memory; no window)");
  } else {
    await ls.clear();
    assert((await ls.putIfAbsent("cas", "one")) === true, "localStorage first putIfAbsent");
    assert((await ls.putIfAbsent("cas", "two")) === false, "localStorage second putIfAbsent");
    assert((await ls.get("cas")) === "one", "localStorage putIfAbsent keeps first");
    await ls.clear();
    checks.push("putIfAbsent backend primitive (localStorage)");
  }

  const npc = await store.npcCache.appendTurn("auto", "npc-tarkis", {
    role: "user",
    content: "你记得那座信标吗？",
    at: Date.now()
  });
  assert(npc.ok && npc.data.turns.length === 1 && npc.data.slot_id === "auto", "npc_cache appendTurn");
  checks.push("npc_cache roundtrip");

  await store.npcCache.appendTurn("slot_1", "npc-tarkis", {
    role: "user",
    content: "slot-one",
    at: Date.now()
  });
  await store.npcCache.appendTurn("slot_2", "npc-tarkis", {
    role: "user",
    content: "slot-two",
    at: Date.now()
  });
  const slot1Npc = await store.npcCache.get("slot_1", "npc-tarkis");
  const slot2Npc = await store.npcCache.get("slot_2", "npc-tarkis");
  assert(slot1Npc?.turns[0]?.content === "slot-one", "slot_1 npc memory isolated");
  assert(slot2Npc?.turns[0]?.content === "slot-two", "slot_2 npc memory isolated");
  assert((await store.npcCache.get("auto", "npc-tarkis"))?.turns[0]?.content !== "slot-one", "auto slot not polluted");
  checks.push("npc_cache slot isolation");

  const player = await store.playerState.addProposition("auto", "Helix.Beacon.Broadcasting");
  assert(player.ok && player.data.collectedPropositions.includes("Helix.Beacon.Broadcasting"), "player_state proposition");
  const believed = await store.playerState.markBelieved("auto", "T1");
  if (!believed.ok) throw new Error("player_state markBelieved failed");
  assert(believed.data.believedTruths.includes("T1"), "player_state markBelieved");
  assert(believed.data.truthStates.T1 === "believed", "truthStates follows believedTruths");
  const downgrade = await store.playerState.setTruthStatus("auto", "T1", "suspected");
  assert(downgrade.ok === false && downgrade.error.error === "validation_error", "believed cannot downgrade");
  const stripped = await store.playerState.save({ slotId: "auto", believedTruths: [] });
  assert(stripped.ok === false && stripped.error.error === "validation_error", "save cannot delete believed");
  const stillBelieved = await store.playerState.load("auto");
  assert(stillBelieved?.believedTruths.includes("T1") && stillBelieved.truthStates.T1 === "believed", "believed survives rejected strip");
  checks.push("player_state write-through + no believed delete/downgrade");

  const attempt = await store.synthesisAttempts.record({
    slotId: "auto",
    truthId: "T1",
    hypothesisText: "信标是握手载波。",
    pinnedPropositions: ["Helix.Beacon.Broadcasting"],
    result: {
      verdict: "partial",
      coverage: 0,
      correctness: 0,
      coherence: 0,
      feedback: "selfcheck"
    },
    degraded: true
  });
  assert(attempt.ok && (await store.synthesisAttempts.list("auto", 1))[0]?.truthId === "T1", "synthesis_attempts ring");
  await store.synthesisAttempts.record({
    slotId: "slot_1",
    truthId: "T1",
    hypothesisText: "slot one only",
    pinnedPropositions: [],
    result: attempt.ok ? attempt.data.result : {
      verdict: "failed",
      coverage: 0,
      correctness: 0,
      coherence: 0,
      feedback: "x"
    },
    degraded: false
  });
  const autoAttempts = await store.synthesisAttempts.list("auto");
  const slot1Attempts = await store.synthesisAttempts.list("slot_1");
  assert(autoAttempts.every((record) => record.slotId === "auto"), "auto synthesis list is slot-scoped");
  assert(slot1Attempts.length === 1 && slot1Attempts[0]?.hypothesisText === "slot one only", "slot_1 synthesis isolated");
  checks.push("synthesis_attempts slot isolation");

  const isolated = readAiConfig({
    AI_SDK_PROVIDER: "google",
    GEMINI_API_KEY: "not-a-real-key",
    OPENAI_MODEL: "gpt-wrong",
    OPENAI_BASE_URL: "https://wrong.example/v1",
    GEMINI_MODEL: "gemini-2.0-flash"
  } as unknown as NodeJS.ProcessEnv);
  assert(isolated.provider === "google", "provider stays google");
  assert(isolated.modelId === "gemini-2.0-flash", "OPENAI_MODEL does not leak into google");
  assert(isolated.baseUrl === "https://generativelanguage.googleapis.com/v1beta", "OPENAI_BASE_URL does not leak into google");
  const genericOverride = readAiConfig({
    AI_SDK_PROVIDER: "google",
    GEMINI_API_KEY: "not-a-real-key",
    AI_SDK_MODEL: "gemini-custom",
    AI_SDK_BASE_URL: "https://generativelanguage.googleapis.com/v1beta",
    OPENAI_MODEL: "gpt-wrong"
  } as unknown as NodeJS.ProcessEnv);
  assert(genericOverride.modelId === "gemini-custom", "AI_SDK_MODEL may override selected provider");
  checks.push("provider env isolation");

  const schemaError = mapAiSdkError(new NoObjectGeneratedError({ message: "object did not match schema" }));
  assert(schemaError.error === "validation_error" && schemaError.degraded === false, "NoObjectGeneratedError → validation_error");
  const jsonError = mapAiSdkError(new JSONParseError({ text: "{", cause: new Error("bad json") }));
  assert(jsonError.error === "validation_error", "JSONParseError → validation_error");
  const typeError = mapAiSdkError(new TypeValidationError({ value: {}, cause: new Error("zod") }));
  assert(typeError.error === "validation_error", "TypeValidationError → validation_error");
  checks.push("schema/JSON errors map to validation_error");

  const keyNames = [
    "GEMINI_API_KEY",
    "GOOGLE_GENERATIVE_AI_API_KEY",
    "GOOGLE_API_KEY",
    "OPENAI_API_KEY",
    "XAI_API_KEY",
    "ANTHROPIC_API_KEY",
    "AI_SDK_PROVIDER"
  ] as const;
  const previousKeys = Object.fromEntries(keyNames.map((name) => [name, process.env[name]]));
  for (const name of keyNames) delete process.env[name];
  try {
    const config = readAiConfig();
    assert(config.configured === false, "empty env is not configured");
    const ping = await pingAi();
    if (ping.ok) throw new Error("ping without key must not succeed");
    assert(ping.error.error === "model_unavailable", "ping without key is model_unavailable");
    assert(ping.error.degraded === true && ping.error.retryable === true, "model_unavailable envelope");
    checks.push("pingAi no-key model_unavailable");
  } finally {
    for (const name of keyNames) {
      const value = previousKeys[name];
      if (value === undefined) delete process.env[name];
      else process.env[name] = value;
    }
  }

  return { ok: true, checks };
}

const invokedDirectly = process.argv[1]?.replace(/\\/g, "/").includes("tests/t2-selfcheck");
if (invokedDirectly) {
  runT2Selfcheck()
    .then((result) => {
      for (const check of result.checks) console.log(`ok  ${check}`);
    })
    .catch((error: unknown) => {
      console.error(error instanceof Error ? error.message : error);
      process.exitCode = 1;
    });
}
