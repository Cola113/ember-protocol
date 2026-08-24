import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { modelUnavailable, validationError } from "@/lib/schemas/common";
import { createMemoryDataStore } from "@/lib/datastore";
import {
  SCRIBE_MAX_REGENERATIONS,
  runScribePipeline,
  type ScribeGenerator
} from "@/lib/scribe/generation";
import type { Dossier, ScribeGenerateResponse } from "@/lib/schemas/scribe";

const here = dirname(fileURLToPath(import.meta.url));

function loadValidDossier(): Dossier {
  return JSON.parse(readFileSync(join(here, "fixtures", "p2-dossier-valid.json"), "utf8")) as Dossier;
}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function generatedEnvelope(dossier: Dossier): Extract<ScribeGenerateResponse, { status: "generated" }> {
  return { contract_version: "v1.1", status: "generated", cached: false, dossier };
}

export async function runT3Selfcheck(): Promise<{ ok: true; checks: string[] }> {
  const checks: string[] = [];
  const valid = loadValidDossier();

  let missingCanonCalls = 0;
  const missingCanonGenerator: ScribeGenerator = async () => {
    missingCanonCalls += 1;
    return { ok: true, data: valid };
  };
  const missingCanon = await runScribePipeline(
    { planetId: "planet-without-constitution", landingSiteId: "site-nowhere" },
    { cache: createMemoryDataStore().dossierCache, generate: missingCanonGenerator }
  );
  assert("error" in missingCanon.response, "missing constitution must return hard error");
  assert(missingCanon.response.error.error === "canon_violation", "missing constitution is canon_violation");
  assert(missingCanon.response.error.degraded === false, "missing constitution is not degraded");
  assert(missingCanonCalls === 0, "missing constitution must not call model");
  checks.push("missing constitution rejected before model");

  const invalid = await runScribePipeline(
    { planetId: "helix-7" },
    { cache: createMemoryDataStore().dossierCache, generate: missingCanonGenerator }
  );
  assert("error" in invalid.response && invalid.response.error.error === "validation_error", "invalid input error");
  assert(missingCanonCalls === 0, "invalid input must not call model");
  checks.push("Zod input validation_error before canon/model");

  const cacheStore = createMemoryDataStore();
  const seeded = await cacheStore.dossierCache.putGenerated(
    valid.planet_id,
    valid.landing_site_id,
    generatedEnvelope(valid)
  );
  assert(seeded.ok, "cache seed failed");
  let cacheHitCalls = 0;
  const cacheHitGenerator: ScribeGenerator = async () => {
    cacheHitCalls += 1;
    return { ok: true, data: valid };
  };
  const cacheHit = await runScribePipeline(
    { planetId: valid.planet_id, landingSiteId: valid.landing_site_id },
    { cache: cacheStore.dossierCache, generate: cacheHitGenerator }
  );
  assert("status" in cacheHit.response && cacheHit.response.status === "cache_hit", "cache hit status");
  assert(cacheHitCalls === 0, "cache hit must not call model");
  checks.push("cache hit short-circuits model");

  const successStore = createMemoryDataStore();
  let successCalls = 0;
  const successGenerator: ScribeGenerator = async (options) => {
    successCalls += 1;
    assert(options.temperature === 0.7, "Scribe temperature must be 0.7");
    return { ok: true, data: valid };
  };
  const success = await runScribePipeline(
    { planetId: valid.planet_id, landingSiteId: valid.landing_site_id },
    { cache: successStore.dossierCache, generate: successGenerator }
  );
  assert("status" in success.response && success.response.status === "generated", "generated status");
  assert(successCalls === 1, "successful generation calls model once");
  assert(await successStore.dossierCache.has(valid.planet_id, valid.landing_site_id), "generated dossier cached");
  checks.push("mock provider generated dossier validates and caches");

  const writeFailure = await runScribePipeline(
    { planetId: valid.planet_id, landingSiteId: valid.landing_site_id },
    {
      cache: {
        get: async () => null,
        putGenerated: async () => ({
          ok: false as const,
          error: validationError("selfcheck cache write failure")
        }),
        delete: async () => undefined,
        has: async () => false
      },
      generate: async () => ({ ok: true, data: valid })
    }
  );
  assert("status" in writeFailure.response && writeFailure.response.status === "degraded", "cache write failure degrades");
  assert(writeFailure.response.cacheable === false, "cache write failure fallback is not cacheable");
  checks.push("cache write failure degrades without returning generated");

  const conflictStore = createMemoryDataStore();
  const forbidden = {
    ...valid,
    summary: "信标是引导星弧第二轮点火的自催化触发器"
  };
  let conflictCalls = 0;
  const conflictGenerator: ScribeGenerator = async () => {
    conflictCalls += 1;
    return { ok: true, data: forbidden };
  };
  const conflict = await runScribePipeline(
    { planetId: valid.planet_id, landingSiteId: valid.landing_site_id },
    { cache: conflictStore.dossierCache, generate: conflictGenerator }
  );
  assert("status" in conflict.response && conflict.response.status === "degraded", "conflict degrades");
  assert(conflict.response.error.error === "canon_violation", "conflict preserves canon_violation");
  assert(conflict.response.cacheable === false, "conflict fallback is not cacheable");
  assert(conflictCalls === SCRIBE_MAX_REGENERATIONS + 1, "initial generation plus two regenerations");
  assert(!(await conflictStore.dossierCache.has(valid.planet_id, valid.landing_site_id)), "conflict fallback not cached");
  checks.push("canon conflict retries twice then degrades without cache");

  const unavailableStore = createMemoryDataStore();
  const unavailableGenerator: ScribeGenerator = async () => ({
    ok: false,
    error: modelUnavailable("selfcheck: no provider key", "template")
  });
  const unavailable = await runScribePipeline(
    { planetId: valid.planet_id, landingSiteId: valid.landing_site_id },
    { cache: unavailableStore.dossierCache, generate: unavailableGenerator }
  );
  assert("status" in unavailable.response && unavailable.response.status === "degraded", "unavailable degrades");
  assert(unavailable.response.error.error === "model_unavailable", "unavailable error code");
  assert(unavailable.response.cacheable === false, "model fallback not cacheable");
  assert(!(await unavailableStore.dossierCache.has(valid.planet_id, valid.landing_site_id)), "model fallback not cached");
  checks.push("model_unavailable uses non-cacheable template");

  const providerKeyNames = [
    "GEMINI_API_KEY",
    "GOOGLE_GENERATIVE_AI_API_KEY",
    "GOOGLE_API_KEY",
    "OPENAI_API_KEY",
    "XAI_API_KEY",
    "ANTHROPIC_API_KEY",
    "AI_SDK_PROVIDER"
  ] as const;
  const previousProviderEnv = Object.fromEntries(
    providerKeyNames.map((name) => [name, process.env[name]])
  );
  for (const name of providerKeyNames) delete process.env[name];
  try {
    const noKeyStore = createMemoryDataStore();
    const noKey = await runScribePipeline(
      { planetId: valid.planet_id, landingSiteId: valid.landing_site_id },
      { cache: noKeyStore.dossierCache }
    );
    assert("status" in noKey.response && noKey.response.status === "degraded", "no-key provider degrades");
    assert(noKey.response.error.error === "model_unavailable", "no-key provider error code");
    assert(!(await noKeyStore.dossierCache.has(valid.planet_id, valid.landing_site_id)), "no-key fallback not cached");
    checks.push("real generateStructured no-key path degrades");
  } finally {
    for (const name of providerKeyNames) {
      const value = previousProviderEnv[name];
      if (value === undefined) delete process.env[name];
      else process.env[name] = value;
    }
  }

  const propositionStore = createMemoryDataStore();
  const inventedProposition = { ...valid, archive_fill_notes: "新增命题 Fake.Signal.Answer" };
  const proposition = await runScribePipeline(
    { planetId: valid.planet_id, landingSiteId: valid.landing_site_id },
    {
      cache: propositionStore.dossierCache,
      generate: async () => ({ ok: true, data: inventedProposition })
    }
  );
  assert("status" in proposition.response && proposition.response.status === "degraded", "invented proposition degrades");
  assert(proposition.response.error.error === "canon_violation", "invented proposition is canon_violation");
  assert(!(await propositionStore.dossierCache.has(valid.planet_id, valid.landing_site_id)), "invented proposition not cached");
  checks.push("unregistered proposition is rejected and not cached");

  const registeredProposition = await runScribePipeline(
    { planetId: valid.planet_id, landingSiteId: valid.landing_site_id },
    {
      cache: createMemoryDataStore().dossierCache,
      generate: async () => ({
        ok: true,
        data: { ...valid, archive_fill_notes: "地方传闻提到 Helix.Beacon.Broadcasting，但不作主线解释。" }
      })
    }
  );
  assert(
    "status" in registeredProposition.response && registeredProposition.response.status === "degraded",
    "registered proposition still degrades"
  );
  assert(
    "error" in registeredProposition.response && registeredProposition.response.error.error === "canon_violation",
    "registered proposition is canon_violation"
  );
  checks.push("registered proposition is blocked from Scribe output");

  return { ok: true, checks };
}

const invokedDirectly = process.argv[1]?.replace(/\\/g, "/").includes("tests/t3-selfcheck");
if (invokedDirectly) {
  runT3Selfcheck()
    .then((result) => {
      for (const check of result.checks) console.log(`ok  ${check}`);
    })
    .catch((error: unknown) => {
      console.error(error instanceof Error ? error.message : error);
      process.exitCode = 1;
    });
}
