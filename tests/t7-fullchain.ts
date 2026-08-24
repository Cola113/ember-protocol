/**
 * T7 全链路测试矩阵（P2 排程 P5）。
 *
 * 主力 Pi。覆盖五块：
 *  1. route 级：三 API 非法 JSON / 未知 npc / 未知 truth / 额外字段 / 信封形状
 *  2. T5 边界（codex 深度判定 3 项）：三项评分参数化边界 / 非法模型输出降级 / believed 状态 spy 不调用模型
 *  3. 跨层链路：Voices offer_insight→Curator 命题收集→状态迁移；Scribe 生成→缓存→cache_hit；Synthesis passed→believed→Voices 语境注入
 *  4. 降级链：model_unavailable 三路由各自降级且不污染缓存/状态
 *  5. 契约一致性：contract_version v1.1 / 错误码 4 值枚举 / degraded 标记自洽
 *
 * 每层 selfcheck 仍是 t2/t3/t4/t5；本文件只做跨层与 route 边界。
 * Pi 无 shell——执行（tsc + 跑）由 Hermes 负责。
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createMemoryDataStore, resetDefaultDataStore } from "@/lib/datastore";
import {
  buildBelievedTruthInjection,
  runCuratorSynthesis,
  type CuratorErrorResponse,
  type CuratorGenerateFn,
  type CuratorRunResult
} from "@/lib/curator";
import { runScribePipeline, type ScribeErrorResponse, type ScribeGenerator, type ScribePipelineResult } from "@/lib/scribe/generation";
import { modelUnavailable, type ContractError } from "@/lib/schemas/common";
import { type CuratorResponse, type SynthesisResult } from "@/lib/schemas/curator";
import {
  VOICES_GENERIC_FALLBACK,
  type VoicesChatResponse,
  type VoicesHardReject,
  type VoicesOutput,
  type VoicesResult
} from "@/lib/schemas/voices";
import { type Dossier, type ScribeGenerateResponse } from "@/lib/schemas/scribe";
import {
  computeVoicesCanonContext,
  offerClue,
  playerSnapshotFromState,
  resolveVoicesSubject,
  runVoicesChat,
  type VoicesGenerateFn
} from "@/lib/voices";
import { POST as voicesPost } from "@/app/api/voices/chat/route";
import { POST as scribePost } from "@/app/api/scribe/generate/route";
import { POST as curatorPost } from "@/app/api/curator/synthesize/route";

const here = dirname(fileURLToPath(import.meta.url));

function loadJson(name: string): unknown {
  return JSON.parse(readFileSync(join(here, "fixtures", name), "utf8"));
}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

const CONTRACT_ERROR_CODES = new Set(["validation_error", "canon_violation", "model_unavailable", "cache_hit"]);

// ---------- fixtures ----------
const synthesisFixtures = loadJson("p2-synthesis.json") as { passed: SynthesisResult; partial: SynthesisResult; failed: SynthesisResult };
const voicesValidOutput = loadJson("p2-voices-valid.json") as VoicesOutput;
const validDossier = loadJson("p2-dossier-valid.json") as Dossier;

const validVoicesBody = {
  messages: [{ role: "user", content: "你记得那座信标吗？" }],
  npcId: "npc-tarkis",
  canonContext: {
    planet_id: "helix-7",
    truth_ids: ["THidden"],
    known_facts: ["Vesper 你本身就是第9号奇偶校验位"],
    insight_gates: ["INSIGHT_THIDDEN_EGO_INTEGRATION"]
  },
  playerLog: [] as unknown[]
};
const completeCuratorInput = {
  truthId: "T1",
  hypothesisText: "信标是引导扇区的握手载波，不是求救信号。",
  pinnedPropositions: ["Helix.Beacon.Broadcasting", "Helix.Signal.Unassigned"]
};

// ---------- typed extractors ----------
type VoicesOk = Extract<VoicesResult, { ok: true }>;
type VoicesDegraded = Extract<VoicesResult, { ok: false; degraded: true }>;
function asVoicesOk(r: VoicesChatResponse): VoicesOk {
  assert(r.ok === true && r.degraded === false, "expected voices ok");
  return r as VoicesOk;
}
function asVoicesDegraded(r: VoicesChatResponse): VoicesDegraded {
  assert(r.ok === false && r.degraded === true, "expected voices degraded");
  return r as VoicesDegraded;
}
function asVoicesHard(r: VoicesChatResponse): VoicesHardReject {
  assert(r.ok === false && r.degraded === false, "expected voices hard reject");
  return r as VoicesHardReject;
}

type ScribeGenerated = Extract<ScribeGenerateResponse, { status: "generated" }>;
type ScribeCacheHit = Extract<ScribeGenerateResponse, { status: "cache_hit" }>;
type ScribeDegraded = Extract<ScribeGenerateResponse, { status: "degraded" }>;
function asScribeGenerated(r: ScribePipelineResult): ScribeGenerated {
  assert("status" in r.response && r.response.status === "generated", "expected scribe generated");
  return r.response as ScribeGenerated;
}
function asScribeCacheHit(r: ScribePipelineResult): ScribeCacheHit {
  assert("status" in r.response && r.response.status === "cache_hit", "expected scribe cache_hit");
  return r.response as ScribeCacheHit;
}
function asScribeDegraded(r: ScribePipelineResult): ScribeDegraded {
  assert("status" in r.response && r.response.status === "degraded", "expected scribe degraded");
  return r.response as ScribeDegraded;
}
function asScribeError(r: ScribePipelineResult): ScribeErrorResponse {
  assert(!("status" in r.response), "expected scribe hard error");
  return r.response as ScribeErrorResponse;
}

type CuratorScored = Extract<CuratorResponse, { status: "scored" }>;
type CuratorDegraded = Extract<CuratorResponse, { status: "degraded" }>;
type CuratorRejected = Extract<CuratorResponse, { status: "rejected" }> | CuratorErrorResponse;
function asScored(r: CuratorRunResult): CuratorScored {
  assert(r.response.status === "scored", `expected curator scored, got ${r.response.status}`);
  return r.response as CuratorScored;
}
function asDegraded(r: CuratorRunResult): CuratorDegraded {
  assert(r.response.status === "degraded", `expected curator degraded, got ${r.response.status}`);
  return r.response as CuratorDegraded;
}
function asCuratorRejected(r: CuratorRunResult): CuratorRejected {
  assert(r.response.status === "rejected", `expected curator rejected, got ${r.response.status}`);
  return r.response as CuratorRejected;
}

// ---------- generate spies / mocks ----------
function voicesSpy(): { fn: VoicesGenerateFn; called: () => boolean } {
  let called = false;
  const fn: VoicesGenerateFn = async () => {
    called = true;
    return { ok: true, data: { text: JSON.stringify({ say: "spy", mood: "protocol-formal", offer_insight_id: null, relationship_delta: 0, lie: false }) } };
  };
  return { fn, called: () => called };
}
function curatorSpy(result: SynthesisResult): { fn: CuratorGenerateFn; called: () => boolean } {
  let called = false;
  const fn: CuratorGenerateFn = async () => {
    called = true;
    return { ok: true, data: result };
  };
  return { fn, called: () => called };
}
function scribeSpy(dossier: Dossier): { fn: ScribeGenerator; called: () => boolean } {
  let called = false;
  const fn: ScribeGenerator = async () => {
    called = true;
    return { ok: true, data: dossier };
  };
  return { fn, called: () => called };
}
function voicesJsonGenerate(output: unknown): VoicesGenerateFn {
  return async () => ({ ok: true, data: { text: JSON.stringify(output) } });
}
function curatorMockGenerate(result: SynthesisResult): CuratorGenerateFn {
  return async () => ({ ok: true, data: result });
}
function curatorRawGenerate(data: unknown): CuratorGenerateFn {
  return async () => ({ ok: true, data: data as SynthesisResult });
}
function captureVoicesSystem(): { fn: VoicesGenerateFn; system: () => string } {
  let captured = "";
  const fn: VoicesGenerateFn = async (request) => {
    captured = request.system;
    return { ok: true, data: { text: JSON.stringify({ say: "已记录。", mood: "protocol-formal", offer_insight_id: null, relationship_delta: 0, lie: false }) } };
  };
  return { fn, system: () => captured };
}
function makePassed(dim: "coverage" | "correctness" | "coherence", value: number): SynthesisResult {
  const result: SynthesisResult = { verdict: "passed", coverage: 0.9, correctness: 0.9, coherence: 0.9, feedback: "参数化边界测试。" };
  result[dim] = value;
  return result;
}

// ---------- route body shapes ----------
interface VoicesRouteBody {
  contract_version: string;
  ok: boolean;
  degraded: boolean;
  error: ContractError;
  output?: VoicesOutput;
  fallback?: VoicesOutput;
}
interface CuratorRouteBody {
  contract_version: string;
  status: string;
  degraded: boolean;
  truth_id: string;
  error: ContractError;
  result?: SynthesisResult;
  missing_required_propositions?: string[];
}
interface ScribeRouteBody {
  contract_version: string;
  status?: string;
  cached?: boolean;
  degraded?: boolean;
  cacheable?: boolean;
  error?: ContractError;
  dossier?: Dossier;
}

const BOUNDARIES: ReadonlyArray<{ dim: "coverage" | "correctness" | "coherence"; below: number; at: number; above: number }> = [
  { dim: "coverage", below: 0.74, at: 0.75, above: 0.76 },
  { dim: "correctness", below: 0.74, at: 0.75, above: 0.76 },
  { dim: "coherence", below: 0.59, at: 0.60, above: 0.61 }
];

export async function runT7FullChain(): Promise<{ ok: true; checks: string[] }> {
  const checks: string[] = [];
  const envelopes: Array<{ label: string; obj: unknown }> = [];
  const record = (label: string, obj: unknown): void => { envelopes.push({ label, obj }); };

  // ============================================================
  // 1. route 级：三 API 非法 JSON / 未知 npc / 未知 truth
  // ============================================================
  resetDefaultDataStore();

  const voicesBadReq = new Request("http://localhost/api/voices/chat?slot=auto", {
    method: "POST",
    body: "{not json",
    headers: { "content-type": "application/json" }
  });
  const vRes = await voicesPost(voicesBadReq);
  const vBody = (await vRes.json()) as VoicesRouteBody;
  assert(vRes.status === 400, "route: voices 非法 JSON 400");
  assert(vBody.contract_version === "v1.1" && vBody.ok === false && vBody.degraded === false, "route: voices 非法 JSON 硬拒绝信封");
  assert(vBody.error.error === "validation_error", "route: voices 非法 JSON validation_error");
  record("voices 非法 JSON", vBody);

  const curatorBadReq = new Request("http://localhost/api/curator/synthesize?slot=auto", {
    method: "POST",
    body: "{not json",
    headers: { "content-type": "application/json" }
  });
  const cRes = await curatorPost(curatorBadReq);
  const cBody = (await cRes.json()) as CuratorRouteBody;
  assert(cRes.status === 400, "route: curator 非法 JSON 400");
  assert(cBody.contract_version === "v1.1" && cBody.status === "rejected" && cBody.degraded === false && cBody.truth_id === "unknown", "route: curator 非法 JSON rejected/unknown");
  assert(cBody.error.error === "validation_error", "route: curator 非法 JSON validation_error");
  record("curator 非法 JSON", cBody);

  const scribeBadReq = new Request("http://localhost/api/scribe/generate", {
    method: "POST",
    body: "{not json",
    headers: { "content-type": "application/json" }
  });
  const sRes = await scribePost(scribeBadReq);
  const sBody = (await sRes.json()) as ScribeRouteBody;
  assert(sRes.status === 400, "route: scribe 非法 JSON 400");
  assert(sBody.contract_version === "v1.1", "route: scribe 非法 JSON contract_version");
  assert(sBody.error?.error === "validation_error", "route: scribe 非法 JSON validation_error");
  record("scribe 非法 JSON", sBody);

  const unknownNpcReq = new Request("http://localhost/api/voices/chat?slot=auto", {
    method: "POST",
    body: JSON.stringify({ messages: [{ role: "user", content: "hi" }], npcId: "npc-ghost", canonContext: { planet_id: "helix-7" }, playerLog: [] }),
    headers: { "content-type": "application/json" }
  });
  const nRes = await voicesPost(unknownNpcReq);
  const nBody = (await nRes.json()) as VoicesRouteBody;
  assert(nRes.status === 200, "route: voices 未知 npc 200（管线硬拒绝）");
  assert(nBody.ok === false && nBody.degraded === false && nBody.error.error === "canon_violation", "route: voices 未知 npc canon_violation 硬拒绝");
  record("voices 未知 npc", nBody);

  const unknownTruthReq = new Request("http://localhost/api/curator/synthesize?slot=auto", {
    method: "POST",
    body: JSON.stringify({ truthId: "TFAKE", hypothesisText: "x", pinnedPropositions: [] }),
    headers: { "content-type": "application/json" }
  });
  const tRes = await curatorPost(unknownTruthReq);
  const tBody = (await tRes.json()) as CuratorRouteBody;
  assert(tRes.status === 400, "route: curator 未知 truth 400");
  assert(tBody.status === "rejected" && tBody.truth_id === "TFAKE" && tBody.error.error === "canon_violation", "route: curator 未知 truth canon_violation");
  record("curator 未知 truth", tBody);
  checks.push("route 级：三 API 非法 JSON/未知 npc/未知 truth 信封 + 状态码 + contract_version");

  // ============================================================
  // 2. 额外字段：三路由 strict schema 拒绝且不调用模型
  // ============================================================
  const vSpy = voicesSpy();
  const vExtra = await runVoicesChat({ ...validVoicesBody, believedTruths: ["T1"] }, { generate: vSpy.fn });
  assert(asVoicesHard(vExtra).error.error === "validation_error", "额外字段: voices top-level believedTruths validation_error");
  assert(!vSpy.called(), "额外字段: voices 不调用模型");

  const cSpy = curatorSpy(synthesisFixtures.failed);
  const cExtra = await runCuratorSynthesis({ ...completeCuratorInput, extraPayload: true }, { generate: cSpy.fn });
  const cExtraRej = asCuratorRejected(cExtra);
  assert(cExtraRej.error.error === "validation_error" && cExtraRej.truth_id === "unknown" && cExtra.httpStatus === 400, "额外字段: curator extraPayload validation_error/unknown/400");
  assert(!cSpy.called(), "额外字段: curator 不调用模型");
  record("curator 额外字段", cExtraRej);

  const sSpy = scribeSpy(validDossier);
  const sExtra = await runScribePipeline(
    { planetId: "helix-7", landingSiteId: "site-helix-coldboot", extra: true },
    { cache: createMemoryDataStore().dossierCache, generate: sSpy.fn }
  );
  assert(asScribeError(sExtra).error.error === "validation_error" && sExtra.httpStatus === 400, "额外字段: scribe extra validation_error/400");
  assert(!sSpy.called(), "额外字段: scribe 不调用模型");
  record("scribe 额外字段", sExtra.response);
  checks.push("额外字段：三路由 strict schema 硬拒绝（degraded:false）且不调用模型");

  // ============================================================
  // 3. T5 边界（codex 深度判定 3 项）
  // ============================================================
  // 3a. 三项评分参数化边界
  for (const { dim, below, at, above } of BOUNDARIES) {
    const cases: Array<{ label: string; value: number; shouldPass: boolean }> = [
      { label: "below", value: below, shouldPass: false },
      { label: "at", value: at, shouldPass: true },
      { label: "above", value: above, shouldPass: true }
    ];
    for (const c of cases) {
      const store = createMemoryDataStore();
      const r = await runCuratorSynthesis(completeCuratorInput, { store, slotId: "auto", generate: curatorMockGenerate(makePassed(dim, c.value)) });
      const scored = asScored(r);
      if (c.shouldPass) {
        assert(scored.result.verdict === "passed", `${dim} ${c.label}: passed`);
        assert(await store.playerState.getTruthStatus("auto", "T1") === "believed", `${dim} ${c.label}: believed`);
      } else {
        assert(scored.result.verdict === "partial", `${dim} ${c.label}: partial`);
        assert(await store.playerState.getTruthStatus("auto", "T1") !== "believed", `${dim} ${c.label}: 不 believed`);
      }
    }
  }
  checks.push("T5 边界：三项评分参数化（coverage/correctness 0.74|0.75|0.76；coherence 0.59|0.60|0.61）below→partial，at/above→passed+believed");

  // 3b. 非法模型输出降级
  const illegalOutputs: Array<{ label: string; data: unknown }> = [
    { label: "verdict-out-of-enum", data: { verdict: "maybe", coverage: 0.9, correctness: 0.9, coherence: 0.9, feedback: "x" } },
    { label: "coverage-out-of-range", data: { verdict: "passed", coverage: 1.5, correctness: 0.9, coherence: 0.9, feedback: "x" } },
    { label: "missing-feedback", data: { verdict: "passed", coverage: 0.9, correctness: 0.9, coherence: 0.9 } }
  ];
  for (const { label, data } of illegalOutputs) {
    const store = createMemoryDataStore();
    const r = await runCuratorSynthesis(completeCuratorInput, { store, slotId: "auto", generate: curatorRawGenerate(data) });
    const deg = asDegraded(r);
    assert(deg.result.verdict === "partial" && deg.error.error === "validation_error", `非法输出 ${label}: partial + validation_error`);
    assert(await store.playerState.getTruthStatus("auto", "T1") !== "believed", `非法输出 ${label}: 不 believed`);
    assert((await store.synthesisAttempts.list("auto", 1))[0]?.degraded === true, `非法输出 ${label}: attempt degraded`);
    record(`curator 非法输出 ${label}`, deg);
  }
  checks.push("T5 边界：非法模型输出（verdict/范围/缺字段）→ 降级 partial + validation_error，不推进 believed，attempt 标 degraded");

  // 3c. believed 状态 spy 断言不调用模型
  {
    const store = createMemoryDataStore();
    const marked = await store.playerState.markBelieved("auto", "T1");
    assert(marked.ok, "believed-spy: markBelieved ok");
    const spy = curatorSpy(synthesisFixtures.failed);
    const r = await runCuratorSynthesis(completeCuratorInput, { store, slotId: "auto", generate: spy.fn });
    assert(!spy.called(), "believed-spy: believed 短路不调用模型");
    const scored = asScored(r);
    assert(scored.result.verdict === "passed" && scored.result.coverage === 1, "believed-spy: 合成 passed / coverage 1");
    assert(await store.playerState.getTruthStatus("auto", "T1") === "believed", "believed-spy: 仍 believed");
    record("curator believed 短路", scored);
  }
  checks.push("T5 边界：believed 状态短路，spy 断言不调用模型，返回合成 passed(coverage=1)");

  // ============================================================
  // 4. 跨层链路 A：Voices offer_insight → Curator 命题收集 → 状态迁移
  // ============================================================
  {
    const store = createMemoryDataStore();
    const subjectRes = resolveVoicesSubject("npc-tarkis");
    assert(subjectRes.ok, "chainA: tarkis resolves");
    const subject = subjectRes.subject;

    // 1 条命题 → encountered
    await store.playerState.addProposition("auto", "Helix.Beacon.Broadcasting");
    assert(await store.playerState.getTruthStatus("auto", "T1") === "encountered", "chainA: 1 命题 → encountered");

    // 硬门拒绝（缺 Helix.Signal.Unassigned），状态保持 encountered
    // 注：必须传缺命题的输入——completeCuratorInput 已含两条命题
    const gateReject = await runCuratorSynthesis(
      { ...completeCuratorInput, pinnedPropositions: ["Helix.Beacon.Broadcasting"] },
      { store, slotId: "auto", generate: curatorSpy(synthesisFixtures.passed).fn }
    );
    const rej = asCuratorRejected(gateReject);
    assert(rej.error.error === "canon_violation", "chainA: 硬门 canon_violation");
    assert("missing_required_propositions" in rej && rej.missing_required_propositions.includes("Helix.Signal.Unassigned"), "chainA: 列出缺失命题");
    assert(await store.playerState.getTruthStatus("auto", "T1") === "encountered", "chainA: 硬门拒绝后仍 encountered");
    record("curator 硬门拒绝", rej);

    // Voices 交付 insight（该 insight 的 unlocks_clue_ids 正是缺失的那条命题）
    const voices = await runVoicesChat(validVoicesBody, { store, slotId: "auto", generate: voicesJsonGenerate(voicesValidOutput) });
    const voicesOk = asVoicesOk(voices);
    assert(voicesOk.output.offer_insight_id === "INSIGHT_T1_BOOTSTRAP_DISCOVERED", "chainA: Voices 交付 T1 insight");
    assert(voicesOk.output.lie === true, "chainA: lie:true 保留");

    // offerClue 把 insight 解锁的线索命题映射回 insight
    const clueMap = offerClue(
      { subject, player: playerSnapshotFromState(await store.playerState.load("auto")), memory: null },
      "Helix.Signal.Unassigned"
    );
    assert(clueMap.allowed && clueMap.offer_insight_id === "INSIGHT_T1_BOOTSTRAP_DISCOVERED", "chainA: 线索→insight 映射");

    // 收集第二条命题前，态度门未开
    const ctxBefore = computeVoicesCanonContext("helix-7", playerSnapshotFromState(await store.playerState.load("auto")), subject.constitution);
    assert(!ctxBefore.insight_gates.includes("INSIGHT_T1_BOOTSTRAP_DISCOVERED"), "chainA: 收集线索前门未开");

    // 收集第二条命题 → 态度门开 → 硬门可通过
    await store.playerState.addProposition("auto", "Helix.Signal.Unassigned");
    const ctxAfter = computeVoicesCanonContext("helix-7", playerSnapshotFromState(await store.playerState.load("auto")), subject.constitution);
    assert(ctxAfter.insight_gates.includes("INSIGHT_T1_BOOTSTRAP_DISCOVERED"), "chainA: 收集线索后门开");
    assert(await store.playerState.getTruthStatus("auto", "T1") === "suspected", "chainA: 两命题齐 → suspected");

    // 综合 passed → believed
    const passed = await runCuratorSynthesis(completeCuratorInput, { store, slotId: "auto", generate: curatorMockGenerate(synthesisFixtures.passed) });
    assert(asScored(passed).result.verdict === "passed", "chainA: synthesis passed");
    assert(await store.playerState.getTruthStatus("auto", "T1") === "believed", "chainA: T1 believed");
    record("curator chainA passed", asScored(passed));
  }
  checks.push("跨层链路 A：Voices offer_insight → 命题收集 → unknown→encountered→suspected→believed");

  // ============================================================
  // 5. 跨层链路 B：Scribe 生成 → 写缓存 → cache_hit 复用
  // ============================================================
  {
    const store = createMemoryDataStore();
    const gen1 = scribeSpy(validDossier);
    const first = await runScribePipeline(
      { planetId: "helix-7", landingSiteId: "site-helix-coldboot" },
      { cache: store.dossierCache, generate: gen1.fn }
    );
    const firstGen = asScribeGenerated(first);
    assert(firstGen.cached === false && firstGen.dossier.planet_id === "helix-7", "chainB: generated cached:false");
    assert(gen1.called(), "chainB: 首次调用模型");
    assert(await store.dossierCache.has("helix-7", "site-helix-coldboot"), "chainB: 写入缓存");
    record("scribe generated", firstGen);

    const gen2 = scribeSpy(validDossier);
    const second = await runScribePipeline(
      { planetId: "helix-7", landingSiteId: "site-helix-coldboot" },
      { cache: store.dossierCache, generate: gen2.fn }
    );
    const secondHit = asScribeCacheHit(second);
    assert(secondHit.cached === true && secondHit.dossier.title === firstGen.dossier.title, "chainB: cache_hit 复用同 dossier");
    assert(!gen2.called(), "chainB: cache_hit 不调用模型");
    record("scribe cache_hit", secondHit);
  }
  checks.push("跨层链路 B：Scribe 生成 → write-once 缓存 → cache_hit 复用且不调用模型");

  // ============================================================
  // 6. 跨层链路 C：Synthesis passed → believed → Voices 语境注入
  // ============================================================
  {
    assert(buildBelievedTruthInjection(["T1"]).includes("记录员已理解") && buildBelievedTruthInjection([]).includes("当前没有已确证"), "chainC: 注入函数单元");
    // fresh slot：无 believed → prompt 不含「记录员已理解」
    const freshStore = createMemoryDataStore();
    const freshCap = captureVoicesSystem();
    await runVoicesChat(validVoicesBody, { store: freshStore, slotId: "auto", generate: freshCap.fn });
    assert(!freshCap.system().includes("记录员已理解"), "chainC: fresh prompt 无 believed 注入");

    // believed slot：T1 believed → prompt 注入「你已知道」+ T1 标题
    const belStore = createMemoryDataStore();
    await runCuratorSynthesis(completeCuratorInput, { store: belStore, slotId: "auto", generate: curatorMockGenerate(synthesisFixtures.passed) });
    assert(await belStore.playerState.getTruthStatus("auto", "T1") === "believed", "chainC: T1 believed");
    const belCap = captureVoicesSystem();
    await runVoicesChat(validVoicesBody, { store: belStore, slotId: "auto", generate: belCap.fn });
    assert(belCap.system().includes("记录员已理解"), "chainC: believed prompt 含「记录员已理解」");
    assert(belCap.system().includes("信号 / The Beacon"), "chainC: believed prompt 命名 T1 标题");
  }
  checks.push("跨层链路 C：Synthesis passed→believed→Voices system prompt 注入「记录员已理解 / 你已知道」");

  // ============================================================
  // 7. 降级链：model_unavailable 三路由各自降级且不污染缓存/状态
  // ============================================================
  // Voices
  {
    const store = createMemoryDataStore();
    const vDeg = await runVoicesChat(validVoicesBody, {
      store,
      slotId: "auto",
      generate: async () => ({ ok: false, error: modelUnavailable("Voices 模型不可用。", VOICES_GENERIC_FALLBACK.say) })
    });
    const d = asVoicesDegraded(vDeg);
    assert(d.error.error === "model_unavailable" && d.error.retryable === true, "降级: Voices model_unavailable/retryable");
    assert(d.fallback.offer_insight_id === null && d.fallback.say.length > 0, "降级: Voices 保底句不交付 insight");
    const vState = await store.playerState.load("auto");
    // 注：无状态时 load 返回 null；有状态时 believedTruths/collectedPropositions 必须为空
    assert(vState === null || (vState.believedTruths.length === 0 && vState.collectedPropositions.length === 0), "降级: Voices 不污染 believed/命题");
    const vMem = await store.npcCache.get("auto", "npc-tarkis");
    assert(vMem?.relationship === 0 && vMem?.notes.length === 0, "降级: Voices relationship 不变、不写 offered note");
    record("voices 降级", d);
  }
  // Scribe
  {
    const store = createMemoryDataStore();
    const sDeg = await runScribePipeline(
      { planetId: "helix-7", landingSiteId: "site-helix-coldboot" },
      { cache: store.dossierCache, generate: async () => ({ ok: false, error: modelUnavailable("Scribe 模型不可用。", "模板") }) }
    );
    const d = asScribeDegraded(sDeg);
    assert(d.error.error === "model_unavailable" && d.cacheable === false, "降级: Scribe model_unavailable/cacheable:false");
    assert(await store.dossierCache.has("helix-7", "site-helix-coldboot") === false, "降级: Scribe 不写入缓存");
    record("scribe 降级", d);
  }
  // Curator
  {
    const store = createMemoryDataStore();
    const cDeg = await runCuratorSynthesis(completeCuratorInput, {
      store,
      slotId: "auto",
      generate: async () => ({ ok: false, error: modelUnavailable("Curator 模型不可用。", "请补齐命题后重试。") })
    });
    const d = asDegraded(cDeg);
    assert(d.error.error === "model_unavailable" && d.result.verdict === "partial", "降级: Curator model_unavailable/partial");
    assert(await store.playerState.getTruthStatus("auto", "T1") !== "believed", "降级: Curator 不推进 believed");
    assert((await store.synthesisAttempts.list("auto", 1))[0]?.degraded === true, "降级: Curator attempt degraded");
    record("curator 降级", d);
  }
  checks.push("降级链：三路由 model_unavailable 各自降级（保底句/模板/partial），不污染缓存与 believed 状态");

  // ============================================================
  // 8. sidecar 隔离：slot_1 进度不污染 slot_2
  // ============================================================
  {
    const store = createMemoryDataStore();
    await store.playerState.addProposition("slot_1", "Helix.Beacon.Broadcasting");
    await store.playerState.addProposition("slot_1", "Helix.Signal.Unassigned");
    const passed = await runCuratorSynthesis(
      { truthId: "T1", hypothesisText: "信标是握手载波。", pinnedPropositions: ["Helix.Beacon.Broadcasting", "Helix.Signal.Unassigned"] },
      { store, slotId: "slot_1", generate: curatorMockGenerate(synthesisFixtures.passed) }
    );
    assert(asScored(passed).result.verdict === "passed", "sidecar: slot_1 passed");
    assert(await store.playerState.getTruthStatus("slot_1", "T1") === "believed", "sidecar: slot_1 believed");
    await runVoicesChat(validVoicesBody, { store, slotId: "slot_1", generate: voicesJsonGenerate(voicesValidOutput) });
    assert((await store.npcCache.get("slot_1", "npc-tarkis")) !== null, "sidecar: slot_1 npc 记忆");

    assert(await store.playerState.getTruthStatus("slot_2", "T1") === "unknown", "sidecar: slot_2 真相 unknown");
    assert(await store.npcCache.get("slot_2", "npc-tarkis") === null, "sidecar: slot_2 npc 记忆空");
    assert((await store.synthesisAttempts.list("slot_2")).length === 0, "sidecar: slot_2 无 synthesis 记录");
  }
  checks.push("sidecar 隔离：slot_1 believed/npc 记忆/attempt 不污染 slot_2");

  // ============================================================
  // 9. 契约一致性 sweep
  // ============================================================
  const codes = new Set<string>();
  for (const { label, obj } of envelopes) {
    assert(obj && typeof obj === "object", `sweep ${label}: 信封为对象`);
    const o = obj as Record<string, unknown>;
    assert(o.contract_version === "v1.1", `sweep ${label}: contract_version v1.1`);
    const err = o.error as Record<string, unknown> | undefined;
    if (err) {
      const code = err.error;
      assert(typeof code === "string" && CONTRACT_ERROR_CODES.has(code), `sweep ${label}: 错误码属 4 值枚举（${String(code)}）`);
      codes.add(code as string);
      if (err.degraded === true) {
        assert(o.degraded === true, `sweep ${label}: degraded 错误必须挂在 degraded 信封上`);
      } else if (err.degraded === false) {
        assert(o.degraded === false || o.degraded === undefined, `sweep ${label}: 硬拒绝不得标 degraded`);
      }
    }
  }
  assert(codes.has("validation_error") && codes.has("canon_violation") && codes.has("model_unavailable"), "sweep: 错误码集合覆盖 validation/canon/model_unavailable");
  checks.push("契约一致性：所有响应 contract_version=v1.1，错误码属 4 值枚举，degraded 标记自洽");

  return { ok: true, checks };
}

const invokedDirectly = process.argv[1]?.replace(/\\/g, "/").includes("tests/t7-fullchain");
if (invokedDirectly) {
  runT7FullChain()
    .then((result) => {
      for (const check of result.checks) console.log(`ok  ${check}`);
      console.log(`\nT7 full-chain matrix: ${result.checks.length} checks ok`);
    })
    .catch((error: unknown) => {
      console.error(error instanceof Error ? error.message : error);
      process.exitCode = 1;
    });
}