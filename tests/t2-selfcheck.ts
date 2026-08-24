import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { pingAi, readAiConfig } from "@/lib/ai/provider";
import {
  cacheHitResponse,
  createMemoryDataStore,
  isDossierCacheable,
  isGeneratedDossierCacheable
} from "@/lib/datastore";
import { scribeDegradedResponse } from "@/lib/schemas/scribe";

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
  };
  const degradedFixture = (loadJson("p2-degraded-responses.json") as { scribe: unknown }).scribe;

  assert(isGeneratedDossierCacheable(degradedFixture) === false, "degraded fixture must not be cacheable");
  assert(isDossierCacheable(degradedFixture) === false, "isDossierCacheable alias rejects degraded");
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

  const npc = await store.npcCache.appendTurn("npc-tarkis", {
    role: "user",
    content: "你记得那座信标吗？",
    at: Date.now()
  });
  assert(npc.ok && npc.data.turns.length === 1, "npc_cache appendTurn");
  checks.push("npc_cache roundtrip");

  const player = await store.playerState.addProposition("auto", "Helix.Beacon.Broadcasting");
  assert(player.ok && player.data.collectedPropositions.includes("Helix.Beacon.Broadcasting"), "player_state proposition");
  const believed = await store.playerState.markBelieved("auto", "T1");
  assert(believed.ok && believed.data.believedTruths.includes("T1"), "player_state markBelieved");
  const downgrade = await store.playerState.setTruthStatus("auto", "T1", "suspected");
  assert(downgrade.ok === false && downgrade.error.error === "validation_error", "believed cannot downgrade");
  checks.push("player_state write-through + no believed downgrade");

  const attempt = await store.synthesisAttempts.record({
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
  assert(attempt.ok && (await store.synthesisAttempts.list(1))[0]?.truthId === "T1", "synthesis_attempts ring");
  checks.push("synthesis_attempts record");

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
