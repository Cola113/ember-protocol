import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createMemoryDataStore } from "@/lib/datastore";
import {
  buildBelievedTruthInjection,
  getSalience,
  runCuratorSynthesis,
  salienceForTruth,
  type CuratorGenerateFn
} from "@/lib/curator";
import { modelUnavailable } from "@/lib/schemas/common";
import type { SynthesisResult } from "@/lib/schemas/synthesis";

const here = dirname(fileURLToPath(import.meta.url));

function loadJson(name: string): unknown {
  return JSON.parse(readFileSync(join(here, "fixtures", name), "utf8"));
}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

const synthesisFixtures = loadJson("p2-synthesis.json") as {
  passed: SynthesisResult;
  partial: SynthesisResult;
  failed: SynthesisResult;
};

const completeInput = {
  truthId: "T1",
  hypothesisText: "信标是引导扇区的握手载波，不是求救信号。",
  pinnedPropositions: ["Helix.Beacon.Broadcasting", "Helix.Signal.Unassigned"]
};

function mockGenerate(result: SynthesisResult): CuratorGenerateFn {
  return async () => ({ ok: true, data: result });
}

export async function runT5Selfcheck(): Promise<{ ok: true; checks: string[] }> {
  const checks: string[] = [];

  let generateCalled = false;
  const hardGate = await runCuratorSynthesis(
    {
      ...completeInput,
      pinnedPropositions: ["Helix.Beacon.Broadcasting"]
    },
    {
      store: createMemoryDataStore(),
      generate: async () => {
        generateCalled = true;
        return { ok: true, data: synthesisFixtures.passed };
      }
    }
  );
  assert(hardGate.response.status === "rejected", "missing required proposition is rejected");
  assert(hardGate.response.error.error === "canon_violation", "hard gate error code");
  assert("result" in hardGate.response && hardGate.response.result.verdict === "failed", "hard gate result is failed");
  assert(generateCalled === false, "hard gate runs before model");
  checks.push("硬门拒绝缺失命题且不调用模型");

  const scoreStore = createMemoryDataStore();
  const passed = await runCuratorSynthesis(completeInput, {
    store: scoreStore,
    generate: mockGenerate(synthesisFixtures.passed)
  });
  assert(passed.response.status === "scored" && passed.response.result.verdict === "passed", "passed fixture scores");
  assert((await scoreStore.playerState.getTruthStatus("auto", "T1")) === "believed", "passed marks believed");
  assert((await scoreStore.synthesisAttempts.list("auto", 1))[0]?.degraded === false, "passed attempt recorded");
  checks.push("passed 评分推进 believed 并记录 attempt");

  const partialStore = createMemoryDataStore();
  const partial = await runCuratorSynthesis(completeInput, {
    store: partialStore,
    generate: mockGenerate(synthesisFixtures.partial)
  });
  assert(partial.response.status === "scored" && partial.response.result.verdict === "partial", "partial fixture scores");
  assert((await partialStore.playerState.getTruthStatus("auto", "T1")) === "suspected", "partial stays suspected");
  checks.push("partial 评分保持 suspected");

  const encounteredStore = createMemoryDataStore();
  const encountered = await runCuratorSynthesis(
    { ...completeInput, pinnedPropositions: ["Helix.Beacon.Broadcasting"] },
    { store: encounteredStore, generate: mockGenerate(synthesisFixtures.passed) }
  );
  assert(encountered.response.status === "rejected", "incomplete propositions do not score");
  assert((await encounteredStore.playerState.getTruthStatus("auto", "T1")) === "encountered", "one proposition enters encountered");
  checks.push("命题收集迁移 unknown -> encountered");

  const failedStore = createMemoryDataStore();
  const failed = await runCuratorSynthesis(completeInput, {
    store: failedStore,
    generate: mockGenerate(synthesisFixtures.failed)
  });
  assert(failed.response.status === "scored" && failed.response.result.verdict === "failed", "failed fixture scores");
  assert((await failedStore.playerState.getTruthStatus("auto", "T1")) === "suspected", "failed stays suspected");
  checks.push("failed 评分保持 suspected");

  const belowThresholdStore = createMemoryDataStore();
  const belowThreshold = await runCuratorSynthesis(completeInput, {
    store: belowThresholdStore,
    generate: mockGenerate({
      ...synthesisFixtures.passed,
      coverage: 0.4,
      correctness: 0.4,
      coherence: 0.4
    })
  });
  assert(belowThreshold.response.status === "scored" && belowThreshold.response.result.verdict === "partial", "passed below threshold is normalized to partial");
  assert((await belowThresholdStore.playerState.getTruthStatus("auto", "T1")) === "suspected", "below threshold does not believe");
  checks.push("passed 低于阈值降为 partial");

  const monotonicStore = createMemoryDataStore();
  await monotonicStore.playerState.markBelieved("auto", "T1");
  await runCuratorSynthesis(completeInput, {
    store: monotonicStore,
    generate: mockGenerate(synthesisFixtures.failed)
  });
  assert((await monotonicStore.playerState.getTruthStatus("auto", "T1")) === "believed", "believed cannot roll back");
  checks.push("believed 不可回退");

  const salienceBefore = salienceForTruth("T1", "unknown");
  const salienceEncountered = salienceForTruth("T1", "encountered");
  assert(salienceEncountered.weight > salienceBefore.weight, "encountered increases salience weight");
  const mapStore = createMemoryDataStore();
  await mapStore.playerState.addProposition("auto", "Helix.Beacon.Broadcasting");
  const state = await mapStore.playerState.load("auto");
  const canonBefore = JSON.stringify(loadJson("p2-synthesis.json"));
  const salienceMap = getSalience(state);
  assert(salienceMap.T1?.status === "encountered", "salience reads server truth state");
  assert(JSON.stringify(loadJson("p2-synthesis.json")) === canonBefore, "salience does not mutate canon data");
  checks.push("salience 提权且不变更 Canon");

  const degradedStore = createMemoryDataStore();
  const degraded = await runCuratorSynthesis(completeInput, {
    store: degradedStore,
    generate: async () => ({
      ok: false,
      error: modelUnavailable("Curator 模型不可用。", "请补齐命题后重试。")
    })
  });
  assert(degraded.response.status === "degraded", "no model degrades");
  assert(degraded.response.result.verdict === "partial", "degraded result is partial");
  assert((await degradedStore.playerState.getTruthStatus("auto", "T1")) === "suspected", "degraded does not believe");
  checks.push("无模型降级 partial 且不推进 believed");

  const context = buildBelievedTruthInjection(["T1", "FAKE.TRUTH"]);
  assert(context.includes("你已知道") && !context.includes("FAKE.TRUTH"), "NPC context uses server-registered believed truths");
  checks.push("NPC 语境注入已 believed 真相");

  return { ok: true, checks };
}

const invokedDirectly = process.argv[1]?.replace(/\\/g, "/").includes("tests/t5-selfcheck");
if (invokedDirectly) {
  runT5Selfcheck()
    .then((result) => {
      for (const check of result.checks) console.log(`ok  ${check}`);
    })
    .catch((error: unknown) => {
      console.error(error instanceof Error ? error.message : error);
      process.exitCode = 1;
    });
}
