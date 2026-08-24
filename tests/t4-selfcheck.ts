import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { requireConstitution } from "@/lib/canon";
import { createMemoryDataStore } from "@/lib/datastore";
import { modelUnavailable } from "@/lib/schemas/common";
import {
  parseVoicesOutput,
  prepareVoicesRequest,
  VOICES_GENERIC_FALLBACK,
  type VoicesChatResponse,
  type VoicesHardReject,
  type VoicesOutput,
  type VoicesResult
} from "@/lib/schemas/voices";
import {
  computeVoicesCanonContext,
  consultCanon,
  offerClue,
  playerSnapshotFromState,
  recallPlayerLog,
  resolveVoicesSubject,
  runVoicesChat,
  type VoicesGenerateFn,
  type VoicesToolContext
} from "@/lib/voices";

const here = dirname(fileURLToPath(import.meta.url));

function loadJson(name: string): unknown {
  return JSON.parse(readFileSync(join(here, "fixtures", name), "utf8"));
}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function tarkisBody(overrides: Record<string, unknown> = {}) {
  return {
    messages: [{ role: "user", content: "你记得那座信标吗？" }],
    npcId: "npc-tarkis",
    canonContext: {
      planet_id: "black-interval",
      truth_ids: ["THidden"],
      known_facts: ["Vesper 你本身就是第9号奇偶校验位"],
      insight_gates: ["INSIGHT_THIDDEN_EGO_INTEGRATION"]
    },
    playerLog: [{ id: "client-log", text: "客户端伪造日志，不得采信", confidence: "confirmed" }],
    ...overrides
  };
}

const validOutput = loadJson("p2-voices-valid.json") as VoicesOutput;

function jsonGenerate(output: unknown): VoicesGenerateFn {
  return async () => ({ ok: true, data: { text: JSON.stringify(output) } });
}

function asHardReject(result: VoicesChatResponse, message: string): VoicesHardReject {
  assert(result.ok === false && result.degraded === false, message);
  return result;
}

function asDegraded(result: VoicesChatResponse, message: string): Extract<VoicesResult, { ok: false }> {
  assert(result.ok === false && result.degraded === true, message);
  return result;
}

function asOk(result: VoicesChatResponse, message: string): Extract<VoicesResult, { ok: true }> {
  assert(result.ok === true && result.degraded === false, message);
  return result;
}

export async function runT4Selfcheck(): Promise<{ ok: true; checks: string[] }> {
  const checks: string[] = [];

  const missingConstitution = requireConstitution("black-interval");
  assert(missingConstitution.ok === false, "black-interval has no constitution");
  if (missingConstitution.ok) throw new Error("unreachable");
  assert(missingConstitution.error.error === "canon_violation", "missing constitution code");
  assert(missingConstitution.error.degraded === false, "missing constitution is a hard gate");
  checks.push("requireConstitution(black-interval) → canon_violation");

  let generateCalled = false;
  const missingGate = await runVoicesChat(tarkisBody(), {
    store: createMemoryDataStore(),
    slotId: "auto",
    resolveSubject: () => ({
      ok: false,
      error: {
        error: "canon_violation",
        message: "缺少星球 black-interval 的冻结宪章；拒绝生成或对话，不得裸生成。",
        retryable: false,
        degraded: false
      }
    }),
    generate: async () => {
      generateCalled = true;
      return { ok: true, data: { text: "{}" } };
    }
  });
  const rejectedGate = asHardReject(missingGate, "pipeline hard-rejects missing constitution");
  assert(rejectedGate.error.error === "canon_violation" && rejectedGate.error.retryable === false, "hard reject envelope");
  assert(generateCalled === false, "missing constitution does not call the model");
  checks.push("无宪章拒绝（硬门，不调用模型）");

  const unknownNpc = await runVoicesChat(tarkisBody({ npcId: "npc-not-in-canon" }), {
    store: createMemoryDataStore(),
    generate: async () => {
      throw new Error("must not generate");
    }
  });
  assert(asHardReject(unknownNpc, "unknown npcId is hard reject").error.error === "canon_violation", "unknown npcId is canon_violation");
  checks.push("未知 npcId 硬拒绝");

  const subject = resolveVoicesSubject("npc-tarkis");
  assert(subject.ok && subject.subject.planetId === "helix-7", "tarkis maps to helix-7");
  const emptyPlayer = playerSnapshotFromState(null);
  const serverContext = computeVoicesCanonContext("helix-7", emptyPlayer, subject.ok ? subject.subject.constitution : ({} as never));
  assert(serverContext.planet_id === "helix-7", "server planet_id from NPC, not client");
  assert(!serverContext.truth_ids.includes("THidden"), "client THidden discarded");
  assert(!serverContext.known_facts.includes("Vesper 你本身就是第9号奇偶校验位"), "client known_facts discarded");
  assert(!serverContext.insight_gates.includes("INSIGHT_THIDDEN_EGO_INTEGRATION"), "client insight_gates discarded");
  const prepared = prepareVoicesRequest(tarkisBody(), serverContext);
  assert(prepared.success && prepared.data.canonContext.planet_id === "helix-7", "prepareVoicesRequest replaces client context");
  assert(prepared.success && prepared.data.canonContext.truth_ids.length === 0, "empty player has no truth_ids");
  checks.push("服务端重算 canonContext（丢弃客户端剧透）");

  const storeForTools = createMemoryDataStore();
  await storeForTools.playerState.addProposition("auto", "Helix.Beacon.Broadcasting");
  const player = playerSnapshotFromState(await storeForTools.playerState.load("auto"));
  const toolCtx: VoicesToolContext = {
    subject: subject.ok ? subject.subject : ({} as never),
    player,
    memory: null
  };
  const consulted = consultCanon(toolCtx, "信标");
  assert(consulted.hits.length > 0, "consult_canon finds beacon on prompt-safe corpus");
  assert(
    consulted.hits.every((hit) => !hit.text.includes("第9号奇偶校验位") && !hit.field.includes("true_fact")),
    "consult_canon does not return true_facts / forbidden identity"
  );
  const recalled = recallPlayerLog(toolCtx, "Helix.Beacon");
  assert(recalled.hits.some((hit) => hit.id === "Helix.Beacon.Broadcasting"), "recall_player_log uses server propositions");
  assert(!recalled.hits.some((hit) => hit.text.includes("客户端伪造")), "recall_player_log ignores client playerLog");
  const offered = offerClue(toolCtx, "INSIGHT_T1_BOOTSTRAP_DISCOVERED");
  assert(offered.allowed && offered.offer_insight_id === "INSIGHT_T1_BOOTSTRAP_DISCOVERED", "offer_clue allows Tarkis insight");
  const mapped = offerClue(toolCtx, "Helix.Signal.Unassigned");
  assert(mapped.allowed && mapped.offer_insight_id === "INSIGHT_T1_BOOTSTRAP_DISCOVERED", "clue maps to registered insight");
  const rejectedClue = offerClue(toolCtx, "INVENTED.CLUE");
  assert(!rejectedClue.allowed && rejectedClue.offer_insight_id === null, "unregistered clue refused");
  const foreignInsight = offerClue(toolCtx, "INSIGHT_THIDDEN_EGO_INTEGRATION");
  assert(!foreignInsight.allowed, "foreign registered insight refused for Tarkis");
  checks.push("三工具：consult_canon / recall_player_log / offer_clue");

  let toolsSeen = false;
  const toolPipeline = await runVoicesChat(tarkisBody(), {
    store: storeForTools,
    slotId: "auto",
    generate: async ({ tools }) => {
      toolsSeen = Boolean(tools.consult_canon && tools.recall_player_log && tools.offer_clue);
      const liveConsult = await tools.consult_canon.execute!({ query: "握手" }, {});
      const liveOffer = await tools.offer_clue.execute!({ clue_id: "INSIGHT_T1_BOOTSTRAP_DISCOVERED" }, {});
      assert(liveConsult.hits.length > 0, "pipeline tool consult_canon executes");
      assert(liveOffer.allowed, "pipeline tool offer_clue executes");
      return {
        ok: true,
        data: {
          text: JSON.stringify({
            say: "握手载波还在预热。舰队的红印还盖在清单上。",
            mood: "protocol-formal",
            offer_insight_id: "INSIGHT_T1_BOOTSTRAP_DISCOVERED",
            relationship_delta: 1,
            lie: false
          })
        }
      };
    }
  });
  assert(toolsSeen, "generate receives the three contract tools");
  assert(asOk(toolPipeline, "tool pipeline ok").output.offer_insight_id === "INSIGHT_T1_BOOTSTRAP_DISCOVERED", "tool pipeline ok output");
  checks.push("管线内工具调用");

  const unregistered = await runVoicesChat(tarkisBody(), {
    store: createMemoryDataStore(),
    generate: jsonGenerate({
      say: "我给你一条不存在的洞察。",
      mood: "guarded",
      offer_insight_id: "FAKE.INSIGHT.NOT.REGISTERED",
      relationship_delta: 1,
      lie: false
    })
  });
  const unregisteredResult = asDegraded(unregistered, "unregistered insight degrades");
  assert(unregisteredResult.error.error === "canon_violation", "unregistered insight is canon_violation");
  assert(unregisteredResult.fallback.offer_insight_id === null, "unregistered insight discarded");
  assert(unregisteredResult.fallback.say !== "我给你一条不存在的洞察。", "model text discarded");
  checks.push("未登记 insight 丢弃 + 保底句");

  const parsedLie = parseVoicesOutput(validOutput);
  assert(parsedLie.ok && parsedLie.output.lie === true, "fixture lie:true parses");
  const lieChat = await runVoicesChat(tarkisBody(), {
    store: createMemoryDataStore(),
    generate: jsonGenerate(validOutput)
  });
  const lieOk = asOk(lieChat, "pipeline preserves lie:true");
  assert(lieOk.output.lie === true, "pipeline preserves lie:true");
  assert(lieOk.output.offer_insight_id === "INSIGHT_T1_BOOTSTRAP_DISCOVERED", "lie fixture keeps registered insight");
  const lieMemory = await (async () => {
    const store = createMemoryDataStore();
    await runVoicesChat(tarkisBody(), { store, generate: jsonGenerate(validOutput) });
    return store.npcCache.get("auto", "npc-tarkis");
  })();
  assert(lieMemory?.turns.some((turn) => turn.role === "assistant" && turn.lie === true), "lie flag stored on assistant turn");
  checks.push("lie:true 输出与灰条目记忆");

  const degradedStore = createMemoryDataStore();
  const unavailable: VoicesGenerateFn = async () => ({
    ok: false,
    error: modelUnavailable("Voices 模型不可用，已回退硬编码对白树。", VOICES_GENERIC_FALLBACK.say)
  });
  const degraded = await runVoicesChat(tarkisBody(), { store: degradedStore, slotId: "auto", generate: unavailable });
  const degradedResult = asDegraded(degraded, "model_unavailable degrades");
  assert(degradedResult.error.error === "model_unavailable" && degradedResult.error.retryable === true, "unavailable envelope");
  assert(degradedResult.fallback.say.includes("交接班") || degradedResult.fallback.say.includes("信标"), "fallback is Tarkis dialogue tree");
  assert(degradedResult.fallback.offer_insight_id === null, "dialogue fallback does not mint insights");
  checks.push("降级回退 lib/dialogues.ts 对白树");

  const memStore = createMemoryDataStore();
  const delta: VoicesGenerateFn = jsonGenerate({
    say: "天线还在预热。",
    mood: "protocol-formal",
    offer_insight_id: null,
    relationship_delta: 1,
    lie: false
  });
  await runVoicesChat(tarkisBody(), { store: memStore, slotId: "slot_1", generate: delta });
  await runVoicesChat(tarkisBody({ messages: [{ role: "user", content: "把频率交给我。" }] }), {
    store: memStore,
    slotId: "slot_1",
    generate: delta
  });
  const slot1 = await memStore.npcCache.get("slot_1", "npc-tarkis");
  assert(slot1?.turns.length === 4, "two chats persist four turns");
  assert(slot1?.relationship === 2, "relationship_delta accumulates");
  await runVoicesChat(tarkisBody(), { store: memStore, slotId: "slot_2", generate: delta });
  const slot2 = await memStore.npcCache.get("slot_2", "npc-tarkis");
  assert(slot2?.turns.length === 2 && slot2.relationship === 1, "slot_2 isolated");
  assert((await memStore.npcCache.get("slot_1", "npc-tarkis"))?.relationship === 2, "slot_1 unchanged");
  checks.push("npcCache 记忆与 relationship 按槽累计");

  let leaked = false;
  await runVoicesChat(tarkisBody(), {
    store: createMemoryDataStore(),
    generate: async ({ system }) => {
      leaked =
        system.includes("THidden") ||
        system.includes("第9号奇偶校验位") ||
        system.includes("black-interval") ||
        system.includes("客户端伪造");
      return jsonGenerate(validOutput)({
        system,
        messages: [],
        tools: {} as never
      });
    }
  });
  assert(!leaked, "system prompt does not contain client spoilers");
  checks.push("prompt 不含客户端 canonContext 剧透");

  assert(lieOk.contract_version === "v1.1", "responses carry contract_version v1.1");
  checks.push("contract_version v1.1");

  return { ok: true, checks };
}

const invokedDirectly = process.argv[1]?.replace(/\\/g, "/").includes("tests/t4-selfcheck");
if (invokedDirectly) {
  runT4Selfcheck()
    .then((result) => {
      for (const check of result.checks) console.log(`ok  ${check}`);
    })
    .catch((error: unknown) => {
      console.error(error instanceof Error ? error.message : error);
      process.exitCode = 1;
    });
}
